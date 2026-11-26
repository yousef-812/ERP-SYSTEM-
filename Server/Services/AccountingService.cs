using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services
{
    public interface IAccountingService
    {
        Task<JournalEntry> PostJournalEntryAsync(string reference, string description, string currency, List<(Guid AccountId, decimal Debit, decimal Credit)> lines, DateTime? transactionDate = null, Guid? warehouseId = null);
        Task<decimal> GetAccountBalanceAsync(Guid accountId);
        Task<Dictionary<string, decimal>> GetProfitAndLossAsync(DateTime startDate, DateTime endDate, IEnumerable<Guid>? warehouseIds = null);
        Task ClosePeriodAsync(int year, int month, string closedBy);
    }

    public class AccountingService : IAccountingService
    {
        private readonly AppDbContext _context;

        public AccountingService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<JournalEntry> PostJournalEntryAsync(string reference, string description, string currency, List<(Guid AccountId, decimal Debit, decimal Credit)> lines, DateTime? transactionDate = null, Guid? warehouseId = null)
        {
            var date = transactionDate ?? DateTime.UtcNow;

            // 1. Check if the period is closed
            var isPeriodClosed = await _context.FinancialPeriods
                .AnyAsync(p => p.Year == date.Year && p.Month == date.Month && p.IsClosed);

            if (isPeriodClosed)
            {
                throw new InvalidOperationException($"Cannot post transaction. The financial period {date.Month}/{date.Year} is closed.");
            }

            // 2. Verify that total Debit equals total Credit (Double-entry principle)
            if (lines.Sum(l => l.Debit) != lines.Sum(l => l.Credit))
            {
                throw new ArgumentException("Double-entry violation: Total debits must equal total credits.");
            }

            var entry = new JournalEntry
            {
                Reference = reference,
                Description = description,
                Currency = currency, // Descriptive only as requested
                Date = date,
                WarehouseId = warehouseId,
                IsLocked = true // Every posted entry is locked (Immutable)
            };

            foreach (var line in lines)
            {
                entry.Lines.Add(new JournalEntryLine
                {
                    AccountId = line.AccountId,
                    Debit = line.Debit,
                    Credit = line.Credit
                });

                // Update real-time account balance
                var account = await _context.Accounts.FindAsync(line.AccountId);
                if (account != null)
                {
                    // Asset/Expense: Increase on Debit, Decrease on Credit
                    // Liability/Equity/Revenue: Increase on Credit, Decrease on Debit
                    if (account.Type == "Asset" || account.Type == "Expense")
                    {
                        account.Balance += (line.Debit - line.Credit);
                    }
                    else
                    {
                        account.Balance += (line.Credit - line.Debit);
                    }
                }
            }

            _context.JournalEntries.Add(entry);
            await _context.SaveChangesAsync();
            return entry;
        }

        public async Task ClosePeriodAsync(int year, int month, string closedBy)
        {
            var period = await _context.FinancialPeriods
                .FirstOrDefaultAsync(p => p.Year == year && p.Month == month);

            if (period == null)
            {
                period = new FinancialPeriod { Year = year, Month = month };
                _context.FinancialPeriods.Add(period);
            }

            period.IsClosed = true;
            period.ClosedAt = DateTime.UtcNow;
            period.ClosedBy = closedBy;

            await _context.SaveChangesAsync();
        }

        public async Task<decimal> GetAccountBalanceAsync(Guid accountId)
        {
            return await _context.Accounts
                .Where(a => a.Id == accountId)
                .Select(a => a.Balance)
                .FirstOrDefaultAsync();
        }

        public async Task<Dictionary<string, decimal>> GetProfitAndLossAsync(DateTime startDate, DateTime endDate, IEnumerable<Guid>? warehouseIds = null)
        {
            var revenues = await _context.JournalEntryLines
                .Where(l => l.JournalEntry!.Date >= startDate && l.JournalEntry.Date <= endDate && l.Account!.Type == "Revenue")
                .Where(l => warehouseIds == null 
                    ? true // Admin sees all
                    : (l.JournalEntry!.WarehouseId != null && warehouseIds.Contains(l.JournalEntry.WarehouseId.Value)))
                .SumAsync(l => l.Credit - l.Debit);

            var payrollExpenses = await _context.JournalEntryLines
                .Where(l => l.JournalEntry!.Date >= startDate && l.JournalEntry.Date <= endDate && 
                       l.Account!.Type == "Expense" && l.Account.Name.Contains("Payroll"))
                .Where(l => warehouseIds == null 
                    ? true // Admin sees all
                    : (l.JournalEntry!.WarehouseId != null && warehouseIds.Contains(l.JournalEntry.WarehouseId.Value)))
                .SumAsync(l => l.Debit - l.Credit);

            var operatingExpenses = await _context.JournalEntryLines
                .Where(l => l.JournalEntry!.Date >= startDate && l.JournalEntry.Date <= endDate && 
                       l.Account!.Type == "Expense" && !l.Account.Name.Contains("Payroll"))
                .Where(l => warehouseIds == null 
                    ? true // Admin sees all
                    : (l.JournalEntry!.WarehouseId != null && warehouseIds.Contains(l.JournalEntry.WarehouseId.Value)))
                .SumAsync(l => l.Debit - l.Credit);

            return new Dictionary<string, decimal>
            {
                { "TotalRevenue", revenues },
                { "PayrollExpenses", payrollExpenses },
                { "OperatingExpenses", operatingExpenses },
                { "TotalExpenses", payrollExpenses + operatingExpenses },
                { "NetProfit", revenues - (payrollExpenses + operatingExpenses) }
            };
        }
    }
}
