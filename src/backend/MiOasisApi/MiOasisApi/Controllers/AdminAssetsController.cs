using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiOasisApi.Models;
using Npgsql;
using System.Data;
using System.Text;

namespace MiOasisApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class AdminAssetsController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly IWebHostEnvironment _environment;
        private const string TableName = "\"UserAssets\"";
        private IDbConnection Connection => new NpgsqlConnection(_connectionString);

        public AdminAssetsController(IConfiguration configuration, IWebHostEnvironment environment)
        {
            _connectionString = configuration.GetConnectionString("PostgresConnection")
                ?? throw new InvalidOperationException("Connection string not found.");
            _environment = environment;
        }

        // =================================================================
        // R - READ (Paginado): Listar Assets con detalles del dueño y filtro
        // =================================================================
        [HttpGet("paginate")]
        public async Task<IActionResult> GetPaginatedAssets(
            [FromQuery] string? filter = null,
            [FromQuery] int page = 1,
            [FromQuery] int itemsPerPage = 10)
        {
            // 1. VALIDACIÓN DE ENTRADA
            if (page < 1 || itemsPerPage < 1 || itemsPerPage > 100)
            {
                return BadRequest(new { message = "Parámetros de paginación inválidos (página >= 1, itemsPerPage 1-100)." });
            }
            // Definición de las tablas y columnas a usar
            const string BaseSql = @"
            FROM ""UserAssets"" a
            INNER JOIN ""Users"" u ON a.""IPOwnerId"" = u.""UserId""";
            // Columnas a seleccionar para el frontend
            const string SelectColumns = @"
            a.""AssetId"", a.""AssetName"", a.""AssetType"", a.""Status"", 
            a.""IsPublic"", a.""IPOwnerId"", u.""Username"" as ""OwnerName"",
            a.""PolyCount"", a.""FileSizeMB"", a.""ThumbnailPath""";
            var parameters = new DynamicParameters();
            var whereClause = new StringBuilder();
            // 2. PROCESAMIENTO DE FILTROS (AssetName o Username)
            if (!string.IsNullOrWhiteSpace(filter))
            {
                whereClause.Append(" WHERE ");
                whereClause.Append(@"a.""AssetName"" ILIKE @FilterTerm OR ");
                whereClause.Append(@"u.""Username"" ILIKE @FilterTerm");
                parameters.Add("FilterTerm", $"%{filter.Trim()}%");
            }
            int totalItems = 0;
            try
            {
                using (var db = Connection)
                {
                    // --- 3. CONSULTA DE TOTAL DE ELEMENTOS (COUNT) ---
                    string countSql = $"SELECT COUNT(*) {BaseSql} {whereClause}";
                    totalItems = await db.ExecuteScalarAsync<int>(countSql, parameters);
                    // --- 4. CÁLCULO DE PAGINACIÓN ---
                    int totalPages = (int)Math.Ceiling((double)totalItems / itemsPerPage);
                    int currentPage = Math.Max(1, Math.Min(page, totalPages > 0 ? totalPages : 1));
                    int offset = (currentPage - 1) * itemsPerPage;
                    // --- 5. CONSULTA DE DATOS PAGINADOS ---
                    string dataSql = $@"
                    SELECT {SelectColumns}
                    {BaseSql}
                    {whereClause}
                    ORDER BY a.""AssetId"" DESC -- Ordenamos por ID, los más nuevos primero
                    LIMIT @Limit OFFSET @Offset";
                    // Agregar parámetros de paginación
                    parameters.Add("Limit", itemsPerPage);
                    parameters.Add("Offset", offset);
                    var data = await db.QueryAsync<dynamic>(dataSql, parameters);
                    // --- 6. DEVOLVER RESPUESTA ---
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
                return StatusCode(500, new { message = "Error interno al obtener assets paginados.", detail = ex.Message });
            }
        }
        
        // =================================================================
        // C - CREATE (Upload): Subir un nuevo Asset con Archivo
        // =================================================================
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadAsset([FromForm] AssetUploadDto model)
        {
            if (model.File == null || model.File.Length == 0)
                return BadRequest(new { message = "El archivo principal es obligatorio." });
            // 1. Validar Dueño
            using (var db = Connection)
            {
                var userExists = await db.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM \"Users\" WHERE \"UserId\" = @IPOwnerId",
                    new { model.IPOwnerId });
                if (userExists == 0) return BadRequest(new { message = "El Propietario (IP Owner) no existe." });
                // 2. Guardar Archivo Principal
                string storagePath = await SaveFileAsync(model.File, "assets");
                string fileExtension = Path.GetExtension(model.File.FileName).ToLower();
                string contentType = model.File.ContentType;
                // Calcular tamaño en MB
                float fileSizeMB = (float)model.File.Length / (1024 * 1024);
                // 3. Guardar Thumbnail (si existe)
                string? thumbPath = null;
                if (model.Thumbnail != null && model.Thumbnail.Length > 0)
                {
                    thumbPath = await SaveFileAsync(model.Thumbnail, "thumbnails");
                }
                // 4. Insertar en Base de Datos
                const string sql = $@"
                    INSERT INTO {TableName} (
                        ""AssetName"", ""AssetType"", ""StoragePath"", ""ThumbnailPath"",
                        ""ContentType"", ""FileExtension"", ""PolyCount"", ""FileSizeMB"", 
                        ""Status"", ""IsPublic"", ""IPOwnerId""
                    )
                    VALUES (
                        @AssetName, @AssetType, @StoragePath, @ThumbnailPath,
                        @ContentType, @FileExtension, @PolyCount, @FileSizeMB, 
                        'Approved', @IsPublic, @IPOwnerId 
                    )
                    RETURNING ""AssetId""";
                var newId = await db.ExecuteScalarAsync<int>(sql, new
                {
                    model.AssetName,
                    model.AssetType,
                    StoragePath = storagePath,
                    ThumbnailPath = thumbPath,
                    ContentType = contentType,
                    FileExtension = fileExtension,
                    model.PolyCount,
                    FileSizeMB = fileSizeMB,
                    model.IsPublic,
                    model.IPOwnerId
                });
                return Ok(new { message = "Asset subido con éxito", assetId = newId, path = storagePath });
            }
        }

        // =================================================================
        // R - READ: Obtener Asset (con detalles del dueño)
        // =================================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetAssetById(int id)
        {
            const string sql = $@"
                SELECT a.*, u.""Username"" as ""OwnerName""
                FROM {TableName} a
                INNER JOIN ""Users"" u ON a.""IPOwnerId"" = u.""UserId""
                WHERE a.""AssetId"" = @Id";
            using (var db = Connection)
            {
                var asset = await db.QueryFirstOrDefaultAsync<dynamic>(sql, new { Id = id });
                if (asset == null) return NotFound(new { message = "Asset no encontrado." });
                return Ok(asset);
            }
        }

        // =================================================================
        // U - UPDATE: Moderación (Solo metadatos, no reemplazo de archivo)
        // =================================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAssetStatus(int id, [FromBody] UserAsset model)
        {
            // Este endpoint se usa para BANEAR, APROBAR o cambiar visibilidad
            const string sql = $@"
                UPDATE {TableName} SET 
                    ""AssetName"" = @AssetName,
                    ""Status"" = @Status,
                    ""IsPublic"" = @IsPublic
                WHERE ""AssetId"" = @AssetId";
            using (var db = Connection)
            {
                var rows = await db.ExecuteAsync(sql, new { model.AssetName, model.Status, model.IsPublic, AssetId = id });
                if (rows == 0) return NotFound();
                return NoContent();
            }
        }

        // =================================================================
        // D - DELETE: Eliminar Asset y sus Archivos Físicos
        // =================================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAsset(int id)
        {
            using (var db = Connection)
            {
                // 1. Obtener rutas de archivos antes de borrar el registro
                var asset = await db.QueryFirstOrDefaultAsync<UserAsset>(
                    $"SELECT * FROM {TableName} WHERE \"AssetId\" = @Id", new { Id = id });
                if (asset == null) return NotFound();
                try
                {
                    // 2. Intentar borrar registro de BD
                    var rows = await db.ExecuteAsync($"DELETE FROM {TableName} WHERE \"AssetId\" = @Id", new { Id = id });
                    // 3. Si se borró de BD, borrar archivos físicos para liberar espacio
                    if (rows > 0)
                    {
                        DeleteFileFromDisk(asset.StoragePath);
                        if (!string.IsNullOrEmpty(asset.ThumbnailPath)) DeleteFileFromDisk(asset.ThumbnailPath);
                    }
                    return NoContent();
                }
                catch (PostgresException ex) when (ex.SqlState == "23503") // FK constraint
                {
                    return Conflict(new { message = "No se puede eliminar el asset porque está en uso en inventarios." });
                }
            }
        }

        // =================================================================
        // ----------------------- PRIVATE METHODS ---------------------- //
        // =================================================================
        // HELPER: Guardar Archivo en Disco
        // =================================================================
        private async Task<string> SaveFileAsync(IFormFile file, string folderName)
        {
            // 1. Crear la ruta si no existe: wwwroot/uploads/assets
            string uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", folderName);
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }
            // 2. Generar nombre único para evitar colisiones (guid_nombreoriginal.ext)
            string uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
            string filePath = Path.Combine(uploadsFolder, uniqueFileName);
            // 3. Guardar el archivo
            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }
            // 4. Retornar la ruta relativa para guardar en BD (ej: /uploads/assets/abc.glb)
            return $"/uploads/{folderName}/{uniqueFileName}";
        }

        private void DeleteFileFromDisk(string relativePath)
        {
            try
            {
                // Convertir ruta relativa (/uploads/...) a absoluta (C:\wwwroot\uploads\...)
                string absolutePath = Path.Combine(_environment.WebRootPath, relativePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(absolutePath))
                {
                    System.IO.File.Delete(absolutePath);
                }
            }
            catch (Exception ex)
            {
                // Loguear error pero no detener la respuesta, el registro de BD ya fue borrado
                Console.WriteLine($"Error borrando archivo {relativePath}: {ex.Message}");
            }
        }


        // next
    }
}
