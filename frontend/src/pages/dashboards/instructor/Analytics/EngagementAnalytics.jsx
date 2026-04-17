import { useEffect, useMemo, useState } from "react";
import api from "../../../../api/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import { FaBolt, FaChartLine, FaUserClock, FaInfoCircle, FaCalendarAlt } from "react-icons/fa";
import { motion } from "framer-motion";

export default function EngagementAnalytics() {
  const [events, setEvents] = useState([]); 
  const [dau, setDau] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("token");

  const colors = {
    primary: "#6f42c1",
    primaryLight: "#f3e8ff",
    secondary: "#10b981",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    card: "#ffffff",
  };

  const totals = useMemo(() => {
    const totalEvents = events.reduce((sum, e) => sum + (e.count || 0), 0);
    const avgDau = dau.length > 0 ? Math.round(dau.reduce((s, d) => s + (d.dau || 0), 0) / dau.length) : 0;
    const peakDau = dau.length > 0 ? Math.max(...dau.map((d) => d.dau || 0)) : 0;
    return { totalEvents, avgDau, peakDau };
  }, [events, dau]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setErr("");
        const [evRes, dauRes] = await Promise.all([
          api.get("/analytics/instructor/me", { headers: { Authorization: `Bearer ${token}` } }),
          api.get("/analytics/dau?days=14", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setEvents(Array.isArray(evRes.data?.events) ? evRes.data.events : []);
        setDau(Array.isArray(dauRes.data?.dau) ? dauRes.data.dau : []);
      } catch (e) {
        setErr("Failed to load engagement analytics.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  const eventData = useMemo(() => {
    return events.map((e) => ({
      event: e._id,
      count: e.count || 0,
    }));
  }, [events]);

  if (loading) {
    return (
      <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
          .skeleton {
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            background-color: #cbd5e1;
            border-radius: 8px;
          }
        `}</style>
        
        {/* Header Skeleton */}
        <header className="mb-5 text-start">
          <div className="d-flex align-items-center gap-3 mb-2">
            <div className="skeleton" style={{ height: "36px", width: "250px" }}></div>
            <div className="skeleton" style={{ height: "24px", width: "120px", borderRadius: "100px" }}></div>
          </div>
          <div className="skeleton" style={{ height: "20px", width: "350px", maxWidth: "100%" }}></div>
        </header>

        {/* Stats Grid Skeleton */}
        <div className="row g-4 mb-5">
          {[1, 2, 3].map((item) => (
            <div key={item} className="col-12 col-md-4">
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "24px", padding: "24px", display: "flex", alignItems: "center", gap: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
                <div className="skeleton" style={{ width: "60px", height: "60px", borderRadius: "18px", flexShrink: 0 }}></div>
                <div className="text-start" style={{ flexGrow: 1 }}>
                  <div className="skeleton" style={{ height: "14px", width: "120px", marginBottom: "8px" }}></div>
                  <div className="skeleton" style={{ height: "32px", width: "80px" }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="row g-4">
          {[1, 2].map((item) => (
            <div key={item} className="col-12 col-xl-6">
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "24px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)", height: "100%", display: "flex", flexDirection: "column" }}>
                <div className="mb-4 text-start">
                  <div className="skeleton" style={{ height: "24px", width: "180px", marginBottom: "6px" }}></div>
                  <div className="skeleton" style={{ height: "14px", width: "250px" }}></div>
                </div>
                
                <div className="skeleton" style={{ width: "100%", height: "350px", borderRadius: "12px", flexGrow: 1 }}></div>
                
                {/* Specific skeleton for the info footer in the second card */}
                {item === 2 && (
                  <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", width: "100%" }}>
                    <div className="d-flex align-items-center justify-content-start gap-2">
                      <div className="skeleton" style={{ width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0 }}></div>
                      <div className="skeleton" style={{ height: "14px", width: "80%" }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Header */}
      <header className="mb-5 text-start">
        <div className="d-flex align-items-center gap-3 mb-2">
            <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-1px" }}>
              Engagement Analytics
            </h2>
            <div className="badge rounded-pill border px-3 py-2 bg-white text-muted small d-flex align-items-center gap-2">
                <FaCalendarAlt size={12} /> Last 14-30 Days
            </div>
        </div>
        <p style={{ margin: 0, color: colors.textMuted, fontWeight: 500 }}>
          Real-time student activity tracking and daily active usage trends.
        </p>
      </header>

      {err && (
        <div className="alert alert-danger border-0 shadow-sm rounded-4 mb-4 text-start">
          <FaInfoCircle className="me-2" /> {err}
        </div>
      )}

      {/* Stats Grid */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-md-4">
            <StatCard icon={<FaBolt />} title="Total Events (30d)" value={totals.totalEvents} color={colors.primary} />
        </div>
        <div className="col-12 col-md-4">
            <StatCard icon={<FaUserClock />} title="Avg DAU (14d)" value={totals.avgDau} color={colors.secondary} />
        </div>
        <div className="col-12 col-md-4">
            <StatCard icon={<FaChartLine />} title="Peak DAU (14d)" value={totals.peakDau} color="#3b82f6" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <ChartContainer title="Event Breakdown" subtitle="Student actions recorded in the last 30 days">
            {eventData.length === 0 ? (
              <EmptyBox text="No event data available yet." />
            ) : (
              <div style={{ width: "100%", height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={eventData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="event" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill={colors.primary} radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartContainer>
        </div>

        <div className="col-12 col-xl-6">
          <ChartContainer title="Daily Active Users" subtitle="Unique logged-in users vs total events">
            {dau.length === 0 ? (
              <EmptyBox text="No trend data available." />
            ) : (
              <div style={{ width: "100%", height: 350 }}>
                <ResponsiveContainer>
                  <AreaChart data={dau} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.primary} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="dau" stroke={colors.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorDau)" />
                    <Line type="monotone" dataKey="events" stroke={colors.secondary} strokeWidth={2} dot={{ r: 4, fill: colors.secondary }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* STRICTLY LEFT-ALIGNED INFO FOOTER */}
            <div style={{ 
                marginTop: "1.5rem", 
                padding: "1rem", 
                background: "#f8fafc", 
                borderRadius: "12px", 
                border: "1px solid #e2e8f0",
                width: "100%" 
            }}>
                <div className="d-flex align-items-center justify-content-start gap-2 text-muted" style={{ fontSize: 11 }}>
                    <FaInfoCircle />
                    <span className="text-start">DAU reflects unique userId sessions. Anonymous interactions are excluded.</span>
                </div>
            </div>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "24px", padding: "24px", display: "flex", alignItems: "center", gap: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}
    >
      <div style={{ width: 60, height: 60, borderRadius: "18px", background: `${color}15`, color: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
        {icon}
      </div>
      <div className="text-start">
        <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</div>
        <div style={{ color: "#1e293b", fontSize: "28px", fontWeight: "900" }}>{value.toLocaleString()}</div>
      </div>
    </motion.div>
  );
}

function ChartContainer({ title, subtitle, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "24px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="mb-4 text-start">
        <h5 className="fw-bold mb-1 text-dark">{title}</h5>
        <p className="text-muted small mb-0">{subtitle}</p>
      </div>
      <div style={{ flexGrow: 1 }}>{children}</div>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: "20px" }}>
      <p className="mb-0 fw-medium">{text}</p>
    </div>
  );
}