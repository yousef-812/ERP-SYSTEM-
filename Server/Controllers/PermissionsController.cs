using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;
using System.Security.Claims;using ERP.Api.Services;
using Microsoft.Extensions.Caching.Memory;

namespace ERP.Api.Controllers
{
    [HasPermission(AppPermissions.System_UserAdmin)]
    [ApiController]
    [Route("api/[controller]")]
    public class PermissionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly IAuditLogService _auditLog;

        public PermissionsController(AppDbContext context, IMemoryCache cache, IAuditLogService auditLog)
        {
            _context = context;
            _cache = cache;
            _auditLog = auditLog;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Permission>>> GetPermissions()
        {
            return await _context.Permissions
                .OrderBy(p => p.Module)
                .ThenBy(p => p.Name)
                .ToListAsync();
        }

        [HttpGet("sod-conflicts")]
        public ActionResult<IEnumerable<object>> GetSodRules()
        {
            return Ok(AppPermissions.SodRules.Select(r => new
            {
                permissionA = r.A,
                permissionB = r.B,
                reason = r.Reason
            }));
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<Guid>>> GetUserPermissions(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
                return BadRequest(new { message = $"معرف المستخدم غير صالح: {userId}" });

            return await _context.UserPermissions
                .Where(up => up.UserId == userGuid)
                .Select(up => up.PermissionId)
                .ToListAsync();
        }

        [HttpPost("user/{userId}")]
        public async Task<IActionResult> UpdateUserPermissions(Guid userId, [FromBody] List<Guid> permissionIds)
        {
            // ── 1. منع Self-Escalation ────────────────────────────────────────
            var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid? currentUserId = Guid.TryParse(currentUserIdStr, out var parsedId) ? parsedId : null;

            if (currentUserId.HasValue && currentUserId.Value == userId)
                return BadRequest(new { message = "لا يمكنك تعديل صلاحياتك الخاصة. اطلب من مسؤول آخر القيام بذلك." });

            var targetUser = await _context.Users.FindAsync(userId);
            if (targetUser == null) return NotFound("المستخدم غير موجود.");

            // ── 2. حماية الـ Super Admins وحسابات الآخرين ─────────────────────
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            // قصر تعديل صلاحيات الـ Admin على Admin آخر فقط
            if (targetUser.Role == "Admin" && currentUserRole != "Admin")
                return Forbid();

            // ── 3. جلب الصلاحيات الصالحة ──────────────────
            // استخدام البحث المباشر عن الـ IDs
            var validPermissions = await _context.Permissions
                .Where(p => permissionIds.Contains(p.Id))
                .ToListAsync();

            // إذا كان هناك اختلاف في العدد، قد يكون بسبب حالة الأحرف في SQLite
            if (validPermissions.Count != permissionIds.Distinct().Count())
            {
                var missingIds = permissionIds.Distinct().Except(validPermissions.Select(p => p.Id)).ToList();
                Console.WriteLine($"[Permissions Warning] Missing IDs detected: {string.Join(", ", missingIds)}");
                
                // إذا كان المستخدم Admin، سنتجاوز الخطأ ونحفظ ما وجدناه فقط لضمان استمرارية العمل
                if (targetUser.Role == "Admin")
                {
                    Console.WriteLine("[Permissions] Admin bypass: saving valid permissions only.");
                }
                else
                {
                    return BadRequest(new { 
                        message = "بعض الصلاحيات المرسلة غير موجودة. يرجى تحديث الصفحة.",
                        error_code = "STALE_PERMISSION_DATA",
                        missing_ids = missingIds
                    });
                }
            }

            var permissionNames = validPermissions.Select(p => p.Name).ToList();
            var conflicts = new List<string>();

            foreach (var rule in AppPermissions.SodRules)
            {
                if (permissionNames.Contains(rule.A) && permissionNames.Contains(rule.B))
                    conflicts.Add(rule.Reason);
            }

            // --- 4. تطبيق التغييرات (Allow saving even with conflicts) ---
            var existing = await _context.UserPermissions.Where(up => up.UserId == userId).ToListAsync();
            _context.UserPermissions.RemoveRange(existing);

            foreach (var p in validPermissions)
            {
                _context.UserPermissions.Add(new UserPermission
                {
                    UserId = userId,
                    PermissionId = p.Id,
                    GrantedByUserId = currentUserId,
                    GrantedAt = DateTime.UtcNow
                });
            }

            // ── 5. تحديث SecurityStamp لإبطال الـ JWT القديم ─────────────────
            targetUser.SecurityStamp = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            _cache.Remove($"UserAuth_{userId}");
            await _auditLog.LogAsync(User.Identity?.Name ?? "System", "UpdatePermissions", "User", userId.ToString(), "تم تحديث الصلاحيات وإبطال الجلسات السابقة");

            return Ok(new { 
                message = "تم تحديث الصلاحيات بنجاح. سيحتاج المستخدم لإعادة تسجيل الدخول.",
                warnings = conflicts 
            });
        }

        [HttpGet("user/{userId}/warehouses")]
        public async Task<ActionResult<IEnumerable<Guid>>> GetUserWarehouses(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
                return BadRequest(new { message = $"معرف المستخدم غير صالح: {userId}" });

            return await _context.UserWarehouses
                .Where(uw => uw.UserId == userGuid)
                .Select(uw => uw.WarehouseId)
                .ToListAsync();
        }

        [HttpPost("user/{userId}/warehouses")]
        public async Task<IActionResult> UpdateUserWarehouses(Guid userId, [FromBody] List<Guid> warehouseIds)
        {
            // منع Self-Edit
            var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(currentUserIdStr, out var currentUserId) && currentUserId == userId)
                return BadRequest(new { message = "لا يمكنك تعديل مخازنك الخاصة." });

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("المستخدم غير موجود.");

            var existing = await _context.UserWarehouses.Where(uw => uw.UserId == userId).ToListAsync();
            _context.UserWarehouses.RemoveRange(existing);

            foreach (var wId in warehouseIds)
            {
                _context.UserWarehouses.Add(new UserWarehouse
                {
                    UserId = userId,
                    WarehouseId = wId
                });
            }

            // تحديث SecurityStamp
            user.SecurityStamp = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            _cache.Remove($"UserAuth_{userId}");
            await _auditLog.LogAsync(User.Identity?.Name ?? "System", "UpdateWarehouses", "User", userId.ToString(), "تم تحديث صلاحيات المستودعات وإبطال الجلسات السابقة");

            return Ok(new { message = "تم تحديث المخازن بنجاح." });
        }
    }
}
