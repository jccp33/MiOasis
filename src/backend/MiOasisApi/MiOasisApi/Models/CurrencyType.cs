using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("CurrencyTypes")]
    public class CurrencyType
    {
        [Key]
        public int CurrencyId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty; // Ej: "Gold", "Gems"

        [Required]
        [MaxLength(10)]
        public string Abbreviation { get; set; } = string.Empty; // Ej: "G", "GM"

        public bool IsPremium { get; set; } = false; // ¿Se puede comprar con dinero real?
    }
}
