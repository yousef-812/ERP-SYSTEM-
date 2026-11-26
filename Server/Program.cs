using ERP.Api.Data;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ERP.Api.Services;
using ERP.Api.Services.Interfaces;
using ERP.Api.Domain.Entities;
using System.Text.Json;
using System.Data;
using ERP.Api.Authorization;
using Microsoft.AspNetCore.Authorization;

// Load Environment Variables first so they are available to the builder
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddMemoryCache();
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase; // Align with frontend expectations
});

// Configure Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IAccountingService, AccountingService>();
builder.Services.AddScoped<IProcurementService, ProcurementService>();
builder.Services.AddScoped<IEInvoiceProvider, ZatcaEInvoiceProvider>();
builder.Services.AddScoped<ITaxService, TaxService>();
builder.Services.AddScoped<IWorkflowService, WorkflowService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IBackgroundJobService, BackgroundJobService>();
builder.Services.AddScoped<IExcelExportService, ExcelExportService>();
builder.Services.AddHostedService<ERP.Api.BackgroundServices.EnterpriseBackgroundWorker>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Allow any origin for local WiFi testing
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .WithExposedHeaders("X-Auth-Revoked");
    });
});

// Configure JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"];
if (string.IsNullOrEmpty(jwtSecret))
{
    throw new InvalidOperationException("JWT Secret is missing from configuration (JwtSettings:Secret). The application cannot start safely.");
}
var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

// Configure Permission-Based Authorization
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();
// PermissionHandler يحتاج IServiceProvider لجلب DbContext (لتحقق SecurityStamp)
builder.Services.AddHttpContextAccessor();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Ensure the Database is created and Seed Admin User
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // context.Database.Migrate(); // Commented out to bypass pending migration check in dev
    context.Database.EnsureCreated(); // Ensure the database exists with the new model
    
    // Ensure Accounting specific tables exist (for existing DBs where EnsureCreated might have skipped them)
    if (context.Database.IsSqlite())
    {
        // Safe creation of missing accounting tables
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS FinancialPeriods (Id TEXT PRIMARY KEY, Year INTEGER NOT NULL, Month INTEGER NOT NULL, IsClosed INTEGER NOT NULL, ClosedAt TEXT, ClosedBy TEXT)");
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS Accounts (Id TEXT PRIMARY KEY, AccountCode TEXT NOT NULL, Name TEXT NOT NULL, Type TEXT, Balance TEXT, ParentAccountId TEXT, IsActive INTEGER NOT NULL, CreatedAt TEXT, RowVersion BLOB)");
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS JournalEntries (Id TEXT PRIMARY KEY, Reference TEXT NOT NULL, Date TEXT NOT NULL, Description TEXT NOT NULL, Currency TEXT, IsLocked INTEGER NOT NULL, CreatedAt TEXT)");
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS JournalEntryLines (Id TEXT PRIMARY KEY, JournalEntryId TEXT NOT NULL, AccountId TEXT NOT NULL, Debit TEXT, Credit TEXT)");
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS DocumentMetadata (Id TEXT PRIMARY KEY, FileName TEXT NOT NULL, DisplayName TEXT NOT NULL, Category TEXT NOT NULL, FileSize INTEGER NOT NULL, FileExtension TEXT, UploadDate TEXT NOT NULL, UploadedBy TEXT)");

        // Logistics & Warehouse Transfers
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS UserWarehouses (Id TEXT PRIMARY KEY, UserId TEXT NOT NULL, WarehouseId TEXT NOT NULL, CreatedAt TEXT NOT NULL)");
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS WarehouseTransfers (Id TEXT PRIMARY KEY, TransferNumber TEXT NOT NULL, FromWarehouseId TEXT NOT NULL, ToWarehouseId TEXT NOT NULL, TransferDate TEXT NOT NULL, Status INTEGER NOT NULL, Notes TEXT, ShippedAt TEXT, ReceivedAt TEXT, CreatedById TEXT NOT NULL)");
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS WarehouseTransferItems (Id TEXT PRIMARY KEY, WarehouseTransferId TEXT NOT NULL, ProductId TEXT NOT NULL, Quantity INTEGER NOT NULL)");

        // Security: SoD Conflicts + User Security Fields
        context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS SodConflicts (Id TEXT PRIMARY KEY, PermissionA TEXT NOT NULL, PermissionB TEXT NOT NULL, Reason TEXT)");
        
        // إضافة أعمدة الأمان الجديدة للمستخدمين إذا لم تكن موجودة
        var userColumns = new Dictionary<string, string>
        {
            ["SecurityStamp"] = "TEXT DEFAULT ''",
            ["IsActive"]      = "INTEGER NOT NULL DEFAULT 1",
            ["LastLoginAt"]   = "TEXT"
        };
        foreach (var col in userColumns)
        {
            using var cmd = context.Database.GetDbConnection().CreateCommand();
            cmd.CommandText = $"SELECT COUNT(*) FROM pragma_table_info('Users') WHERE name = '{col.Key}';";
            if (cmd.Connection!.State != System.Data.ConnectionState.Open) cmd.Connection.Open();
            var exists = Convert.ToInt32(cmd.ExecuteScalar()) > 0;
            if (!exists)
            {
                try 
                { 
                    context.Database.ExecuteSqlRaw($"ALTER TABLE Users ADD COLUMN {col.Key} {col.Value};"); 
                    if (col.Key == "SecurityStamp")
                    {
                        context.Database.ExecuteSqlRaw("UPDATE Users SET SecurityStamp = lower(hex(randomblob(16))) WHERE SecurityStamp = '';");
                    }
                }
                catch (Exception ex) { Console.WriteLine($"Failed adding {col.Key}: {ex.Message}"); }
            }
        }

        // إضافة GrantedByUserId لـ UserPermissions
        {
            using var cmd = context.Database.GetDbConnection().CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM pragma_table_info('UserPermissions') WHERE name = 'GrantedByUserId';";
            if (cmd.Connection!.State != System.Data.ConnectionState.Open) cmd.Connection.Open();
            if (Convert.ToInt32(cmd.ExecuteScalar()) == 0)
            {
                try { context.Database.ExecuteSqlRaw("ALTER TABLE UserPermissions ADD COLUMN GrantedByUserId TEXT;"); }
                catch { }
            }
        }

        // إضافة NameEn لـ Warehouses
        {
            using var cmd = context.Database.GetDbConnection().CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Warehouses') WHERE name = 'NameEn';";
            if (cmd.Connection!.State != System.Data.ConnectionState.Open) cmd.Connection.Open();
            if (Convert.ToInt32(cmd.ExecuteScalar()) == 0)
            {
                try { context.Database.ExecuteSqlRaw("ALTER TABLE Warehouses ADD COLUMN NameEn TEXT;"); }
                catch { }
            }
        }

        // Safe column additions for Warehouse association (Checks if column exists first to keep logs clean)
        var tablesToUpdate = new[] { "Orders", "PurchaseOrders", "Employees", "FinancialTransactions", "JournalEntries", "PurchaseRequests", "PurchaseRequestDetails" };
        foreach (var tableName in tablesToUpdate)
        {
            // SQLite specific check for column existence
            var columnExists = false;
            using (var command = context.Database.GetDbConnection().CreateCommand())
            {
                command.CommandText = $"SELECT COUNT(*) FROM pragma_table_info('{tableName}') WHERE name = 'WarehouseId';";
                if (command.Connection!.State != System.Data.ConnectionState.Open) command.Connection.Open();
                var result = command.ExecuteScalar();
                columnExists = Convert.ToInt32(result) > 0;
            }

            if (!columnExists)
            {
                try { context.Database.ExecuteSqlRaw($"ALTER TABLE {tableName} ADD COLUMN WarehouseId TEXT;"); } 
                catch { /* Fallback for safe execution */ }
            }
        }
    }

    var adminUsername = builder.Configuration["ADMIN_USERNAME"];
    var adminPassword = builder.Configuration["ADMIN_PASSWORD"];

    if (string.IsNullOrEmpty(adminUsername) || string.IsNullOrEmpty(adminPassword))
    {
        throw new InvalidOperationException("Initial Admin credentials (ADMIN_USERNAME, ADMIN_PASSWORD) are missing from environment/config. Seeding aborted to prevent insecure fallback.");
    }

    var adminUser = context.Users.FirstOrDefault(u => u.Username == "admin" || u.Username == adminUsername);
    if (adminUser == null)
    {
        context.Users.Add(new ERP.Api.Domain.Entities.User
        {
            Username = adminUsername,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role = "Admin",
            IsActive = true,
            SecurityStamp = Guid.NewGuid().ToString()
        });
        context.SaveChanges();
    }
    else 
    {
        bool changed = false;
        if (adminUser.Username != adminUsername) { adminUser.Username = adminUsername; changed = true; }
        
        if (!BCrypt.Net.BCrypt.Verify(adminPassword, adminUser.PasswordHash))
        {
            adminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
            adminUser.SecurityStamp = Guid.NewGuid().ToString();
            changed = true;
        }
        
        if (!adminUser.IsActive) { adminUser.IsActive = true; changed = true;}
        
        if (string.IsNullOrEmpty(adminUser.SecurityStamp))
        {
            adminUser.SecurityStamp = Guid.NewGuid().ToString();
            changed = true;
        }
        
        if (changed) { context.SaveChanges(); }
    }

    // Seed Default Permissions
    // تنظيف الصلاحيات القديمة والمكررة بالإنجليزية لضمان مطابقة الكود
    var obsoletePermissions = new[] { 
        "View Annual Reports", "Access BI Tools", "System Settings", "Manage HR", "Run Payroll", 
        "Manage Inventory", "View Inventory", "Create Sales", "View Stock Levels", "Report Damage", 
        "Manual Adjustments", "Manage Warehouses", "Create Invoices", "Manage Customers", 
        "Issue Delivery Notes", "View Journal Ledger", "Manage COA", "Close Fiscal Periods", 
        "View Expenses", "Manage Documents", "View Business Activity", "View Sales Metrics", 
        "Manage Employee Files", "Record Attendance", "Process Payroll", "Recruitment Management", 
        "View Dashboard", "View Audit Logs", "User Administration" 
    };
    var obsoleteList = string.Join("', '", obsoletePermissions);
    context.Database.ExecuteSqlRaw($"DELETE FROM UserPermissions WHERE PermissionId IN (SELECT Id FROM Permissions WHERE Name IN ('{obsoleteList}'))");
    context.Database.ExecuteSqlRaw($"DELETE FROM Permissions WHERE Name IN ('{obsoleteList}')");

    var requiredPermissions = new List<Permission>
    {
        // Inventory
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Inventory_ViewStock, Module = "Inventory", Description = "مشاهدة إجمالي كميات المنتجات في المستودع" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Inventory_ReportDamage, Module = "Inventory", Description = "تسجيل وإثبات البضاعة التالفة في المستودع" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Inventory_ManualAdjustments, Module = "Inventory", Description = "إجراء تسويات جردية للكميات زيادة أو نقصاً" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Inventory_ManageWarehouses, Module = "Inventory", Description = "إضافة وتعديل بيانات مواقع التخزين" },
        
        // Sales
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Sales_CreateInvoices, Module = "Sales", Description = "إمكانية تحويل أوامر البيع إلى فواتير ضريبية" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Sales_ManageCustomers, Module = "Sales", Description = "إضافة وتعديل بيانات العملاء في النظام" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Sales_IssueDelivery, Module = "Sales", Description = "إمكانية إنشاء أذونات شحن وتسليم البضائع" },
        
        // Accounting
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Accounting_ViewLedger, Module = "Accounting", Description = "عرض الحركات المالية التفصيلية وقيود اليومية" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Accounting_ManageCOA, Module = "Accounting", Description = "إمكانية إضافة حسابات جديدة أو تعديل الهيكلية المحاسبية" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Accounting_ManageTransactions, Module = "Accounting", Description = "Can post manual expenses or journal entries" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Accounting_ReportsAndBI, Module = "Accounting", Description = "Access to annual fiscal reports and Business Intelligence (BI) tools" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Accounting_ClosePeriods, Module = "Accounting", Description = "إمكانية إقفال الشهر أو السنة المالية ومنع التعديل" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Accounting_ViewExpenses, Module = "Accounting", Description = "إمكانية عرض وتحليل المصاريف الجارية والسابقة" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.System_ManageDocuments, Module = "General", Description = "رفع وإدارة الملفات والمستندات الرسمية للمنشأة" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.System_ViewActivity, Module = "General", Description = "الاطلاع على سجل العمليات والطلبات الأخيرة في النظام (تظهر في لوحة التحكم)" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Sales_ViewMetrics, Module = "Sales", Description = "الوصول للرسوم البيانية ومقاييس أداء المبيعات في لوحة التحكم" },
        
        // HR
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ViewDashboard, Module = "HR", Description = "مشاهدة إحصائيات لوحة تحكم الموارد البشرية والنشاطات الأخيرة" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ManageEmployees, Module = "HR", Description = "تعديل البيانات الشخصية، الوظيفية، والوثائق الرسمية للموظفين" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_RecordAttendance, Module = "HR", Description = "إمكانية إثبات حضور وغياب الموظفين يدوياً" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ProcessPayroll, Module = "HR", Description = "توليد مسيرات الرواتب واعتماد الصرف الشهري" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_Recruitment, Module = "HR", Description = "نشر الوظائف الشاغرة ومتابعة طلبات التوظيف" },
        
        // System
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.System_ViewDashboard, Module = "Admin", Description = "Access to the main dashboard and general system metrics" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.System_ViewAuditLogs, Module = "Admin", Description = "مراقبة كافة عمليات الإضافة والحذف والتعديل التي تمت في النظام" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.System_UserAdmin, Module = "Admin", Description = "إنشاء حسابات دخول للموظفين وتعيين كلمات المرور" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.System_Settings, Module = "Admin", Description = "Configure the look and feel of your ERP system and global rules." },
        
        // General
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Procurement_CreatePO, Module = "Procurement", Description = "Can request new goods from suppliers" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Procurement_ViewSuppliers, Module = "Procurement", Description = "Access contact details for registered suppliers" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Procurement_ViewRequests, Module = "Procurement", Description = "Access to view purchase requests" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Procurement_ManageSuppliers, Module = "Procurement", Description = "Add, edit, and delete supplier records in the system" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Inventory_ManageProducts, Module = "Inventory", Description = "Add, edit, and delete products in the inventory" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Procurement_ApproveRequests, Module = "Procurement", Description = "Approve purchase requests or leaves via workflow" },

        // Missing View Permissions added in Hardening Phase
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Sales_ViewCustomers, Module = "Sales", Description = "General access to customer list" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Sales_ViewOrders, Module = "Sales", Description = "General access to sales orders" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ViewEmployees, Module = "HR", Description = "General access to employee list" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ViewAttendance, Module = "HR", Description = "Access to view daily attendance logs" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ViewAppraisals, Module = "HR", Description = "Access to view employee performance reviews" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ManageAppraisals, Module = "HR", Description = "Create and submit performance reviews" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ViewTimeOff, Module = "HR", Description = "Access to view employee leave requests" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_CreateTimeOff, Module = "HR", Description = "إمكانية إنشاء وتقديم طلبات إجازة جديدة" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ManageTimeOff, Module = "HR", Description = "Approve or reject employee leave requests" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.HR_ViewPayroll, Module = "HR", Description = "Access to view salary records" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Inventory_ViewTransfers, Module = "Inventory", Description = "Access to view stock movements between branches" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Inventory_ManageTransfers, Module = "Inventory", Description = "Approve and manage stock transfers between warehouses" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Procurement_ViewPO, Module = "Procurement", Description = "Access to view purchase orders" },
        new Permission { Id = Guid.NewGuid(), Name = AppPermissions.Sales_ViewInvoices, Module = "Sales", Description = "Access to view sales invoices" }
    };

    foreach (var p in requiredPermissions)
    {
        var existing = context.Permissions.FirstOrDefault(x => x.Name == p.Name);
        if (existing == null)
        {
            context.Permissions.Add(p);
        }
        else
        {
            if (existing.Module != p.Module || existing.Description != p.Description)
            {
                existing.Module = p.Module;
                existing.Description = p.Description;
                context.Permissions.Update(existing);
            }
        }
    }
    context.SaveChanges();

    // Seed SoD Conflict Rules
    foreach (var rule in ERP.Api.Authorization.AppPermissions.SodRules)
    {
        if (!context.SodConflicts.Any(s => s.PermissionA == rule.A && s.PermissionB == rule.B))
        {
            context.SodConflicts.Add(new ERP.Api.Domain.Entities.SodConflict
            {
                Id = Guid.NewGuid(),
                PermissionA = rule.A,
                PermissionB = rule.B,
                Reason = rule.Reason
            });
        }
    }
    context.SaveChanges();

    // Seed Default Warehouses & Data (Removed as per user request to keep system clean)

    // Seed Default Workflow for Purchase Requests
    if (!context.WorkflowDefinitions.Any(w => w.Name == "Purchase Request"))
    {
        var prWorkflow = new WorkflowDefinition
        {
            Id = Guid.NewGuid(),
            Name = "Purchase Request",
            EntityType = "PurchaseRequest",
            IsActive = true,
            Steps = new List<WorkflowStep>
            {
                new WorkflowStep { Id = Guid.NewGuid(), Sequence = 1, Name = "Department Manager Approval", RequiredRole = "Manager", ApprovalMode = StepApprovalMode.Any },
                new WorkflowStep { Id = Guid.NewGuid(), Sequence = 2, Name = "Finance Director Approval", RequiredRole = "Accountant", ApprovalMode = StepApprovalMode.Any }
            }
        };
        context.WorkflowDefinitions.Add(prWorkflow);
        context.SaveChanges();
    }

    // Seed Background Job Lock
    if (!context.BackgroundJobLocks.Any(l => l.JobName == "EnterpriseWorker"))
    {
        context.BackgroundJobLocks.Add(new BackgroundJobLock
        {
            JobName = "EnterpriseWorker",
            LastRunDate = DateTime.MinValue,
            LockedUntil = null
        });
        context.SaveChanges();
    }
}

app.UseMiddleware<ERP.Api.Middleware.GlobalExceptionMiddleware>();

// app.UseHttpsRedirection(); // Disabled for local WiFi testing (avoids cert issues)

// Enable CORS
app.UseCors("AllowReact");

app.UseAuthentication();
app.UseAuthorization();

// Serve static files from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
// Fallback for SPA routing (React Router)
app.MapFallbackToFile("index.html");

app.Run();
