namespace ERP.Api.Authorization
{
    /// <summary>
    /// مركز الصلاحيات — كل permission string معرّف هنا بشكل ثابت
    /// لا تستخدم strings مباشرة في الـ controllers، استخدم هذه الثوابت دائمًا
    /// </summary>
    public static class AppPermissions
    {
        // ─── Inventory ──────────────────────────────────────────────────────────
        public const string Inventory_ViewStock        = "عرض مستويات المخزون";
        public const string Inventory_ManageProducts   = "إدارة المنتجات";
        public const string Inventory_ManageWarehouses = "إدارة المستودعات";
        public const string Inventory_ReportDamage     = "تسجيل التلفيات";
        public const string Inventory_ManualAdjustments= "تسويات مخزنية";
        public const string Inventory_ViewTransfers    = "عرض تحويلات المستودعات";
        public const string Inventory_ManageTransfers  = "إدارة تحويلات المستودعات";

        // ─── Sales ───────────────────────────────────────────────────────────────
        public const string Sales_ViewCustomers  = "عرض العملاء";
        public const string Sales_ManageCustomers= "إدارة العملاء";
        public const string Sales_ViewOrders     = "عرض المبيعات";
        public const string Sales_ViewInvoices   = "عرض الفواتير";
        public const string Sales_CreateInvoices = "إصدار الفواتير";
        public const string Sales_IssueDelivery  = "إصدار أذونات التسليم";
        public const string Sales_ViewMetrics    = "عرض مؤشرات المبيعات";

        // ─── Procurement ─────────────────────────────────────────────────────────
        public const string Procurement_ViewSuppliers   = "عرض الموردين";
        public const string Procurement_ManageSuppliers = "إدارة الموردين";
        public const string Procurement_CreateRequest   = "إنشاء طلب شراء";
        public const string Procurement_ViewRequests    = "عرض طلبات الشراء";
        public const string Procurement_CreatePO        = "إنشاء أمر شراء";
        public const string Procurement_ViewPO          = "عرض أوامر الشراء";
        // ⚠ SoD: Procurement_ApproveRequests لا يجتمع مع Procurement_CreatePO
        public const string Procurement_ApproveRequests = "اعتماد الطلبات";

        // ─── Accounting ──────────────────────────────────────────────────────────
        public const string Accounting_ViewLedger      = "عرض دفتر اليومية";
        public const string Accounting_ManageCOA       = "إدارة شجرة الحسابات";
        // ⚠ SoD: Accounting_ManageTransactions لا يجتمع مع Accounting_ClosePeriods
        public const string Accounting_ManageTransactions = "إدارة المعاملات المالية";
        public const string Accounting_ReportsAndBI    = "التقارير المالية وذكاء الأعمال";
        // ⚠ SoD: Accounting_ClosePeriods لا يجتمع مع Accounting_ManageTransactions
        public const string Accounting_ClosePeriods    = "إقفال الفترات المالية";
        public const string Accounting_ViewExpenses    = "عرض المصاريف";

        // ─── HR ──────────────────────────────────────────────────────────────────
        public const string HR_ViewDashboard    = "عرض لوحة تحكم الموارد البشرية";
        public const string HR_ViewEmployees    = "عرض الموظفين";
        // ⚠ SoD: HR_ManageEmployees لا يجتمع مع HR_ProcessPayroll
        public const string HR_ManageEmployees  = "إدارة ملفات الموظفين";
        public const string HR_ViewAttendance   = "عرض سجلات الحضور";
        public const string HR_RecordAttendance = "تسجيل الحضور";
        public const string HR_ViewAppraisals   = "عرض تقييم الأداء";
        public const string HR_ManageAppraisals = "إدارة تقييم الأداء";
        public const string HR_ViewTimeOff      = "عرض طلبات الإجازات";
        public const string HR_CreateTimeOff    = "إنشاء طلب إجازة";
        public const string HR_ManageTimeOff    = "إدارة طلبات الإجازات";
        public const string HR_ViewPayroll      = "عرض الرواتب";
        // ⚠ SoD: HR_ProcessPayroll لا يجتمع مع HR_ManageEmployees
        public const string HR_ProcessPayroll   = "معالجة الرواتب";
        public const string HR_Recruitment      = "إدارة التوظيف";

        // ─── System ──────────────────────────────────────────────────────────────
        public const string System_ViewDashboard   = "عرض لوحة التحكم";
        public const string System_ViewAuditLogs   = "عرض سجلات التدقيق";
        // ⚠ System_UserAdmin: لا يمنح صاحبه أي صلاحية مالية أو تشغيلية تلقائيًا
        public const string System_UserAdmin       = "إدارة المستخدمين";
        public const string System_Settings        = "إدارة إعدادات النظام";
        public const string System_ViewActivity    = "عرض نشاطات العمل";
        public const string System_ManageDocuments = "إدارة المستندات";

        // ─── قائمة تعارضات SoD المعتمدة ─────────────────────────────────────────
        // تُستخدم في PermissionsController للتحقق قبل الحفظ
        public static readonly IReadOnlyList<(string A, string B, string Reason)> SodRules =
            new List<(string, string, string)>
            {
                (Procurement_CreatePO, Procurement_ApproveRequests,
                    "The same person cannot create and approve a purchase request (SoD violation)"),
                (Accounting_ManageTransactions, Accounting_ClosePeriods,
                    "The same person cannot post journal entries and close fiscal periods (SoD violation)"),
                (HR_ManageEmployees, HR_ProcessPayroll,
                    "The same person cannot manage employee files and process payroll (SoD violation)"),
                (HR_CreateTimeOff, HR_ManageTimeOff,
                    "The same person cannot create and approve their own leave requests (SoD violation)"),
            };
    }
}
