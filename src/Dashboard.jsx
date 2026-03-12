import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

// ============================================================
// 🔧 CONFIGURATION — fill these in after following SETUP.md
// ============================================================
const SHEET_ID  = "1kMunUOVzf7rIChRSHFCAFcGX4ijrmrodQEh04lFeWpI";
const API_KEY   = import.meta.env.VITE_API_KEY;
const SHEET_TAB = "Net Worth data";
// ============================================================

const RANGE = `'${SHEET_TAB}'!A1:Z100`;
const SHEETS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;

// Row indices in your sheet (0-based, after header row)
const ROW_MAP = {
  assets:     0,
  cash:       2,
  taxableInv: 6,
  ira401k:    7,
  hySavings:  8,
  hsa:        9,
  useAssets:  10,
  liabilities:13,
  netWorth:   20,
};

function parseSheetData(values) {
  if (!values || values.length < 2) throw new Error("No data found in sheet");

  const headerRow = values[0];
  const dates = headerRow.slice(1).map((d) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date)
      ? d
      : date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
  }).filter(Boolean);

  const getRow = (rowIndex) => {
    const row = values[rowIndex + 1];
    if (!row) return dates.map(() => 0);
    return dates.map((_, i) => parseFloat((row[i + 1] || "0").toString().replace(/[$,]/g, "")) || 0);
  };

  return {
    dates,
    assets:     getRow(ROW_MAP.assets),
    cash:       getRow(ROW_MAP.cash),
    taxableInv: getRow(ROW_MAP.taxableInv),
    ira401k:    getRow(ROW_MAP.ira401k),
    hySavings:  getRow(ROW_MAP.hySavings),
    hsa:        getRow(ROW_MAP.hsa),
    useAssets:  getRow(ROW_MAP.useAssets),
    liabilities:getRow(ROW_MAP.liabilities),
    netWorth:   getRow(ROW_MAP.netWorth),
  };
}

const fmt = (v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
const fmtFull = (v) => `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

const PALETTE = {
  bg: "#0b0f1a", card: "#111827", border: "#1e2d45",
  accent: "#00d4aa", accentDim: "#00d4aa33",
  gold: "#f5c842", rose: "#ff6b6b", blue: "#4fa3e0",
  purple: "#a78bfa", muted: "#64748b", text: "#e2e8f0", textDim: "#94a3b8",
};
const CATEGORY_COLORS = ["#00d4aa", "#4fa3e0", "#f5c842", "#a78bfa", "#ff6b6b"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a2540", border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
      <div style={{ color: PALETTE.textDim, marginBottom: 6, fontFamily: "monospace" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ color: PALETTE.textDim }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function LoadingScreen() {
  return (
    <div style={{ background: PALETTE.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${PALETTE.border}`, borderTop: `3px solid ${PALETTE.accent}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: PALETTE.textDim, fontFamily: "sans-serif", fontSize: 14 }}>Fetching your sheet data…</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div style={{ background: PALETTE.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <p style={{ color: PALETTE.rose, fontFamily: "sans-serif", fontSize: 16, fontWeight: 600 }}>Could not load sheet data</p>
      <p style={{ color: PALETTE.textDim, fontFamily: "monospace", fontSize: 13, maxWidth: 480, textAlign: "center" }}>{message}</p>
      <button onClick={onRetry} style={{ marginTop: 8, padding: "10px 24px", background: PALETTE.accent, color: "#0b0f1a", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
        Retry
      </button>
    </div>
  );
}

export default function NetWorthDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [RAW, setRAW] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(SHEETS_URL);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      console.log("Sheet data:", json);
      console.log("Row 1 (assets):", json.values?.[1]);
      console.log("Row 21 (netWorth):", json.values?.[21]);
      const parsed = parseSheetData(json.values);
      console.log("Parsed:", parsed);
      setRAW(parsed);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={fetchData} />;
  if (!RAW) return null;

  const latest = RAW.netWorth.length - 1;
  const latestDate = RAW.dates[latest];
  const prevDate = RAW.dates[latest - 1];
  const totalGain = RAW.netWorth[latest] - RAW.netWorth[0];
  const totalGainPct = (totalGain / RAW.netWorth[0]) * 100;
  const momChange = RAW.netWorth[latest] - RAW.netWorth[latest - 1];
  const momChangePct = (momChange / RAW.netWorth[latest - 1]) * 100;

  const timelineData = RAW.dates.map((d, i) => ({
    date: d,
    "Net Worth": RAW.netWorth[i],
    "Investments": RAW.taxableInv[i] + RAW.ira401k[i] + RAW.hySavings[i] + RAW.hsa[i],
    "Cash": RAW.cash[i],
  }));

  const momData = RAW.dates.slice(1).map((d, i) => {
    const change = RAW.netWorth[i + 1] - RAW.netWorth[i];
    const pct = ((RAW.netWorth[i + 1] - RAW.netWorth[i]) / RAW.netWorth[i]) * 100;
    return { date: d, change, pct, positive: change >= 0 };
  });

  const pieData = [
    { name: "Taxable Inv.", value: RAW.taxableInv[latest] },
    { name: "401K / IRA",   value: RAW.ira401k[latest] },
    { name: "HY Savings",   value: RAW.hySavings[latest] },
    { name: "Cash",         value: RAW.cash[latest] },
    { name: "Use Assets / HSA", value: RAW.useAssets[latest] + RAW.hsa[latest] },
  ];

  const avgMoMReturn = (values, startIdx = 0) => {
    const monthly = [];
    for (let i = startIdx + 1; i < values.length; i++) {
      if (values[i - 1] !== 0) monthly.push((values[i] - values[i - 1]) / values[i - 1] * 100);
    }
    return monthly.reduce((a, b) => a + b, 0) / monthly.length;
  };

  const returnData = [
    { name: "Taxable Inv.", avgMoMPct: avgMoMReturn(RAW.taxableInv, 5), note: "Oct '24 onwards" },
    { name: "401K / IRA",   avgMoMPct: avgMoMReturn(RAW.ira401k, 0) },
    { name: "HY Savings",   avgMoMPct: avgMoMReturn(RAW.hySavings, 0) },
    { name: "HSA",          avgMoMPct: avgMoMReturn(RAW.hsa, 0) },
  ];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "mom",      label: "Monthly Δ" },
    { id: "breakdown",label: "Breakdown" },
    { id: "returns",  label: "Returns" },
  ];

  const statCards = [
    { label: "Net Worth",       value: fmtFull(RAW.netWorth[latest]),                           sub: latestDate,                                        color: PALETTE.accent  },
    { label: "Total Gain",      value: fmtFull(totalGain),                                      sub: fmtPct(totalGainPct) + ` since ${RAW.dates[0]}`,   color: PALETTE.gold    },
    { label: "Month Change",    value: fmtFull(momChange),                                      sub: fmtPct(momChangePct) + " vs " + prevDate,           color: momChange >= 0 ? PALETTE.accent : PALETTE.rose },
    { label: "Total Assets",    value: fmtFull(RAW.assets[latest]),                             sub: "No liabilities 🎉",                                color: PALETTE.blue    },
    { label: "Avg Monthly Gain",value: fmtFull(totalGain / (RAW.netWorth.length - 1)),          sub: "per month",                                        color: PALETTE.purple  },
  ];

  return (
    <div style={{ background: PALETTE.bg, minHeight: "100vh", padding: "32px 24px", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: PALETTE.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #111827; } ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 3px; }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: PALETTE.accent, boxShadow: `0 0 12px ${PALETTE.accent}` }} />
              <span style={{ color: PALETTE.textDim, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>Personal Finance</span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: -1 }}>Net Worth Dashboard</h1>
            <p style={{ color: PALETTE.textDim, marginTop: 4, fontSize: 14 }}>{RAW.dates[0]} – {latestDate} · {RAW.dates.length} months tracked</p>
          </div>
          <button onClick={fetchData} style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${PALETTE.border}`, borderRadius: 8, color: PALETTE.textDim, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            ↻ Refresh {lastUpdated && <span style={{ color: PALETTE.muted, fontSize: 11 }}>· {lastUpdated}</span>}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 32 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: 0.8 }} />
              <div style={{ color: PALETTE.textDim, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: PALETTE.muted }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: PALETTE.card, borderRadius: 12, padding: 4, border: `1px solid ${PALETTE.border}`, width: "fit-content" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.2s",
              background: activeTab === t.id ? PALETTE.accent : "transparent",
              color: activeTab === t.id ? "#0b0f1a" : PALETTE.textDim,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, padding: "28px 24px" }}>

          {activeTab === "overview" && (
            <>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, margin: "0 0 24px 0" }}>Net Worth Over Time</h2>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={timelineData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="date" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tickFormatter={fmt} tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: PALETTE.textDim, fontSize: 13, paddingTop: 16 }} />
                  <Line type="monotone" dataKey="Net Worth"   stroke={PALETTE.accent} strokeWidth={2.5} dot={{ fill: PALETTE.accent, r: 3 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Investments" stroke={PALETTE.blue}   strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="Cash"        stroke={PALETTE.gold}   strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          {activeTab === "mom" && (
            <>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, margin: "0 0 24px 0" }}>Month-over-Month Change ($)</h2>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={momData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="date" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tickFormatter={fmt} tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#1a2540", border: `1px solid ${PALETTE.border}`, borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
                        <div style={{ color: PALETTE.textDim, marginBottom: 6 }}>{label}</div>
                        <div style={{ color: d.positive ? PALETTE.accent : PALETTE.rose, fontWeight: 600 }}>{fmtFull(d.change)}</div>
                        <div style={{ color: PALETTE.textDim, fontSize: 12 }}>{fmtPct(d.pct)}</div>
                      </div>
                    );
                  }} />
                  <ReferenceLine y={0} stroke={PALETTE.muted} strokeDasharray="3 3" />
                  <Bar dataKey="change" name="Change" radius={[4, 4, 0, 0]}>
                    {momData.map((entry, index) => (
                      <Cell key={index} fill={entry.positive ? PALETTE.accent : PALETTE.rose} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {activeTab === "breakdown" && (
            <>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, margin: "0 0 24px 0" }}>Asset Breakdown — {latestDate}</h2>
              <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
                <ResponsiveContainer width={280} height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ background: "#1a2540", border: `1px solid ${PALETTE.border}`, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, minWidth: 200 }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${PALETTE.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[i] }} />
                        <span style={{ color: PALETTE.textDim, fontSize: 14 }}>{d.name}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{fmtFull(d.value)}</div>
                        <div style={{ color: PALETTE.muted, fontSize: 12 }}>{((d.value / RAW.assets[latest]) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "returns" && (
            <>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, margin: "0 0 8px 0" }}>Avg Monthly Return by Category</h2>
              <p style={{ color: PALETTE.textDim, fontSize: 13, marginBottom: 24 }}>Average month-over-month % change per investment category</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[...returnData].sort((a, b) => b.avgMoMPct - a.avgMoMPct).map((r, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div>
                        <span style={{ fontSize: 14, color: PALETTE.textDim }}>{r.name}</span>
                        {r.note && <span style={{ fontSize: 11, color: PALETTE.muted, marginLeft: 8 }}>({r.note})</span>}
                      </div>
                      <span style={{ fontWeight: 600, color: r.avgMoMPct >= 0 ? PALETTE.accent : PALETTE.rose }}>{fmtPct(r.avgMoMPct)}/mo</span>
                    </div>
                    <div style={{ background: PALETTE.border, borderRadius: 99, height: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, transition: "width 0.6s ease", background: r.avgMoMPct >= 0 ? PALETTE.accent : PALETTE.rose, width: `${Math.min(Math.abs(r.avgMoMPct) * 20, 100)}%`, opacity: 0.85 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, color: PALETTE.muted, fontSize: 12, fontStyle: "italic" }}>
                * Cash excluded. Taxable Inv. excludes May–Sep 2024 (asset reallocation period).
              </div>
              <div style={{ marginTop: 16, padding: "16px 20px", background: "#0d1625", borderRadius: 10, border: `1px solid ${PALETTE.accentDim}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: PALETTE.textDim, fontSize: 14 }}>Overall Net Worth Avg MoM</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: PALETTE.accent }}>
                    {fmtPct(RAW.netWorth.slice(1).reduce((acc, v, i) => acc + (v - RAW.netWorth[i]) / RAW.netWorth[i] * 100, 0) / (RAW.netWorth.length - 1))}/mo
                  </span>
                </div>
                <div style={{ color: PALETTE.muted, fontSize: 12, marginTop: 4 }}>Average monthly growth across all {RAW.netWorth.length - 1} months</div>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: "center", color: PALETTE.muted, fontSize: 12 }}>
          Live data from Google Sheets · Last fetched {lastUpdated}
        </div>
      </div>
    </div>
  );
}
