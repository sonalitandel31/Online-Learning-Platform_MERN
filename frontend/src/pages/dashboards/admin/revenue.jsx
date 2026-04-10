import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart, LineElement, CategoryScale, LinearScale, PointElement, Filler, Tooltip } from "chart.js";
import api from "../../../api/api";

Chart.register(LineElement, CategoryScale, LinearScale, PointElement, Filler, Tooltip);

export default function Revenue() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/revenue")
      .then(res => setSummary(res.data))
      .catch(err => console.error("Revenue API Error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  // Fallback for empty data
  if (!summary) return <div className="error-text">Unable to load dashboard.</div>;

  const months = Object.keys(summary.monthlyData || {});
  const amounts = months.map(m => summary.monthlyData[m]);

  const last = amounts[amounts.length - 1] || 0;
  const prev = amounts[amounts.length - 2] || 0;
  const growth = prev ? (((last - prev) / prev) * 100).toFixed(1) : 0;

  const maxAmount = Math.max(...amounts, 0);
  const bestMonth = months[amounts.indexOf(maxAmount)] || "N/A";

  function formatAmount(amount) {
    return Number(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      style: 'currency',
      currency: 'INR'
    });
  }

  return (
    <div className="dashboard-wrapper">
      <div className="header-flex">
        <div>
          <h2 className="heading">Financial Analytics & AI Forecast</h2>
          <p className="sub-heading">Track platform revenue and predictive future trends.</p>
        </div>
        <div className="last-updated">Live Updated: {new Date().toLocaleDateString()}</div>
      </div>

      {/* 🚀 NEW: Premium AI Forecast Banner */}
      {summary.forecast && (
        <div className="ai-forecast-banner">
          <div className="ai-icon-wrapper">✨</div>
          <div className="ai-content">
            <h3 className="ai-title">AI Predictive Forecast ({summary.forecast.month})</h3>
            <div className="ai-value">{formatAmount(summary.forecast.expectedRevenue)}</div>
            <p className="ai-subtitle">
              Calculated using linear regression algorithm based on historical revenue trends.
            </p>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="stats-grid">
        <Card title="Total Gross Revenue" value={formatAmount(summary.totalRevenue)} color="#6f42c1" icon="💰" />
        <Card title="Total Instructor Payouts" value={formatAmount(summary.totalInstructorEarning)} color="#198754" icon="👨‍🏫" />
        <Card title="Net Platform Profit" value={formatAmount(summary.platformCommission)} color="#0dcaf0" icon="📈" />
      </div>

      {/* Growth and Highs */}
      <div className="sub-grid">
        <SmallCard
          title="MoM Revenue Growth"
          value={`${growth}%`}
          icon={growth >= 0 ? "↗️" : "↘️"}
          color={growth >= 0 ? "#28a745" : "#dc3545"}
        />
        <SmallCard
          title="Peak Performance Month"
          value={bestMonth}
          icon="🏆"
          color="#fd7e14"
        />
      </div>

      {/* Chart Section */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Revenue Trajectory</h3>
        </div>
        <div className="chart-body">
          <Line
            data={{
              labels: months,
              datasets: [{
                label: "Revenue (₹)",
                data: amounts,
                borderColor: "#6f42c1",
                backgroundColor: "rgba(111,66,193,0.15)",
                fill: true,
                tension: 0.4, // Smooth curved lines
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: "#fff",
                pointBorderColor: "#6f42c1",
                pointBorderWidth: 2,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { 
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#2d3436',
                  padding: 12,
                  titleFont: { size: 14 },
                  bodyFont: { size: 14, weight: 'bold' },
                  displayColors: false,
                }
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#636e72' } },
                y: { 
                  grid: { color: "#f1f2f6", drawBorder: false },
                  ticks: { color: '#636e72' },
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      </div>

      {/* --- ALL CSS STYLES --- */}
      <style>{`
        .dashboard-wrapper { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        
        .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; border-bottom: 1px solid #f1f2f6; padding-bottom: 15px; }
        .heading { color: #2d3436; font-weight: 800; margin: 0; font-size: 1.8rem; }
        .sub-heading { color: #636e72; margin: 5px 0 0 0; font-size: 0.95rem; }
        .last-updated { font-size: 0.85rem; color: #b2bec3; font-weight: 500; background: #f8f9fa; padding: 6px 12px; border-radius: 20px; }

        /* Loader */
        .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #6f42c1; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #6f42c1; border-radius: 50%; width: 45px; height: 45px; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* AI Banner Styles (NEW UI) */
        .ai-forecast-banner {
          background: linear-gradient(135deg, #fffcf0 0%, #ffffff 100%);
          border: 1px solid #ffeeba;
          border-left: 6px solid #ffc107;
          border-radius: 16px;
          padding: 24px 30px;
          display: flex;
          align-items: center;
          margin-bottom: 30px;
          box-shadow: 0 10px 25px rgba(255, 193, 7, 0.15);
          transition: transform 0.3s ease;
        }
        .ai-forecast-banner:hover { transform: translateY(-3px); }
        .ai-icon-wrapper { font-size: 2.8rem; margin-right: 25px; animation: pulse 2s infinite; text-shadow: 0 4px 10px rgba(255, 193, 7, 0.4); }
        .ai-title { margin: 0; font-size: 0.9rem; color: #856404; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
        .ai-value { font-size: 2.2rem; font-weight: 800; color: #d39e00; margin: 5px 0; letter-spacing: -0.5px; }
        .ai-subtitle { margin: 0; font-size: 0.9rem; color: #bfa15f; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

        /* Grid Logic */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .sub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }

        /* Cards */
        .card-inner { background: #fff; padding: 24px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: 0.3s; position: relative; border: 1px solid #f1f2f6; }
        .card-inner:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
        .card-header-wrapper { display: flex; justify-content: space-between; align-items: center; }
        .card-title { font-size: 0.95rem; color: #636e72; font-weight: 600; }
        .card-icon { font-size: 1.5rem; opacity: 0.8; }
        .card-value { font-size: 2rem; font-weight: 800; color: #2d3436; margin-top: 12px; letter-spacing: -0.5px; }

        .small-card-inner { display: flex; align-items: center; background: #fff; padding: 18px 24px; border-radius: 16px; border: 1px solid #f1f2f6; box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: 0.3s; }
        .small-card-inner:hover { border-color: #dfe6e9; }
        .small-icon { font-size: 1.8rem; margin-right: 18px; }
        .small-title { font-size: 0.85rem; color: #636e72; font-weight: 500; margin-bottom: 4px; }
        .small-value { font-size: 1.2rem; font-weight: 800; color: #2d3436; }

        /* Chart */
        .chart-container { background: white; margin-top: 30px; padding: 30px; border-radius: 20px; border: 1px solid #f1f2f6; box-shadow: 0 8px 25px rgba(0,0,0,0.03); }
        .chart-header h3 { margin: 0 0 25px 0; font-size: 1.2rem; color: #2d3436; font-weight: 700; }
        .chart-body { height: 380px; }

        @media (max-width: 768px) {
          .dashboard-wrapper { padding: 15px; }
          .ai-forecast-banner { flex-direction: column; text-align: center; padding: 20px; }
          .ai-icon-wrapper { margin: 0 0 15px 0; }
          .header-flex { flex-direction: column; align-items: flex-start; gap: 15px; }
          .card-value { font-size: 1.6rem; }
          .chart-body { height: 280px; }
        }
      `}</style>
    </div>
  );
}

function Card({ title, value, color, icon }) {
  return (
    <div className="card-inner" style={{ borderTop: `4px solid ${color}` }}>
      <div className="card-header-wrapper">
        <div className="card-title">{title}</div>
        <div className="card-icon">{icon}</div>
      </div>
      <div className="card-value">{value}</div>
    </div>
  );
}

function SmallCard({ title, value, icon, color }) {
  return (
    <div className="small-card-inner">
      <div className="small-icon">{icon}</div>
      <div>
        <div className="small-title">{title}</div>
        <div className="small-value" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}