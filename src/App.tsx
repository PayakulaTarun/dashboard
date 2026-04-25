import { useEffect, useState } from "react";
import "./App.css";
import { shopifyConfig } from "./config";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

/* ---------- constants ---------- */
const API_BASE = shopifyConfig.apiBase; // "/api/shopify" (Vercel Serverless Function)

/* ---------- types ---------- */
interface ShopInfo {
  name: string;
  domain: string;
  email: string;
  currency: string;
  country_name: string;
}

interface Product {
  id: number;
  title: string;
  status: string;
  product_type: string;
  variants: { inventory_quantity: number; price: string }[];
  image?: { src: string };
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  orders_count: number;
  total_spent: string;
}

interface Order {
  id: number;
  order_number: number;
  email: string;
  total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  line_items: { title: string; quantity: number; price: string }[];
}

/* ---------- helpers ---------- */
const fmt = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

async function shopifyGet(path: string) {
  const resp = await fetch(`${API_BASE}?path=${encodeURIComponent(path)}`);
  if (!resp.ok) throw new Error(`Shopify API error ${resp.status} for ${path}`);
  const json = await resp.json();
  return json[Object.keys(json)[0]];
}

async function shopifyGetAll(path: string): Promise<any[]> {
  const all: any[] = [];
  const initialPath = `${path}${path.includes("?") ? "&" : "?"}limit=250`;
  let url = `${API_BASE}?path=${encodeURIComponent(initialPath)}`;
  
  while (url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Shopify API error ${resp.status}`);
    const json = await resp.json();
    const key = Object.keys(json)[0];
    all.push(...(json[key] ?? []));
    
    const link = resp.headers.get("Link");
    if (link && link.includes('rel="next"')) {
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      if (m) {
        const nextFull = m[1]; // e.g. https://.../admin/api/2024-07/products.json?page_info=...
        // Extract the part after /admin/api/2024-07/
        const apiPathMatch = nextFull.match(/\/admin\/api\/[^/]+\/(.*)/);
        if (apiPathMatch && apiPathMatch[1]) {
           url = `${API_BASE}?path=${encodeURIComponent(apiPathMatch[1])}`;
        } else {
           url = "";
        }
      } else {
        url = "";
      }
    } else {
      url = "";
    }
  }
  return all;
}

const chartDefaults = {
  responsive: true,
  plugins: { legend: { labels: { color: "#cdd6f4" } } },
  scales: {
    x: { ticks: { color: "#a6adc8" }, grid: { color: "rgba(255,255,255,0.06)" } },
    y: { beginAtZero: true as const, ticks: { color: "#a6adc8" }, grid: { color: "rgba(255,255,255,0.06)" } },
  },
};

/* ---------- main component ---------- */
export default function App() {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "products" | "orders" | "customers">("overview");

  useEffect(() => {
    (async () => {
      try {
        const [sh, pr, cu, or] = await Promise.all([
          shopifyGet("shop.json"),
          shopifyGetAll("products.json"),
          shopifyGetAll("customers.json"),
          shopifyGetAll("orders.json?status=any"),
        ]);
        setShop(sh);
        setProducts(pr);
        setCustomers(cu);
        setOrders(or);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- derived ---------- */
  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;

  const monthMap: Record<string, { orders: number; revenue: number }> = {};
  orders.forEach((o) => {
    const d = new Date(o.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[k]) monthMap[k] = { orders: 0, revenue: 0 };
    monthMap[k].orders++;
    monthMap[k].revenue += parseFloat(o.total_price || "0");
  });
  const months = Object.keys(monthMap).sort();

  const statusCount: Record<string, number> = {};
  orders.forEach((o) => {
    const s = o.financial_status || "unknown";
    statusCount[s] = (statusCount[s] || 0) + 1;
  });

  const topCustomers = [...customers]
    .sort((a, b) => parseFloat(b.total_spent) - parseFloat(a.total_spent))
    .slice(0, 5);

  /* ---------- loading/error ---------- */
  if (loading)
    return (
      <div className="splash">
        <div className="spinner" />
        <p>Loading store data…</p>
      </div>
    );

  if (error)
    return (
      <div className="splash error">
        <p>⚠️ {error}</p>
        <small>Check your Admin API token or Vite proxy config in <code>vite.config.ts</code></small>
      </div>
    );

  /* ---------- UI ---------- */
  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">🛍️ Basant Kothi</div>
        <nav>
          {(["overview", "products", "orders", "customers"] as const).map((t) => (
            <button
              key={t}
              className={`nav-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "overview" && "📊 "}
              {t === "products" && "📦 "}
              {t === "orders" && "🧾 "}
              {t === "customers" && "👥 "}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>{shop?.domain}</small>
          <small>Currency: {shop?.currency}</small>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <div>
            <h1>{shop?.name}</h1>
            <p>{shop?.email} · {shop?.country_name}</p>
          </div>
          <span className="badge green">● Live</span>
        </header>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <section className="content">
            <div className="cards-row">
              {[
                { icon: "📦", label: "Products", value: fmt(products.length) },
                { icon: "👥", label: "Customers", value: fmt(customers.length) },
                { icon: "🧾", label: "Orders", value: fmt(orders.length) },
                { icon: "💰", label: "Total Revenue", value: `$${fmt(totalRevenue, 2)}` },
                { icon: "📈", label: "Avg. Order", value: `$${fmt(avgOrder, 2)}` },
              ].map((kpi) => (
                <div className="card kpi" key={kpi.label}>
                  <span className="kpi-icon">{kpi.icon}</span>
                  <div>
                    <p className="kpi-label">{kpi.label}</p>
                    <p className="kpi-value">{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="charts-row">
              <div className="card chart-card">
                <h2>Orders per Month</h2>
                <Bar
                  data={{
                    labels: months,
                    datasets: [{
                      label: "Orders",
                      data: months.map((m) => monthMap[m].orders),
                      backgroundColor: "rgba(137,180,250,0.7)",
                      borderColor: "rgba(137,180,250,1)",
                      borderRadius: 6,
                    }],
                  }}
                  options={chartDefaults}
                />
              </div>
              <div className="card chart-card">
                <h2>Revenue per Month</h2>
                <Line
                  data={{
                    labels: months,
                    datasets: [{
                      label: "Revenue ($)",
                      data: months.map((m) => monthMap[m].revenue),
                      fill: true,
                      backgroundColor: "rgba(243,139,168,0.15)",
                      borderColor: "rgba(243,139,168,1)",
                      tension: 0.4,
                      pointBackgroundColor: "rgba(243,139,168,1)",
                    }],
                  }}
                  options={chartDefaults}
                />
              </div>
            </div>

            <div className="charts-row">
              <div className="card chart-card small">
                <h2>Order Status Breakdown</h2>
                <Doughnut
                  data={{
                    labels: Object.keys(statusCount),
                    datasets: [{
                      data: Object.values(statusCount),
                      backgroundColor: [
                        "rgba(166,227,161,0.85)",
                        "rgba(137,180,250,0.85)",
                        "rgba(243,139,168,0.85)",
                        "rgba(249,226,175,0.85)",
                        "rgba(203,166,247,0.85)",
                      ],
                      borderWidth: 0,
                    }],
                  }}
                  options={{ responsive: true, plugins: { legend: { labels: { color: "#cdd6f4" } } } }}
                />
              </div>
              <div className="card chart-card small">
                <h2>Top Customers by Spend</h2>
                <table className="mini-table">
                  <thead>
                    <tr><th>Name</th><th>Orders</th><th>Spent</th></tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c) => (
                      <tr key={c.id}>
                        <td>{c.first_name} {c.last_name}</td>
                        <td>{c.orders_count}</td>
                        <td>${fmt(parseFloat(c.total_spent), 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* PRODUCTS */}
        {tab === "products" && (
          <section className="content">
            <h2 className="tab-title">All Products ({products.length})</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Image</th><th>Title</th><th>Type</th>
                    <th>Status</th><th>Variants</th><th>Inventory</th><th>Price (from)</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.image?.src
                          ? <img src={p.image.src} alt={p.title} className="product-thumb" />
                          : <span className="no-img">–</span>}
                      </td>
                      <td>{p.title}</td>
                      <td>{p.product_type || "–"}</td>
                      <td><span className={`badge ${p.status === "active" ? "green" : "gray"}`}>{p.status}</span></td>
                      <td>{p.variants.length}</td>
                      <td>{p.variants.reduce((s, v) => s + (v.inventory_quantity || 0), 0)}</td>
                      <td>${Math.min(...p.variants.map((v) => parseFloat(v.price || "0")))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <section className="content">
            <h2 className="tab-title">All Orders ({orders.length})</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Email</th><th>Date</th>
                    <th>Financial</th><th>Fulfillment</th><th>Items</th><th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.order_number}</td>
                      <td>{o.email}</td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td><span className={`badge ${o.financial_status === "paid" ? "green" : "orange"}`}>{o.financial_status}</span></td>
                      <td><span className={`badge ${o.fulfillment_status === "fulfilled" ? "green" : "gray"}`}>{o.fulfillment_status ?? "unfulfilled"}</span></td>
                      <td>{o.line_items.length}</td>
                      <td>${fmt(parseFloat(o.total_price), 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* CUSTOMERS */}
        {tab === "customers" && (
          <section className="content">
            <h2 className="tab-title">All Customers ({customers.length})</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Orders</th><th>Total Spent</th></tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>{c.first_name} {c.last_name}</td>
                      <td>{c.email}</td>
                      <td>{c.orders_count}</td>
                      <td>${fmt(parseFloat(c.total_spent), 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
