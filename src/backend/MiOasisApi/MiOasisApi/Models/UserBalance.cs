using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("UserBalances")]
    public class UserBalance
    {
        // Clave primaria compuesta para asegurar unicidad (Usuario + Moneda)
        // Usaremos una clave primaria simple y aseguraremos la unicidad en EF Core
        [Key]
        public int BalanceId { get; set; }

        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User? User { get; set; }

        public int CurrencyId { get; set; }
        [ForeignKey("CurrencyId")]
        public CurrencyType? CurrencyType { get; set; }

        // Usamos 'decimal' para mayor precisión en transacciones financieras
        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; } = 0.00m;
    }

    public class UserBalanceDetailDto : UserBalance
    {
        public string Username { get; set; } = string.Empty;
        public string CurrencyName { get; set; } = string.Empty;
        public string CurrencyAbbreviation { get; set; } = string.Empty;
    }
}
