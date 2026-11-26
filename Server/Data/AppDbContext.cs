using Microsoft.EntityFrameworkCore;
using ERP.Api.Domain.Entities;

namespace ERP.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Product> Products { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<CustomerLedger> CustomerLedgers { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<FinancialTransaction> FinancialTransactions { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<StockMovement> StockMovements { get; set; }
        public DbSet<Setting> Settings { get; set; }
        
        // HR & Payroll
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Attendance> Attendance { get; set; }
        public DbSet<Payroll> Payrolls { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<DocumentMetadata> DocumentMetadata { get; set; }

        // Enterprise: Procurement Expansion
        public DbSet<PurchaseRequest> PurchaseRequests { get; set; }
        public DbSet<PurchaseRequestDetail> PurchaseRequestDetails { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<PurchaseOrderDetail> PurchaseOrderDetails { get; set; }
        public DbSet<GoodsReceivedNote> GoodsReceivedNotes { get; set; }
        public DbSet<GoodsReceivedNoteDetail> GoodsReceivedNoteDetails { get; set; }

        // Enterprise: Logistics
        public DbSet<DeliveryNote> DeliveryNotes { get; set; }

        // Enterprise: Accounting
        public DbSet<Account> Accounts { get; set; }
        public DbSet<JournalEntry> JournalEntries { get; set; }
        public DbSet<JournalEntryLine> JournalEntryLines { get; set; }
        public DbSet<FinancialPeriod> FinancialPeriods { get; set; }

        // ERP Suite Expansion: HR
        public DbSet<TimeOffRequest> TimeOffRequests { get; set; }
        public DbSet<RecruitmentJob> RecruitmentJobs { get; set; }
        public DbSet<JobApplication> JobApplications { get; set; }
        public DbSet<Appraisal> Appraisals { get; set; }

        // ERP Suite Expansion: Warehouse & Inventory
        public DbSet<Warehouse> Warehouses { get; set; }
        public DbSet<StockLevel> StockLevels { get; set; }
        public DbSet<InventoryTransaction> InventoryTransactions { get; set; }
        public DbSet<DamageRequest> DamageRequests { get; set; }

        public DbSet<WarehouseTransfer> WarehouseTransfers { get; set; }
        public DbSet<WarehouseTransferItem> WarehouseTransferItems { get; set; }

        // ERP Suite Expansion: Workflows & Approvals
        public DbSet<WorkflowDefinition> WorkflowDefinitions { get; set; }
        public DbSet<WorkflowStep> WorkflowSteps { get; set; }
        public DbSet<WorkflowInstance> WorkflowInstances { get; set; }
        public DbSet<WorkflowActionLog> WorkflowActionLogs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<BackgroundJobLock> BackgroundJobLocks { get; set; }

        public DbSet<Permission> Permissions { get; set; }
        public DbSet<UserPermission> UserPermissions { get; set; }
        public DbSet<UserWarehouse> UserWarehouses { get; set; }
        public DbSet<SodConflict> SodConflicts { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Cascade delete OrderDetails when an Order is deleted
            modelBuilder.Entity<Order>()
                .HasMany(o => o.Details)
                .WithOne(d => d.Order)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relationships
            modelBuilder.Entity<Invoice>()
                .HasOne(i => i.Order)
                .WithMany()
                .HasForeignKey(i => i.OrderId);

            // Enterprise Configurations
            modelBuilder.Entity<PurchaseOrder>()
                .HasMany(p => p.Details)
                .WithOne(d => d.PurchaseOrder)
                .HasForeignKey(d => d.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseRequest>()
                .HasMany(p => p.Details)
                .WithOne(d => d.PurchaseRequest)
                .HasForeignKey(d => d.PurchaseRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<GoodsReceivedNote>()
                .HasMany(p => p.Details)
                .WithOne(d => d.GoodsReceivedNote)
                .HasForeignKey(d => d.GoodsReceivedNoteId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkflowDefinition>()
                .HasMany(w => w.Steps)
                .WithOne(s => s.WorkflowDefinition)
                .HasForeignKey(s => s.WorkflowDefinitionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkflowInstance>()
                .HasMany(w => w.Logs)
                .WithOne(l => l.WorkflowInstance)
                .HasForeignKey(l => l.WorkflowInstanceId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<JournalEntry>()
                .HasMany(j => j.Lines)
                .WithOne(l => l.JournalEntry)
                .HasForeignKey(l => l.JournalEntryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserPermission>()
                .HasOne(up => up.User)
                .WithMany()
                .HasForeignKey(up => up.UserId);

            modelBuilder.Entity<UserPermission>()
                .HasOne(up => up.Permission)
                .WithMany()
                .HasForeignKey(up => up.PermissionId);

            // GrantedByUserId — optional FK, no cascade (منع cascade على الحذف)
            modelBuilder.Entity<UserPermission>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(up => up.GrantedByUserId)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);

            modelBuilder.Entity<UserWarehouse>()
                .HasOne(uw => uw.User)
                .WithMany()
                .HasForeignKey(uw => uw.UserId);

            modelBuilder.Entity<UserWarehouse>()
                .HasOne(uw => uw.Warehouse)
                .WithMany()
                .HasForeignKey(uw => uw.WarehouseId);

            // ERP Configuration: Hierarchy
            modelBuilder.Entity<Account>()
                .HasOne(a => a.ParentAccount)
                .WithMany(a => a.ChildAccounts)
                .HasForeignKey(a => a.ParentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            // ERP Configuration: TimeOff
            modelBuilder.Entity<TimeOffRequest>()
                .HasOne(t => t.Employee)
                .WithMany()
                .HasForeignKey(t => t.EmployeeId);

            // ERP Configuration: Warehouse
            modelBuilder.Entity<StockLevel>()
                .HasOne(s => s.Warehouse)
                .WithMany(w => w.StockLevels)
                .HasForeignKey(s => s.WarehouseId);

            // Precision for decimals
            foreach (var property in modelBuilder.Model.GetEntityTypes()
                .SelectMany(t => t.GetProperties())
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            {
                property.SetPrecision(18);
                property.SetScale(2);
            }

            // SQLite RowVersion compatibility
            modelBuilder.Entity<Order>().Property(o => o.RowVersion).ValueGeneratedNever();
            modelBuilder.Entity<Invoice>().Property(i => i.RowVersion).ValueGeneratedNever();
            modelBuilder.Entity<Product>().Property(p => p.RowVersion).ValueGeneratedNever();
            modelBuilder.Entity<Account>().Property(a => a.RowVersion).ValueGeneratedNever();

            // Warehouse Transfer Config
            modelBuilder.Entity<WarehouseTransfer>()
                .HasOne(wt => wt.FromWarehouse)
                .WithMany()
                .HasForeignKey(wt => wt.FromWarehouseId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WarehouseTransfer>()
                .HasOne(wt => wt.ToWarehouse)
                .WithMany()
                .HasForeignKey(wt => wt.ToWarehouseId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WarehouseTransferItem>()
                .HasOne(wti => wti.WarehouseTransfer)
                .WithMany(wt => wt.Items)
                .HasForeignKey(wti => wti.WarehouseTransferId)
                .OnDelete(DeleteBehavior.Cascade);
        }
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateRowVersions();
            return base.SaveChangesAsync(cancellationToken);
        }

        public override int SaveChanges()
        {
            UpdateRowVersions();
            return base.SaveChanges();
        }

        private void UpdateRowVersions()
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

            foreach (var entry in entries)
            {
                var rowVersionProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "RowVersion");
                if (rowVersionProp != null && rowVersionProp.Metadata.ClrType == typeof(byte[]))
                {
                    // Use 8-byte array to match existing pattern and column width
                    var bytes = new byte[8];
                    new Random().NextBytes(bytes);
                    rowVersionProp.CurrentValue = bytes;
                }
            }
        }
    }
}
