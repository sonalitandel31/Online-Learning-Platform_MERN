import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState(null); // Custom Modal State
  const [status, setStatus] = useState({ text: "", type: "" });

  const showStatus = (text, type = "success") => {
    setStatus({ text, type });
    setTimeout(() => setStatus({ text: "", type: "" }), 3000);
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get("/contact");
      setMessages(res.data.data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const resolveMessage = async (id) => {
    try {
      await api.put(`/contact/${id}`);
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, status: "Resolved" } : m))
      );
      showStatus("Message marked as resolved");
    } catch (err) {
      showStatus("Failed to update status", "error");
    }
  };

  const deleteMessage = async (id) => {
    // Replaced window.confirm with silent deletion or custom logic if preferred
    try {
      await api.delete(`/contact/${id}`);
      setMessages((prev) => prev.filter((m) => m._id !== id));
      showStatus("Message deleted successfully");
    } catch (err) {
      showStatus("Delete failed", "error");
    }
  };

  if (loading) return <div className="loader">Loading inbox...</div>;

  return (
    <div className="admin-contact-container">
      {/* Header Section */}
      <div className="header-card">
        <div>
          <h1 className="header-title">Contact Messages</h1>
          <p className="header-subtitle">Manage user inquiries and support tickets</p>
        </div>
        {status.text && (
          <div className={`status-pill ${status.type}`}>{status.text}</div>
        )}
      </div>

      {/* Main Content */}
      <div className="data-card">
        {messages.length === 0 ? (
          <div className="empty-state">No messages currently in your inbox.</div>
        ) : (
          <div className="table-wrapper">
            <div className="table-header desktop-only">
              <div>Sender Info</div>
              <div>Subject</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="table-body">
              {messages.map((msg) => (
                <div key={msg._id} className="table-row">
                  <div className="cell profile-cell">
                    <div className="sender-info">
                      <strong>{msg.name}</strong>
                      <span className="email-text">{msg.email}</span>
                    </div>
                  </div>

                  <div className="cell">
                    <span className="mobile-label">Subject:</span>
                    <span className="subject-text">{msg.subject}</span>
                  </div>

                  <div className="cell">
                    <span className="mobile-label">Status:</span>
                    <span className={`status-badge ${msg.status.toLowerCase()}`}>
                      {msg.status}
                    </span>
                  </div>

                  <div className="cell action-cell">
                    <button className="btn-view" onClick={() => setSelectedMsg(msg)}>
                      View
                    </button>
                    {msg.status === "Pending" && (
                      <button className="btn-resolve" onClick={() => resolveMessage(msg._id)}>
                        Resolve
                      </button>
                    )}
                    <button className="btn-delete" onClick={() => deleteMessage(msg._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Modal for Viewing Message (Replaces alert) */}
      {selectedMsg && (
        <div className="modal-overlay" onClick={() => setSelectedMsg(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMsg.subject}</h3>
              <button className="close-btn" onClick={() => setSelectedMsg(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p><strong>From:</strong> {selectedMsg.name} ({selectedMsg.email})</p>
              <div className="message-content">
                {selectedMsg.message}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-contact-container { padding: 30px; max-width: 1200px; margin: auto; font-family: 'Inter', sans-serif; background: #faf7ff; min-height: 100vh; }
        
        .header-card { background: #f3e8ff; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
        .header-title { color: #6a0dad; font-weight: 800; margin: 0; font-size: 1.8rem; }
        .header-subtitle { opacity: 0.7; margin: 5px 0 0 0; font-size: 0.9rem; }
        
        .status-pill { padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; animation: fadeIn 0.3s; }
        .status-pill.success { background: #dcfce7; color: #166534; }
        .status-pill.error { background: #fee2e2; color: #991b1b; }

        .data-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
        .table-header { display: grid; grid-template-columns: 1.5fr 2fr 1fr 1.5fr; padding: 20px; background: #f8fafc; font-weight: 700; color: #6a0dad; font-size: 0.85rem; }
        .table-row { display: grid; grid-template-columns: 1.5fr 2fr 1fr 1.5fr; padding: 20px; border-bottom: 1px solid #f1f5f9; align-items: center; transition: 0.2s; }
        .table-row:hover { background: #fdfbff; transform: translateY(-2px); }

        .sender-info { display: flex; flex-direction: column; }
        .email-text { font-size: 0.75rem; color: #94a3b8; }
        .subject-text { font-size: 0.9rem; color: #334155; font-weight: 500; }
        
        .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .status-badge.resolved { background: #dcfce7; color: #166534; }
        .status-badge.pending { background: #fef9c3; color: #854d0e; }

        .action-cell { display: flex; gap: 8px; justify-content: flex-end; }
        .btn-view, .btn-resolve, .btn-delete { border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.2s; color: white; }
        .btn-view { background: #6a0dad; }
        .btn-resolve { background: #a855f7; }
        .btn-delete { background: #991b1b; }

        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .modal-header { background: #6a0dad; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 20px; color: #334155; line-height: 1.6; }
        .message-content { margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #6a0dad; white-space: pre-wrap; }
        .close-btn { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }

        .loader, .empty-state { padding: 60px; text-align: center; color: #64748b; font-weight: 600; }

        @media (max-width: 900px) {
          .desktop-only { display: none; }
          .table-row { grid-template-columns: 1fr; gap: 15px; padding: 25px; border-bottom: 8px solid #f8fafc; }
          .cell { display: flex; justify-content: space-between; align-items: center; }
          .mobile-label { display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
          .action-cell { justify-content: flex-start; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          .btn-view, .btn-resolve, .btn-delete { flex: 1; text-align: center; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}