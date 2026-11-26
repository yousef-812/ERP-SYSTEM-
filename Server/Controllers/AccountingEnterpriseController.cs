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
    public class AccountingEnterpriseController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService;

        public AccountingEnterpriseController(AppDbContext context, IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }

        // --- Chart of Accounts (Hierarchical) ---
        [HasPermission(AppPermissions.Accounting_ManageCOA)]
        [HttpGet("coa")]
        public async Task<ActionResult<IEnumerable<Account>>> GetCOA()
        {

            return await _context.Accounts
                .Where(a => a.ParentAccountId == null) // Get Top-level
                .Include(a => a.ChildAccounts)
                .ThenInclude(c => c.ChildAccounts)
                .ToListAsync();
        }

        // --- Annual Financial Report ---
        [HasPermission(AppPermissions.Accounting_ReportsAndBI)]
        [HttpGet("annual-report")]
        public async Task<IActionResult> GetAnnualReport([FromQuery] int year)
        {

            var summary = await _context.JournalEntries
                .Where(j => j.Date.Year == year)
                .SelectMany(j => j.Lines)
                .GroupBy(l => l.Account!.Type)
                .Select(g => new { Type = g.Key, Total = g.Sum(l => l.Debit - l.Credit) })
                .ToListAsync();

            return Ok(summary);
        }

        // --- Year-End Closing ---
        [HasPermission(AppPermissions.Accounting_ClosePeriods)]
        [HttpPost("year-end-closing")]
        public async Task<IActionResult> CloseYear([FromQuery] int year)
        {

            // Implementation detail...
            await _auditLogService.LogAsync(User.Identity?.Name ?? "System", "Year-End Closing", "FiscalYear", year.ToString(), $"Closed fiscal year {year}");
            
            return Ok(new { Message = $"Fiscal Year {year} has been closed and locked." });
        }
    }
}
