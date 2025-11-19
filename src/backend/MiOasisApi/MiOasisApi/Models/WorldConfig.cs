using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("WorldConfigs")]
    public class WorldConfig
    {
        [Key]
        public int WorldId { get; set; }
        [Required, MaxLength(50)]
        public string WorldName { get; set; } = string.Empty;
        [MaxLength(100)]
        public string MapSceneName { get; set; } = string.Empty;
        public float ParamGravity { get; set; }
        public float ParamSizeX { get; set; }
        public float ParamSizeY { get; set; }
        [MaxLength(20)]
        public string ParamPhysicsMode { get; set; } = "Standard";
        public DateTime CreationDate { get; set; } = DateTime.UtcNow;
        public ICollection<WorldInstance> ActiveInstances { get; set; } = new List<WorldInstance>();
    }
}
