using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("PlayerAssetInventory")]
    public class PlayerAssetInventory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int InventoryId { get; set; }

        // El jugador que posee esta copia
        public int UserId { get; set; }

        // Referencia al asset original en el catálogo maestro
        public int MasterAssetId { get; set; }

        // Almacena las modificaciones del jugador (ej. color)
        [Column(TypeName = "jsonb")]
        public string? CustomProperties { get; set; } // Usar string para mapear a JSONB

        // Propiedades de navegación
        public User? User { get; set; }
        public UserAsset? MasterAsset { get; set; }
    }
}
