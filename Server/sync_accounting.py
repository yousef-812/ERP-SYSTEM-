import sqlite3, uuid, random
from datetime import datetime, timedelta

def run_accounting_sync():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    # 1. Ensure Accounts Exist
    accounts = {
        'Inventory': ('1200', 'Inventory Asset', 'Asset'),
        'Adjustment': ('5200', 'Inventory Adjustments', 'Expense'),
        'Damage': ('5300', 'Inventory Damage Expense', 'Expense')
    }
    
    account_ids = {}
    for key, (code, name, atype) in accounts.items():
        exists = cursor.execute("SELECT Id FROM Accounts WHERE AccountCode = ?", (code,)).fetchone()
        if exists:
            account_ids[key] = exists[0]
        else:
            aid = str(uuid.uuid4()).upper()
            cursor.execute("INSERT INTO Accounts (Id, AccountCode, Name, Type, Balance, IsActive, CreatedAt, RowVersion) VALUES (?, ?, ?, ?, 0.0, 1, ?, ?)",
                           (aid, code, name, atype, datetime.utcnow().isoformat(), b'\x00'*8))
            account_ids[key] = aid

    # 2. Get Simulated Inventory Transactions
    inv_txs = cursor.execute("SELECT Id, ProductId, Type, Quantity, TransactionDate, Reference FROM InventoryTransactions WHERE Reference LIKE 'SIM-%'").fetchall()
    
    print(f"Syncing {len(inv_txs)} inventory transactions to accounting ledger...")
    
    for tx_id, p_id, tx_type, qty, dt, ref in inv_txs:
        # Get product price for valuation
        price = cursor.execute("SELECT Price FROM Products WHERE Id = ?", (p_id,)).fetchone()[0] or 100.0
        val = abs(float(qty) * float(price))
        
        if val == 0: continue

        je_id = str(uuid.uuid4()).upper()
        desc = f"Inventory {tx_type}: {ref} (Auto-sync)"
        
        # Create Journal Entry
        cursor.execute("INSERT INTO JournalEntries (Id, Reference, Date, Description, Currency, IsLocked, CreatedAt) VALUES (?, ?, ?, ?, 'EGP', 0, ?)",
                       (je_id, ref, dt, desc, datetime.utcnow().isoformat()))
        
        # Determine Debit/Credit
        # If Qty > 0 (Incoming): Debit Inventory (increase asset), Credit Adjustment (offset)
        # If Qty < 0 (Outgoing/Damage): Credit Inventory (decrease asset), Debit Expense (loss)
        
        if float(qty) > 0:
            # Debit Inventory
            cursor.execute("INSERT INTO JournalEntryLines (Id, JournalEntryId, AccountId, Debit, Credit) VALUES (?, ?, ?, ?, 0.0)",
                           (str(uuid.uuid4()).upper(), je_id, account_ids['Inventory'], val))
            # Credit Adjustment
            cursor.execute("INSERT INTO JournalEntryLines (Id, JournalEntryId, AccountId, Debit, Credit) VALUES (?, ?, ?, 0.0, ?)",
                           (str(uuid.uuid4()).upper(), je_id, account_ids['Adjustment'], val))
            # Update Balances
            cursor.execute("UPDATE Accounts SET Balance = Balance + ? WHERE Id = ?", (val, account_ids['Inventory']))
            cursor.execute("UPDATE Accounts SET Balance = Balance - ? WHERE Id = ?", (val, account_ids['Adjustment']))
        else:
            # Debit Expense (Loss/Damage/Transfer is neutral but we treat as expense for now)
            offset_key = 'Damage' if tx_type == 'Damage' else 'Adjustment'
            cursor.execute("INSERT INTO JournalEntryLines (Id, JournalEntryId, AccountId, Debit, Credit) VALUES (?, ?, ?, ?, 0.0)",
                           (str(uuid.uuid4()).upper(), je_id, account_ids[offset_key], val))
            # Credit Inventory
            cursor.execute("INSERT INTO JournalEntryLines (Id, JournalEntryId, AccountId, Debit, Credit) VALUES (?, ?, ?, 0.0, ?)",
                           (str(uuid.uuid4()).upper(), je_id, account_ids['Inventory'], val))
            # Update Balances
            cursor.execute("UPDATE Accounts SET Balance = Balance + ? WHERE Id = ?", (val, account_ids[offset_key]))
            cursor.execute("UPDATE Accounts SET Balance = Balance - ? WHERE Id = ?", (val, account_ids['Inventory']))

    conn.commit()
    conn.close()
    print("SUCCESS: Accounting ledger synced with inventory simulation.")

if __name__ == "__main__":
    run_accounting_sync()
