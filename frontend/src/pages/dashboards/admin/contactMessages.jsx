import React, { useEffect, useState } from "react";
import api from "../../../api/api"; // Ensure this path matches your project structure

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [status, setStatus] = useState({ text: "", type: "" });

  const BACKEND_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

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
      await api.put(`/contact/${id}`, { status: "Resolved" });
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, status: "Resolved" } : m))
      );
      showStatus("Message marked as resolved");
    } catch (err) {
      showStatus("Failed to update status", "error");
    }
  };

  const deleteMessage = async (id) => {
    try {
      await api.delete(`/contact/${id}`);
      setMessages((prev) => prev.filter((m) => m._id !== id));
      showStatus("Message deleted successfully");
      if (selectedMsg?._id === id) setSelectedMsg(null);
    } catch (err) {
      showStatus("Delete failed", "error");
    }
  };

  const sendResponse = async (id) => {
    if (!replyText.trim()) return showStatus("Please enter a response", "error");

    try {
      const res = await api.put(`/contact/${id}/respond`, { adminResponse: replyText });
      
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? res.data.data : m))
      );
      
      showStatus("Response saved and message resolved!");
      setSelectedMsg(null);
      setReplyText("");
    } catch (err) {
      showStatus("Failed to send response", "error");
    }
  };

  const isImage = (filename) => {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  return (
    <div className="admin-layout">
      <div className="dashboard-container">
        
        {/* Header Section */}
        <div className="page-header">
          <div className="header-titles">
            <h1 className="main-title">Support Inbox</h1>
            <p className="sub-title">Review and respond to user inquiries.</p>
          </div>
          {status.text && (
            <div className={`toast-message ${status.type}`}>
              {status.type === 'success' ? '✓' : '⚠'} {status.text}
            </div>
          )}
        </div>

        {/* Data Board */}
        <div className="card-container">
          {loading ? (
            /* ✅ Skeleton Loading State */
            <div className="custom-table">
              <div className="th-row desktop-only">
                <div className="th-cell">User</div>
                <div className="th-cell">Subject</div>
                <div className="th-cell">Status</div>
                <div className="th-cell text-right">Actions</div>
              </div>

              <div className="tb-body">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="tr-row">
                    <div className="td-cell profile-wrap">
                      <div className="skeleton skel-avatar"></div>
                      <div className="user-meta">
                        <div className="skeleton skel-text-md"></div>
                        <div className="skeleton skel-text-sm"></div>
                      </div>
                    </div>

                    <div className="td-cell subject-wrap">
                      <span className="mobile-label">Subject</span>
                      <div className="skeleton skel-subject"></div>
                    </div>

                    <div className="td-cell status-wrap">
                      <span className="mobile-label">Status</span>
                      <div className="skeleton skel-pill"></div>
                    </div>

                    <div className="td-cell actions-wrap">
                      <div className="skeleton skel-btn"></div>
                      <div className="skeleton skel-btn"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📬</div>
              <h3>You're all caught up!</h3>
              <p>No new messages in your inbox.</p>
            </div>
          ) : (
            <div className="custom-table">
              <div className="th-row desktop-only">
                <div className="th-cell">User</div>
                <div className="th-cell">Subject</div>
                <div className="th-cell">Status</div>
                <div className="th-cell text-right">Actions</div>
              </div>

              <div className="tb-body">
                {messages.map((msg) => (
                  <div key={msg._id} className="tr-row">
                    
                    <div className="td-cell profile-wrap">
                      <div className="avatar">
                        {msg.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-meta">
                        <span className="user-name">{msg.name}</span>
                        <span className="user-email">{msg.email}</span>
                      </div>
                    </div>

                    <div className="td-cell subject-wrap">
                      <span className="mobile-label">Subject</span>
                      <div className="subject-content">
                        {msg.subject}
                        {msg.attachment && <span className="attach-icon" title="Has attachment">📎</span>}
                      </div>
                    </div>

                    <div className="td-cell status-wrap">
                      <span className="mobile-label">Status</span>
                      <span className={`pill ${msg.status.toLowerCase()}`}>
                        {msg.status}
                      </span>
                    </div>

                    <div className="td-cell actions-wrap">
                      <button className="action-btn view-btn" onClick={() => {
                          setSelectedMsg(msg);
                          setReplyText(""); 
                      }}>
                        Review
                      </button>
                      {msg.status === "Pending" && (
                        <button className="action-btn resolve-btn" onClick={() => resolveMessage(msg._id)}>
                          ✓ Resolve
                        </button>
                      )}
                      <button className="action-btn delete-btn" onClick={() => deleteMessage(msg._id)}>
                        🗑
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Slide-up/Fade-in Modal */}
      {selectedMsg && (
        <div className="modal-backdrop" onClick={() => setSelectedMsg(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-head">
              <div className="modal-head-info">
                <h2>{selectedMsg.subject}</h2>
                <span className={`pill ${selectedMsg.status.toLowerCase()}`}>{selectedMsg.status}</span>
              </div>
              <button className="btn-close" onClick={() => setSelectedMsg(null)}>✕</button>
            </div>
            
            <div className="modal-scroll-area">
              <div className="sender-card">
                <div className="avatar large">{selectedMsg.name.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{selectedMsg.name}</strong>
                  <span className="text-muted d-block">{selectedMsg.email}</span>
                </div>
              </div>
              
              <div className="msg-bubble">
                {selectedMsg.message}
              </div>

              {selectedMsg.attachment && (
                <div className="attachment-section">
                  <p className="section-label">Attached File</p>
                  {isImage(selectedMsg.attachment) ? (
                    <div className="image-preview-box">
                      <img 
                        src={`${BACKEND_URL}/${selectedMsg.attachment.replace(/\\/g, '/')}`} 
                        alt="User Attachment" 
                      />
                    </div>
                  ) : (
                    <a 
                      href={`${BACKEND_URL}/${selectedMsg.attachment.replace(/\\/g, '/')}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="doc-link-box"
                    >
                      <span className="doc-icon">📄</span>
                      <span className="doc-text">View Document</span>
                      <span className="external-icon">↗</span>
                    </a>
                  )}
                </div>
              )}

              <div className="reply-section">
                {selectedMsg.status === "Resolved" && selectedMsg.adminResponse ? (
                  <div className="resolved-reply-box">
                    <p className="section-label text-success">Your Response</p>
                    <div className="reply-text">{selectedMsg.adminResponse}</div>
                  </div>
                ) : (
                  <div className="active-reply-box">
                    <label className="section-label">Write a Response</label>
                    <textarea 
                      className="modern-textarea" 
                      rows="4" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply to the user here..."
                    ></textarea>
                    
                    <div className="reply-actions">
                      <button className="btn-submit-reply" onClick={() => sendResponse(selectedMsg._id)}>
                        Send Response & Resolve
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modern SaaS CSS Styling */}
      <style>{`
        :root {
          --primary: #7c3aed;
          --primary-hover: #6d28d9;
          --bg-main: #f8fafc;
          --bg-card: #ffffff;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --border-color: #e2e8f0;
          --success-bg: #dcfce7;
          --success-text: #166534;
          --warning-bg: #fef3c7;
          --warning-text: #92400e;
          --danger-bg: #fee2e2;
          --danger-text: #991b1b;
          --danger-hover: #fca5a5;
          --radius-lg: 16px;
          --radius-md: 8px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
          --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);
          --shadow-lg: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
        }

        .admin-layout {
          min-height: 100vh;
          background-color: var(--bg-main);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text-main);
          padding: 2rem;
        }

        .dashboard-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        /* Loaders & Empty States */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          color: var(--text-muted);
        }
        
        .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
        .empty-state h3 { margin: 0 0 0.5rem 0; color: var(--text-main); }

        /* Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .main-title { font-size: 1.875rem; font-weight: 700; margin: 0 0 0.25rem 0; letter-spacing: -0.025em; }
        .sub-title { margin: 0; color: var(--text-muted); font-size: 1rem; }

        .toast-message {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: slideDown 0.3s ease-out;
        }
        .toast-message.success { background: var(--success-bg); color: var(--success-text); }
        .toast-message.error { background: var(--danger-bg); color: var(--danger-text); }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* Card & Table */
        .card-container {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .custom-table { width: 100%; display: flex; flex-direction: column; }
        .th-row {
          display: grid;
          grid-template-columns: 1.5fr 2fr 1fr 1.5fr;
          background: #f8fafc;
          border-bottom: 1px solid var(--border-color);
          padding: 1rem 1.5rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .tr-row {
          display: grid;
          grid-template-columns: 1.5fr 2fr 1fr 1.5fr;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          align-items: center;
          transition: background 0.15s ease;
        }
        .tr-row:last-child { border-bottom: none; }
        .tr-row:hover { background: #fdfcff; }

        .text-right { text-align: right; justify-content: flex-end; }

        /* Table Cells */
        .profile-wrap { display: flex; align-items: center; gap: 1rem; }
        .avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: #ede9fe; color: var(--primary);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1rem; flex-shrink: 0;
        }
        .avatar.large { width: 48px; height: 48px; font-size: 1.25rem; }
        .user-meta { display: flex; flex-direction: column; }
        .user-name { font-weight: 600; color: var(--text-main); font-size: 0.95rem; }
        .user-email { color: var(--text-muted); font-size: 0.8rem; }

        .subject-content { font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
        .attach-icon { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; }

        .pill { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
        .pill.resolved { background: var(--success-bg); color: var(--success-text); }
        .pill.pending { background: var(--warning-bg); color: var(--warning-text); }

        .actions-wrap { display: flex; gap: 0.5rem; justify-content: flex-end; }
        .action-btn { 
          border: none; padding: 0.4rem 0.75rem; border-radius: 6px; 
          font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s; 
          background: #f1f5f9; color: var(--text-main);
        }
        .action-btn:hover { background: #e2e8f0; }
        .view-btn { background: #ede9fe; color: var(--primary); }
        .view-btn:hover { background: #ddd6fe; }
        .resolve-btn { background: var(--success-bg); color: var(--success-text); }
        .resolve-btn:hover { background: #bbf7d0; }
        .delete-btn { background: transparent; color: var(--text-muted); padding: 0.4rem; }
        .delete-btn:hover { color: var(--danger-text); background: var(--danger-bg); }

        /* Modal */
        .modal-backdrop {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
          padding: 1rem; animation: fadeIn 0.2s ease-out;
        }
        .modal-box {
          background: var(--bg-card); width: 100%; max-width: 650px;
          border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
          display: flex; flex-direction: column; max-height: 90vh;
          overflow: hidden; animation: scaleUp 0.2s ease-out;
        }
        .modal-head {
          padding: 1.5rem 2rem; border-bottom: 1px solid var(--border-color);
          display: flex; justify-content: space-between; align-items: flex-start;
          background: #f8fafc;
        }
        .modal-head-info h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 700; color: var(--text-main); }
        .btn-close { background: none; border: none; font-size: 1.25rem; color: var(--text-muted); cursor: pointer; padding: 0.25rem; line-height: 1; border-radius: 4px; }
        .btn-close:hover { background: #e2e8f0; color: var(--text-main); }

        .modal-scroll-area { padding: 2rem; overflow-y: auto; }

        .sender-card { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
        .text-muted { color: var(--text-muted); font-size: 0.9rem; }
        .d-block { display: block; margin-top: 0.25rem; }

        .msg-bubble {
          background: #f8fafc; padding: 1.25rem; border-radius: var(--radius-md);
          border: 1px solid var(--border-color); color: #334155; line-height: 1.6;
          white-space: pre-wrap; font-size: 0.95rem; margin-bottom: 1.5rem;
        }

        .section-label { font-size: 0.8rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em; margin: 0 0 0.75rem 0; }
        .text-success { color: var(--success-text); }

        .attachment-section { margin-bottom: 2rem; }
        .image-preview-box { border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: #f1f5f9; padding: 0.5rem; }
        .image-preview-box img { width: 100%; max-height: 350px; object-fit: contain; border-radius: 4px; display: block; }
        
        .doc-link-box {
          display: inline-flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1.25rem; background: var(--bg-card);
          border: 1px solid var(--border-color); border-radius: var(--radius-md);
          text-decoration: none; color: var(--text-main); font-weight: 500;
          transition: all 0.2s; box-shadow: var(--shadow-sm);
        }
        .doc-link-box:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-1px); box-shadow: var(--shadow-md); }
        .external-icon { color: var(--text-muted); font-size: 0.8rem; }

        .reply-section { border-top: 2px dashed var(--border-color); padding-top: 2rem; }
        .resolved-reply-box { background: var(--success-bg); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid #bbf7d0; }
        .reply-text { color: var(--success-text); line-height: 1.6; font-size: 0.95rem; }

        .modern-textarea {
          width: 100%; padding: 1rem; border-radius: var(--radius-md);
          border: 1px solid var(--border-color); font-family: inherit;
          font-size: 0.95rem; line-height: 1.5; outline: none; transition: border-color 0.2s;
          resize: vertical; box-sizing: border-box; margin-bottom: 1rem; background: #fff;
        }
        .modern-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px #ede9fe; }

        .btn-submit-reply {
          background: var(--primary); color: white; border: none;
          padding: 0.75rem 1.5rem; border-radius: var(--radius-md);
          font-weight: 600; font-size: 0.95rem; cursor: pointer;
          transition: background 0.2s; width: 100%;
        }
        .btn-submit-reply:hover { background: var(--primary-hover); }

        /* ✅ Skeleton Animation & Styles */
        .skeleton {
          background: #f1f5f9;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skel-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
        .skel-text-md { width: 120px; height: 16px; margin-bottom: 6px; }
        .skel-text-sm { width: 80px; height: 12px; }
        .skel-subject { width: 80%; height: 16px; }
        .skel-pill { width: 70px; height: 24px; border-radius: 9999px; }
        .skel-btn { width: 60px; height: 30px; border-radius: 6px; }

        /* Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .admin-layout { padding: 1rem; }
          .desktop-only { display: none; }
          .tr-row {
            grid-template-columns: 1fr; gap: 1rem;
            padding: 1.5rem; border-bottom: 4px solid var(--bg-main);
          }
          .td-cell { display: flex; justify-content: space-between; align-items: center; width: 100%; }
          .mobile-label { display: block; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
          .profile-wrap { justify-content: flex-start; }
          .subject-content { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .actions-wrap { justify-content: center; width: 100%; margin-top: 0.5rem; }
          .action-btn { flex: 1; text-align: center; }
          .modal-box { height: 100%; max-height: 100vh; border-radius: 0; }
          .modal-backdrop { padding: 0; }
          
          /* Skeleton Mobile Adjustments */
          .skel-subject { width: 150px; }
          .skel-btn { flex: 1; }
        }
      `}</style>
    </div>
  );
}