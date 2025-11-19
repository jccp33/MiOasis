using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("SubscriptionPlans")]
    public class SubscriptionPlan
    {
        [Key]
        public int PlanId { get; set; }

        [Required]
        [MaxLength(50)]
        public string PlanName { get; set; } = string.Empty;

        public int MaxAssetsAllowed { get; set; }
        public int MaxPolyCount { get; set; }
        public float MaxTextureSizeMB { get; set; }
        public decimal PriceMonthly { get; set; }

        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
