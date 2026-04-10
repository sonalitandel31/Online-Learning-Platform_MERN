import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { FaCheckCircle } from "react-icons/fa";

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [monthFilter, setMonthFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ===== NEW STATE FOR PAYOUT MODAL =====
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = () => {
    setLoading(true);
    // Updated to use the new pending payouts endpoint
    api.get("/admin/payouts/pending")
      .then(res => {
        if (res.data.success) {
          setPayouts(res.data.payouts);
          setFiltered(res.data.payouts);
        }
      })
      .catch(err => console.error("Payouts fetch error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let data = [...payouts];

    if (search.trim()) {
      data = data.filter(p =>
        (p.name || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(data);
  }, [search, payouts]);

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

  // ===== NEW LOGIC TO PROCESS THE PAYOUT =====
  const handleProcessPayout = async () => {
    if (!transactionId) {
      // Standard browser alert to prevent empty submission
      alert("Please enter the Bank Transaction ID!");
      return;
    }

    setProcessing(true);
    try {
      const { data } = await api.post("/admin/payouts/process", {
        instructorId: selectedInstructor.instructorId,
        amount: selectedInstructor.amount,
        paymentIds: selectedInstructor.paymentIds, // Required by backend to update status
        transactionId: transactionId
      });

      if (data.success) {
        // Remove the processed instructor from the list
        setPayouts(payouts.filter(p => p.instructorId !== selectedInstructor.instructorId));
        setSelectedInstructor(null);
        setTransactionId("");
        // Silent update
      }
    } catch (err) {
      console.error("Error processing payment", err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="loading-state">Loading payout data...</div>;

  return (
    <div className="payouts-container">
      <h2 className="main-title">Pending Instructor Payouts</h2>

      {/* Summary Cards */}
      <div className="summary-row">
        <div className="summary-card">
          <span className="summary-label">Instructors Waiting</span>
          <span className="summary-value">{payouts.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Pending Amount</span>
          <span className="summary-value" style={{ color: "#dc3545" }}>
            ₹{total(payouts, "amount").toLocaleString('en-IN')}
          </span>
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
          <div>Pending Amount</div>
          <div>Action</div>
        </div>

        <div className="data-body">
          {filtered.length > 0 ? filtered.map((p, i) => (
            <div key={i} className="data-row">
              <div className="cell instructor-cell">
                <div className="avatar">{(p.name || "U").charAt(0).toUpperCase()}</div>
                <div>
                  <span className="mobile-label">Instructor</span>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>{p.email}</div>
                  
                  {/* 👇 NAYA: Subscription Bounty Badge 👇 */}
                  {p.paymentMethod === "Subscription Bounty" && (
                    <span className="badge bg-warning bg-opacity-10 text-dark border border-warning mt-1" style={{ fontSize: "10px", display: "inline-block" }}>
                      👑 Course Completion Bounty
                    </span>
                  )}
                </div>
              </div>

              <div className="cell">
                <span className="mobile-label">Pending Amount</span>
                <strong style={{ color: earningColor(p.amount) }}>
                  ₹{p.amount.toLocaleString('en-IN')}
                </strong>
              </div>

              {/* Action Button */}
              <div className="cell">
                <span className="mobile-label">Action</span>
                <button
                  className="process-btn"
                  onClick={() => setSelectedInstructor(p)}
                >
                  Pay Now
                </button>
              </div>
            </div>
          )) : (
            <div className="empty-msg">No pending payouts match your criteria. All caught up!</div>
          )}
        </div>
      </div>

      {/* PAYMENT PROCESSING MODAL */}
      {selectedInstructor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h5 style={{ margin: 0 }}>Process Payout</h5>
              <button className="close-btn" onClick={() => setSelectedInstructor(null)}>✕</button>
            </div>

            <div className="modal-body">
              <p>You are marking a payment for <strong>{selectedInstructor.name}</strong></p>
              <h2 style={{ color: "#28a745", margin: "10px 0 20px 0" }}>
                ₹{selectedInstructor.amount.toLocaleString('en-IN')}
              </h2>

              <div style={{ textAlign: "left" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#6c757d", marginBottom: "5px", display: "block" }}>
                  Bank Transaction ID
                </label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: "100%", marginBottom: "5px" }}
                  placeholder="e.g. IMPS1234567890"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
                <small style={{ fontSize: "0.75rem", color: "#b2bec3" }}>
                  Enter the bank reference number after transferring the funds.
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setSelectedInstructor(null)}>Cancel</button>
              <button
                className="confirm-btn"
                onClick={handleProcessPayout}
                disabled={processing}
              >
                {processing ? "Processing..." : "Confirm Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ... Existing CSS ... */
        .payouts-container { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        .main-title { color: #6f42c1; margin-bottom: 24px; font-weight: 800; }
        .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
        .summary-label { font-size: 0.85rem; color: #6c757d; font-weight: 600; }
        .summary-value { font-size: 1.6rem; font-weight: 800; color: #2d3436; margin-top: 5px; }
        .filter-bar { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 250px; padding: 12px 16px; border-radius: 12px; border: 1px solid #e0e0e0; outline: none; }
        .month-select { padding: 12px 16px; border-radius: 12px; border: 1px solid #e0e0e0; background: white; cursor: pointer; }
        .data-wrapper { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow: hidden; }
        
        .data-header { display: grid; grid-template-columns: 2fr 1.5fr 1fr; background: #f8f9fa; padding: 18px; font-weight: 700; color: #6f42c1; border-bottom: 1px solid #eee; }
        .data-row { display: grid; grid-template-columns: 2fr 1.5fr 1fr; padding: 18px; border-bottom: 1px solid #f1f1f1; align-items: center; transition: 0.2s; }
        .data-row:hover { background: #fdfbff; }
        
        .instructor-cell { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: #6f42c1; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
        .mobile-label { display: none; }
        .empty-msg { padding: 40px; text-align: center; color: #b2bec3; }
        .loading-state { padding: 100px; text-align: center; color: #6f42c1; font-weight: 600; }

        .process-btn { background: #6f42c1; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .process-btn:hover { background: #5a32a3; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; width: 90%; max-width: 400px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #eee; }
        .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #6c757d; }
        .modal-body { padding: 25px 20px; text-align: center; }
        .modal-footer { padding: 15px 20px; background: #f8f9fa; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eee; }
        
        .cancel-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #dee2e6; background: white; color: #495057; font-weight: 600; cursor: pointer; }
        .confirm-btn { padding: 8px 16px; border-radius: 8px; border: none; background: #28a745; color: white; font-weight: 600; cursor: pointer; }
        .confirm-btn:disabled { opacity: 0.7; cursor: not-allowed; }

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