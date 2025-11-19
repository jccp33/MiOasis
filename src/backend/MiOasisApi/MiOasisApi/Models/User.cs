using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [MaxLength(20)]
        public string Role { get; set; } = "gamer";

        // FK a Planes
        public int? PlanId { get; set; } // Puede ser nulo si no se asigna inmediatamente

        public SubscriptionPlan? Plan { get; set; }

        // UGC: Assets creados por este usuario (IP Owner)
        public ICollection<UserAsset> CreatedAssets { get; set; } = new List<UserAsset>();

        // Inventario: Copias que este usuario posee
        public ICollection<PlayerAssetInventory> InventoryItems { get; set; } = new List<PlayerAssetInventory>();
    }
}
