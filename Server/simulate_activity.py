import sqlite3, uuid, random
from datetime import datetime, timedelta

def run_simulation():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    # 1. Clean previous simulation tags
    cursor.execute("DELETE FROM InventoryTransactions WHERE Reference LIKE 'SIM-%'")
    cursor.execute("DELETE FROM DamageRequests WHERE Reason LIKE 'SIM-%'")
    
    # 2. Get data
    products = cursor.execute('SELECT Id, Name, StockQuantity FROM Products').fetchall()
    warehouses = cursor.execute('SELECT Id, Name FROM Warehouses').fetchall()
    users = [u[0] for u in cursor.execute('SELECT Id FROM Users').fetchall()]
    user_id = users[0] if users else str(uuid.uuid4()).upper()
    
    print(f"Starting simulation for {len(products)} products across {len(warehouses)} warehouses...")
    
    for p_id, p_name, p_qty in products:
        levels = cursor.execute('SELECT WarehouseId, Quantity FROM StockLevels WHERE ProductId = ?', (p_id,)).fetchall()
        if not levels: continue
        
        wh_src = levels[0][0]
        
        # --- Transfer Simulation ---
        if len(warehouses) > 1 and float(levels[0][1]) > 10:
            wh_dst = random.choice([w[0] for w in warehouses if w[0] != wh_src])
            qty_move = random.randint(2, 5)
            xfr_notes = ["Internal restructuring", "Stock balancing", "Urgent request from branch", "Seasonal reallocation"]
            note = random.choice(xfr_notes)
            dt = (datetime.utcnow() - timedelta(days=random.randint(5, 20))).isoformat()

            # Log Transfer OUT
            cursor.execute('''INSERT INTO InventoryTransactions (Id, ProductId, WarehouseId, Type, Quantity, UnitCost, TransactionDate, Reference, Note, CreatedById) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (str(uuid.uuid4()).upper(), p_id, wh_src, 'Transfer', -qty_move, 0.0, dt, 'SIM-XFR-OUT', f'Transfer to {wh_dst[:4]} - {note}', user_id))
            
            # Log Transfer IN
            cursor.execute('''INSERT INTO InventoryTransactions (Id, ProductId, WarehouseId, Type, Quantity, UnitCost, TransactionDate, Reference, Note, CreatedById) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (str(uuid.uuid4()).upper(), p_id, wh_dst, 'Transfer', qty_move, 0.0, dt, 'SIM-XFR-IN', f'Transfer from {wh_src[:4]} - {note}', user_id))
                
            # Update Levels
            cursor.execute('UPDATE StockLevels SET Quantity = Quantity - ? WHERE ProductId = ? AND WarehouseId = ?', (qty_move, p_id, wh_src))
            
            exists = cursor.execute('SELECT COUNT(*) FROM StockLevels WHERE ProductId = ? AND WarehouseId = ?', (p_id, wh_dst)).fetchone()[0]
            if exists:
                cursor.execute('UPDATE StockLevels SET Quantity = Quantity + ? WHERE ProductId = ? AND WarehouseId = ?', (qty_move, p_id, wh_dst))
            else:
                cursor.execute('INSERT INTO StockLevels (Id, ProductId, WarehouseId, Quantity) VALUES (?, ?, ?, ?)', (str(uuid.uuid4()).upper(), p_id, wh_dst, float(qty_move)))

        # --- Damage Simulation ---
        qty_dmg = random.randint(1, 2)
        dt_dmg = (datetime.utcnow() - timedelta(days=random.randint(1, 10))).isoformat()
        cursor.execute('''INSERT INTO DamageRequests (Id, RequestNumber, ProductId, Quantity, Reason, Status, DateReported) 
            VALUES (?, ?, ?, ?, ?, 'Approved', ?)''',
            (str(uuid.uuid4()).upper(), f"DMG-{random.randint(1000,9999)}", p_id, qty_dmg, f'SIM-Damage on {dt_dmg[:10]}', dt_dmg))
        
        cursor.execute('''INSERT INTO InventoryTransactions (Id, ProductId, WarehouseId, Type, Quantity, UnitCost, TransactionDate, Reference, Note, CreatedById) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (str(uuid.uuid4()).upper(), p_id, wh_src, 'Damage', -qty_dmg, 0.0, dt_dmg, 'SIM-DMG', 'Simulated damage report', user_id))
        
        cursor.execute('UPDATE StockLevels SET Quantity = Quantity - ? WHERE ProductId = ? AND WarehouseId = ?', (qty_dmg, p_id, wh_src))

        # --- Adjustment Simulation ---
        adj = random.choice([-2, 2])
        dt_adj = (datetime.utcnow() - timedelta(days=random.randint(0, 2))).isoformat()
        cursor.execute('''INSERT INTO InventoryTransactions (Id, ProductId, WarehouseId, Type, Quantity, UnitCost, TransactionDate, Reference, Note, CreatedById) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (str(uuid.uuid4()).upper(), p_id, wh_src, 'Adjustment', adj, 0.0, dt_adj, 'SIM-ADJ', 'Manual correction simulation', user_id))
        cursor.execute('UPDATE StockLevels SET Quantity = Quantity + ? WHERE ProductId = ? AND WarehouseId = ?', (adj, p_id, wh_src))

    # --- FINAL RECONCILIATION ---
    for prod_id in [r[0] for r in cursor.execute('SELECT Id FROM Products').fetchall()]:
        total_qty = cursor.execute('SELECT SUM(Quantity) FROM StockLevels WHERE ProductId = ?', (prod_id,)).fetchone()[0] or 0
        cursor.execute('UPDATE Products SET StockQuantity = ? WHERE Id = ?', (int(total_qty), prod_id))

    conn.commit()
    conn.close()
    print("SUCCESS: Simulation complete.")

if __name__ == "__main__":
    run_simulation()
