using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiOasisApi.Data;
using MiOasisApi.Models;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace MiOasis.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Requiere token JWT para la mayoría de operaciones
    public class WorldController : ControllerBase
    {
        private readonly AppDbContext _context;
        // Límite de jugadores por instancia. ¡Ajusta este valor!
        private const int MaxPlayersPerInstance = 100;

        public WorldController(AppDbContext context)
        {
            _context = context;
        }

        // --- DTOs (Data Transfer Objects) ---

        // DTO para registrar una nueva instancia de servidor
        public class InstanceRegisterDto
        {
            [Required] public int WorldConfigId { get; set; }
            [Required] public string IpAddress { get; set; } = string.Empty;
            [Required] public int Port { get; set; }
        }

        // DTO para actualizar el conteo de jugadores (Heartbeat)
        public class PlayerCountUpdateDto
        {
            [Required] public int PlayerCount { get; set; }
        }

        // DTO para la respuesta de asignación de servidor
        public class ServerAssignmentDto
        {
            public string IpAddress { get; set; } = string.Empty;
            public int Port { get; set; }
            public int InstanceId { get; set; }
            public string WorldName { get; set; } = string.Empty;
        }

        // --- 1. CONSULTAR CONFIGURACIÓN DEL MUNDO (Para el Servidor de Juego) ---
        // GET: api/World/config/{worldId}
        [HttpGet("config/{worldId}")]
        [AllowAnonymous] // Se permite sin token para la inicialización del servidor de juego
        public async Task<ActionResult<WorldConfig>> GetWorldConfig(int worldId)
        {
            var config = await _context.WorldConfigs.FindAsync(worldId);

            if (config == null)
            {
                return NotFound("Configuración de mundo no encontrada.");
            }
            return Ok(config);
        }

        // --- 2. REGISTRAR UNA NUEVA INSTANCIA DE SERVIDOR ---
        // POST: api/World/register
        [HttpPost("register")]
        [Authorize(Roles = "admin,server")] // Solo servidores o administradores pueden registrar
        public async Task<IActionResult> RegisterInstance([FromBody] InstanceRegisterDto model)
        {
            // 1. Verificar si la configuración base existe
            var config = await _context.WorldConfigs.FindAsync(model.WorldConfigId);
            if (config == null)
            {
                return NotFound("Configuración de mundo no válida.");
            }

            // 2. Crear nueva instancia
            var instance = new WorldInstance
            {
                WorldId = model.WorldConfigId,
                IpAddress = model.IpAddress,
                Port = model.Port,
                CurrentPlayers = 0,
                StartTime = DateTime.UtcNow
            };

            _context.WorldInstances.Add(instance);
            await _context.SaveChangesAsync();

            // Devuelve el ID de instancia, que el servidor de juego usará para futuros updates
            return CreatedAtAction(nameof(RegisterInstance), new { instanceId = instance.InstanceId }, instance);
        }

        // --- 3. ACTUALIZAR CONTEO DE JUGADORES (Heartbeat del Servidor) ---
        // PUT: api/World/update/{instanceId}
        [HttpPut("update/{instanceId}")]
        [Authorize(Roles = "admin,server")]
        public async Task<IActionResult> UpdatePlayerCount(int instanceId, [FromBody] PlayerCountUpdateDto model)
        {
            var instance = await _context.WorldInstances.FindAsync(instanceId);

            if (instance == null)
            {
                return NotFound("Instancia de mundo no encontrada. Posiblemente desconectada o dada de baja.");
            }

            if (model.PlayerCount < 0) return BadRequest("El conteo de jugadores no puede ser negativo.");

            instance.CurrentPlayers = model.PlayerCount;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Conteo de jugadores actualizado." });
        }

        // --- 4. ASIGNACIÓN DE SERVIDOR (Load Balancing para el Cliente Godot) ---
        // POST: api/World/join/{worldConfigId}
        [HttpPost("join/{worldConfigId}")]
        public async Task<ActionResult<ServerAssignmentDto>> JoinWorld(int worldConfigId)
        {
            // Nota: Podrías necesitar el UserId aquí para validar si tiene acceso al mundo

            // 1. Balanceo de Carga: Buscar la instancia activa para este WorldConfigId 
            //    que tenga menos jugadores Y no esté llena.
            var availableInstance = await _context.WorldInstances
                .Where(i => i.WorldId == worldConfigId && i.CurrentPlayers < MaxPlayersPerInstance)
                .Include(i => i.WorldConfig)
                .OrderBy(i => i.CurrentPlayers) // Ordenar por menos jugadores
                .FirstOrDefaultAsync();

            if (availableInstance == null)
            {
                // Si no hay instancias disponibles, el cliente deberá esperar o solicitar un nuevo servidor
                return StatusCode(503, "No hay servidores disponibles para este mundo en este momento.");
            }

            // 2. Incrementar el contador (Optimistic Concurrency Control no implementado por simpleza)
            availableInstance.CurrentPlayers += 1;
            await _context.SaveChangesAsync();

            // 3. Devolver la información de conexión al cliente Godot
            var assignmentDto = new ServerAssignmentDto
            {
                IpAddress = availableInstance.IpAddress,
                Port = availableInstance.Port,
                InstanceId = availableInstance.InstanceId,
                WorldName = availableInstance.WorldConfig!.WorldName
            };

            return Ok(assignmentDto);
        }

        // --- 5. DAR DE BAJA INSTANCIA (Cuando el servidor de juego se apaga) ---
        // DELETE: api/World/deregister/{instanceId}
        [HttpDelete("deregister/{instanceId}")]
        [Authorize(Roles = "admin,server")]
        public async Task<IActionResult> DeregisterInstance(int instanceId)
        {
            var instance = await _context.WorldInstances.FindAsync(instanceId);

            if (instance == null)
            {
                return NoContent(); // No hay nada que borrar
            }

            _context.WorldInstances.Remove(instance);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/World/leave/{instanceId}
        // Utilizado por el cliente Godot justo antes de desconectarse o al cambiar de mundo.
        [HttpPost("leave/{instanceId}")]
        public async Task<IActionResult> LeaveWorld(int instanceId)
        {
            // Usaremos el mismo rol de actualización, ya que es el servidor el que debería saber cuándo sale el cliente.
            // Alternativamente, el cliente podría enviar el ID de instancia para que el backend lo maneje.

            var instance = await _context.WorldInstances.FindAsync(instanceId);

            if (instance == null) return NotFound("Instancia no activa.");

            if (instance.CurrentPlayers > 0)
            {
                instance.CurrentPlayers -= 1;
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Señal de salida procesada." });
        }
    }
}
