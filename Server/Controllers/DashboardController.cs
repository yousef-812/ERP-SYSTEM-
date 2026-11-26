using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using System.Globalization;
using ERP.Api.Services;
using ERP.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IBackgroundJobService _jobService;
        private readonly IAccountingService _accountingService;

        public DashboardController(AppDbContext context, IBackgroundJobService jobService, IAccountingService accountingService)
        {
            _context = context;
            _jobService = jobService;
            _accountingService = accountingService;
        }

        [Authorize]
        [HttpGet]
        public async Task<ActionResult<object>> GetDashboardMetrics()
        {
            // Allow if user has either ViewDashboard OR ViewActivity
            var nameIdentifier = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(nameIdentifier)) return Unauthorized();

            var currentUserId = Guid.Parse(nameIdentifier);

            var hasDashboardPerm = await _context.UserPermissions
                .AnyAsync(up => up.UserId == currentUserId 
                          && up.Permission.Name == AppPermissions.System_ViewDashboard);
            var hasActivityPerm = await _context.UserPermissions
                .AnyAsync(up => up.UserId == currentUserId 
                          && up.Permission.Name == AppPermissions.System_ViewActivity);

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && !hasDashboardPerm && !hasActivityPerm)
            {
                return Forbid();
            }



            List<Guid> assignedWarehouseIds = new List<Guid>();
            if (userRole != "Admin")
            {
                assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == currentUserId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
            }

            // Total Customers (STAY GLOBAL as requested)
            var totalCustomers = await _context.Customers.CountAsync();
            
            // Total Employees (FILTERED)
            var employeesQuery = _context.Employees.AsQueryable();
            if (userRole != "Admin")
                employeesQuery = employeesQuery.Where(e => e.WarehouseId.HasValue && assignedWarehouseIds.Contains(e.WarehouseId.Value));
            
            var totalEmployees = await employeesQuery.CountAsync();
            var activeEmployees = await employeesQuery.Where(e => e.Status == "Active").CountAsync();

            // Stock Items Statistics (FILTERED via StockLevels)
            var stockQuery = _context.Products.AsQueryable();
            
            // For stock status, if restricted, we look at the sum in assigned warehouses
            int lowStockCount, outOfStockCount, healthyStockCount;

            if (userRole != "Admin")
            {
                var warehouseStock = await _context.StockLevels
                    .Where(sl => assignedWarehouseIds.Contains(sl.WarehouseId))
                    .GroupBy(sl => sl.ProductId)
                    .Select(g => new { ProductId = g.Key, TotalQty = g.Sum(x => x.Quantity) })
                    .ToListAsync();

                var productIdsInWarehouses = warehouseStock.Select(s => s.ProductId).ToList();
                var products = await _context.Products
                    .Where(p => productIdsInWarehouses.Contains(p.Id))
                    .Select(p => new { p.Id, p.MinStockLevel })
                    .ToListAsync();
                
                lowStockCount = products.Count(p => {
                    var qty = warehouseStock.First(s => s.ProductId == p.Id).TotalQty;
                    return qty > 0 && qty < p.MinStockLevel;
                });
                outOfStockCount = products.Count(p => warehouseStock.First(s => s.ProductId == p.Id).TotalQty <= 0);
                healthyStockCount = products.Count(p => warehouseStock.First(s => s.ProductId == p.Id).TotalQty >= p.MinStockLevel);
            }
            else 
            {
                lowStockCount = await _context.Products.Where(p => p.StockQuantity > 0 && p.StockQuantity < p.MinStockLevel).CountAsync();
                outOfStockCount = await _context.Products.Where(p => p.StockQuantity <= 0).CountAsync();
                healthyStockCount = await _context.Products.Where(p => p.StockQuantity >= p.MinStockLevel).CountAsync();
            }

            // Pending Invoices Count (FILTERED by Order.WarehouseId)
            var invoicesQuery = _context.Invoices.Include(i => i.Order).AsQueryable();
            if (userRole != "Admin")
                invoicesQuery = invoicesQuery.Where(i => i.Order.WarehouseId.HasValue && assignedWarehouseIds.Contains(i.Order.WarehouseId.Value));

            var pendingInvoicesCount = await invoicesQuery
                .Where(i => i.PaymentStatus == PaymentStatus.Unpaid)
                .CountAsync();
            
            var pendingInvoicesAmount = await invoicesQuery
                .Where(i => i.PaymentStatus == PaymentStatus.Unpaid)
                .SumAsync(i => i.Amount);

            // Recent Orders & Activities (FILTERED by permission)
            object recentOrders = new List<object>();
            object recentActivities = new List<object>();

            if (userRole == "Admin" || hasActivityPerm)
            {
                var ordersQuery = _context.Orders.Include(o => o.Customer).AsQueryable();
                if (userRole != "Admin")
                    ordersQuery = ordersQuery.Where(o => o.WarehouseId.HasValue && assignedWarehouseIds.Contains(o.WarehouseId.Value));

                recentOrders = await ordersQuery
                    .OrderByDescending(o => o.CreatedAt)
                    .Take(5)
                    .Select(o => new {
                        id = o.Id.ToString().Substring(0, 8),
                        customer = o.Customer != null ? o.Customer.Name : "N/A",
                        date = o.OrderDate.ToString("yyyy-MM-dd"),
                        status = o.Status.ToString(),
                        amount = o.TotalAmount
                    })
                    .ToListAsync();

                recentActivities = await _context.AuditLogs
                    .OrderByDescending(a => a.CreatedAt)
                    .Take(10)
                    .Select(a => new {
                        id = a.Id,
                        username = a.Username,
                        action = a.Action,
                        entity = a.EntityName,
                        details = a.Details,
                        createdAt = a.CreatedAt
                    })
                    .ToListAsync();
            }

            // Trends and Accounting (FILTERED)
            var sixMonthsAgo = DateTime.UtcNow.AddMonths(-5);
            sixMonthsAgo = new DateTime(sixMonthsAgo.Year, sixMonthsAgo.Month, 1);

            // Manual Trends for charts
            var trendLabels = new List<string>();
            var salesTrendData = new List<decimal>();
            var expensesTrendData = new List<decimal>();

            // Fetch Trend Data with Warehouse awareness
            var monthlyInvoices = await invoicesQuery
                .Where(i => i.PaymentStatus == PaymentStatus.Paid && i.InvoiceDate >= sixMonthsAgo)
                .GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
                .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Total = g.Sum(i => i.Amount) })
                .ToListAsync();

            var payrollQuery = _context.Payrolls.Include(p => p.Employee).AsQueryable();
            if (userRole != "Admin")
                payrollQuery = payrollQuery.Where(p => p.Employee.WarehouseId.HasValue && assignedWarehouseIds.Contains(p.Employee.WarehouseId.Value));

            var monthlyPayroll = await payrollQuery
                .Where(p => p.Status == "Paid" && p.PaymentDate >= sixMonthsAgo)
                .GroupBy(p => new { p.Year, p.Month })
                .Select(g => new { Year = (int)g.Key.Year, Month = (int)g.Key.Month, Total = g.Sum(p => p.NetSalary) })
                .ToListAsync();

            var transactionsQuery = _context.FinancialTransactions.AsQueryable();
            if (userRole != "Admin")
                transactionsQuery = transactionsQuery.Where(t => t.WarehouseId.HasValue && assignedWarehouseIds.Contains(t.WarehouseId.Value));

            var monthlyManualExpenses = await transactionsQuery
                .Where(t => t.Type == TransactionType.Expense && t.Date >= sixMonthsAgo)
                .GroupBy(t => new { t.Date.Year, t.Date.Month })
                .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Total = g.Sum(t => t.Amount) })
                .ToListAsync();

            for (int i = 0; i < 6; i++)
            {
                var monthDate = DateTime.UtcNow.AddMonths(-5 + i);
                trendLabels.Add(monthDate.ToString("MMM", CultureInfo.InvariantCulture));
                
                var sale = monthlyInvoices.FirstOrDefault(m => m.Year == monthDate.Year && m.Month == monthDate.Month);
                salesTrendData.Add(sale?.Total ?? 0);

                var payroll = monthlyPayroll.FirstOrDefault(p => p.Year == monthDate.Year && p.Month == monthDate.Month);
                var manualExp = monthlyManualExpenses.FirstOrDefault(m => m.Year == monthDate.Year && m.Month == monthDate.Month);
                expensesTrendData.Add((payroll?.Total ?? 0) + (manualExp?.Total ?? 0));
            }

            // Real Accounting Stats (FILTERED)
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var endOfMonth = now;
            var startOfLastMonth = startOfMonth.AddMonths(-1);
            var endOfLastMonth = startOfMonth.AddDays(-1);

            IEnumerable<Guid>? whIds = userRole == "Admin" ? null : assignedWarehouseIds;
            var realPL = await _accountingService.GetProfitAndLossAsync(startOfMonth, endOfMonth, whIds);
            var lastMonthPL = await _accountingService.GetProfitAndLossAsync(startOfLastMonth, endOfLastMonth, whIds);
            
            var totalRevenue = realPL["TotalRevenue"];
            var totalExpensesTotal = realPL["TotalExpenses"];
            var netProfit = realPL["NetProfit"];
            var manualExpensesBreakdown = realPL["OperatingExpenses"];

            var lastRevenue = lastMonthPL["TotalRevenue"];
            var lastExpenses = lastMonthPL["TotalExpenses"];

            var revenueTrend = lastRevenue == 0 ? 100 : ((totalRevenue - lastRevenue) / lastRevenue) * 100;
            var expenseTrend = lastExpenses == 0 ? 0 : ((totalExpensesTotal - lastExpenses) / lastExpenses) * 100;

            // Top Selling Products (FILTERED - Only Paid Orders)
            var topSellingProducts = await _context.OrderDetails
                .Include(od => od.Order)
                .Include(od => od.Product)
                .Where(od => od.Product != null)
                .Where(od => od.Order.Status == OrderStatus.Paid) // ONLY PAID
                .Where(od => userRole == "Admin" || (od.Order.WarehouseId.HasValue && assignedWarehouseIds.Contains(od.Order.WarehouseId.Value)))
                .GroupBy(od => new { od.ProductId, Name = od.Product!.Name })
                .Select(g => new {
                    name = g.Key.Name,
                    value = g.Sum(od => od.Quantity)
                })
                .OrderByDescending(x => x.value)
                .Take(5)
                .ToListAsync();

            return Ok(new
            {
                TotalRevenue = totalRevenue,
                TotalExpenses = totalExpensesTotal,
                ManualExpenses = manualExpensesBreakdown,
                NetProfit = netProfit,
                CustomersCount = totalCustomers,
                EmployeesCount = totalEmployees,
                ActiveEmployees = activeEmployees,
                LowStockCount = lowStockCount,
                OutOfStockCount = outOfStockCount,
                HealthyStockCount = healthyStockCount,
                PendingInvoicesCount = pendingInvoicesCount,
                PendingInvoicesAmount = pendingInvoicesAmount,
                RecentOrders = recentOrders,
                RecentActivities = recentActivities,
                TopSellingProducts = topSellingProducts,
                MainTrend = new {
                    Labels = trendLabels,
                    Sales = salesTrendData,
                    Expenses = expensesTrendData
                },
                RevenueTrend = Math.Round(revenueTrend, 1),
                ExpenseTrend = Math.Round(expenseTrend, 1)
            });
        }

        // GET: api/Dashboard/report?startDate=2024-01-01&endDate=2024-03-31&warehouseId=...
        [HasPermission(AppPermissions.Accounting_ReportsAndBI)]
        [HttpGet("report")]
        public async Task<ActionResult<object>> GetDetailedReport(DateTime startDate, DateTime endDate, Guid? warehouseId)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid currentUserId = Guid.Empty;
            if (Guid.TryParse(userIdStr, out var pId)) currentUserId = pId;

            // Determine effective warehouse restrictions
            List<Guid> assignedWarehouseIds = new List<Guid>();
            if (userRole != "Admin")
            {
                assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == currentUserId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                
                if (warehouseId.HasValue && !assignedWarehouseIds.Contains(warehouseId.Value))
                    return Forbid("You do not have access to this warehouse's data.");
            }

            // Revenue: Paid Invoices
            var invoiceQuery = _context.Invoices
                .Include(i => i.Order)
                .Where(i => i.PaymentStatus == PaymentStatus.Paid && i.InvoiceDate >= startDate && i.InvoiceDate <= endDate);
            
            if (warehouseId.HasValue) 
                invoiceQuery = invoiceQuery.Where(i => i.Order.WarehouseId == warehouseId.Value);
            else if (userRole != "Admin")
                invoiceQuery = invoiceQuery.Where(i => i.Order.WarehouseId.HasValue && assignedWarehouseIds.Contains(i.Order.WarehouseId.Value));

            var invoices = await invoiceQuery
                .Select(i => new {
                    Date = i.InvoiceDate,
                    Description = $"Invoice #{i.InvoiceNumber}",
                    Type = "Revenue",
                    Category = "Sales",
                    Amount = i.Amount
                })
                .ToListAsync();

            // Expenses: Paid Payroll
            var payrollQuery = _context.Payrolls
                .Include(p => p.Employee)
                .Where(p => p.Status == "Paid" && p.PaymentDate >= startDate && p.PaymentDate <= endDate);

            if (warehouseId.HasValue)
                payrollQuery = payrollQuery.Where(p => p.Employee.WarehouseId == warehouseId.Value);
            else if (userRole != "Admin")
                payrollQuery = payrollQuery.Where(p => p.Employee.WarehouseId.HasValue && assignedWarehouseIds.Contains(p.Employee.WarehouseId.Value));

            var payrolls = await payrollQuery
                .Select(p => new {
                    Date = p.PaymentDate ?? DateTime.UtcNow,
                    Description = $"Payroll - Month {p.Month}/{p.Year}",
                    Type = "Expense",
                    Category = "Payroll",
                    Amount = p.NetSalary
                })
                .ToListAsync();

            // Expenses: Manual Transactions
            var transactionQuery = _context.FinancialTransactions
                .Where(t => t.Type == TransactionType.Expense && t.Date >= startDate && t.Date <= endDate);

            if (warehouseId.HasValue)
                transactionQuery = transactionQuery.Where(t => t.WarehouseId == warehouseId.Value);
            else if (userRole != "Admin")
                transactionQuery = transactionQuery.Where(t => t.WarehouseId.HasValue && assignedWarehouseIds.Contains(t.WarehouseId.Value));

            var transactions = await transactionQuery
                .Select(t => new {
                    Date = t.Date,
                    Description = t.Description,
                    Type = "Expense",
                    Category = t.Category,
                    Amount = t.Amount
                })
                .ToListAsync();

            var allTransactions = invoices.Cast<object>()
                .Concat(payrolls.Cast<object>())
                .Concat(transactions.Cast<object>())
                .OrderByDescending(x => ((dynamic)x).Date)
                .ToList();

            var totalRevenue = invoices.Sum(i => i.Amount);
            var totalPayrollExpenses = payrolls.Sum(p => p.Amount);
            var totalManualExpenses = transactions.Sum(t => t.Amount);
            var totalExpenses = totalPayrollExpenses + totalManualExpenses;

            // Generate MainTrend (Daily breakdown for the chart)
            var trendLabels = new List<string>();
            var salesTrendData = new List<decimal>();
            var expensesTrendData = new List<decimal>();

            for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
            {
                trendLabels.Add(date.ToString("yyyy-MM-dd"));
                
                var dailyRevenue = invoices.Where(i => i.Date.Date == date).Sum(i => i.Amount);
                var dailyExpense = payrolls.Where(p => p.Date.Date == date).Sum(p => p.Amount) + 
                                  transactions.Where(t => t.Date.Date == date).Sum(t => t.Amount);

                salesTrendData.Add(dailyRevenue);
                expensesTrendData.Add(dailyExpense);
            }

            return Ok(new
            {
                TotalRevenue = totalRevenue,
                TotalExpenses = totalExpenses,
                ManualExpenses = totalManualExpenses, // For Pie Chart
                NetProfit = totalRevenue - totalExpenses,
                Transactions = allTransactions,
                MainTrend = new {
                    Labels = trendLabels,
                    Sales = salesTrendData,
                    Expenses = expensesTrendData
                }
            });
        }

        [HasPermission(AppPermissions.System_UserAdmin)]
        [HttpPost("run-bg-jobs")]
        public async Task<IActionResult> RunBackgroundJobs()
        {
            try
            {
                await _jobService.RunEnterpriseJobsAsync("ManualTrigger");
                return Ok(new { message = "Background jobs executed successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
