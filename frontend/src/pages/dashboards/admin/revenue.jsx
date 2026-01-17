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
        <p>Loading revenue data...</p>
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
        <h2 className="heading">Revenue Insights</h2>
        <div className="last-updated">Updated: {new Date().toLocaleDateString()}</div>
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid">
        <Card title="Total Revenue" value={formatAmount(summary.totalRevenue)} color="#6f42c1" />
        <Card title="Instructor Share" value={formatAmount(summary.totalInstructorEarning)} color="#198754" />
        <Card title="Platform Comm." value={formatAmount(summary.platformCommission)} color="#0dcaf0" />
      </div>

      {/* Growth and Highs */}
      <div className="sub-grid">
        <SmallCard
          title="Monthly Growth"
          value={`${growth}%`}
          icon={growth >= 0 ? "📈" : "📉"}
          color={growth >= 0 ? "#28a745" : "#dc3545"}
        />
        <SmallCard
          title="Best Performance"
          value={bestMonth}
          icon="🏆"
          color="#fd7e14"
        />
      </div>

      {/* Chart Section */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Monthly Trends</h3>
        </div>
        <div className="chart-body">
          <Line
            data={{
              labels: months,
              datasets: [{
                label: "Revenue",
                data: amounts,
                borderColor: "#6f42c1",
                backgroundColor: "rgba(111,66,193,0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: "#fff",
                pointBorderWidth: 2,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false } },
                y: { 
                  grid: { color: "#f0f0f0" },
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      </div>

      <style>{`
        .dashboard-wrapper { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .heading { color: #2d3436; font-weight: 800; margin: 0; }
        .last-updated { font-size: 0.8rem; color: #b2bec3; }

        /* Loader */
        .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #6f42c1; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #6f42c1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Grid Logic */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .sub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }

        /* Cards */
        .card-inner { background: #fff; padding: 24px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: 0.3s; position: relative; overflow: hidden; }
        .card-inner:hover { transform: translateY(-5px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .card-title { font-size: 0.9rem; color: #636e72; font-weight: 500; }
        .card-value { font-size: 1.8rem; font-weight: 800; color: #2d3436; margin-top: 8px; }

        .small-card-inner { display: flex; align-items: center; background: #fff; padding: 15px; border-radius: 15px; border: 1px solid #f1f2f6; }
        .small-icon { font-size: 1.5rem; margin-right: 15px; }
        .small-title { font-size: 0.8rem; color: #b2bec3; }
        .small-value { font-size: 1rem; font-weight: 700; color: #2d3436; }

        /* Chart */
        .chart-container { background: white; margin-top: 25px; padding: 25px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
        .chart-header h3 { margin: 0 0 20px 0; font-size: 1.1rem; color: #2d3436; }
        .chart-body { height: 350px; }

        @media (max-width: 600px) {
          .dashboard-wrapper { padding: 15px; }
          .card-value { font-size: 1.5rem; }
          .chart-body { height: 250px; }
          .header-flex { flex-direction: column; align-items: flex-start; gap: 5px; }
        }
      `}</style>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className="card-inner" style={{ borderTop: `5px solid ${color}` }}>
      <div className="card-title">{title}</div>
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