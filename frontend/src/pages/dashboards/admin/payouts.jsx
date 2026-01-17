import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [monthFilter, setMonthFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/payouts")
      .then(res => {
        setPayouts(res.data);
        setFiltered(res.data);
      })
      .catch(err => console.error("Payouts fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let data = [...payouts];

    if (search.trim()) {
      data = data.filter(p =>
        (p.instructor || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    if (monthFilter !== "all") {
      data = data.filter(p => {
        if (!p.lastPayout) return false;
        return new Date(p.lastPayout).getMonth() + 1 === Number(monthFilter);
      });
    }

    setFiltered(data);
  }, [search, monthFilter, payouts]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const total = (list, field) => list.reduce((a, b) => a + (b[field] || 0), 0);

  const earningColor = (amount) => {
    if (amount > 50000) return "#28a745";
    if (amount > 10000) return "#fd7e14";
    return "#dc3545";
  };

  if (loading) return <div className="loading-state">Loading payout data...</div>;

  return (
    <div className="payouts-container">
      <h2 className="main-title">Instructor Payouts</h2>

      {/* Summary Cards */}
      <div className="summary-row">
        <div className="summary-card">
          <span className="summary-label">Total Instructors</span>
          <span className="summary-value">{payouts.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Earnings</span>
          <span className="summary-value">₹{total(payouts, "totalEarning").toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Courses Sold</span>
          <span className="summary-value">{total(payouts, "coursesSold")}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search instructor name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="month-select"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="all">All Months</option>
          {monthNames.map((name, index) => (
            <option key={index} value={index + 1}>{name}</option>
          ))}
        </select>
      </div>

      {/* Responsive Table/Grid */}
      <div className="data-wrapper">
        <div className="data-header desktop-only">
          <div>Instructor</div>
          <div>Courses</div>
          <div>Earnings</div>
          <div>Last Payout</div>
          <div>Trend</div>
        </div>

        <div className="data-body">
          {filtered.length > 0 ? filtered.map((p, i) => (
            <div key={i} className="data-row">
              <div className="cell instructor-cell">
                <div className="avatar">{(p.instructor || "U").charAt(0).toUpperCase()}</div>
                <div>
                  <span className="mobile-label">Instructor</span>
                  <strong>{p.instructor}</strong>
                </div>
              </div>

              <div className="cell">
                <span className="mobile-label">Courses Sold</span>
                <span className="chip">{p.coursesSold}</span>
              </div>

              <div className="cell">
                <span className="mobile-label">Earnings</span>
                <strong style={{ color: earningColor(p.totalEarning) }}>
                  ₹{p.totalEarning.toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="cell">
                <span className="mobile-label">Last Payout</span>
                <span className="date-text">
                  {p.lastPayout ? new Date(p.lastPayout).toLocaleDateString() : "—"}
                </span>
              </div>

              <div className="cell trend-cell">
                <span className="mobile-label">Trend</span>
                {p.trend === "up" ? (
                  <span className="trend-up">▲ Growth</span>
                ) : (
                  <span className="trend-down">▼ Drop</span>
                )}
              </div>
            </div>
          )) : (
            <div className="empty-msg">No payout records match your search.</div>
          )}
        </div>
      </div>

      <style>{`
        .payouts-container { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        .main-title { color: #6f42c1; margin-bottom: 24px; font-weight: 800; }

        /* Summary Cards */
        .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
        .summary-label { font-size: 0.85rem; color: #6c757d; font-weight: 600; }
        .summary-value { font-size: 1.6rem; font-weight: 800; color: #2d3436; margin-top: 5px; }

        /* Filter Bar */
        .filter-bar { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 250px; padding: 12px 16px; border-radius: 12px; border: 1px solid #e0e0e0; outline: none; }
        .month-select { padding: 12px 16px; border-radius: 12px; border: 1px solid #e0e0e0; background: white; cursor: pointer; }

        /* Data Wrapper */
        .data-wrapper { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow: hidden; }
        .data-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1.2fr 1fr; background: #f8f9fa; padding: 18px; font-weight: 700; color: #6f42c1; border-bottom: 1px solid #eee; }
        .data-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1.2fr 1fr; padding: 18px; border-bottom: 1px solid #f1f1f1; align-items: center; transition: 0.2s; }
        .data-row:hover { background: #fdfbff; }

        /* Cells & Elements */
        .instructor-cell { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: #6f42c1; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
        .chip { background: #f1f3f5; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; }
        .date-text { color: #636e72; font-size: 0.9rem; }
        .trend-up { color: #28a745; font-weight: 700; font-size: 0.85rem; }
        .trend-down { color: #dc3545; font-weight: 700; font-size: 0.85rem; }
        .mobile-label { display: none; }

        .empty-msg { padding: 40px; text-align: center; color: #b2bec3; }
        .loading-state { padding: 100px; text-align: center; color: #6f42c1; font-weight: 600; }

        @media (max-width: 850px) {
          .desktop-only { display: none; }
          .data-row { grid-template-columns: 1fr; gap: 12px; padding: 20px; border-bottom: 8px solid #f8f9fa; }
          .cell { display: flex; justify-content: space-between; align-items: center; }
          .mobile-label { display: block; font-size: 0.75rem; color: #b2bec3; text-transform: uppercase; font-weight: 700; }
          .instructor-cell { border-bottom: 1px solid #f1f1f1; padding-bottom: 10px; margin-bottom: 5px; }
        }
      `}</style>
    </div>
  );
}