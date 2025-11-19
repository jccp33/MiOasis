using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("UserAssets")]
    public class UserAsset
    {
        [Key]
        public int AssetId { get; set; }

        [Required]
        [MaxLength(100)]
        public string AssetName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string AssetType { get; set; } = string.Empty;

        [Required]
        [MaxLength(512)]
        public string StoragePath { get; set; } = string.Empty;

        public int PolyCount { get; set; }

        public float FileSizeMB { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        public bool IsPublic { get; set; } = false;

        public int IPOwnerId { get; set; }

        [MaxLength(512)]
        public string? ThumbnailPath { get; set; }

        [MaxLength(100)]
        public string? ContentType { get; set; }

        [MaxLength(10)]
        public string? FileExtension { get; set; }

        public User? IPOwner { get; set; }
    }

    public class AssetUploadDto
    {
        [Required]
        public string AssetName { get; set; } = string.Empty;

        [Required]
        public string AssetType { get; set; } = "Model";

        [Required]
        public int IPOwnerId { get; set; }

        public int PolyCount { get; set; } = 0;

        public bool IsPublic { get; set; } = false;

        // --- ARCHIVOS REALES ---
        [Required(ErrorMessage = "El archivo del asset es obligatorio.")]
        public IFormFile File { get; set; }

        public IFormFile? Thumbnail { get; set; }
    }
}
