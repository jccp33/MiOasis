using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiOasisApi.Data;
using MiOasisApi.Models;
using System.Security.Claims;

namespace MiOasis.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Todas las operaciones requieren autenticación
    public class FriendsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FriendsController(AppDbContext context)
        {
            _context = context;
        }

        // --- MÉTODOS DE UTILIDAD ---
        private int GetUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdString, out var userId))
            {
                return userId;
            }
            throw new UnauthorizedAccessException("ID de usuario no encontrado en el token.");
        }

        // --- DTOs ---

        public class FriendDto
        {
            public int UserId { get; set; }
            public string Username { get; set; } = string.Empty;
            public string Status { get; set; } = string.Empty; // Accepted, Pending
        }

        // --- 1. ENVIAR SOLICITUD DE AMISTAD ---
        // POST: api/Friends/send/{targetUserId}
        [HttpPost("send/{targetUserId}")]
        public async Task<IActionResult> SendFriendRequest(int targetUserId)
        {
            var requesterId = GetUserId();

            if (requesterId == targetUserId)
            {
                return BadRequest("No puedes enviarte una solicitud a ti mismo.");
            }

            // 1. Verificar que el usuario objetivo exista
            if (!await _context.Users.AnyAsync(u => u.UserId == targetUserId))
            {
                return NotFound("Usuario objetivo no encontrado.");
            }

            // 2. Prevenir duplicados (A -> B o B -> A)
            var existingRequest = await _context.UserFriendships
                .FirstOrDefaultAsync(uf =>
                    (uf.RequesterId == requesterId && uf.TargetId == targetUserId) ||
                    (uf.RequesterId == targetUserId && uf.TargetId == requesterId));

            if (existingRequest != null)
            {
                return existingRequest.Status == "Accepted"
                    ? BadRequest("Ya sois amigos.")
                    : BadRequest($"Ya existe una solicitud con estado: {existingRequest.Status}.");
            }

            // 3. Crear la solicitud pendiente
            var newRequest = new UserFriendship
            {
                RequesterId = requesterId,
                TargetId = targetUserId,
                Status = "Pending",
                CreatedDate = DateTime.UtcNow
            };

            _context.UserFriendships.Add(newRequest);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Solicitud de amistad enviada." });
        }


        // --- 2. ACEPTAR SOLICITUD DE AMISTAD ---
        // POST: api/Friends/accept/{requesterId}
        [HttpPost("accept/{requesterId}")]
        public async Task<IActionResult> AcceptFriendRequest(int requesterId)
        {
            var targetId = GetUserId(); // El que acepta es el Target

            // 1. Buscar la solicitud pendiente donde YO soy el Target y TÚ eres el Requester
            var request = await _context.UserFriendships
                .FirstOrDefaultAsync(uf => uf.RequesterId == requesterId && uf.TargetId == targetId && uf.Status == "Pending");

            if (request == null)
            {
                return NotFound("Solicitud de amistad pendiente no encontrada.");
            }

            // 2. Actualizar el estado a "Accepted"
            request.Status = "Accepted";
            request.AcceptedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Solicitud de amistad aceptada." });
        }


        // --- 3. OBTENER LISTA DE AMIGOS Y SOLICITUDES ---
        // GET: api/Friends/list
        [HttpGet("list")]
        public async Task<ActionResult<IEnumerable<FriendDto>>> GetFriendList()
        {
            var userId = GetUserId();

            // Buscar todas las relaciones donde el usuario es el Requester O el Target
            var friendships = await _context.UserFriendships
                .Where(uf => uf.RequesterId == userId || uf.TargetId == userId)
                .Include(uf => uf.Requester)
                .Include(uf => uf.Target)
                .ToListAsync();

            var friendList = friendships.Select(uf =>
            {
                // Determinar quién es el "amigo" y cuál es el estado de la relación
                var friend = uf.RequesterId == userId ? uf.Target : uf.Requester;

                return new FriendDto
                {
                    UserId = friend!.UserId,
                    Username = friend.Username,
                    Status = uf.Status,
                };
            }).ToList();

            return Ok(friendList);
        }

        // --- 4. RECHAZAR O ELIMINAR AMIGO ---
        // DELETE: api/Friends/remove/{friendId}
        [HttpDelete("remove/{friendId}")]
        public async Task<IActionResult> RemoveFriend(int friendId)
        {
            var userId = GetUserId();

            // Buscar la relación (sin importar quién fue el Requester y quién fue el Target)
            var friendship = await _context.UserFriendships
                .FirstOrDefaultAsync(uf =>
                    (uf.RequesterId == userId && uf.TargetId == friendId) ||
                    (uf.RequesterId == friendId && uf.TargetId == userId));

            if (friendship == null)
            {
                return NotFound("La amistad o solicitud no existe.");
            }

            // Eliminar la relación (sirve para rechazar solicitudes pendientes o eliminar amigos existentes)
            _context.UserFriendships.Remove(friendship);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
