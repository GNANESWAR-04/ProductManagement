# Product Management (Inventory)

## Setup
1. Create the database: `mysql -u root -p < backend/schema.sql`
2. `cd backend && npm install`
3. Start with your MySQL credentials (never hard-code passwords):
   - Linux/macOS: `DB_PASSWORD=yourpassword npm start`
   - Windows (PowerShell): `$env:DB_PASSWORD="yourpassword"; npm start`
4. Open http://localhost:3000

Optional env vars: `DB_HOST`, `DB_USER`, `DB_NAME`, `PORT`.

## Notes
- Status: quantity 0 = OUT OF STOCK; <= reorder level = REORDER REQUIRED; otherwise IN STOCK.
- Reorder page suggests `target - current quantity`; the target level is editable on the page (default 50). No supplier orders are created.
- Sales run in a transaction with `SELECT ... FOR UPDATE`, so concurrent sales cannot oversell.
