import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../../api/api";
import { getSocket } from "../../../utils/socket";

const EARLY_ACCESS_MINUTES = 10;

const getMsUntilStart = (startAt) => {
  if (!startAt) return null;
  const diff = new Date(startAt).getTime() - Date.now();
  return Number.isNaN(diff) ? null : diff;
};

const isWithinEarlyWindow = (liveClass) => {
  if (!liveClass?.startAt) return false;
  const diffMs = getMsUntilStart(liveClass.startAt);
  if (diffMs === null) return false;
  return diffMs <= EARLY_ACCESS_MINUTES * 60 * 1000 && diffMs > 0;
};

const canStudentAccessClassroom = (liveClass) => {
  if (!liveClass) return false;
  if (liveClass.status === "cancelled") return false;
  if (liveClass.status === "live" || liveClass.status === "ongoing") return true;
  if (liveClass.status === "scheduled") return isWithinEarlyWindow(liveClass);
  if (liveClass.status === "ended") return true; // read-only classroom
  return false;
};

const canStudentSendChat = (liveClass) => {
  if (!liveClass) return false;
  if (liveClass.status === "live" || liveClass.status === "ongoing") return true;
  if (liveClass.status === "scheduled") return isWithinEarlyWindow(liveClass);
  return false;
};

const canStudentAskQuestion = (liveClass) => {
  if (!liveClass) return false;
  if (liveClass.status === "live" || liveClass.status === "ongoing") return true;
  if (liveClass.status === "scheduled") return isWithinEarlyWindow(liveClass);
  return false;
};

const canOpenMeeting = (liveClass) => {
  if (!liveClass?.meetingLink) return false;
  if (liveClass.status === "cancelled" || liveClass.status === "ended") return false;
  if (liveClass.status === "live" || liveClass.status === "ongoing") return true;
  if (liveClass.status === "scheduled") return isWithinEarlyWindow(liveClass);
  return false;
};

const getClassroomModeMessage = (liveClass) => {
  if (!liveClass) return "Loading live classroom...";

  if (liveClass.status === "cancelled") {
    return "This class has been cancelled. Classroom is not available.";
  }

  if (liveClass.status === "ended") {
    if (liveClass.recordingLink) {
      return "This class has ended. Chat and new questions are closed. Recording is available below.";
    }
    return "This class has ended. Chat and new questions are closed.";
  }

  if (liveClass.status === "live" || liveClass.status === "ongoing") {
    return "Class is live now. You can chat, ask questions, and open the meeting.";
  }

  if (liveClass.status === "scheduled") {
    const diffMs = getMsUntilStart(liveClass.startAt);

    if (diffMs === null) {
      return "Classroom availability depends on the scheduled start time.";
    }

    if (diffMs > EARLY_ACCESS_MINUTES * 60 * 1000) {
      return `Classroom will open ${EARLY_ACCESS_MINUTES} minutes before the class starts.`;
    }

    if (diffMs > 0) {
      return "Class starts soon. Classroom is open now.";
    }

    return "Class is about to start.";
  }

  return "";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

export default function StudentLiveClassRoom() {
  const { liveClassId } = useParams();
  const chatEndRef = useRef(null);

  const [liveClass, setLiveClass] = useState(null);
  const [messages, setMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  const [chatText, setChatText] = useState("");
  const [questionText, setQuestionText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sendingChat, setSendingChat] = useState(false);
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [error, setError] = useState("");

  const fetchClassData = async () => {
    try {
      const res = await api.get("/live-classes/me/upcoming");
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      const found = list.find((x) => String(x._id) === String(liveClassId));
      setLiveClass(found || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load classroom data");
      setLiveClass(null);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/live-class-chat/${liveClassId}/messages`);
      setMessages(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      setError((prev) => prev || e?.response?.data?.message || "Failed to load chat");
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await api.get(`/live-class-questions/${liveClassId}/questions`);
      setQuestions(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      setError((prev) => prev || e?.response?.data?.message || "Failed to load questions");
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      try {
        setError("");
        setLoading(true);
        await Promise.all([fetchClassData(), fetchMessages(), fetchQuestions()]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAll();

    const interval = setInterval(() => {
      fetchClassData();
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [liveClassId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("liveClass:joinRoom", { liveClassId });

    const handleNewMessage = (row) => setMessages((prev) => [...prev, row]);
    const handleNewQuestion = (row) => setQuestions((prev) => [row, ...prev]);
    const handleUpdatedQuestion = (row) => {
      setQuestions((prev) => prev.map((x) => (String(x._id) === String(row._id) ? row : x)));
    };
    const handlePresenceUpdate = (payload) => setActiveUsersCount(payload.activeCount || 0);

    const handleStatusUpdated = (payload) => {
      if (String(payload?.liveClassId) !== String(liveClassId)) return;
      setLiveClass((prev) => (prev ? { ...prev, status: payload.status } : prev));
    };

    const handleRecordingReady = (payload) => {
      if (String(payload?.liveClassId) !== String(liveClassId)) return;
      setLiveClass((prev) =>
        prev
          ? {
              ...prev,
              recordingLink: payload.recordingLink || prev.recordingLink,
              recordingStatus: payload.recordingStatus || prev.recordingStatus,
            }
          : prev
      );
    };

    socket.on("liveClass:newMessage", handleNewMessage);
    socket.on("liveClass:newQuestion", handleNewQuestion);
    socket.on("question:updated", handleUpdatedQuestion);
    socket.on("liveClass:presenceUpdate", handlePresenceUpdate);
    socket.on("liveClass:statusUpdated", handleStatusUpdated);
    socket.on("liveClass:cancelled", handleStatusUpdated);
    socket.on("recording:ready", handleRecordingReady);

    return () => {
      socket.emit("liveClass:leaveRoom", { liveClassId });
      socket.off("liveClass:newMessage", handleNewMessage);
      socket.off("liveClass:newQuestion", handleNewQuestion);
      socket.off("question:updated", handleUpdatedQuestion);
      socket.off("liveClass:presenceUpdate", handlePresenceUpdate);
      socket.off("liveClass:statusUpdated", handleStatusUpdated);
      socket.off("liveClass:cancelled", handleStatusUpdated);
      socket.off("recording:ready", handleRecordingReady);
    };
  }, [liveClassId]);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;

    if (!canStudentSendChat(liveClass)) {
      setError("Chat is not available right now.");
      return;
    }

    try {
      setError("");
      setSendingChat(true);

      await api.post(`/live-class-chat/${liveClassId}/messages`, {
        message: chatText.trim(),
      });

      setChatText("");
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to send message");
    } finally {
      setSendingChat(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    if (!canStudentAskQuestion(liveClass)) {
      setError("New questions are not allowed right now.");
      return;
    }

    try {
      setError("");
      setAskingQuestion(true);

      await api.post(`/live-class-questions/${liveClassId}/questions`, {
        question: questionText.trim(),
      });

      setQuestionText("");
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to ask question");
    } finally {
      setAskingQuestion(false);
    }
  };

  const pinnedQuestions = useMemo(
    () => questions.filter((q) => q.isPinned),
    [questions]
  );

  const classroomAccessible = canStudentAccessClassroom(liveClass);
  const chatEnabled = canStudentSendChat(liveClass);
  const questionEnabled = canStudentAskQuestion(liveClass);
  const meetingEnabled = canOpenMeeting(liveClass);
  const isReadOnly = liveClass?.status === "ended";

  if (loading) {
    return (
      <div className="container py-4">
        <div className="p-5 border-0 shadow-sm rounded-4 bg-white text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <h5 className="fw-semibold text-dark">Loading classroom…</h5>
          <div className="text-muted small">Preparing live class details.</div>
        </div>
      </div>
    );
  }

  if (!liveClass) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-3">
          Live classroom not found or you do not have access.
        </div>
        <Link to="/live-classes" className="btn btn-outline-secondary rounded-pill px-4 shadow-sm">
          Back to Live Classes
        </Link>
      </div>
    );
  }

  if (!classroomAccessible) {
    return (
      <div className="container py-4">
        <div className="mb-4">
          <h3 className="fw-bold mb-1">{liveClass.title || "Live Classroom"}</h3>
          <div className="text-muted small">
            Course: <strong>{liveClass?.course?.title || "-"}</strong> • Status: <span className="text-uppercase">{liveClass?.status || "-"}</span>
          </div>
        </div>

        <div className="alert alert-info border-0 rounded-4 shadow-sm mb-4">
          {getClassroomModeMessage(liveClass)}
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Link to="/live-classes" className="btn btn-outline-secondary rounded-pill px-4 shadow-sm">
            Back
          </Link>

          {liveClass?.recordingLink && liveClass?.status === "ended" ? (
            <a
              href={liveClass.recordingLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary rounded-pill px-4 shadow-sm"
            >
              Watch Recording
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header Section */}
      <div className="mb-4 d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <div className="d-flex align-items-center gap-3 mb-1">
            <h3 className="fw-bold mb-0">{liveClass?.title || "Live Classroom"}</h3>
            {meetingEnabled && (
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
            Start Time: {formatDateTime(liveClass?.startAt)} • Duration: {liveClass?.durationMin || "-"} min
          </div>
        </div>

        <div className="d-flex flex-column align-items-end gap-2">
          {meetingEnabled && (
            <div className="text-success fw-semibold small mb-1">
              🟢 {activeUsersCount} Student{activeUsersCount !== 1 ? 's' : ''} in room
            </div>
          )}
          <div className="d-flex flex-wrap gap-2">
            <Link
              to="/live-classes"
              className="btn btn-outline-secondary rounded-pill px-4 shadow-sm"
            >
              Exit
            </Link>

            {meetingEnabled ? (
              <a
                href={liveClass.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary rounded-pill px-4 shadow-sm"
              >
                Join Zoom Meeting
              </a>
            ) : null}

            {liveClass?.recordingLink && liveClass?.status === "ended" ? (
              <a
                href={liveClass.recordingLink}
                target="_blank"
                rel="noreferrer"
                className="btn btn-dark rounded-pill px-4 shadow-sm"
              >
                Watch Recording
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="alert alert-light border rounded-4 shadow-sm mb-4">
        {getClassroomModeMessage(liveClass)}
      </div>

      {error ? <div className="alert alert-danger border-0 shadow-sm rounded-4 mb-4">{error}</div> : null}

      {/* Pinned Questions */}
      {pinnedQuestions.length > 0 && (
        <div className="card border-warning border-2 shadow-sm rounded-4 mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-3 text-warning-emphasis">📌 Instructor Pinned Notes</h5>
            {pinnedQuestions.map((q) => (
              <div key={q._id} className="bg-warning-subtle rounded-3 p-3 mb-2">
                <div className="fw-semibold text-dark">{q.question}</div>
                {q.answer && (
                  <div className="mt-2 text-dark border-start border-warning border-3 ps-2">
                    <b>Answer:</b> {q.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Chat Section */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 h-100 d-flex flex-column">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
              <div className="d-flex justify-content-between align-items-center gap-2">
                <h5 className="fw-bold mb-0">Live Chat</h5>
                <span className={`badge rounded-pill ${chatEnabled ? "text-bg-success" : "text-bg-secondary"}`}>
                  {chatEnabled ? "Open" : isReadOnly ? "Closed" : "Locked"}
                </span>
              </div>
            </div>
            
            <div className="card-body d-flex flex-column" style={{ height: "500px" }}>
              <div className="flex-grow-1 overflow-auto mb-3 pe-2" style={{ scrollBehavior: "smooth" }}>
                {messages.length === 0 ? (
                  <div className="text-center text-muted mt-5">No chat messages yet.</div>
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
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="d-flex gap-2 mt-auto pt-3 border-top">
                <input
                  className="form-control rounded-pill px-4 bg-light border-0"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder={
                    chatEnabled
                      ? "Type your message..."
                      : isReadOnly
                      ? "Chat is closed after class end"
                      : "Chat is locked until classroom opens"
                  }
                  disabled={!chatEnabled || sendingChat}
                />
                <button
                  className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm"
                  type="submit"
                  disabled={!chatEnabled || sendingChat || !chatText.trim()}
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
              <div className="d-flex justify-content-between align-items-center gap-2">
                <h5 className="fw-bold mb-0">Ask Instructor</h5>
                <span className={`badge rounded-pill ${questionEnabled ? "text-bg-success" : "text-bg-secondary"}`}>
                  {questionEnabled ? "Open" : isReadOnly ? "Read Only" : "Locked"}
                </span>
              </div>
            </div>

            <div className="card-body overflow-auto d-flex flex-column" style={{ height: "500px" }}>
              <form onSubmit={handleAskQuestion} className="mb-4">
                <textarea
                  className="form-control bg-light border-0 rounded-3 mb-2 p-3"
                  rows={2}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={
                    questionEnabled
                      ? "Type your question here..."
                      : isReadOnly
                      ? "New questions are closed after class end"
                      : "Questions will open when classroom becomes active"
                  }
                  disabled={!questionEnabled || askingQuestion}
                />
                <div className="d-flex justify-content-end">
                  <button
                    className="btn btn-dark rounded-pill px-4 fw-semibold shadow-sm"
                    type="submit"
                    disabled={!questionEnabled || askingQuestion || !questionText.trim()}
                  >
                    {askingQuestion ? "Submitting..." : "Ask Question"}
                  </button>
                </div>
              </form>

              <div className="flex-grow-1 overflow-auto pe-2">
                {questions.length === 0 ? (
                  <div className="text-center text-muted mt-3">No questions asked yet.</div>
                ) : (
                  questions.map((q, index) => (
                    <div key={q._id || index} className="border border-2 rounded-4 p-3 mb-3 bg-white">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="fw-bold fs-6 text-dark me-3">{q.question}</div>
                        <span
                          className={`badge rounded-pill ${
                            q.status === "answered"
                              ? "bg-success-subtle text-success border border-success-subtle"
                              : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                          }`}
                        >
                          {q.status === "answered" ? "Answered" : "Pending"}
                        </span>
                      </div>

                      <div className="small text-muted mb-3 d-flex align-items-center gap-2">
                        <span className="fw-medium text-secondary">{q.askedBy?.name || q.student?.name || "Student"}</span>
                        <span>•</span>
                        <span>{formatDateTime(q.createdAt || q.timestamp)}</span>
                      </div>

                      {q.answer && (
                        <div className="bg-light p-3 rounded-3 border-start border-4 border-success">
                          <div className="small text-success fw-bold text-uppercase mb-1">Instructor Answer</div>
                          <div className="text-dark">{q.answer}</div>
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
    </div>
  );
}