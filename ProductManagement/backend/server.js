const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

app.use("/api/products", require("./routes/products"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api", require("./routes/dashboard")); // /api/dashboard, /api/reorder

// Serve the frontend (project root) but never expose backend source
app.use("/backend", (req, res) => res.sendStatus(404));
app.use(express.static(path.join(__dirname, "..")));

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
