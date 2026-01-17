import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import {
  Eye, Download, PlayCircle, BookOpen, FileText,
  CheckCircle, Lock, Award, Info, AlertTriangle,
  ChevronRight, Clock, User, BarChart, X,
  MessageCircle, ShieldAlert
} from "lucide-react";

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State Management
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
  const [examProgress, setExamProgress] = useState([]);
  const [progress, setProgress] = useState(0);
  const [certificate, setCertificateUrl] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [discussionCount, setDiscussionCount] = useState(0);

  // Notification State
  const [notification, setNotification] = useState({ show: false, message: "", type: "info" });

  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;
  const videoRef = useRef(null);
  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  // Helper to trigger alerts
  const showAlert = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "info" }), 5000);
  };

  // Auth Check
  useEffect(() => {
    if (!loggedInUser) {
      navigate("/login", { replace: true });
    }
  }, [loggedInUser, navigate]);

  // Data Fetching
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/courses/${id}`);
        const courseData = res.data || {};
        setCourse(courseData);

        const courseLessons = Array.isArray(courseData.lessons) ? courseData.lessons : [];
        setLessons(courseLessons);
        setExams(Array.isArray(courseData.exams) ? courseData.exams : []);

        if (studentId && courseData?._id) {
          try {
            const enrollRes = await api.get(`/enrollments/student/${studentId}/course/${courseData._id}`);
            const enrollData = enrollRes.data;

            if (enrollData) {
              setIsEnrolled(enrollData.status === "active" || enrollData.status === "completed");
              setProgress(enrollData.progress || 0);
              setCompletedLessons(enrollData.completedLessons || []);
              setExamProgress(enrollData.examProgress || []);
              setCertificateUrl(enrollData.certificate || null);

              if (enrollData.status === "cancelled" || (enrollData.expiryDate && new Date() > new Date(enrollData.expiryDate))) {
                setIsExpired(true);
                setIsEnrolled(false);
              }
            }
          } catch (err) {
            console.error("Enrollment fetch error:", err);
          }
        }

        const firstPreview = courseLessons.find((l) => l.isPreviewFree) || courseLessons[0];
        setSelectedLesson(firstPreview || null);

        const forumRes = await api.get(`/forum/course/${id}/count`);
        setDiscussionCount(forumRes.data.count || 0);

      } catch (err) {
        setError("Failed to load course details.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id, studentId]);

  // Discussion Guard
  const handleDiscussionAccess = () => {
    if (!isEnrolled) {
      showAlert("Discussion forum is only available for enrolled students.", "warning");
      setSelectedTab("lessons"); // Redirect tab view
      return;
    }
    navigate(`/course/${id}/discussion`);
  };

  const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

  // Handlers
  const handleEnroll = async () => {
  if (!course) return;
  if (course.status !== "approved") {
    showAlert("This course is currently under review.", "info");
    return;
  }

  const token = localStorage.getItem("token");

  // --- CASE 1: FREE COURSE ---
  if (Number(course.price) === 0) {
    try {
      setEnrollLoading(true);
      const res = await api.post("/enrollments", 
        { courseId: id, studentId, amount: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        showAlert("Successfully Enrolled!", "success");
        setIsEnrolled(true);
        window.location.reload(); 
      }
    } catch (err) {
      showAlert("Enrollment failed.", "danger");
    } finally {
      setEnrollLoading(false);
    }
    return;
  }

  // --- CASE 2: PAID COURSE (RAZORPAY) ---
  try {
    setEnrollLoading(true);

    // FIX 1: LOAD THE SCRIPT FIRST
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      showAlert("Razorpay SDK failed to load. Please check your internet.", "danger");
      return;
    }

    // Step 1: Create Order on Backend 
    const orderRes = await api.post(
      "/payment/create-order",
      { courseId: id, studentId: studentId }, // Ensure studentId is defined
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!orderRes.data.success) {
      throw new Error(orderRes.data.message || "Failed to create order");
    }

    // FIX 2: Check your backend response keys. 
    // Your controller sends: { key, orderId, amount, currency }
    const { key, orderId, amount, currency } = orderRes.data;

    // Step 2: Open Razorpay Checkout
    const options = {
      key: key, 
      amount: amount * 100, // Razorpay expects paise
      currency: currency,
      name: "LearnX Platform",
      description: `Enrolling in ${course.title}`,
      image: course.thumbnail?.startsWith("http") ? course.thumbnail : `${BASE_URL}${course.thumbnail}`,
      order_id: orderId, 
      handler: async function (response) {
        // Step 3: Verify Payment
        try {
          const verifyRes = await api.post(
            "/payment/verify-payment",
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: id,
              studentId: studentId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (verifyRes.data.success) {
            showAlert("Payment Successful! Welcome to the course.", "success");
            setIsEnrolled(true);
            window.location.reload();
          }
        } catch (err) {
          showAlert("Payment verification failed.", "danger");
        }
      },
      prefill: {
        name: loggedInUser?.name,
        email: loggedInUser?.email,
      },
      theme: { color: "#9f64f7" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error("Enrollment error:", err);
    showAlert(err.message || "Failed to initialize payment.", "danger");
  } finally {
    setEnrollLoading(false);
  }
};

  const executeUnenroll = async () => {
    try {
      setEnrollLoading(true);
      const res = await api.put(`/enrollments/unenroll/${id}`, { studentId });
      if (res.data.success) {
        showAlert("Unenrolled successfully. We hope to see you back soon!", "info");
        setIsEnrolled(false);
        setIsExpired(true);
        setProgress(0);
        setCompletedLessons([]);
        setCertificateUrl(null);
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

  const handleReEnroll = async () => {
    try {
      setEnrollLoading(true);
      const res = await api.post("/enrollments", {
        courseId: id,
        studentId,
        amount: course.price || 0,
      });
      if (res.data.success) {
        showAlert("Welcome back! Course access restored.", "success");
        setIsEnrolled(true);
        setIsExpired(false);
        if (lessons.length > 0) {
          navigate(`/course/${id}/lessons/${lessons[0]?._id}`);
        }
      }
    } catch (err) {
      showAlert("Failed to re-enroll.", "danger");
    } finally {
      setEnrollLoading(false);
    }
  };

  // Video and Completion Logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      const percent = (video.currentTime / video.duration) * 100;
      setVideoProgress(percent);
    };
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [selectedLesson]);

  useEffect(() => {
    if (!selectedLesson || !studentId || !isEnrolled) return;

    const markCompleted = async () => {
      if (completedLessons.includes(selectedLesson._id)) return;
      try {
        await api.post(`/lessons/${selectedLesson._id}/markWatched`, {
          studentId,
          courseId: course?._id,
        });
        setCompletedLessons((prev) => [...prev, selectedLesson._id]);
        const updatedEnroll = await api.get(`/enrollments/student/${studentId}/course/${course._id}`);
        setProgress(updatedEnroll.data.progress || 0);
        setCertificateUrl(updatedEnroll.data.certificateUrl || null);

        showAlert(`${selectedLesson.title} completed!`, "success");
      } catch (err) {
        console.error("Mark watched error:", err);
      }
    };

    if (selectedLesson.contentType === "video") {
      if (videoProgress >= 90) markCompleted();
    } else {
      markCompleted();
    }
  }, [selectedLesson, videoProgress, completedLessons, studentId, course, isEnrolled]);

  const getLessonProgress = (lessonId) => {
    if (completedLessons.includes(lessonId)) return 100;
    if (selectedLesson?._id === lessonId && selectedLesson.contentType === "video") return videoProgress;
    return 0;
  };

  const handleViewCertificate = () => {
    if (!certificate) return showAlert("Finish all lessons and exams to unlock your certificate!", "info");
    const fullUrl = certificate.startsWith("http") ? certificate : `${BASE_URL}${certificate}`;
    window.open(fullUrl, "_blank");
  };

  const handleDownloadCertificate = async () => {
    if (!certificate) return;
    try {
      showAlert("Preparing your certificate...", "info");
      const fileUrl = certificate.startsWith("http") ? certificate : `${BASE_URL}${certificate}`;
      const response = await fetch(fileUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
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

  if (loading) return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-white">
      <div className="spinner-grow text-info mb-3" role="status"></div>
      <h5 className="text-secondary fw-light animate-pulse">Setting up your learning environment...</h5>
    </div>
  );

  if (error) return (
    <div className="container mt-5">
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
        <div className="card-body text-center py-5">
          <div className="bg-danger bg-opacity-10 d-inline-block p-4 rounded-circle mb-4">
            <AlertTriangle size={64} className="text-danger" />
          </div>
          <h2 className="fw-bold mb-3">Oops!</h2>
          <p className="text-muted mb-4 fs-5">{error}</p>
          <button className="btn btn-dark px-5 py-2 rounded-pill shadow-sm" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-light min-vh-100 pb-5">

      {notification.show && (
        <div className={`alert alert-${notification.type} border-0 alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg`}
          role="alert" style={{ zIndex: 10000, minWidth: '320px', borderRadius: '12px' }}>
          <div className="d-flex align-items-center gap-3">
            {notification.type === "success" ? <CheckCircle size={22} className="text-success" /> : <Info size={22} className="text-info" />}
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
                      {course.category?.name ?? "Course"}
                    </span>
                  </li>
                  <li className="breadcrumb-item text-muted align-self-center small ps-2">{course.level ?? "Intermediate"}</li>
                </ol>
              </nav>
              <h1 className="fw-bolder display-5 mb-3 text-dark tracking-tight">{course.title}</h1>
              <p className="lead text-secondary mb-4 opacity-75" style={{ maxWidth: '750px' }}>{course.description}</p>

              <div className="d-flex flex-wrap gap-4 align-items-center">
                <div className="instructor-card d-flex align-items-center gap-3 bg-white p-2 pe-4 rounded-pill shadow-sm">
                  <div className="bg-warning bg-opacity-10 p-2 rounded-circle"><User size={20} className="text-warning" /></div>
                  <div>
                    <div className="small text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Lead Instructor</div>
                    <div className="fw-bold text-dark">{course.instructor?.name ?? "Expert Mentor"}</div>
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
            </div>

            <div className="col-lg-4">
              {isEnrolled && (
                <div className="progress-card bg-white p-4 rounded-4 shadow-sm border">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="fw-bold text-dark">Course Mastery</span>
                    <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3">{progress}% Complete</span>
                  </div>
                  <div className="progress bg-light" style={{ height: "12px", borderRadius: "10px" }}>
                    <div className="progress-bar progress-bar-striped progress-bar-animated bg-success shadow-sm"
                      role="progressbar" style={{ width: `${progress}%` }}></div>
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
                      {selectedLesson.isPreviewFree && !isEnrolled &&
                        <span className="badge bg-success-subtle text-success border border-success px-3 rounded-pill">FREE PREVIEW</span>
                      }
                    </div>

                    <div className="ratio ratio-16x9 bg-dark shadow-inner">
                      {selectedLesson.contentType === "video" ? (
                        <video ref={videoRef} controls key={selectedLesson._id} className="w-100 h-100 video-player" poster={course.thumbnail}>
                          <source src={selectedLesson.fileUrl?.startsWith("http") ? selectedLesson.fileUrl : `${BASE_URL}${selectedLesson.fileUrl}`} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : selectedLesson.contentType === "pdf" ? (
                        <iframe src={selectedLesson.fileUrl?.startsWith("http") ? selectedLesson.fileUrl : `${BASE_URL}${selectedLesson.fileUrl}`} title={selectedLesson.title} className="w-100 h-100" />
                      ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-5 bg-light">
                          <BookOpen size={48} className="mb-3 opacity-25" />
                          <p className="lead text-center fw-medium px-4">{selectedLesson.description || "Refer to the module resources for this lesson."}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedTab === "exams" ? (
                  <div className="p-5 text-center py-5">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-4 mb-4 shadow-sm border border-white">
                      <Award size={64} className="text-primary" />
                    </div>
                    <h3 className="fw-bold text-dark">Knowledge Assessment</h3>
                    <p className="text-muted mx-auto mb-4" style={{ maxWidth: '500px' }}>
                      Complete your final assessments to validate your expertise.
                    </p>
                    <div className="alert alert-info border-0 rounded-4 px-4 d-inline-block shadow-sm">
                      <Info size={18} className="me-2" /> <strong>Get Ready:</strong> Select a module exam from the list on the right.
                    </div>
                  </div>
                ) : selectedTab === "discussion" ? (
                  <div className="p-5 text-center">
                    <div className={`bg-info bg-opacity-10 rounded-circle d-inline-flex p-4 mb-4 ${!isEnrolled ? 'grayscale shadow-sm' : 'shadow-sm'}`}>
                      {isEnrolled ? <MessageCircle size={64} className="text-info" /> : <ShieldAlert size={64} className="text-muted" />}
                    </div>
                    <h3 className="fw-bold">{isEnrolled ? "Student Discussion Forum" : "Access Restricted"}</h3>
                    <p className="text-muted mx-auto mb-4" style={{ maxWidth: "500px" }}>
                      {isEnrolled
                        ? "Connect with fellow students, ask technical questions, and share insights about this course."
                        : "Join the community of learners! You need to be enrolled in this course to access the private discussion forum."}
                    </p>

                    {isEnrolled ? (
                      <button className="btn btn-info px-5 py-2 fw-bold rounded-pill text-white shadow-sm transition-all" onClick={handleDiscussionAccess}>
                        Enter Community Forum
                      </button>
                    ) : (
                      <div className="d-grid gap-2 col-md-6 mx-auto">
                        <button className="btn btn-warning px-4 py-2 fw-bold rounded-pill shadow-sm" onClick={handleEnroll}>
                          Enroll Now to Unlock Forum
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 text-center text-muted">Select an item to view content.</div>
                )}
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4 p-4 d-none d-lg-block bg-white">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
                <BarChart size={20} className="text-info" />
                Course Curriculum Overview
              </h5>
              <p className="text-secondary mb-4 lh-lg">{course.description}</p>
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
                  <div className="h3 fw-bolder mb-0 text-warning">
                    {Number(course.price) === 0 ? "Free" : `₹${course.price}`}
                  </div>
                  <div className="small text-muted text-uppercase fw-bold ls-1">Total Value</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4 bg-white">
              <div className="position-relative">
                <img
                  src={course.thumbnail?.startsWith("http") ? course.thumbnail : `${BASE_URL}${course.thumbnail}`}
                  alt={course.title}
                  className="card-img-top d-none d-lg-block"
                  style={{ height: "200px", objectFit: "cover" }}
                />
                {!isEnrolled && <div className="img-overlay"></div>}
              </div>

              <div className="card-body p-4">
                {!isEnrolled ? (
                  <div className="text-center">
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                      <span className="h1 fw-bolder mb-0">{course.price > 0 ? `₹${course.price}` : "Free"}</span>
                      {course.price > 0 && <span className="text-muted text-decoration-line-through">₹{Math.round(course.price * 1.5)}</span>}
                    </div>
                    <button
                      className="btn btn-warning btn-lg w-100 fw-bold rounded-pill mb-3 py-2 shadow-lg hover-scale d-flex align-items-center justify-content-center gap-2"
                      onClick={isExpired ? handleReEnroll : handleEnroll}
                      disabled={enrollLoading}
                    >
                      {enrollLoading ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        <>
                          {course.price > 0 && <ShieldAlert size={18} />}
                          {isExpired ? "Renew Access" : "Enroll Now"}
                        </>
                      )}
                    </button>
                    <div className="d-flex align-items-center justify-content-center gap-2 text-muted small">
                      {/* <Lock size={14} /> <span>SSL Secured & Lifetime Access</span> */}
                    </div>
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

                    {progress === 100 && certificate && (
                      <div className="row g-2">
                        <div className="col-6">
                          <button className="btn btn-outline-purple w-100 rounded-pill py-2" onClick={handleViewCertificate}>
                            <Eye size={16} className="me-1" /> View
                          </button>
                        </div>
                        <div className="col-6">
                          <button className="btn btn-purple w-100 rounded-pill py-2" onClick={handleDownloadCertificate}>
                            <Download size={16} className="me-1" /> PDF
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      className="btn btn-link btn-sm text-danger text-decoration-none mt-2 opacity-50 hover-opacity-100"
                      onClick={handleUnenroll}
                    >
                      Cancel Enrollment
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4 overflow-hidden bg-white sticky-lg-top" style={{ top: "20px" }}>
              <div className="nav nav-pills nav-fill p-2 bg-light m-2 rounded-3 gap-1">
                <button className={`nav-link border-0 fw-bold transition-all ${selectedTab === "lessons" ? "active bg-info shadow-sm" : "text-muted"}`}
                  onClick={() => setSelectedTab("lessons")} >
                  <BookOpen size={16} className="me-1" /> <span className="small">Lessons</span>
                </button>

                <button className={`nav-link border-0 fw-bold transition-all ${selectedTab === "exams" ? "active bg-info shadow-sm" : "text-muted"}`}
                  onClick={() => setSelectedTab("exams")} >
                  <FileText size={16} className="me-1" /> <span className="small">Exams</span>
                </button>

                <button className={`nav-link border-0 fw-bold transition-all position-relative ${selectedTab === "discussion" ? "active bg-info shadow-sm" : "text-muted"}`}
                  onClick={() => setSelectedTab("discussion")} >
                  {isEnrolled ? <MessageCircle size={16} className="me-1" /> : <Lock size={16} className="me-1 opacity-50" />}
                  <span className="small">Discuss</span>
                  {isEnrolled && discussionCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow-sm border border-white" style={{ fontSize: "10px" }}>
                      {discussionCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="overflow-auto custom-scrollbar" style={{ maxHeight: "55vh" }}>

                {selectedTab === "lessons" && (
                  <div className="list-group list-group-flush p-3 pt-0">
                    {lessons.map((lesson, idx) => {
                      const canAccess = isEnrolled || lesson.isPreviewFree;
                      const isActive = selectedLesson?._id === lesson._id;
                      const lessonProg = getLessonProgress(lesson._id);
                      const isCompleted = completedLessons.includes(lesson._id);

                      return (
                        <button key={lesson._id || idx} onClick={() => canAccess && setSelectedLesson(lesson)} disabled={!canAccess}
                          className={`list-group-item list-group-item-action border-0 mb-3 rounded-3 transition-all ${isActive ? "bg-info bg-opacity-10 border-start border-info border-4 active-item" : ""} ${!canAccess ? "bg-light opacity-75" : ""}`} >
                          <div className="d-flex align-items-center gap-3">
                            <div className="flex-shrink-0">
                              {isCompleted ? <CheckCircle size={18} className="text-success" /> :
                                canAccess ? <PlayCircle size={18} className={isActive ? "text-info" : "text-muted"} /> :
                                  <Lock size={16} className="text-muted opacity-50" />}
                            </div>
                            <div className="flex-grow-1 overflow-hidden">
                              <div className={`small fw-bold text-truncate ${isActive ? "text-info" : "text-dark"}`}>{idx + 1}. {lesson.title}</div>
                              <div className="d-flex align-items-center gap-2 mt-1">
                                {lesson.isPreviewFree && !isEnrolled && <span className="badge bg-success" style={{ fontSize: "9px" }}>FREE</span>}
                                {canAccess && <div className="progress flex-grow-1" style={{ height: "4px" }}><div className="progress-bar bg-info" style={{ width: `${lessonProg}%` }} /></div>}
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
                      const prog = examProgress.find(p => p.examId === exam._id);
                      const isCompleted = prog?.isCompleted;
                      const bestScore = prog?.bestScore ?? null;

                      return (
                        <div key={exam._id || idx} onClick={() => isEnrolled && navigate(`/course/${id}/exam/${exam._id}`)}
                          className={`card mb-3 border-0 shadow-sm p-3 exam-card transition-all ${isEnrolled ? "cursor-pointer" : "locked-card"}`} >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="m-0 fw-bold text-dark pe-3 lh-sm">{exam.title || `Module ${idx + 1} Assessment`}</h6>
                            {isCompleted && <CheckCircle size={16} className="text-success flex-shrink-0" />}
                            {!isEnrolled && <Lock size={14} className="text-muted" />}
                          </div>
                          <div className="d-flex gap-3 small text-muted">
                            <span className="d-flex align-items-center gap-1"><Clock size={12} /> {exam.duration ?? 0}m</span>
                            <span className="d-flex align-items-center gap-1"><FileText size={12} /> {exam.questions?.length ?? 0} Questions</span>
                          </div>
                          {isEnrolled && bestScore !== null && (
                            <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                              <span className="small text-muted">Best Score</span>
                              <span className={`badge ${bestScore >= 70 ? "bg-success" : "bg-primary"} rounded-pill px-2`}>{bestScore}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedTab === "discussion" && (
                  <div className="p-4 text-center">
                    <MessageCircle size={32} className={`mb-3 ${isEnrolled ? 'text-info' : 'text-muted opacity-25'}`} />
                    <p className="small text-dark fw-bold mb-2">Community Insights</p>
                    <p className="text-muted mb-4" style={{ fontSize: '12px' }}>
                      Join the conversation with {discussionCount || '0'} active posts from other learners.
                    </p>
                    <button className={`btn ${isEnrolled ? 'btn-outline-info' : 'btn-light disabled'} btn-sm w-100 rounded-pill`} onClick={handleDiscussionAccess}>
                      {isEnrolled ? 'Visit Discussion Forum' : 'Enroll to Unlock'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}

export default CourseDetail;