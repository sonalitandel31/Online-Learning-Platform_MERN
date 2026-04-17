import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { track } from "../../../utils/track";
import { Eye, Download, PlayCircle, BookOpen, FileText, CheckCircle, Lock, Award, Info, AlertTriangle, ChevronRight, Clock, User, BarChart, MessageCircle, ShieldAlert, Trophy, } from "lucide-react";
import RatingBox from "../../../components/RatingBox";

const PLANS_ROUTE = "/subscription-plans";

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [exams, setExams] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedTab, setSelectedTab] = useState("lessons");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enrollLoading, setEnrollLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const [examProgress, setExamProgress] = useState([]);
  const [progress, setProgress] = useState(0);
  const [certificate, setCertificateUrl] = useState(null);
  const [enrollmentId, setEnrollmentId] = useState(null);

  const [videoProgress, setVideoProgress] = useState(0);
  const [discussionCount, setDiscussionCount] = useState(0);

  const [gamiLoading, setGamiLoading] = useState(true);
  const [gami, setGami] = useState({ xpTotal: 0, xpInCourse: 0, streakCount: 0 });

  const [badgeLoading, setBadgeLoading] = useState(true);
  const [badges, setBadges] = useState([]);

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
  });

  // Access from /courses/:id -> data.access.ok (purchase/subscription/none)
  const [hasAccess, setHasAccess] = useState(false);
  const [accessReason, setAccessReason] = useState("");

  const [relatedCourses, setRelatedCourses] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [liveClasses, setLiveClasses] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [joiningLiveId, setJoiningLiveId] = useState("");
  const joinedLiveIdRef = useRef(null);

  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;

  const videoRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const lastPositionRef = useRef(0);
  const rewindCountRef = useRef(0);

  // B2B specific flags
  const isCorporateCourse = course?.isGlobal === false;
  const isCompanyEmployee = !!loggedInUser?.companyId;

  // normalize base url (avoid double slashes)
  const BASE_URL = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");

  const showAlert = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "info" }), 5000);
  };

  const token = localStorage.getItem("token") || "";

  // ---------- helpers ----------
  const isPaidCourse = Number(course?.price || 0) > 0;
  const showSubscribeCTA = isPaidCourse && !hasAccess;
  const showStartViaSubscription = hasAccess && !isEnrolled;

  const safeUrl = (u) => {
    if (!u) return undefined;
    return u.startsWith("http") ? u : `${BASE_URL}/${String(u).replace(/^\//, "")}`;
  };

  const pickArray = (res) => {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.courses)) return d.courses;
    if (Array.isArray(d?.classes)) return d.classes;
    if (Array.isArray(d?.result)) return d.result;
    if (Array.isArray(d?.payload)) return d.payload;
    if (Array.isArray(d?.data?.classes)) return d.data.classes;
    return [];
  };

  const canAccessLiveClasses = hasAccess;

  const canJoinLiveClass = (lc) => {
    if (!lc) return false;
    if (!canAccessLiveClasses) return false;
    if (lc.status === "cancelled" || lc.status === "ended") return false;
    if (lc.status === "live") return true;

    if (lc.status === "scheduled" && lc.startAt) {
      const diffMs = new Date(lc.startAt).getTime() - Date.now();
      return diffMs <= 10 * 60 * 1000;
    }

    return false;
  };

  const getLiveJoinMessage = (lc) => {
    if (!canAccessLiveClasses) return "Enroll or subscribe to join live classes.";
    if (!lc) return "";
    if (lc.status === "cancelled") return "This class has been cancelled.";
    if (lc.status === "ended") return "This class has already ended.";
    if (lc.status === "live") return "Class is live now. You can join.";

    if (lc.status === "scheduled" && lc.startAt) {
      const diffMs = new Date(lc.startAt).getTime() - Date.now();

      if (diffMs > 10 * 60 * 1000) {
        return "Join unlocks 10 minutes before start time.";
      }

      return "Class is starting soon. You can join now.";
    }

    return "";
  };

  // ---------- subscription auto-enroll ----------
  const autoEnrollViaSubscription = async () => {
    try {
      setEnrollLoading(true);
      const { data } = await api.post(
        "/enrollments",
        { courseId: id, source: "subscription", amount: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        showAlert("Enrolled via Subscription! ✅", "success");
        await refreshEnrollmentState(id);
      }
    } catch (err) {
      console.error("Auto-enroll failed:", err.response?.data);
      showAlert(err.response?.data?.message || "Server error", "danger");
    } finally {
      setEnrollLoading(false);
    }
  };

  // ---------- gamification ----------
  const fetchGamification = async (courseId) => {
    try {
      if (!courseId) return;
      setGamiLoading(true);
      const res = await api.get(`/gamification/me?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGami({
        xpTotal: res.data?.xpTotal ?? 0,
        xpInCourse: res.data?.xpInCourse ?? 0,
        streakCount: res.data?.streakCount ?? 0,
      });
    } catch (e) {
      console.error("Gamification fetch failed:", e);
      setGami({ xpTotal: 0, xpInCourse: 0, streakCount: 0 });
    } finally {
      setGamiLoading(false);
    }
  };

  const fetchBadges = async (courseId) => {
    try {
      if (!courseId) return;
      setBadgeLoading(true);
      const res = await api.get(`/gamification/badges?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBadges(Array.isArray(res.data?.badges) ? res.data.badges : []);
    } catch (e) {
      console.error("Badges fetch failed:", e);
      setBadges([]);
    } finally {
      setBadgeLoading(false);
    }
  };

  // ---------- enrollment fetch helper ----------
  const refreshEnrollmentState = async (courseId) => {
    try {
      if (!studentId || !courseId) return;

      const enrollRes = await api.get(`/enrollments/student/${studentId}/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const enrollData = enrollRes.data;

      if (enrollData) {
        const now = new Date();
        const expired = enrollData.expiryDate && new Date(enrollData.expiryDate) < now;

        const active =
          (enrollData.status === "active" || enrollData.status === "completed") && !expired;

        setIsEnrolled(active);
        setIsExpired(enrollData.status === "cancelled" || expired);

        setProgress(enrollData.progress || 0);
        setCompletedLessons(enrollData.completedLessons || []);
        setExamProgress(enrollData.examProgress || []);
        setCertificateUrl(enrollData.certificate || enrollData.certificateUrl || null);

        setEnrollmentId(enrollData._id);
      }
    } catch (err) {
      console.error("refreshEnrollmentState error:", err);
    }
  };

  // ---------- auth guard ----------
  useEffect(() => {
    if (!loggedInUser) {
      navigate("/login", { replace: true });
    }
  }, [loggedInUser, navigate]);

  // ---------- load course + access + enrollment ----------
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        setError("");

        track("course_view", { courseId: id });

        // Supports both: {course, access} OR direct course object
        const { data } = await api.get(`/courses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const courseData = data?.course || data || {};
        const access = data?.access || { ok: false, type: "none", reason: "" };

        setCourse(courseData);
        setHasAccess(!!access.ok);
        setAccessReason(access.reason || access.type || "");

        track("course_view", {
          courseId: courseData?._id || id,
          title: courseData?.title,
          price: Number(courseData?.price || 0),
          status: courseData?.status,
          level: courseData?.level,
          category: courseData?.category?.name,
          accessOk: !!access.ok,
          accessType: access.type,
          accessReason: access.reason,
        });

        const courseLessons = Array.isArray(courseData.lessons) ? courseData.lessons : [];
        const courseExams = Array.isArray(courseData.exams) ? courseData.exams : [];

        setLessons(courseLessons);
        setExams(courseExams);

        // select preview lesson
        const firstPreview = courseLessons.find((l) => l.isPreviewFree) || courseLessons[0];
        setSelectedLesson(firstPreview || null);

        // gamification + badges
        if (studentId && courseData?._id) {
          await Promise.all([fetchGamification(courseData._id), fetchBadges(courseData._id)]);
        }

        // enrollment progress
        if (studentId && courseData?._id) {
          await refreshEnrollmentState(courseData._id);
        }

        // forum count
        try {
          const forumRes = await api.get(`/forum/course/${id}/count`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setDiscussionCount(forumRes.data.count || 0);
        } catch (e) {
          setDiscussionCount(0);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load course details.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, studentId]);

  useEffect(() => {
    // Safely extract category ID
    const categoryId = course?.category?._id || course?.category;
    if (!categoryId) return;

    const fetchRelatedCourses = async () => {
      try {
        setRelatedLoading(true);

        const res = await api.get(`/courses?category=${categoryId}&approved=true`);

        let coursesList = pickArray(res);

        let filteredCourses = coursesList.filter(c =>
          c._id !== id && c.status === "approved"
        );

        setRelatedCourses(filteredCourses.slice(0, 6));
      } catch (err) {
        console.error("Error fetching related courses", err);
      } finally {
        setRelatedLoading(false);
      }
    };

    fetchRelatedCourses();
  }, [course?.category, id]);

  // ---------- discussion ----------
  const handleDiscussionAccess = () => {
    track("discussion_open_attempt", { courseId: id, hasAccess });

    if (!hasAccess) {
      showAlert("Discussion forum is only available for enrolled or subscribed students.", "warning");
      setSelectedTab("lessons");
      return;
    }

    track("discussion_open", { courseId: id });
    navigate(`/course/${id}/discussion`);
  };

  // --- FIXED BEHAVIOR TRACKING FUNCTION ---
  const logBehavior = () => {
    if (!selectedLesson || !isEnrolled) return;

    const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Using the built-in track utility handles the analytics API call properly
    // without throwing 404s for undefined backend routes.
    track("lesson_behavior_log", {
      courseId: id,
      lessonId: selectedLesson._id,
      timeSpentSeconds: timeSpentSeconds,
      videoProgress: Math.round(videoProgress),
      rewindCount: rewindCountRef.current,
      contentType: selectedLesson.contentType
    });
  };

  // ---------- Razorpay loader ----------
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // ---------- enroll (free/paid) ----------
  const handleEnroll = async () => {
    if (!course) return;

    track("course_enroll_click", {
      courseId: id,
      price: Number(course.price || 0),
      isExpired,
      source: "course_detail",
    });

    if (course.status !== "approved") {
      showAlert("This course is currently under review.", "info");
      return;
    }

    // if user has subscription access but no enrollment record => ask to create it
    if (hasAccess && !isEnrolled && isPaidCourse) {
      // user can start learning via subscription; but allow individual purchase too
    }

    // FREE COURSE OR CORPORATE BYPASS
    if (!isPaidCourse || (isCorporateCourse && isCompanyEmployee)) {
      try {
        setEnrollLoading(true);

        const res = await api.post(
          "/enrollments",
          { courseId: id, studentId, amount: 0, source: "free" },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.success) {
          track("course_free_enroll_success", { courseId: id, price: 0 });
          showAlert("Successfully Enrolled!", "success");

          setHasAccess(true);
          setAccessReason("purchase");
          await refreshEnrollmentState(id);
        } else {
          showAlert(res.data.message || "Enrollment failed.", "danger");
        }
      } catch (err) {
        showAlert("Enrollment failed.", "danger");
      } finally {
        setEnrollLoading(false);
      }
      return;
    }

    // PAID COURSE (Razorpay)
    try {
      setEnrollLoading(true);

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        showAlert("Razorpay SDK failed to load. Please check your internet.", "danger");
        return;
      }

      const orderRes = await api.post(
        "/payment/create-order",
        { courseId: id, studentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!orderRes.data.success) {
        throw new Error(orderRes.data.message || "Failed to create order");
      }

      const { key, orderId, amount, currency } = orderRes.data;

      track("payment_order_created", { courseId: id, orderId, amount, currency, flow: "enroll" });

      const options = {
        key,
        amount: amount * 100,
        currency,
        name: "LearnX Platform",
        description: `Enrolling in ${course.title}`,
        image: safeUrl(course.thumbnail) || undefined,
        order_id: orderId,

        handler: async function (response) {
          try {
            const verifyRes = await api.post(
              "/payment/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: id,
                studentId,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (verifyRes.data.success) {
              track("payment_success", {
                courseId: id,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
              });

              showAlert("Payment Successful! Welcome to the course.", "success");

              // OPEN RECEIPT
              if (verifyRes.data.receiptUrl) {
                const base = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");
                window.open(`${base}${verifyRes.data.receiptUrl}`, "_blank");
              }

              // update UI states
              setHasAccess(true);
              setAccessReason("purchase");
              await refreshEnrollmentState(id);
            } else {
              track("payment_failed", {
                courseId: id,
                orderId: response.razorpay_order_id,
                reason: "verify_failed",
              });
              showAlert("Payment verification failed.", "danger");
            }
          } catch (err) {
            track("payment_failed", {
              courseId: id,
              orderId: response?.razorpay_order_id,
              reason: "verify_error",
            });
            showAlert("Payment verification failed.", "danger");
          }
        },

        prefill: { name: loggedInUser?.name, email: loggedInUser?.email },
        theme: { color: "#9f64f7" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        track("payment_failed", {
          courseId: id,
          orderId: resp?.error?.metadata?.order_id,
          paymentId: resp?.error?.metadata?.payment_id,
          reason: resp?.error?.reason || "payment_failed",
        });
        showAlert("Payment failed. Please try again.", "danger");
      });

      rzp.open();
    } catch (err) {
      console.error("Enrollment error:", err);
      showAlert(err.message || "Failed to initialize payment.", "danger");
    } finally {
      setEnrollLoading(false);
    }
  };

  // ---------- unenroll ----------
  const executeUnenroll = async () => {
    try {
      track("course_unenroll_click", { courseId: id });
      setEnrollLoading(true);

      const res = await api.put(
        `/enrollments/unenroll/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        track("course_unenroll_success", { courseId: id });
        showAlert("Unenrolled successfully. We hope to see you back soon!", "info");

        setIsEnrolled(false);
        setIsExpired(true);
        setProgress(0);
        setCompletedLessons([]);
        setCertificateUrl(null);

        setHasAccess(false);
        setAccessReason("cancelled");
      } else {
        showAlert(res.data.message || "Unenroll failed.", "danger");
      }
    } catch (err) {
      showAlert("An error occurred while unenrolling.", "danger");
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleUnenroll = () => {
    if (!isEnrolled) return;
    if (window.confirm("Unenroll from course? Your progress will be hidden and access revoked.")) {
      executeUnenroll();
    }
  };

  // ---------- renew ----------
  const handleReEnroll = async () => {
    if (!course) return;

    if (isPaidCourse) {
      return handleEnroll();
    }

    try {
      setEnrollLoading(true);

      const res = await api.post(
        "/enrollments",
        { courseId: id, studentId, amount: 0, source: "free" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showAlert("Re-enrolled successfully!", "success");

        setHasAccess(true);
        setAccessReason("purchase");
        await refreshEnrollmentState(id);
      } else {
        showAlert(res.data.message || "Re-enroll failed", "danger");
      }
    } catch (err) {
      showAlert("Failed to re-enroll.", "danger");
    } finally {
      setEnrollLoading(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;

      // REWIND DETECTION LOGIC
      if (video.currentTime < lastPositionRef.current - 2) {
        rewindCountRef.current += 1;
      }
      lastPositionRef.current = video.currentTime;

      const percent = (video.currentTime / video.duration) * 100;
      setVideoProgress(percent);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    // Cleanup: Jab lesson badle ya page chhodien, toh data save ho jaye
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      logBehavior(); // Save data to AI engine natively via track utility
      // Reset trackers for next lesson
      startTimeRef.current = Date.now();
      rewindCountRef.current = 0;
      lastPositionRef.current = 0;
    };
  }, [selectedLesson?._id]);

  // ---------- mark lesson complete ----------
  useEffect(() => {
    if (!selectedLesson || !studentId || !isEnrolled) return;

    const markCompleted = async () => {
      if (completedLessons.includes(selectedLesson._id)) return;

      try {
        await api.post(
          `/courses/${course?._id}/lessons/${selectedLesson._id}/markWatched`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        track("lesson_complete", {
          courseId: course?._id || id,
          lessonId: selectedLesson._id,
          contentType: selectedLesson.contentType,
          via: selectedLesson.contentType === "video" ? "video_90_percent" : "non_video",
        });

        setCompletedLessons((prev) => [...prev, selectedLesson._id]);

        await refreshEnrollmentState(course?._id);

        await Promise.all([fetchGamification(course?._id), fetchBadges(course?._id)]);
        showAlert(`+10 XP earned ✅ (${selectedLesson.title} completed!)`, "success");
      } catch (err) {
        console.error("Mark watched error:", err);
      }
    };

    if (selectedLesson.contentType === "video") {
      if (videoProgress >= 90) markCompleted();
    } else {
      markCompleted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson, videoProgress, completedLessons, studentId, isEnrolled]);

  const getLessonProgress = (lessonId) => {
    if (completedLessons.includes(lessonId)) return 100;
    if (selectedLesson?._id === lessonId && selectedLesson.contentType === "video") return videoProgress;
    return 0;
  };

  // ---------- certificate ----------
  const handleViewCertificate = () => {
    track("certificate_view_click", { courseId: id, unlocked: !!certificate });

    if (!certificate) return showAlert("Finish all lessons and exams to unlock your certificate!", "info");
    window.open(safeUrl(certificate), "_blank");
  };

  const handleDownloadCertificate = async () => {
    track("certificate_download_click", { courseId: id, unlocked: !!certificate });

    if (!certificate) return;

    try {
      showAlert("Preparing your certificate...", "info");

      const fileUrl = safeUrl(certificate);
      const response = await fetch(fileUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${course.title?.replace(/\s+/g, "_")}_Certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      showAlert("Download failed. Please try again later.", "danger");
    }
  };

  const getTextContent = (lesson) => {
    return (
      lesson?.text ||
      lesson?.content ||
      lesson?.body ||
      lesson?.html ||
      lesson?.description ||   // last fallback
      ""
    );
  };

  const isProbablyHtml = (str = "") =>
    /<\/?[a-z][\s\S]*>/i.test(str);

  useEffect(() => {
    // This fetches live classes only when user opens the Live tab
    const fetchLive = async () => {
      if (selectedTab !== "live") return;
      if (!id) return;

      try {
        setLiveError("");
        setLiveLoading(true);

        const res = await api.get(`/live-classes/course/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setLiveClasses(pickArray(res));
      } catch (e) {
        setLiveError(e?.response?.data?.message || "Failed to load live classes");
        setLiveClasses([]);
      } finally {
        setLiveLoading(false);
      }
    };

    fetchLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, id]);

  const handleJoinLive = async (lc) => {
    try {
      setLiveError("");

      if (!canAccessLiveClasses) {
        setLiveError("Enroll or subscribe to join live classes.");
        return;
      }

      if (!canJoinLiveClass(lc)) {
        setLiveError(getLiveJoinMessage(lc) || "You cannot join this class right now.");
        return;
      }

      setJoiningLiveId(String(lc._id));

      const res = await api.post(
        `/live-classes/${lc._id}/join`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const meetingLink = res?.data?.data?.meetingLink || res?.data?.meetingLink;

      if (!meetingLink) {
        setLiveError("Meeting link not found for this class.");
        return;
      }

      joinedLiveIdRef.current = String(lc._id);
      window.open(meetingLink, "_blank", "noopener,noreferrer");
    } catch (e) {
      setLiveError(e?.response?.data?.message || "Failed to join live class");
    } finally {
      setJoiningLiveId("");
    }
  };

  const handleLeaveLive = async () => {
    const liveClassId = joinedLiveIdRef.current;
    if (!liveClassId) return;

    try {
      await api.post(`/live-classes/${liveClassId}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    } finally {
      joinedLiveIdRef.current = null;
    }
  };

  useEffect(() => {
    const onBeforeUnload = () => {
      const liveClassId = joinedLiveIdRef.current;
      if (!liveClassId) return;

      api.post(`/live-classes/${liveClassId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
      joinedLiveIdRef.current = null;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- loading / error ----------
  if (loading) {
    return (
      <div className="bg-light min-vh-100 pb-5" style={{ fontFamily: "'Inter', sans-serif" }}>
        <style>{`
          .skeleton {
            background: #e2e5e7;
            background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
            background-size: 200px 100%;
            background-repeat: no-repeat;
            border-radius: 8px;
            display: inline-block;
            line-height: 1;
            width: 100%;
            animation: skeletonShimmer 1.5s infinite linear;
          }
          @keyframes skeletonShimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
        `}</style>
        
        {/* Skeleton Header */}
        <div className="py-5 mb-4 border-bottom" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)" }}>
          <div className="container">
            <div className="row align-items-center g-4">
              <div className="col-lg-8">
                <div className="skeleton mb-3" style={{ height: "24px", width: "15%" }}></div>
                <div className="skeleton mb-3" style={{ height: "48px", width: "70%" }}></div>
                <div className="skeleton mb-4" style={{ height: "16px", width: "40%" }}></div>
                <div className="skeleton mb-2" style={{ height: "16px", width: "80%" }}></div>
                <div className="skeleton mb-4" style={{ height: "16px", width: "60%" }}></div>
                
                <div className="d-flex gap-3">
                  <div className="skeleton rounded-pill" style={{ height: "40px", width: "180px" }}></div>
                  <div className="skeleton rounded-pill" style={{ height: "40px", width: "120px" }}></div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="skeleton rounded-4 shadow-sm" style={{ height: "200px", width: "100%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton Body */}
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="skeleton rounded-4 shadow-sm mb-4" style={{ height: "450px", width: "100%" }}></div>
              <div className="skeleton rounded-4 shadow-sm" style={{ height: "150px", width: "100%" }}></div>
            </div>
            <div className="col-lg-4">
              <div className="skeleton rounded-4 shadow-sm mb-4" style={{ height: "250px", width: "100%" }}></div>
              <div className="skeleton rounded-4 shadow-sm" style={{ height: "500px", width: "100%" }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error)
    return (
      <div className="container mt-5">
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="card-body text-center py-5">
            <div className="bg-danger bg-opacity-10 d-inline-block p-4 rounded-circle mb-4">
              <AlertTriangle size={64} className="text-danger" />
            </div>
            <h2 className="fw-bold mb-3">Oops!</h2>
            <p className="text-muted mb-4 fs-5">{error}</p>
            <button className="btn btn-dark px-5 py-2 rounded-pill shadow-sm" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );

  const setTab = (tab) => {
    track("tab_change", { courseId: id, tab });
    setSelectedTab(tab);
  };

  const selectLesson = (lesson, idx) => {
    const allowed = hasAccess || lesson?.isPreviewFree;

    track("lesson_select", {
      courseId: course?._id || id,
      lessonId: lesson?._id,
      index: idx,
      contentType: lesson?.contentType,
      preview: !!lesson?.isPreviewFree,
      allowed,
    });

    if (!allowed) {
      showAlert("Please enroll or subscribe to access this lesson.", "warning");
      return;
    }

    setSelectedLesson(lesson);
  };

  const openExam = (examId) => {
    track("exam_open", { courseId: course?._id || id, examId, allowed: hasAccess });

    if (hasAccess) {
      navigate(`/course/${id}/exam/${examId}`);
      return;
    }

    showAlert("Please enroll or subscribe to attempt exams.", "warning");
    navigate(PLANS_ROUTE);
  };

  const safeThumb = safeUrl(course?.thumbnail);

  return (
    <div className="bg-light min-vh-100 pb-5">
      {notification.show && (
        <div
          className={`alert alert-${notification.type} border-0 alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg`}
          role="alert"
          style={{ zIndex: 10000, minWidth: "320px", borderRadius: "12px" }}
        >
          <div className="d-flex align-items-center gap-3">
            {notification.type === "success" ? (
              <CheckCircle size={22} className="text-success" />
            ) : (
              <Info size={22} className="text-info" />
            )}
            <span className="fw-medium">{notification.message}</span>
          </div>
          <button type="button" className="btn-close" onClick={() => setNotification({ ...notification, show: false })}></button>
        </div>
      )}

      <div className="header-gradient py-5 mb-4 border-bottom">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-3">
                  <li className="breadcrumb-item">
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning px-3 py-2 rounded-pill">
                      {course?.category?.name ?? "Course"}
                    </span>
                  </li>
                  <li className="breadcrumb-item text-muted align-self-center small ps-2">
                    {course?.level ?? "Intermediate"}
                  </li>
                </ol>
              </nav>

              <h1 className="fw-bolder display-5 mb-3 text-dark tracking-tight">{course?.title}</h1>

              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-bold text-dark">⭐ {Number(course?.averageRating || 0).toFixed(1)}</span>
                <span className="text-muted small">({course?.totalRatings || 0} ratings)</span>
              </div>
              <p className="lead text-secondary mb-4 opacity-75" style={{ maxWidth: "750px" }}>
                {course?.description}
              </p>

              <div className="d-flex flex-wrap gap-4 align-items-center">
                <div className="instructor-card d-flex align-items-center gap-3 bg-white p-2 pe-4 rounded-pill shadow-sm">
                  <div className="bg-warning bg-opacity-10 p-2 rounded-circle">
                    <User size={20} className="text-warning" />
                  </div>
                  <div>
                    <div
                      className="small text-muted"
                      style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px" }}
                    >
                      Lead Instructor
                    </div>
                    <div className="fw-bold text-dark">{course?.instructor?.name ?? "Expert Mentor"}</div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <Clock size={18} className="text-muted" />
                  <span className="fw-semibold text-muted">{lessons.length} Lessons</span>&nbsp;&nbsp;
                  <span className="fw-semibold text-muted">{exams.length} Exams</span>
                  <span className="mx-2 text-muted opacity-25">|</span>
                  <Award size={18} className="text-muted" />
                  <span className="fw-semibold text-muted">Certification Included</span>
                </div>
              </div>

              {!hasAccess && accessReason && (
                <div className="mt-3 small text-muted">
                  Access status: <b className="text-dark">{accessReason}</b>
                </div>
              )}
            </div>

            <div className="col-lg-4">
              {isEnrolled && (
                <div className="progress-card bg-white p-4 rounded-4 shadow-sm border">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="fw-bold text-dark">Course Mastery</span>
                    <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3">
                      {progress}% Complete
                    </span>
                  </div>

                  <div className="progress bg-light" style={{ height: "12px", borderRadius: "10px" }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated bg-success shadow-sm"
                      role="progressbar"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="mt-3 pt-3 border-top">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-semibold text-dark">XP (This course)</span>
                      <span className="badge bg-dark bg-opacity-10 text-dark rounded-pill px-3">
                        {gamiLoading ? "..." : gami.xpInCourse}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="text-muted small">Total XP</span>
                      <span className="text-muted small">{gamiLoading ? "..." : gami.xpTotal}</span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-1">
                      <span className="text-muted small">🔥 Streak</span>
                      <span className="text-muted small">{gamiLoading ? "..." : `${gami.streakCount} days`}</span>
                    </div>

                    <div className="mt-2 small text-secondary">
                      Next reward: complete 1 lesson to earn <b>+10 XP</b>
                    </div>

                    <div className="mt-3 pt-3 border-top">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="fw-bold small text-dark d-flex align-items-center gap-2">
                          <Trophy size={16} className="text-warning" />
                          Badges (This course)
                        </div>
                        <span className="small text-muted">{badgeLoading ? "..." : badges.length}</span>
                      </div>

                      {badgeLoading ? (
                        <div className="text-muted small">Loading badges...</div>
                      ) : badges.length === 0 ? (
                        <div className="text-muted small">No badges yet. Complete lessons/exams to unlock!</div>
                      ) : (
                        <div className="d-flex flex-wrap gap-2">
                          {badges.slice(0, 8).map((b, idx) => (
                            <span
                              key={`${b.key}-${idx}`}
                              className="badge bg-warning bg-opacity-10 text-dark border border-warning rounded-pill px-3 py-2"
                              title={b.description || b.title}
                              style={{ fontSize: "11px" }}
                            >
                              {b.icon || "🏅"} {b.title || b.key}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {progress === 100 && (
                    <div className="mt-3 text-center animate-bounce py-2 bg-warning bg-opacity-10 rounded-3">
                      <Award size={18} className="text-warning me-2" />
                      <span className="small fw-bold text-dark">Full Completion Reached!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="row g-4">
          {/* LEFT */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white mb-4">
              <div className="card-body p-0">
                {selectedTab === "lessons" && selectedLesson ? (
                  <div className="lesson-viewer">
                    <div className="bg-white p-3 d-flex justify-content-between align-items-center border-bottom">
                      <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                        <PlayCircle size={20} className="text-info" />
                        {selectedLesson.title}
                      </h5>

                      {selectedLesson.isPreviewFree && !hasAccess && (
                        <span className="badge bg-success-subtle text-success border border-success px-3 rounded-pill">
                          FREE PREVIEW
                        </span>
                      )}
                    </div>

                    <div className="ratio ratio-16x9 bg-dark shadow-inner">
                      {selectedLesson.contentType === "video" ? (
                        <video
                          ref={videoRef}
                          controls
                          key={selectedLesson._id}
                          className="w-100 h-100 video-player"
                          poster={safeThumb}
                        >
                          <source src={safeUrl(selectedLesson.fileUrl)} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : selectedLesson.contentType === "pdf" ? (
                        <iframe
                          src={safeUrl(selectedLesson.fileUrl)}
                          title={selectedLesson.title}
                          className="w-100 h-100"
                        />
                      ) : selectedLesson.contentType === "text" ? (
                        <div className="text-lesson p-4">
                          {(() => {
                            const content = getTextContent(selectedLesson);

                            if (!content) {
                              return (
                                <div className="text-muted">
                                  No text content available for this lesson.
                                </div>
                              );
                            }

                            // If stored as HTML
                            if (isProbablyHtml(content)) {
                              return (
                                <div
                                  className="text-lesson-content"
                                  dangerouslySetInnerHTML={{ __html: content }}
                                />
                              );
                            }

                            // Plain text -> preserve line breaks
                            return <pre className="text-lesson-pre">{content}</pre>;
                          })()}
                        </div>
                      ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-5 bg-light">
                          <BookOpen size={48} className="mb-3 opacity-25" />
                          <p className="lead text-center fw-medium px-4">
                            {selectedLesson.description || "Refer to the module resources for this lesson."}
                          </p>
                        </div>
                      )
                      }
                    </div>
                  </div>
                ) : selectedTab === "exams" ? (
                  <div className="p-5 text-center py-5">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-4 mb-4 shadow-sm border border-white">
                      <Award size={64} className="text-primary" />
                    </div>
                    <h3 className="fw-bold text-dark">Knowledge Assessment</h3>
                    <p className="text-muted mx-auto mb-4" style={{ maxWidth: "500px" }}>
                      Complete your final assessments to validate your expertise.
                    </p>
                    <div className="alert alert-info border-0 rounded-4 px-4 d-inline-block shadow-sm">
                      <Info size={18} className="me-2" /> <strong>Get Ready:</strong> Select a module exam from the list on the right.
                    </div>
                  </div>
                ) : selectedTab === "discussion" ? (
                  <div className="p-5 text-center">
                    <div
                      className={`bg-info bg-opacity-10 rounded-circle d-inline-flex p-4 mb-4 ${!hasAccess ? "grayscale shadow-sm" : "shadow-sm"
                        }`}
                    >
                      {hasAccess ? <MessageCircle size={64} className="text-info" /> : <ShieldAlert size={64} className="text-muted" />}
                    </div>

                    <h3 className="fw-bold">{hasAccess ? "Student Discussion Forum" : "Access Restricted"}</h3>
                    <p className="text-muted mx-auto mb-4" style={{ maxWidth: "500px" }}>
                      {hasAccess
                        ? "Connect with fellow students, ask technical questions, and share insights about this course."
                        : "Join the community of learners! You need to be enrolled or subscribed to access the private discussion forum."}
                    </p>

                    {hasAccess ? (
                      <button
                        className="btn btn-info px-5 py-2 fw-bold rounded-pill text-white shadow-sm transition-all"
                        onClick={handleDiscussionAccess}
                      >
                        Enter Community Forum
                      </button>
                    ) : (
                      <div className="d-grid gap-2 col-md-6 mx-auto">
                        <button className="btn btn-warning px-4 py-2 fw-bold rounded-pill shadow-sm" onClick={isExpired ? handleReEnroll : handleEnroll}>
                          {isExpired ? "Renew Access" : "Enroll Now"}
                        </button>
                        <button className="btn btn-outline-info px-4 py-2 fw-bold rounded-pill shadow-sm" onClick={() => navigate(PLANS_ROUTE)}>
                          Subscribe to Access
                        </button>
                      </div>
                    )}

                    {showStartViaSubscription && (
                      <div className="d-grid gap-2 col-md-6 mx-auto mt-3">
                        <button
                          className="btn btn-success px-4 py-2 fw-bold rounded-pill shadow-sm"
                          onClick={autoEnrollViaSubscription}
                          disabled={enrollLoading}
                        >
                          {enrollLoading ? <span className="spinner-border spinner-border-sm"></span> : "Start Learning (via Subscription)"}
                        </button>
                        <div className="small text-muted">(Needed to enable progress tracking on your account.)</div>
                      </div>
                    )}
                  </div>
                ) : selectedTab === "live" ? (
                  <div className="p-4">
                    {liveError && (
                      <div className="alert alert-danger">{liveError}</div>
                    )}

                    {!canAccessLiveClasses && (
                      <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                          Live classes are available only for enrolled or subscribed students.
                        </div>
                        <button
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => navigate(PLANS_ROUTE)}
                        >
                          View Plans
                        </button>
                      </div>
                    )}

                    {liveLoading ? (
                      <div className="d-flex align-items-center gap-2">
                        <div className="spinner-border spinner-border-sm"></div>
                        <span className="text-muted">Loading live classes...</span>
                      </div>
                    ) : liveClasses.length === 0 ? (
                      <div className="text-muted text-center py-5">
                        No live classes scheduled for this course.
                      </div>
                    ) : (
                      <div className="list-group">
                        {liveClasses.map((lc) => {
                          const canJoin = canJoinLiveClass(lc);
                          const isJoined = joinedLiveIdRef.current === String(lc._id);
                          const joinMessage = getLiveJoinMessage(lc);

                          return (
                            <div key={lc._id} className="list-group-item">
                              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                                <div>
                                  <div className="fw-bold">{lc.title}</div>

                                  <div className="small text-muted">
                                    Start: {lc.startAt ? new Date(lc.startAt).toLocaleString() : "-"}
                                  </div>

                                  <div className="small text-muted">
                                    Duration: {lc.durationMin ? `${lc.durationMin} minutes` : "-"}
                                  </div>

                                  {!!joinMessage && (
                                    <div className="small text-muted mt-1">
                                      {joinMessage}
                                    </div>
                                  )}

                                  {lc.recordingLink && lc.status === "ended" && (
                                    <a
                                      href={lc.recordingLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-sm btn-outline-secondary mt-2"
                                    >
                                      Watch Recording
                                    </a>
                                  )}
                                </div>

                                <div className="text-end">
                                  <span
                                    className={
                                      "badge mb-2 " +
                                      (lc.status === "scheduled"
                                        ? "bg-primary"
                                        : lc.status === "live"
                                          ? "bg-success"
                                          : lc.status === "ended"
                                            ? "bg-secondary"
                                            : "bg-danger")
                                    }
                                  >
                                    {lc.status}
                                  </span>

                                  <div className="d-flex gap-2 justify-content-end">
                                    <button
                                      className="btn btn-sm btn-success"
                                      disabled={!canJoin || joiningLiveId === String(lc._id)}
                                      onClick={() => handleJoinLive(lc)}
                                      title={!canJoin ? joinMessage : "Join live class"}
                                    >
                                      {joiningLiveId === String(lc._id) ? "Joining..." : "Join"}
                                    </button>

                                    {isJoined && (
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={handleLeaveLive}
                                      >
                                        Leave
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>) : (
                  <div className="p-5 text-center text-muted">Select an item to view content.</div>
                )}
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4 p-4 d-none d-lg-block bg-white">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
                <BarChart size={20} className="text-info" />
                Course Curriculum Overview
              </h5>
              <p className="text-secondary mb-4 lh-lg">{course?.description}</p>
              <div className="row text-center g-3">
                <div className="col-4 border-end border-light">
                  <div className="h3 fw-bolder mb-0 text-dark">{lessons.length}</div>
                  <div className="small text-muted text-uppercase fw-bold ls-1">Lessons</div>
                </div>
                <div className="col-4 border-end border-light">
                  <div className="h3 fw-bolder mb-0 text-dark">{exams.length}</div>
                  <div className="small text-muted text-uppercase fw-bold ls-1">Assessments</div>
                </div>
                <div className="col-4">
                  <div className="h3 fw-bolder mb-0 text-warning">{!isPaidCourse ? "Free" : `₹${course?.price}`}</div>
                  <div className="small text-muted text-uppercase fw-bold ls-1">Total Value</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4 bg-white">
              <div className="position-relative">
                <img
                  src={safeThumb}
                  alt={course?.title}
                  className="card-img-top d-none d-lg-block"
                  style={{ height: "200px", objectFit: "cover" }}
                />
                {!hasAccess && <div className="img-overlay"></div>}
              </div>

              <div className="card-body p-4">
                {/* Priority: If expired => show Renew (and for paid it will open Razorpay) */}
                {isExpired ? (
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-warning btn-lg w-100 fw-bold rounded-pill py-2 shadow-lg hover-scale d-flex align-items-center justify-content-center gap-2"
                      onClick={handleReEnroll}
                      disabled={enrollLoading}
                    >
                      {enrollLoading ? <span className="spinner-border spinner-border-sm"></span> : "Renew Access"}
                    </button>

                    {/* show subscribe too (optional) */}
                    {showSubscribeCTA && (
                      <button className="btn btn-outline-info w-100 fw-bold rounded-pill" onClick={() => navigate(PLANS_ROUTE)}>
                        Subscribe to Access
                      </button>
                    )}
                  </div>
                ) : showStartViaSubscription ? (
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-success btn-lg w-100 fw-bold rounded-pill py-2 shadow-lg hover-scale"
                      onClick={autoEnrollViaSubscription}
                      disabled={enrollLoading}
                    >
                      {enrollLoading ? <span className="spinner-border spinner-border-sm"></span> : "Start Learning (via Subscription)"}
                    </button>
                    <button className="btn btn-outline-info w-100 fw-bold rounded-pill" onClick={() => navigate("/me/subscription")}>
                      View My Subscription
                    </button>
                    <div className="small text-muted text-center">This will create your enrollment record to track progress.</div>
                  </div>
                ) : !hasAccess ? (
                  <div className="text-center">
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                      {isCorporateCourse && isCompanyEmployee ? (
                        <div className="d-flex flex-column align-items-center">
                          <span className="badge bg-warning bg-opacity-10 text-dark border border-warning px-3 py-2 mb-2 fs-6 rounded-pill">
                            Corporate Sponsored
                          </span>
                          <span className="h1 fw-bolder mb-0 text-success">Free Access</span>
                        </div>
                      ) : (
                        <>
                          <span className="h1 fw-bolder mb-0">{isPaidCourse ? `₹${course?.price}` : "Free"}</span>
                          {isPaidCourse && (
                            <span className="text-muted text-decoration-line-through">₹{Math.round(Number(course?.price || 0) * 1.5)}</span>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      className={`btn ${isCorporateCourse ? "btn-dark" : "btn-warning"} btn-lg w-100 fw-bold rounded-pill mb-3 py-2 shadow-lg hover-scale d-flex align-items-center justify-content-center gap-2`}
                      onClick={handleEnroll}
                      disabled={enrollLoading}
                    >
                      {enrollLoading ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        <>
                          {isCorporateCourse && isCompanyEmployee ? (
                            <>
                              <Award size={18} />
                              Start Corporate Training
                            </>
                          ) : (
                            <>
                              {isPaidCourse && <ShieldAlert size={18} />}
                              Enroll Now
                            </>
                          )}
                        </>
                      )}
                    </button>

                    {showSubscribeCTA && (
                      <button className="btn btn-outline-info w-100 fw-bold rounded-pill" onClick={() => navigate(PLANS_ROUTE)}>
                        Subscribe to Access
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="d-grid gap-3">
                    <button
                      className="btn btn-orange bg-warning text-black w-100 fw-bold rounded-pill py-2 shadow-lg hover-scale"
                      onClick={() => {
                        const firstIncomplete = lessons.find((l) => !completedLessons.includes(l._id)) || lessons[0];
                        if (firstIncomplete) {
                          navigate(`/course/${id}/lessons/${firstIncomplete._id}`);
                        } else {
                          showAlert("All lessons completed!", "success");
                        }
                      }}
                    >
                      Continue Learning <ChevronRight size={18} className="ms-1 text-black" />
                    </button>

                    {progress === 100 && enrollmentId && (
                      <button
                        className="btn btn-dark w-100 fw-bold rounded-pill py-2 shadow-sm d-flex align-items-center justify-content-center gap-2 mt-3 hover-scale"
                        onClick={() => navigate(`/certificate/${enrollmentId}`)}
                        style={{ background: 'var(--primary-color, #6f42c1)', color: 'white', border: 'none' }}
                      >
                        <Award size={18} /> View & Download Certificate
                      </button>
                    )}

                    {isEnrolled && (
                      <button className="btn btn-link btn-sm text-danger text-decoration-none mt-2 opacity-50 hover-opacity-100" onClick={handleUnenroll}>
                        Cancel Enrollment
                      </button>
                    )}

                    {hasAccess && isEnrolled && (
                      <RatingBox
                        courseId={id}
                        token={token}
                        onSuccess={async () => {
                          const { data } = await api.get(`/courses/${id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const courseData = data?.course || data || {};
                          setCourse(courseData);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white sticky-lg-top" style={{ top: "20px" }}>
              <div className="nav nav-pills nav-fill p-2 bg-light m-2 rounded-3 gap-1">
                <button
                  className={`nav-link border-0 fw-bold transition-all ${selectedTab === "lessons" ? "active bg-info shadow-sm" : "text-muted"
                    }`}
                  onClick={() => setTab("lessons")}
                >
                  <BookOpen size={16} className="me-1" /> <span className="small">Lessons</span>
                </button>

                <button
                  className={`nav-link border-0 fw-bold transition-all ${selectedTab === "exams" ? "active bg-info shadow-sm" : "text-muted"
                    }`}
                  onClick={() => setTab("exams")}
                >
                  <FileText size={16} className="me-1" /> <span className="small">Exams</span>
                </button>

                <button
                  className={`nav-link border-0 fw-bold transition-all position-relative ${selectedTab === "discussion" ? "active bg-info shadow-sm" : "text-muted"
                    }`}
                  onClick={() => setTab("discussion")}
                >
                  {hasAccess ? <MessageCircle size={16} className="me-1" /> : <Lock size={16} className="me-1 opacity-50" />}
                  <span className="small">Discuss</span>
                  {hasAccess && discussionCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow-sm border border-white" style={{ fontSize: "10px" }}>
                      {discussionCount}
                    </span>
                  )}
                </button>
                <button
                  className={`nav-link border-0 fw-bold transition-all ${selectedTab === "live" ? "active bg-info shadow-sm" : "text-muted"}`}
                  onClick={() => setTab("live")}
                >
                  <PlayCircle size={16} className="me-1" /> <span className="small">Live</span>
                </button>
              </div>

              <div className="overflow-auto custom-scrollbar" style={{ maxHeight: "55vh" }}>
                {selectedTab === "lessons" && (
                  <div className="list-group list-group-flush p-3 pt-0">
                    {lessons.map((lesson, idx) => {
                      const canAccess = hasAccess || lesson.isPreviewFree;
                      const isActive = selectedLesson?._id === lesson._id;
                      const lessonProg = getLessonProgress(lesson._id);
                      const isCompleted = completedLessons.includes(lesson._id);

                      return (
                        <button
                          key={lesson._id || idx}
                          onClick={() => canAccess && selectLesson(lesson, idx)}
                          disabled={!canAccess}
                          className={`list-group-item list-group-item-action border-0 mb-3 rounded-3 transition-all ${isActive ? "bg-info bg-opacity-10 border-start border-info border-4 active-item" : ""
                            } ${!canAccess ? "bg-light opacity-75" : ""}`}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <div className="flex-shrink-0">
                              {isCompleted ? (
                                <CheckCircle size={18} className="text-success" />
                              ) : canAccess ? (
                                <PlayCircle size={18} className={isActive ? "text-info" : "text-muted"} />
                              ) : (
                                <Lock size={16} className="text-muted opacity-50" />
                              )}
                            </div>
                            <div className="flex-grow-1 overflow-hidden">
                              <div className={`small fw-bold text-truncate ${isActive ? "text-info" : "text-dark"}`}>
                                {idx + 1}. {lesson.title}
                              </div>
                              <div className="d-flex align-items-center gap-2 mt-1">
                                {lesson.isPreviewFree && !hasAccess && (
                                  <span className="badge bg-success" style={{ fontSize: "9px" }}>
                                    FREE
                                  </span>
                                )}
                                {canAccess && (
                                  <div className="progress flex-grow-1" style={{ height: "4px" }}>
                                    <div className="progress-bar bg-info" style={{ width: `${lessonProg}%` }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedTab === "exams" && (
                  <div className="p-3">
                    {exams.map((exam, idx) => {
                      const prog = examProgress.find((p) => p.examId === exam._id);
                      const isCompleted = prog?.isCompleted;
                      const bestScore = prog?.bestScore ?? null;
                      const maxAttempts = exam?.settings?.maxAttempts ?? 3;
                      const attemptsUsed = prog?.attempts ?? 0;
                      const remainingAttempts = Math.max(0, maxAttempts - attemptsUsed);

                      return (
                        <div
                          key={exam._id || idx}
                          onClick={() => openExam(exam._id)}
                          className={`card mb-3 border-0 shadow-sm p-3 exam-card transition-all ${hasAccess ? "cursor-pointer" : "locked-card"
                            }`}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="m-0 fw-bold text-dark pe-3 lh-sm">{exam.title || `Module ${idx + 1} Assessment`}</h6>
                            {isCompleted && <CheckCircle size={16} className="text-success flex-shrink-0" />}
                            {!hasAccess && <Lock size={14} className="text-muted" />}
                          </div>

                          <div className="d-flex gap-3 small text-muted mb-2">
                            <span className="d-flex align-items-center gap-1">
                              <Clock size={12} /> {exam.duration ?? 0}m
                            </span>
                            <span className="d-flex align-items-center gap-1">
                              <FileText size={12} /> {exam.questions?.length ?? 0} Qs
                            </span>
                          </div>

                          {/* 👇 NAYA: Enhanced Progress Display */}
                          {isEnrolled && (
                            <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                              {bestScore !== null ? (
                                <>
                                  <div className="d-flex flex-column">
                                    <span className="small text-muted" style={{ fontSize: "10px" }}>Best Score</span>
                                    <span className={`badge ${isCompleted ? "bg-success" : "bg-warning text-dark"} rounded-pill`} style={{ width: "fit-content" }}>
                                      {bestScore}%
                                    </span>
                                  </div>
                                  <div className="text-end">
                                    <span className="small text-muted d-block" style={{ fontSize: "10px" }}>Attempts</span>
                                    <span className="small fw-bold">{attemptsUsed}/{maxAttempts}</span>
                                  </div>
                                </>
                              ) : (
                                <span className="small text-info fw-bold">Not attempted yet</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedTab === "discussion" && (
                  <div className="p-4 text-center">
                    <MessageCircle size={32} className={`mb-3 ${hasAccess ? "text-info" : "text-muted opacity-25"}`} />
                    <p className="small text-dark fw-bold mb-2">Community Insights</p>
                    <p className="text-muted mb-4" style={{ fontSize: "12px" }}>
                      Join the conversation with {discussionCount || "0"} active posts from other learners.
                    </p>
                    <button
                      className={`btn ${hasAccess ? "btn-outline-info" : "btn-light disabled"} btn-sm w-100 rounded-pill`}
                      onClick={handleDiscussionAccess}
                    >
                      {hasAccess ? "Visit Discussion Forum" : "Enroll/Subscribe to Unlock"}
                    </button>

                    {!hasAccess && (
                      <button className="btn btn-outline-info btn-sm w-100 rounded-pill mt-2" onClick={() => navigate(PLANS_ROUTE)}>
                        View Plans
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!relatedLoading && relatedCourses.length > 0 && (
        <div className="container mt-5 pt-4 border-top">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bolder text-dark m-0">More Courses You Might Like</h4>
          </div>

          <div className="d-flex justify-content-start overflow-auto pb-4 custom-horizontal-scrollbar gap-4 px-2">
            {relatedCourses.map(c => (
              <div
                key={c._id}
                className="card border-0 shadow-sm rounded-4 flex-shrink-0 cursor-pointer hover-scale overflow-hidden bg-white"
                style={{ width: "280px", minWidth: "280px", maxWidth: "280px" }}
                onClick={() => {
                  navigate(`/courses/${c._id}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="position-relative">
                  <img
                    src={safeUrl(c.thumbnail)}
                    className="card-img-top object-fit-cover"
                    style={{ height: "160px" }}
                    alt={c.title}
                  />
                  <span className="position-absolute top-0 end-0 badge bg-dark bg-opacity-75 m-2 backdrop-blur">
                    {c.level || "Beginner"}
                  </span>
                </div>
                <div className="card-body p-3">
                  <h6 className="fw-bold text-dark text-truncate mb-1" title={c.title}>{c.title}</h6>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="fw-bold text-dark small">⭐ {Number(c.averageRating || 0).toFixed(1)}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                    <span className="fw-bolder text-warning">
                      {Number(c.price) > 0 ? `₹${c.price}` : "Free"}
                    </span>
                    <button className="btn btn-sm btn-light rounded-pill text-primary fw-bold" style={{ fontSize: "12px" }}>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .header-gradient { background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); }
        .cursor-pointer { cursor: pointer; }
        .hover-scale { transition: transform 0.2s; }
        .hover-scale:hover { transform: scale(1.02); }
        .active-item { box-shadow: 0 4px 12px rgba(13, 202, 240, 0.1); }
        .exam-card:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.05) !important; }
        .locked-card { opacity: 0.6; cursor: not-allowed; }
        .grayscale { filter: grayscale(1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .video-player { border-radius: 0 0 16px 16px; }
        .img-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%); }
        .ls-1 { letter-spacing: 1px; }
        .text-lesson { height: 100%; max-height: 70vh; overflow: auto; background: #fff;}
        .text-lesson-pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 15px; line-height: 1.7; color: #111827; font-family: inherit;}
        .text-lesson-content { font-size: 15px; line-height: 1.75; color: #111827;}
        .text-lesson-content img { max-width: 100%; height: auto; }
        .text-lesson-content pre { white-space: pre-wrap; }
        .custom-horizontal-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-horizontal-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-horizontal-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-horizontal-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .backdrop-blur { backdrop-filter: blur(4px); }
      `}</style>
    </div>
  );
}

export default CourseDetail;