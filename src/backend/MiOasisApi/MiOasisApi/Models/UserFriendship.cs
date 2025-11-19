using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiOasisApi.Models
{
    [Table("UserFriendship")]
    public class UserFriendship
    {
        [Key]
        public int Id { get; set; }

        // El usuario que INICIA la solicitud
        public int RequesterId { get; set; }
        [ForeignKey("RequesterId")]
        public User? Requester { get; set; }

        // El usuario que RECIBE la solicitud
        public int TargetId { get; set; }
        [ForeignKey("TargetId")]
        public User? Target { get; set; }

        // Estado de la amistad: 'Pending', 'Accepted', 'Blocked'
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public DateTime? AcceptedDate { get; set; }
    }
}
