# ERP System

A full-stack ERP for small and mid-size trading companies: sales, inventory, procurement, accounting, HR and payroll in one web app. Arabic and English UI (RTL supported).

## Modules
- **Sales:** orders, invoices, delivery notes, customers, returns
- **Inventory:** products with barcode scanning, multiple warehouses, stock adjustments, warehouse transfers, damage requests, stock history
- **Procurement:** suppliers, purchase requests, purchase orders, goods received notes
- **Accounting:** chart of accounts, ledger, profit and loss, annual report, year-end closing, tax handling, e-invoice provider interface (ZATCA)
- **HR:** employees, attendance, time off, recruitment, appraisals, payroll with deductions
- **Admin:** role and permission management, audit logs, notifications, document storage, OCR scanner

## Tech stack
- **Server:** ASP.NET Core (.NET 10), Entity Framework Core with SQLite, JWT authentication, BCrypt password hashing, permission-based authorization, background worker, Excel export (ClosedXML)
- **Client:** React 19, Vite, Redux Toolkit, Material UI, i18next, Recharts

## Run locally
```bash
# Server
cd Server
cp .env.example .env   # set ADMIN_USERNAME and ADMIN_PASSWORD; set your own JwtSettings:Secret in appsettings.json
dotnet run

# Client
cd Client
npm install
npm run dev
```

## Docs
See `ERP_Usage_Guide.md` (Arabic) for the recommended order of operations after setup.

## Author
Yousef Yousry
