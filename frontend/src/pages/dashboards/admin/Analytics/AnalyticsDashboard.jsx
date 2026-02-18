import { useEffect, useState } from "react";
import { 
  FaChartBar, FaUsers, FaMousePointer, FaLayerGroup, 
  FaCalendarAlt, FaHistory, FaArrowUp, FaInfoCircle 
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../../api/api";

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [dau, setDau] = useState([]);
  const [loading, setLoading] = useState(true);

  const colors = {
    primary: "#6f42c1",
    primaryLight: "#f3e8ff",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    card: "#ffffff",
    accent: "#6366f1"
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [oRes, dRes] = await Promise.all([
          api.get("/analytics/overview"),
          api.get("/analytics/dau?days=14"),
        ]);
        setOverview(oRes.data);
        setDau(dRes.data?.dau || []);
      } catch (e) {
        console.error("analytics dashboard error:", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
      <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
    </div>
  );

  if (!overview?.success) return (
    <div className="container mt-5 pt-5 text-center">
      <FaInfoCircle size={40} className="text-muted mb-3" />
      <h5 className="text-muted">No analytics data found for this period.</h5>
    </div>
  );

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header Section */}
        <header className="row g-4 mb-4 align-items-center">
          <div className="col-12 col-md-7 text-start">
            <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-1px" }}>
              Analytics Dashboard
            </h2>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontWeight: 500 }}>
              Global platform activity and student interaction metrics.
            </p>
          </div>
          <div className="col-12 col-md-5 text-md-end">
            <div className="badge rounded-pill border px-3 py-2 bg-white text-muted shadow-sm d-inline-flex align-items-center gap-2">
              <FaCalendarAlt className="text-primary" />
              {new Date(overview.range.from).toLocaleDateString()} — {new Date(overview.range.to).toLocaleDateString()}
            </div>
          </div>
        </header>

        {/* Top Level Stats */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard icon={<FaChartBar />} label="Total Events" value={overview.totalEvents} color={colors.primary} />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard icon={<FaUsers />} label="Unique Users" value={overview.uniqueUsers} color={colors.accent} />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard icon={<FaMousePointer />} label="Avg Daily Events" value={Math.round(overview.totalEvents / 30)} color="#10b981" />
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <StatCard icon={<FaHistory />} label="Range (Days)" value="30" color="#f59e0b" />
          </div>
        </div>

        <div className="row g-4">
          {/* Top Events Feed */}
          <div className="col-lg-6">
            <ListCard title="Top Events" icon={<FaLayerGroup />} items={overview.eventBreakdown} />
          </div>

          {/* Top Pages Feed */}
          <div className="col-lg-6">
            <ListCard title="Top Pages" icon={<FaChartBar />} items={overview.topPages} />
          </div>

          {/* DAU Trend Table */}
          <div className="col-12">
            <div style={{
              background: colors.card, border: `1px solid ${colors.border}`,
              borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)"
            }}>
              <div style={{ padding: "24px", borderBottom: `1px solid ${colors.border}` }} className="d-flex align-items-center gap-2">
                <FaUsers className="text-primary" />
                <h5 className="m-0 fw-bold">Daily Active Users (14d)</h5>
              </div>

              <div className="table-responsive">
                {dau.length === 0 ? <EmptyState text="No DAU data available." /> : (
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: "#fcfcfd" }}>
                      <tr style={{ color: colors.textMuted, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                        <th className="ps-4 py-4">Timeline</th>
                        <th className="text-center">Unique Users (DAU)</th>
                        <th className="text-center">Total Interaction Events</th>
                        <th className="pe-4 text-end">Retention Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dau.map((d, idx) => (
                        <tr key={d.date}>
                          <td className="ps-4 fw-semibold text-dark">{d.date}</td>
                          <td className="text-center">
                            <span className="badge rounded-pill bg-light text-primary border px-3 py-2 fw-bold">
                              {d.dau} Users
                            </span>
                          </td>
                          <td className="text-center fw-bold text-dark">{d.events}</td>
                          <td className="pe-4 text-end">
                            <div className="d-flex align-items-center justify-content-end gap-2 text-success small fw-bold">
                              <FaArrowUp size={10} /> {Math.round((d.events / (d.dau || 1)))} events/user
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ padding: "20px 24px", background: "#f8f9fa", borderTop: `1px solid ${colors.border}` }}>
                <div className="d-flex align-items-center justify-content-start gap-2 text-muted text-start" style={{ fontSize: "12px" }}>
                  <FaInfoCircle />
                  <span>DAU tracks unique userId sessions. Data is cached and refreshed every 24 hours.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Sub-components
function StatCard({ icon, label, value, color }) {
  return (
    <motion.div whileHover={{ y: -5 }} style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: "20px",
      padding: "20px", display: "flex", alignItems: "center", gap: "15px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)"
    }}>
      <div style={{
        width: "48px", height: "48px", borderRadius: "14px",
        background: `${color}15`, color: color,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
      }}>
        {icon}
      </div>
      <div className="text-start">
        <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "800", textTransform: "uppercase" }}>{label}</div>
        <div style={{ color: "#1e293b", fontSize: "20px", fontWeight: "900" }}>{value.toLocaleString()}</div>
      </div>
    </motion.div>
  );
}

function ListCard({ title, icon, items }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: "24px",
      padding: "24px", height: "100%", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)"
    }}>
      <div className="d-flex align-items-center gap-2 mb-4 text-start">
        <div style={{ color: "#6f42c1", background: "#f3e8ff", padding: "8px", borderRadius: "10px", display: "flex" }}>
          {icon}
        </div>
        <h5 className="m-0 fw-bold text-dark">{title}</h5>
      </div>
      
      {items?.length ? items.map((item, idx) => (
        <div key={item._id} className="d-flex justify-content-between align-items-center border-bottom py-3">
          <span className="text-dark fw-semibold text-truncate text-start" style={{ maxWidth: "70%", fontSize: "14px" }}>
            {item._id.replace(/\//g, ' / ').replace(/_/g, ' ')}
          </span>
          <span className="badge bg-light text-primary border rounded-pill px-3 py-2 fw-bold" style={{ minWidth: "60px" }}>
            {item.count}
          </span>
        </div>
      )) : <EmptyState text="No data available." />}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="p-4 text-center text-muted small fw-medium">
      {text}
    </div>
  );
}