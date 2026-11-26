import sqlite3
import uuid
from datetime import datetime

db_path = 'h:/project/ERP System/Server/app.db'

permissions = [
    # Inventory
    ("View Stock Levels", "Inventory", "Can view total product quantities across all warehouses"),
    ("Report Damage", "Inventory", "Can register damaged items and deduct from stock"),
    ("Manual Adjustments", "Inventory", "Can manually correct stock quantities (increase/decrease)"),
    ("Manage Warehouses", "Inventory", "Add and edit storage location details"),
    
    # Sales
    ("Create Invoices", "Sales", "Can convert sales orders into tax invoices"),
    ("Manage Customers", "Sales", "Add and edit customer records in the system"),
    ("Issue Delivery Notes", "Sales", "Can create shipping and delivery documents"),
    
    # Accounting
    ("View Journal Ledger", "Accounting", "View detailed financial movements and journal entries"),
    ("Manage COA", "Accounting", "Can add new accounts or modify accounting structure"),
    ("View Annual Reports", "Accounting", "Access balance sheets and final financial reports"),
    ("Close Fiscal Periods", "Accounting", "Can close monthly or fiscal years and prevent edits"),
    
    # HR
    ("Manage Employee Files", "HR", "Edit personal, professional data and official documents"),
    ("Record Attendance", "HR", "Can manually log employee check-ins and check-outs"),
    ("Process Payroll", "HR", "Generate payrolls and approve monthly disbursements"),
    ("Recruitment Management", "HR", "Post job openings and track applications"),
    
    # System
    ("View Audit Logs", "Admin", "Monitor all create, delete, and edit operations in the system"),
    ("User Administration", "Admin", "Create login accounts for employees and set passwords"),
    
    # General
    ("Create Purchase Order", "Procurement", "Can request new goods from suppliers"),
    ("View Suppliers", "Procurement", "Access contact details for registered suppliers"),
    ("Approve Requests", "Procurement", "Approve purchase requests or leaves via workflow"),
    ("View Dashboard", "General", "Can view the main metrics dashboard")
]

def seed_permissions():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current permissions
        cursor.execute("SELECT Name FROM Permissions")
        existing_names = [row[0] for row in cursor.fetchall()]
        print(f"Existing permissions: {len(existing_names)}")
        
        count = 0
        now = datetime.utcnow().isoformat()
        for name, module, desc in permissions:
            if name not in existing_names:
                p_id = str(uuid.uuid4()).upper()
                cursor.execute(
                    "INSERT INTO Permissions (Id, Name, Module, Description, CreatedAt) VALUES (?, ?, ?, ?, ?)",
                    (p_id, name, module, desc, now)
                )
                count += 1
        
        conn.commit()
        print(f"Successfully added {count} new permissions.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    seed_permissions()
