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

  // Format helper
  function formatAmount(amount) {
    return Number(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      style: 'currency',
      currency: 'INR'
    });
  }

  let momGrowth = 0;
  let isGrowthPositive = true;
  let peakMonth = "N/A";

  if (summary && summary.monthlyData) {
    const keys = Object.keys(summary.monthlyData);
    const values = Object.values(summary.monthlyData);

    // Peak Month Calculate karna
    if (values.length > 0) {
      const maxVal = Math.max(...values);
      peakMonth = keys[values.indexOf(maxVal)];
    }

    // MoM Growth Calculate karna (Safe tareeka)
    if (keys.length >= 2) {
      const currentMonth = values[keys.length - 1] || 0;
      const prevMonth = values[keys.length - 2] || 1; // 1 to prevent divide by zero

      // MoM Growth Calculate 
      if (keys.length >= 2) {
        const currentMonth = values[keys.length - 1] || 0;
        const prevMonth = values[keys.length - 2] || 1; // 1 to prevent divide by zero

        let rawGrowth = ((currentMonth - prevMonth) / prevMonth) * 100;

        isGrowthPositive = rawGrowth >= 0;

        momGrowth = Math.abs(rawGrowth).toFixed(1);
      }
    }
  }

  return (
    <div className="dashboard-wrapper">
      {/* --- ALL CSS STYLES --- */}
      <style>{`
        .dashboard-wrapper { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        
        .header-flex { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; border-bottom: 1px solid #f1f2f6; padding-bottom: 15px; }
        .heading { color: #2d3436; font-weight: 800; margin: 0; font-size: 1.8rem; }
        .sub-heading { color: #636e72; margin: 5px 0 0 0; font-size: 0.95rem; }
        .last-updated { font-size: 0.85rem; color: #b2bec3; font-weight: 500; background: #f8f9fa; padding: 6px 12px; border-radius: 20px; }

        /* Skeleton Animation & Styles */
        .skeleton {
          background: #f1f5f9;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skel-text-lg { height: 32px; width: 60%; margin-bottom: 8px; }
        .skel-text-sm { height: 18px; width: 40%; }
        .skel-pill { height: 32px; width: 140px; border-radius: 20px; }
        .skel-ai-banner { height: 130px; border-radius: 16px; margin-bottom: 30px; }
        .skel-card { height: 140px; border-radius: 16px; border: 1px solid #f1f2f6; }
        .skel-small-card { height: 85px; border-radius: 16px; border: 1px solid #f1f2f6; }
        .skel-chart { height: 450px; border-radius: 20px; margin-top: 30px; border: 1px solid #f1f2f6; }

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
        .chart-body { 
          position: relative; /* <-- Ye add karna zaroori hai */
          height: 280px; 
          width: 100%;        /* <-- Ye add karein */
        }
        .error-text { text-align: center; color: #dc3545; font-weight: 600; margin-top: 50px; }

        @media (max-width: 768px) {
          .dashboard-wrapper { padding: 15px; }
          .ai-forecast-banner { flex-direction: column; text-align: center; padding: 20px; }
          .ai-icon-wrapper { margin: 0 0 15px 0; }
          .header-flex { flex-direction: column; align-items: flex-start; gap: 15px; }
          .card-value { font-size: 1.6rem; }
          .chart-body { height: 280px; }
          .skel-text-lg, .skel-text-sm { width: 100%; }
        }
      `}</style>

      {loading ? (
        <>
          {/* Skeleton Header */}
          <div className="header-flex">
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <div className="skeleton skel-text-lg"></div>
              <div className="skeleton skel-text-sm"></div>
            </div>
            <div className="skeleton skel-pill"></div>
          </div>

          {/* Skeleton AI Banner */}
          <div className="skeleton skel-ai-banner"></div>

          {/* Skeleton Stats Grid */}
          <div className="stats-grid">
            <div className="skeleton skel-card"></div>
            <div className="skeleton skel-card"></div>
            <div className="skeleton skel-card"></div>
          </div>

          {/* Skeleton Sub Grid */}
          <div className="sub-grid">
            <div className="skeleton skel-small-card"></div>
            <div className="skeleton skel-small-card"></div>
          </div>

          {/* Skeleton Chart */}
          <div className="skeleton skel-chart"></div>
        </>
      ) : !summary ? (
        <div className="error-text">Unable to load dashboard.</div>
      ) : (
        <>
          {/* Real Content */}
          <div className="header-flex">
            <div>
              <h2 className="heading">Financial Analytics & AI Forecast</h2>
              <p className="sub-heading">Track platform revenue and predictive future trends.</p>
            </div>
            <div className="last-updated">Live Updated: {new Date().toLocaleDateString()}</div>
          </div>

          {/* Premium AI Forecast Banner */}
          {summary.forecast && (
            <div className="ai-forecast-banner">
              <div className="ai-icon-wrapper"></div>
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

          {/*
          <div className="sub-grid">
            <SmallCard
              title="MoM Revenue Growth"
              value={`${(((summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 1]] || 0) - (summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 2]] || 0)) / (summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 2]] || 1) * 100).toFixed(1)}%`}
              icon={(((summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 1]] || 0) - (summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 2]] || 0)) / (summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 2]] || 1) * 100) >= 0 ? "↗️" : "↘️"}
              color={(((summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 1]] || 0) - (summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 2]] || 0)) / (summary.monthlyData[Object.keys(summary.monthlyData)[Object.keys(summary.monthlyData).length - 2]] || 1) * 100) >= 0 ? "#28a745" : "#dc3545"}
            />
            <SmallCard
              title="Peak Performance Month"
              value={Object.keys(summary.monthlyData || {})[Object.values(summary.monthlyData || {}).indexOf(Math.max(...Object.values(summary.monthlyData || {}), 0))] || "N/A"}
              icon="🏆"
              color="#fd7e14"
            />
          </div> */}

          {/* Growth and Highs */}
          <div className="sub-grid">
            <SmallCard
              title="MoM Revenue Growth"
              value={`${momGrowth}%`}
              icon={isGrowthPositive ? "↗️" : "↘️"}
              color={isGrowthPositive ? "#28a745" : "#dc3545"}
            />
            <SmallCard
              title="Peak Performance Month"
              value={peakMonth}
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
                  labels: Object.keys(summary.monthlyData || {}),
                  datasets: [{
                    label: "Revenue (₹)",
                    data: Object.values(summary.monthlyData || {}),
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
                  layout: {
                    padding: {
                      bottom: 25, // Neeche se X-axis labels ke liye space banayega
                      top: 10,
                      left: 10,
                      right: 10
                    }
                  },
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
        </>
      )}
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