using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PayrollController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLog;
        private readonly IAccountingService _accounting;

        public PayrollController(AppDbContext context, IAuditLogService auditLog, IAccountingService accounting)
        {
            _context = context;
            _auditLog = auditLog;
            _accounting = accounting;
        }

        // GET: api/Payroll?month=3&year=2024
        [HasPermission(AppPermissions.HR_ViewPayroll, AppPermissions.HR_ProcessPayroll)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Payroll>>> GetPayroll(int month, int year)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            var query = _context.Payrolls
                .Include(p => p.Employee)
                .ThenInclude(e => e.Warehouse)
                .Where(p => p.Month == month && p.Year == year);

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                query = query.Where(p => p.Employee != null && p.Employee.WarehouseId.HasValue && assignedWarehouseIds.Contains(p.Employee.WarehouseId.Value));
            }

            return await query.ToListAsync();
        }

        // POST: api/Payroll/generate
        // Generates draft payroll for all active employees for a given month/year
        [HasPermission(AppPermissions.HR_ProcessPayroll)]
        [HttpPost("generate")]
        public async Task<IActionResult> GeneratePayroll([FromBody] GeneratePayrollDto dto)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            var empQuery = _context.Employees.Where(e => e.Status == "Active");

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                empQuery = empQuery.Where(e => e.WarehouseId.HasValue && assignedWarehouseIds.Contains(e.WarehouseId.Value));
            }

            var employees = await empQuery.ToListAsync();

            var generatedCount = 0;
            foreach (var emp in employees)
            {
                // Check if payroll already exists for this employee/month/year
                var exists = await _context.Payrolls.AnyAsync(p => 
                    p.EmployeeId == emp.Id && p.Month == dto.Month && p.Year == dto.Year);
                
                if (exists) continue;

                // --- CALC ATTENDANCE ---
                var startDate = new DateTime(dto.Year, dto.Month, 1);
                var endDate = startDate.AddMonths(1).AddDays(-1);

                var attendanceLogs = await _context.Attendance
                    .Where(a => a.EmployeeId == emp.Id && a.Date.Date >= startDate.Date && a.Date.Date <= endDate.Date)
                    .ToListAsync();

                var presentCount = attendanceLogs.Count(a => a.Status == "Present");
                var absentCount = attendanceLogs.Count(a => a.Status == "Absent");
                var leaveCount = attendanceLogs.Count(a => a.Status == "Leave");
                // -----------------------

                // --- CALCULATE DEDUCTIONS ---
                var insurancePct = decimal.TryParse(await _context.Settings.Where(s => s.Key == "SocialInsurancePercentage").Select(s => s.Value).FirstOrDefaultAsync(), out var ip) ? ip : 11;
                var taxPct = decimal.TryParse(await _context.Settings.Where(s => s.Key == "IncomeTaxPercentage").Select(s => s.Value).FirstOrDefaultAsync(), out var tp) ? tp : 0;

                var socialInsurance = emp.BasicSalary * (insurancePct / 100);
                var incomeTax = emp.BasicSalary * (taxPct / 100);
                var netSalary = emp.BasicSalary - socialInsurance - incomeTax;
                // ----------------------------

                var payroll = new Payroll
                {
                    EmployeeId = emp.Id,
                    Month = dto.Month,
                    Year = dto.Year,
                    BasicSalary = emp.BasicSalary,
                    Bonus = 0,
                    Deductions = 0,
                    SocialInsurance = socialInsurance,
                    IncomeTax = incomeTax,
                    NetSalary = netSalary,
                    PresentDays = presentCount,
                    AbsentDays = absentCount,
                    LeaveDays = leaveCount,
                    Status = "Draft",
                    Remarks = $"Generated for {dto.Month}/{dto.Year}. Attendance: {presentCount}P / {absentCount}A / {leaveCount}L. Deductions applied: Insurance({insurancePct}%), Tax({taxPct}%)."
                };

                _context.Payrolls.Add(payroll);
                generatedCount++;
            }

            await _context.SaveChangesAsync();
            
            // Log Action
            var uName = User.Identity?.Name ?? "Admin";
            await _auditLog.LogAsync(uName, "Generate", "Payroll", $"{dto.Month}/{dto.Year}", $"Generated {generatedCount} payroll records for {dto.Month}/{dto.Year}");
            
            return Ok(new { message = $"Generated {generatedCount} payroll records.", count = generatedCount });
        }

        // PUT: api/Payroll/{id}/pay
        // Marks a payroll record as paid
        [HasPermission(AppPermissions.HR_ProcessPayroll)]
        [HttpPut("{id}/pay")]
        public async Task<IActionResult> MarkAsPaid(Guid id)
        {
            var payroll = await _context.Payrolls
                .Include(p => p.Employee)
                .FirstOrDefaultAsync(p => p.Id == id);
                
            if (payroll == null) return NotFound();
            
            // Validate Access
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                if (payroll.Employee == null || !payroll.Employee.WarehouseId.HasValue || !assignedWarehouseIds.Contains(payroll.Employee.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لصرف راتب لموظف خارج مستودعاتك.");
            }

            if (payroll.Status == "Paid") return BadRequest("Payroll is already paid.");

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Update Status
                payroll.Status = "Paid";
                payroll.PaymentDate = DateTime.UtcNow;
                _context.Payrolls.Update(payroll);

                // 2. Accounting Hook
                // Debit: Payroll Expense
                // Credit: Cash
                var expenseAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Expense" && a.Name.Contains("Payroll")) 
                    ?? new Account { Id = Guid.NewGuid(), Name = "Payroll Expenses", Type = "Expense", AccountCode = "5100" };
                var cashAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Asset" && a.Name.Contains("Cash"))
                    ?? new Account { Id = Guid.NewGuid(), Name = "Cash", Type = "Asset", AccountCode = "1000" };

                if (_context.Entry(expenseAccount).State == EntityState.Detached) _context.Accounts.Add(expenseAccount);
                if (_context.Entry(cashAccount).State == EntityState.Detached) _context.Accounts.Add(cashAccount);
                
                await _context.SaveChangesAsync();

                await _accounting.PostJournalEntryAsync(
                    $"PAY-{payroll.Id}",
                    $"Salary for {payroll.Employee?.Name} - {payroll.Month}/{payroll.Year}",
                    "EGP", // Descriptive Currency
                    new List<(Guid AccountId, decimal Debit, decimal Credit)>
                    {
                        (expenseAccount.Id, payroll.NetSalary, 0),    // Debit Expense (Increase)
                        (cashAccount.Id, 0, payroll.NetSalary)       // Credit Asset (Decrease)
                    },
                    DateTime.UtcNow,
                    payroll.Employee?.WarehouseId // Explicitly link expense to the warehouse
                );

                await transaction.CommitAsync();

                // Log Action
                var uName = User.Identity?.Name ?? "Admin";
                await _auditLog.LogAsync(uName, "Pay", "Payroll", payroll.Id.ToString(), $"Processed salary payment for {payroll.Employee?.Name} - {payroll.Month}/{payroll.Year}");

                return Ok(payroll);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Error processing payment: {ex.Message}");
            }
        }

        // PUT: api/Payroll/{id}
        // Updates bonuses/deductions for a payroll record
        [HasPermission(AppPermissions.HR_ProcessPayroll)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePayroll(Guid id, [FromBody] Payroll updated)
        {
            if (id != updated.Id) return BadRequest();

            // Validate Access
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                var existingPayroll = await _context.Payrolls.Include(p => p.Employee).FirstOrDefaultAsync(p => p.Id == id);
                if (existingPayroll == null) return NotFound();

                if (existingPayroll.Employee == null || !existingPayroll.Employee.WarehouseId.HasValue || !assignedWarehouseIds.Contains(existingPayroll.Employee.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لتعديل بيانات راتب لموظف خارج مستودعاتك.");
            }

            // Refresh NetSalary before saving
            updated.NetSalary = updated.BasicSalary + updated.Bonus - updated.Deductions;

            _context.Entry(updated).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            
            return Ok(updated);
        }

        // DELETE: api/Payroll/{id}
        [HasPermission(AppPermissions.HR_ProcessPayroll)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePayroll(Guid id)
        {
            var payroll = await _context.Payrolls.Include(p => p.Employee).FirstOrDefaultAsync(p => p.Id == id);
            if (payroll == null) return NotFound();

            // Validate Access
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                if (payroll.Employee == null || !payroll.Employee.WarehouseId.HasValue || !assignedWarehouseIds.Contains(payroll.Employee.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لحذف سجل راتب لموظف خارج مستودعاتك.");
            }

            if (payroll.Status == "Paid") return BadRequest("Cannot delete paid payroll records.");

            _context.Payrolls.Remove(payroll);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        // DELETE: api/Payroll/clear?month=3&year=2024
        [HasPermission(AppPermissions.HR_ProcessPayroll)]
        [HttpDelete("clear")]
        public async Task<IActionResult> ClearMonthlyPayroll(int month, int year)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            var query = _context.Payrolls
                .Include(p => p.Employee)
                .Where(p => p.Month == month && p.Year == year && p.Status != "Paid");

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                query = query.Where(p => p.Employee != null && p.Employee.WarehouseId.HasValue && assignedWarehouseIds.Contains(p.Employee.WarehouseId.Value));
            }

            var toRemove = await query.ToListAsync();
            if (toRemove.Count == 0) return Ok(new { message = "No unpaid payroll records found to clear." });

            _context.Payrolls.RemoveRange(toRemove);
            await _context.SaveChangesAsync();

            await _auditLog.LogAsync(User.Identity?.Name ?? "Admin", "DeleteAll", "Payroll", "Bulk", $"Cleared {toRemove.Count} unpaid payroll records for {month}/{year}");

            return Ok(new { count = toRemove.Count });
        }
    }
}
