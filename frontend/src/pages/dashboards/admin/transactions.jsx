import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/transactions")
      .then((res) => {
        setTxns(res.data);
        setFiltered(res.data);
      })
      .catch(err => console.error("Transaction Fetch Error:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let data = [...txns];

    if (search.trim()) {
      data = data.filter((t) =>
        `${t.student?.name} ${t.instructor?.name} ${t.course?.title}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    if (status !== "all") {
      data = data.filter((t) => t.status === status);
    }

    setFiltered(data);
  }, [search, status, txns]);

  const totalAmount = (list) => list.reduce((a, b) => a + (b.amount || 0), 0);

  const getStatusStyle = (status) => {
    switch (status) {
      case "completed": return { bg: "#dcfce7", color: "#166534" };
      case "failed": return { bg: "#fee2e2", color: "#991b1b" };
      case "pending": return { bg: "#fef9c3", color: "#854d0e" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  if (loading) return <div className="loading-container">Fetching transactions...</div>;

  return (
    <div className="txn-container">
      <h2 className="title">Transaction History</h2>

      {/* Summary Section */}
      <div className="summary-grid">
        <SummaryCard title="Total Volume" value={txns.length} icon="📊" />
        <SummaryCard 
          title="Total Revenue" 
          value={`₹${totalAmount(txns).toLocaleString('en-IN')}`} 
          icon="💰" 
        />
        <SummaryCard 
          title="Successful" 
          value={txns.filter(t => t.status === "completed").length} 
          icon="✅" 
        />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-box"
          placeholder="Search by student, instructor, or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="status-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Responsive Data Table */}
      <div className="table-card">
        <div className="table-header desktop-only">
          <div>Student / Instructor</div>
          <div>Course Title</div>
          <div>Amount</div>
          <div>Status</div>
          <div>Date & Time</div>
        </div>

        <div className="table-body">
          {filtered.length > 0 ? filtered.map((t) => {
            const style = getStatusStyle(t.status);
            return (
              <div key={t._id} className="table-row">
                <div className="cell profile-cell">
                  <div className="user-info">
                    <strong>{t.student?.name || "Guest"}</strong>
                    <span className="sub-text">To: {t.instructor?.name || "N/A"}</span>
                  </div>
                </div>

                <div className="cell">
                  <span className="mobile-label">Course:</span>
                  <span className="course-title">{t.course?.title}</span>
                </div>

                <div className="cell">
                  <span className="mobile-label">Amount:</span>
                  <span className="amount-text">₹{t.amount.toLocaleString('en-IN')}</span>
                </div>

                <div className="cell">
                  <span className="mobile-label">Status:</span>
                  <span 
                    className="status-badge" 
                    style={{ background: style.bg, color: style.color }}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="cell">
                  <span className="mobile-label">Date:</span>
                  <span className="date-text">
                    {new Date(t.paymentDate).toLocaleDateString()} 
                    <small> {new Date(t.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                  </span>
                </div>
              </div>
            );
          }) : (
            <div className="empty-state">No transactions found for the selected filters.</div>
          )}
        </div>
      </div>

      <style>{`
        .txn-container { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        .title { color: #6f42c1; font-weight: 800; margin-bottom: 25px; }

        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-item { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 15px; }
        .icon-box { font-size: 1.5rem; background: #f3effb; padding: 10px; border-radius: 12px; }
        .sum-title { font-size: 0.85rem; color: #64748b; font-weight: 600; display: block; }
        .sum-value { font-size: 1.4rem; font-weight: 800; color: #1e293b; }

        .filter-bar { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-box { flex: 1; min-width: 280px; padding: 12px 18px; border-radius: 12px; border: 1px solid #e2e8f0; outline: none; transition: 0.2s; }
        .search-box:focus { border-color: #6f42c1; box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.1); }
        .status-select { padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; cursor: pointer; }

        .table-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow: hidden; }
        .table-header { display: grid; grid-template-columns: 1.5fr 1.5fr 1fr 1fr 1.2fr; background: #f8fafc; padding: 18px; font-weight: 700; color: #6f42c1; font-size: 0.85rem; }
        .table-row { display: grid; grid-template-columns: 1.5fr 1.5fr 1fr 1fr 1.2fr; padding: 18px; border-bottom: 1px solid #f1f5f9; align-items: center; transition: 0.2s; }
        .table-row:hover { background: #fdfbff; }

        .user-info { display: flex; flex-direction: column; }
        .sub-text { font-size: 0.75rem; color: #94a3b8; }
        .course-title { font-size: 0.9rem; color: #334155; font-weight: 500; }
        .amount-text { font-weight: 700; color: #1e293b; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-block; }
        .date-text { font-size: 0.85rem; color: #64748b; }
        .mobile-label { display: none; }

        .empty-state { padding: 50px; text-align: center; color: #94a3b8; }
        .loading-container { padding: 100px; text-align: center; color: #6f42c1; font-weight: 600; }

        @media (max-width: 900px) {
          .desktop-only { display: none; }
          .table-row { grid-template-columns: 1fr; gap: 12px; padding: 20px; border-bottom: 8px solid #f8fafc; }
          .cell { display: flex; justify-content: space-between; align-items: center; }
          .profile-cell { border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 5px; }
          .mobile-label { display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="summary-item">
      <div className="icon-box">{icon}</div>
      <div>
        <span className="sum-title">{title}</span>
        <span className="sum-value">{value}</span>
      </div>
    </div>
  );
}