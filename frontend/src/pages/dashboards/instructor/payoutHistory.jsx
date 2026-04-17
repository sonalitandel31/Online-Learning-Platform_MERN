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
      <div className="payout-container">
        <style>{`
          .payout-container { padding: 16px; background: ${colors.bg}; min-height: 100vh; font-family: 'Inter', sans-serif; }
          .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .table-wrapper { background: white; border-radius: 12px; border: 1px solid ${colors.border}; overflow: hidden; display: none; }
          .payout-table { width: 100%; border-collapse: collapse; }
          .payout-table th { background: #f8fafc; padding: 14px; text-align: left; font-size: 0.75rem; color: ${colors.textMuted}; text-transform: uppercase; border-bottom: 1px solid ${colors.border}; }
          .payout-table td { padding: 14px; border-bottom: 1px solid ${colors.border}; }
          .mobile-list { display: flex; flex-direction: column; gap: 12px; }
          .payout-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; }
          .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          
          @media (min-width: 768px) { .payout-container { padding: 30px; } .table-wrapper { display: block; } .mobile-list { display: none; } }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
          .skeleton {
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            background-color: #cbd5e1;
            border-radius: 6px;
          }
        `}</style>
        
        <div className="header-section">
          <div className="skeleton" style={{ width: "150px", height: "32px", borderRadius: "8px" }}></div>
          <div className="skeleton" style={{ width: "100px", height: "32px", borderRadius: "8px" }}></div>
        </div>

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
              {[1, 2, 3, 4, 5].map((item) => (
                <tr key={item}>
                  <td><div className="skeleton" style={{ height: "18px", width: "100px" }}></div></td>
                  <td><div className="skeleton" style={{ height: "18px", width: "80px" }}></div></td>
                  <td><div className="skeleton" style={{ height: "18px", width: "120px" }}></div></td>
                  <td><div className="skeleton" style={{ height: "24px", width: "90px", borderRadius: "20px" }}></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-list">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="payout-card">
              <div className="card-header">
                <div>
                  <div className="skeleton" style={{ height: "22px", width: "80px", marginBottom: "8px" }}></div>
                  <div className="skeleton" style={{ height: "14px", width: "100px" }}></div>
                </div>
                <div className="skeleton" style={{ height: "24px", width: "90px", borderRadius: "20px" }}></div>
              </div>
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton" style={{ height: "14px", width: "50px" }}></div>
                <div className="skeleton" style={{ height: "14px", width: "120px" }}></div>
              </div>
            </div>
          ))}
        </div>

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
        .table-wrapper { background: white; border-radius: 12px; border: 1px solid ${colors.border}; overflow: hidden; display: none; }
        .payout-table { width: 100%; border-collapse: collapse; }
        .payout-table th { background: #f8fafc; padding: 14px; text-align: left; font-size: 0.75rem; color: ${colors.textMuted}; text-transform: uppercase; border-bottom: 1px solid ${colors.border}; }
        .payout-table td { padding: 14px; border-bottom: 1px solid ${colors.border}; font-size: 0.9rem; color: ${colors.textMain}; }
        .mobile-list { display: flex; flex-direction: column; gap: 12px; }
        .payout-card { background: white; padding: 16px; border-radius: 12px; border: 1px solid ${colors.border}; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .amount-text { font-size: 1.1rem; font-weight: 800; color: ${colors.textMain}; }
        .royalty-badge { background: #fef3c7; color: #d97706; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 8px; }
        @media (min-width: 768px) { .payout-container { padding: 30px; } .table-wrapper { display: block; } .mobile-list { display: none; } }
      `}</style>

      <div className="header-section">
        <h1 className="page-title">Payouts History</h1>
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
                      {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: "700" }}>₹{Number(p.instructorEarning || p.amount).toLocaleString()}</td>
                    <td>
                      {p.paymentMethod || "Bank Transfer"}
                      {p.paymentMethod === "Subscription Bounty" && <span className="royalty-badge">ROYALTY</span>}
                    </td>
                    <td>{getStatusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-list">
            {payouts.map((p) => (
              <div key={p._id} className="payout-card">
                <div className="card-header">
                  <div>
                    <div className="amount-text">₹{Number(p.instructorEarning || p.amount).toLocaleString()}</div>
                    <div style={{ fontSize: "0.75rem", color: colors.textMuted }}>
                      {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {getStatusBadge(p.status)}
                </div>
                <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: colors.textMuted }}>Method</span>
                  <span style={{ fontWeight: "600", color: colors.textMain }}>
                    {p.paymentMethod || "Bank Transfer"}
                    {p.paymentMethod === "Subscription Bounty" && <span className="royalty-badge">ROYALTY</span>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const statusBadgeStyle = { padding: "4px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "5px", textTransform: "uppercase" };
const emptyStateStyle = { textAlign: "center", padding: "60px 20px", color: "#94a3b8", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "20px" };