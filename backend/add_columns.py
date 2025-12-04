import sqlite3
import os

# Correct database path relative to this script
BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "data", "plantguard.db")

print("Using DB:", DB)

if not os.path.exists(DB):
    raise SystemExit("Database not found: " + DB)

con = sqlite3.connect(DB)
cur = con.cursor()

columns = [
    ("name", "VARCHAR(150)"),
    ("location", "VARCHAR(200)"),
    ("bio", "TEXT")
]

for col, coltype in columns:
    try:
        cur.execute(f"ALTER TABLE users ADD COLUMN {col} {coltype};")
        print(f"Added column: {col}")
    except Exception as e:
        print(f"{col} already exists or failed: {e}")

con.commit()
con.close()
print("Done.")
