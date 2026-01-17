import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import moment from "moment";

export default function CategorySuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ text: "", type: "" }); // Inline feedback
  const [search, setSearch] = useState("");
  const [rejectingId, setRejectingId] = useState(null); // Inline confirmation

  const showStatus = (text, type = "success") => {
    setStatus({ text, type });
    setTimeout(() => setStatus({ text: "", type: "" }), 3000);
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories/pending");
      setSuggestions(res.data);
      setFiltered(res.data);
    } catch (err) {
      showStatus("Failed to load suggestions", "error");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    try {
      await api.put(`/categories/approve/${id}`);
      showStatus("Category approved and added!");
      fetchSuggestions();
    } catch {
      showStatus("Approval failed", "error");
    }
  };

  const reject = async (id) => {
    try {
      await api.put(`/categories/reject/${id}`);
      showStatus("Suggestion rejected", "error");
      setRejectingId(null);
      fetchSuggestions();
    } catch {
      showStatus("Action failed", "error");
    }
  };

  const onSearch = (text) => {
    setSearch(text);
    const filteredList = suggestions.filter((s) =>
      s.name.toLowerCase().includes(text.toLowerCase())
    );
    setFiltered(filteredList);
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return (
    <div className="suggestions-container">
      <div className="header-flex">
        <h2 className="title">Category Suggestions</h2>
        {status.text && (
          <div className={`status-pill ${status.type}`}>
            {status.text}
          </div>
        )}
      </div>

      <div className="action-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search suggestions..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <div className="table-header desktop-only">
          <div>Suggested Name</div>
          <div>Suggested By</div>
          <div>Date</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        <div className="table-body">
          {!loading && filtered.length === 0 ? (
            <div className="empty-state">🎉 No pending suggestions!</div>
          ) : (
            filtered.map((cat) => (
              <div key={cat._id} className="table-row">
                <div className="cell name-cell">
                  <span className="mobile-label">Name:</span>
                  <strong>{cat.name}</strong>
                </div>

                <div className="cell user-cell">
                  <span className="mobile-label">By:</span>
                  <div>
                    <span className="user-name">{cat.suggestedBy?.name || "Unknown"}</span>
                    <span className="user-email">{cat.suggestedBy?.email}</span>
                  </div>
                </div>

                <div className="cell">
                  <span className="mobile-label">Requested:</span>
                  <span className="date-text">{moment(cat.createdAt).fromNow()}</span>
                </div>

                <div className="cell actions-cell">
                  {rejectingId === cat._id ? (
                    <div className="confirm-box">
                      <span>Reject?</span>
                      <button className="btn-confirm" onClick={() => reject(cat._id)}>Yes</button>
                      <button className="btn-cancel" onClick={() => setRejectingId(null)}>No</button>
                    </div>
                  ) : (
                    <div className="btn-group">
                      <button className="btn-approve" onClick={() => approve(cat._id)}>
                        Approve
                      </button>
                      <button className="btn-reject" onClick={() => setRejectingId(cat._id)}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .suggestions-container { background: #fff; padding: 20px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); font-family: 'Inter', sans-serif; max-width: 1100px; margin: auto; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; gap: 10px; }
        .title { color: #2d3436; font-weight: 800; margin: 0; font-size: 1.4rem; }

        .status-pill { padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; animation: slideDown 0.3s ease; }
        .status-pill.success { background: #e6fffa; color: #2c7a7b; border: 1px solid #b2f5ea; }
        .status-pill.error { background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; }

        .action-bar { display: flex; gap: 10px; margin-bottom: 20px; }
        .search-input { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #edf2f7; outline: none; }
        .btn-refresh { background: #6f42c1; color: white; border: none; padding: 0 15px; border-radius: 10px; font-weight: 600; cursor: pointer; }

        .table-wrapper { border: 1px solid #edf2f7; border-radius: 12px; overflow: hidden; }
        .table-header { display: grid; grid-template-columns: 1.5fr 1.5fr 1fr 1.2fr; background: #f7fafc; padding: 15px; font-weight: 700; color: #718096; font-size: 0.85rem; }
        .table-row { display: grid; grid-template-columns: 1.5fr 1.5fr 1fr 1.2fr; padding: 15px; border-bottom: 1px solid #edf2f7; align-items: center; transition: 0.2s; }
        .table-row:hover { background: #fdfbff; }

        .user-name { display: block; font-weight: 600; color: #2d3436; font-size: 0.9rem; }
        .user-email { font-size: 0.75rem; color: #718096; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        .date-text { font-size: 0.85rem; color: #4a5568; }

        .btn-group { display: flex; gap: 8px; justify-content: flex-end; }
        .btn-approve { background: #38a169; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .btn-reject { background: #edf2f7; color: #e53e3e; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        
        .confirm-box { display: flex; align-items: center; gap: 5px; background: #fff5f5; padding: 4px 8px; border-radius: 6px; border: 1px solid #feb2b2; }
        .confirm-box span { font-size: 0.75rem; font-weight: 700; color: #c53030; }
        .btn-confirm { background: #e53e3e; color: white; border: none; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; }
        .btn-cancel { background: #718096; color: white; border: none; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; }

        .empty-state { padding: 40px; text-align: center; color: #a0aec0; }
        .mobile-label { display: none; }

        @media (max-width: 800px) {
          .table-header.desktop-only { display: none; }
          .table-row { grid-template-columns: 1fr; gap: 10px; border-bottom: 6px solid #f7fafc; }
          .cell { display: flex; justify-content: space-between; align-items: center; }
          .mobile-label { display: block; font-weight: 700; color: #a0aec0; font-size: 0.7rem; text-transform: uppercase; }
          .btn-group { width: 100%; margin-top: 10px; }
          .btn-approve, .btn-reject { flex: 1; padding: 10px; }
        }

        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}