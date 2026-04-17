import { useEffect, useState } from "react";
import { 
  FaChartBar, FaUsers, FaMousePointer, FaLayerGroup, 
  FaCalendarAlt, FaHistory, FaArrowUp, FaInfoCircle, FaFire
} from "react-icons/fa";
import { motion } from "framer-motion";
import api from "../../../../api/api";

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [dau, setDau] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modern Color Palette
  const colors = {
    primary: "#6366f1", // Indigo
    primaryLight: "#e0e7ff",
    bg: "#f0fdf4", // Very light modern background
    border: "#f1f5f9",
    textMain: "#0f172a",
    textMuted: "#64748b",
    card: "#ffffff",
    accent: "#ec4899", // Pink
    success: "#10b981",
    warning: "#f59e0b"
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

  // Framer Motion Variants for Staggered Animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      
      {/* CSS Styles */}
      <style>{`
        .skeleton {
          background: #f1f5f9;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skel-title-lg { height: 36px; width: 300px; border-radius: 6px; margin-bottom: 8px; }
        .skel-text-md { height: 18px; width: 400px; border-radius: 4px; }
        .skel-badge-lg { height: 40px; width: 240px; border-radius: 50rem; }
        .skel-stat-icon { width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0; }
        .skel-stat-label { height: 12px; width: 80px; margin-bottom: 8px; }
        .skel-stat-value { height: 28px; width: 100px; border-radius: 4px; }
        
        /* Custom Scrollbar for Table */
        .custom-scroll::-webkit-scrollbar { height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        /* Glowing Text Effect */
        .text-gradient {
          background: linear-gradient(135deg, #4f46e5 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .neo-card {
          background: white;
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 24px;
          box-shadow: 0 4px 20px -2px rgba(0,0,0,0.03), 0 0 3px rgba(0,0,0,0.01);
          backdrop-filter: blur(10px);
        }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {loading ? (
           <div className="text-center py-5">
             <div className="skeleton skel-title-lg mx-auto mb-3"></div>
             <div className="skeleton skel-text-md mx-auto"></div>
           </div>
        ) : !overview?.success ? (
          <div className="container mt-5 pt-5 text-center">
            <FaInfoCircle size={40} className="text-muted mb-3" />
            <h5 className="text-muted">No analytics data found for this period.</h5>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show">
            
            {/* --- HEADER --- */}
            <motion.header variants={itemVariants} className="row g-4 mb-5 align-items-center">
              <div className="col-12 col-md-7 text-start">
                <h2 style={{ margin: 0, fontWeight: 900, letterSpacing: "-1px" }}>
                  <span className="text-gradient">Platform Insights</span> & Analytics
                </h2>
                <p style={{ margin: "6px 0 0", color: colors.textMuted, fontSize: "1.05rem" }}>
                  Real-time visualization of user interactions and platform activity.
                </p>
              </div>
              <div className="col-12 col-md-5 text-md-end">
                <div className="badge rounded-pill border-0 px-4 py-2 text-dark shadow-sm d-inline-flex align-items-center gap-2" style={{ background: "white", fontSize: "0.9rem" }}>
                  <FaCalendarAlt className="text-primary" />
                  <span className="fw-medium">
                    {new Date(overview.range.from).toLocaleDateString('en-US', {month:'short', day:'numeric'})} — {new Date(overview.range.to).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}
                  </span>
                </div>
              </div>
            </motion.header>

            {/* --- TOP STATS --- */}
            <motion.div variants={itemVariants} className="row g-3 mb-4">
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard icon={<FaChartBar />} label="Total Events" value={overview.totalEvents} color={colors.primary} />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard icon={<FaUsers />} label="Unique Users" value={overview.uniqueUsers} color={colors.accent} />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard icon={<FaFire />} label="Avg Daily Events" value={Math.round(overview.totalEvents / 30)} color={colors.success} />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard icon={<FaHistory />} label="Time Range" value="30 Days" color={colors.warning} />
              </div>
            </motion.div>

            <div className="row g-4">
              {/* --- VISUAL LIST CARDS --- */}
              <div className="col-lg-6">
                <motion.div variants={itemVariants} className="h-100">
                  <VisualListCard 
                    type="event" 
                    title="Top Fired Events" 
                    icon={<FaLayerGroup />} 
                    items={overview.eventBreakdown} 
                    color={colors.primary} 
                  />
                </motion.div>
              </div>

              <div className="col-lg-6">
                <motion.div variants={itemVariants} className="h-100">
                  <VisualListCard 
                    type="page" 
                    title="Most Visited Pages" 
                    icon={<FaMousePointer />} 
                    items={overview.topPages} 
                    color={colors.accent} 
                  />
                </motion.div>
              </div>

              {/* --- DAU TABLE --- */}
              <div className="col-12 mt-5">
                <motion.div variants={itemVariants} className="neo-card overflow-hidden">
                  <div style={{ padding: "24px 30px", borderBottom: `1px solid ${colors.border}`, background: "linear-gradient(to right, #ffffff, #f8fafc)" }} className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ padding: "10px", background: colors.primaryLight, color: colors.primary, borderRadius: "12px" }}>
                        <FaUsers size={20} />
                      </div>
                      <div>
                        <h5 className="m-0 fw-bold text-dark">Daily Active Users Trend</h5>
                        <small className="text-muted">Last 14 days engagement metrics</small>
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive custom-scroll">
                    {dau.length === 0 ? <EmptyState text="No DAU data available." /> : (
                      <table className="table table-borderless align-middle mb-0" style={{ minWidth: "700px" }}>
                        <thead style={{ background: "#f8fafc", borderBottom: "2px solid #f1f5f9" }}>
                          <tr style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            <th className="ps-4 py-3 fw-bold">Date / Timeline</th>
                            <th className="text-center py-3 fw-bold">Unique Users (DAU)</th>
                            <th className="text-center py-3 fw-bold">Interaction Events</th>
                            <th className="pe-4 py-3 text-end fw-bold">Engagement Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dau.map((d, idx) => (
                            <tr key={d.date} style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background="#f1f5f9"} onMouseOut={(e) => e.currentTarget.style.background="transparent"}>
                              <td className="ps-4 py-3 fw-semibold text-dark" style={{ fontSize: "15px" }}>{d.date}</td>
                              <td className="text-center py-3">
                                <span style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", padding: "6px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "700" }}>
                                  {d.dau} <span style={{fontWeight: 400, color: "#94a3b8"}}>Users</span>
                                </span>
                              </td>
                              <td className="text-center py-3 fw-bold" style={{ color: colors.primary }}>
                                {d.events.toLocaleString()}
                              </td>
                              <td className="pe-4 py-3 text-end">
                                <div className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#059669", fontSize: "13px", fontWeight: "700" }}>
                                  <FaArrowUp size={10} /> {Math.round((d.events / (d.dau || 1)))} / user
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div style={{ padding: "16px 24px", background: "#f8fafc", borderTop: `1px solid ${colors.border}` }} className="text-muted small d-flex align-items-center gap-2">
                    <FaInfoCircle /> DAU tracks unique user session IDs. Data is cached and refreshed every 24 hours.
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function StatCard({ icon, label, value, color }) {
  return (
    <motion.div 
      whileHover={{ y: -6, boxShadow: `0 15px 30px -5px ${color}30` }} 
      transition={{ type: "spring", stiffness: 300 }}
      className="neo-card"
      style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px", height: "100%", cursor: "pointer" }}
    >
      <div style={{
        width: "56px", height: "56px", borderRadius: "18px",
        background: `linear-gradient(135deg, ${color}15, ${color}30)`,
        color: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px"
      }}>
        {icon}
      </div>
      <div className="text-start">
        <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{label}</div>
        <div style={{ color: "#0f172a", fontSize: "24px", fontWeight: "900", lineHeight: "1" }}>{value.toLocaleString()}</div>
      </div>
    </motion.div>
  );
}

// DYNAMIC LIST CARD WITH FORMATTED READABLE TEXT
function VisualListCard({ title, icon, items, color, type }) {
  const maxCount = items?.length ? Math.max(...items.map(i => i.count)) : 1;

  // Formatting Helper Function
  const formatLabel = (rawString) => {
    if (!rawString || rawString === "Unknown") return { title: "Unknown", sub: "" };
    let text = String(rawString).replace(/\s+/g, ''); // Remove accidental spaces

    if (type === "page") {
      // Map common URLs to readable names
      if (text === "/") return { title: "🏠 Home Page", sub: text };
      if (text === "/courses") return { title: "📚 Course Catalog", sub: text };
      if (text.includes("/lessons/")) return { title: "▶️ Lesson Viewer", sub: text };
      if (text.startsWith("/courses/")) return { title: "📖 Course Details", sub: text };
      if (text.startsWith("/profile")) return { title: "👤 User Profile", sub: text };
      if (text.includes("payment") || text.includes("checkout")) return { title: "💳 Checkout", sub: text };
      
      return { title: "📄 " + text, sub: "" };
    }

    if (type === "event") {
      // Convert "course view" to "Course View"
      let formattedEvent = text.split(/[ _-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return { title: formattedEvent, sub: "" };
    }

    return { title: text, sub: "" };
  };

  return (
    <div className="neo-card" style={{ padding: "30px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="d-flex align-items-center gap-3 mb-4 text-start">
        <div style={{ color: color, background: `${color}15`, padding: "12px", borderRadius: "14px", display: "flex" }}>
          {icon}
        </div>
        <h5 className="m-0 fw-bold text-dark">{title}</h5>
      </div>
      
      <div className="flex-grow-1 d-flex flex-column gap-3">
        {items?.length ? items.map((item, idx) => {
          const { title, sub } = formatLabel(item._id);
          const percentage = Math.max((item.count / maxCount) * 100, 5); 

          return (
            <div key={item._id || idx} style={{ position: "relative", padding: "10px 0" }}>
              {/* Background Progress Bar */}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                style={{
                  position: "absolute", top: 0, left: 0, height: "100%", 
                  background: `linear-gradient(90deg, ${color}10, ${color}20)`,
                  borderRadius: "8px", zIndex: 0
                }}
              />
              
              {/* Content */}
              <div className="d-flex justify-content-between align-items-center" style={{ position: "relative", zIndex: 1, padding: "0 12px" }}>
                
                {/* Readable Title & Subtitle */}
                <div className="d-flex flex-column text-start" style={{ maxWidth: "75%" }}>
                  <span className="text-dark fw-bold text-truncate" style={{ fontSize: "14px" }}>
                    {title}
                  </span>
                  {/* Agar URL bada hai, toh use chhota karke niche faint color me dikhayenge */}
                  {sub && (
                     <span className="text-truncate text-muted" style={{ fontSize: "10px", opacity: 0.7 }}>
                       {sub}
                     </span>
                  )}
                </div>

                <span className="fw-bold" style={{ color: color, fontSize: "15px" }}>
                  {item.count.toLocaleString()}
                </span>
              </div>
            </div>
          );
        }) : <EmptyState text="No data available." />}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="p-5 text-center text-muted fw-medium" style={{ background: "#f8fafc", borderRadius: "16px" }}>
      {text}
    </div>
  );
}