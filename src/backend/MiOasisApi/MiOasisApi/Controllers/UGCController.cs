using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiOasisApi.Data;
using MiOasisApi.Models;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace MiOasis.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Todos los métodos requieren un token JWT válido por defecto
    public class UGCController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UGCController(AppDbContext context)
        {
            _context = context;
        }

        // --- DTOs (Data Transfer Objects) ---

        // DTO para la subida de un nuevo asset
        public class AssetUploadDto
        {
            [Required] public string AssetName { get; set; } = string.Empty;
            [Required] public string AssetType { get; set; } = string.Empty;
            [Required] public string StoragePath { get; set; } = string.Empty;
            [Required] public int PolyCount { get; set; }
            [Required] public float FileSizeMB { get; set; }
            // Indica si el usuario quiere que sea público (debe pasar moderación)
            public bool RequestPublicity { get; set; } = false;
        }

        // DTO para mostrar un asset público
        public class PublicAssetDto
        {
            public int AssetId { get; set; }
            public string AssetName { get; set; } = string.Empty;
            public string AssetType { get; set; } = string.Empty;
            public string StoragePath { get; set; } = string.Empty;
            public string IPOwnerName { get; set; } = string.Empty;
            public int PolyCount { get; set; }
        }

        // --- MÉTODOS DE UTILIDAD ---

        // Obtiene el ID de usuario desde el token JWT
        private int GetUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdString, out var userId))
            {
                return userId;
            }
            throw new UnauthorizedAccessException("ID de usuario no encontrado en el token.");
        }

        // --- 1. SUBIDA DE UN NUEVO ASSET (UGC) ---
        // POST: api/UGC/upload
        [HttpPost("upload")]
        public async Task<IActionResult> UploadAsset([FromBody] AssetUploadDto model)
        {
            var userId = GetUserId();

            var user = await _context.Users
                .Include(u => u.Plan)
                .Include(u => u.InventoryItems)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null || user.Plan == null) return NotFound("Usuario o Plan no encontrado.");

            // 1. VERIFICAR LÍMITES DEL PLAN DEL CREADOR (IPOwner)
            var currentAssetsCount = await _context.UserAssets.CountAsync(a => a.IPOwnerId == userId);

            if (currentAssetsCount >= user.Plan.MaxAssetsAllowed)
            {
                return BadRequest("Límite de assets permitido por tu plan alcanzado.");
            }
            if (model.PolyCount > user.Plan.MaxPolyCount || model.FileSizeMB > user.Plan.MaxTextureSizeMB)
            {
                return BadRequest("El asset excede los límites de calidad (polígonos/tamaño) de tu plan.");
            }

            // 2. CREAR ASSET MAESTRO (Catálogo)
            var newAsset = new UserAsset
            {
                AssetName = model.AssetName,
                AssetType = model.AssetType,
                StoragePath = model.StoragePath,
                PolyCount = model.PolyCount,
                FileSizeMB = model.FileSizeMB,
                IPOwnerId = userId,
                // Si el usuario solicita publicidad, el estado inicial es 'Pending'
                Status = model.RequestPublicity ? "Pending" : "Private",
                IsPublic = false // Debe ser aprobado por un admin para ser TRUE
            };

            _context.UserAssets.Add(newAsset);
            await _context.SaveChangesAsync();

            // 3. CREAR COPIA INICIAL EN EL INVENTARIO DEL CREADOR
            var inventoryItem = new PlayerAssetInventory
            {
                UserId = userId,
                MasterAssetId = newAsset.AssetId,
                CustomProperties = "{}", // Inicialmente vacío o por defecto
            };

            _context.PlayerAssetInventories.Add(inventoryItem);
            await _context.SaveChangesAsync();

            // Retornar éxito con la clave del inventario del jugador
            return Ok(new
            {
                message = "Asset subido exitosamente.",
                assetId = newAsset.AssetId,
                inventoryId = inventoryItem.InventoryId
            });
        }

        // --- 2. CATÁLOGO PÚBLICO (No requiere el rol de admin) ---
        // GET: api/UGC/catalog
        [HttpGet("catalog")]
        [AllowAnonymous] // Permite el acceso sin necesidad de estar logueado (solo lectura)
        public async Task<ActionResult<IEnumerable<PublicAssetDto>>> GetPublicCatalog()
        {
            var publicAssets = await _context.UserAssets
                .Where(a => a.IsPublic == true && a.Status == "Approved")
                .Include(a => a.IPOwner)
                .Select(a => new PublicAssetDto
                {
                    AssetId = a.AssetId,
                    AssetName = a.AssetName,
                    AssetType = a.AssetType,
                    StoragePath = a.StoragePath,
                    IPOwnerName = a.IPOwner != null ? a.IPOwner.Username : "Desconocido",
                    PolyCount = a.PolyCount
                })
                .ToListAsync();

            return Ok(publicAssets);
        }

        // --- 3. ADQUIRIR ASSET PÚBLICO (Lo añade al inventario del jugador) ---
        // POST: api/UGC/acquire/{masterAssetId}
        [HttpPost("acquire/{masterAssetId}")]
        public async Task<IActionResult> AcquirePublicAsset(int masterAssetId)
        {
            var userId = GetUserId();

            // 1. Verificar si el asset maestro existe y es público/aprobado
            var masterAsset = await _context.UserAssets.FirstOrDefaultAsync(a => a.AssetId == masterAssetId && a.IsPublic == true && a.Status == "Approved");
            if (masterAsset == null) return NotFound("Asset público no encontrado o no disponible.");

            // 2. Verificar límites del jugador que adquiere (UserId)
            var user = await _context.Users.Include(u => u.Plan).FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null || user.Plan == null) return NotFound("Usuario o Plan no encontrado.");

            var currentInventoryCount = await _context.PlayerAssetInventories.CountAsync(i => i.UserId == userId);
            if (currentInventoryCount >= user.Plan.MaxAssetsAllowed)
            {
                return BadRequest("Tu inventario está lleno. Elimina assets para adquirir nuevos.");
            }

            // 3. Crear la copia en el PlayerAssetInventory
            var inventoryItem = new PlayerAssetInventory
            {
                UserId = userId,
                MasterAssetId = masterAssetId,
                CustomProperties = "{}", // Inicia con propiedades por defecto
            };

            _context.PlayerAssetInventories.Add(inventoryItem);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Asset adquirido y añadido a tu inventario.", inventoryId = inventoryItem.InventoryId });
        }


        // --- 4. MODERACIÓN (Requiere el rol de Admin) ---
        // GET: api/UGC/moderation/pending (Para el frontend de administración)
        [HttpGet("moderation/pending")]
        [Authorize(Roles = "admin")] // Solo usuarios con el rol 'admin' pueden acceder
        public async Task<ActionResult<IEnumerable<UserAsset>>> GetPendingAssets()
        {
            // Devuelve todos los assets que están pendientes de revisión.
            var pendingAssets = await _context.UserAssets
                .Where(a => a.Status == "Pending")
                .Include(a => a.IPOwner)
                .ToListAsync();

            return Ok(pendingAssets);
        }

        // POST: api/UGC/moderation/approve/{assetId}
        [HttpPost("moderation/approve/{assetId}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> ApproveAsset(int assetId)
        {
            var asset = await _context.UserAssets.FindAsync(assetId);
            if (asset == null) return NotFound();

            // Actualizar el estado para hacerlo público
            asset.Status = "Approved";
            asset.IsPublic = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Asset ID {assetId} aprobado y ahora es público." });
        }
    }
}
