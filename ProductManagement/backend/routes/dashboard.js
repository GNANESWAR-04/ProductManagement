const router = require("express").Router();
const db = require("../db");

router.get("/dashboard", async (req, res, next) => {
    try {
        const [[s]] = await db.query(`
            SELECT COUNT(*) AS total_products,
                   COALESCE(SUM(price * quantity), 0) AS inventory_value,
                   COALESCE(SUM(quantity > 0 AND quantity <= reorder_level), 0) AS low_stock,
                   COALESCE(SUM(quantity = 0), 0) AS out_of_stock,
                   COALESCE(SUM(quantity > reorder_level), 0) AS in_stock
            FROM Product`);
        const [categories] = await db.query(`
            SELECT category, COUNT(*) AS products, SUM(quantity) AS units, SUM(price * quantity) AS value
            FROM Product GROUP BY category ORDER BY value DESC`);
        res.json({
            total_products: Number(s.total_products),
            inventory_value: Number(s.inventory_value),
            low_stock: Number(s.low_stock),
            out_of_stock: Number(s.out_of_stock),
            in_stock: Number(s.in_stock),
            categories: categories.map(c => ({ ...c, units: Number(c.units), value: Number(c.value) }))
        });
    } catch (e) { next(e); }
});

// GET /api/reorder?target=50  -> suggested qty = target - current quantity
router.get("/reorder", async (req, res, next) => {
    try {
        const target = req.query.target === undefined ? 50 : Number(req.query.target);
        if (!Number.isInteger(target) || target < 0) return res.status(400).json({ error: "Target stock level must be a whole number (0 or more)" });
        const [rows] = await db.query("SELECT * FROM Product WHERE quantity <= reorder_level ORDER BY quantity, p_name");
        res.json({
            target,
            products: rows.map(p => ({ ...p, suggested_quantity: Math.max(target - p.quantity, 0) }))
        });
    } catch (e) { next(e); }
});

module.exports = router;
