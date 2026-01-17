import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { FaSearch, FaPaperPlane, FaRedoAlt, FaPlusCircle, FaHistory } from "react-icons/fa";

export default function RequestCategory() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [checking, setChecking] = useState(false);
  const [existsMessage, setExistsMessage] = useState("");
  const [search, setSearch] = useState("");

  const colors = {
    primary: "#6d28d9",
    bg: "#f8fafc",
    cardBg: "#ffffff",
    border: "#e2e8f0",
    text: "#1e293b",
    approved: "#10b981",
    pending: "#f59e0b",
    rejected: "#ef4444"
  };

  const fetchMyRequests = async () => {
    try {
      const res = await api.get("/categories/my-requests");
      setMyRequests(res.data);
    } catch (err) { console.error(err); }
  };

  const checkCategoryExists = async (value) => {
    if (!value.trim()) { setExistsMessage(""); return; }
    setChecking(true);
    try {
      const res = await api.get(`/categories/check?name=${value}`);
      setExistsMessage(res.data.exists ? "Already exists!" : "Available");
    } catch { setExistsMessage(""); }
    setChecking(false);
  };

  const submitRequest = async () => {
    if (!name.trim()) return setMessage("Please enter a category name");
    setLoading(true);
    setMessage("");
    try {
      await api.post("/categories/request", { name });
      setMessage("Success: Request submitted!");
      setName("");
      setExistsMessage("");
      fetchMyRequests();
    } catch (error) {
      setMessage(error.response?.data?.message || "Error: Something went wrong");
    }
    setLoading(false);
  };

  const reRequest = async (catName) => {
    setLoading(true);
    try {
      await api.post("/categories/request", { name: catName });
      setMessage("Success: Re-submitted!");
      fetchMyRequests();
    } catch (error) {
      setMessage("Error: Something went wrong");
    }
    setLoading(false);
  };

  useEffect(() => { fetchMyRequests(); }, []);

  return (
    <div className="req-cat-container">
      <style>{`
        .req-cat-container { background: ${colors.bg}; min-height: 100vh; padding: 15px; font-family: sans-serif; }
        .req-card { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid ${colors.border}; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .header-title { color: ${colors.primary}; font-weight: 800; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        
        /* Form Layout */
        .form-flex { display: flex; flex-direction: column; gap: 12px; }
        .input-box { width: 100%; padding: 12px; border-radius: 8px; border: 2px solid ${colors.border}; outline: none; font-size: 16px; box-sizing: border-box; }
        .submit-btn { width: 100%; padding: 12px; background: ${colors.primary}; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        
        /* Table vs Mobile Cards */
        .desktop-table { display: none; width: 100%; border-collapse: collapse; margin-top: 10px; }
        .desktop-table th { text-align: left; padding: 12px; color: #64748b; border-bottom: 2px solid ${colors.border}; }
        .desktop-table td { padding: 12px; border-bottom: 1px solid ${colors.border}; }
        
        .mobile-list { display: flex; flex-direction: column; gap: 10px; }
        .mobile-item { padding: 15px; border: 1px solid ${colors.border}; border-radius: 10px; background: #fff; }

        @media (min-width: 768px) {
          .req-cat-container { padding: 30px; }
          .form-flex { flex-direction: row; align-items: flex-start; }
          .submit-btn { width: auto; min-width: 180px; }
          .desktop-table { display: table; }
          .mobile-list { display: none; }
        }
      `}</style>

      <h2 className="header-title">Request New Category</h2>

      <div className="req-card">
        <div className="form-flex">
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="input-box"
              placeholder="e.g. Data Science"
              style={{
                borderColor: existsMessage.includes("Available") ? colors.approved : (existsMessage.includes("exists") ? colors.rejected : colors.border)
              }}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                checkCategoryExists(e.target.value);
              }}
            />
            {existsMessage && (
              <span style={{ fontSize: "0.8rem", fontWeight: "700", marginLeft: "5px", color: existsMessage.includes("Available") ? colors.approved : colors.rejected }}>
                {existsMessage}
              </span>
            )}
          </div>
          <button className="submit-btn" onClick={submitRequest} disabled={loading || existsMessage.includes("exists")}>
            <FaPaperPlane /> {loading ? "..." : "Submit"}
          </button>
        </div>

        {message && (
          <div style={{ marginTop: "15px", padding: "10px", borderRadius: "8px", fontSize: "0.9rem", textAlign: "center", background: message.includes("Success") ? "#dcfce7" : "#fee2e2", color: message.includes("Success") ? "#166534" : "#991b1b", border: "1px solid currentColor" }}>
            {message}
          </div>
        )}
      </div>

      <div className="req-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}><FaHistory /> Request History</h3>
          <div style={{ position: "relative", width: "100%", maxWidth: "250px" }}>
            <FaSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Filter..."
              style={{ width: "100%", padding: "8px 8px 8px 35px", borderRadius: "6px", border: `1px solid ${colors.border}` }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE FOR DESKTOP */}
        <table className="desktop-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {myRequests.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(cat => (
              <tr key={cat._id}>
                <td style={{ fontWeight: "600" }}>{cat.name}</td>
                <td>
                  <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", color: "#fff", background: cat.status === "approved" ? colors.approved : (cat.status === "pending" ? colors.pending : colors.rejected) }}>
                    {cat.status}
                  </span>
                </td>
                <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{new Date(cat.createdAt).toLocaleDateString()}</td>
                <td>
                  {cat.status === "rejected" && (
                    <button onClick={() => reRequest(cat.name)} style={{ border: "none", background: "none", color: colors.primary, cursor: "pointer" }}>
                      <FaRedoAlt />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* CARDS FOR MOBILE */}
        <div className="mobile-list">
          {myRequests.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8" }}>No requests found.</p>
          ) : (
            myRequests.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(cat => (
              <div key={cat._id} className="mobile-item">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontWeight: "700" }}>{cat.name}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: "800", color: cat.status === "approved" ? colors.approved : (cat.status === "pending" ? colors.pending : colors.rejected) }}>
                    {cat.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#64748b" }}>
                  <span>{new Date(cat.createdAt).toLocaleDateString()}</span>
                  {cat.status === "rejected" && (
                    <button onClick={() => reRequest(cat.name)} style={{ background: colors.primary, color: "#fff", border: "none", padding: "5px 10px", borderRadius: "5px", fontSize: "0.75rem" }}>
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}