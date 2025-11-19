using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiOasisApi.Data;
using MiOasisApi.Models;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace MiOasis.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AvatarController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AvatarController(AppDbContext context)
        {
            _context = context;
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

        // DTO para enviar la lista de assets a equipar
        public class EquipAssetsDto
        {
            [Required]
            public string ConfigName { get; set; } = string.Empty;

            // Lista de pares (ID de Inventario del Asset, Slot de Equipamiento)
            public List<AssetEquipDetail> Assets { get; set; } = new List<AssetEquipDetail>();
        }

        public class AssetEquipDetail
        {
            public int InventoryId { get; set; }
            public string Slot { get; set; } = string.Empty; // Ej: Head, Torso, Legs
        }

        // DTO de respuesta para que Godot sepa qué cargar
        public class AvatarLoadDto
        {
            public int ConfigId { get; set; }
            public string ConfigName { get; set; } = string.Empty;
            public List<EquippedAssetDetail> EquippedAssets { get; set; } = new List<EquippedAssetDetail>();
        }

        public class EquippedAssetDetail
        {
            public string Slot { get; set; } = string.Empty;
            public string AssetName { get; set; } = string.Empty;
            public string StoragePath { get; set; } = string.Empty;
            public string? CustomProperties { get; set; }
        }

        // --- 1. GUARDAR/ACTUALIZAR CONFIGURACIÓN DEL AVATAR ---
        // POST: api/Avatar/save
        [HttpPost("save")]
        public async Task<IActionResult> SaveAvatarConfig([FromBody] EquipAssetsDto model)
        {
            var userId = GetUserId();

            // 1. Crear o encontrar la configuración por nombre
            var config = await _context.AvatarConfigs
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ConfigName == model.ConfigName);

            if (config == null)
            {
                config = new AvatarConfig { UserId = userId, ConfigName = model.ConfigName };
                _context.AvatarConfigs.Add(config);
                await _context.SaveChangesAsync(); // Guardar primero para obtener ConfigId
            }

            // 2. Limpiar el mapeo antiguo (Desequipar todo)
            var oldMappings = await _context.AvatarAssetMappings
                .Where(m => m.ConfigId == config.ConfigId)
                .ToListAsync();

            _context.AvatarAssetMappings.RemoveRange(oldMappings);

            // 3. Crear el nuevo mapeo (Equipar lo nuevo)
            foreach (var assetDetail in model.Assets)
            {
                // **Validación de Propiedad:** Verificar que el jugador realmente posea el InventoryId
                var isOwner = await _context.PlayerAssetInventories
                    .AnyAsync(i => i.InventoryId == assetDetail.InventoryId && i.UserId == userId);

                if (!isOwner)
                {
                    return BadRequest($"No posees el asset con InventoryId: {assetDetail.InventoryId}.");
                }

                var newMapping = new AvatarAssetMapping
                {
                    ConfigId = config.ConfigId,
                    InventoryId = assetDetail.InventoryId,
                    EquipmentSlot = assetDetail.Slot
                };
                _context.AvatarAssetMappings.Add(newMapping);
            }

            await _context.SaveChangesAsync();

            return Ok(new { configId = config.ConfigId, message = "Configuración de avatar guardada exitosamente." });
        }


        // --- 2. CARGAR CONFIGURACIÓN DEL AVATAR ---
        // GET: api/Avatar/load/{configId}
        [HttpGet("load/{configId}")]
        public async Task<ActionResult<AvatarLoadDto>> LoadAvatarConfig(int configId)
        {
            var userId = GetUserId();

            var config = await _context.AvatarConfigs
                .Include(c => c.EquippedAssets) // Incluye la tabla de mapeo
                    .ThenInclude(m => m.InventoryItem!) // Incluye el item del inventario
                        .ThenInclude(i => i.MasterAsset!) // Incluye el asset maestro
                .FirstOrDefaultAsync(c => c.ConfigId == configId && c.UserId == userId);

            if (config == null) return NotFound("Configuración de avatar no encontrada para este usuario.");

            // 1. Mapear los datos para el cliente Godot
            var loadDto = new AvatarLoadDto
            {
                ConfigId = config.ConfigId,
                ConfigName = config.ConfigName ?? "Default Look",
                EquippedAssets = config.EquippedAssets.Select(m => new EquippedAssetDetail
                {
                    Slot = m.EquipmentSlot,
                    // Se accede a través de la cadena de navegación: Mapping -> Inventory -> MasterAsset
                    AssetName = m.InventoryItem!.MasterAsset!.AssetName,
                    StoragePath = m.InventoryItem!.MasterAsset!.StoragePath,
                    CustomProperties = m.InventoryItem!.CustomProperties // Propiedades de color/escala de la copia
                }).ToList()
            };

            return Ok(loadDto);
        }

        // --- 3. OBTENER LISTA DE CONFIGURACIONES DEL JUGADOR ---
        // GET: api/Avatar/list
        [HttpGet("list")]
        public async Task<ActionResult<IEnumerable<AvatarConfig>>> GetUserConfigs()
        {
            var userId = GetUserId();

            var configs = await _context.AvatarConfigs
                .Where(c => c.UserId == userId)
                .Select(c => new { c.ConfigId, c.ConfigName }) // Proyectar solo lo necesario
                .ToListAsync();

            return Ok(configs);
        }
    }
}
