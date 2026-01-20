// src/pages/Admin/Forum/ForumDiscussions.jsx
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
  CheckCircle2,
  Clock,
  ShieldAlert,
  RefreshCcw,
  XCircle,
  CornerDownRight,
} from "lucide-react";
import api from "../../../api/api";

const ForumDiscussions = () => {
  const [activeTab, setActiveTab] = useState("discussions"); // discussions | reports

  // discussions
  const [questions, setQuestions] = useState([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // replies (read-only)
  const [repliesByQuestionId, setRepliesByQuestionId] = useState({});
  const [repliesLoading, setRepliesLoading] = useState({}); // qid -> boolean

  // reports
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportActionId, setReportActionId] = useState(null);

  const safeName = (u) => u?.name || "User";

  const getRepliesForAnswer = (questionId, answerId) => {
    const list = repliesByQuestionId[questionId] || [];
    return list.filter((r) => String(r.answerId) === String(answerId));
  };

  // ------------------- Fetch Discussions -------------------
  const fetchAllDiscussions = async () => {
    try {
      setLoadingDiscussions(true);
      const res = await api.get("/forum/admin/questions");
      setQuestions(res.data || []);
    } catch (err) {
      console.error("Admin fetch failed", err);
    } finally {
      setLoadingDiscussions(false);
    }
  };

  // ------------------- Fetch Reports -------------------
  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await api.get("/forum/admin/reports");
      setReports(res.data || []);
    } catch (err) {
      console.error("Failed to fetch admin reports", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchAllDiscussions();
    fetchReports();
  }, []);

  // ------------------- Fetch Replies (lazy, only when expanded) -------------------
  const fetchRepliesForQuestion = async (questionId) => {
    if (!questionId) return;
    if (repliesByQuestionId[questionId]) return; // already cached
    if (repliesLoading[questionId]) return;

    try {
      setRepliesLoading((prev) => ({ ...prev, [questionId]: true }));
      const res = await api.get(`/forum/question/${questionId}/replies`);
      setRepliesByQuestionId((prev) => ({ ...prev, [questionId]: res.data || [] }));
    } catch (err) {
      console.error("Failed to fetch replies for question:", questionId, err);
      setRepliesByQuestionId((prev) => ({ ...prev, [questionId]: [] }));
    } finally {
      setRepliesLoading((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // ------------------- Discussion Actions -------------------
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
    if (!window.confirm("Soft-delete this thread? (It will be hidden from users)")) return;

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

  // ------------------- Reports Actions -------------------
  const actOnReport = async (reportId, action) => {
    const actionNote = window.prompt("Action note (optional):", "");
    try {
      setReportActionId(reportId);
      await api.put(`/forum/report/${reportId}/action`, {
        action,
        actionNote: actionNote || "",
      });
      await fetchReports();
    } catch (err) {
      console.error("Failed to update report", err);
    } finally {
      setReportActionId(null);
    }
  };

  // ------------------- Derived UI -------------------
  const filteredQuestions = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return (questions || []).filter(
      (q) =>
        (q.title || "").toLowerCase().includes(s) ||
        (q.courseTitle || "").toLowerCase().includes(s) ||
        (q.userId?.name || q.asker?.name || "").toLowerCase().includes(s)
    );
  }, [questions, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredQuestions.length;
    const open = filteredQuestions.filter((q) => !q.isSolved).length;
    const locked = filteredQuestions.filter((q) => !!q.isLocked).length;
    return { total, open, locked };
  }, [filteredQuestions]);

  const groupedReports = useMemo(() => {
    const byType = {};
    for (const r of reports) {
      const k = r.targetType || "unknown";
      if (!byType[k]) byType[k] = [];
      byType[k].push(r);
    }
    return byType;
  }, [reports]);

  // Expand handler (lazy fetch replies)
  const handleExpandRow = async (qid) => {
    const next = expandedId === qid ? null : qid;
    setExpandedId(next);

    if (next) {
      await fetchRepliesForQuestion(qid);
    }
  };

  return (
    <div
      className="container-fluid py-4 px-2 px-md-4"
      style={{ backgroundColor: "#f8f9fd", minHeight: "100vh" }}
    >
      <style>{`
        .hub-card { background:#fff; border-radius:18px; border:1px solid #eef0f7; box-shadow:0 10px 30px rgba(82,63,105,0.05); overflow:hidden; }
        .tab-btn { border:0; background:transparent; font-weight:800; padding:12px 16px; border-radius:12px; color:#5e6278; display:inline-flex; align-items:center; gap:8px; }
        .tab-btn.active { background:#f3effb; color:#7e50d3; }
        .search-container { background:#fff; border-radius:12px; padding:0.5rem 1rem; box-shadow:0 4px 12px rgba(0,0,0,0.03); border:1px solid #eef0f7; }
        .forum-card { background:#fff; border-radius:20px; border:1px solid #eef0f7; box-shadow:0 10px 30px rgba(82,63,105,0.05); overflow:hidden; }
        .table thead th { background:#fcfcfd; text-transform:uppercase; font-size:0.7rem; font-weight:700; letter-spacing:1px; color:#a1a5b7; padding:1.25rem 1rem; border-bottom:1px solid #f1f3f9; }
        .table tbody td { padding:1.25rem 1rem; vertical-align:middle; border-bottom:1px solid #f8f9fb; }
        .question-title { color:#1e1e2d; font-weight:800; transition:color 0.2s; }
        .row-hover:hover .question-title { color:#6f42c1; }
        .status-badge { padding:6px 14px; border-radius:8px; font-size:0.75rem; font-weight:800; display:inline-flex; align-items:center; gap:5px; }
        .status-open { background:#fff8dd; color:#ff9900; }
        .status-solved { background:#e8fff3; color:#50cd89; }
        .status-locked { background:#f1f1f2; color:#3f4254; }
        .action-btn { width:38px; height:38px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; transition:all 0.2s; background:#f5f8fa; color:#5e6278; }
        .btn-lock-toggle:hover { background:#fff8dd; color:#ff9900; }
        .btn-delete-thread:hover { background:#fff5f8; color:#f1416c; }
        .expanded-content-box { background:#f9f9fc; border-radius:12px; padding:1.5rem; margin:0.5rem 1rem 1.5rem 1rem; border:1px dashed #e4e6ef; }
        .pulse-icon { animation:pulse 2s infinite; width:8px; height:8px; border-radius:50%; background:currentColor; }
        @keyframes pulse {
          0% { transform:scale(0.95); box-shadow:0 0 0 0 rgba(255,153,0,0.7); }
          70% { transform:scale(1); box-shadow:0 0 0 10px rgba(255,153,0,0); }
          100% { transform:scale(0.95); box-shadow:0 0 0 0 rgba(255,153,0,0); }
        }
        .mini-btn { border-radius:12px; font-weight:800; padding:0.55rem 0.9rem; }

        .reply-card {
          background: #fff;
          border: 1px solid #eef0f7;
          border-radius: 10px;
          padding: 10px;
          margin-top: 8px;
        }
      `}</style>

      {/* Header + Tabs */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
        <div>
          <h3 className="fw-bolder mb-1" style={{ color: "#1e1e2d" }}>
            Admin Forum
          </h3>
          <div className="text-muted fw-medium">Moderate discussions and handle reports.</div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className={`tab-btn ${activeTab === "discussions" ? "active" : ""}`}
            onClick={() => setActiveTab("discussions")}
          >
            Discussions
          </button>

          <button
            className={`tab-btn ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            <ShieldAlert size={18} /> Reports
            {reports?.length > 0 && (
              <span className="badge rounded-pill bg-danger ms-1">{reports.length}</span>
            )}
          </button>

          {/* <button
            className="btn btn-outline-primary mini-btn d-flex align-items-center gap-2"
            onClick={() => {
              fetchAllDiscussions();
              fetchReports();
            }}
            title="Refresh"
          >
            <RefreshCcw size={16} /> Refresh
          </button> */}
        </div>
      </div>

      <div className="hub-card p-3 p-md-4">
        {/* ------------------- TAB: DISCUSSIONS ------------------- */}
        {activeTab === "discussions" && (
          <>
            {/* Top controls */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
              <div className="d-flex gap-3 flex-wrap">
                <div className="forum-card p-3" style={{ minWidth: 180 }}>
                  <div className="text-muted small fw-bold text-uppercase mb-1">Open</div>
                  <div className="h3 fw-bolder mb-0">{stats.open}</div>
                </div>
                <div className="forum-card p-3" style={{ minWidth: 180 }}>
                  <div className="text-muted small fw-bold text-uppercase mb-1">Locked</div>
                  <div className="h3 fw-bolder mb-0">{stats.locked}</div>
                </div>
                <div className="forum-card p-3" style={{ minWidth: 180 }}>
                  <div className="text-muted small fw-bold text-uppercase mb-1">Total</div>
                  <div className="h3 fw-bolder mb-0 text-primary">{stats.total}</div>
                </div>
              </div>

              <div className="search-container d-flex align-items-center gap-2">
                <Search size={18} className="text-muted" />
                <input
                  className="border-0 shadow-none outline-none"
                  style={{ outline: "none" }}
                  placeholder="Filter threads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loadingDiscussions ? (
              <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
                <div className="spinner-grow text-primary" role="status" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-3 text-muted fw-medium">Loading discussions...</p>
              </div>
            ) : (
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
                              <p className="small text-muted">Try adjusting your search.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredQuestions.map((q) => (
                          <React.Fragment key={q._id}>
                            <tr
                              className="row-hover cursor-pointer"
                              onClick={() => handleExpandRow(q._id)}
                              style={{ cursor: "pointer" }}
                            >
                              <td className="ps-4">
                                <div className="d-flex align-items-center gap-3">
                                  <div
                                    className={`p-2 rounded-3 ${
                                      expandedId === q._id ? "bg-primary text-white" : "bg-light text-muted"
                                    }`}
                                    style={{ transition: "0.3s" }}
                                  >
                                    <ChevronDown
                                      size={18}
                                      style={{
                                        transform: expandedId === q._id ? "rotate(180deg)" : "rotate(0)",
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <div className="question-title mb-1">{q.title}</div>
                                    <div className="text-muted small fw-medium">{q.courseTitle || "General Forum"}</div>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <div className="d-flex gap-2">
                                  <span className={`status-badge ${q.isSolved ? "status-solved" : "status-open"}`}>
                                    {!q.isSolved && <span className="pulse-icon"></span>}
                                    {q.isSolved ? <CheckCircle2 size={14} /> : <Clock size={14} />}
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
                                    title="Delete"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded */}
                            {expandedId === q._id && (
                              <tr>
                                <td colSpan="4" className="p-0 border-0">
                                  <div className="expanded-content-box">
                                    <div className="row g-4">
                                      {/* Question */}
                                      <div className="col-lg-7 border-end-lg">
                                        <h6 className="fw-bold text-uppercase small text-muted mb-3">
                                          Question Description
                                        </h6>
                                        <p className="text-dark lh-base mb-3" style={{ fontSize: "0.925rem" }}>
                                          {q.description || "No description provided."}
                                        </p>

                                        <div className="d-flex align-items-center gap-2 mt-4 text-muted">
                                          <div className="bg-white rounded-circle p-2 border">
                                            <User size={16} />
                                          </div>
                                          <span className="small">
                                            Asked by{" "}
                                            <strong className="text-dark">
                                              {q.userId?.name || q.asker?.name || "Anonymous"}
                                            </strong>
                                          </span>
                                        </div>

                                        {/* Replies load status */}
                                        <div className="mt-3 small text-muted">
                                          {repliesLoading[q._id]
                                            ? "Loading replies..."
                                            : repliesByQuestionId[q._id]
                                            ? `Replies loaded: ${(repliesByQuestionId[q._id] || []).length}`
                                            : "Replies not loaded yet."}
                                        </div>
                                      </div>

                                      {/* Answers + Replies */}
                                      <div className="col-lg-5">
                                        <h6 className="fw-bold text-uppercase small text-muted mb-3">
                                          Responses ({q.answers?.length || 0})
                                        </h6>

                                        <div className="pe-2" style={{ maxHeight: "320px", overflowY: "auto" }}>
                                          {(q.answers || []).map((ans) => {
                                            const repList = getRepliesForAnswer(q._id, ans._id);

                                            return (
                                              <div key={ans._id} className="bg-white p-3 rounded-3 border mb-2 shadow-sm">
                                                <div className="d-flex justify-content-between mb-1">
                                                  <span className="fw-bold small text-primary">{safeName(ans.userId)}</span>
                                                  <div className="d-flex gap-2">
                                                    {ans.isAccepted && (
                                                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle small px-2">
                                                        Accepted
                                                      </span>
                                                    )}
                                                    {ans.isVerified && (
                                                      <span className="badge bg-success-subtle text-success border border-success-subtle small px-2">
                                                        Verified
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>

                                                <p className="small text-muted mb-0" style={{ whiteSpace: "pre-line" }}>
                                                  {ans.answerText}
                                                </p>

                                                {/* Replies under this answer (READ-ONLY) */}
                                                <div className="mt-2">
                                                  <div className="d-flex align-items-center gap-2 text-muted small fw-bold">
                                                    <CornerDownRight size={14} />
                                                    Replies ({repList.length})
                                                  </div>

                                                  {repliesLoading[q._id] ? (
                                                    <div className="small text-muted mt-2">Loading...</div>
                                                  ) : repList.length === 0 ? (
                                                    <div className="small text-muted mt-2">No replies for this answer.</div>
                                                  ) : (
                                                    repList.map((rep) => (
                                                      <div key={rep._id} className="reply-card">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                          <span className="small fw-bold text-primary">
                                                            {safeName(rep.userId)}
                                                          </span>
                                                          <span className="small text-muted">
                                                            {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ""}
                                                          </span>
                                                        </div>
                                                        <div className="small text-muted" style={{ whiteSpace: "pre-line" }}>
                                                          {rep.replyText}
                                                        </div>
                                                      </div>
                                                    ))
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}

                                          {(!q.answers || q.answers.length === 0) && (
                                            <div className="text-center py-4 text-muted small">No answers yet</div>
                                          )}
                                        </div>

                                        {/*
                                        <div className="mt-2 d-flex justify-content-end">
                                          <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => {
                                              // force refresh: clear cache and refetch
                                              setRepliesByQuestionId((prev) => {
                                                const next = { ...prev };
                                                delete next[q._id];
                                                return next;
                                              });
                                              fetchRepliesForQuestion(q._id);
                                            }}
                                          >
                                            Reload Replies
                                          </button>
                                        </div> */}
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
            )}
          </>
        )}

        {/* ------------------- TAB: REPORTS ------------------- */}
        {activeTab === "reports" && (
          <>
            {loadingReports ? (
              <div className="d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : reports.length === 0 ? (
              <div className="alert alert-success rounded-4 m-0">No pending reports.</div>
            ) : (
              Object.entries(groupedReports).map(([type, list]) => (
                <div key={type} className="mb-4">
                  <h6 className="text-uppercase text-muted fw-bold mb-2">{type} reports</h6>

                  <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                      <table className="table mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Reason</th>
                            <th>Reporter</th>
                            <th>Note</th>
                            <th>Created</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((r) => (
                            <tr key={r._id}>
                              <td className="fw-bold">{r.reason}</td>
                              <td>{r.reporterId?.name || "User"}</td>
                              <td className="text-muted">{r.note || "-"}</td>
                              <td className="text-muted">{new Date(r.createdAt).toLocaleString()}</td>
                              <td className="text-end">
                                <div className="d-flex justify-content-end gap-2">
                                  <button
                                    className="btn btn-sm btn-success rounded-pill d-flex align-items-center gap-1"
                                    disabled={reportActionId === r._id}
                                    onClick={() => actOnReport(r._id, "resolved")}
                                  >
                                    <CheckCircle2 size={16} /> Resolve
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-1"
                                    disabled={reportActionId === r._id}
                                    onClick={() => actOnReport(r._id, "rejected")}
                                  >
                                    <XCircle size={16} /> Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ForumDiscussions;
