using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLog;

        public SettingsController(AppDbContext context, IAuditLogService auditLog)
        {
            _context = context;
            _auditLog = auditLog;
        }
        // GET: api/Settings/public
        // Publicly accessible settings for UI basics (Company name, logo, etc.)
        [AllowAnonymous]
        [HttpGet("public")]
        public async Task<ActionResult<Dictionary<string, string>>> GetPublicSettings()
        {
            var publicKeys = new[] { "CompanyName", "Currency", "Address", "LogoUrl", "PrimaryColor" };
            var settings = await _context.Settings
                .Where(s => publicKeys.Contains(s.Key))
                .ToListAsync();

            return settings.ToDictionary(s => s.Key, s => s.Value);
        }

        // GET: api/Settings
        // Only Admins can see full settings list (taxes, thresholds, etc.)
        [HasPermission(AppPermissions.System_Settings)]
        [HttpGet]
        public async Task<ActionResult<Dictionary<string, string>>> GetSettings()
        {
            try
            {
                var settings = await _context.Settings.ToListAsync();
                
                // If empty, Seed defaults
                if (settings == null || !settings.Any())
                {
                    var defaults = new List<Setting>
                    {
                        new Setting { Key = "CompanyName", Value = "ERP System", Description = "Your business name" },
                        new Setting { Key = "Currency", Value = "EGP", Description = "Default currency across the system" },
                        new Setting { Key = "VatPercentage", Value = "14", Description = "Standard Value Added Tax percentage" },
                        new Setting { Key = "Address", Value = "Cairo, Egypt", Description = "Physical business address" },
                        new Setting { Key = "TaxNumber", Value = "123-456-789", Description = "Government Tax ID" },
                        new Setting { Key = "LowStockAlert", Value = "10", Description = "Alert threshold for products" },
                        new Setting { Key = "SocialInsurancePercentage", Value = "11", Description = "Employee Social Insurance %" },
                        new Setting { Key = "IncomeTaxPercentage", Value = "5", Description = "Employee Income Tax %" },
                        new Setting { Key = "PrimaryColor", Value = "#4f46e5", Description = "Main system theme color" }
                    };
                    
                    _context.Settings.AddRange(defaults);
                    await _context.SaveChangesAsync();
                    settings = defaults;
                }

                return settings.ToDictionary(s => s.Key, s => s.Value);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching settings: {ex.Message}");
                return StatusCode(500, "Internal server error occurred while fetching settings.");
            }
        }

        // POST: api/Settings
        // Updates multiple settings at once
        [HasPermission(AppPermissions.System_Settings)]
        [HttpPost]
        public async Task<IActionResult> UpdateSettings([FromBody] Dictionary<string, string> newSettings)
        {
            foreach (var (key, value) in newSettings)
            {
                var setting = await _context.Settings.FindAsync(key);
                if (setting != null)
                {
                    setting.Value = value;
                    setting.UpdatedAt = DateTime.UtcNow;
                    _context.Entry(setting).State = EntityState.Modified;
                    
                    // Log Action
                    await _auditLog.LogAsync(User.Identity?.Name ?? "Admin", "Update", "Setting", key, $"Updated setting {key} to {value}");
                }
                else
                {
                    _context.Settings.Add(new Setting { Key = key, Value = value });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Settings updated successfully." });
        }
    }
}
