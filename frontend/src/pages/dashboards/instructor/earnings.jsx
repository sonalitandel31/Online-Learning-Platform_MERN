import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import api from "../../../api/api";
import { FaWallet, FaChartLine, FaArrowUp, FaArrowDown, FaCalendarAlt, FaChevronDown, FaInfoCircle, FaGem, FaCheckCircle } from "react-icons/fa";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Filler, Tooltip, Legend);

export default function InstructorEarnings() {
  const [data, setData] = useState({ pendingBalance: 0, totalWithdrawn: 0, monthly: {}, lastPayout: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const colors = {
    primary: "#6f42c1",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    success: "#10b981",
    danger: "#ef4444",
    infoBg: "#e0f2fe",
    infoText: "#0369a1",
    warning: "#f59e0b", // Added this
    warningBg: "#fef3c7",
    warningText: "#d97706"
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/instructor/earnings?year=${selectedYear}`);
        setData(res.data || {});
      } catch (err) {
        setData({ pendingBalance: 0, totalWithdrawn: 0, monthly: {}, lastPayout: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [selectedYear]);

  const monthlyData = Array.from({ length: 12 }, (_, i) => Number(data?.monthly?.[i + 1] || 0));
  const currentMonthIndex = new Date().getMonth();
  const thisMonth = monthlyData[currentMonthIndex] || 0;
  const prevMonth = currentMonthIndex > 0 ? monthlyData[currentMonthIndex - 1] || 0 : 0;
  const growthNum = prevMonth === 0 ? (thisMonth > 0 ? 100 : 0) : ((thisMonth - prevMonth) / prevMonth) * 100;

  const chartData = {
    labels: months,
    datasets: [
      {
        label: "Earnings (₹)",
        data: monthlyData,
        borderColor: colors.primary,
        backgroundColor: "rgba(111, 66, 193, 0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: colors.primary,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` ₹${ctx.parsed.y.toLocaleString()}` },
        backgroundColor: "#1e293b",
        padding: 10,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: colors.textMuted, font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { color: colors.textMuted, font: { size: 10 }, callback: (v) => `₹${v}` }, grid: { color: colors.border } },
    },
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner" />
        <p>Updating Ledger...</p>
        <style>{`
          .loader-container { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 60vh; color: ${colors.primary}; }
          .spinner { border: 4px solid ${colors.border}; border-top: 4px solid ${colors.primary}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 15px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="earnings-container">
      <style>{`
        .earnings-container { padding: 16px; background: ${colors.bg}; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .page-title { margin: 0; font-size: 1.4rem; font-weight: 800; color: ${colors.textMain}; }
        .year-selector { position: relative; display: flex; align-items: center; background: white; border: 1px solid ${colors.border}; border-radius: 8px; padding: 4px 10px; }
        .year-selector select { appearance: none; -webkit-appearance: none; border: none; background: transparent; padding-right: 20px; font-weight: 600; font-size: 0.9rem; outline: none; cursor: pointer; }
        .select-icon { position: absolute; right: 10px; font-size: 0.7rem; color: ${colors.textMuted}; pointer-events: none; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; display: flex; flex-direction: column; }
        .stat-label { font-size: 0.75rem; font-weight: 600; color: ${colors.textMuted}; margin-bottom: 4px; }
        .stat-value { font-size: 1.1rem; font-weight: 800; color: ${colors.textMain}; }
        .growth-badge { font-size: 0.7rem; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        .chart-section { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 24px; }
        .chart-header { margin-bottom: 16px; font-size: 0.95rem; font-weight: 700; color: ${colors.textMain}; }
        .chart-canvas-wrapper { height: 280px; position: relative; width: 100%; }
        .revenue-info-box { background: white; border: 1px solid ${colors.border}; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
        .revenue-info-header { background: ${colors.infoBg}; padding: 12px 16px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; gap: 8px; }
        .revenue-info-title { margin: 0; font-size: 0.9rem; font-weight: 700; color: ${colors.infoText}; }
        .revenue-info-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .revenue-split-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
        .revenue-icon-box { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0; }
        .revenue-split-content h6 { margin: 0 0 4px 0; font-size: 0.9rem; font-weight: 700; color: #1e293b; }
        .revenue-split-content p { margin: 0; font-size: 0.8rem; color: #64748b; line-height: 1.4; }
        @media (min-width: 768px) {
          .earnings-container { padding: 30px; }
          .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
          .stat-value { font-size: 1.4rem; }
          .chart-canvas-wrapper { height: 350px; }
          .revenue-info-body { flex-direction: row; }
          .revenue-split-row { flex: 1; }
        }
      `}</style>

      <div className="header-section">
        <h1 className="page-title">Earnings</h1>
        <div className="year-selector">
          <FaCalendarAlt style={{ marginRight: "8px", color: colors.primary, fontSize: "0.8rem" }} />
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((yr) => <option key={yr} value={yr}>{yr}</option>)}
          </select>
          <FaChevronDown className="select-icon" />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeft: `4px solid ${colors.warning}` }}>
          <span className="stat-label">Pending Balance (Next Payout)</span>
          <span className="stat-value" style={{ color: colors.warning }}>
            ₹{Number(data.pendingBalance || 0).toLocaleString()}
          </span>
          <span className="growth-badge text-muted">Awaiting Admin Transfer</span>
        </div>

        <div className="stat-card" style={{ borderLeft: `4px solid ${colors.success}` }}>
          <span className="stat-label">Total Withdrawn (Bank Transfer)</span>
          <span className="stat-value" style={{ color: colors.success }}>
            ₹{Number(data.totalWithdrawn || 0).toLocaleString()}
          </span>
          <span className="growth-badge text-muted">Lifetime earnings cleared</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Earnings (Current Year)</span>
          <span className="stat-value">₹{total(monthlyData, null).toLocaleString()}</span>
          <span className="growth-badge" style={{ color: growthNum >= 0 ? colors.success : colors.danger }}>
            {growthNum >= 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
            {Math.abs(growthNum).toFixed(1)}% vs last month
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Last Payout Amount</span>
          <span className="stat-value" style={{ color: colors.primary }}>
            ₹{Number(data.lastPayout || 0).toLocaleString()}
          </span>
          <span className="growth-badge text-muted">Latest Settlement</span>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-header">Earnings Trend ({selectedYear})</div>
        <div className="chart-canvas-wrapper">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="revenue-info-box">
        <div className="revenue-info-header">
          <FaInfoCircle color={colors.infoText} size={18} />
          <h3 className="revenue-info-title">How is your revenue calculated?</h3>
        </div>
        <div className="revenue-info-body">
          <div className="revenue-split-row">
            <div className="revenue-icon-box" style={{ background: "#dcfce7", color: "#10b981" }}>
              <FaWallet size={20} />
            </div>
            <div className="revenue-split-content">
              <h6>Direct Purchases</h6>
              <p>When a student buys your course individually, you receive the full instructor share immediately in your pending balance.</p>
            </div>
          </div>

          <div className="revenue-split-row">
            <div className="revenue-icon-box" style={{ background: "#ede9fe", color: "#6366f1" }}>
              <FaCheckCircle size={20} />
            </div>
            <div className="revenue-split-content">
              <h6>Completion Bounty</h6>
              <p>For students using a Subscription Plan, you earn a <b>10% Royalty bounty</b> of your course price every time a student completes 100% of the content.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to sum array
function total(arr) {
  return arr.reduce((a, b) => a + b, 0);
}