CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

BEGIN TRANSACTION;
CREATE TABLE "Customers" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Customers" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Email" TEXT NULL,
    "Phone" TEXT NULL,
    "Address" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL
);

CREATE TABLE "FinancialTransactions" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_FinancialTransactions" PRIMARY KEY,
    "Type" INTEGER NOT NULL,
    "Amount" TEXT NOT NULL,
    "Date" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "RelatedEntityId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "Products" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Products" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "SKU" TEXT NOT NULL,
    "Category" TEXT NULL,
    "Price" TEXT NOT NULL,
    "StockQuantity" INTEGER NOT NULL,
    "MinStockLevel" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL
);

CREATE TABLE "Orders" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Orders" PRIMARY KEY,
    "CustomerId" TEXT NOT NULL,
    "OrderDate" TEXT NOT NULL,
    "TotalAmount" TEXT NOT NULL,
    "Status" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Orders_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Invoices" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Invoices" PRIMARY KEY,
    "OrderId" TEXT NOT NULL,
    "InvoiceNumber" TEXT NOT NULL,
    "InvoiceDate" TEXT NOT NULL,
    "Amount" TEXT NOT NULL,
    "PaymentStatus" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Invoices_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE CASCADE
);

CREATE TABLE "OrderDetails" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_OrderDetails" PRIMARY KEY,
    "OrderId" TEXT NOT NULL,
    "ProductId" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "UnitPrice" TEXT NOT NULL,
    CONSTRAINT "FK_OrderDetails_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_OrderDetails_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_Invoices_OrderId" ON "Invoices" ("OrderId");

CREATE INDEX "IX_OrderDetails_OrderId" ON "OrderDetails" ("OrderId");

CREATE INDEX "IX_OrderDetails_ProductId" ON "OrderDetails" ("ProductId");

CREATE INDEX "IX_Orders_CustomerId" ON "Orders" ("CustomerId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260328193830_InitialCreateSQLite', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "Users" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Users" PRIMARY KEY,
    "Username" TEXT NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "Role" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260328205540_AddUserAuth', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "Suppliers" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Suppliers" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "ContactPerson" TEXT NULL,
    "Phone" TEXT NULL,
    "Email" TEXT NULL,
    "Address" TEXT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "StockMovements" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_StockMovements" PRIMARY KEY,
    "ProductId" TEXT NOT NULL,
    "SupplierId" TEXT NULL,
    "Quantity" INTEGER NOT NULL,
    "UnitCost" TEXT NOT NULL,
    "Type" INTEGER NOT NULL,
    "MovementDate" TEXT NOT NULL,
    "Note" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_StockMovements_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_StockMovements_Suppliers_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Suppliers" ("Id")
);

CREATE INDEX "IX_StockMovements_ProductId" ON "StockMovements" ("ProductId");

CREATE INDEX "IX_StockMovements_SupplierId" ON "StockMovements" ("SupplierId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260328213938_AddInventoryAndSuppliers', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "Settings" (
    "Key" TEXT NOT NULL CONSTRAINT "PK_Settings" PRIMARY KEY,
    "Value" TEXT NOT NULL,
    "Description" TEXT NULL,
    "UpdatedAt" TEXT NOT NULL
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260328225849_AddSettingsTable', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Orders" ADD "TaxAmount" TEXT NOT NULL DEFAULT '0.0';

ALTER TABLE "Invoices" ADD "TaxAmount" TEXT NOT NULL DEFAULT '0.0';

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260328232214_AddTaxAmountFields', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Users" ADD "AssignedModules" TEXT NOT NULL DEFAULT '';

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260330205008_AddUserModules', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
CREATE TABLE "Employees" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Employees" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "PhotoUrl" TEXT NULL,
    "Position" TEXT NOT NULL,
    "Department" TEXT NOT NULL,
    "JoiningDate" TEXT NOT NULL,
    "BasicSalary" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "Phone" TEXT NULL,
    "Email" TEXT NULL,
    "Address" TEXT NULL
);

CREATE TABLE "Attendance" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Attendance" PRIMARY KEY AUTOINCREMENT,
    "EmployeeId" INTEGER NOT NULL,
    "Date" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "Notes" TEXT NULL,
    CONSTRAINT "FK_Attendance_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Payrolls" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Payrolls" PRIMARY KEY AUTOINCREMENT,
    "EmployeeId" INTEGER NOT NULL,
    "Month" INTEGER NOT NULL,
    "Year" INTEGER NOT NULL,
    "BasicSalary" TEXT NOT NULL,
    "Bonus" TEXT NOT NULL,
    "Deductions" TEXT NOT NULL,
    "NetSalary" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "PaymentDate" TEXT NULL,
    "Remarks" TEXT NULL,
    CONSTRAINT "FK_Payrolls_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_Attendance_EmployeeId" ON "Attendance" ("EmployeeId");

CREATE INDEX "IX_Payrolls_EmployeeId" ON "Payrolls" ("EmployeeId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260330221007_AddHREntities', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Products" ADD "Barcode" TEXT NULL;

ALTER TABLE "Orders" ADD "ReturnDate" TEXT NULL;

ALTER TABLE "Orders" ADD "ReturnReason" TEXT NULL;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260331064335_ERP_Modernization_v1', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Payrolls" ADD "AbsentDays" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payrolls" ADD "LeaveDays" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payrolls" ADD "PresentDays" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AuditLogs" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AuditLogs" PRIMARY KEY,
    "Username" TEXT NOT NULL,
    "Action" TEXT NOT NULL,
    "EntityName" TEXT NOT NULL,
    "EntityId" TEXT NULL,
    "Details" TEXT NULL,
    "IPAddress" TEXT NULL,
    "CreatedAt" TEXT NOT NULL
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260331114011_AddAuditLogs', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Payrolls" ADD "IncomeTax" TEXT NOT NULL DEFAULT '0.0';

ALTER TABLE "Payrolls" ADD "SocialInsurance" TEXT NOT NULL DEFAULT '0.0';

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260331120511_AddPayrollDeductionFields', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "FinancialTransactions" ADD "Category" TEXT NOT NULL DEFAULT '';

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260331130813_AddFinancialTransactionCategory', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Products" ADD "NameEn" TEXT NULL;

ALTER TABLE "Employees" ADD "DepartmentEn" TEXT NULL;

ALTER TABLE "Employees" ADD "NameEn" TEXT NULL;

ALTER TABLE "Employees" ADD "PositionEn" TEXT NULL;

ALTER TABLE "Customers" ADD "NameEn" TEXT NULL;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260331162733_AddEnglishNames', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "AuditLogs" ADD "IsRead" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260331180618_AddIsReadToAuditLog', '10.0.5');

COMMIT;

BEGIN TRANSACTION;
ALTER TABLE "Invoices" RENAME COLUMN "TaxAmount" TO "TotalTaxAmount";

ALTER TABLE "Products" ADD "RowVersion" BLOB NOT NULL DEFAULT X'';

ALTER TABLE "Orders" ADD "IsQuotation" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Orders" ADD "ParentOrderId" TEXT NULL;

ALTER TABLE "Orders" ADD "QuotationNumber" TEXT NULL;

ALTER TABLE "Orders" ADD "RowVersion" BLOB NOT NULL DEFAULT X'';

ALTER TABLE "Orders" ADD "ValidUntil" TEXT NULL;

ALTER TABLE "Invoices" ADD "DueDate" TEXT NOT NULL DEFAULT '0001-01-01 00:00:00';

ALTER TABLE "Invoices" ADD "RowVersion" BLOB NOT NULL DEFAULT X'';

ALTER TABLE "Invoices" ADD "TaxPercentage" TEXT NOT NULL DEFAULT '0.0';

ALTER TABLE "Invoices" ADD "TlvBase64String" TEXT NULL;

ALTER TABLE "Invoices" ADD "TotalAmountInclTax" TEXT NOT NULL DEFAULT '0.0';

ALTER TABLE "AuditLogs" ADD "ApproverId" TEXT NULL;

ALTER TABLE "AuditLogs" ADD "ReasonCode" TEXT NULL;

CREATE TABLE "Accounts" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Accounts" PRIMARY KEY,
    "AccountCode" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Type" TEXT NOT NULL,
    "Balance" TEXT NOT NULL,
    "ParentAccountId" TEXT NULL,
    "IsActive" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "RowVersion" BLOB NOT NULL,
    CONSTRAINT "FK_Accounts_Accounts_ParentAccountId" FOREIGN KEY ("ParentAccountId") REFERENCES "Accounts" ("Id") ON DELETE RESTRICT
);

CREATE TABLE "Appraisals" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Appraisals" PRIMARY KEY,
    "EmployeeId" TEXT NOT NULL,
    "ReviewDate" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "Rating" REAL NOT NULL,
    "Score" INTEGER NOT NULL,
    "Comments" TEXT NULL,
    CONSTRAINT "FK_Appraisals_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE
);

CREATE TABLE "BackgroundJobLocks" (
    "JobName" TEXT NOT NULL CONSTRAINT "PK_BackgroundJobLocks" PRIMARY KEY,
    "LastRunDate" TEXT NOT NULL,
    "LockedUntil" TEXT NULL,
    "LockedByInstance" TEXT NULL
);

CREATE TABLE "CustomerLedgers" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_CustomerLedgers" PRIMARY KEY,
    "CustomerId" TEXT NOT NULL,
    "TransactionDate" TEXT NOT NULL,
    "EntryType" INTEGER NOT NULL,
    "Debit" TEXT NOT NULL,
    "Credit" TEXT NOT NULL,
    "BalanceAfter" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "RelatedEntityId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_CustomerLedgers_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE
);

CREATE TABLE "DamageRequests" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_DamageRequests" PRIMARY KEY,
    "RequestNumber" TEXT NOT NULL,
    "ProductId" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "Reason" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "DateReported" TEXT NOT NULL,
    CONSTRAINT "FK_DamageRequests_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE
);

CREATE TABLE "DeliveryNotes" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_DeliveryNotes" PRIMARY KEY,
    "NoteNumber" TEXT NOT NULL,
    "OrderId" TEXT NOT NULL,
    "ShippedDate" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "RecipientName" TEXT NOT NULL,
    "ShippingAddress" TEXT NOT NULL,
    "DeliveredAt" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_DeliveryNotes_Orders_OrderId" FOREIGN KEY ("OrderId") REFERENCES "Orders" ("Id") ON DELETE CASCADE
);

CREATE TABLE "FinancialPeriods" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_FinancialPeriods" PRIMARY KEY,
    "Year" INTEGER NOT NULL,
    "Month" INTEGER NOT NULL,
    "IsClosed" INTEGER NOT NULL,
    "ClosedAt" TEXT NULL,
    "ClosedBy" TEXT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "JournalEntries" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_JournalEntries" PRIMARY KEY,
    "Reference" TEXT NOT NULL,
    "Date" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "Currency" TEXT NOT NULL,
    "IsLocked" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "Notifications" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Notifications" PRIMARY KEY,
    "UserId" TEXT NULL,
    "Title" TEXT NOT NULL,
    "Message" TEXT NOT NULL,
    "Type" INTEGER NOT NULL,
    "Severity" INTEGER NOT NULL,
    "IsRead" INTEGER NOT NULL,
    "Link" TEXT NULL,
    "MetadataJson" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    "ExpiryDate" TEXT NULL,
    CONSTRAINT "FK_Notifications_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Permissions" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Permissions" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Module" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "PurchaseOrders" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_PurchaseOrders" PRIMARY KEY,
    "PONumber" TEXT NOT NULL,
    "SupplierId" TEXT NOT NULL,
    "OrderDate" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "TotalAmount" TEXT NOT NULL,
    "Notes" TEXT NOT NULL,
    "ReceivedAt" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_PurchaseOrders_Suppliers_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Suppliers" ("Id") ON DELETE CASCADE
);

CREATE TABLE "RecruitmentJobs" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_RecruitmentJobs" PRIMARY KEY,
    "Title" TEXT NOT NULL,
    "Department" TEXT NOT NULL,
    "JobType" TEXT NOT NULL,
    "Description" TEXT NOT NULL,
    "Requirements" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "PostedAt" TEXT NOT NULL,
    "ExperienceLevel" TEXT NULL
);

CREATE TABLE "TimeOffRequests" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_TimeOffRequests" PRIMARY KEY,
    "EmployeeId" TEXT NOT NULL,
    "Type" TEXT NOT NULL,
    "StartDate" TEXT NOT NULL,
    "EndDate" TEXT NOT NULL,
    "TotalDays" INTEGER NOT NULL,
    "Status" TEXT NOT NULL,
    "Reason" TEXT NULL,
    "ManagerNote" TEXT NULL,
    "ApprovedById" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_TimeOffRequests_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TimeOffRequests_Users_ApprovedById" FOREIGN KEY ("ApprovedById") REFERENCES "Users" ("Id")
);

CREATE TABLE "Warehouses" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Warehouses" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Manager" TEXT NOT NULL,
    "IsActive" INTEGER NOT NULL
);

CREATE TABLE "WorkflowDefinitions" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_WorkflowDefinitions" PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "EntityType" TEXT NOT NULL,
    "IsActive" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "JournalEntryLines" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_JournalEntryLines" PRIMARY KEY,
    "JournalEntryId" TEXT NOT NULL,
    "AccountId" TEXT NOT NULL,
    "Debit" TEXT NOT NULL,
    "Credit" TEXT NOT NULL,
    CONSTRAINT "FK_JournalEntryLines_Accounts_AccountId" FOREIGN KEY ("AccountId") REFERENCES "Accounts" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_JournalEntryLines_JournalEntries_JournalEntryId" FOREIGN KEY ("JournalEntryId") REFERENCES "JournalEntries" ("Id") ON DELETE CASCADE
);

CREATE TABLE "UserPermissions" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_UserPermissions" PRIMARY KEY,
    "UserId" TEXT NOT NULL,
    "PermissionId" TEXT NOT NULL,
    "GrantedAt" TEXT NOT NULL,
    CONSTRAINT "FK_UserPermissions_Permissions_PermissionId" FOREIGN KEY ("PermissionId") REFERENCES "Permissions" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserPermissions_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "PurchaseOrderDetails" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_PurchaseOrderDetails" PRIMARY KEY,
    "PurchaseOrderId" TEXT NOT NULL,
    "ProductId" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "UnitPrice" TEXT NOT NULL,
    CONSTRAINT "FK_PurchaseOrderDetails_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_PurchaseOrderDetails_PurchaseOrders_PurchaseOrderId" FOREIGN KEY ("PurchaseOrderId") REFERENCES "PurchaseOrders" ("Id") ON DELETE CASCADE
);

CREATE TABLE "JobApplications" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_JobApplications" PRIMARY KEY,
    "JobId" TEXT NOT NULL,
    "CandidateName" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Phone" TEXT NULL,
    "Status" TEXT NOT NULL,
    "CV_Path" TEXT NULL,
    "AppliedAt" TEXT NOT NULL,
    CONSTRAINT "FK_JobApplications_RecruitmentJobs_JobId" FOREIGN KEY ("JobId") REFERENCES "RecruitmentJobs" ("Id") ON DELETE CASCADE
);

CREATE TABLE "GoodsReceivedNotes" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_GoodsReceivedNotes" PRIMARY KEY,
    "GRNNumber" TEXT NOT NULL,
    "PurchaseOrderId" TEXT NOT NULL,
    "ReceivedDate" TEXT NOT NULL,
    "ReceivedById" TEXT NOT NULL,
    "WarehouseId" TEXT NOT NULL,
    "DeliveryNoteNumber" TEXT NULL,
    "Remarks" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_GoodsReceivedNotes_Employees_ReceivedById" FOREIGN KEY ("ReceivedById") REFERENCES "Employees" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_GoodsReceivedNotes_PurchaseOrders_PurchaseOrderId" FOREIGN KEY ("PurchaseOrderId") REFERENCES "PurchaseOrders" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_GoodsReceivedNotes_Warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES "Warehouses" ("Id") ON DELETE CASCADE
);

CREATE TABLE "InventoryTransactions" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_InventoryTransactions" PRIMARY KEY,
    "ProductId" TEXT NOT NULL,
    "WarehouseId" TEXT NOT NULL,
    "Type" TEXT NOT NULL,
    "Quantity" TEXT NOT NULL,
    "UnitCost" TEXT NOT NULL,
    "TransactionDate" TEXT NOT NULL,
    "Reference" TEXT NULL,
    "Note" TEXT NULL,
    "BatchNumber" TEXT NULL,
    "ExpiryDate" TEXT NULL,
    "CreatedById" TEXT NOT NULL,
    CONSTRAINT "FK_InventoryTransactions_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_InventoryTransactions_Users_CreatedById" FOREIGN KEY ("CreatedById") REFERENCES "Users" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_InventoryTransactions_Warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES "Warehouses" ("Id") ON DELETE CASCADE
);

CREATE TABLE "StockLevels" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_StockLevels" PRIMARY KEY,
    "ProductId" TEXT NOT NULL,
    "WarehouseId" TEXT NOT NULL,
    "Quantity" TEXT NOT NULL,
    "BinLocation" TEXT NULL,
    CONSTRAINT "FK_StockLevels_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_StockLevels_Warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES "Warehouses" ("Id") ON DELETE CASCADE
);

CREATE TABLE "WorkflowInstances" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_WorkflowInstances" PRIMARY KEY,
    "WorkflowDefinitionId" TEXT NOT NULL,
    "EntityId" TEXT NOT NULL,
    "CurrentStepSequence" INTEGER NOT NULL,
    "Status" INTEGER NOT NULL,
    "StartedAt" TEXT NOT NULL,
    "CompletedAt" TEXT NULL,
    CONSTRAINT "FK_WorkflowInstances_WorkflowDefinitions_WorkflowDefinitionId" FOREIGN KEY ("WorkflowDefinitionId") REFERENCES "WorkflowDefinitions" ("Id") ON DELETE CASCADE
);

CREATE TABLE "WorkflowSteps" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_WorkflowSteps" PRIMARY KEY,
    "WorkflowDefinitionId" TEXT NOT NULL,
    "Sequence" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "RequiredRole" TEXT NOT NULL,
    "ApprovalMode" INTEGER NOT NULL,
    "TimeoutHours" INTEGER NOT NULL,
    "EscalationRole" TEXT NULL,
    CONSTRAINT "FK_WorkflowSteps_WorkflowDefinitions_WorkflowDefinitionId" FOREIGN KEY ("WorkflowDefinitionId") REFERENCES "WorkflowDefinitions" ("Id") ON DELETE CASCADE
);

CREATE TABLE "GoodsReceivedNoteDetails" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_GoodsReceivedNoteDetails" PRIMARY KEY,
    "GoodsReceivedNoteId" TEXT NOT NULL,
    "ProductId" TEXT NOT NULL,
    "QuantityReceived" INTEGER NOT NULL,
    "QuantityOrdered" INTEGER NOT NULL,
    "UnitCost" TEXT NOT NULL,
    CONSTRAINT "FK_GoodsReceivedNoteDetails_GoodsReceivedNotes_GoodsReceivedNoteId" FOREIGN KEY ("GoodsReceivedNoteId") REFERENCES "GoodsReceivedNotes" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_GoodsReceivedNoteDetails_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE
);

CREATE TABLE "PurchaseRequests" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_PurchaseRequests" PRIMARY KEY,
    "PRNumber" TEXT NOT NULL,
    "RequestedById" TEXT NOT NULL,
    "RequestDate" TEXT NOT NULL,
    "Status" INTEGER NOT NULL,
    "TotalEstimatedAmount" TEXT NOT NULL,
    "Justification" TEXT NULL,
    "WorkflowInstanceId" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_PurchaseRequests_Employees_RequestedById" FOREIGN KEY ("RequestedById") REFERENCES "Employees" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_PurchaseRequests_WorkflowInstances_WorkflowInstanceId" FOREIGN KEY ("WorkflowInstanceId") REFERENCES "WorkflowInstances" ("Id")
);

CREATE TABLE "WorkflowActionLogs" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_WorkflowActionLogs" PRIMARY KEY,
    "WorkflowInstanceId" TEXT NOT NULL,
    "StepSequence" INTEGER NOT NULL,
    "ActionBy" TEXT NOT NULL,
    "Action" INTEGER NOT NULL,
    "Note" TEXT NULL,
    "ActionDate" TEXT NOT NULL,
    CONSTRAINT "FK_WorkflowActionLogs_WorkflowInstances_WorkflowInstanceId" FOREIGN KEY ("WorkflowInstanceId") REFERENCES "WorkflowInstances" ("Id") ON DELETE CASCADE
);

CREATE TABLE "PurchaseRequestDetails" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_PurchaseRequestDetails" PRIMARY KEY,
    "PurchaseRequestId" TEXT NOT NULL,
    "ProductId" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "EstimatedUnitPrice" TEXT NOT NULL,
    CONSTRAINT "FK_PurchaseRequestDetails_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_PurchaseRequestDetails_PurchaseRequests_PurchaseRequestId" FOREIGN KEY ("PurchaseRequestId") REFERENCES "PurchaseRequests" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_Orders_ParentOrderId" ON "Orders" ("ParentOrderId");

CREATE INDEX "IX_Accounts_ParentAccountId" ON "Accounts" ("ParentAccountId");

CREATE INDEX "IX_Appraisals_EmployeeId" ON "Appraisals" ("EmployeeId");

CREATE INDEX "IX_CustomerLedgers_CustomerId" ON "CustomerLedgers" ("CustomerId");

CREATE INDEX "IX_DamageRequests_ProductId" ON "DamageRequests" ("ProductId");

CREATE INDEX "IX_DeliveryNotes_OrderId" ON "DeliveryNotes" ("OrderId");

CREATE INDEX "IX_GoodsReceivedNoteDetails_GoodsReceivedNoteId" ON "GoodsReceivedNoteDetails" ("GoodsReceivedNoteId");

CREATE INDEX "IX_GoodsReceivedNoteDetails_ProductId" ON "GoodsReceivedNoteDetails" ("ProductId");

CREATE INDEX "IX_GoodsReceivedNotes_PurchaseOrderId" ON "GoodsReceivedNotes" ("PurchaseOrderId");

CREATE INDEX "IX_GoodsReceivedNotes_ReceivedById" ON "GoodsReceivedNotes" ("ReceivedById");

CREATE INDEX "IX_GoodsReceivedNotes_WarehouseId" ON "GoodsReceivedNotes" ("WarehouseId");

CREATE INDEX "IX_InventoryTransactions_CreatedById" ON "InventoryTransactions" ("CreatedById");

CREATE INDEX "IX_InventoryTransactions_ProductId" ON "InventoryTransactions" ("ProductId");

CREATE INDEX "IX_InventoryTransactions_WarehouseId" ON "InventoryTransactions" ("WarehouseId");

CREATE INDEX "IX_JobApplications_JobId" ON "JobApplications" ("JobId");

CREATE INDEX "IX_JournalEntryLines_AccountId" ON "JournalEntryLines" ("AccountId");

CREATE INDEX "IX_JournalEntryLines_JournalEntryId" ON "JournalEntryLines" ("JournalEntryId");

CREATE INDEX "IX_Notifications_UserId" ON "Notifications" ("UserId");

CREATE INDEX "IX_PurchaseOrderDetails_ProductId" ON "PurchaseOrderDetails" ("ProductId");

CREATE INDEX "IX_PurchaseOrderDetails_PurchaseOrderId" ON "PurchaseOrderDetails" ("PurchaseOrderId");

CREATE INDEX "IX_PurchaseOrders_SupplierId" ON "PurchaseOrders" ("SupplierId");

CREATE INDEX "IX_PurchaseRequestDetails_ProductId" ON "PurchaseRequestDetails" ("ProductId");

CREATE INDEX "IX_PurchaseRequestDetails_PurchaseRequestId" ON "PurchaseRequestDetails" ("PurchaseRequestId");

CREATE INDEX "IX_PurchaseRequests_RequestedById" ON "PurchaseRequests" ("RequestedById");

CREATE INDEX "IX_PurchaseRequests_WorkflowInstanceId" ON "PurchaseRequests" ("WorkflowInstanceId");

CREATE INDEX "IX_StockLevels_ProductId" ON "StockLevels" ("ProductId");

CREATE INDEX "IX_StockLevels_WarehouseId" ON "StockLevels" ("WarehouseId");

CREATE INDEX "IX_TimeOffRequests_ApprovedById" ON "TimeOffRequests" ("ApprovedById");

CREATE INDEX "IX_TimeOffRequests_EmployeeId" ON "TimeOffRequests" ("EmployeeId");

CREATE INDEX "IX_UserPermissions_PermissionId" ON "UserPermissions" ("PermissionId");

CREATE INDEX "IX_UserPermissions_UserId" ON "UserPermissions" ("UserId");

CREATE INDEX "IX_WorkflowActionLogs_WorkflowInstanceId" ON "WorkflowActionLogs" ("WorkflowInstanceId");

CREATE INDEX "IX_WorkflowInstances_WorkflowDefinitionId" ON "WorkflowInstances" ("WorkflowDefinitionId");

CREATE INDEX "IX_WorkflowSteps_WorkflowDefinitionId" ON "WorkflowSteps" ("WorkflowDefinitionId");

CREATE TABLE "ef_temp_Payrolls" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Payrolls" PRIMARY KEY,
    "AbsentDays" INTEGER NOT NULL,
    "BasicSalary" TEXT NOT NULL,
    "Bonus" TEXT NOT NULL,
    "Deductions" TEXT NOT NULL,
    "EmployeeId" TEXT NOT NULL,
    "IncomeTax" TEXT NOT NULL,
    "LeaveDays" INTEGER NOT NULL,
    "Month" INTEGER NOT NULL,
    "NetSalary" TEXT NOT NULL,
    "PaymentDate" TEXT NULL,
    "PresentDays" INTEGER NOT NULL,
    "Remarks" TEXT NULL,
    "SocialInsurance" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "Year" INTEGER NOT NULL,
    CONSTRAINT "FK_Payrolls_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Payrolls" ("Id", "AbsentDays", "BasicSalary", "Bonus", "Deductions", "EmployeeId", "IncomeTax", "LeaveDays", "Month", "NetSalary", "PaymentDate", "PresentDays", "Remarks", "SocialInsurance", "Status", "Year")
SELECT "Id", "AbsentDays", "BasicSalary", "Bonus", "Deductions", "EmployeeId", "IncomeTax", "LeaveDays", "Month", "NetSalary", "PaymentDate", "PresentDays", "Remarks", "SocialInsurance", "Status", "Year"
FROM "Payrolls";

CREATE TABLE "ef_temp_Employees" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Employees" PRIMARY KEY,
    "Address" TEXT NULL,
    "BasicSalary" TEXT NOT NULL,
    "Department" TEXT NOT NULL,
    "DepartmentEn" TEXT NULL,
    "Email" TEXT NULL,
    "JoiningDate" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "NameEn" TEXT NULL,
    "Phone" TEXT NULL,
    "PhotoUrl" TEXT NULL,
    "Position" TEXT NOT NULL,
    "PositionEn" TEXT NULL,
    "Status" TEXT NOT NULL
);

INSERT INTO "ef_temp_Employees" ("Id", "Address", "BasicSalary", "Department", "DepartmentEn", "Email", "JoiningDate", "Name", "NameEn", "Phone", "PhotoUrl", "Position", "PositionEn", "Status")
SELECT "Id", "Address", "BasicSalary", "Department", "DepartmentEn", "Email", "JoiningDate", "Name", "NameEn", "Phone", "PhotoUrl", "Position", "PositionEn", "Status"
FROM "Employees";

CREATE TABLE "ef_temp_Attendance" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Attendance" PRIMARY KEY,
    "Date" TEXT NOT NULL,
    "EmployeeId" TEXT NOT NULL,
    "Notes" TEXT NULL,
    "Status" TEXT NOT NULL,
    CONSTRAINT "FK_Attendance_Employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Attendance" ("Id", "Date", "EmployeeId", "Notes", "Status")
SELECT "Id", "Date", "EmployeeId", "Notes", "Status"
FROM "Attendance";

CREATE TABLE "ef_temp_Orders" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Orders" PRIMARY KEY,
    "CreatedAt" TEXT NOT NULL,
    "CustomerId" TEXT NOT NULL,
    "IsQuotation" INTEGER NOT NULL,
    "OrderDate" TEXT NOT NULL,
    "ParentOrderId" TEXT NULL,
    "QuotationNumber" TEXT NULL,
    "ReturnDate" TEXT NULL,
    "ReturnReason" TEXT NULL,
    "RowVersion" BLOB NOT NULL,
    "Status" INTEGER NOT NULL,
    "TaxAmount" TEXT NOT NULL,
    "TotalAmount" TEXT NOT NULL,
    "ValidUntil" TEXT NULL,
    CONSTRAINT "FK_Orders_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Orders_Orders_ParentOrderId" FOREIGN KEY ("ParentOrderId") REFERENCES "Orders" ("Id")
);

INSERT INTO "ef_temp_Orders" ("Id", "CreatedAt", "CustomerId", "IsQuotation", "OrderDate", "ParentOrderId", "QuotationNumber", "ReturnDate", "ReturnReason", "RowVersion", "Status", "TaxAmount", "TotalAmount", "ValidUntil")
SELECT "Id", "CreatedAt", "CustomerId", "IsQuotation", "OrderDate", "ParentOrderId", "QuotationNumber", "ReturnDate", "ReturnReason", "RowVersion", "Status", "TaxAmount", "TotalAmount", "ValidUntil"
FROM "Orders";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "Payrolls";

ALTER TABLE "ef_temp_Payrolls" RENAME TO "Payrolls";

DROP TABLE "Employees";

ALTER TABLE "ef_temp_Employees" RENAME TO "Employees";

DROP TABLE "Attendance";

ALTER TABLE "ef_temp_Attendance" RENAME TO "Attendance";

DROP TABLE "Orders";

ALTER TABLE "ef_temp_Orders" RENAME TO "Orders";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_Payrolls_EmployeeId" ON "Payrolls" ("EmployeeId");

CREATE INDEX "IX_Attendance_EmployeeId" ON "Attendance" ("EmployeeId");

CREATE INDEX "IX_Orders_CustomerId" ON "Orders" ("CustomerId");

CREATE INDEX "IX_Orders_ParentOrderId" ON "Orders" ("ParentOrderId");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260410122755_InitialCreate', '10.0.5');

