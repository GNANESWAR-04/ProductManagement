const router = require("express").Router();
const db = require("../db");

const num = (x) => (x === "" || x == null ? NaN : Number(x));

function validate(b = {}) {
    const errors = [];
    const name = String(b.p_name ?? "").trim();
    const cat = String(b.category ?? "").trim();
    const price = num(b.price), qty = num(b.quantity), lvl = num(b.reorder_level);
    if (!name || name.length > 100) errors.push("Product name is required (max 100 characters)");
    if (!cat || cat.length > 50) errors.push("Category is required (max 50 characters)");
    if (!isFinite(price) || price < 0 || price > 99999999.99) errors.push("Price must be a non-negative number");
    if (!Number.isInteger(qty) || qty < 0) errors.push("Quantity must be a whole number (0 or more)");
    if (!Number.isInteger(lvl) || lvl < 0) errors.push("Reorder level must be a whole number (0 or more)");
    return { errors, values: [name, cat, price, qty, lvl] };
}

const validId = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

// GET all (optional ?q= search by name or category)
router.get("/", async (req, res, next) => {
    try {
        const q = String(req.query.q || "").trim();
        const [rows] = q
            ? await db.query("SELECT * FROM Product WHERE p_name LIKE ? OR category LIKE ? ORDER BY p_id", [`%${q}%`, `%${q}%`])
            : await db.query("SELECT * FROM Product ORDER BY p_id");
        res.json(rows);
    } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
    try {
        if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid product id" });
        const [rows] = await db.query("SELECT * FROM Product WHERE p_id = ?", [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: "Product not found" });
        res.json(rows[0]);
    } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
    try {
        const { errors, values } = validate(req.body);
        if (errors.length) return res.status(400).json({ error: errors.join("; ") });
        const [r] = await db.query(
            "INSERT INTO Product (p_name, category, price, quantity, reorder_level) VALUES (?, ?, ?, ?, ?)", values);
        res.status(201).json({ message: "Product added successfully", p_id: r.insertId });
    } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
    try {
        if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid product id" });
        const { errors, values } = validate(req.body);
        if (errors.length) return res.status(400).json({ error: errors.join("; ") });
        const [r] = await db.query(
            "UPDATE Product SET p_name=?, category=?, price=?, quantity=?, reorder_level=? WHERE p_id=?",
            [...values, req.params.id]);
        if (!r.affectedRows) return res.status(404).json({ error: "Product not found" });
        res.json({ message: "Product updated successfully" });
    } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
    try {
        if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid product id" });
        const [r] = await db.query("DELETE FROM Product WHERE p_id = ?", [req.params.id]);
        if (!r.affectedRows) return res.status(404).json({ error: "Product not found" });
        res.json({ message: "Product deleted successfully" });
    } catch (e) { next(e); }
});

module.exports = router;
