using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("AvatarAssetMapping")]
    public class AvatarAssetMapping
    {
        [Key]
        public int MappingId { get; set; }

        public int ConfigId { get; set; }

        // FK a la copia del asset en el inventario del jugador
        public int InventoryId { get; set; }

        [Required]
        [MaxLength(50)]
        public string EquipmentSlot { get; set; } = string.Empty;

        // Propiedades de navegación
        public AvatarConfig? Config { get; set; }
        public PlayerAssetInventory? InventoryItem { get; set; }
    }
}
