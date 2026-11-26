using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Linq;
using ERP.Api.Authorization;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services;

namespace ERP.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IAuditLogService _auditLog;

        public AuthController(AppDbContext context, IConfiguration configuration, IAuditLogService auditLog)
        {
            _context = context;
            _configuration = configuration;
            _auditLog = auditLog;
        }

        public class LoginDto
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<ActionResult> Login([FromBody] LoginDto loginDto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == loginDto.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                return Unauthorized(new { error = "invalid_credentials", message = "اسم المستخدم أو كلمة المرور غير صحيحة." });

            if (!user.IsActive)
                return Unauthorized(new { error = "account_disabled", message = "هذا الحساب موقوف. تواصل مع المسؤول." });

            // جلب الصلاحيات
            var permissions = await _context.UserPermissions
                .Where(up => up.UserId == user.Id)
                .Include(up => up.Permission)
                .Select(up => up.Permission!.Name)
                .ToListAsync();

            // إضافة صلاحيات Admin الثابتة إذا كان Admin
            if (user.Role == "Admin")
            {
                var adminPerms = new[]
                {
                    "View Dashboard", "View Audit Logs", "User Administration",
                    "Manage System Settings", "View Business Activity",
                    "Manage Documents", "Approve All Workflows",
                    AppPermissions.Accounting_ReportsAndBI
                };
                permissions = permissions.Union(adminPerms).Distinct().ToList();
            }

            var assignedWarehouseIds = await _context.UserWarehouses
                .Where(uw => uw.UserId == user.Id)
                .Select(uw => uw.WarehouseId)
                .ToListAsync();

            // تحديث LastLoginAt
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // بناء الـ JWT مع SecurityStamp
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["JwtSettings:Secret"]
                ?? throw new InvalidOperationException("JWT Secret missing"));

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Role, user.Role),
                    // SecurityStamp مدمج في الـ Token — أي تغيير في الصلاحيات يُبطله
                    new Claim("SecurityStamp", user.SecurityStamp)
                }),
                Expires = DateTime.UtcNow.AddHours(8), // 8 ساعات بدل 7 أيام
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            await _auditLog.LogAsync(user.Username, "Login", "User", user.Id.ToString(),
                "تسجيل دخول ناجح.");

            return Ok(new
            {
                Token = tokenHandler.WriteToken(token),
                User = new
                {
                    user.Id,
                    user.Username,
                    user.Role,
                    Permissions = permissions,
                    AssignedWarehouses = assignedWarehouseIds
                }
            });
        }
    }
}
