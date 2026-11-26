using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;
using ERP.Api.Services;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class FinancialTransactionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAccountingService _accounting;

        public FinancialTransactionsController(AppDbContext context, IAccountingService accounting)
        {
            _context = context;
            _accounting = accounting;
        }

        // GET: api/FinancialTransactions
        [HasPermission(AppPermissions.Accounting_ViewExpenses)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FinancialTransaction>>> GetTransactions()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var query = _context.FinancialTransactions.AsQueryable();

            if (userRole != "Admin")
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                query = query.Where(t => t.WarehouseId == null || assignedWarehouseIds.Contains(t.WarehouseId.Value));
            }

            return await query
                .OrderByDescending(t => t.Date)
                .ToListAsync();
        }

        // POST: api/FinancialTransactions
        [HasPermission(AppPermissions.Accounting_ManageTransactions)]
        [HttpPost]
        public async Task<ActionResult<FinancialTransaction>> CreateTransaction(FinancialTransaction transaction)
        {
            if (transaction == null) return BadRequest("Transaction data is required.");

            transaction.Id = Guid.NewGuid();
            if (transaction.Date == default) transaction.Date = DateTime.UtcNow;
            transaction.CreatedAt = DateTime.UtcNow;

            _context.FinancialTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            // Accounting Hook
            if (transaction.Type == TransactionType.Expense)
            {
                // Ensure accounts exist and are retrieved effectively
                var expenseAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Expense" && a.Name.Contains("Operating")) 
                    ?? await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Expense")
                    ?? new Account { Id = Guid.NewGuid(), Name = "Operating Expenses", Type = "Expense", AccountCode = "5000", CreatedAt = DateTime.UtcNow };

                var cashAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Asset" && (a.Name.Contains("Cash") || a.Name.Contains("خزينة")))
                    ?? await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Asset")
                    ?? new Account { Id = Guid.NewGuid(), Name = "Cash", Type = "Asset", AccountCode = "1000", CreatedAt = DateTime.UtcNow };

                if (_context.Entry(expenseAccount).State == EntityState.Detached) _context.Accounts.Add(expenseAccount);
                if (_context.Entry(cashAccount).State == EntityState.Detached) _context.Accounts.Add(cashAccount);
                
                await _context.SaveChangesAsync();

                try 
                {
                    await _accounting.PostJournalEntryAsync(
                        transaction.Id.ToString().Substring(0,8), 
                        $"Expense: {transaction.Description}", 
                        "EGP", // Label for now
                        new List<(Guid AccountId, decimal Debit, decimal Credit)> {
                            (expenseAccount.Id, transaction.Amount, 0),
                            (cashAccount.Id, 0, transaction.Amount)
                        },
                        transaction.Date,
                        transaction.WarehouseId);
                }
                catch (Exception accountEx)
                {
                    // Log the error but don't fail the whole transaction if accounting fails (optional strategy)
                    // For now, we allow it to throw to maintain integrity as requested for "Real" system
                    throw new Exception($"Accounting failure: {accountEx.Message}");
                }
            }

            return CreatedAtAction(nameof(GetTransactions), new { id = transaction.Id }, transaction);
        }

        // DELETE: api/FinancialTransactions/{id}
        [HasPermission(AppPermissions.Accounting_ManageTransactions)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(Guid id)
        {
            var transaction = await _context.FinancialTransactions.FindAsync(id);
            if (transaction == null) return NotFound();

            _context.FinancialTransactions.Remove(transaction);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
