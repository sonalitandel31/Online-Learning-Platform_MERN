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
  XCircle,
  CornerDownRight,
  Filter,
  Layers,
  Info,
  MoreVertical,
  ShieldCheck
} from "lucide-react";
import api from "../../../api/api";

const ForumDiscussions = () => {
  const [activeTab, setActiveTab] = useState("discussions");

  // discussions state
  const [questions, setQuestions] = useState([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // replies state (read-only)
  const [repliesByQuestionId, setRepliesByQuestionId] = useState({});
  const [repliesLoading, setRepliesLoading] = useState({});

  // reports state
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportActionId, setReportActionId] = useState(null);
  const [reportStatus, setReportStatus] = useState("pending");
  const [reportSearch, setReportSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  // ------------------- Helpers -------------------
  const safeName = (u) => u?.name || "User";
  const getRepliesForAnswer = (questionId, answerId) => {
    const list = repliesByQuestionId[questionId] || [];
    return list.filter((r) => String(r.answerId) === String(answerId));
  };

  // ------------------- Fetch Logic -------------------
  const fetchAllDiscussions = async () => {
    try {
      setLoadingDiscussions(true);
      const res = await api.get("/forum/admin/questions");
      setQuestions(res.data || []);
    } catch (err) { console.error(err); } finally { setLoadingDiscussions(false); }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await api.get(`/forum/admin/reports?status=${reportStatus}`);
      setReports(res.data || []);
    } catch (err) { console.error(err); } finally { setLoadingReports(false); }
  };

  const fetchRepliesForQuestion = async (questionId) => {
    if (!questionId || repliesByQuestionId[questionId] || repliesLoading[questionId]) return;
    try {
      setRepliesLoading((prev) => ({ ...prev, [questionId]: true }));
      const res = await api.get(`/forum/question/${questionId}/replies`);
      setRepliesByQuestionId((prev) => ({ ...prev, [questionId]: res.data || [] }));
    } catch (err) { console.error(err); } finally { setRepliesLoading((prev) => ({ ...prev, [questionId]: false })); }
  };

  // ------------------- Actions -------------------
  const toggleLock = async (e, questionId, lockState) => {
    e.stopPropagation();
    try {
      setActionLoadingId(questionId);
      await api.put(`/forum/question/${questionId}/lock`, { isLocked: lockState });
      setQuestions((prev) => prev.map((q) => (q._id === questionId ? { ...q, isLocked: lockState } : q)));
    } catch (err) { console.error(err); } finally { setActionLoadingId(null); }
  };

  const deleteThread = async (e, questionId) => {
    e.stopPropagation();
    if (!window.confirm("Soft-delete this thread?")) return;
    try {
      setActionLoadingId(questionId);
      await api.delete(`/forum/question/${questionId}`);
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
      if (expandedId === questionId) setExpandedId(null);
    } catch (err) { console.error(err); } finally { setActionLoadingId(null); }
  };

  const actOnReport = async (reportId, action) => {
    const actionNote = window.prompt("Official Action Note:", "");
    try {
      setReportActionId(reportId);
      await api.put(`/forum/report/${reportId}/action`, { action, actionNote: actionNote || "" });
      await fetchReports();
      if (selectedReport?._id === reportId) setSelectedReport(null);
    } catch (err) { console.error(err); } finally { setReportActionId(null); }
  };

  // ------------------- Memoized Filters -------------------
  const filteredQuestions = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return questions.filter(q =>
      [q.title, q.courseTitle, q.userId?.name, q.asker?.name].join(" ").toLowerCase().includes(s)
    );
  }, [questions, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: filteredQuestions.length,
      open: filteredQuestions.filter(q => !q.isSolved).length,
      locked: filteredQuestions.filter(q => !!q.isLocked).length
    };
  }, [filteredQuestions]);

  const filteredReports = useMemo(() => {
    const s = reportSearch.toLowerCase();
    return reports.filter(r =>
      [r?.reason, r?.targetType, r?.reporterId?.name, r?.targetUserId?.name, r?.courseId?.title].join(" ").toLowerCase().includes(s)
    );
  }, [reports, reportSearch]);

  const groupedReports = useMemo(() => {
    return filteredReports.reduce((acc, r) => {
      const k = r.targetType || "unknown";
      (acc[k] = acc[k] || []).push(r);
      return acc;
    }, {});
  }, [filteredReports]);

  useEffect(() => { activeTab === "reports" ? fetchReports() : fetchAllDiscussions(); }, [activeTab, reportStatus]);

  const handleExpandRow = async (qid) => {
    const next = expandedId === qid ? null : qid;
    setExpandedId(next);
    if (next) await fetchRepliesForQuestion(qid);
  };

  const renderStatusBadge = (statusRaw) => {
    const status = (statusRaw || "pending").toLowerCase();
    const config = {
      pending: "bg-warning text-dark border-warning",
      resolved: "bg-success text-white border-success",
      rejected: "bg-danger text-white border-danger",
    };
    return <span className={`badge rounded-pill px-3 py-1 ${config[status]}`}>{status}</span>;
  };

  return (
    <div className="container-fluid py-4 px-3" style={{ backgroundColor: "#F9FAFB", minHeight: "100vh" }}>
      <style>{`
        :root { --p-main: #7c3aed; --p-soft: #f5f3ff; --y-main: #f59e0b; --y-soft: #fffbeb; }
        .glass-card { background: white; border-radius: 24px; border: 1px solid #eef2f6; box-shadow: 0 10px 30px rgba(124, 58, 237, 0.05); }
        .tab-nav { background: white; padding: 6px; border-radius: 16px; display: inline-flex; border: 1px solid #e2e8f0; }
        .tab-item { border: none; padding: 10px 24px; border-radius: 12px; font-weight: 700; color: #64748b; background: transparent; transition: 0.3s; }
        .tab-item.active { background: var(--p-main); color: white; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2); }
        .stat-card { border-radius: 20px; border: 1px solid #f1f5f9; padding: 20px; background: white; }
        .data-table thead th { background: #f8fafc; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; padding: 16px; border-bottom: 2px solid #f1f5f9; }
        .data-table tbody td { padding: 16px; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
        .action-icon-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: #f1f5f9; color: #64748b; transition: 0.2s; }
        .action-icon-btn:hover { background: var(--p-soft); color: var(--p-main); }
        .btn-delete:hover { background: #fee2e2; color: #ef4444; }
        .expanded-box { background: #fcfcfd; border-radius: 16px; margin: 10px; padding: 20px; border: 1px dashed #cbd5e1; }
        .ans-pill { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; margin-bottom: 8px; }
        .reply-mini { background: #f8fafc; border-radius: 8px; padding: 8px; margin-top: 4px; border: 1px solid #f1f5f9; }
        
        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(30, 27, 75, 0.4); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-card-custom { background: white; width: 100%; max-width: 850px; border-radius: 28px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.15); }
      `}</style>

      {/* Header & Stats */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-800 mb-0" style={{ color: "#1e1b4b" }}>Admin <span style={{ color: "var(--p-main)" }}>Forum</span></h2>
          <p className="text-muted small fw-medium">High-level moderation & platform health</p>
        </div>
        <div className="tab-nav">
          <button className={`tab-item ${activeTab === "discussions" ? "active" : ""}`} onClick={() => setActiveTab("discussions")}>
            Discussions
          </button>
          <button className={`tab-item ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
            <ShieldAlert size={18} className="me-2" /> Reports
            {reports.length > 0 && <span className="ms-2 badge rounded-pill bg-danger shadow-sm">{reports.length}</span>}
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        {activeTab === "discussions" ? (
          <>
            {/* Stats Row */}
            <div className="row g-3 mb-4">
              {[
                { label: "Active Threads", val: stats.open, color: "var(--y-main)", icon: <Clock size={20} /> },
                { label: "Locked Threads", val: stats.locked, color: "#64748b", icon: <Lock size={20} /> },
                { label: "Total Volume", val: stats.total, color: "var(--p-main)", icon: <Layers size={20} /> }
              ].map((s, i) => (
                <div key={i} className="col-md-4">
                  <div className="stat-card d-flex align-items-center gap-3">
                    <div className="p-3 rounded-4" style={{ background: s.color + '15', color: s.color }}>{s.icon}</div>
                    <div>
                      <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>{s.label}</small>
                      <h4 className="mb-0 fw-800">{s.val}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="bg-light p-2 rounded-4 d-flex align-items-center mb-4 border">
              <Search className="ms-3 text-muted" size={18} />
              <input className="form-control border-0 bg-transparent shadow-none" placeholder="Search by title, course or user..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            {loadingDiscussions ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : (
              <div className="table-responsive rounded-4 border overflow-hidden">
                <table className="table data-table mb-0">
                  <thead>
                    <tr>
                      <th className="ps-4">Discussion</th>
                      <th>Status</th>
                      <th className="text-center">Replies</th>
                      <th className="text-end pe-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map(q => (
                      <React.Fragment key={q._id}>
                        <tr onClick={() => handleExpandRow(q._id)} style={{ cursor: 'pointer' }}>
                          <td className="ps-4 text-start">
                            <div className="d-flex align-items-center gap-3">
                              {/* Expand Icon */}
                              <div className={`p-1 rounded ${expandedId === q._id ? 'bg-primary text-white' : 'text-muted'}`}>
                                <ChevronDown
                                  size={16}
                                  style={{ transform: expandedId === q._id ? 'rotate(180deg)' : 'rotate(0)' }}
                                />
                              </div>

                              {/* Text Container: flex-grow-1 pushes this to occupy the left side */}
                              <div className="flex-grow-1 text-start">
                                <div className="fw-bold text-dark mb-0" style={{ fontSize: '0.95rem' }}>
                                  {q.title}
                                </div>
                                <small className="text-muted d-block mt-n1">
                                  {q.courseTitle || "General Forum"}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <span className={`badge rounded-pill px-3 py-1 ${q.isSolved ? 'bg-success-subtle text-success border border-success' : 'bg-warning-subtle text-warning border border-warning'}`}>
                                {q.isSolved ? 'Solved' : 'Active'}
                              </span>
                              {q.isLocked && <span className="badge rounded-pill bg-secondary text-white px-2"><Lock size={12} /></span>}
                            </div>
                          </td>
                          <td className="text-center fw-bold text-muted">{q.answerCount || 0}</td>
                          <td className="text-end pe-4" onClick={e => e.stopPropagation()}>
                            <div className="d-flex justify-content-end gap-2">
                              <button className="action-icon-btn" onClick={(e) => toggleLock(e, q._id, !q.isLocked)} disabled={actionLoadingId === q._id}>
                                {q.isLocked ? <Unlock size={18} /> : <Lock size={18} />}
                              </button>
                              <button className="action-icon-btn btn-delete" onClick={(e) => deleteThread(e, q._id)} disabled={actionLoadingId === q._id}>
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === q._id && (
                          <tr>
                            <td colSpan="4" className="p-0 border-0">
                              <div className="expanded-box shadow-inner">
                                <div className="row g-4">
                                  <div className="col-lg-7">
                                    <h6 className="fw-bold text-primary small text-uppercase mb-2"><Info size={14} /> Thread Content</h6>
                                    <p className="text-muted bg-white p-3 rounded-3 border" style={{ whiteSpace: 'pre-line' }}>{q.description}</p>
                                    <div className="mt-3 d-flex align-items-center justify-content-start gap-2 text-start">
                                      <div className="bg-primary-subtle text-primary p-2 rounded-circle d-flex align-items-center justify-content-center">
                                        <User size={14} />
                                      </div>
                                      <small className="fw-bold text-dark">
                                        Reported By: <span className="text-primary">{safeName(q.userId || q.asker)}</span>
                                      </small>
                                    </div>
                                  </div>
                                  <div className="col-lg-5">
                                    <h6 className="fw-bold text-warning small text-uppercase mb-2"><MessageSquare size={14} /> Response Audit</h6>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                      {(q.answers || []).map(ans => {
                                        const rList = getRepliesForAnswer(q._id, ans._id);
                                        return (
                                          <div key={ans._id} className="ans-pill shadow-sm">
                                            <div className="d-flex justify-content-between mb-1">
                                              <small className="fw-bold text-primary">{safeName(ans.userId)}</small>
                                              {ans.isVerified && <span className="badge bg-warning text-white rounded-pill" style={{ fontSize: '8px' }}>OFFICIAL</span>}
                                            </div>
                                            <div className="small text-muted">{ans.answerText}</div>
                                            {rList.length > 0 && (
                                              <div className="mt-2 ps-2 border-start">
                                                {rList.map(rep => (
                                                  <div key={rep._id} className="reply-mini small">
                                                    <strong>{safeName(rep.userId)}:</strong> {rep.replyText}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* --- REPORTS TAB --- */
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <select className="form-select rounded-4 border-2 shadow-sm fw-bold" value={reportStatus} onChange={e => setReportStatus(e.target.value)}>
                  <option value="pending">Review Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">Full History</option>
                </select>
              </div>
              <div className="col-md-8">
                <div className="bg-white p-1 rounded-4 border-2 border d-flex align-items-center shadow-sm">
                  <Search className="ms-3 text-muted" size={18} />
                  <input className="form-control border-0 bg-transparent shadow-none" placeholder="Filter reports..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} />
                </div>
              </div>
            </div>

            {loadingReports ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : filteredReports.length === 0 ? (
              <div className="alert alert-success border-0 rounded-4 text-center py-4"><CheckCircle2 size={32} className="mb-2" /><h6 className="mb-0">No reports found!</h6></div>
            ) : (
              Object.entries(groupedReports).map(([type, list]) => (
                <div key={type} className="mb-4">
                  <h6 className="fw-800 text-uppercase text-muted small mb-3 border-start border-4 border-primary ps-2">{type} Cases</h6>
                  <div className="table-responsive rounded-4 border overflow-hidden">
                    <table className="table data-table mb-0">
                      <thead className="bg-light">
                        <tr>
                          <th className="ps-4">Target</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Reporter</th>
                          <th className="text-end pe-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map(r => (
                          <tr key={r._id} onClick={() => setSelectedReport(r)} style={{ cursor: 'pointer' }}>
                            <td className="ps-4 text-capitalize fw-bold text-primary">{r.targetType}</td>
                            <td>{r.reason}</td>
                            <td>{renderStatusBadge(r.status)}</td>
                            <td>{safeName(r.reporterId)}</td>
                            <td className="text-end pe-4">
                              <button className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onClick={() => setSelectedReport(r)}>Inspect</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* --- REPORT DETAILS MODAL --- */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-card-custom" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: 'white' }}>
              <div className="d-flex align-items-center gap-3">
                <div className="bg-white text-warning p-2 rounded-3"><ShieldAlert size={24} /></div>
                <div>
                  <h5 className="mb-0 fw-800">Review Investigation</h5>
                  <small className="opacity-75">Ref: {selectedReport._id.slice(-8)} • {selectedReport.status}</small>
                </div>
              </div>
              <button className="btn-close btn-close-white shadow-none" onClick={() => setSelectedReport(null)}></button>
            </div>

            <div className="p-4">
              <div className="row g-4">
                {/* Meta Grid */}
                {[
                  { label: "Reported User", value: selectedReport.targetUserId?.name },
                  { label: "Course Reference", value: selectedReport.courseId?.title },
                  { label: "Reporter", value: selectedReport.reporterId?.name },
                  { label: "Date Filed", value: new Date(selectedReport.createdAt).toLocaleString() }
                ].map((m, i) => (
                  <div key={i} className="col-md-3 col-6">
                    <small className="text-muted fw-bold text-uppercase d-block mb-1" style={{ fontSize: '0.6rem' }}>{m.label}</small>
                    <div className="fw-bold small">{m.value || "N/A"}</div>
                  </div>
                ))}

                {/* Evidence Panel */}
                <div className="col-12 mt-4">
                  <h6 className="fw-800 text-uppercase text-muted small mb-2">Offending Evidence</h6>
                  <div className="p-3 rounded-4 bg-light border-2 border-dashed">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="badge bg-warning text-dark rounded-pill px-3">{selectedReport.targetType?.toUpperCase()}</span>
                      {selectedReport.targetContent?.kind && <span className="small text-muted fw-bold">{selectedReport.targetContent.kind}</span>}
                    </div>
                    {selectedReport.targetContent?.isDeleted ? (
                      <div className="text-center py-3 text-muted">Data purged from database.</div>
                    ) : (
                      <p className="mb-0 text-dark fw-medium" style={{ whiteSpace: 'pre-line' }}>{selectedReport.targetContent?.text}</p>
                    )}
                  </div>
                </div>

                {/* Testimony */}
                {/* <div className="col-12">
                  <h6 className="fw-800 text-uppercase text-muted small mb-2">Reporter Testimony</h6>
                  <div className="p-3 rounded-4 border-start border-4 border-danger bg-danger-subtle fw-bold small">
                    {selectedReport.note || "No specific comments provided."}
                  </div>
                </div> */}

                {/* Auditor History */}
                <div className="col-12 pt-4 border-top">
                  <div className="bg-light p-3 rounded-4 border row g-3">
                    <div className="col-md-6"><small className="text-muted fw-bold">ADMIN CHARGE</small><div className="fw-bold text-primary">{selectedReport.actionBy?.name || "Unassigned"}</div></div>
                    <div className="col-md-6"><small className="text-muted fw-bold">RESOLUTION DATE</small><div className="fw-bold">{selectedReport.actionAt ? new Date(selectedReport.actionAt).toLocaleString() : "Pending"}</div></div>
                    <div className="col-12"><small className="text-muted fw-bold">ACTION LOG</small><div className="bg-white p-2 rounded border small fst-italic">{selectedReport.actionNote || "No final notes documented."}</div></div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="d-flex justify-content-end gap-3 pt-4 border-top mt-4">
                {selectedReport.status === 'pending' ? (
                  <>
                    <button className="btn btn-success px-4 rounded-pill fw-bold" onClick={() => actOnReport(selectedReport._id, 'resolved')}>
                      <CheckCircle2 size={18} className="me-2" /> Resolve Case
                    </button>
                    <button className="btn btn-outline-danger px-4 rounded-pill fw-bold" onClick={() => actOnReport(selectedReport._id, 'rejected')}>
                      <XCircle size={18} className="me-2" /> Discard Report
                    </button>
                  </>
                ) : (
                  <div className="me-auto text-success fw-bold d-flex align-items-center gap-2 small"><ShieldCheck size={18} /> Case Investigative Complete</div>
                )}
                <button className="btn btn-dark px-4 rounded-pill fw-bold" onClick={() => setSelectedReport(null)}>Exit View</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumDiscussions;