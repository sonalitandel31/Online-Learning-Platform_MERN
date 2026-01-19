import React, { useEffect, useState } from "react";
import { CheckCircle, User, BookOpen, Send, ShieldCheck, ChevronDown, ChevronUp, Lock, Unlock } from "lucide-react";
import api from "../../../api/api";

const CourseDiscussions = () => {
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [draftAnswers, setDraftAnswers] = useState({}); // questionId -> text

  const fetchDiscussions = async () => {
    try {
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
      setLoading(false);
    }
  };

  const markSolved = async (questionId, answerId) => {
    try {
      await api.put(`/forum/question/${questionId}/solve`, { answerId });
      fetchDiscussions();
    } catch (err) {
      console.error("Failed to mark as solved", err);
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
    } catch (err) {
      console.error("Failed to post answer", err);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center p-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <style>{`
        :root {
          --brand-purple: #7e50d3;
          --brand-light-purple: #f3effb;
          --brand-orange: #fd7e14;
          --brand-yellow: #ffc107;
        }
        .course-card {
          border: none;
          border-radius: 20px;
          background: white;
          box-shadow: 0 10px 30px rgba(111, 66, 193, 0.05);
          margin-bottom: 25px;
          border: 1px solid rgba(111, 66, 193, 0.1);
        }
        .course-header {
          background: linear-gradient(90deg, var(--brand-purple), #8e67d5);
          color: white;
          padding: 20px;
          border-radius: 19px 19px 0 0;
          cursor: pointer;
        }
        .question-item {
          border-bottom: 1px solid #f0f0f0;
          padding: 20px;
        }
        .question-item:last-child { border-bottom: none; }
        .answer-box {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 12px;
          margin-top: 10px;
          border-left: 4px solid #dee2e6;
        }
        .verified-box {
          background: #fff9db;
          border-left-color: var(--brand-orange);
        }
        .btn-post {
          background: var(--brand-purple);
          color: white;
          border-radius: 8px;
          font-weight: 600;
        }
        .btn-post:hover { background: #5a32a3; color: white; }
        .badge-count {
          background: rgba(255,255,255,0.2);
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 0.8rem;
        }
      `}</style>

      <div className="d-flex align-items-center gap-2 mb-4">
        <h4 className="fw-bold m-0">Course Wise Discussions</h4>
      </div>

      {Object.keys(groupedQuestions).length === 0 ? (
        <div className="alert bg-brand-light text-center py-5 rounded-4">No questions found.</div>
      ) : (
        Object.entries(groupedQuestions).map(([courseName, questions]) => (
          <div key={courseName} className="course-card">
            <div
              className="course-header d-flex justify-content-between align-items-center"
              onClick={() => setExpandedCourse(expandedCourse === courseName ? null : courseName)}
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
                            <User size={12} /> Asked by {q.userId?.name}
                          </small>
                          <div className="mt-2 d-flex gap-2">
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

                      {/* Answers */}
                      <div className="ms-3 mt-3">
                        {(q.answers || [])
                          .sort((a, b) => (b.isVerified === true) - (a.isVerified === true))
                          .map((ans) => (
                            <div key={ans._id} className={`answer-box ${ans.isVerified ? "verified-box" : ""}`}>
                              <div className="d-flex justify-content-between align-items-start">
                                <p className="small mb-1">{ans.answerText}</p>
                                {ans.isVerified && <ShieldCheck size={16} className="text-warning" />}
                              </div>
                              <div className="d-flex justify-content-between align-items-center mt-1">
                                <small className="fw-bold" style={{ color: "var(--brand-purple)" }}>
                                  {ans.userId?.name || "User"}
                                </small>
                                {!q.isSolved && !q.isLocked && !ans.isVerified && (
                                  <button
                                    className="btn btn-sm py-0 fw-bold"
                                    style={{ color: "var(--brand-orange)" }}
                                    onClick={() => markSolved(q._id, ans._id)}
                                  >
                                    Verify
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Reply input */}
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
    </div>
  );
};

export default CourseDiscussions;
