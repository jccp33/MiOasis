using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using MiOasisApi.Models;
using Npgsql;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;

namespace MiOasisApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class UserBalancesController : ControllerBase
    {
        private readonly string _connectionString;
        private const string TableName = "\"UserBalances\"";
        private IDbConnection Connection => new NpgsqlConnection(_connectionString);

        public UserBalancesController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("PostgresConnection")
                ?? throw new InvalidOperationException("Connection string 'PostgresConnection' not found.");
        }

        // =================================================================
        // R - READ PAGE
        // =================================================================
        [HttpGet("paginate")]
        public async Task<IActionResult> GetPaginatedBalances(
            [FromQuery] string? filter = null,
            [FromQuery] int page = 1,
            [FromQuery] int itemsPerPage = 10
        )
        {
            // --- 1. VALIDACIÓN DE ENTRADA ---
            if (page < 1 || itemsPerPage < 1 || itemsPerPage > 100)
            {
                return BadRequest(new { message = "Parámetros inválidos." });
            }
            // --- 2. CONFIGURACIÓN DE JOINS Y ALIAS (Lógica Especial sin Vistas) ---
            string tableName = "\"UserBalances\" b";
            string joinClause = @"
                    INNER JOIN ""Users"" u ON b.""UserId"" = u.""UserId""
                    INNER JOIN ""CurrencyTypes"" c ON b.""CurrencyId"" = c.""CurrencyId""
                ";
            string safeColumns = @"
                    b.""BalanceId"", 
                    b.""UserId"", 
                    u.""Username"",              -- Traemos el nombre del usuario
                    b.""CurrencyId"", 
                    c.""Name"" as ""CurrencyName"", -- Traemos el nombre de la moneda
                    c.""Abbreviation"",           -- Traemos la abreviación (ej: G, GM)
                    b.""Amount""
                ";
            // --- 3. PROCESAMIENTO DE FILTROS ---
            var (whereClause, parameters) = BuildFilter(filter);
            int totalItems = 0;
            try
            {
                using (IDbConnection db = new NpgsqlConnection(_connectionString))
                {
                    // --- 4. CONSULTA COUNT ---
                    string countSql = $"SELECT COUNT(*) FROM {tableName} {joinClause} {whereClause}";
                    totalItems = await db.ExecuteScalarAsync<int>(countSql, parameters);
                    // --- 5. CÁLCULO DE PAGINACIÓN ---
                    int totalPages = (int)Math.Ceiling((double)totalItems / itemsPerPage);
                    int currentPage = Math.Max(1, Math.Min(page, totalPages > 0 ? totalPages : 1));
                    int offset = (currentPage - 1) * itemsPerPage;
                    // --- 6. CONSULTA DE DATOS ---
                    string dataSql = $@"
                        SELECT {safeColumns} 
                        FROM {tableName} 
                        {joinClause} 
                        {whereClause} 
                        ORDER BY 1 -- Ordena por la primera columna (BalanceId en el caso especial)
                        LIMIT @Limit OFFSET @Offset";
                    parameters.Add("Limit", itemsPerPage);
                    parameters.Add("Offset", offset);
                    var data = await db.QueryAsync<dynamic>(dataSql, parameters);
                    // --- 7. RETORNO ---
                    return Ok(new
                    {
                        currentPage = currentPage,
                        itemsPerPage = itemsPerPage,
                        totalItems = totalItems,
                        totalPages = totalPages,
                        data = data
                    });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error interno al ejecutar la consulta paginada.", detail = ex.Message });
            }
        }

        // =================================================================
        // R - READ (ONE): Obtener Balance por ID (con nombres)
        // =================================================================
        [HttpGet("{id}", Name = "GetBalanceById")]
        public async Task<ActionResult<UserBalanceDetailDto>> GetBalanceById(int id)
        {
            // Hacemos JOIN para traer el nombre del usuario y de la moneda
            const string sql = $@"
                SELECT 
                    b.""BalanceId"", b.""UserId"", b.""CurrencyId"", b.""Amount"",
                    u.""Username"",
                    c.""Name"" as CurrencyName, c.""Abbreviation"" as CurrencyAbbreviation
                FROM {TableName} b
                INNER JOIN ""Users"" u ON b.""UserId"" = u.""UserId""
                INNER JOIN ""CurrencyTypes"" c ON b.""CurrencyId"" = c.""CurrencyId""
                WHERE b.""BalanceId"" = @Id";
            using (var db = Connection)
            {
                var balance = await db.QueryFirstOrDefaultAsync<UserBalanceDetailDto>(sql, new { Id = id });
                if (balance == null)
                {
                    return NotFound(new { message = $"Balance con ID {id} no encontrado." });
                }
                return Ok(balance);
            }
        }

        // =================================================================
        // C - CREATE: Asignar nuevo balance (o moneda) a un usuario
        // =================================================================
        [HttpPost]
        public async Task<IActionResult> CreateBalance([FromBody] UserBalance model)
        {
            if (model.UserId <= 0 || model.CurrencyId <= 0)
            {
                return BadRequest(new { message = "UserId y CurrencyId son obligatorios." });
            }
            using (var db = Connection)
            {
                // 1. Validar restricción de unicidad (UQ_User_Currency_Pair)
                const string checkSql = $@"
                    SELECT COUNT(*) FROM {TableName} 
                    WHERE ""UserId"" = @UserId AND ""CurrencyId"" = @CurrencyId";
                var exists = await db.ExecuteScalarAsync<int>(checkSql, new { model.UserId, model.CurrencyId });
                if (exists > 0)
                {
                    return Conflict(new { message = "El usuario ya tiene un balance asignado para este tipo de moneda. Use Editar para modificar el monto." });
                }
                // 2. Insertar
                const string insertSql = $@"
                    INSERT INTO {TableName} (""UserId"", ""CurrencyId"", ""Amount"")
                    VALUES (@UserId, @CurrencyId, @Amount)
                    RETURNING ""BalanceId""";
                var newId = await db.ExecuteScalarAsync<int>(insertSql, model);
                model.BalanceId = newId;

                return CreatedAtRoute(
                    "GetBalanceById",
                    new { id = newId },
                    model
                );
            }
        }

        // =================================================================
        // U - UPDATE: Modificar el monto (Amount)
        // =================================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBalance(int id, [FromBody] UserBalance model)
        {
            if (id != model.BalanceId)
            {
                return BadRequest(new { message = "El ID de la URL no coincide con el cuerpo." });
            }
            const string sql = $@"
                UPDATE {TableName} SET 
                    ""Amount"" = @Amount
                WHERE ""BalanceId"" = @BalanceId";
            using (var db = Connection)
            {
                try
                {
                    var rowsAffected = await db.ExecuteAsync(sql, model);
                    if (rowsAffected == 0)
                    {
                        return NotFound(new { message = $"Balance con ID {id} no encontrado." });
                    }
                    return NoContent();
                }
                catch (PostgresException ex) when (ex.SqlState == "23505")
                {
                    return Conflict(new { message = "La combinación de Usuario y Moneda ya existe en otro registro." });
                }
            }
        }

        // =================================================================
        // D - DELETE: Eliminar balance
        // =================================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBalance(int id)
        {
            const string sql = $"DELETE FROM {TableName} WHERE \"BalanceId\" = @Id";
            using (var db = Connection)
            {
                var rowsAffected = await db.ExecuteAsync(sql, new { Id = id });
                if (rowsAffected == 0)
                {
                    return NotFound(new { message = $"Balance con ID {id} no encontrado." });
                }
                return NoContent();
            }
        }


        /* -------------------- PRIVATE METHODS -------------------- */
        // Limita los caracteres permitidos en nombres de columnas/tablas para mayor seguridad.
        private string SanitizeIdentifier(string identifier)
        {
            if (string.IsNullOrWhiteSpace(identifier)) return string.Empty;
            return Regex.Replace(identifier.Trim(), "[^a-zA-Z0-9_]", string.Empty);
        }

        // Construye la cláusula WHERE y los parámetros de Dapper.
        private (string WhereClause, DynamicParameters Parameters) BuildFilter(string? filterString)
        {
            var sb = new StringBuilder();
            var parameters = new DynamicParameters();
            if (string.IsNullOrWhiteSpace(filterString))
            {
                return (string.Empty, parameters);
            }
            string[] filters = filterString.Split('|', StringSplitOptions.RemoveEmptyEntries);
            sb.Append(" WHERE ");
            int paramCount = 0;
            for (int i = 0; i < filters.Length; i++)
            {
                string filter = filters[i];
                string[] parts = filter.Split(':');
                if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0])) continue;
                // Sanitizar y encerrar el nombre de la columna para PostgreSQL
                string column = $"\"{SanitizeIdentifier(parts[0])}\"";
                string value = parts[1];
                // Generar nombre de parámetro único para la seguridad (p. ej., @p0, @p1)
                string paramName = $"@p{paramCount++}";
                if (i > 0)
                {
                    sb.Append(" AND ");
                }
                // Utilizamos ILIKE para búsqueda insensible a mayúsculas/minúsculas en PostgreSQL
                sb.Append($"{column} ILIKE {paramName}");
                // Se usa el comodín % para el operador LIKE. EL VALOR ES PARAMETRIZADO, NO EL SQL.
                parameters.Add(paramName, $"%{value}%");
            }
            return (sb.ToString(), parameters);
        }
    }
}
