import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../../../api/api";
import { getSocket } from "../../../../utils/socket";

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

export default function InstructorLiveClassRoom() {
  const { liveClassId } = useParams();
  const chatEndRef = useRef(null);

  const [liveClass, setLiveClass] = useState(null);
  const [messages, setMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeUsersCount, setActiveUsersCount] = useState(0); // New: Presence tracking

  const [chatText, setChatText] = useState("");
  const [answerMap, setAnswerMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [sendingChat, setSendingChat] = useState(false);
  const [error, setError] = useState("");

  const isLive = liveClass?.status === "live" || liveClass?.status === "ongoing";
  const isEnded = liveClass?.status === "ended";
  const isScheduled = liveClass?.status === "scheduled";
  const isCancelled = liveClass?.status === "cancelled";

  const classroomAccessible = !isCancelled;

  const getModeMessage = () => {
    if (!liveClass) return "Loading classroom...";
    if (isCancelled) return "This class has been cancelled.";
    if (isScheduled) return "Class is scheduled. You can monitor questions before session starts.";
    if (isLive) return "Class is live. You can chat and answer questions in real-time.";
    if (isEnded) return "Class has ended. Chat is closed but you can still answer questions.";
    return "";
  };

  const fetchClassData = async () => {
    try {
      const res = await api.get("/live-classes/me/all");
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      const found = list.find((x) => String(x._id) === String(liveClassId));
      setLiveClass(found || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load class");
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/live-class-chat/${liveClassId}/messages`);
      setMessages(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load chat");
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await api.get(`/live-class-questions/${liveClassId}/questions`);
      setQuestions(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load questions");
    }
  };

  // Initial Data Load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchClassData(), fetchMessages(), fetchQuestions()]);
      setLoading(false);
    };
    load();

    const interval = setInterval(fetchClassData, 30000);
    return () => clearInterval(interval);
  }, [liveClassId]);

  // Socket Connection & Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Join the specific class room
    socket.emit("liveClass:joinRoom", { liveClassId });

    // Define handlers
    const handleNewMessage = (payload) => {
      setMessages((prev) => [...prev, payload]);
    };

    const handleNewQuestion = (payload) => {
      setQuestions((prev) => [payload, ...prev]); // Newest at top
    };

    const handleQuestionUpdated = (row) => {
      setQuestions((prev) =>
        prev.map((x) => (String(x._id) === String(row._id) ? row : x))
      );
    };

    const handlePresenceUpdate = (payload) => {
      setActiveUsersCount(payload.activeCount || 0);
    };

    const handleStatusUpdated = (payload) => {
      if (String(payload.liveClassId) !== String(liveClassId)) return;
      setLiveClass((prev) => (prev ? { ...prev, status: payload.status } : prev));
    };

    // Attach listeners (Synced with new backend events)
    socket.on("liveClass:newMessage", handleNewMessage);
    socket.on("liveClass:newQuestion", handleNewQuestion);
    socket.on("question:updated", handleQuestionUpdated); 
    socket.on("liveClass:presenceUpdate", handlePresenceUpdate);
    socket.on("liveClass:statusUpdated", handleStatusUpdated);

    // Cleanup
    return () => {
      socket.emit("liveClass:leaveRoom", { liveClassId });
      socket.off("liveClass:newMessage", handleNewMessage);
      socket.off("liveClass:newQuestion", handleNewQuestion);
      socket.off("question:updated", handleQuestionUpdated);
      socket.off("liveClass:presenceUpdate", handlePresenceUpdate);
      socket.off("liveClass:statusUpdated", handleStatusUpdated);
    };
  }, [liveClassId]);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatText.trim() || !isLive) return;

    try {
      setSendingChat(true);
      setError("");
      
      // Save to DB via REST API. 
      // Note: Your backend controller should emit 'liveClass:newMessage' to the socket after saving.
      await api.post(`/live-class-chat/${liveClassId}/messages`, {
        message: chatText.trim(),
      });

      setChatText("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to send message");
    } finally {
      setSendingChat(false);
    }
  };

  const handleAnswer = async (questionId) => {
    const answer = answerMap[questionId];
    if (!answer?.trim()) return;

    try {
      setError("");
      await api.patch(`/live-class-questions/questions/${questionId}/answer`, {
        answer: answer.trim(),
      });

      setAnswerMap((prev) => ({ ...prev, [questionId]: "" }));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to answer question");
    }
  };

  const handlePin = async (questionId) => {
    try {
      setError("");
      await api.patch(`/live-class-questions/questions/${questionId}/pin`);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update pin");
    }
  };

  if (loading) {
    return (
      <div className="container py-4 text-center">
        <div className="spinner-border text-primary" />
        <p className="mt-2 text-muted">Entering classroom...</p>
      </div>
    );
  }

  if (!classroomAccessible) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning border-0 shadow-sm">
          This classroom is not available.
        </div>
        <Link to="/instructor-dashboard/live-classes" className="btn btn-outline-dark">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header Section */}
      <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <div className="d-flex align-items-center gap-3 mb-1">
            <h3 className="fw-bold mb-0">{liveClass?.title || "Instructor Classroom"}</h3>
            {isLive && (
              <span className="badge bg-danger rounded-pill px-3 py-2 d-flex align-items-center gap-2">
                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                LIVE
              </span>
            )}
          </div>
          <div className="text-muted small mt-2">
            Course: <strong>{liveClass?.course?.title || "-"}</strong> • Status: <span className="text-uppercase">{liveClass?.status || "-"}</span>
          </div>
          <div className="text-muted small mt-1">
            Start Time: {formatDateTime(liveClass?.startAt)}
          </div>
        </div>

        <div className="d-flex flex-column align-items-end gap-2">
          {/* New: Real-time presence indicator */}
          {isLive && (
            <div className="text-success fw-semibold small mb-1">
              🟢 {activeUsersCount} Student{activeUsersCount !== 1 ? 's' : ''} in room
            </div>
          )}
          <div className="d-flex gap-2">
            <Link
              to="/instructor-dashboard/live-classes"
              className="btn btn-outline-secondary rounded-pill px-4"
            >
              Exit
            </Link>

            {liveClass?.meetingLink && !isCancelled && (
              <a
                href={liveClass.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary rounded-pill px-4 shadow-sm"
              >
                Launch Zoom Meeting
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="alert alert-light border rounded-4 shadow-sm mb-4">
        {getModeMessage()}
      </div>

      {/* Inline Error Handling */}
      {error && <div className="alert alert-danger border-0 shadow-sm rounded-3 mb-4">{error}</div>}

      <div className="row g-4">
        {/* Chat Section */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100 d-flex flex-column">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
              <h5 className="fw-bold mb-0">Live Chat</h5>
            </div>
            <div className="card-body d-flex flex-column" style={{ height: "500px" }}>
              
              <div className="flex-grow-1 overflow-auto mb-3 pe-2" style={{ scrollBehavior: "smooth" }}>
                {messages.length === 0 ? (
                  <div className="text-center text-muted mt-5">No messages yet.</div>
                ) : (
                  messages.map((m, index) => (
                    <div key={m._id || index} className="bg-light rounded-3 p-3 mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-dark">{m.sender?.name || "User"}</span>
                        <span className="small text-muted" style={{ fontSize: "0.75rem" }}>
                          {formatDateTime(m.createdAt || m.timestamp)}
                        </span>
                      </div>
                      <div className="text-dark">{m.message}</div>
                    </div>
                  ))
                )}
                {/* Invisible div to force auto-scroll to bottom */}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="d-flex gap-2 mt-auto pt-3 border-top">
                <input
                  className="form-control rounded-pill px-4 bg-light border-0"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder={
                    isLive
                      ? "Type your message..."
                      : "Chat is only available during live class"
                  }
                  disabled={!isLive}
                />
                <button
                  className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm"
                  type="submit"
                  disabled={!isLive || sendingChat || !chatText.trim()}
                >
                  {sendingChat ? "..." : "Send"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Q&A Section */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100 d-flex flex-column">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
              <h5 className="fw-bold mb-0">Student Q&A</h5>
            </div>
            <div className="card-body overflow-auto" style={{ height: "500px" }}>
              {questions.length === 0 ? (
                <div className="text-center text-muted mt-5">No questions asked yet.</div>
              ) : (
                questions.map((q, index) => (
                  <div key={q._id || index} className="border border-2 rounded-4 p-3 mb-3 bg-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="fw-bold fs-6 text-dark me-3">{q.question}</div>
                      <div className="d-flex gap-2 align-items-center">
                        <span
                          className={`badge rounded-pill ${
                            q.status === "answered"
                              ? "bg-success-subtle text-success border border-success-subtle"
                              : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                          }`}
                        >
                          {q.status === "answered" ? "Answered" : "Pending"}
                        </span>
                        <button
                          className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                            q.isPinned ? "btn-dark" : "btn-outline-dark"
                          }`}
                          onClick={() => handlePin(q._id)}
                        >
                          {q.isPinned ? "Unpin" : "Pin"}
                        </button>
                      </div>
                    </div>

                    <div className="small text-muted mb-3 d-flex align-items-center gap-2">
                      <span className="fw-medium text-secondary">{q.askedBy?.name || q.student?.name || "Student"}</span>
                      <span>•</span>
                      <span>{formatDateTime(q.createdAt || q.timestamp)}</span>
                    </div>

                    {q.answer ? (
                      <div className="bg-light p-3 rounded-3 border-start border-4 border-success">
                        <div className="small text-success fw-bold text-uppercase mb-1">Instructor Answer</div>
                        <div className="text-dark">{q.answer}</div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <textarea
                          className="form-control bg-light border-0 rounded-3 mb-2 p-3"
                          rows={2}
                          value={answerMap[q._id] || ""}
                          onChange={(e) =>
                            setAnswerMap((prev) => ({
                              ...prev,
                              [q._id]: e.target.value,
                            }))
                          }
                          placeholder="Type your answer here to broadcast to students..."
                        />
                        <div className="d-flex justify-content-end">
                          <button
                            className="btn btn-success rounded-pill px-4 fw-semibold shadow-sm"
                            type="button"
                            onClick={() => handleAnswer(q._id)}
                            disabled={!answerMap[q._id]?.trim()}
                          >
                            Post Answer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}