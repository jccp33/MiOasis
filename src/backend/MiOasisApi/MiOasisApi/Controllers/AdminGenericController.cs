using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MiOasisApi.Data;
using MiOasisApi.Models;
using Npgsql;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using static MiOasis.Controllers.AuthController;

namespace MiOasisApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminGenericController : ControllerBase
    {
        private string _connectionString = "";
        private readonly AppDbContext _context;
        private readonly IPasswordHasher<User> _passwordHasher = new PasswordHasher<User>();
        private readonly IConfiguration _configuration;
        private readonly List<string> _allowedTables = new List<string>
        {
            "SubscriptionPlans", "Users", "UserAssets", "PlayerAssetInventory",
            "AvatarConfigs", "AvatarAssetMapping", "WorldConfigs", "WorldInstances",
            "UserFriendship", "CurrencyTypes", "UserBalances" // Tablas de db.sql
        };

        // Inyección de dependencias: DbContext y IConfiguration (para secretos JWT)
        public AdminGenericController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("loginadmin")]
        public async Task<IActionResult> LoginAdmin([FromBody] LoginDto model)
        {
            // 1. Buscar usuario por nombre de usuario
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == model.Username && u.Role == "admin");

            // 2. Verificar existencia, estado y contraseña
            if (user == null)
            {
                return Unauthorized(new { message = "Credenciales inválidas." });
            }

            // Verificar si el usuario está activo (puede estar baneado)
            if (user.Status != "active")
            {
                return Unauthorized(new { message = $"Cuenta {user.Status}. Contacte soporte." });
            }


            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, model.Password);

            if (result == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new { message = "Credenciales inválidas." });
            }

            // 3. Generar Token JWT (Si las credenciales son válidas)
            var token = GenerateJwtToken(user);

            return Ok(new
            {
                userId = user.UserId,
                username = user.Username,
                role = user.Role,
                token = token,
                plan = user.Plan?.PlanName // Devuelve el nombre del plan
            });
        }

        [HttpGet("paginate")]
        public async Task<IActionResult> GetPaginatedData(
            [FromQuery] string table,
            [FromQuery] string columns = "*",
            [FromQuery] string? filter = null,
            [FromQuery] int page = 1,
            [FromQuery] int itemsPerPage = 10
        )
        {
            // --- 1. VALIDACIÓN DE ENTRADA ---
            if (string.IsNullOrWhiteSpace(table) || page < 1 || itemsPerPage < 1 || itemsPerPage > 100)
            {
                return BadRequest(new { message = "Parámetros de paginación inválidos (tabla requerida, página >= 1, itemsPerPage 1-100)." });
            }

            // Validación contra la Lista Blanca
            if (!_allowedTables.Contains(table, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = $"La tabla '{table}' no está permitida para consulta." });
            }

            // Preparación de SQL
            string safeColumns = SanitizeColumns(columns);
            string tableName = $"\"{table}\""; // Encerrar el nombre de la tabla para PostgreSQL

            // Procesamiento de Filtros
            var (whereClause, parameters) = BuildFilter(filter);

            int totalItems = 0;

            try
            {
                _connectionString = _configuration.GetConnectionString("PostgresConnection");
                using (IDbConnection db = new NpgsqlConnection(_connectionString))
                {
                    // --- 2. CONSULTA DE TOTAL DE ELEMENTOS (COUNT) ---
                    string countSql = $"SELECT COUNT(*) FROM {tableName} {whereClause}";
                    totalItems = await db.ExecuteScalarAsync<int>(countSql, parameters);
                }

                // --- 3. CÁLCULO DE PAGINACIÓN ---
                int totalPages = (int)Math.Ceiling((double)totalItems / itemsPerPage);
                int currentPage = Math.Max(1, Math.Min(page, totalPages > 0 ? totalPages : 1));
                int offset = (currentPage - 1) * itemsPerPage;

                // --- 4. CONSULTA DE DATOS PAGINADOS ---
                IEnumerable<dynamic> data;
                string dataSql = $@"
                    SELECT {safeColumns} 
                    FROM {tableName} 
                    {whereClause} 
                    ORDER BY 1 -- Ordenar por la primera columna (se asume que es la PK)
                    LIMIT @Limit OFFSET @Offset";

                // Agregar parámetros de paginación
                parameters.Add("Limit", itemsPerPage);
                parameters.Add("Offset", offset);

                _connectionString = _configuration.GetConnectionString("PostgresConnection");
                using (IDbConnection db = new NpgsqlConnection(_connectionString))
                {
                    data = await db.QueryAsync<dynamic>(dataSql, parameters);
                }

                // --- 5. DEVOLVER RESPUESTA (Objeto anónimo sin DTO externo) ---
                return Ok(new
                {
                    currentPage = currentPage,
                    itemsPerPage = itemsPerPage,
                    totalItems = totalItems,
                    totalPages = totalPages,
                    data = data
                });
            }
            catch (Exception ex)
            {
                // Manejo de errores de SQL (p. ej., columna no existe)
                return StatusCode(500, new { message = "Error interno al ejecutar la consulta dinámica.", detail = ex.Message });
            }
        }

        /* -------------------- PRIVATE METHODS -------------------- */
        private string GenerateJwtToken(User user)
        {
            // 1. Definir los Claims (Información que contendrá el token)
            var claims = new List<Claim>
            {
                // Identificadores esenciales
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                // Información de seguridad y permisos
                new Claim(ClaimTypes.Role, user.Role)
            };

            // 2. Obtener la clave secreta
            var secret = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key no está configurado.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // 3. Crear el Token
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7), // El token expira en 7 días
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // Procesa la lista de columnas y las encierra entre comillas dobles (PostgreSQL)
        private string SanitizeColumns(string columns)
        {
            if (columns.Trim() == "*") return "*";

            var cleanColumns = columns
                .Split(',')
                .Select(c => $"\"{SanitizeIdentifier(c)}\"")
                .Where(c => c.Length > 2)
                .ToList();

            return cleanColumns.Any() ? string.Join(", ", cleanColumns) : "*";
        }

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
