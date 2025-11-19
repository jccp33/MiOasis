using System.ComponentModel.DataAnnotations;

namespace MiOasisApi.Models
{
    public class SimpleSubscriptionPlan
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
    }
}
