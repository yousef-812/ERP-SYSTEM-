using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ERP.Api.Data;
using Microsoft.Extensions.Caching.Memory;

namespace ERP.Api.Authorization
{
    public class UserAuthCacheData
    {
        public string SecurityStamp { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public HashSet<string> Permissions { get; set; } = new HashSet<string>();
    }
    public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly IServiceProvider _serviceProvider;

        public PermissionHandler(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        private string NormalizePermission(string name)
        {
            if (string.IsNullOrEmpty(name)) return string.Empty;
            return name.Trim().ToLower()
                .Replace('أ', 'ا')
                .Replace('إ', 'ا')
                .Replace('آ', 'ا')
                .Replace('ى', 'ي')
                .Replace('ة', 'ه');
        }

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            PermissionRequirement requirement)
        {
            // ── 1. يجب أن يكون المستخدم مسجل دخول ─────────────────────────────
            var userIdStr = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return;

            // ── 2. جلب SecurityStamp من التوكن ────────────────────────────────
            var stampInToken = context.User.FindFirst("SecurityStamp")?.Value;
            var httpContext = _serviceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext;

            if (string.IsNullOrEmpty(stampInToken))
            {
                if (httpContext != null && !httpContext.Response.Headers.ContainsKey("X-Auth-Revoked"))
                    httpContext.Response.Headers.Append("X-Auth-Revoked", "true");
                return;
            }

            var cache = _serviceProvider.GetRequiredService<IMemoryCache>();
            var cacheKey = $"UserAuth_{userId}";

            // ── 3. إحضار بيانات المستخدم من الـ Cache أو الـ DB ─────────────────
            if (!cache.TryGetValue(cacheKey, out UserAuthCacheData? authData) || authData == null)
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var user = await db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);

                if (user == null)
                    return;

                var permissionsList = await db.UserPermissions
                    .Include(up => up.Permission)
                    .Where(up => up.UserId == userId && up.Permission != null)
                    .Select(up => up.Permission!.Name)
                    .ToListAsync();

                authData = new UserAuthCacheData
                {
                    SecurityStamp = user.SecurityStamp,
                    Role = user.Role ?? "User",
                    Permissions = permissionsList.Select(NormalizePermission).ToHashSet()
                };

                // إذا كان Admin، نضيف له صلاحيات الإدارة الثابتة (بالعربية لتطابق النظام)
                if (authData.Role == "Admin")
                {
                    var adminPerms = new[]
                    {
                        AppPermissions.System_ViewDashboard, 
                        AppPermissions.System_ViewAuditLogs, 
                        AppPermissions.System_UserAdmin,
                        AppPermissions.System_Settings, 
                        AppPermissions.System_ViewActivity,
                        AppPermissions.System_ManageDocuments
                    };
                    foreach (var p in adminPerms) authData.Permissions.Add(NormalizePermission(p));
                }

                cache.Set(cacheKey, authData, TimeSpan.FromMinutes(10));
            }

            // ── 4. التحقق من مطابقة الـ SecurityStamp ──────────────────────────
            if (authData.SecurityStamp != stampInToken)
            {
                if (httpContext != null && !httpContext.Response.Headers.ContainsKey("X-Auth-Revoked"))
                    httpContext.Response.Headers.Append("X-Auth-Revoked", "true");
                
                Console.WriteLine($"SECURITY ALERT: Stamp mismatch for user {userId}. Token: {stampInToken}, DB: {authData.SecurityStamp}");
                return;
            }

            // ── 5. الـ Admin يتخطى كل الصلاحيات تلقائياً ──────────────────────
            if (authData.Role == "Admin")
            {
                context.Succeed(requirement);
                return;
            }

            // ── 6. التحقق من الصلاحية الفعلية (باستخدام التطبيع) ──────────────────────────
            // دعم الصلاحيات المتعددة (منطق OR) مفصولة بـ |
            var requiredPermissions = requirement.Permission.Split('|', StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var perm in requiredPermissions)
            {
                var normalizedRequired = NormalizePermission(perm);
                if (authData.Permissions.Contains(normalizedRequired))
                {
                    context.Succeed(requirement);
                    return;
                }
            }
        }
    }
}
