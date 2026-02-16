// src/pages/Instructor/Analytics/EngagementAnalytics.jsx
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
} from "recharts";
import { FaBolt, FaChartLine, FaUserClock } from "react-icons/fa";

export default function EngagementAnalytics() {
  const [events, setEvents] = useState([]); // [{_id:eventName,count}]
  const [dau, setDau] = useState([]); // [{date,dau,events}]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("token");

  const colors = {
    primary: "#6f42c1",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    card: "#ffffff",
  };

  const totals = useMemo(() => {
    const totalEvents = events.reduce((sum, e) => sum + (e.count || 0), 0);
    const avgDau =
      dau.length > 0 ? Math.round(dau.reduce((s, d) => s + (d.dau || 0), 0) / dau.length) : 0;
    const peakDau = dau.length > 0 ? Math.max(...dau.map((d) => d.dau || 0)) : 0;
    return { totalEvents, avgDau, peakDau };
  }, [events, dau]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setErr("");

        const [evRes, dauRes] = await Promise.all([
          api.get("/analytics/instructor/me", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/analytics/dau?days=14", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setEvents(Array.isArray(evRes.data?.events) ? evRes.data.events : []);
        setDau(Array.isArray(dauRes.data?.dau) ? dauRes.data.dau : []);
      } catch (e) {
        console.error(e);
        setErr("Failed to load engagement analytics.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  const eventData = useMemo(() => {
    // normalize chart fields
    return events.map((e) => ({
      event: e._id,
      count: e.count || 0,
    }));
  }, [events]);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `4px solid ${colors.border}`,
              borderTop: `4px solid ${colors.primary}`,
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
          <p style={{ marginTop: 12, color: colors.primary, fontWeight: 600 }}>Loading Engagement Analytics...</p>
          <style>{`@keyframes spin {0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: colors.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-0.3px" }}>
          Engagement Analytics
        </h2>
        <p style={{ margin: "6px 0 0", color: colors.textMuted, fontWeight: 500 }}>
          Student activity events + DAU trend (last 14 days)
        </p>
      </div>

      {err && (
        <div
          className="alert alert-danger"
          style={{ border: "none", borderRadius: 12, marginBottom: 16 }}
        >
          {err}
        </div>
      )}

      {/* Stats cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <StatCard
          icon={<FaBolt />}
          title="Total Events (30d)"
          value={totals.totalEvents}
          colors={colors}
        />
        <StatCard
          icon={<FaUserClock />}
          title="Avg DAU (14d)"
          value={totals.avgDau}
          colors={colors}
        />
        <StatCard
          icon={<FaChartLine />}
          title="Peak DAU (14d)"
          value={totals.peakDau}
          colors={colors}
        />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontWeight: 900, color: colors.textMain, marginBottom: 10 }}>
            Event Breakdown (last 30 days)
          </div>
          {eventData.length === 0 ? (
            <EmptyBox text="No event data yet. Open courses/lessons/exams to generate events." />
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={eventData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="event" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill={colors.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontWeight: 900, color: colors.textMain, marginBottom: 10 }}>
            Daily Active Users (last 14 days)
          </div>
          {dau.length === 0 ? (
            <EmptyBox text="No DAU data yet." />
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={dau}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="dau" stroke={colors.primary} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="events" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ marginTop: 10, color: colors.textMuted, fontSize: 12 }}>
            Note: DAU counts unique <b>logged-in</b> users only (userId based). Anonymous visitors may not be counted.
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, colors }) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: "#f5f3ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.primary,
          fontSize: 18,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: colors.textMuted, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
          {title}
        </div>
        <div style={{ color: colors.textMain, fontSize: 20, fontWeight: 900 }}>{value}</div>
      </div>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div
      style={{
        padding: "40px 14px",
        textAlign: "center",
        color: "#94a3b8",
        background: "#fff",
        border: "1px dashed #e2e8f0",
        borderRadius: 12,
      }}
    >
      {text}
    </div>
  );
}
