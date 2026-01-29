// src/pages/Student/Forum/CourseDiscussion.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MessageCircle,
  PlusCircle,
  CheckCircle,
  MessageSquare,
  Send,
  User,
  ArrowLeft,
  Flag,
  Filter,
  Search,
} from "lucide-react";
import api from "../../../api/api";

const CourseDiscussion = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const currentUserId = currentUser?._id;

  const [questions, setQuestions] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // search/filter/sort
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | unanswered | solved | locked
  const [sort, setSort] = useState("activity"); // activity | newest | solved

  const [showAskModal, setShowAskModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  // ✅ NEW: replies state (2-level: answer -> reply)
  const [replies, setReplies] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({}); // answerId -> text
  const [replyLoading, setReplyLoading] = useState(false);

  const colors = {
    purple: "#9d7afb",
    purpleLight: "#f3efff",
    amber: "#ffb300",
    amberLight: "#fff8e1",
    dark: "#2d2d2d",
    verifiedBg: "#e6f4ea",
    acceptedBg: "#eef4ff",
  };

  const fetchQuestions = async () => {
    try {
      const res = await api.get(
        `/forum/course/${courseId}?search=${encodeURIComponent(search)}&filter=${filter}&sort=${sort}`
      );
      setQuestions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCount = async () => {
    try {
      const res = await api.get(`/forum/course/${courseId}/count`);
      setCount(res.data.count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Helper: safe filter replies by answerId (ObjectId -> string)
  const getRepliesForAnswer = (answerId) => {
    const id = String(answerId);
    return (replies || []).filter((r) => String(r.answerId) === id);
  };

  // ✅ Load detail + replies in parallel
  const loadQuestionDetail = async (questionOrId) => {
    const qid = typeof questionOrId === "string" ? questionOrId : questionOrId?._id;
    if (!qid) return;

    try {
      setDetailLoading(true);

      const [detailRes, repliesRes] = await Promise.all([
        api.get(`/forum/question/${qid}`),
        api.get(`/forum/question/${qid}/replies`),
      ]);

      setAnswers(detailRes.data.answers || []);
      setSelectedQuestion(detailRes.data.question || null);
      setReplies(repliesRes.data || []);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const openQuestionDetail = async (question) => {
    // keep quick UI response (optional)
    setSelectedQuestion(question);
    await loadQuestionDetail(question?._id);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchQuestions(), fetchCount()]);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, search, filter, sort]);

  const submitQuestion = async () => {
    if (!title.trim() || !description.trim()) return;
    try {
      await api.post("/forum/question", { courseId, title, description });
      setTitle("");
      setDescription("");
      setShowAskModal(false);
      await Promise.all([fetchQuestions(), fetchCount()]);
    } catch (err) {
      console.error(err);
    }
  };

  const submitAnswer = async () => {
    if (!answerText.trim() || !selectedQuestion?._id) return;
    if (selectedQuestion.isLocked || selectedQuestion.isSolved) return;

    try {
      await api.post("/forum/answer", {
        questionId: selectedQuestion._id,
        answerText,
      });
      setAnswerText("");
      await loadQuestionDetail(selectedQuestion._id);
      await fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const upvote = async (answerId, isMine) => {
    if (!selectedQuestion?._id) return;
    if (selectedQuestion.isLocked) return;
    if (isMine) return;

    try {
      await api.put(`/forum/answer/upvote/${answerId}`);
      await loadQuestionDetail(selectedQuestion._id);
      await fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const acceptAnswer = async (answerId) => {
    if (!selectedQuestion?._id) return;
    if (selectedQuestion.isLocked) return;

    try {
      await api.put(`/forum/question/${selectedQuestion._id}/accept`, { answerId });
      await loadQuestionDetail(selectedQuestion._id);
      await Promise.all([fetchQuestions(), fetchCount()]);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ NEW: submit reply under an answer (2-level)
  const submitReply = async (answerId) => {
    if (!selectedQuestion?._id) return;
    if (selectedQuestion.isLocked) return;

    const text = (replyDrafts[answerId] || "").trim();
    if (!text) return;

    try {
      setReplyLoading(true);

      await api.post("/forum/reply", {
        questionId: selectedQuestion._id,
        answerId,
        replyText: text,
      });

      setReplyDrafts((prev) => ({ ...prev, [answerId]: "" }));

      // refresh replies only (fast)
      const replyRes = await api.get(`/forum/question/${selectedQuestion._id}/replies`);
      setReplies(replyRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReplyLoading(false);
    }
  };

  const report = async (targetType, targetId) => {
    const reason = window.prompt(
      "Report reason? (spam/abuse/harassment/misinformation/other)",
      "spam"
    );
    if (!reason) return;

    try {
      await api.post("/forum/report", { targetType, targetId, reason, note: "" });
      alert("Reported successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to report.");
    }
  };

  const closeDetail = () => {
    setShowDetailModal(false);
    setSelectedQuestion(null);
    setAnswers([]);
    setReplies([]);
    setReplyDrafts({});
    setAnswerText("");
    setDetailLoading(false);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border" style={{ color: colors.purple }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isClosed = selectedQuestion?.isLocked || selectedQuestion?.isSolved;

  const isQuestionOwner =
    selectedQuestion?.userId?._id?.toString?.() === currentUserId?.toString?.();

  return (
    <div
      className="container-fluid container-lg py-4"
      style={{ backgroundColor: "#fdfdfd", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-3 w-100">
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="btn btn-link p-2 rounded-circle text-decoration-none transition-all shadow-sm bg-white"
            style={{ color: colors.dark, border: `1px solid #eee` }}
            title="Back to Course"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <h4 className="fw-bold mb-0 d-flex align-items-center">
                <div
                  className="p-2 rounded-3 me-2 d-none d-sm-block"
                  style={{ backgroundColor: colors.purpleLight }}
                >
                  <MessageCircle style={{ color: colors.purple }} />
                </div>
                Discussion Board
                <span
                  className="badge ms-2 rounded-pill shadow-sm px-3"
                  style={{ backgroundColor: colors.purple, color: "#fff" }}
                >
                  {count}
                </span>
              </h4>
            </div>

            {/* Search/Filter/Sort */}
            <div className="d-flex flex-column flex-md-row gap-2 mt-3">
              <div className="input-group input-group-sm" style={{ maxWidth: 420 }}>
                <span className="input-group-text bg-light border-0">
                  <Search size={16} />
                </span>
                <input
                  className="form-control border-0 bg-light shadow-none"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <div className="input-group input-group-sm" style={{ width: 200 }}>
                  <span className="input-group-text bg-light border-0">
                    <Filter size={16} />
                  </span>
                  <select
                    className="form-select border-0 bg-light shadow-none"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="unanswered">Unanswered</option>
                    <option value="solved">Solved</option>
                    <option value="locked">Locked</option>
                  </select>
                </div>

                <div className="input-group input-group-sm" style={{ width: 200 }}>
                  <span className="input-group-text bg-light border-0">Sort</span>
                  <select
                    className="form-select border-0 bg-light shadow-none"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="activity">Last Activity</option>
                    <option value="newest">Newest</option>
                    <option value="solved">Solved First</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button
            className="btn px-4 py-2 rounded-pill shadow-sm border-0 fw-bold"
            style={{ backgroundColor: colors.amber, color: colors.dark }}
            onClick={() => setShowAskModal(true)}
          >
            <PlusCircle size={18} className="me-2" />
            Ask a Question
          </button>
        </div>
      </div>

      {/* Question List */}
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          {questions.length === 0 ? (
            <div
              className="text-center py-5 rounded-4 shadow-sm border-0"
              style={{ backgroundColor: colors.purpleLight }}
            >
              <MessageSquare
                size={48}
                className="mb-3 opacity-25"
                style={{ color: colors.purple }}
              />
              <p className="fw-medium" style={{ color: colors.purple }}>
                No discussions here yet. Be the first!
              </p>
            </div>
          ) : (
            <div className="list-group shadow-sm rounded-4 overflow-hidden border-0">
              {questions.map((q) => (
                <button
                  key={q._id}
                  className="list-group-item list-group-item-action p-3 p-md-4 border-bottom transition-all"
                  style={{
                    borderLeft: `6px solid ${colors.purpleLight}`,
                    borderRight: "none",
                  }}
                  onClick={() => openQuestionDetail(q)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderLeftColor = colors.amber;
                    e.currentTarget.style.backgroundColor = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderLeftColor = colors.purpleLight;
                  }}
                >
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <h6 className="fw-bold mb-0 text-start" style={{ color: colors.dark }}>
                          {q.title}
                        </h6>
                        {q.isSolved && <CheckCircle size={18} className="text-success ms-2" />}
                        {q.isLocked && (
                          <span
                            className="badge rounded-pill ms-2"
                            style={{ backgroundColor: "#ffe8cc", color: "#a85d00" }}
                          >
                            Locked
                          </span>
                        )}
                      </div>

                      <p className="small mb-0 text-muted text-start">
                        <User size={14} className="me-1" /> Posted by{" "}
                        <span className="fw-bold" style={{ color: colors.purple }}>
                          {q.asker?.name || q.userId?.name || "User"}
                        </span>
                      </p>
                    </div>

                    <div className="d-flex gap-2 justify-content-start">
                      <div
                        className="rounded-pill px-3 py-1 small fw-bold shadow-sm"
                        style={{ backgroundColor: colors.purpleLight, color: colors.purple }}
                      >
                        💬 {q.answerCount || 0}
                      </div>
                      <div
                        className="rounded-pill px-3 py-1 small fw-bold shadow-sm"
                        style={{ backgroundColor: colors.amberLight, color: "#b57a00" }}
                      >
                        ⭐ {q.totalUpvotes || 0}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= MODALS ================= */}
      {showAskModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(45,45,45,0.6)", backdropFilter: "blur(8px)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg px-3">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0 pt-4 px-4">
                <h5 className="fw-bold" style={{ color: colors.purple }}>
                  Post a Question
                </h5>
                <button
                  className="btn-close shadow-none"
                  onClick={() => setShowAskModal(false)}
                ></button>
              </div>
              <div className="modal-body py-4 px-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-uppercase opacity-50">
                    Subject
                  </label>
                  <input
                    className="form-control border-0 bg-light p-3 shadow-none rounded-3"
                    placeholder="Briefly describe your topic"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label small fw-bold text-uppercase opacity-50">
                    Detailed Explanation
                  </label>
                  <textarea
                    className="form-control border-0 bg-light p-3 shadow-none rounded-3"
                    rows="5"
                    placeholder="Describe what you're looking for..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-0 pb-4 px-4">
                <button
                  className="btn btn-link text-decoration-none text-muted fw-bold"
                  onClick={() => setShowAskModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn px-5 rounded-pill shadow fw-bold"
                  style={{ backgroundColor: colors.amber, color: colors.dark }}
                  onClick={submitQuestion}
                  disabled={!title.trim() || !description.trim()}
                >
                  Post Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedQuestion && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(45,45,45,0.6)", backdropFilter: "blur(8px)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable px-2 px-md-3">
            <div className="modal-content border-0 shadow-lg rounded-4" style={{ maxHeight: "92vh" }}>
              <div className="modal-header border-0 py-3 px-4" style={{ backgroundColor: colors.purple }}>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title h6 fw-bold m-0 text-white">{selectedQuestion.title}</h5>

                  <button
                    className="btn btn-sm btn-light rounded-pill d-flex align-items-center gap-2"
                    onClick={() => report("question", selectedQuestion._id)}
                    title="Report this question"
                  >
                    <Flag size={14} />
                    Report
                  </button>
                </div>

                <button className="btn-close btn-close-white shadow-none" onClick={closeDetail}></button>
              </div>

              <div className="modal-body p-4" style={{ backgroundColor: "#fafafa" }}>
                {detailLoading ? (
                  <div className="d-flex justify-content-center py-5">
                    <div className="spinner-border" style={{ color: colors.purple }} role="status" />
                  </div>
                ) : (
                  <>
                    {selectedQuestion.isLocked && (
                      <div className="alert alert-warning rounded-3">
                        This discussion is locked. You can view answers, but you cannot reply or like.
                      </div>
                    )}

                    {selectedQuestion.isSolved && (
                      <div className="alert alert-success rounded-3">
                        This question is solved. Accepted answer is highlighted.
                      </div>
                    )}

                    <div
                      className="bg-white p-4 rounded-4 shadow-sm mb-4 border-bottom border-4"
                      style={{ borderBottomColor: colors.amber }}
                    >
                      <p className="text-dark mb-0 lh-lg" style={{ whiteSpace: "pre-line" }}>
                        {selectedQuestion.description}
                      </p>
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-3 gap-2">
                      <div className="d-flex align-items-center">
                        <h6 className="fw-bold m-0" style={{ color: colors.purple }}>
                          Responses
                        </h6>
                        <span
                          className="ms-2 badge rounded-pill px-3"
                          style={{ backgroundColor: colors.purpleLight, color: colors.purple }}
                        >
                          {answers.length}
                        </span>
                      </div>
                      <div className="small text-muted">{isQuestionOwner ? "You asked this question" : ""}</div>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {answers.length === 0 ? (
                        <div
                          className="text-center py-4 rounded-4"
                          style={{ border: `2px dashed ${colors.purple}`, backgroundColor: "#fff" }}
                        >
                          <p className="small mb-0 opacity-50">Be the first to share an answer.</p>
                        </div>
                      ) : (
                        answers.map((ans) => {
                          const cardStyle = ans.isAccepted
                            ? { backgroundColor: colors.acceptedBg, border: `2px solid #0d6efd` }
                            : ans.isVerified
                              ? { backgroundColor: colors.verifiedBg, border: `2px solid #28a745` }
                              : {};

                          const ansReplies = getRepliesForAnswer(ans._id);

                          return (
                            <div key={ans._id} className="bg-white rounded-4 p-3 shadow-sm border-0" style={cardStyle}>
                              <div className="d-flex justify-content-between align-items-start gap-2">
                                <p className="mb-2 text-start" style={{ color: colors.dark }}>
                                  {ans.answerText}
                                </p>

                                <div className="d-flex align-items-center gap-2">
                                  {ans.isAccepted && (
                                    <span
                                      className="badge rounded-pill px-2 py-1"
                                      style={{ backgroundColor: "#0d6efd", color: "#fff", fontSize: "0.65rem" }}
                                    >
                                      Accepted
                                    </span>
                                  )}
                                  {ans.isVerified && (
                                    <span
                                      className="badge rounded-pill px-2 py-1"
                                      style={{ backgroundColor: "#28a745", color: "#fff", fontSize: "0.65rem" }}
                                    >
                                      Verified
                                    </span>
                                  )}

                                  <button
                                    className="btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-2"
                                    onClick={() => report("answer", ans._id)}
                                    title="Report this answer"
                                  >
                                    <Flag size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                                <span className="small fw-bold d-flex align-items-center gap-2" style={{ color: colors.purple }}>
                                  👤 {ans.userId?.name || "User"}
                                  {ans.isMine && (
                                    <span
                                      className="badge rounded-pill px-2 py-1"
                                      style={{ backgroundColor: "#e9ecef", color: "#495057", fontSize: "0.65rem" }}
                                    >
                                      You
                                    </span>
                                  )}
                                </span>

                                <div className="d-flex align-items-center gap-2">

                                  {isQuestionOwner &&
                                    !selectedQuestion.isLocked &&
                                    !selectedQuestion.isSolved &&
                                    !ans.isAccepted && (
                                      <button
                                        className="btn btn-sm rounded-pill fw-bold"
                                        style={{ backgroundColor: "#0d6efd", color: "#fff" }}
                                        onClick={() => acceptAnswer(ans._id)}
                                      >
                                        Accept
                                      </button>
                                    )}

                                  <button
                                    className="btn btn-sm border-0 rounded-pill d-flex align-items-center gap-2 px-3 fw-bold"
                                    style={{
                                      backgroundColor: ans.hasLiked ? "#e6f4ea" : colors.amberLight,
                                      color: ans.hasLiked ? "#1e7e34" : "#b57a00",
                                      opacity: selectedQuestion.isLocked || ans.isMine ? 0.6 : 1,
                                    }}
                                    disabled={selectedQuestion.isLocked || selectedQuestion.isSolved || ans.isMine}
                                    onClick={() => upvote(ans._id, ans.isMine)}
                                    title={
                                      ans.isMine
                                        ? "You cannot like your own answer"
                                        : ans.hasLiked
                                          ? "Click to remove like"
                                          : "Click to like"
                                    }
                                  >
                                    <span>{ans.hasLiked ? "✅" : "🧡"}</span> {ans.upvotes || 0}
                                  </button>
                                </div>
                              </div>

                              {/* ✅ Replies section (2-level only) */}
                              <div className="mt-3">
                                <div className="small fw-bold text-muted mb-2">Replies</div>

                                {ansReplies.length === 0 ? (
                                  <div className="small text-muted">No replies yet.</div>
                                ) : (
                                  <div className="d-flex flex-column gap-2">
                                    {ansReplies.map((rep) => (
                                      <div key={rep._id} className="bg-light rounded-3 p-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="small fw-bold" style={{ color: colors.purple }}>
                                            {rep.userId?.name || "User"}
                                          </span>

                                          <div className="d-flex align-items-center gap-2">
                                            <span className="small text-muted">
                                              {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : ""}
                                            </span>

                                            <button
                                              className="btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-2"
                                              onClick={() => report("reply", rep._id)}
                                              title="Report this reply"
                                            >
                                              <Flag size={14} />
                                            </button>
                                          </div>
                                        </div>

                                        <div className="small text-dark" style={{ whiteSpace: "pre-line" }}>
                                          {rep.replyText}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!selectedQuestion.isLocked && !selectedQuestion.isSolved ? (
                                  <div className="d-flex gap-2 mt-2">
                                    <input
                                      className="form-control form-control-sm"
                                      placeholder="Write a reply..."
                                      value={replyDrafts[ans._id] || ""}
                                      onChange={(e) =>
                                        setReplyDrafts((prev) => ({ ...prev, [ans._id]: e.target.value }))
                                      }
                                    />
                                    <button
                                      className="btn btn-sm"
                                      style={{ backgroundColor: colors.purple, color: "#fff" }}
                                      disabled={replyLoading || !(replyDrafts[ans._id] || "").trim()}
                                      onClick={() => submitReply(ans._id)}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                ) : (
                                  <div className="small text-muted mt-2">
                                    {selectedQuestion.isLocked
                                      ? "Thread locked. Replies disabled."
                                      : "Thread solved. Replies disabled."}
                                  </div>
                                )}

                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer bg-white border-0 p-4 pt-0">
                <div className="w-100">
                  <div className="input-group bg-light rounded-pill p-1 shadow-sm border">
                    <textarea
                      className="form-control border-0 bg-transparent shadow-none px-3 pt-2"
                      rows="1"
                      placeholder={
                        isClosed
                          ? selectedQuestion.isLocked
                            ? "Discussion is locked"
                            : "This question is solved"
                          : "Type your response..."
                      }
                      style={{ resize: "none" }}
                      value={answerText}
                      disabled={isClosed}
                      onChange={(e) => setAnswerText(e.target.value)}
                    />
                    <button
                      className="btn rounded-pill px-4 d-flex align-items-center justify-content-center"
                      onClick={submitAnswer}
                      disabled={isClosed || !answerText.trim()}
                      style={{
                        backgroundColor: colors.purple,
                        color: "#fff",
                        opacity: isClosed || !answerText.trim() ? 0.6 : 1,
                      }}
                    >
                      <Send size={18} />
                    </button>
                  </div>

                  {isClosed && (
                    <div className="small text-muted mt-2 ms-2">
                      {selectedQuestion.isLocked
                        ? "Replies and likes are disabled because the discussion is locked."
                        : "Replies are disabled because the question is solved (accepted)."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDiscussion;
