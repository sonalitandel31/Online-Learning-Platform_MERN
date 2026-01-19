import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  Lock,
  Unlock,
  Trash2,
  MessageSquare,
  User,
  AlertCircle,
  Filter,
  CheckCircle2,
  Clock
} from "lucide-react";
import api from "../../../api/api";

const ForumDiscussions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchAllDiscussions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/forum/admin/questions");
      setQuestions(res.data || []);
    } catch (err) {
      console.error("Admin fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDiscussions();
  }, []);

  const toggleLock = async (e, questionId, lockState) => {
    e.stopPropagation();
    try {
      setActionLoadingId(questionId);
      await api.put(`/forum/question/${questionId}/lock`, { isLocked: lockState });
      setQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? { ...q, isLocked: lockState } : q))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteThread = async (e, questionId) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this thread?")) return;
    try {
      setActionLoadingId(questionId);
      await api.delete(`/forum/question/${questionId}`);
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
      if (expandedId === questionId) setExpandedId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredQuestions = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return questions.filter(
      (q) =>
        (q.title || "").toLowerCase().includes(s) ||
        (q.courseTitle || "").toLowerCase().includes(s)
    );
  }, [questions, searchTerm]);

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
        <p className="mt-3 text-muted fw-medium">Loading discussions...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-5 px-3 px-lg-5" style={{ backgroundColor: "#f8f9fd", minHeight: "100vh" }}>
      <style>{`
        .mod-header { margin-bottom: 2rem; }
        .mod-title { font-weight: 800; color: #1e1e2d; font-size: 1.75rem; }
        
        .search-container {
          background: #fff;
          border-radius: 12px;
          padding: 0.5rem 1rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          border: 1px solid #eef0f7;
        }

        .forum-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #eef0f7;
          box-shadow: 0 10px 30px rgba(82, 63, 105, 0.05);
          overflow: hidden;
        }

        .table thead th {
          background: #fcfcfd;
          text-transform: uppercase;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1px;
          color: #a1a5b7;
          padding: 1.25rem 1rem;
          border-bottom: 1px solid #f1f3f9;
        }

        .table tbody td { padding: 1.25rem 1rem; vertical-align: middle; border-bottom: 1px solid #f8f9fb; }
        
        .question-title { color: #1e1e2d; font-weight: 700; transition: color 0.2s; }
        .row-hover:hover .question-title { color: #6f42c1; }

        .status-badge {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .status-open { background: #fff8dd; color: #ff9900; }
        .status-solved { background: #e8fff3; color: #50cd89; }
        .status-locked { background: #f1f1f2; color: #3f4254; }

        .action-btn {
          width: 38px; height: 38px;
          border-radius: 10px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          background: #f5f8fa;
          color: #5e6278;
        }
        .btn-lock-toggle:hover { background: #fff8dd; color: #ff9900; }
        .btn-delete-thread:hover { background: #fff5f8; color: #f1416c; }

        .expanded-content-box {
          background: #f9f9fc;
          border-radius: 12px;
          padding: 1.5rem;
          margin: 0.5rem 1rem 1.5rem 1rem;
          border: 1px dashed #e4e6ef;
        }

        .pulse-icon {
          animation: pulse 2s infinite;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: currentColor;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 153, 0, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 153, 0, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 153, 0, 0); }
        }
      `}</style>

      {/* Header Section */}
      <div className="mod-header d-md-flex align-items-center justify-content-between">
        <div>
          <h1 className="mod-title mb-1">Forum Moderation</h1>
          <p className="text-muted mb-0 fw-medium">Manage discussions and maintain community quality.</p>
        </div>
        <div className="mt-3 mt-md-0 d-flex gap-2">
           <div className="search-container d-flex align-items-center gap-2">
            <Search size={18} className="text-muted" />
            <input 
              className="border-0 shadow-none outline-none" 
              style={{ outline: 'none' }}
              placeholder="Filter threads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
           </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="forum-card p-4">
            <div className="text-muted small fw-bold text-uppercase mb-1">Open Discussions</div>
            <div className="h2 fw-bolder mb-0">{filteredQuestions.filter(q => !q.isSolved).length}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="forum-card p-4">
            <div className="text-muted small fw-bold text-uppercase mb-1">Total Threads</div>
            <div className="h2 fw-bolder mb-0 text-primary">{filteredQuestions.length}</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="forum-card">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr>
                <th className="ps-4">Discussion Detail</th>
                <th>Status</th>
                <th className="text-center">Engagement</th>
                <th className="text-end pe-4">Control</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-5">
                    <div className="py-4">
                      <AlertCircle size={48} className="text-muted mb-3 opacity-25" />
                      <h5 className="text-muted fw-bold">No results found</h5>
                      <p className="small text-muted">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q) => (
                  <React.Fragment key={q._id}>
                    <tr 
                      className="row-hover cursor-pointer" 
                      onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <div className={`p-2 rounded-3 ${expandedId === q._id ? 'bg-primary text-white' : 'bg-light text-muted'}`} style={{ transition: '0.3s' }}>
                            <ChevronDown size={18} style={{ transform: expandedId === q._id ? 'rotate(180deg)' : 'rotate(0)' }} />
                          </div>
                          <div>
                            <div className="question-title mb-1">{q.title}</div>
                            <div className="text-muted small fw-medium">{q.courseTitle || "General Forum"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <span className={`status-badge ${q.isSolved ? 'status-solved' : 'status-open'}`}>
                            {!q.isSolved && <span className="pulse-icon"></span>}
                            {q.isSolved ? <CheckCircle2 size={14}/> : <Clock size={14}/>}
                            {q.isSolved ? "Solved" : "Active"}
                          </span>
                          {q.isLocked && (
                            <span className="status-badge status-locked">
                              <Lock size={12} /> Locked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-light fw-bold text-dark small">
                          <MessageSquare size={14} className="text-muted" />
                          {q.answerCount || 0}
                        </div>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-2">
                          <button 
                            className="action-btn btn-lock-toggle"
                            onClick={(e) => toggleLock(e, q._id, !q.isLocked)}
                            disabled={actionLoadingId === q._id}
                            title={q.isLocked ? "Unlock" : "Lock"}
                          >
                            {q.isLocked ? <Unlock size={18} /> : <Lock size={18} />}
                          </button>
                          <button 
                            className="action-btn btn-delete-thread"
                            onClick={(e) => deleteThread(e, q._id)}
                            disabled={actionLoadingId === q._id}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Preview Section */}
                    {expandedId === q._id && (
                      <tr>
                        <td colSpan="4" className="p-0 border-0">
                          <div className="expanded-content-box">
                            <div className="row g-4">
                              <div className="col-lg-7 border-end-lg">
                                <h6 className="fw-bold text-uppercase small text-muted mb-3">Question Description</h6>
                                <p className="text-dark lh-base mb-3" style={{ fontSize: '0.925rem' }}>
                                  {q.description || "No description provided."}
                                </p>
                                <div className="d-flex align-items-center gap-2 mt-4 text-muted">
                                  <div className="bg-white rounded-circle p-2 border">
                                    <User size={16} />
                                  </div>
                                  <span className="small">Asked by <strong className="text-dark">{q.userId?.name || "Anonymous"}</strong></span>
                                </div>
                              </div>
                              <div className="col-lg-5">
                                <h6 className="fw-bold text-uppercase small text-muted mb-3">Latest Responses ({q.answers?.length || 0})</h6>
                                <div className="pe-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                  {q.answers?.map((ans, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-3 border mb-2 shadow-sm">
                                      <div className="d-flex justify-content-between mb-1">
                                        <span className="fw-bold small text-primary">{ans.userId?.name}</span>
                                        {ans.isVerified && <span className="badge bg-success-subtle text-success border border-success-subtle small px-2">Verified</span>}
                                      </div>
                                      <p className="small text-muted mb-0 text-truncate-2">{ans.answerText}</p>
                                    </div>
                                  ))}
                                  {(!q.answers || q.answers.length === 0) && (
                                    <div className="text-center py-4 text-muted small">No replies yet</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ForumDiscussions;