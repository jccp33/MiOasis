using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.Extensions.Configuration;
using MiOasisApi.Data;
using MiOasisApi.Models;
using Npgsql;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Security.Claims;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace MiOasisApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class UserController : Controller
    {
        private readonly string _connectionString;
        private readonly IPasswordHasher<User> _passwordHasher = new PasswordHasher<User>();
        private IDbConnection Connection => new NpgsqlConnection(_connectionString);
        private const string TableName = "\"Users\"";

        public UserController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("PostgresConnection")
                ?? throw new InvalidOperationException("Connection string 'PostgresConnection' not found.");
        }

        // --- DTO para Operaciones (Excluye PasswordHash en salida, incluye contraseña en entrada) ---

        // DTO de Creación/Actualización (Permite cambiar contraseña)
        public class UserCrudDto
        {
            public int? UserId { get; set; }
            public string Username { get; set; } = string.Empty;
            public string? Password { get; set; } // Opcional para Update, Requerido para Create
            public string Email { get; set; } = string.Empty;
            public string Status { get; set; } = "active";
            public string Role { get; set; } = "gamer";
            public int? PlanId { get; set; }
        }

        // DTO de Salida (Incluye PlanName para mostrar en el Grid)
        public class UserListDto : UserCrudDto
        {
            public string PlanName { get; set; } = string.Empty;
        }

        // read by id
        [HttpGet("{id}", Name = "GetUserById")]
        public async Task<ActionResult<UserListDto>> GetUserById(int id)
        {
            const string sql = $@"
                SELECT 
                    u.""UserId"", u.""Username"", u.""Email"", u.""Status"", u.""Role"", u.""PlanId"",
                    p.""PlanName""
                FROM {TableName} u
                LEFT JOIN ""SubscriptionPlans"" p ON u.""PlanId"" = p.""PlanId""
                WHERE u.""UserId"" = @Id";

            using (var db = Connection)
            {
                var user = await db.QueryFirstOrDefaultAsync<UserListDto>(sql, new { Id = id });
                if (user == null)
                {
                    return NotFound(new { message = $"Usuario con ID {id} no encontrado." });
                }
                // El PasswordHash no se devuelve por seguridad.
                return Ok(user);
            }
        }

        // create
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] UserCrudDto model)
        {
            if (string.IsNullOrEmpty(model.Password))
            {
                return BadRequest(new { message = "La contraseña es requerida para la creación." });
            }
            // 1. Verificar si el Username ya existe
            const string checkSql = $"SELECT COUNT(*) FROM {TableName} WHERE \"Username\" = @Username";
            using (var db = Connection)
            {
                var exists = await db.ExecuteScalarAsync<int>(checkSql, new { model.Username });
                if (exists > 0)
                {
                    return Conflict(new { message = "El nombre de usuario ya está en uso." });
                }
                // 2. Hashear la contraseña
                var userTemp = new User();
                var passwordHash = _passwordHasher.HashPassword(userTemp, model.Password);
                // 3. Crear el nuevo usuario
                const string insertSql = $@"
                    INSERT INTO {TableName} (""Username"", ""PasswordHash"", ""Email"", ""Status"", ""Role"", ""PlanId"")
                    VALUES (@Username, @PasswordHash, @Email, @Status, @Role, @PlanId)
                    RETURNING ""UserId""";
                var newId = await db.ExecuteScalarAsync<int>(insertSql, new
                {
                    model.Username,
                    PasswordHash = passwordHash,
                    model.Email,
                    model.Status,
                    model.Role,
                    model.PlanId
                });
                // 4. Devolver 201 CreatedAtRoute
                return CreatedAtRoute(
                    "GetUserById",
                    new { id = newId },
                    model
                );
            }
        }

        // update
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserCrudDto model)
        {
            if (id != model.UserId)
            {
                return BadRequest(new { message = "El ID de la URL y el ID del cuerpo no coinciden." });
            }
            // 1. Obtener el hash de contraseña existente
            const string getHashSql = $"SELECT \"PasswordHash\" FROM {TableName} WHERE \"UserId\" = @Id";
            string? currentHash;
            using (var db = Connection)
            {
                currentHash = await db.ExecuteScalarAsync<string>(getHashSql, new { Id = id });
            }
            if (currentHash == null)
            {
                return NotFound(new { message = $"Usuario con ID {id} no encontrado para actualizar." });
            }
            // 2. Determinar el nuevo hash: si se proporciona una contraseña nueva, hashearla.
            string newHash = currentHash;
            if (!string.IsNullOrEmpty(model.Password))
            {
                var userTemp = new User(); // Usamos una instancia temporal para hashear
                newHash = _passwordHasher.HashPassword(userTemp, model.Password);
            }
            // 3. Ejecutar la actualización
            const string updateSql = $@"
                UPDATE {TableName} SET 
                    ""Username"" = @Username, 
                    ""PasswordHash"" = @NewPasswordHash, 
                    ""Email"" = @Email, 
                    ""Status"" = @Status, 
                    ""Role"" = @Role, 
                    ""PlanId"" = @PlanId
                WHERE ""UserId"" = @UserId";
            using (var db = Connection)
            {
                var rowsAffected = await db.ExecuteAsync(updateSql, new
                {
                    model.Username,
                    NewPasswordHash = newHash,
                    model.Email,
                    model.Status,
                    model.Role,
                    model.PlanId,
                    model.UserId // Usado en el WHERE
                });
                if (rowsAffected == 0)
                {
                    return NotFound(new { message = $"Usuario con ID {id} no encontrado para actualizar." });
                }
                return NoContent(); // HTTP 204 No Content para actualización exitosa
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            const string sql = $"DELETE FROM {TableName} WHERE \"UserId\" = @Id";
            using (var db = Connection)
            {
                var rowsAffected = await db.ExecuteAsync(sql, new { Id = id });
                if (rowsAffected == 0)
                {
                    return NotFound(new { message = $"Usuario con ID {id} no encontrado para eliminar." });
                }
                // El borrado en cascada se encarga de Inventario/Assets creados, si está configurado en SQL.
                return NoContent(); // HTTP 204 No Content para eliminación exitosa
            }
        }

        // next
    }
}
