import { useEffect, useState } from "react";
import api from "../../../api/api";
import { FaCalendarAlt, FaChevronDown, FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";

export default function PayoutHistory() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const colors = {
    primary: "#6f42c1",
    bg: "#f8fafc",
    border: "#e2e8f0",
    textMain: "#1e293b",
    textMuted: "#64748b",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  };

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setLoading(true);
        // Pagination params (page/limit) remove kar diye hain taaki saara data ek saath aaye
        const res = await api.get(`/instructor/payouts?year=${filterYear}`);
        setPayouts(res.data.payouts || []);
      } catch (err) {
        setPayouts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayouts();
  }, [filterYear]);

  const getStatusBadge = (status) => {
    let bg, color, icon;
    switch (status?.toLowerCase()) {
      case "completed":
        bg = "#ecfdf5"; color = colors.success; icon = <FaCheckCircle />;
        break;
      case "pending":
        bg = "#fff7ed"; color = colors.warning; icon = <FaClock />;
        break;
      case "failed":
        bg = "#fef2f2"; color = colors.danger; icon = <FaTimesCircle />;
        break;
      default:
        bg = "#f1f5f9"; color = colors.textMuted; icon = null;
    }
    return (
      <span style={{ ...statusBadgeStyle, backgroundColor: bg, color }}>
        {icon} {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner" />
        <style>{`
          .loader-container { display: flex; justify-content: center; align-items: center; height: 60vh; }
          .spinner { border: 4px solid ${colors.border}; border-top: 4px solid ${colors.primary}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="payout-container">
      <style>{`
        .payout-container { padding: 16px; background: ${colors.bg}; min-height: 100vh; font-family: 'Inter', sans-serif; }
        
        .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .page-title { margin: 0; font-size: 1.4rem; font-weight: 800; color: ${colors.textMain}; }
        
        .year-selector { position: relative; display: flex; align-items: center; background: white; border: 1px solid ${colors.border}; border-radius: 8px; padding: 6px 12px; }
        .year-selector select { appearance: none; -webkit-appearance: none; border: none; background: transparent; padding-right: 20px; font-weight: 600; font-size: 0.9rem; outline: none; cursor: pointer; color: ${colors.textMain}; }
        .select-icon { position: absolute; right: 10px; font-size: 0.7rem; color: ${colors.textMuted}; pointer-events: none; }

        /* Desktop Table */
        .table-wrapper { background: white; border-radius: 12px; border: 1px solid ${colors.border}; overflow: hidden; display: none; }
        .payout-table { width: 100%; border-collapse: collapse; }
        .payout-table th { background: #f8fafc; padding: 14px; text-align: left; font-size: 0.75rem; color: ${colors.textMuted}; text-transform: uppercase; border-bottom: 1px solid ${colors.border}; }
        .payout-table td { padding: 14px; border-bottom: 1px solid ${colors.border}; font-size: 0.9rem; color: ${colors.textMain}; }

        /* Mobile List */
        .mobile-list { display: flex; flex-direction: column; gap: 12px; }
        .payout-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .amount-text { font-size: 1.1rem; font-weight: 800; color: ${colors.textMain}; }

        @media (min-width: 768px) {
          .payout-container { padding: 30px; }
          .table-wrapper { display: block; }
          .mobile-list { display: none; }
        }
      `}</style>

      <div className="header-section">
        <h1 className="page-title">Payouts</h1>
        <div className="year-selector">
          <FaCalendarAlt style={{ marginRight: "8px", color: colors.primary, fontSize: "0.8rem" }} />
          <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
            {generateYears().map((yr) => <option key={yr} value={yr}>{yr}</option>)}
          </select>
          <FaChevronDown className="select-icon" />
        </div>
      </div>

      {payouts.length === 0 ? (
        <div style={emptyStateStyle}>No records found for {filterYear}.</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-wrapper">
            <table className="payout-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: "500" }}>
                        {new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: "700" }}>₹{p.instructorEarning.toLocaleString()}</td>
                    <td>{p.paymentMethod || "Bank Transfer"}</td>
                    <td>{getStatusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-list">
            {payouts.map((p) => (
              <div key={p._id} className="payout-card">
                <div className="card-header">
                  <div>
                    <div className="amount-text">₹{p.instructorEarning.toLocaleString()}</div>
                    <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>
                        {new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {getStatusBadge(p.status)}
                </div>
                <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: colors.textMuted }}>Method</span>
                  <span style={{ fontWeight: "600", color: colors.textMain }}>{p.paymentMethod || "Bank Transfer"}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const statusBadgeStyle = {
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "0.7rem",
  fontWeight: "700",
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  textTransform: "uppercase"
};

const emptyStateStyle = {
  textAlign: "center",
  padding: "60px 20px",
  color: "#94a3b8",
  background: "white",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  marginTop: "20px"
};