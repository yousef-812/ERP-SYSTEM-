using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace ERP.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [HasPermission(AppPermissions.System_UserAdmin)]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLog;

        public UsersController(AppDbContext context, IAuditLogService auditLog)
        {
            _context = context;
            _auditLog = auditLog;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            var users = await _context.Users
                .AsNoTracking()
                .ToListAsync();

            var result = new List<object>();

            foreach (var u in users)
            {
                // جلب الموديولات التي يملك فيها المستخدم صلاحية واحدة على الأقل
                var modules = await _context.UserPermissions
                    .Include(up => up.Permission)
                    .Where(up => up.UserId == u.Id && up.Permission != null)
                    .Select(up => up.Permission!.Module)
                    .Distinct()
                    .ToListAsync();

                result.Add(new
                {
                    u.Id,
                    u.Username,
                    u.Role,
                    u.JobTitle,
                    u.IsActive,
                    u.CreatedAt,
                    u.LastLoginAt,
                    AssignedModules = string.Join(",", modules)
                });
            }

            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult> CreateUser([FromBody] UserCreateDto dto)
        {
            // منع إنشاء Admin من غير Admin
            var currentRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (dto.Role == "Admin" && currentRole != "Admin")
                return Forbid();

            if (!Regex.IsMatch(dto.Username, "^[a-z0-9._\\-@]+$"))
                return BadRequest(new { message = "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام ورموز (._-@) فقط." });

            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "اسم المستخدم موجود بالفعل." });

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                JobTitle = dto.JobTitle,
                IsActive = true,
                SecurityStamp = Guid.NewGuid().ToString()
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            await _auditLog.LogAsync(User.Identity?.Name ?? "System", "Create", "User",
                user.Id.ToString(), $"إنشاء مستخدم جديد: {user.Username} بدور: {user.Role}");

            return Ok(new { user.Id, user.Username, user.Role });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UserUpdateDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            var currentRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // ── منع Self-Role-Escalation ──────────────────────────────────────
            if (Guid.TryParse(currentUserIdStr, out var currentUserId) && currentUserId == id
                && dto.Role != user.Role)
                return BadRequest(new { message = "لا يمكنك تغيير دورك الخاص." });

            // ── منع ترقية لـ Admin من غير Admin ──────────────────────────────
            if (dto.Role == "Admin" && currentRole != "Admin")
                return Forbid();

            // ── منع تغيير آخر Admin ───────────────────────────────────────────
            if (user.Role == "Admin" && dto.Role != "Admin")
            {
                var adminCount = await _context.Users.CountAsync(u => u.Role == "Admin" && u.IsActive);
                if (adminCount <= 1)
                    return BadRequest(new { message = "لا يمكن تغيير دور آخر مسؤول. أنشئ مسؤولًا آخر أولًا." });
            }

            if (!Regex.IsMatch(dto.Username, "^[a-z0-9._\\-@]+$"))
                return BadRequest(new { message = "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام ورموز (._-@) فقط." });

            // ── منع تكرار اسم المستخدم ───────────────────────────────────────
            if (user.Username != dto.Username && await _context.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "اسم المستخدم موجود بالفعل." });

            user.Username = dto.Username;
            user.Role = dto.Role;
            user.JobTitle = dto.JobTitle;
            user.IsActive = dto.IsActive;

            if (!string.IsNullOrEmpty(dto.Password))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                // تغيير كلمة المرور يُبطل كل الـ sessions
                user.SecurityStamp = Guid.NewGuid().ToString();
            }

            await _context.SaveChangesAsync();
            await _auditLog.LogAsync(User.Identity?.Name ?? "System", "Update", "User",
                user.Id.ToString(), $"تحديث بيانات المستخدم: {user.Username}");

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            // منع Self-Delete
            var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (id.ToString() == currentUserIdStr)
                return BadRequest(new { message = "لا يمكنك حذف حسابك الخاص." });

            // منع حذف آخر Admin
            if (user.Role == "Admin")
            {
                var adminCount = await _context.Users.CountAsync(u => u.Role == "Admin" && u.IsActive);
                if (adminCount <= 1)
                    return BadRequest(new { message = "لا يمكن حذف آخر مسؤول. أنشئ مسؤولًا آخر أولًا." });
            }

            // Soft delete بدل الحذف الكامل — للحفاظ على Audit Trail
            user.IsActive = false;
            user.SecurityStamp = Guid.NewGuid().ToString(); // إبطال كل sessions
            await _context.SaveChangesAsync();

            await _auditLog.LogAsync(User.Identity?.Name ?? "System", "Deactivate", "User",
                id.ToString(), $"تعطيل المستخدم: {user.Username}");

            return NoContent();
        }

        public class UserCreateDto
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string Role { get; set; } = "Staff";
            public string? JobTitle { get; set; }
        }

        public class UserUpdateDto
        {
            public string Username { get; set; } = string.Empty;
            public string? Password { get; set; }
            public string Role { get; set; } = "Staff";
            public string? JobTitle { get; set; }
            public bool IsActive { get; set; } = true;
        }
    }
}
