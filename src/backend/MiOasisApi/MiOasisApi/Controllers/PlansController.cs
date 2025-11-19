using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using MiOasisApi.Data;
using MiOasisApi.Models;
using Npgsql;
using System.Data;
using System.Security.Claims;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace MiOasisApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PlansController : ControllerBase
    {
        private readonly string _connectionString;
        private const string TableName = "\"SubscriptionPlans\"";
        private IDbConnection Connection => new NpgsqlConnection(_connectionString);

        public PlansController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("PostgresConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllPlans()
        {
            const string sql = $@"
            SELECT ""PlanId"", ""PlanName"", ""MaxAssetsAllowed"", ""MaxPolyCount"", ""MaxTextureSizeMB""
            FROM {TableName}; ";
            using (var db = Connection)
            {
                // Usamos Dapper.QueryFirstOrDefaultAsync para obtener un solo registro
                var plans = await db.QueryAsync<SubscriptionPlan>(sql);
                if (plans == null)
                {
                    return NotFound(new { message = $"Planes no encontrados." });
                }
                return Ok(plans);
            }
        }

        [HttpGet("{id}", Name = "GetPlan")]
        public async Task<IActionResult> GetPlanById(int id)
        {
            const string sql = $@"
            SELECT ""PlanId"", ""PlanName"", ""MaxAssetsAllowed"", ""MaxPolyCount"", ""MaxTextureSizeMB""
            FROM {TableName} 
            WHERE ""PlanId"" = @PlanId";

            using (var db = Connection)
            {
                // Usamos Dapper.QueryFirstOrDefaultAsync para obtener un solo registro
                var plan = await db.QueryFirstOrDefaultAsync<SubscriptionPlan>(sql, new { PlanId = id });

                if (plan == null)
                {
                    return NotFound(new { message = $"Plan con ID {id} no encontrado." });
                }

                return Ok(plan);
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreatePlan([FromBody] SimpleSubscriptionPlan plan)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            const string sql = $@"
            INSERT INTO {TableName} (""PlanName"", ""MaxAssetsAllowed"", ""MaxPolyCount"", ""MaxTextureSizeMB"")
            VALUES (@PlanName, @MaxAssetsAllowed, @MaxPolyCount, @MaxTextureSizeMB)
            RETURNING ""PlanId"""; // Retorna el ID generado
            using (var db = Connection)
            {
                var newId = await db.ExecuteScalarAsync<int>(sql, plan);
                plan.PlanId = newId;
                return CreatedAtRoute(
                    "GetPlan",
                    new { id = newId },
                    plan
                );
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePlan(int id, [FromBody] SimpleSubscriptionPlan plan)
        {
            if (id != plan.PlanId)
            {
                return BadRequest(new { message = "El ID de la URL y el ID del cuerpo no coinciden." });
            }
            const string sql = $@"
            UPDATE {TableName} SET 
                ""PlanName"" = @PlanName, 
                ""MaxAssetsAllowed"" = @MaxAssetsAllowed, 
                ""MaxPolyCount"" = @MaxPolyCount, 
                ""MaxTextureSizeMB"" = @MaxTextureSizeMB
            WHERE ""PlanId"" = @PlanId"; // Utilizamos el ID del objeto 'plan'
            using (var db = Connection)
            {
                // Usamos Dapper.ExecuteAsync y verificamos el número de filas afectadas
                var rowsAffected = await db.ExecuteAsync(sql, plan);
                if (rowsAffected == 0)
                {
                    // Podría ser que el plan no existiera o el update no cambió nada.
                    return NotFound(new { message = $"Plan con ID {id} no encontrado para actualizar." });
                }
                return NoContent(); // 204 No Content es estándar para un PUT exitoso
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePlan(int id)
        {
            const string sql = $@"
            DELETE FROM {TableName} 
            WHERE ""PlanId"" = @PlanId";

            using (var db = Connection)
            {
                var rowsAffected = await db.ExecuteAsync(sql, new { PlanId = id });

                if (rowsAffected == 0)
                {
                    return NotFound(new { message = $"Plan con ID {id} no encontrado para eliminar." });
                }

                // 204 No Content es estándar para un DELETE exitoso
                return NoContent();
            }
        }
    }
}
