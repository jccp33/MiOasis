using Dapper;
using Microsoft.AspNetCore.Authorization;
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
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace MiOasis.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Todas las operaciones requieren autenticación
    public class CurrencyController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly string _connectionString;
        private const string TableName = "\"CurrencyTypes\"";
        private IDbConnection Connection => new NpgsqlConnection(_connectionString);

        public CurrencyController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _connectionString = configuration.GetConnectionString("PostgresConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
        }

        // --- MÉTODOS DE UTILIDAD ---
        private int GetUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdString, out var userId))
            {
                return userId;
            }
            throw new UnauthorizedAccessException("ID de usuario no encontrado en el token.");
        }

        // --- DTOs ---

        public class BalanceDto
        {
            public string CurrencyName { get; set; } = string.Empty;
            public string Abbreviation { get; set; } = string.Empty;
            public decimal Amount { get; set; }
        }

        public class PurchaseDto
        {
            [Required] public int AssetId { get; set; } // El Asset UGC que se está comprando
            [Required] public int CurrencyId { get; set; } // El tipo de moneda a usar
            [Required] public decimal Price { get; set; }
        }

        // --- 1. CONSULTAR SALDO DEL USUARIO ---
        // GET: api/Currency/balance
        [HttpGet("balance")]
        public async Task<ActionResult<IEnumerable<BalanceDto>>> GetUserBalances()
        {
            var userId = GetUserId();
            // Consulta los saldos, incluyendo el nombre de la moneda
            var balances = await _context.UserBalances
                .Where(ub => ub.UserId == userId)
                .Include(ub => ub.CurrencyType)
                .Select(ub => new BalanceDto
                {
                    CurrencyName = ub.CurrencyType!.Name,
                    Abbreviation = ub.CurrencyType.Abbreviation,
                    Amount = ub.Amount
                })
                .ToListAsync();

            return Ok(balances);
        }

        // --- 2. TRANSACCIÓN DE COMPRA DE UN ASSET UGC ---
        // POST: api/Currency/purchase
        [HttpPost("purchase")]
        public async Task<IActionResult> PurchaseAsset([FromBody] PurchaseDto model)
        {
            var userId = GetUserId();

            // 1. Validar el Asset a Comprar (Debe ser público/aprobado)
            var assetToBuy = await _context.UserAssets.FirstOrDefaultAsync(a => a.AssetId == model.AssetId && a.IsPublic == true && a.Status == "Approved");
            if (assetToBuy == null) return NotFound("Asset no encontrado o no disponible para la venta.");

            // 2. Obtener el saldo del usuario para la moneda seleccionada
            var userBalance = await _context.UserBalances
                .FirstOrDefaultAsync(ub => ub.UserId == userId && ub.CurrencyId == model.CurrencyId);

            if (userBalance == null || userBalance.Amount < model.Price)
            {
                return BadRequest("Saldo insuficiente o tipo de moneda inválido.");
            }

            // 3. Verificar si el usuario ya posee este asset (para prevenir doble compra)
            var alreadyOwned = await _context.PlayerAssetInventories
                .AnyAsync(pai => pai.UserId == userId && pai.MasterAssetId == model.AssetId);

            if (alreadyOwned)
            {
                // Si ya lo tiene, se podría devolver un mensaje de "Ya adquirido" en lugar de fallar
                return Conflict("Ya posees este asset en tu inventario.");
            }

            // --- INICIAR TRANSACCIÓN (Para asegurar la integridad) ---
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 4. Deducir el costo del saldo del usuario
                userBalance.Amount -= model.Price;
                _context.UserBalances.Update(userBalance);

                // 5. Añadir el asset al inventario del jugador
                var inventoryItem = new PlayerAssetInventory
                {
                    UserId = userId,
                    MasterAssetId = model.AssetId,
                    CustomProperties = "{}",
                };
                _context.PlayerAssetInventories.Add(inventoryItem);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = $"Compra exitosa. {model.Price} deducidos. InventoryId: {inventoryItem.InventoryId}" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // Registrar el error (logging)
                return StatusCode(500, new { message = "Error en la transacción de compra.", details = ex.Message });
            }
        }

        // -------------------- crud currency endpoints -------------------- //

        // get currency by id
        [HttpGet("currency/{id}", Name = "GetCurrency")]
        public async Task<ActionResult<IEnumerable<CurrencyType>>> GetCurrency(int id)
        {
            var currencys = await _context.CurrencyTypes
                .Where(c => c.CurrencyId == id)
                .ToListAsync();
            return Ok(currencys);
        }

        // add new currency
        [HttpPost]
        public async Task<IActionResult> CreateCurrency([FromBody] CurrencyType currency)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            const string sql = $@"
            INSERT INTO {TableName} (""Name"", ""Abbreviation"", ""IsPremium"")
            VALUES (@Name, @Abbreviation, @IsPremium)
            RETURNING ""CurrencyId""";
            using (var db = Connection)
            {
                var newId = await db.ExecuteScalarAsync<int>(sql, currency);
                currency.CurrencyId = newId;
                return CreatedAtRoute(
                    "GetCurrency",
                    new { id = newId },
                    currency
                );
            }
        }

        // update currency
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCurrency(int id, [FromBody] CurrencyType currency)
        {
            if (id != currency.CurrencyId)
            {
                return BadRequest(new { message = "El ID de la URL y el ID del cuerpo no coinciden." });
            }
            const string sql = $@"
            UPDATE {TableName} SET 
                ""Name"" = @Name, 
                ""Abbreviation"" = @Abbreviation, 
                ""IsPremium"" = @IsPremium
            WHERE ""CurrencyId"" = @CurrencyId";
            using (var db = Connection)
            {
                var rowsAffected = await db.ExecuteAsync(sql, currency);
                if (rowsAffected == 0)
                {
                    return NotFound(new { message = $"Moneda con ID {id} no encontrada para actualizar." });
                }
                return NoContent();
            }
        }

        // delete currency
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCurrency(int id)
        {
            const string sql = $@"
            DELETE FROM {TableName} 
            WHERE ""CurrencyId"" = @CurrencyId";
            using (var db = Connection)
            {
                var rowsAffected = await db.ExecuteAsync(sql, new { CurrencyId = id });
                if (rowsAffected == 0)
                {
                    return NotFound(new { message = $"Moneda con ID {id} no encontrada para eliminar." });
                }
                return NoContent();
            }
        }

        // next
    }
}
