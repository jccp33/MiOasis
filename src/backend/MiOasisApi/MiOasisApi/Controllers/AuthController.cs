using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MiOasisApi.Data;
using MiOasisApi.Models;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MiOasis.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPasswordHasher<User> _passwordHasher = new PasswordHasher<User>();
        private readonly IConfiguration _configuration;

        // Inyección de dependencias: DbContext y IConfiguration (para secretos JWT)
        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // --- Modelos DTO (Data Transfer Objects) ---
        // Se usan para la entrada/salida de la API.

        public class RegisterDto
        {
            [Required] public string Username { get; set; } = string.Empty;
            [Required] public string Password { get; set; } = string.Empty;
            [Required] public string Email { get; set; } = string.Empty;
        }

        public class LoginDto
        {
            [Required] public string Username { get; set; } = string.Empty;
            [Required] public string Password { get; set; } = string.Empty;
        }

        // --- 1. ENDPOINT DE REGISTRO ---
        // POST: api/Auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            // 1. Verificar si el usuario ya existe
            if (await _context.Users.AnyAsync(u => u.Username == model.Username))
            {
                return BadRequest(new { message = "El nombre de usuario ya está en uso." });
            }

            // 2. Asignar Plan Básico por Defecto (PlanId=1 es un supuesto común, ajústalo si no lo es)
            var basicPlan = await _context.SubscriptionPlans.FirstOrDefaultAsync(p => p.PlanName == "Basico");
            if (basicPlan == null)
            {
                // Si el plan básico no existe, es un error de configuración
                return StatusCode(500, new { message = "Error interno: Plan Básico no encontrado. Popule la tabla de planes." });
            }

            // 3. Crear el nuevo usuario
            var user = new User
            {
                Username = model.Username,
                Email = model.Email,
                PlanId = basicPlan.PlanId,
                Status = "active", // Por defecto
                Role = "gamer"     // Por defecto
            };

            // 4. Hashear la contraseña (Seguridad)
            user.PasswordHash = _passwordHasher.HashPassword(user, model.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Retorna éxito
            return Ok(new { userId = user.UserId, username = user.Username, message = "Registro exitoso." });
        }


        // --- 2. ENDPOINT DE LOGIN ---
        // POST: api/Auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            // 1. Buscar usuario por nombre de usuario
            var user = await _context.Users
                .Include(u => u.Plan) // Incluir el plan para devolver información útil
                .FirstOrDefaultAsync(u => u.Username == model.Username);

            // 2. Verificar existencia, estado y contraseña
            if (user == null)
            {
                return Unauthorized(new { message = "Credenciales inválidas." });
            }

            // Verificar si el usuario está activo (puede estar baneado)
            if (user.Status != "active")
            {
                return Unauthorized(new { message = $"Cuenta {user.Status}. Contacte soporte." });
            }


            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, model.Password);

            if (result == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new { message = "Credenciales inválidas." });
            }

            // 3. Generar Token JWT (Si las credenciales son válidas)
            var token = GenerateJwtToken(user);

            return Ok(new
            {
                userId = user.UserId,
                username = user.Username,
                role = user.Role,
                token = token,
                plan = user.Plan?.PlanName // Devuelve el nombre del plan
            });
        }

        // --- MÉTODO PRIVADO PARA GENERAR JWT ---
        private string GenerateJwtToken(User user)
        {
            // 1. Definir los Claims (Información que contendrá el token)
            var claims = new List<Claim>
            {
                // Identificadores esenciales
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                // Información de seguridad y permisos
                new Claim(ClaimTypes.Role, user.Role)
            };

            // 2. Obtener la clave secreta
            var secret = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key no está configurado.");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // 3. Crear el Token
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7), // El token expira en 7 días
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
