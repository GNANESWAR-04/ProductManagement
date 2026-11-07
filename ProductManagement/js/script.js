const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function api(path, opts = {}) {
    const r = await fetch("/api" + path, {
        ...opts, headers: { "Content-Type": "application/json" },
        body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
}

function toast(msg, type = "success") {
    const el = document.createElement("div");
    el.className = "t " + type; el.textContent = msg;
    $("#toast").append(el); setTimeout(() => el.remove(), 4000);
}

function status(p) {
    if (p.quantity === 0) return ["OUT OF STOCK", "out"];
    if (p.quantity <= p.reorder_level) return ["REORDER REQUIRED", "low"];
    return ["IN STOCK", "ok"];
}
const badge = p => { const [t, c] = status(p); return `<span class="badge ${c}">${t}</span>`; };
const stat = (l, v, c = "") => `<div class="card stat ${c}"><div class="lbl">${l}</div><div class="val">${v}</div></div>`;
const table = (heads, rows) => `<div class="tbl"><table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table></div>`;

// ---------- Layout ----------
const NAV = [["index", "Dashboard"], ["products", "Products"], ["add-product", "Add Product"],
    ["sales", "Record Sale"], ["reorder", "Reorder"], ["stock-report", "Stock Report"]];
const page = document.body.dataset.page;
document.body.innerHTML = `
<aside id="side"><div class="logo">📦 StockPilot</div>
${NAV.map(([k, t]) => `<a href="${k}.html" class="${k === page || (page === "update-product" && k === "products") ? "on" : ""}">${t}</a>`).join("")}</aside>
<div class="wrap"><header class="top"><button id="menu" aria-label="Menu">☰</button>
<h1>${document.body.dataset.title}</h1><span class="sp"></span><span class="user">Inventory Admin</span></header>
<main id="c"></main></div><div id="toast"></div>`;
$("#menu").onclick = () => $("#side").classList.toggle("open");
const C = $("#c");

// ---------- Shared product form ----------
function productForm(p = {}, label = "Save Product") {
    const v = k => esc(p[k] ?? "");
    return `<form id="pf" class="card fcard" novalidate>
    <div class="f"><label for="p_name">Product name</label><input id="p_name" maxlength="100" value="${v("p_name")}"><div class="err"></div></div>
    <div class="f"><label for="category">Category</label><input id="category" maxlength="50" value="${v("category")}"><div class="err"></div></div>
    <div class="fg">
    <div class="f"><label for="price">Price (₹)</label><input id="price" type="number" step="0.01" min="0" value="${v("price")}"><div class="err"></div></div>
    <div class="f"><label for="quantity">Quantity in stock</label><input id="quantity" type="number" step="1" min="0" value="${p.quantity ?? 0}"><div class="err"></div></div></div>
    <div class="f"><label for="reorder_level">Reorder level</label><input id="reorder_level" type="number" step="1" min="0" value="${p.reorder_level ?? 5}"><small>Product is flagged for reorder when quantity reaches this level.</small><div class="err"></div></div>
    <button class="btn">${label}</button> <a class="btn sec" href="products.html">Cancel</a></form>`;
}
function readForm() {
    const g = id => $("#" + id).value.trim(), errs = {};
    const price = g("price"), qty = g("quantity"), lvl = g("reorder_level");
    if (!g("p_name")) errs.p_name = "Product name is required";
    if (!g("category")) errs.category = "Category is required";
    if (price === "" || isNaN(price) || +price < 0) errs.price = "Enter a valid price (0 or more)";
    if (qty === "" || !/^\d+$/.test(qty)) errs.quantity = "Enter a whole number (0 or more)";
    if (lvl === "" || !/^\d+$/.test(lvl)) errs.reorder_level = "Enter a whole number (0 or more)";
    document.querySelectorAll("#pf .f").forEach(f => {
        const i = f.querySelector("input"); f.querySelector(".err").textContent = errs[i.id] || "";
    });
    return Object.keys(errs).length ? null :
        { p_name: g("p_name"), category: g("category"), price: +price, quantity: +qty, reorder_level: +lvl };
}

const pages = {
    async index() {
        const [d, r] = await Promise.all([api("/dashboard"), api("/reorder")]);
        C.innerHTML = `<div class="cards">${stat("Total products", d.total_products)}
        ${stat("Inventory value", money(d.inventory_value), "ok")}${stat("Low-stock products", d.low_stock, "low")}
        ${stat("Out-of-stock products", d.out_of_stock, "out")}</div>
        <div class="card"><h2>Needs attention</h2>${table("<th>Product</th><th>Category</th><th class='r'>Qty</th><th>Status</th>",
            r.products.slice(0, 8).map(p => `<tr><td>${esc(p.p_name)}</td><td>${esc(p.category)}</td><td class="r">${p.quantity}</td><td>${badge(p)}</td></tr>`).join("")
            || `<tr><td colspan="4" class="empty">All products are sufficiently stocked 🎉</td></tr>`)}</div>`;
    },

    async products() {
        let data = await api("/products"), sort = { k: "p_id", d: 1 };
        C.innerHTML = `<div class="card"><div class="tools">
        <input type="search" id="q" placeholder="Search by name or category…">
        <select id="fs"><option value="">All statuses</option><option value="in">In stock</option><option value="low">Reorder required</option><option value="out">Out of stock</option></select>
        <a class="btn" href="add-product.html">+ Add product</a></div><div id="t"></div></div>`;
        const cols = [["p_id", "ID"], ["p_name", "Name"], ["category", "Category"], ["price", "Price", 1], ["quantity", "Qty", 1], ["reorder_level", "Reorder lvl", 1]];
        const draw = () => {
            const q = $("#q").value.toLowerCase(), fs = $("#fs").value;
            const rows = data.filter(p => (p.p_name + " " + p.category).toLowerCase().includes(q) &&
                (!fs || { in: "ok", low: "low", out: "out" }[fs] === status(p)[1]))
                .sort((a, b) => {
                    const x = a[sort.k], y = b[sort.k];
                    return (isNaN(x) || isNaN(y) ? String(x).localeCompare(String(y)) : x - y) * sort.d;
                });
            $("#t").innerHTML = table(
                cols.map(([k, t, r]) => `<th class="s ${r ? "r" : ""}" data-k="${k}">${t}${sort.k === k ? (sort.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("") + "<th>Status</th><th></th>",
                rows.map(p => `<tr><td>${p.p_id}</td><td>${esc(p.p_name)}</td><td>${esc(p.category)}</td><td class="r">${money(p.price)}</td>
                <td class="r">${p.quantity}</td><td class="r">${p.reorder_level}</td><td>${badge(p)}</td>
                <td><a class="btn sm sec" href="update-product.html?id=${p.p_id}">Edit</a> <button class="btn sm del" data-del="${p.p_id}">Delete</button></td></tr>`).join("")
                || `<tr><td colspan="8" class="empty">No products found</td></tr>`);
        };
        C.onclick = async e => {
            const th = e.target.closest("th.s"), del = e.target.dataset.del;
            if (th) { sort = { k: th.dataset.k, d: sort.k === th.dataset.k ? -sort.d : 1 }; draw(); }
            if (del && confirm("Delete this product permanently?")) {
                try { toast((await api("/products/" + del, { method: "DELETE" })).message); data = data.filter(p => p.p_id != del); draw(); }
                catch (err) { toast(err.message, "error"); }
            }
        };
        $("#q").oninput = draw; $("#fs").onchange = draw; draw();
    },

    "add-product"() {
        C.innerHTML = productForm({}, "Add Product");
        $("#pf").onsubmit = async e => {
            e.preventDefault(); const b = readForm(); if (!b) return;
            try { toast((await api("/products", { method: "POST", body: b })).message); e.target.reset(); }
            catch (err) { toast(err.message, "error"); }
        };
    },

    async "update-product"() {
        const id = new URLSearchParams(location.search).get("id");
        if (!id) { C.innerHTML = `<div class="card">No product selected. <a href="products.html">Choose one from the product list.</a></div>`; return; }
        let p; try { p = await api("/products/" + id); } catch (err) { C.innerHTML = `<div class="card err">${esc(err.message)}</div>`; return; }
        C.innerHTML = productForm(p, "Update Product");
        $("#pf").onsubmit = async e => {
            e.preventDefault(); const b = readForm(); if (!b) return;
            try { toast((await api("/products/" + id, { method: "PUT", body: b })).message); }
            catch (err) { toast(err.message, "error"); }
        };
    },

    async sales() {
        let list = await api("/products");
        const opts = () => `<option value="">Select a product…</option>` + list.map(p =>
            `<option value="${p.p_id}" ${p.quantity === 0 ? "disabled" : ""}>${esc(p.p_name)} — ${p.quantity} in stock</option>`).join("");
        C.innerHTML = `<form id="sf" class="card fcard" novalidate>
        <div class="f"><label for="sp">Product</label><select id="sp">${opts()}</select></div>
        <div class="f"><label for="sq">Quantity sold</label><input id="sq" type="number" min="1" step="1" value="1"><div class="err" id="se"></div></div>
        <div id="info" class="f"></div><button class="btn">Record Sale</button></form>`;
        $("#sp").onchange = () => {
            const p = list.find(x => x.p_id == $("#sp").value);
            $("#info").innerHTML = p ? `${badge(p)} &nbsp; Price: ${money(p.price)}` : "";
        };
        $("#sf").onsubmit = async e => {
            e.preventDefault(); const id = $("#sp").value, q = $("#sq").value.trim(), p = list.find(x => x.p_id == id);
            $("#se").textContent = "";
            if (!id) return toast("Please select a product", "error");
            if (!/^\d+$/.test(q) || +q < 1) return ($("#se").textContent = "Enter a whole number of at least 1");
            if (+q > p.quantity) return ($("#se").textContent = `Only ${p.quantity} available`);
            try {
                toast((await api("/sales", { method: "POST", body: { p_id: +id, quantity: +q } })).message);
                list = await api("/products"); $("#sp").innerHTML = opts(); $("#info").innerHTML = ""; $("#sq").value = 1;
            } catch (err) { toast(err.message, "error"); list = await api("/products"); $("#sp").innerHTML = opts(); }
        };
    },

    async reorder() {
        C.innerHTML = `<div class="card"><div class="tools"><label for="tg" style="margin:0;align-self:center">Target stock level</label>
        <input id="tg" type="number" min="0" step="1" value="50" style="width:110px"><span id="msg" class="err" style="align-self:center"></span></div><div id="t"></div></div>`;
        const load = async () => {
            const t = $("#tg").value.trim();
            if (!/^\d+$/.test(t)) return ($("#msg").textContent = "Enter a whole number (0 or more)");
            $("#msg").textContent = "";
            const r = await api("/reorder?target=" + t);
            $("#t").innerHTML = table("<th>Product</th><th>Category</th><th class='r'>Qty</th><th class='r'>Reorder lvl</th><th>Status</th><th class='r'>Suggested restock</th>",
                r.products.map(p => `<tr><td>${esc(p.p_name)}</td><td>${esc(p.category)}</td><td class="r">${p.quantity}</td><td class="r">${p.reorder_level}</td>
                <td>${badge(p)}</td><td class="r"><b>${p.suggested_quantity}</b></td></tr>`).join("")
                || `<tr><td colspan="6" class="empty">No products need restocking</td></tr>`);
        };
        $("#tg").oninput = load; load();
    },

    async "stock-report"() {
        const [d, list] = await Promise.all([api("/dashboard"), api("/products")]);
        C.innerHTML = `<div class="cards">${stat("In stock", d.in_stock, "ok")}${stat("Reorder required", d.low_stock, "low")}
        ${stat("Out of stock", d.out_of_stock, "out")}${stat("Total value", money(d.inventory_value))}</div>
        <div class="card" style="margin-bottom:24px"><h2>By category</h2>${table("<th>Category</th><th class='r'>Products</th><th class='r'>Units</th><th class='r'>Value</th>",
            d.categories.map(c => `<tr><td>${esc(c.category)}</td><td class="r">${c.products}</td><td class="r">${c.units}</td><td class="r">${money(c.value)}</td></tr>`).join("")
            || `<tr><td colspan="4" class="empty">No data</td></tr>`)}</div>
        <div class="card"><h2>Full stock report</h2>${table("<th>Product</th><th>Category</th><th class='r'>Price</th><th class='r'>Qty</th><th class='r'>Value</th><th>Status</th>",
            list.map(p => `<tr><td>${esc(p.p_name)}</td><td>${esc(p.category)}</td><td class="r">${money(p.price)}</td><td class="r">${p.quantity}</td>
            <td class="r">${money(p.price * p.quantity)}</td><td>${badge(p)}</td></tr>`).join("")
            || `<tr><td colspan="6" class="empty">No products</td></tr>`)}</div>`;
    }
};

Promise.resolve(pages[page]()).catch(err => { C.innerHTML = `<div class="card err">Could not load data: ${esc(err.message)}</div>`; });
