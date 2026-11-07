const router = require("express").Router();
const db = require("../db");

const num = (x) => (x === "" || x == null ? NaN : Number(x));

// POST /api/sales  { p_id, quantity }
router.post("/", async (req, res, next) => {
    const id = num(req.body.p_id), qty = num(req.body.quantity);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Select a valid product" });
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: "Quantity sold must be a whole number of at least 1" });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        // FOR UPDATE locks the row so concurrent sales cannot oversell
        const [rows] = await conn.query("SELECT p_name, quantity FROM Product WHERE p_id = ? FOR UPDATE", [id]);
        if (!rows.length) {
            await conn.rollback();
            return res.status(404).json({ error: "Product not found" });
        }
        const p = rows[0];
        if (qty > p.quantity) {
            await conn.rollback();
            return res.status(400).json({ error: `Insufficient stock: only ${p.quantity} of "${p.p_name}" available` });
        }
        await conn.query("UPDATE Product SET quantity = quantity - ? WHERE p_id = ?", [qty, id]);
        await conn.commit();
        res.json({ message: `Sold ${qty} x ${p.p_name}. Remaining stock: ${p.quantity - qty}`, remaining: p.quantity - qty });
    } catch (e) {
        await conn.rollback().catch(() => {});
        next(e);
    } finally {
        conn.release();
    }
});

module.exports = router;
