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
    public class AccountingController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAccountingService _accounting;

        public AccountingController(AppDbContext context, IAccountingService accounting)
        {
            _context = context;
            _accounting = accounting;
        }

        [HasPermission(AppPermissions.Accounting_ManageCOA)]
        [HttpGet("accounts")]
        public async Task<ActionResult<IEnumerable<object>>> GetAccounts([FromQuery] Guid? warehouseId)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            // Determine effective warehouse restrictions
            IEnumerable<Guid>? whIds = null;
            if (warehouseId.HasValue)
            {
                whIds = new List<Guid> { warehouseId.Value };
            }
            else if (userRole != "Admin")
            {
                whIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
            }

            var accounts = await _context.Accounts.OrderBy(a => a.AccountCode).ToListAsync();
            
            // Calculate dynamic balances based on warehouse filter
            if (whIds != null)
            {
                var warehouseBalances = await _context.JournalEntryLines
                    .Include(l => l.JournalEntry)
                    .Where(l => l.JournalEntry != null && l.JournalEntry.WarehouseId.HasValue && whIds.Contains(l.JournalEntry.WarehouseId.Value))
                    .GroupBy(l => l.AccountId)
                    .Select(g => new { 
                        AccountId = g.Key, 
                        Balance = g.Sum(x => x.Debit - x.Credit) 
                    })
                    .ToDictionaryAsync(x => x.AccountId, x => x.Balance);

                return accounts.Select(a => new {
                    id = a.Id,
                    accountCode = a.AccountCode,
                    name = a.Name,
                    type = a.Type,
                    balance = warehouseBalances.ContainsKey(a.Id) ? warehouseBalances[a.Id] : 0,
                    parentAccountId = a.ParentAccountId,
                    isActive = a.IsActive
                }).ToList();
            }

            return accounts.Select(a => new {
                id = a.Id,
                accountCode = a.AccountCode,
                name = a.Name,
                type = a.Type,
                balance = a.Balance, // Global balance
                parentAccountId = a.ParentAccountId,
                isActive = a.IsActive
            }).ToList();
        }

        [HasPermission(AppPermissions.Accounting_ReportsAndBI)]
        [HttpGet("pl")]
        public async Task<IActionResult> GetProfitAndLoss([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            try
            {
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

                IEnumerable<Guid>? assignedWarehouseIds = null;
                if (userRole != "Admin")
                {
                    assignedWarehouseIds = await _context.UserWarehouses
                        .Where(uw => uw.UserId == userId)
                        .Select(uw => uw.WarehouseId)
                        .ToListAsync();
                }

                var result = await _accounting.GetProfitAndLossAsync(start, end, assignedWarehouseIds);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HasPermission(AppPermissions.Accounting_ManageCOA)]
        [HttpPost("journal")]
        public async Task<IActionResult> PostJournalEntry([FromBody] JournalEntryDto dto)
        {
            var lines = dto.Lines.Select(l => (l.AccountId, l.Debit, l.Credit)).ToList();
            var result = await _accounting.PostJournalEntryAsync(dto.Reference, dto.Description, dto.Currency, lines, dto.Date);
            return Ok(result);
        }

        [HasPermission(AppPermissions.Accounting_ClosePeriods)]
        [HttpPost("close-period")]
        public async Task<IActionResult> ClosePeriod([FromBody] ClosePeriodDto dto)
        {
            var username = User.Identity?.Name ?? "Admin";
            await _accounting.ClosePeriodAsync(dto.Year, dto.Month, username);
            return Ok(new { message = $"Financial period {dto.Month}/{dto.Year} closed successfully." });
        }

        [HasPermission(AppPermissions.Accounting_ViewLedger)]
        [HttpGet("journal-details")]
        public async Task<IActionResult> GetJournalDetails([FromQuery] Guid? warehouseId)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var query = _context.JournalEntries
                .Include(j => j.Lines)
                    .ThenInclude(l => l.Account)
                .AsQueryable();

            // Filter by requested warehouse OR assigned warehouses for non-admins
            if (warehouseId.HasValue)
            {
                query = query.Where(j => j.WarehouseId == warehouseId.Value);
            }
            else if (userRole != "Admin")
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                
                query = query.Where(j => j.WarehouseId.HasValue && assignedWarehouseIds.Contains(j.WarehouseId.Value));
            }

            var journals = await query
                .OrderByDescending(j => j.Date)
                .ToListAsync();

            var result = journals.Select(j => new {
                id = j.Id,
                reference = j.Reference,
                description = j.Description,
                date = j.Date,
                currency = j.Currency,
                totalAmount = j.Lines.Sum(l => l.Debit), // assuming balanced entry, sum of either debit or credit
                lines = j.Lines.Select(l => new {
                    accountId = l.AccountId,
                    accountName = l.Account?.Name,
                    accountCode = l.Account?.AccountCode,
                    type = l.Account?.Type,
                    debit = l.Debit,
                    credit = l.Credit
                }).ToList()
            });

            return Ok(result);
        }

        [HasPermission(AppPermissions.Accounting_ClosePeriods)]
        [HttpPost("close-year")]
        public async Task<IActionResult> CloseYear([FromBody] ClosePeriodDto dto)
        {
            var username = User.Identity?.Name ?? "Admin";
            for (int i = 1; i <= 12; i++)
            {
                await _accounting.ClosePeriodAsync(dto.Year, i, username);
            }
            return Ok(new { message = $"Fiscal year {dto.Year} closed successfully. All periods locked." });
        }

        [HasPermission(AppPermissions.Accounting_ReportsAndBI)]
        [HttpGet("annual-report")]
        public async Task<IActionResult> GetAnnualReport([FromQuery] int year)
        {
            if (year <= 0) year = DateTime.UtcNow.Year;

            var startDate = new DateTime(year, 1, 1);
            var endDate = new DateTime(year, 12, 31);

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            IEnumerable<Guid>? assignedWarehouseIds = null;
            List<string> filteredByNames = new();

            if (userRole != "Admin")
            {
                var userWarehouses = await _context.UserWarehouses
                    .Include(uw => uw.Warehouse)
                    .Where(uw => uw.UserId == userId)
                    .ToListAsync();

                assignedWarehouseIds = userWarehouses.Select(uw => uw.WarehouseId).ToList();
                filteredByNames = userWarehouses
                    .Where(uw => uw.Warehouse != null)
                    .Select(uw => uw.Warehouse!.Name)
                    .ToList();
            }
            else
            {
                filteredByNames = new List<string> { "ALL_WAREHOUSES_GLOBAL" };
            }

            var pl = await _accounting.GetProfitAndLossAsync(startDate, endDate, assignedWarehouseIds);

            var q1 = await _accounting.GetProfitAndLossAsync(new DateTime(year, 1, 1), new DateTime(year, 3, 31), assignedWarehouseIds);
            var q2 = await _accounting.GetProfitAndLossAsync(new DateTime(year, 4, 1), new DateTime(year, 6, 30), assignedWarehouseIds);
            var q3 = await _accounting.GetProfitAndLossAsync(new DateTime(year, 7, 1), new DateTime(year, 9, 30), assignedWarehouseIds);
            var q4 = await _accounting.GetProfitAndLossAsync(new DateTime(year, 10, 1), new DateTime(year, 12, 31), assignedWarehouseIds);

            return Ok(new {
                Year = year,
                FilteredBy = filteredByNames,
                TotalRevenue = pl["TotalRevenue"],
                TotalExpenses = pl["TotalExpenses"],
                NetProfit = pl["NetProfit"],
                PayrollExpenses = pl["PayrollExpenses"],
                OperatingExpenses = pl["OperatingExpenses"],
                Quarters = new[] {
                    new { Q = "Q1", Rev = q1["TotalRevenue"], Exp = q1["TotalExpenses"], Profit = q1["NetProfit"], Payroll = q1["PayrollExpenses"], Operating = q1["OperatingExpenses"] },
                    new { Q = "Q2", Rev = q2["TotalRevenue"], Exp = q2["TotalExpenses"], Profit = q2["NetProfit"], Payroll = q2["PayrollExpenses"], Operating = q2["OperatingExpenses"] },
                    new { Q = "Q3", Rev = q3["TotalRevenue"], Exp = q3["TotalExpenses"], Profit = q3["NetProfit"], Payroll = q3["PayrollExpenses"], Operating = q3["OperatingExpenses"] },
                    new { Q = "Q4", Rev = q4["TotalRevenue"], Exp = q4["TotalExpenses"], Profit = q4["NetProfit"], Payroll = q4["PayrollExpenses"], Operating = q4["OperatingExpenses"] }
                }
            });
        }

        [HasPermission(AppPermissions.Accounting_ManageCOA)]
        [HttpGet("accounts/export")]
        public async Task<IActionResult> ExportAccounts([FromServices] IExcelExportService excelService)
        {
            var accountsArr = await _context.Accounts
                .OrderBy(a => a.AccountCode)
                .Select(a => new {
                    a.AccountCode,
                    Name = a.Name,
                    Type = a.Type,
                    Balance = a.Balance,
                    IsActive = a.IsActive,
                    DateCreated = a.CreatedAt.ToString("yyyy-MM-dd")
                })
                .ToListAsync();

            var fileBytes = excelService.ExportToExcel(accountsArr, "ChartOfAccounts");
            
            return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "ChartOfAccounts.xlsx");
        }

        [HasPermission(AppPermissions.Accounting_ReportsAndBI)]
        [HttpGet("annual-report/export")]
        public async Task<IActionResult> ExportAnnualReport([FromQuery] int year, [FromServices] IExcelExportService excelService)
        {
            if (year <= 0) year = DateTime.UtcNow.Year;
            var startDate = new DateTime(year, 1, 1);
            var endDate = new DateTime(year, 12, 31);

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            IEnumerable<Guid>? assignedWarehouseIds = null;
            if (userRole != "Admin")
            {
                assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
            }

            var pl = await _accounting.GetProfitAndLossAsync(startDate, endDate, assignedWarehouseIds);
            
            var reportData = new[]
            {
                new { Metric = "Year", Value = year.ToString() },
                new { Metric = "Total Revenue", Value = pl["TotalRevenue"].ToString() },
                new { Metric = "Total Expenses", Value = pl["TotalExpenses"].ToString() },
                new { Metric = "Net Profit", Value = pl["NetProfit"].ToString() },
                new { Metric = "Payroll", Value = pl["PayrollExpenses"].ToString() },
                new { Metric = "Operating", Value = pl["OperatingExpenses"].ToString() }
            };

            var fileBytes = excelService.ExportToExcel(reportData, "FinancialReport");
            return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Financial_Report_{year}.xlsx");
        }
    }

    public class JournalEntryDto
    {
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Currency { get; set; } = "EGP";
        public DateTime? Date { get; set; }
        public List<JournalEntryLineDto> Lines { get; set; } = new();
    }

    public class ClosePeriodDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
    }

    public class JournalEntryLineDto
    {
        public Guid AccountId { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
    }
}
