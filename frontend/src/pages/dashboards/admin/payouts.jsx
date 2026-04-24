import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function Payouts() {
  // ===== TAB STATE =====
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "history"

  // ===== DATA STATES =====
  const [payouts, setPayouts] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // ===== MODAL STATES =====
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // Replaced alert() with inline error

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingPayouts();
    } else {
      fetchPayoutHistory();
    }
  }, [activeTab]);

  const fetchPendingPayouts = () => {
    setLoading(true);
    api.get("/admin/payouts/pending")
      .then(res => {
        if (res.data.success) {
          setPayouts(res.data.payouts);
        }
      })
      .catch(err => console.error("Pending payouts fetch error:", err))
      .finally(() => setLoading(false));
  };

  const fetchPayoutHistory = () => {
    setLoading(true);
    // Assuming you have this endpoint for completed payouts
    api.get("/admin/payouts/history")
      .then(res => {
        if (res.data.success) {
          setHistoryData(res.data.history);
        }
      })
      .catch(err => console.error("Payout history fetch error:", err))
      .finally(() => setLoading(false));
  };

  // Unified Filtering Logic
  useEffect(() => {
    let sourceData = activeTab === "pending" ? payouts : historyData;
    let data = [...sourceData];

    // 1. Search Filter
    if (search.trim()) {
      data = data.filter(p =>
        (p.name || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    // 2. Month Filter (History Tab Only)
    if (monthFilter !== "all" && activeTab === "history") {
      const selectedMonth = parseInt(monthFilter, 10);

      data = data.filter(p => {
        // First check: If backend provided the exact month number, use it! (Foolproof)
        if (p.month) {
          return parseInt(p.month, 10) === selectedMonth;
        }

        // Fallback: Try to parse the date string if 'p.month' is missing
        if (!p.date) return false;
        const payoutDate = new Date(p.date);
        return (payoutDate.getMonth() + 1) === selectedMonth;
      });
    }

    setFiltered(data);
  }, [search, monthFilter, payouts, historyData, activeTab]);

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

  const handleProcessPayout = async () => {
    if (!transactionId.trim()) {
      setErrorMsg("Please enter the Bank Transaction ID!");
      return;
    }
    setErrorMsg(""); // Clear previous errors
    setProcessing(true);

    try {
      const { data } = await api.post("/admin/payouts/process", {
        instructorId: selectedInstructor.instructorId,
        amount: selectedInstructor.amount,
        paymentIds: selectedInstructor.paymentIds,
        transactionId: transactionId
      });

      if (data.success) {
        setPayouts(payouts.filter(p => p.instructorId !== selectedInstructor.instructorId));
        setSelectedInstructor(null);
        setTransactionId("");
      }
    } catch (err) {
      console.error("Error processing payment", err);
      setErrorMsg("Failed to process payout. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="payouts-container">
      <div className="header-flex">
        <h2 className="main-title">Instructor Payouts</h2>

        {/* Tab Navigation */}
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => { setSearch(""); setActiveTab("pending"); }}
          >
            Pending
          </button>
          <button
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => { setSearch(""); setActiveTab("history"); }}
          >
            History
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-row">
        <div className="summary-card">
          <span className="summary-label">
            {activeTab === "pending" ? "Instructors Waiting" : "Total Payouts Made"}
          </span>
          {loading ? (
            <div className="skeleton skel-text-lg" style={{ marginTop: '5px', width: '60px' }}></div>
          ) : (
            <span className="summary-value">
              {activeTab === "pending" ? payouts.length : historyData.length}
            </span>
          )}
        </div>
        <div className="summary-card">
          <span className="summary-label">
            {activeTab === "pending" ? "Total Pending Amount" : "Total Amount Paid"}
          </span>
          {loading ? (
            <div className="skeleton skel-text-lg" style={{ marginTop: '5px', width: '140px' }}></div>
          ) : (
            <span className="summary-value" style={{ color: activeTab === "pending" ? "#dc3545" : "#28a745" }}>
              ₹{total(activeTab === "pending" ? payouts : historyData, "amount").toLocaleString('en-IN')}
            </span>
          )}
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
          disabled={loading}
        />
        <select
          className="month-select"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          // Disable if loading OR if looking at Pending tab
          disabled={loading || activeTab === "pending"}
          title={activeTab === "pending" ? "Month filter is only available for History" : ""}
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
          <div>Amount</div>
          <div>{activeTab === "pending" ? "Action" : "Details"}</div>
        </div>

        <div className="data-body">
          {loading ? (
            /* Skeleton Loading Rows */
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="data-row">
                <div className="cell instructor-cell">
                  <div className="skeleton skel-avatar"></div>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skel-text-sm" style={{ width: '140px', marginBottom: '6px' }}></div>
                    <div className="skeleton skel-text-xs" style={{ width: '100px' }}></div>
                  </div>
                </div>
                <div className="cell"><div className="skeleton skel-text-sm" style={{ width: '90px' }}></div></div>
                <div className="cell"><div className="skeleton skel-btn"></div></div>
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((p, i) => (
              <div key={i} className="data-row">
                <div className="cell instructor-cell">
                  <div className="avatar">{(p.name || "U").charAt(0).toUpperCase()}</div>
                  <div>
                    <span className="mobile-label">Instructor</span>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>{p.email}</div>
                    {p.paymentMethod === "Subscription Bounty" && (
                      <span className="badge bg-warning bg-opacity-10 text-dark border border-warning mt-1" style={{ fontSize: "10px", display: "inline-block" }}>
                        👑 Course Completion Bounty
                      </span>
                    )}
                  </div>
                </div>

                <div className="cell">
                  <span className="mobile-label">Amount</span>
                  <strong style={{ color: earningColor(p.amount) }}>
                    ₹{p.amount.toLocaleString('en-IN')}
                  </strong>
                </div>

                {/* Conditional Column based on Tab */}
                <div className="cell">
                  <span className="mobile-label">{activeTab === "pending" ? "Action" : "Details"}</span>
                  {activeTab === "pending" ? (
                    <button
                      className="process-btn"
                      onClick={() => {
                        setSelectedInstructor(p);
                        setErrorMsg("");
                        setTransactionId("");
                      }}
                    >
                      Pay Now
                    </button>
                  ) : (
                    <div>
                      <span className="status-badge paid">Paid</span>
                      <div style={{ fontSize: "0.75rem", color: "#6c757d", marginTop: "4px" }}>
                        Txn: {p.transactionId || "N/A"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>
                        {p.date ? new Date(p.date).toLocaleDateString() : ""}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-msg">
              {activeTab === "pending"
                ? "No pending payouts match your criteria. All caught up!"
                : "No payout history found."}
            </div>
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
                  className={`search-input ${errorMsg ? "input-error" : ""}`}
                  style={{ width: "100%", marginBottom: "5px", boxSizing: "border-box" }}
                  placeholder="e.g. IMPS1234567890"
                  value={transactionId}
                  onChange={(e) => {
                    setTransactionId(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                />
                {/* Inline Error Message */}
                {errorMsg && <div style={{ color: "#dc3545", fontSize: "0.75rem", marginBottom: "5px" }}>{errorMsg}</div>}

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
        /* ... Keep your existing CSS ... */
        .payouts-container { padding: 20px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; }
        
        /* New CSS for Tabs & Header */
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 15px; }
        .main-title { color: #6f42c1; margin: 0; font-weight: 800; }
        
        .tab-group { display: flex; background: #f8f9fa; border-radius: 8px; padding: 4px; border: 1px solid #e0e0e0; }
        .tab-btn { padding: 8px 20px; border: none; background: transparent; border-radius: 6px; font-weight: 600; color: #6c757d; cursor: pointer; transition: 0.2s; }
        .tab-btn:hover { color: #2d3436; }
        .tab-btn.active { background: white; color: #6f42c1; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

        /* Badge and Input Errors */
        .status-badge.paid { background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
        .input-error { border-color: #dc3545 !important; background-color: #fff8f8; }

        .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
        .summary-label { font-size: 0.85rem; color: #6c757d; font-weight: 600; }
        .summary-value { font-size: 1.6rem; font-weight: 800; color: #2d3436; margin-top: 5px; height: 32px; display: flex; align-items: center; }
        .filter-bar { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 250px; padding: 12px 16px; border-radius: 12px; border: 1px solid #e0e0e0; outline: none; transition: background-color 0.2s; }
        .search-input:disabled { background-color: #f8f9fa; cursor: not-allowed; }
        .month-select { padding: 12px 16px; border-radius: 12px; border: 1px solid #e0e0e0; background: white; cursor: pointer; transition: background-color 0.2s; }
        .month-select:disabled { background-color: #f8f9fa; cursor: not-allowed; }
        .data-wrapper { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow: hidden; }
        
        .data-header { display: grid; grid-template-columns: 2fr 1.5fr 1fr; background: #f8f9fa; padding: 18px; font-weight: 700; color: #6f42c1; border-bottom: 1px solid #eee; }
        .data-row { display: grid; grid-template-columns: 2fr 1.5fr 1fr; padding: 18px; border-bottom: 1px solid #f1f1f1; align-items: center; transition: 0.2s; }
        .data-row:hover { background: #fdfbff; }
        
        .instructor-cell { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: #6f42c1; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
        .mobile-label { display: none; }
        .empty-msg { padding: 40px; text-align: center; color: #b2bec3; }

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

        .skeleton { background: #f1f5f9; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite linear; border-radius: 4px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .skel-text-lg { height: 32px; border-radius: 6px; }
        .skel-text-sm { height: 18px; border-radius: 4px; }
        .skel-text-xs { height: 14px; border-radius: 4px; }
        .skel-avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; }
        .skel-btn { height: 36px; width: 85px; border-radius: 8px; }

        @media (max-width: 850px) {
          .desktop-only { display: none; }
          .data-row { grid-template-columns: 1fr; gap: 12px; padding: 20px; border-bottom: 8px solid #f8f9fa; }
          .cell { display: flex; justify-content: space-between; align-items: center; }
          .mobile-label { display: block; font-size: 0.75rem; color: #b2bec3; text-transform: uppercase; font-weight: 700; width: 120px; flex-shrink: 0; }
          .instructor-cell { border-bottom: 1px solid #f1f1f1; padding-bottom: 10px; margin-bottom: 5px; }
        }
      `}</style>
    </div>
  );
}