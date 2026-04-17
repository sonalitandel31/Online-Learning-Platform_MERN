import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { track } from "../../../utils/track";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Lock,
  CheckCircle,
  Play,
  FileText,
  Type,
  ArrowLeft,
  Layout,
  Sparkles,
} from "lucide-react";

const PLANS_ROUTE = "/plans"; // ✅ change this to your real route

function Lesson() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedLessons, setCompletedLessons] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState("");

  // Access from /courses/:id
  const [hasAccess, setHasAccess] = useState(false);
  const [accessReason, setAccessReason] = useState("");

  const videoRef = useRef(null);
  const markingRef = useRef(false);

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
  const studentId = loggedInUser?._id;

  const BASE_URL = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");

  const showNotify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const autoEnrollViaSubscription = async () => {
    try {
      track("subscription_auto_enroll_click", { courseId, source: "lesson" });
      await api.post("/enrollments", { courseId, studentId, amount: 0, source: "subscription" });
      track("subscription_auto_enroll_success", { courseId, source: "lesson" });
      showNotify("Enrollment created via subscription ✅");
      window.location.reload();
    } catch (err) {
      console.error("Auto enroll via subscription failed:", err);
      track("subscription_auto_enroll_failed", { courseId, source: "lesson" });
      showNotify("Could not start via subscription. Try again.");
    }
  };

  useEffect(() => {
    const fetchLessonData = async () => {
      try {
        setLoading(true);
        setError("");

        if (!studentId) {
          setError("User not logged in.");
          setLoading(false);
          return;
        }

        track("lesson_page_open", { courseId, lessonId });

        // supports both shapes
        const { data } = await api.get(`/courses/${courseId}`);
        const courseData = data?.course || data || {};
        const access = data?.access || { ok: false, type: "none", reason: "" };

        setCourse(courseData);
        setHasAccess(!!access.ok);
        setAccessReason(access.reason || access.type || "");

        const lessonList = Array.isArray(courseData.lessons) ? courseData.lessons : [];
        setLessons(lessonList);

        // Enrollment (progress)
        try {
          const enrollRes = await api.get(`/enrollments/student/${studentId}/course/${courseId}`);
          const enrollment = enrollRes.data;

          if (!enrollment || enrollment?.message === "Enrollment not found") {
            setIsEnrolled(false);
            setCompletedLessons([]);
          } else {
            const isExpired = enrollment?.expiryDate && new Date(enrollment.expiryDate) < new Date();
            const allowed = ["active", "completed"].includes(enrollment.status) && !isExpired;
            setIsEnrolled(allowed);
            setCompletedLessons((enrollment.completedLessons || []).map(String));
          }
        } catch (err) {
          setIsEnrolled(false);
          setCompletedLessons([]);
        }

        // Current lesson
        const foundLesson = lessonList.find((l) => String(l._id) === String(lessonId)) || lessonList[0];
        if (foundLesson) {
          setCurrentLesson(foundLesson);
          localStorage.setItem(`lastLesson_${courseId}`, foundLesson._id);
        } else {
          setError("Lesson not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load details.");
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
  }, [courseId, lessonId, studentId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      setVideoProgress((video.currentTime / video.duration) * 100);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [currentLesson]);

  // ====== NAYA CODE: SMART WATCH TIME TRACKER (With Debugging) ======
  useEffect(() => {
    const video = videoRef.current;
    
    // 🔍 DEBUG 1: Page load hote hi ye print hona chahiye
    console.log("👀 Checking Lesson:", currentLesson?.title, "| Type:", currentLesson?.contentType);

    if (!video || String(currentLesson?.contentType || "").toLowerCase() !== "video") {
      console.log("⚠️ Tracker Stopped: Ya toh video player nahi mila, ya contentType 'video' nahi hai.");
      return;
    }

    console.log("🚀 Tracker is ACTIVE! Bacha video play karega toh timer chalega...");

    let heartbeatInterval;

    const sendHeartbeat = async () => {
      try {
        await api.post(
          "/analytics/track",
          {
            event: "video_watch_30s", 
            payload: { courseId: courseId, lessonId: currentLesson._id }
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        console.log("✅ Watch time recorded (Score +1)");
      } catch (err) {
        console.error("❌ Heartbeat failed", err);
      }
    };

    heartbeatInterval = setInterval(() => {
      if (!video.paused && !video.ended) {
        sendHeartbeat();
      }
    }, 30000);

    const handleVideoEnd = () => {
      if (video.duration > 0 && video.duration < 30) {
        sendHeartbeat();
        console.log("✅ Short video completed, watch time recorded!");
      }
    };

    const handleTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      setVideoProgress((video.currentTime / video.duration) * 100);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleVideoEnd);

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleVideoEnd);
    };
  }, [currentLesson, courseId, isEnrolled]);
  // ====== NAYA CODE KHATAM ======

  useEffect(() => {
    // progress endpoints depend on enrollment record
    if (!currentLesson || !isEnrolled || !course?._id) return;

    const markAsCompleted = async () => {
      const lessonKey = String(currentLesson._id);
      if (completedLessons.includes(lessonKey)) return;
      if (markingRef.current) return;

      markingRef.current = true;
      try {
        const resp = await api.post(
          `/courses/${course._id}/lessons/${currentLesson._id}/markWatched`,
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );

        setCompletedLessons((prev) => (prev.includes(lessonKey) ? prev : [...prev, lessonKey]));

        const earnedXp = (resp.data?.xpAwards || []).reduce((sum, x) => sum + Number(x?.xp || 0), 0);
        if (earnedXp > 0) showNotify(`+${earnedXp} XP earned ✅`);
      } catch (err) {
        console.error("markWatched error:", err);
        if (err.response?.status === 403) {
          showNotify("Start Learning via Subscription to enable progress tracking.");
        }
      } finally {
        markingRef.current = false;
      }
    };

    const isVideo = String(currentLesson.contentType || "").toLowerCase() === "video";
    if (isVideo ? videoProgress >= 90 : true) markAsCompleted();
  }, [currentLesson, videoProgress, isEnrolled, completedLessons, studentId, course]);

  const handleNext = () => {
    const index = lessons.findIndex((l) => String(l._id) === String(currentLesson?._id));
    if (index < lessons.length - 1) navigate(`/course/${courseId}/lessons/${lessons[index + 1]._id}`);
    else showNotify("🎉 You've finished the course content!");
  };

  const handlePrev = () => {
    const index = lessons.findIndex((l) => String(l._id) === String(currentLesson?._id));
    if (index > 0) navigate(`/course/${courseId}/lessons/${lessons[index - 1]._id}`);
    else showNotify("This is the first lesson!");
  };

  const getTextContent = (lesson) => {
    return (
      lesson?.html ||
      lesson?.content ||
      lesson?.text ||
      lesson?.body ||
      lesson?.description ||
      ""
    );
  };

  const isProbablyHtml = (str = "") => /<\/?[a-z][\s\S]*>/i.test(str);

  // --- SKELETON LOADER ENHANCEMENT ---
  if (loading) {
    return (
      <div className="lesson-page-container">
        <style>{`
          :root { 
            --purple: #6f42c1; 
            --light-purple: #f3effb; 
          }
          .lesson-page-container { display: flex; height: 100vh; background: var(--light-purple); overflow: hidden; }
          .lesson-sidebar { 
            width: 350px; background: white; border-right: 1px solid #e0d7f2; 
            display: flex; flex-direction: column; transition: transform 0.3s ease;
            box-shadow: 4px 0 15px rgba(111, 66, 193, 0.05);
          }
          .main-content { flex-grow: 1; overflow-y: auto; position: relative; background: var(--light-purple); }
          .content-inner { max-width: 1100px; margin: 0 auto; width: 100%; padding-bottom: 100px; }
          
          .skeleton {
            background: #e2e5e7;
            background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
            background-size: 200px 100%;
            background-repeat: no-repeat;
            border-radius: 4px;
            display: inline-block;
            line-height: 1;
            animation: skeletonShimmer 1.5s infinite linear;
          }
          @keyframes skeletonShimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
          @media (max-width: 991px) {
            .lesson-sidebar { display: none; }
          }
        `}</style>
        
        {/* Skeleton Sidebar */}
        <aside className="lesson-sidebar d-none d-lg-flex">
          <div className="p-4 border-bottom bg-white">
            <div className="skeleton mb-4" style={{ height: "20px", width: "140px", borderRadius: "4px" }}></div>
            <div className="skeleton mb-2" style={{ height: "24px", width: "200px", borderRadius: "4px" }}></div>
            <div className="skeleton rounded-pill mt-2" style={{ height: "4px", width: "100px" }}></div>
          </div>
          <div className="p-3 flex-grow-1 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="d-flex align-items-center gap-3 mb-3 p-3 rounded-4 border" style={{ borderColor: "#f8f5fe", background: "#fff" }}>
                 <div className="skeleton rounded-3" style={{ width: "24px", height: "24px", flexShrink: 0 }}></div>
                 <div className="flex-grow-1">
                   <div className="skeleton mb-2" style={{ height: "14px", width: "80%" }}></div>
                   <div className="skeleton" style={{ height: "10px", width: "40%" }}></div>
                 </div>
                 <div className="skeleton rounded-circle" style={{ width: "16px", height: "16px", flexShrink: 0 }}></div>
              </div>
            ))}
          </div>
        </aside>

        {/* Skeleton Main Content */}
        <main className="main-content p-3 p-lg-5">
          <div className="content-inner">
            {/* Header Desktop */}
            <div className="d-none d-lg-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center gap-3 w-50">
                <div className="skeleton rounded-3" style={{ width: "40px", height: "40px", flexShrink: 0 }}></div>
                <div className="skeleton" style={{ height: "28px", width: "100%", maxWidth: "400px", borderRadius: "6px" }}></div>
              </div>
              <div className="skeleton rounded-pill" style={{ height: "40px", width: "180px" }}></div>
            </div>

            {/* Mobile Header Skeleton */}
            <div className="d-lg-none d-flex align-items-center justify-content-between mb-4 bg-white p-2 rounded-pill shadow-sm">
              <div className="skeleton rounded-circle" style={{ width: "36px", height: "36px" }}></div>
              <div className="skeleton" style={{ height: "20px", width: "150px" }}></div>
              <div className="skeleton rounded-circle" style={{ width: "36px", height: "36px" }}></div>
            </div>

            {/* Title Section */}
            <div className="mb-4 mt-2">
              <div className="skeleton mb-3" style={{ height: "40px", width: "60%", borderRadius: "8px" }}></div>
              <div className="skeleton" style={{ height: "20px", width: "150px", borderRadius: "4px" }}></div>
            </div>

            {/* Video/PDF Container Placeholder */}
            <div 
              className="skeleton" 
              style={{ 
                width: "100%", 
                aspectRatio: "16/9", 
                borderRadius: "20px", 
                border: "4px solid white", 
                boxShadow: "0 25px 50px -12px rgba(111, 66, 193, 0.2)" 
              }}
            ></div>

            {/* Navigation Placeholder */}
            <div className="d-none d-lg-flex justify-content-between mt-5 pt-4 border-top" style={{ borderColor: "#e0d7f2" }}>
               <div className="skeleton rounded-pill" style={{ height: "40px", width: "120px" }}></div>
               <div className="skeleton rounded-pill" style={{ height: "40px", width: "160px" }}></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error)
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">{error}</div>
      </div>
    );

  const fileUrl = currentLesson?.fileUrl?.startsWith("http")
    ? currentLesson.fileUrl
    : `${BASE_URL}/${String(currentLesson?.fileUrl || "").replace(/^\//, "")}`;

  const canAccess = currentLesson?.isPreviewFree || hasAccess;
  const currentIndex = lessons.findIndex((l) => String(l._id) === String(currentLesson?._id));
  const showStartViaSubscription = hasAccess && !isEnrolled;

  return (
    <div className="lesson-page-container">
      <style>{`
        :root { 
          --purple: #6f42c1; 
          --light-purple: #f3effb; 
          --orange: #fd7e14; 
          --dark: #2d1b4e; 
        }
        
        .lesson-page-container { display: flex; height: 100vh; background: var(--light-purple); overflow: hidden; }
        .lesson-sidebar { 
          width: 350px; background: white; border-right: 1px solid #e0d7f2; 
          display: flex; flex-direction: column; transition: transform 0.3s ease;
          box-shadow: 4px 0 15px rgba(111, 66, 193, 0.05);
        }
        
        .lesson-list { flex-grow: 1; overflow-y: auto; padding: 10px; }
        
        .lesson-item { 
          cursor: pointer; padding: 14px 18px; border-radius: 12px;
          margin-bottom: 8px; display: flex; align-items: center; gap: 12px; transition: all 0.2s;
          border: 1px solid transparent;
        }
        .lesson-item:hover { background: #f8f5fe; }
        .lesson-item.active { 
          background: white; 
          border: 1px solid var(--purple); 
          box-shadow: 0 4px 12px rgba(111, 66, 193, 0.1);
        }
        .lesson-item.locked { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }

        .main-content { flex-grow: 1; overflow-y: auto; position: relative; background: var(--light-purple); }
        .content-inner { max-width: 1100px; margin: 0 auto; width: 100%; padding-bottom: 100px; }

        .player-wrapper { 
          background: #000; border-radius: 20px; overflow: hidden; 
          box-shadow: 0 25px 50px -12px rgba(111, 66, 193, 0.2); margin-bottom: 2rem;
          position: relative; aspect-ratio: 16/9; border: 4px solid white;
        }

        .pdf-frame { width: 100%; height: 80vh; border: none; border-radius: 20px; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }

        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1c4e9; border-radius: 10px; }

        .text-lesson-pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 15px; line-height: 1.75; color: #4b5563; /* matches text-secondary */ font-family: inherit;}

        .text-lesson-html { font-size: 15px; line-height: 1.75; color: #4b5563;}
        .text-lesson-html img { max-width: 100%; height: auto; }
        .text-lesson-html pre { white-space: pre-wrap; }

        @media (max-width: 991px) {
          .lesson-sidebar { 
            position: fixed; left: 0; top: 0; bottom: 0; z-index: 2000;
            transform: ${sidebarOpen ? "translateX(0)" : "translateX(-100%)"};
            width: 85%; max-width: 320px;
          }
          .sidebar-overlay {
            position: fixed; inset: 0; background: rgba(45, 27, 78, 0.4); 
            backdrop-filter: blur(4px); z-index: 1999; display: ${sidebarOpen ? "block" : "none"};
          }
        }

        .mobile-nav-bar {
          position: fixed; bottom: 0; left: 0; right: 0; background: white;
          border-top: 1px solid #e0d7f2; padding: 12px 20px; display: none;
          justify-content: space-between; align-items: center; z-index: 1500;
        }
        @media (max-width: 991px) { .mobile-nav-bar { display: flex; } }

        .notify-toast { 
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
          background: var(--purple); color: white; padding: 12px 24px; 
          border-radius: 50px; z-index: 3000; font-weight: 600; box-shadow: 0 10px 25px rgba(111, 66, 193, 0.3);
        }

        .btn-purple { background: var(--purple); color: white; }
        .btn-purple:hover { background: #5a32a3; color: white; }
        .btn-orange { background: var(--orange); color: white; }
        .btn-orange:hover { background: #e66d00; color: white; }
        .text-purple { color: var(--purple); }
      `}</style>

      <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>

      <aside className="lesson-sidebar">
        <div className="p-4 border-bottom bg-white">
          <button
            className="btn btn-link text-purple text-decoration-none fw-bold p-0 mb-3 d-flex align-items-center gap-2"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            <ArrowLeft size={18} /> Back to Course
          </button>

          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h6 className="m-0 fw-bold text-dark">Course Curriculum</h6>
              <div className="progress mt-2" style={{ height: "4px", width: "100px" }}>
                <div
                  className="progress-bar bg-purple"
                  style={{
                    width: lessons.length ? `${(completedLessons.length / lessons.length) * 100}%` : "0%",
                  }}
                ></div>
              </div>

              {!hasAccess && accessReason && <div className="small text-muted mt-2">Access: {accessReason}</div>}
            </div>

            <button className="btn btn-light d-lg-none" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="lesson-list custom-scrollbar">
          {lessons.map((l, i) => {
            const locked = !l.isPreviewFree && !hasAccess;
            const active = String(l._id) === String(currentLesson?._id);
            const done = completedLessons.includes(String(l._id));

            return (
              <div
                key={l._id}
                className={`lesson-item ${active ? "active" : ""} ${locked ? "locked" : ""}`}
                onClick={() => {
                  if (locked) {
                    track("lesson_click_locked", { courseId, lessonId: l._id, index: i });
                    showNotify("Enroll or Subscribe to access this lesson.");
                    return;
                  }
                  track("lesson_navigate", { courseId, lessonId: l._id, index: i });
                  setSidebarOpen(false);
                  navigate(`/course/${courseId}/lessons/${l._id}`);
                }}
              >
                <div className={`fw-bold small ${active ? "text-purple" : "opacity-30"}`}>{String(i + 1).padStart(2, "0")}</div>

                <div className="flex-grow-1">
                  <div className={`fw-bold small ${active ? "text-purple" : "text-secondary"}`}>{l.title}</div>
                  <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: "10px" }}>
                    {String(l.contentType).toLowerCase() === "video" ? (
                      <Play size={10} className="text-purple" />
                    ) : (
                      <FileText size={10} className="text-purple" />
                    )}
                    <span className="text-uppercase fw-bold text-muted">{l.contentType}</span>
                  </div>
                </div>

                {done ? <CheckCircle size={18} className="text-success" /> : locked ? <Lock size={14} className="text-muted" /> : null}
              </div>
            );
          })}
        </div>
      </aside>

      <main className="main-content p-3 p-lg-5">
        <div className="content-inner">
          <div className="d-none d-lg-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-white p-2 rounded-3 shadow-sm text-purple">
                <Layout size={20} />
              </div>
              <h5 className="fw-bold m-0 text-dark">{course?.title}</h5>
            </div>
            <div className="badge bg-white text-purple border px-3 py-2 rounded-pill shadow-sm fw-bold">
              {completedLessons.length} / {lessons.length} Modules Finished
            </div>
          </div>

          <div className="d-lg-none d-flex align-items-center justify-content-between mb-4 bg-white p-2 rounded-pill shadow-sm">
            <button className="btn btn-purple rounded-circle p-2" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="small fw-bold text-purple text-truncate mx-2">{currentLesson?.title}</span>
            <button className="btn btn-light rounded-circle p-2" onClick={() => navigate(`/courses/${courseId}`)}>
              <X size={20} />
            </button>
          </div>

          <div className="lesson-header mb-4">
            <h2 className="fw-bolder text-dark mb-1">{currentLesson?.title}</h2>
            <div className="d-flex align-items-center gap-2 text-muted small fw-bold">
              <Sparkles size={14} className="text-orange" />
              <span>
                PART {currentIndex + 1} OF {lessons.length}
              </span>
            </div>
          </div>

          {canAccess ? (
            <div className="media-section">
              {String(currentLesson?.contentType || "").toLowerCase() === "video" ? (
                <div className="player-wrapper">
                  <video ref={videoRef} className="w-100 h-100" controls controlsList="nodownload">
                    <source src={fileUrl} type="video/mp4" />
                  </video>
                </div>
              ) : String(currentLesson?.contentType || "").toLowerCase() === "pdf" ? (
                <div className="pdf-container mb-4">
                  <iframe src={`${fileUrl}#toolbar=0`} className="pdf-frame" title="PDF Content" />
                </div>
              ) : (
                <div className="card border-0 shadow-sm p-4 mb-4 bg-white rounded-4">
                  <div className="d-flex align-items-center gap-2 mb-3 text-purple">
                    <Type size={24} /> <h5 className="m-0 fw-bold">Lesson Notes</h5>
                  </div>

                  {(() => {
                    const content = getTextContent(currentLesson);

                    if (!content) {
                      return <div className="text-muted">No text content available for this lesson.</div>;
                    }

                    // HTML content
                    if (isProbablyHtml(content)) {
                      return <div className="text-lesson-html" dangerouslySetInnerHTML={{ __html: content }} />;
                    }

                    // Plain text (preserve new lines)
                    return <pre className="text-lesson-pre">{content}</pre>;
                  })()}
                </div>
              )}

              {showStartViaSubscription && (
                <div className="mt-3 p-3 bg-white rounded-4 shadow-sm border">
                  <div className="fw-bold text-dark mb-1">Enable Progress Tracking</div>
                  <div className="text-muted small mb-3">
                    You have access via subscription, but your enrollment record is missing. Create it to track progress & completion.
                  </div>
                  <div className="d-flex flex-column flex-sm-row gap-2">
                    <button className="btn btn-purple rounded-pill fw-bold px-4" onClick={autoEnrollViaSubscription}>
                      Start Learning (via Subscription)
                    </button>
                    <button className="btn btn-outline-info rounded-pill fw-bold px-4" onClick={() => navigate("/my-subscription")}>
                      View My Subscription
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-5 px-4 bg-white rounded-4 shadow-sm border border-white">
              <div className="bg-light-purple rounded-circle d-inline-flex p-4 mb-4 text-purple">
                <Lock size={40} />
              </div>
              <h4 className="fw-bold text-dark">Premium Content Locked</h4>
              <p className="text-muted mb-4 mx-auto" style={{ maxWidth: "350px" }}>
                This lesson is part of the premium curriculum. Enroll or subscribe to unlock high-quality learning materials.
              </p>
              <div className="d-grid gap-2 col-md-6 mx-auto">
                <button className="btn btn-orange px-5 py-3 rounded-pill fw-bold shadow-lg" onClick={() => navigate(`/courses/${courseId}`)}>
                  Enroll Now
                </button>
                <button className="btn btn-outline-info px-5 py-3 rounded-pill fw-bold shadow-sm" onClick={() => navigate(PLANS_ROUTE)}>
                  View Plans / Subscribe
                </button>
              </div>
            </div>
          )}

          <div className="d-none d-lg-flex justify-content-between mt-5 pt-4 border-top border-purple border-opacity-10">
            <button
              className="btn btn-link text-purple text-decoration-none fw-bold d-flex align-items-center gap-2 px-0"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <div className="bg-white p-2 rounded-circle shadow-sm">
                <ChevronLeft size={20} />
              </div>
              Previous
            </button>

            <button className="btn btn-orange px-5 py-2 rounded-pill fw-bold shadow-lg d-flex align-items-center gap-2" onClick={handleNext}>
              {currentIndex === lessons.length - 1 ? "Complete Content" : "Next Lesson"} <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </main>

      <div className="mobile-nav-bar shadow-lg">
        <button className="btn btn-light rounded-pill px-3" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft size={20} className="text-purple" />
        </button>

        <div className="text-center">
          <div className="fw-bold text-purple small">
            {currentIndex + 1} / {lessons.length}
          </div>
          <div className="text-muted" style={{ fontSize: "9px", fontWeight: "800" }}>
            MODULE PROGRESS
          </div>
        </div>

        <button className="btn btn-orange rounded-pill px-4 fw-bold shadow-sm" onClick={handleNext}>
          {currentIndex === lessons.length - 1 ? <CheckCircle size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {notification && <div className="notify-toast animate__animated animate__fadeInDown">{notification}</div>}
    </div>
  );
}

export default Lesson;