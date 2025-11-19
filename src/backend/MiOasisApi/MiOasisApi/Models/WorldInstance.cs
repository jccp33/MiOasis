using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("WorldInstances")]
    public class WorldInstance
    {
        [Key]
        public int InstanceId { get; set; }
        public int WorldId { get; set; }
        [Required, MaxLength(50)]
        public string IpAddress { get; set; } = string.Empty;
        public int Port { get; set; }
        public int CurrentPlayers { get; set; }
        public DateTime StartTime { get; set; } = DateTime.UtcNow;

        public WorldConfig? WorldConfig { get; set; }
    }
}
