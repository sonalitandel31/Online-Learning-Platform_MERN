// src/pages/Instructor/Forum/CourseDiscussions.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  User,
  BookOpen,
  Send,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  CornerDownRight,
} from "lucide-react";
import api from "../../../api/api";

const CourseDiscussions = () => {
  const [activeTab, setActiveTab] = useState("discussions"); // discussions | reports

  // discussions state
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [draftAnswers, setDraftAnswers] = useState({}); // questionId -> text

  // replies state (read-only here)
  // repliesByQuestionId[qid] = array of replies
  const [repliesByQuestionId, setRepliesByQuestionId] = useState({});
  const [repliesLoading, setRepliesLoading] = useState({}); // qid -> boolean

  // reports state
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [actionId, setActionId] = useState(null);

  const [reportStatus, setReportStatus] = useState("pending"); // pending | resolved | rejected | all
  const [reportSearch, setReportSearch] = useState("");

  // NEW: modal state for report details
  const [selectedReport, setSelectedReport] = useState(null);

  // ------------------- Helpers -------------------
  const safeName = (u) => u?.name || "User";

  const getRepliesForAnswer = (questionId, answerId) => {
    const list = repliesByQuestionId[questionId] || [];
    return list.filter((r) => String(r.answerId) === String(answerId));
  };

  // ------------------- Fetch Discussions -------------------
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
    } catch (err) {
      console.error("Failed to load discussions", err);
    } finally {
      setLoadingDiscussions(false);
    }
  };

  // ------------------- Fetch Replies (per question) -------------------
  const fetchRepliesForQuestion = async (questionId) => {
    if (!questionId) return;

    // Prevent duplicate fetch
    if (repliesLoading[questionId]) return;

    try {
      setRepliesLoading((prev) => ({ ...prev, [questionId]: true }));
      const res = await api.get(`/forum/question/${questionId}/replies`);
      setRepliesByQuestionId((prev) => ({ ...prev, [questionId]: res.data || [] }));
    } catch (err) {
      console.error("Failed to fetch replies for question:", questionId, err);
      // Keep empty array to avoid UI crash
      setRepliesByQuestionId((prev) => ({ ...prev, [questionId]: prev[questionId] || [] }));
    } finally {
      setRepliesLoading((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // Prefetch replies for a list of questionIds (used when course expanded)
  const prefetchRepliesForQuestions = async (questionIds = []) => {
    // fetch only for ids not already cached
    const idsToFetch = questionIds.filter((id) => !repliesByQuestionId[id] && !repliesLoading[id]);
    if (idsToFetch.length === 0) return;

    // Run in parallel but safe
    await Promise.all(
      idsToFetch.map((id) =>
        api
          .get(`/forum/question/${id}/replies`)
          .then((res) => ({ id, data: res.data || [] }))
          .catch((err) => {
            console.error("Reply prefetch failed for:", id, err);
            return { id, data: [] };
          })
      )
    ).then((results) => {
      setRepliesByQuestionId((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.id] = r.data;
        return next;
      });
    });
  };

  // ------------------- Discussion Actions -------------------
  const verifyAnswer = async (questionId, answerId) => {
    try {
      await api.put(`/forum/question/${questionId}/verify`, { answerId });
      fetchDiscussions();
    } catch (err) {
      console.error("Failed to verify answer", err);
    }
  };

  const toggleLock = async (questionId, lockState) => {
    try {
      await api.put(`/forum/question/${questionId}/lock`, { isLocked: lockState });
      fetchDiscussions();
    } catch (err) {
      console.error("Failed to update lock", err);
    }
  };

  const postAnswer = async (questionId) => {
    const answerText = (draftAnswers[questionId] || "").trim();
    if (!answerText) return;

    try {
      await api.post("/forum/answer", { questionId, answerText });
      setDraftAnswers((prev) => ({ ...prev, [questionId]: "" }));
      fetchDiscussions();
      // replies may change later; no need to refetch here
    } catch (err) {
      console.error("Failed to post answer", err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await api.get(`/forum/instructor/reports?status=${reportStatus}`);
      setReports(res.data || []);
    } catch (err) {
      console.error("Failed to fetch instructor reports", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const actOnReport = async (reportId, action) => {
    const actionNote = window.prompt("Action note (optional):", "");
    try {
      setActionId(reportId);
      await api.put(`/forum/report/${reportId}/action`, {
        action,
        actionNote: actionNote || "",
      });
      await fetchReports();
    } catch (err) {
      console.error("Failed to update report", err);
    } finally {
      setActionId(null);
    }
  };

  const filteredReports = useMemo(() => {
    const s = reportSearch.trim().toLowerCase();
    if (!s) return reports || [];

    return (reports || []).filter((r) => {
      const fields = [
        r?.reason,
        r?.targetType,
        r?.status,
        r?.reporterId?.name,
        r?.targetUserId?.name,
        r?.courseId?.title,
        r?.actionBy?.name,
        r?.actionNote,
        r?.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return fields.includes(s);
    });
  }, [reports, reportSearch]);

  const groupedReports = useMemo(() => {
    const byType = {};
    for (const r of filteredReports) {
      const k = r.targetType || "unknown";
      if (!byType[k]) byType[k] = [];
      byType[k].push(r);
    }
    return byType;
  }, [filteredReports]);

  useEffect(() => {
    if (activeTab === "reports") fetchReports();
    // eslint-disable-next-line
  }, [reportStatus, activeTab]);

  // ------------------- Initial Load -------------------
  useEffect(() => {
    fetchDiscussions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------- UI -------------------
  const handleToggleCourse = async (courseName, questions) => {
    const next = expandedCourse === courseName ? null : courseName;
    setExpandedCourse(next);

    // Prefetch replies when opening a course
    if (next) {
      const ids = (questions || []).map((q) => q._id);
      await prefetchRepliesForQuestions(ids);
    }
  };

  const renderStatusBadge = (statusRaw) => {
    const status = (statusRaw || "pending").toLowerCase();
    return (
      <span
        className={`badge rounded-pill ${
          status === "pending" ? "bg-warning text-dark" : status === "resolved" ? "bg-success" : "bg-danger"
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="container-fluid py-4 px-2 px-md-4" style={{ backgroundColor: "#f8f9fd", minHeight: "100vh" }}>
      <style>{`
        :root { --brand-purple:#7e50d3; --brand-light-purple:#f3effb; --brand-orange:#fd7e14; }
        .hub-card{ background:#fff; border-radius:18px; border:1px solid #eef0f7; box-shadow:0 10px 30px rgba(82,63,105,0.05); overflow:hidden; }
        .tab-btn{ border:0; background:transparent; font-weight:800; padding:12px 16px; border-radius:12px; color:#5e6278; display:inline-flex; align-items:center; gap:8px; }
        .tab-btn.active{ background:var(--brand-light-purple); color:var(--brand-purple); }
        .course-card{ border:none; border-radius:20px; background:white; box-shadow:0 10px 30px rgba(111,66,193,0.05); margin-bottom:20px; border:1px solid rgba(111,66,193,0.1); }
        .course-header{ background:linear-gradient(90deg,var(--brand-purple),#8e67d5); color:white; padding:18px 20px; border-radius:19px 19px 0 0; cursor:pointer; }
        .question-item{ border-bottom:1px solid #f0f0f0; padding:18px 20px; }
        .question-item:last-child{ border-bottom:none; }
        .answer-box{ background:#f8f9fa; border-radius:12px; padding:12px; margin-top:10px; border-left:4px solid #dee2e6; }
        .verified-box{ background:#fff9db; border-left-color:var(--brand-orange); }
        .accepted-box{ background:#eef4ff; border-left-color:#0d6efd; }
        .btn-post{ background:var(--brand-purple); color:white; border-radius:10px; font-weight:700; }
        .btn-post:hover{ background:#5a32a3; color:white; }
        .badge-count{ background:rgba(255,255,255,0.2); padding:2px 10px; border-radius:10px; font-size:0.8rem; }
        .mini-btn{ border-radius:12px; font-weight:800; padding:0.55rem 0.9rem; }

        .reply-box {
          background: #ffffff;
          border: 1px solid #eef0f7;
          border-radius: 10px;
          padding: 10px;
          margin-top: 8px;
        }
        .reply-meta {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom: 4px;
        }

        /* ------------------- Responsive Additions (Discussions) ------------------- */
        .course-header, .question-item, .answer-box, .reply-box { word-break: break-word; overflow-wrap: anywhere; }
        .tab-btn, .btn, button { touch-action: manipulation; }

        @media (max-width: 768px) {
          .hub-card { border-radius: 16px; }
          .course-card { border-radius: 18px; }
          .course-header { padding: 14px 14px; }
          .question-item { padding: 14px 14px; }
          .course-header .d-flex { flex-wrap: wrap; gap: 10px; }
          .course-header h5 { font-size: 1rem; }
          .tab-btn { padding: 10px 12px; border-radius: 12px; }
          .badge-count { font-size: 0.78rem; }
          .ms-3 { margin-left: 0.5rem !important; }
          .btn.btn-sm { white-space: nowrap; }
        }

        @media (max-width: 576px) {
          .container-fluid { padding-left: 10px !important; padding-right: 10px !important; }
          .hub-card { padding: 14px !important; }
          .course-header { padding: 12px 12px; border-radius: 16px 16px 0 0; }
          .question-item { padding: 12px 12px; }
          h3 { font-size: 1.1rem; }
          .course-header h5 { font-size: 0.98rem; }
          .course-header .d-flex.align-items-center.gap-3 { gap: 10px !important; }
          .question-item > .d-flex.justify-content-between { flex-wrap: wrap; }
          .ms-3 { margin-left: 0rem !important; }
          .answer-box .d-flex.justify-content-between { flex-wrap: wrap; }
          .question-item .mt-3.d-flex.gap-2 { flex-direction: column; }
          .question-item .mt-3.d-flex.gap-2 .btn-post { width: 100%; justify-content: center; }
          .form-select, .form-control { width: 100% !important; max-width: 100% !important; }
        }

        @media (max-width: 360px) {
          .tab-btn { padding: 9px 10px; font-size: 0.9rem; }
          .badge-count { display: inline-block; margin-top: 4px; }
        }

        /* ------------------- Reports responsiveness (NEW) ------------------- */
        .report-table th, .report-table td { white-space: nowrap; }
        .report-wrap { white-space: normal !important; word-break: break-word; overflow-wrap: anywhere; }

        .modal-backdrop-custom {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1040;
        }
        .modal-custom {
          position: fixed; inset: 0;
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .modal-card {
          width: min(920px, 100%);
          max-height: 90vh;
          overflow: auto;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #eef0f7;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        @media (max-width: 576px) {
          .modal-custom { padding: 10px; }
          .modal-card { border-radius: 14px; }
        }
      `}</style>

      {/* Header + Tabs */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
        <div>
          <h3 className="fw-bolder mb-1" style={{ color: "#1e1e2d" }}>
            Instructor Forum
          </h3>
          <div className="text-muted fw-medium">Manage doubts, verify answers, and handle reports.</div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button className={`tab-btn ${activeTab === "discussions" ? "active" : ""}`} onClick={() => setActiveTab("discussions")}>
            <BookOpen size={18} /> Discussions
          </button>

          <button className={`tab-btn ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
            <ShieldAlert size={18} /> Reports
            {reports?.length > 0 && <span className="badge rounded-pill bg-danger ms-1">{reports.length}</span>}
          </button>

          {/* <button
            className="btn btn-outline-primary mini-btn d-flex align-items-center gap-2"
            onClick={() => {
              fetchDiscussions();
              fetchReports();
            }}
            title="Refresh"
          >
            <RefreshCcw size={16} /> Refresh
          </button> */}
        </div>
      </div>

      <div className="hub-card p-3 p-md-4">
        {activeTab === "discussions" && (
          <>
            {loadingDiscussions ? (
              <div className="d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : Object.keys(groupedQuestions).length === 0 ? (
              <div className="alert alert-info rounded-4 m-0">No questions found.</div>
            ) : (
              Object.entries(groupedQuestions).map(([courseName, questions]) => (
                <div key={courseName} className="course-card">
                  <div
                    className="course-header d-flex justify-content-between align-items-center"
                    onClick={() => handleToggleCourse(courseName, questions)}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <BookOpen size={24} />
                      <div>
                        <h5 className="m-0 fw-bold">{courseName}</h5>
                        <span className="badge-count">{questions.length} Questions</span>
                      </div>
                    </div>
                    {expandedCourse === courseName ? <ChevronUp /> : <ChevronDown />}
                  </div>

                  {(expandedCourse === courseName || Object.keys(groupedQuestions).length === 1) && (
                    <div className="card-body p-0">
                      {questions.map((q) => {
                        const isClosed = q.isSolved || q.isLocked;

                        return (
                          <div key={q._id} className="question-item">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <div>
                                <h6 className="fw-bold text-dark mb-1">{q.title}</h6>
                                <small className="text-muted d-block">
                                  <User size={12} /> Asked by {q.asker?.name || q.userId?.name || "User"}
                                </small>

                                <div className="mt-2 d-flex flex-wrap gap-2">
                                  {q.isSolved && (
                                    <span className="text-success small fw-bold">
                                      <CheckCircle size={14} /> Solved
                                    </span>
                                  )}
                                  {q.isLocked && (
                                    <span className="small fw-bold" style={{ color: "#a85d00" }}>
                                      <Lock size={14} /> Locked
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="d-flex gap-2">
                                {!q.isLocked ? (
                                  <button className="btn btn-sm btn-outline-warning" onClick={() => toggleLock(q._id, true)}>
                                    <Lock size={14} className="me-1" /> Lock
                                  </button>
                                ) : (
                                  <button className="btn btn-sm btn-outline-success" onClick={() => toggleLock(q._id, false)}>
                                    <Unlock size={14} className="me-1" /> Unlock
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 text-muted small" style={{ whiteSpace: "pre-line" }}>
                              {q.description}
                            </div>

                            {/* Answers */}
                            <div className="ms-3 mt-3">
                              {(q.answers || [])
                                .sort(
                                  (a, b) =>
                                    (b.isAccepted === true) - (a.isAccepted === true) ||
                                    (b.isVerified === true) - (a.isVerified === true)
                                )
                                .map((ans) => {
                                  const boxClass = ans.isAccepted
                                    ? "answer-box accepted-box"
                                    : ans.isVerified
                                      ? "answer-box verified-box"
                                      : "answer-box";

                                  const replyList = getRepliesForAnswer(q._id, ans._id);

                                  return (
                                    <div key={ans._id} className={boxClass}>
                                      <div className="d-flex justify-content-between align-items-start gap-2">
                                        <p className="small mb-1">{ans.answerText}</p>

                                        <div className="d-flex align-items-center gap-2">
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
                                          {ans.isVerified && <ShieldCheck size={16} className="text-warning" />}
                                        </div>
                                      </div>

                                      <div className="d-flex justify-content-between align-items-center mt-2">
                                        <small className="fw-bold" style={{ color: "var(--brand-purple)" }}>
                                          {safeName(ans.userId)}
                                        </small>

                                        {!q.isLocked && !ans.isVerified && (
                                          <button
                                            className="btn btn-sm py-0 fw-bold"
                                            style={{ color: "var(--brand-orange)" }}
                                            onClick={() => verifyAnswer(q._id, ans._id)}
                                          >
                                            Verify
                                          </button>
                                        )}
                                      </div>

                                      {/* Replies under this answer (READ-ONLY) */}
                                      <div className="mt-2">
                                        <div className="d-flex align-items-center gap-2 text-muted small fw-bold">
                                          <CornerDownRight size={14} />
                                          Replies ({replyList.length})
                                          {!repliesByQuestionId[q._id] && (
                                            <button className="btn btn-sm py-0 px-2" onClick={() => fetchRepliesForQuestion(q._id)}>
                                              Load
                                            </button>
                                          )}
                                        </div>

                                        {repliesLoading[q._id] ? (
                                          <div className="small text-muted mt-2">Loading replies...</div>
                                        ) : replyList.length === 0 ? (
                                          <div className="small text-muted mt-2">No replies on this answer.</div>
                                        ) : (
                                          <div className="d-flex flex-column gap-2 mt-2">
                                            {replyList.map((rep) => (
                                              <div key={rep._id} className="reply-box">
                                                <div className="reply-meta">
                                                  <span className="small fw-bold text-primary">{safeName(rep.userId)}</span>
                                                  <span className="small text-muted">
                                                    {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ""}
                                                  </span>
                                                </div>
                                                <div className="small text-muted" style={{ whiteSpace: "pre-line" }}>
                                                  {rep.replyText}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {!isClosed ? (
                              <div className="mt-3 d-flex gap-2">
                                <input
                                  type="text"
                                  className="form-control form-control-sm border-0 bg-light"
                                  placeholder="Reply to this student..."
                                  value={draftAnswers[q._id] || ""}
                                  onChange={(e) => setDraftAnswers((prev) => ({ ...prev, [q._id]: e.target.value }))}
                                />
                                <button className="btn btn-sm btn-post px-3" onClick={() => postAnswer(q._id)}>
                                  <Send size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="mt-3 small text-muted">
                                {q.isLocked ? "Discussion locked. Replies disabled." : "Solved thread. Replies disabled."}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* ------------------- TAB: REPORTS (COMPACT + MODAL) ------------------- */}
        {activeTab === "reports" && (
          <>
            <div className="d-flex flex-column flex-md-row gap-2 justify-content-between mb-3">
              <div className="d-flex gap-2 flex-wrap">
                <select
                  className="form-select"
                  style={{ maxWidth: 220 }}
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>

                <input
                  className="form-control"
                  style={{ maxWidth: 360 }}
                  placeholder="Search by reason / reporter / target user / course / status / action..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                />
              </div>

              <div className="text-muted small d-flex align-items-center">
                Showing <strong className="mx-1">{filteredReports.length}</strong> reports
              </div>
            </div>

            {loadingReports ? (
              <div className="d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="alert alert-success rounded-4 m-0">No reports found for selected status / search.</div>
            ) : (
              Object.entries(groupedReports).map(([type, list]) => (
                <div key={type} className="mb-4">
                  <h6 className="text-uppercase text-muted fw-bold mb-2">{type} reports</h6>

                  <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="table-responsive">
                      <table className="table mb-0 align-middle report-table">
                        <thead className="table-light">
                          <tr>
                            <th>Target</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Reporter</th>
                            <th>Created</th>
                            <th>Details</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {list.map((r) => {
                            const status = (r.status || "pending").toLowerCase();

                            return (
                              <tr key={r._id}>
                                <td className="text-capitalize">{r.targetType || "-"}</td>
                                <td className="fw-bold text-capitalize">{r.reason || "-"}</td>
                                <td>{renderStatusBadge(status)}</td>
                                <td className="report-wrap">{r.reporterId?.name || "User"}</td>
                                <td className="text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>

                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-primary rounded-pill"
                                    onClick={() => setSelectedReport(r)}
                                  >
                                    View
                                  </button>
                                </td>

                                <td className="text-end">
                                  {status === "pending" ? (
                                    <div className="d-flex justify-content-end gap-2">
                                      <button
                                        className="btn btn-sm btn-success rounded-pill d-flex align-items-center gap-1"
                                        disabled={actionId === r._id}
                                        onClick={() => actOnReport(r._id, "resolved")}
                                      >
                                        <CheckCircle2 size={16} /> Resolve
                                      </button>

                                      <button
                                        className="btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-1"
                                        disabled={actionId === r._id}
                                        onClick={() => actOnReport(r._id, "rejected")}
                                      >
                                        <XCircle size={16} /> Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="badge bg-secondary rounded-pill">Closed</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
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

      {/* ------------------- Report Details Modal (State-based) ------------------- */}
      {selectedReport && (
        <>
          <div className="modal-backdrop-custom" onClick={() => setSelectedReport(null)} />
          <div className="modal-custom" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="d-flex justify-content-between align-items-start p-3 border-bottom">
                <div>
                  <div className="fw-bolder" style={{ fontSize: "1.05rem" }}>
                    Report Details
                  </div>
                  <div className="text-muted small">
                    {selectedReport.targetType || "unknown"} • {selectedReport.reason || "-"} •{" "}
                    {renderStatusBadge(selectedReport.status)}
                  </div>
                </div>

                <button className="btn btn-sm btn-light" onClick={() => setSelectedReport(null)}>
                  ✕
                </button>
              </div>

              <div className="p-3">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="text-muted small fw-bold text-uppercase">Reported User</div>
                    <div className="fw-semibold">{selectedReport.targetUserId?.name || "-"}</div>
                  </div>

                  <div className="col-md-6">
                    <div className="text-muted small fw-bold text-uppercase">Course</div>
                    <div className="fw-semibold">{selectedReport.courseId?.title || "-"}</div>
                  </div>

                  <div className="col-md-6">
                    <div className="text-muted small fw-bold text-uppercase">Reporter</div>
                    <div className="fw-semibold">{selectedReport.reporterId?.name || "-"}</div>
                  </div>

                  <div className="col-md-6">
                    <div className="text-muted small fw-bold text-uppercase">Created</div>
                    <div className="fw-semibold">
                      {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : "-"}
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase">Target Content</div>
                    {selectedReport?.targetContent?.isDeleted ? (
                      <div className="text-muted">Deleted content</div>
                    ) : (
                      <div className="bg-light rounded-3 p-3 border report-wrap">
                        <div className="small fw-bold text-capitalize">
                          {selectedReport?.targetContent?.kind || selectedReport?.targetType}
                          {selectedReport?.targetContent?.questionTitle ? (
                            <span className="text-muted"> • {selectedReport.targetContent.questionTitle}</span>
                          ) : null}
                        </div>
                        <div className="small text-muted mt-2" style={{ whiteSpace: "pre-line" }}>
                          {selectedReport?.targetContent?.text || "-"}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase">Reporter Note</div>
                    <div className="report-wrap">{selectedReport.note?.trim() ? selectedReport.note : "-"}</div>
                  </div>

                  <div className="col-md-6">
                    <div className="text-muted small fw-bold text-uppercase">Action By</div>
                    <div className="fw-semibold">{selectedReport.actionBy?.name || "-"}</div>
                  </div>

                  <div className="col-md-6">
                    <div className="text-muted small fw-bold text-uppercase">Action At</div>
                    <div className="fw-semibold">
                      {selectedReport.actionAt ? new Date(selectedReport.actionAt).toLocaleString() : "-"}
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="text-muted small fw-bold text-uppercase">Action Note</div>
                    <div className="report-wrap">{selectedReport.actionNote?.trim() ? selectedReport.actionNote : "-"}</div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                  {(selectedReport.status || "pending").toLowerCase() === "pending" ? (
                    <>
                      <button
                        className="btn btn-success rounded-pill d-flex align-items-center gap-1"
                        disabled={actionId === selectedReport._id}
                        onClick={() => actOnReport(selectedReport._id, "resolved")}
                      >
                        <CheckCircle2 size={16} /> Resolve
                      </button>

                      <button
                        className="btn btn-outline-danger rounded-pill d-flex align-items-center gap-1"
                        disabled={actionId === selectedReport._id}
                        onClick={() => actOnReport(selectedReport._id, "rejected")}
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="badge bg-secondary rounded-pill align-self-center">Closed</span>
                  )}

                  <button className="btn btn-light rounded-pill" onClick={() => setSelectedReport(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CourseDiscussions;