import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle, User, BookOpen, Send, ShieldCheck, ChevronDown, ChevronUp,
  Lock, Unlock, ShieldAlert, CheckCircle2, XCircle, CornerDownRight,
  Search, Filter, Clock, Info, Hash, MessageSquare, AlertCircle,
  Award, Bell, Sparkles
} from "lucide-react";
import api from "../../../api/api";

const CourseDiscussions = () => {
  const [activeTab, setActiveTab] = useState("discussions");
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [draftAnswers, setDraftAnswers] = useState({});
  const [repliesByQuestionId, setRepliesByQuestionId] = useState({});
  const [repliesLoading, setRepliesLoading] = useState({});
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [reportStatus, setReportStatus] = useState("pending");
  const [reportSearch, setReportSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const safeName = (u) => u?.name || "User";

  // ------------------- LOGIC -------------------
  const fetchDiscussions = async () => {
    try {
      setLoadingDiscussions(true);
      const res = await api.get("/forum/instructor/questions");
      const groups = (res.data || []).reduce((acc, q) => {
        const courseName = q.courseTitle || "Other Discussions";
        if (!acc[courseName]) acc[courseName] = [];
        acc[courseName].push(q);
        return acc;
      }, {});
      setGroupedQuestions(groups);
    } catch (err) { console.error(err); } finally { setLoadingDiscussions(false); }
  };

  const fetchRepliesForQuestion = async (qId) => {
    if (!qId || repliesLoading[qId]) return;
    try {
      setRepliesLoading(p => ({ ...p, [qId]: true }));
      const res = await api.get(`/forum/question/${qId}/replies`);
      setRepliesByQuestionId(p => ({ ...p, [qId]: res.data || [] }));
    } catch (err) { console.error(err); } finally { setRepliesLoading(p => ({ ...p, [qId]: false })); }
  };

  const prefetchRepliesForQuestions = async (ids = []) => {
    const fetchList = ids.filter(id => !repliesByQuestionId[id] && !repliesLoading[id]);
    if (fetchList.length === 0) return;
    await Promise.all(fetchList.map(id => api.get(`/forum/question/${id}/replies`).then(res => ({ id, data: res.data || [] })).catch(() => ({ id, data: [] }))))
      .then(resList => {
        setRepliesByQuestionId(p => {
          const n = { ...p };
          resList.forEach(r => n[r.id] = r.data);
          return n;
        });
      });
  };

  const verifyAnswer = async (qId, aId) => { try { await api.put(`/forum/question/${qId}/verify`, { answerId: aId }); fetchDiscussions(); } catch (err) { console.error(err); } };
  const toggleLock = async (qId, s) => { try { await api.put(`/forum/question/${qId}/lock`, { isLocked: s }); fetchDiscussions(); } catch (err) { console.error(err); } };
  const postAnswer = async (qId) => {
    const txt = (draftAnswers[qId] || "").trim();
    if (!txt) return;
    try { await api.post("/forum/answer", { questionId: qId, answerText: txt }); setDraftAnswers(p => ({ ...p, [qId]: "" })); fetchDiscussions(); } catch (err) { console.error(err); }
  };

  const fetchReports = async () => {
    try { setLoadingReports(true); const res = await api.get(`/forum/instructor/reports?status=${reportStatus}`); setReports(res.data || []); }
    catch (err) { console.error(err); } finally { setLoadingReports(false); }
  };

  const actOnReport = async (id, action) => {
    const note = window.prompt("Official Action Note:", "");
    try {
      setActionId(id);
      await api.put(`/forum/report/${id}/action`, { action, actionNote: note || "" });
      fetchReports();
      if (selectedReport?._id === id) setSelectedReport(null);
    } catch (err) { console.error(err); } finally { setActionId(null); }
  };

  const filteredReports = useMemo(() => {
    const s = reportSearch.toLowerCase();
    return reports.filter(r => [r?.reason, r?.targetType, r?.reporterId?.name, r?.targetUserId?.name].join(" ").toLowerCase().includes(s));
  }, [reports, reportSearch]);

  const groupedReports = useMemo(() => {
    return filteredReports.reduce((acc, r) => { (acc[r.targetType || "unknown"] = acc[r.targetType || "unknown"] || []).push(r); return acc; }, {});
  }, [filteredReports]);

  useEffect(() => { activeTab === "reports" ? fetchReports() : fetchDiscussions(); }, [activeTab, reportStatus]);
  useEffect(() => { fetchDiscussions(); }, []);

  return (
    <div className="min-vh-100 p-2 p-md-4" style={{ backgroundColor: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        :root { --p-main: #7c3aed; --p-soft: #f5f3ff; --y-main: #f59e0b; --y-soft: #fffbeb; }
        .glass-card { background: white; border-radius: 24px; border: 1px solid #eef2f6; box-shadow: 0 10px 25px rgba(124, 58, 237, 0.05); }
        .tab-btn { border: none; background: transparent; padding: 10px 20px; border-radius: 12px; font-weight: 700; color: #64748b; transition: 0.3s; }
        .tab-btn.active { background: var(--p-soft); color: var(--p-main); }
        .course-card { background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; cursor: pointer; transition: 0.3s; }
        .course-card:hover { border-color: var(--p-main); transform: translateY(-2px); }
        .course-card.active { background: var(--p-main); color: white; border-color: var(--p-main); }
        .q-item { background: white; border-radius: 18px; padding: 20px; border: 1px solid #f1f5f9; margin-bottom: 15px; }
        .ans-pill { border-radius: 16px; padding: 15px; margin-top: 10px; border-left: 4px solid #e2e8f0; }
        .ans-pill.verified { border-left-color: var(--y-main); background: var(--y-soft); }
        .ans-pill.accepted { border-left-color: #3b82f6; background: #eff6ff; }
        .reply-input { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 15px; width: 100%; outline: none; transition: 0.3s; }
        .reply-input:focus { border-color: var(--p-main); background: white; }
        .p-btn { background: var(--p-main); color: white; border: none; border-radius: 12px; padding: 8px 20px; font-weight: 700; transition: 0.3s; }
        .p-btn:hover { background: #6d28d9; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); }
        /* Inhi styles ko existing style tag mein update/add karein */

.glass-card { 
  width: 100%; 
  max-width: 100%; 
  /* Isse width fix rahegi */
  display: flex;
  flex-direction: column;
}

.course-card {
  /* Isse ensure hoga ki card header hamesha 100% width par rahe */
  width: 100%;
}

.q-item { 
  width: 100%; 
  /* Important: Content ko card ke andar hi wrap karega */
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Replies section ke liye extra safety */
.bg-white.p-2.rounded-3.border {
  max-width: 100%;
  overflow: hidden;
}
  /* Isse flexbox forced expansion ruk jayegi */
.course-card, .q-item, .ans-pill {
    min-width: 0 !important;
    word-break: break-word;
}

/* Sidebar ko stable rakhne ke liye parent container par */
.glass-card {
    table-layout: fixed; /* Even if it's not a table, it helps with some grid layouts */
}
        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(30, 27, 75, 0.4); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background: white; width: 100%; max-width: 900px; border-radius: 28px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
      `}</style>

      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-800 mb-0" style={{ color: "#1e1b4b" }}>
            {/* <Sparkles size={24} className="text-warning me-2"/>  */}Instructor <span style={{ color: "var(--p-main)" }}>Hub</span>
          </h2>
          <p className="text-muted small fw-medium">Manage discussions and platform safety</p>
        </div>
        <div className="d-flex bg-white p-2 rounded-4 shadow-sm border gap-2">
          <button className={`tab-btn ${activeTab === "discussions" ? "active" : ""}`} onClick={() => setActiveTab("discussions")}>
            <MessageSquare size={18} className="me-2" /> Discussions
          </button>
          <button className={`tab-btn ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
            <ShieldAlert size={18} className="me-2" /> Reports
            {reports.length > 0 && <span className="ms-2 badge rounded-pill bg-danger">{reports.length}</span>}
          </button>
        </div>
      </div>

      <div className="glass-card p-3 p-md-4">
        {activeTab === "discussions" ? (
          <>
            {loadingDiscussions ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : (
              Object.entries(groupedQuestions).map(([course, questions]) => (
                <div key={course} className="mb-3">
                  <div className={`course-card d-flex justify-content-between align-items-center ${expandedCourse === course ? 'active shadow-lg' : ''}`} onClick={() => { setExpandedCourse(expandedCourse === course ? null : course); prefetchRepliesForQuestions(questions.map(q => q._id)); }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className={`p-3 rounded-4 ${expandedCourse === course ? 'bg-white text-dark' : 'bg-light text-primary'}`}><BookOpen size={20} /></div>
                      <h6 className="mb-0 fw-bold">{course}</h6>
                    </div>
                    {expandedCourse === course ? <ChevronUp /> : <ChevronDown />}
                  </div>

                  {expandedCourse === course && (
                    <div className="mt-3 ps-md-4">
                      {questions.map((q) => (
                        <div key={q._id} className="q-item shadow-sm">
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <div>
                              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                <h6 className="fw-bold mb-0" style={{ color: "#334155", maxWidth: '100%' }}>{q.title}</h6>
                                {q.isSolved && <span className="badge bg-success-subtle text-success small border border-success px-2">Solved</span>}
                                {q.isLocked && <span className="badge bg-warning-subtle text-warning small border border-warning px-2"><Lock size={12} /> Locked</span>}
                              </div>
                              <small className="text-muted d-flex align-items-center gap-1"><User size={12} /> {safeName(q.asker || q.userId)} • {new Date(q.createdAt).toLocaleDateString()}</small>
                            </div>
                            <button className={`btn btn-sm rounded-pill px-3 ${q.isLocked ? 'btn-outline-success' : 'btn-outline-warning'}`} onClick={() => toggleLock(q._id, !q.isLocked)}>
                              {q.isLocked ? 'Unlock' : 'Lock'}
                            </button>
                          </div>
                          <p className="small text-secondary my-3" style={{ whiteSpace: 'pre-line' }}>{q.description}</p>

                          {/* Answers */}
                          <div className="mt-3">
                            {(q.answers || []).map(ans => (
                              <div key={ans._id} className={`ans-pill ${ans.isVerified ? 'verified' : 'bg-light'}`}>
                                <div className="d-flex justify-content-between gap-2">
                                  <p className="small mb-1 fw-semibold">{ans.answerText}</p>
                                  {ans.isVerified && <Award size={18} className="text-warning" />}
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                  <small className="fw-bold text-primary">— {safeName(ans.userId)}</small>
                                  {!ans.isVerified && !q.isLocked && <button className="btn btn-sm text-warning fw-bold p-0" onClick={() => verifyAnswer(q._id, ans._id)}>Verify</button>}
                                </div>

                                {/* Replies - Read Only */}
                                <div className="mt-3 border-top pt-2">
                                  <small className="fw-bold text-muted d-flex align-items-center gap-1 mb-2"><CornerDownRight size={14} /> Replies ({(repliesByQuestionId[q._id] || []).filter(r => String(r.answerId) === String(ans._id)).length})</small>
                                  {(repliesByQuestionId[q._id] || []).filter(r => String(r.answerId) === String(ans._id)).map(rep => (
                                    <div key={rep._id} className="bg-white p-2 rounded-3 border mb-1 small" style={{ overflowWrap: 'anywhere' }}>
                                      <div className="d-flex justify-content-between fw-bold text-primary mb-1 gap-2">
                                        <span className="text-truncate">{safeName(rep.userId)}</span> {/* text-truncate adds ... if name is long */}
                                        <span className="opacity-50 flex-shrink-0" style={{ fontSize: '10px' }}>{new Date(rep.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <div className="text-muted">{rep.replyText}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {!q.isLocked && !q.isSolved && (
                            <div className="mt-3 d-flex gap-2">
                              <input className="reply-input" placeholder="Type an official answer..." value={draftAnswers[q._id] || ""} onChange={e => setDraftAnswers(p => ({ ...p, [q._id]: e.target.value }))} />
                              <button className="p-btn" onClick={() => postAnswer(q._id)}><Send size={18} /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        ) : (
          /* --- REPORTS INTERFACE --- */
          <>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <select className="form-select rounded-4 border-2 shadow-sm fw-bold" value={reportStatus} onChange={e => setReportStatus(e.target.value)}>
                  <option value="pending">Review Pending</option>
                  <option value="resolved">Resolved Cases</option>
                  <option value="rejected">Rejected Cases</option>
                  <option value="all">View All</option>
                </select>
              </div>
              <div className="col-md-8">
                <div className="position-relative">
                  <Search className="position-absolute top-50 translate-middle-y ms-3 text-muted" size={18} />
                  <input className="form-control rounded-4 ps-5 border-2 shadow-sm" placeholder="Search by reason or user..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} />
                </div>
              </div>
            </div>

            {loadingReports ? (
              <div className="text-center py-5"><div className="spinner-grow text-primary" /></div>
            ) : filteredReports.length === 0 ? (
              <div className="alert alert-light text-center border-2 py-5">No reports found for this filter.</div>
            ) : (
              Object.entries(groupedReports).map(([type, list]) => (
                <div key={type} className="mb-4">
                  <h6 className="fw-800 text-uppercase text-muted small mb-3 border-start border-4 border-primary ps-2">{type} Reports</h6>
                  <div className="table-responsive bg-white rounded-4 border overflow-hidden">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="bg-light">
                        <tr className="small fw-bold text-muted">
                          <th className="ps-4">Reason</th>
                          <th>Status</th>
                          <th>Reporter</th>
                          <th>Date</th>
                          <th className="text-end pe-4">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map(r => (
                          <tr key={r._id} onClick={() => setSelectedReport(r)} style={{ cursor: 'pointer' }}>
                            <td className="ps-4 fw-bold">{r.reason}</td>
                            <td>
                              <span className={`badge rounded-pill px-3 py-1 ${r.status === 'pending' ? 'bg-warning-subtle text-warning' : 'bg-light text-muted'}`}>
                                {r.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="small">{safeName(r.reporterId)}</td>
                            <td className="small text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
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

      {/* --- PURPLE & GOLD MODAL --- */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content animate__animated animate__zoomIn animate__faster" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white" }}>
              <div className="d-flex align-items-center gap-3">
                <div className="bg-white text-warning p-2 rounded-3 shadow-sm"><ShieldAlert size={24} /></div>
                <div>
                  <h5 className="mb-0 fw-800">Review Report</h5>
                  <small className="opacity-75">Ref ID: {selectedReport._id.slice(-8)}</small>
                </div>
              </div>
              <button className="btn-close btn-close-white" onClick={() => setSelectedReport(null)}></button>
            </div>

            <div className="p-4">
              <div className="row g-4 mb-4">
                {/* Meta Cards */}
                <div className="col-6 col-md-3">
                  <small className="text-muted fw-bold d-block mb-1">TARGET USER</small>
                  <div className="fw-bold">{selectedReport.targetUserId?.name || "N/A"}</div>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-muted fw-bold d-block mb-1">COURSE</small>
                  <div className="fw-bold">{selectedReport.courseId?.title || "N/A"}</div>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-muted fw-bold d-block mb-1">REPORTER</small>
                  <div className="fw-bold">{selectedReport.reporterId?.name || "N/A"}</div>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-muted fw-bold d-block mb-1">SUBMITTED</small>
                  <div className="fw-bold">{new Date(selectedReport.createdAt).toLocaleDateString()}</div>
                </div>

                {/* Content Area */}
                <div className="col-12">
                  <div className="bg-light p-4 rounded-4 border-2 border-dashed">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="badge bg-warning text-dark rounded-pill px-3">{selectedReport.targetType?.toUpperCase()}</span>
                      {selectedReport.targetContent?.kind && <span className="small text-muted fw-bold">{selectedReport.targetContent.kind}</span>}
                    </div>
                    {selectedReport.targetContent?.isDeleted ? (
                      <div className="text-center text-muted py-3">Content was purged.</div>
                    ) : (
                      <div className="fw-medium text-dark" style={{ whiteSpace: 'pre-line' }}>{selectedReport.targetContent?.text}</div>
                    )}
                  </div>
                </div>

                {/* Reporter Note */}
                {/* <div className="col-12">
                    <div className="p-3 rounded-4 border-start border-4 border-danger bg-danger-subtle fw-semibold">
                        <strong>Reporter Note:</strong> {selectedReport.note || "No comments provided."}
                    </div>
                </div> */}

                {/* Resolution Info */}
                <div className="col-12 pt-4 border-top">
                  <div className="row g-3 bg-light p-3 rounded-4 border">
                    <div className="col-md-6"><small className="text-muted fw-bold">ACTION BY</small><div className="fw-bold text-primary">{selectedReport.actionBy?.name || "Pending Review"}</div></div>
                    <div className="col-md-6"><small className="text-muted fw-bold">RESOLUTION DATE</small><div className="fw-bold">{selectedReport.actionAt ? new Date(selectedReport.actionAt).toLocaleString() : "-"}</div></div>
                    <div className="col-12"><small className="text-muted fw-bold">ADMIN NOTE</small><p className="mb-0 small text-muted fst-italic">{selectedReport.actionNote || "No final notes documented."}</p></div>
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3 pt-3 border-top">
                {selectedReport.status === 'pending' ? (
                  <>
                    <button className="btn btn-success px-4 rounded-pill fw-bold" onClick={() => actOnReport(selectedReport._id, 'resolved')}>
                      <CheckCircle2 size={18} className="me-2" /> Resolve
                    </button>
                    <button className="btn btn-outline-danger px-4 rounded-pill fw-bold" onClick={() => actOnReport(selectedReport._id, 'rejected')}>
                      <XCircle size={18} className="me-2" /> Reject
                    </button>
                  </>
                ) : (
                  <span className="me-auto text-success fw-bold d-flex align-items-center gap-2 small"><ShieldCheck /> This case is closed.</span>
                )}
                <button className="btn btn-dark px-4 rounded-pill fw-bold" onClick={() => setSelectedReport(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDiscussions; 