import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { track } from "../../../utils/track";
import {
  ChevronLeft,
  Menu,
  X,
  Timer,
  Award,
  CheckCircle,
  Bookmark,
  PlayCircle,
  Lock,
  Camera,
  Maximize,
  AlertTriangle
} from "lucide-react";

const PLANS_ROUTE = "/plans";

export default function Exams() {
  const { courseId, examId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [exams, setExams] = useState([]);
  const [exam, setExam] = useState(null);

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [result, setResult] = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(0);

  const [examStatuses, setExamStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Proctoring States
  const [proctoringActive, setProctoringActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cheatCount, setCheatCount] = useState(0);
  const [systemMessage, setSystemMessage] = useState({ text: "", type: "" });
  
  // --- NAYA STATE: Fullscreen track karne ke liye ---
  const [isFullscreen, setIsFullscreen] = useState(true); 

  // Refs for logic & fixes
  const videoRef = useRef(null);
  const cheatCountRef = useRef(0); 
  const isSubmittingRef = useRef(false); 

  // access control
  const [hasAccess, setHasAccess] = useState(false);
  const [accessReason, setAccessReason] = useState("");
  const [accessType, setAccessType] = useState("none");

  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = () => setRefreshKey((k) => k + 1);

  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;

  const primaryPurple = "#6f42c1";
  const accentOrange = "#fcb269";

  const maxAttempts = exam?.settings?.maxAttempts || 3;
  const tabLimit = exam?.proctoring?.tabSwitchLimit || exam?.settings?.tabSwitchLimit || 3;

  const displayMessage = (text, type = "info") => {
    setSystemMessage({ text, type });
    setTimeout(() => setSystemMessage({ text: "", type: "" }), 5000);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleAnswerChange = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const canAttempt = useMemo(() => {
    const passed = result?.isCompleted;
    if (passed) return false;
    if (attemptNumber >= maxAttempts) return false;
    return true;
  }, [result, attemptNumber, maxAttempts]);

  const loadResult = useCallback(async (eid) => {
    if (!eid || !studentId) return;
    try {
      const attemptRes = await api.get(`/exams/${eid}/result/${studentId}`);
      const data = attemptRes.data || null;
      const att = Number(data?.attemptNumber || 0);

      setAttemptNumber(att);

      if (att <= 0) {
        setResult(null);
        setExamStatuses((prev) => ({ ...prev, [eid]: "pending" }));
        return;
      }

      setResult(data);
      if (data?.isCompleted) setExamStatuses((prev) => ({ ...prev, [eid]: "completed" }));
      else setExamStatuses((prev) => ({ ...prev, [eid]: "attempted" }));
    } catch (err) {
      if (err.response?.status === 403) {
        track("exam_result_access_denied", { courseId, examId: eid });
        displayMessage("Access denied. Please enroll or subscribe.", "danger");
        navigate(PLANS_ROUTE, { replace: true });
        return;
      }
      if (err.response?.status === 404) {
        setAttemptNumber(0);
        setResult(null);
        setExamStatuses((prev) => ({ ...prev, [eid]: "pending" }));
        return;
      }
    }
  }, [studentId, courseId, navigate]);

  const autoEnrollViaSubscription = async () => {
    try {
      track("subscription_auto_enroll_click", { courseId, source: "exam" });
      await api.post("/enrollments", { courseId, studentId, amount: 0, source: "subscription" });
      track("subscription_auto_enroll_success", { courseId, source: "exam" });
      displayMessage("Enrollment created via subscription ✅", "success");
      refetch();
    } catch (err) {
      track("subscription_auto_enroll_failed", { courseId, source: "exam" });
      displayMessage("Could not start via subscription. Try again.", "danger");
    }
  };

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        if (!studentId) {
          displayMessage("User not logged in.", "danger");
          setLoading(false);
          return;
        }

        track("exam_page_open", { courseId, examId });

        const courseRes = await api.get(`/courses/${courseId}`);
        const courseData = courseRes.data?.course || courseRes.data || {};
        const access = courseRes.data?.access || { ok: false, type: "none", reason: "" };

        setCourse(courseData);
        setHasAccess(!!access.ok);
        setAccessReason(access.reason || access.type || "");
        setAccessType(access.type || "none");

        const examsRes = await api.get(`/exams/course/${courseId}`);
        const list = examsRes.data || [];
        setExams(list);

        const progressStatuses = {};
        await Promise.all(
          list.map(async (ex) => {
            try {
              const res = await api.get(`/exams/${ex._id}/result/${studentId}`);
              const att = Number(res.data?.attemptNumber || 0);
              if (res.data?.isCompleted) progressStatuses[ex._id] = "completed";
              else if (att > 0) progressStatuses[ex._id] = "attempted";
              else progressStatuses[ex._id] = "pending";
            } catch (e) {
              if (e.response?.status === 403) progressStatuses[ex._id] = "locked";
              else progressStatuses[ex._id] = "pending";
            }
          })
        );
        setExamStatuses(progressStatuses);

        if (examId) {
          const singleExamRes = await api.get(`/exams/course/${courseId}/exam/${examId}`);
          setExam(singleExamRes.data);
          setAnswers({});
          setSubmitted(false);
          setProctoringActive(false);
          setTimeLeft((singleExamRes.data?.duration || 0) * 60);
          await loadResult(examId);
        } else {
          setExam(null);
          setResult(null);
          setAttemptNumber(0);
        }
      } catch (err) {
        if (err.response?.status === 403) {
          track("exam_access_denied", { courseId, examId });
          navigate(PLANS_ROUTE, { replace: true });
          return;
        }
        displayMessage("Failed to load exam data.", "danger");
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, [courseId, examId, studentId, refreshKey, loadResult]);

  useEffect(() => {
    if (!timeLeft || submitted || !proctoringActive) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted, proctoringActive]);

  // --- UPDATED Proctoring Hooks ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && proctoringActive && !submitted) {
        cheatCountRef.current += 1;
        const newCount = cheatCountRef.current;
        
        setCheatCount(newCount);

        if (newCount >= tabLimit) {
          displayMessage("Too many violations. Auto-submitting...", "danger");
          handleSubmit(true);
        } else {
          displayMessage(`Warning: Tab switch detected. Violation ${newCount} of ${tabLimit}.`, "warning");
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && proctoringActive && !submitted) {
        setIsFullscreen(false); // Set state to block UI
        cheatCountRef.current += 1;
        setCheatCount(cheatCountRef.current);
        
        if (cheatCountRef.current >= tabLimit) {
          handleSubmit(true);
        }
      } else if (document.fullscreenElement) {
        setIsFullscreen(true); // Restore UI when back in fullscreen
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [proctoringActive, submitted, tabLimit]);

  useEffect(() => {
    if (proctoringActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [proctoringActive, cameraStream]);

  const startProctoredExam = async () => {
    setSubmitted(false);
    setAnswers({});
    setTimeLeft((exam?.duration || 0) * 60);
    setCheatCount(0);
    cheatCountRef.current = 0; 
    isSubmittingRef.current = false; 
    setIsFullscreen(true);
    
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      if (exam?.proctoring?.webcamRequired !== false) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
      }
      
      if (exam?.proctoring?.fullscreenRequired !== false) {
        await document.documentElement.requestFullscreen();
      }
      
      setProctoringActive(true);
      displayMessage("Proctoring active. Exam started.", "success");
    } catch (err) {
      displayMessage("Please allow camera access and fullscreen to begin the exam.", "danger");
    }
  };

  const forceEnterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(err => {
      displayMessage("Failed to enter fullscreen.", "danger");
    });
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log("Exit fullscreen ignored", err));
    }
  };

  const handleSubmit = async (isAuto = false) => {
    if (!examId || !exam || submitted || isSubmittingRef.current) return;
    
    if (!hasAccess) {
      navigate(PLANS_ROUTE);
      return;
    }

    isSubmittingRef.current = true;
    setSubmitted(true);
    stopCamera();
    setProctoringActive(false);

    try {
      track("exam_submit_attempt", { courseId, examId, isAuto });
      const currentCheatCount = cheatCountRef.current;
      const res = await api.post(`/exams/course/${courseId}/exam/${examId}/submit`, { answers, cheatCount: currentCheatCount });
      const earnedXp = (res.data?.xpAwards || []).reduce((sum, x) => sum + Number(x?.xp || 0), 0);

      if (isAuto) displayMessage("Time up or violations exceeded! Exam auto-submitted.", "danger");
      else if (earnedXp > 0) displayMessage(`Exam submitted! +${earnedXp} XP earned ✅`, "success");
      else displayMessage("Exam submitted successfully.", "success");

      await loadResult(examId);
      track("exam_submit_success", { courseId, examId, earnedXp });
    } catch (err) {
      setSubmitted(false);
      isSubmittingRef.current = false;
      track("exam_submit_failed", { courseId, examId });
      displayMessage(err.response?.data?.message || "Submission failed.", "danger");
    }
  };

  const suggestAutoEnroll = hasAccess && accessType === "subscription" && attemptNumber === 0 && !result;

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-warning"></div>
      <h5 className="ms-3 text-secondary fw-light">Loading exam...</h5>
    </div>
  );

  if (!hasAccess) {
    return (
      <div className="container py-5">
        <div className="card border-0 shadow-sm p-4 p-md-5 text-center rounded-4">
          <div className="bg-light rounded-circle d-inline-flex p-4 mb-4 mx-auto">
            <Lock size={52} className="text-muted" />
          </div>
          <h2 className="fw-bold h4">Exam Access Locked</h2>
          <p className="text-muted mb-4">
            You need to enroll or subscribe to attempt exams for this course.
            {accessReason ? <span className="d-block small mt-1">Reason: {accessReason}</span> : null}
          </p>
          <div className="d-grid gap-2 col-md-6 mx-auto">
            <button className="btn btn-warning rounded-pill fw-bold py-2" onClick={() => navigate(`/courses/${courseId}`)}>
              Enroll Now
            </button>
            <button className="btn btn-outline-info rounded-pill fw-bold py-2" onClick={() => navigate(PLANS_ROUTE)}>
              View Plans / Subscribe
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-page-root">
      <style>{`
        .exam-page-root { display: flex; height: 100vh; background: #fff; overflow: hidden; position: relative; }
        .exam-sidebar { width: 350px; background: #fdfdfd; border-right: 1px solid #eee; display: flex; flex-direction: column; transition: all 0.3s ease-in-out; height: 100vh; z-index: 2000; }
        .sidebar-header { padding: 25px; border-bottom: 2px solid #f8f8f8; }
        .exam-scroll-area { flex: 1; overflow-y: auto; }
        .exam-nav-item { padding: 18px 25px; cursor: pointer; border-bottom: 1px solid #f9f9f9; display: flex; align-items: center; gap: 15px; transition: 0.2s; color: #666; font-weight: 500; text-decoration: none; }
        .exam-nav-item:hover { background: #fcfaff; color: ${primaryPurple}; }
        .exam-nav-item.active { background: #f3eeff; color: ${primaryPurple}; border-left: 5px solid ${primaryPurple}; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1500; display: none; }
        .exam-main-content { flex: 1; overflow-y: auto; background: #fff; width: 100%; position: relative; }
        .sticky-top-bar { position: sticky; top: 0; z-index: 1000; background: #fff; padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .question-container { max-width: 850px; margin: 20px auto; padding: 0 15px; }
        .q-card { border: 1px solid #efefef; border-radius: 15px; padding: 20px; margin-bottom: 20px; transition: 0.3s; text-align: left; }
        .option-tile { display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid #f0f0f0; border-radius: 12px; margin-top: 10px; cursor: pointer; transition: 0.2s; text-align: left; }
        .option-tile:hover { border-color: ${accentOrange}; background: #fff9f2; }
        .option-tile.selected { border-color: ${primaryPurple}; background: #f3eeff; }
        .btn-purple { background: ${primaryPurple}; color: white; border: none; }
        .btn-purple:hover { background: #5a32a3; color: white; }
        
        .video-proctor { 
           position: fixed; 
           bottom: 20px; 
           right: 20px; 
           width: 220px; 
           height: 165px; 
           border-radius: 12px; 
           border: 3px solid ${primaryPurple}; 
           z-index: 9999; 
           object-fit: cover; 
           box-shadow: 0 8px 25px rgba(0,0,0,0.3); 
           background-color: #000;
        }
        
        .inline-message { padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; text-align: left; font-weight: 600; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .msg-danger { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
        .msg-success { background: #dcfce7; color: #166534; border: 1px solid #4ade80; }
        .msg-warning { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }

        @media (max-width: 991px) {
          .exam-sidebar { position: fixed; left: 0; top: 0; transform: ${sidebarOpen ? "translateX(0)" : "translateX(-100%)"}; box-shadow: ${sidebarOpen ? "10px 0 30px rgba(0,0,0,0.1)" : "none"}; }
          .overlay { display: ${sidebarOpen ? "block" : "none"}; }
          .sticky-top-bar { padding: 10px 15px; }
          .question-container { margin-top: 10px; }
          .q-card { padding: 15px; }
          .video-proctor { width: 140px; height: 105px; bottom: 15px; right: 15px; }
        }
      `}</style>

      <div className="overlay" onClick={() => setSidebarOpen(false)}></div>

      <aside className="exam-sidebar shadow-sm">
        <div className="sidebar-header d-flex justify-content-between align-items-center">
          <div>
            <button className="btn btn-link p-0 text-muted text-decoration-none small mb-2 text-start" onClick={() => navigate(`/courses/${courseId}`)}>
              <ChevronLeft size={16} /> Back to Course
            </button>
            <h5 className="fw-bold d-flex align-items-center gap-2 mb-0 text-start">
              <Bookmark size={20} className="text-purple" /> Assessments
            </h5>
            {suggestAutoEnroll && (
              <div className="mt-2">
                <button className="btn btn-sm btn-outline-info rounded-pill fw-bold" onClick={autoEnrollViaSubscription}>
                  Enable Progress Tracking
                </button>
              </div>
            )}
          </div>
          <button className="btn d-lg-none p-0" onClick={() => setSidebarOpen(false)}>
            <X size={24} className="text-muted" />
          </button>
        </div>

        <div className="exam-scroll-area text-start">
          {exams.map((ex, i) => (
            <div key={ex._id} className={`exam-nav-item ${ex._id === examId ? "active" : ""}`} onClick={() => { navigate(`/course/${courseId}/exam/${ex._id}`); setSidebarOpen(false); }}>
              <div className="fw-bold" style={{ opacity: 0.4 }}>{i + 1 < 10 ? `0${i + 1}` : i + 1}</div>
              <div className="flex-grow-1 text-truncate small text-start">{ex.title}</div>
              {examStatuses[ex._id] === "completed" && <CheckCircle size={18} className="text-success" />}
              {examStatuses[ex._id] === "attempted" && <span className="badge bg-warning text-dark rounded-pill">Tried</span>}
              {examStatuses[ex._id] === "locked" && <span className="badge bg-light text-muted rounded-pill">Locked</span>}
            </div>
          ))}
        </div>
      </aside>

      <main className="exam-main-content">
        <div className="sticky-top-bar">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-light d-lg-none p-2" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            {exam && proctoringActive && (
              <div className="d-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill">
                <Timer size={16} className={timeLeft < 60 ? "text-danger" : "text-purple"} />
                <span className={`fw-bold small ${timeLeft < 60 ? "text-danger" : "text-purple"}`}>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
          {proctoringActive && (
            <button className="btn btn-purple rounded-pill px-3 py-1 btn-sm fw-bold shadow-sm" onClick={() => handleSubmit(false)}>
              Submit Exam
            </button>
          )}
        </div>

        <div className="question-container">
          {systemMessage.text && (
            <div className={`inline-message msg-${systemMessage.type}`}>
              {systemMessage.text}
            </div>
          )}

          {!examId || !exam ? (
            <div className="text-center py-5">
              <PlayCircle size={60} className="text-purple opacity-25 mb-4" />
              <h2 className="fw-bold">Ready to Start?</h2>
              <p className="text-muted px-3">Select an assessment module from the list to begin.</p>
            </div>
          ) : (
            <>
              {result && !proctoringActive && attemptNumber > 0 && (
                <div className="card border-0 shadow-sm p-3 p-md-4 rounded-4 mb-4 text-start">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <h5 className="fw-bold mb-1">Your Attempt Summary</h5>
                      <p className="text-muted mb-0 small">
                        Attempts Used: <b>{attemptNumber}/{maxAttempts}</b>
                        &nbsp;• Remaining: <b>{Math.max(0, maxAttempts - attemptNumber)}</b>
                      </p>
                    </div>
                    <span className={`badge rounded-pill px-3 py-2 ${result.isCompleted ? "bg-success" : "bg-warning text-dark"}`}>
                      {result.isCompleted ? "PASSED ✅" : "NOT PASSED"}
                    </span>
                  </div>

                  <div className="row g-3 mt-2">
                    <div className="col-6 col-md-3">
                      <div className="p-3 border rounded-3 text-center">
                        <small className="text-muted d-block">Last Score</small>
                        <div className="fw-bold h5 mb-0">{result.score ?? 0}%</div>
                      </div>
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="p-3 border rounded-3 text-center">
                        <small className="text-muted d-block">Best Score</small>
                        <div className="fw-bold h5 mb-0">{result.bestScore ?? 0}%</div>
                      </div>
                    </div>
                    
                    <div className="col-12 col-md-6">
                       <div className="p-3 border rounded-3">
                         <div className="fw-bold">Exam Status</div>
                         <div className="text-muted small">
                           Passing score required is <b>{result?.passPercentage || 60}%</b>.
                         </div>
                       </div>
                    </div>
                  </div>

                  {result.allAttempts && result.allAttempts.length > 0 && (
                    <div className="mt-4 pt-4 border-top">
                      <h6 className="fw-bold mb-3 text-dark">Attempt History</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered mb-0 text-center align-middle" style={{ fontSize: "0.85rem" }}>
                          <thead className="table-light text-muted">
                            <tr>
                              <th>Attempt</th>
                              <th>Date</th>
                              <th>Score</th>
                              <th>Security</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.allAttempts.map((att) => (
                              <tr key={att.attemptNumber}>
                                <td className="fw-bold">#{att.attemptNumber}</td>
                                <td>{new Date(att.date).toLocaleDateString()}</td>
                                <td className="fw-bold">{att.score}%</td>
                                <td>
                                  {att.autoSubmitted ? (
                                    <span className="badge bg-danger">Disqualified</span>
                                  ) : att.tabSwitches > 0 ? (
                                    <span className="badge bg-warning text-dark">{att.tabSwitches} Warnings</span>
                                  ) : (
                                    <span className="badge bg-success">Clean</span>
                                  )}
                                </td>
                                <td>
                                  {att.isPassed ? (
                                     <span className="text-success fw-bold">Pass</span>
                                  ) : (
                                     <span className="text-danger fw-bold">Fail</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!proctoringActive && canAttempt && !submitted && (
                <div className="card border-0 shadow-sm p-4 rounded-4 text-start mt-4">
                  <h3 className="fw-bold mb-3">Pre-Exam Check</h3>
                  <p className="text-muted">This exam is strictly proctored. Before starting, please ensure:</p>
                  <ul className="text-muted mb-4 text-start">
                    <li><Camera size={16} className="me-2 d-inline"/> You allow camera permissions (your video is recorded locally).</li>
                    <li><Maximize size={16} className="me-2 d-inline"/> You stay in fullscreen mode.</li>
                    <li>Do not switch tabs. You are allowed a maximum of {tabLimit} warnings before automatic submission.</li>
                  </ul>
                  <button className="btn btn-purple rounded-pill py-2 px-4 fw-bold d-inline-block w-auto" onClick={startProctoredExam}>
                    Start Proctored Exam
                  </button>
                </div>
              )}

              {!proctoringActive && !canAttempt && !submitted && (
                <div className="card border-0 shadow-sm p-4 p-md-5 text-center rounded-4 mt-3">
                  <Award size={60} className="text-purple mb-4 mx-auto" />
                  <h2 className="fw-bold h4">Assessment View</h2>
                  <p className="text-muted small mb-4">You have already completed this exam or reached the attempt limit.</p>
                  
                  <button className="btn btn-purple px-4 py-2 rounded-pill fw-bold" onClick={() => navigate(`/courses/${courseId}`)}>
                    Back to Lessons
                  </button>
                </div>
              )}

              {/* --- NAYA LOGIC: Agar Fullscreen nahi hai toh Questions chupa do --- */}
              {proctoringActive && !isFullscreen && exam?.proctoring?.fullscreenRequired !== false && (
                <div className="card border-0 shadow-lg p-5 text-center rounded-4 mt-4" style={{ backgroundColor: "#fff5f5", border: "2px solid #f87171" }}>
                  <AlertTriangle size={60} className="text-danger mb-3 mx-auto" />
                  <h3 className="fw-bolder text-dark mb-2">Proctoring Alert</h3>
                  <p className="text-muted fs-5 mb-4">You have exited fullscreen mode. The exam is paused and a warning has been recorded. Please return to fullscreen to continue.</p>
                  <button className="btn btn-danger btn-lg rounded-pill px-5 fw-bold mx-auto" onClick={forceEnterFullscreen}>
                    <Maximize size={20} className="me-2 d-inline" /> Return to Fullscreen
                  </button>
                </div>
              )}

              {/* Sirf tabhi questions dikhao jab student rules follow kar raha ho */}
              {proctoringActive && (isFullscreen || exam?.proctoring?.fullscreenRequired === false) && (
                <>
                  <div className="mb-4 border-bottom pb-3 text-start">
                    <h2 className="fw-bold text-dark h4">{exam.title}</h2>
                    <div className="d-flex gap-3 mt-2">
                      <span className="small text-muted d-flex align-items-center">
                        <Bookmark size={14} style={{ color: accentOrange }} className="me-1" /> {exam.questions.length} Qs
                      </span>
                      <span className="small text-muted d-flex align-items-center">
                        <Timer size={14} style={{ color: accentOrange }} className="me-1" /> {exam.duration} Min
                      </span>
                    </div>
                  </div>

                  {exam.questions.map((q, index) => (
                    <div key={q._id || index} className="q-card text-start">
                      <div className="d-flex gap-2 mb-3">
                        <span className="badge p-2 px-3 rounded-pill d-flex align-items-center" style={{ background: "#f3eeff", color: primaryPurple, height: "30px" }}>
                          {index + 1}
                        </span>
                        <h6 className="fw-bold lh-base m-0 pt-1">{q.questionText}</h6>
                      </div>

                      <div className="options-grid text-start">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`option-tile ${answers[q._id] === opt ? "selected" : ""}`} onClick={() => handleAnswerChange(q._id, opt)}>
                            <div className="dot border rounded-circle d-flex align-items-center justify-content-center" style={{ width: 16, height: 16, flexShrink: 0 }}>
                              {answers[q._id] === opt && <div className="rounded-circle" style={{ width: 8, height: 8, background: primaryPurple }}></div>}
                            </div>
                            <span className="small fw-medium">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="text-center mt-4 pb-5">
                    <button className="btn btn-purple btn-lg px-5 rounded-pill fw-bold shadow" onClick={() => handleSubmit(false)} disabled={submitted}>
                      Complete & Submit
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        
        {proctoringActive && exam?.proctoring?.webcamRequired !== false && (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            className="video-proctor" 
            style={{ transform: "scaleX(-1)" }} 
          />
        )}
      </main>
    </div>
  );
}