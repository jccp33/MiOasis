using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("AvatarConfigs")]
    public class AvatarConfig
    {
        [Key]
        public int ConfigId { get; set; }
        public int UserId { get; set; }
        [MaxLength(50)]
        public string? ConfigName { get; set; }

        public ICollection<AvatarAssetMapping> EquippedAssets { get; set; } = new List<AvatarAssetMapping>();
    }
}
