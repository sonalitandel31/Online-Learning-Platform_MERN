import { useState, useEffect } from "react";
import api from "../../../api/api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { track } from "../../../utils/track";

function Courses() {
  // Initialize standard component states
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Custom UI States (Replacing toast and alert)
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    data: null,
  });

  // Setup pagination and routing variables
  const coursesPerPage = 9;
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve user session data
  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;

  // Track enrollment and loading states
  const [enrollLoadingIds, setEnrollLoadingIds] = useState([]);
  const [enrolledCoursesIds, setEnrolledCoursesIds] = useState({});
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);

  const [mySubscription, setMySubscription] = useState(null);

  // Initialize filter states
  const [durationFilter, setDurationFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [sortBy, setSortBy] = useState("");

  // Define base URLs and routes
  const BASE_URL = import.meta.env.VITE_BASE_URL || "";
  const PLANS_ROUTE = "/subscription-plans";
  const MY_SUB_ROUTE = "/me/subscription";

  // Dynamic Theme Colors
  const THEME_PRIMARY = "var(--primary-color, #6f42c1)";
  const THEME_PRIMARY_LIGHT = "var(--primary-color-light, rgba(111, 66, 193, 0.08))";

  // Helper to show custom notification
  const notify = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 4000);
  };

  // Track initial courses page view
  useEffect(() => {
    track("courses_view", {});
  }, []);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!loggedInUser) {
      navigate("/login", { replace: true });
    }
  }, [loggedInUser, navigate]);

  // Fetch course categories from API
  const fetchCategories = async () => {
    try {
      const res = await api.get("/courses/categories");
      const catArray = Array.isArray(res.data) ? res.data : res.data.categories;
      setCategories(catArray || []);
    } catch (err) {
      console.error(err);
      setCategories([]);
    }
  };

  // Fetch courses list with active filters
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const queryParams = new URLSearchParams(location.search);
      const searchQuery = queryParams.get("search") || "";

      const filters = { limit: 100 };

      if (searchQuery.trim() !== "") filters.search = searchQuery;
      if (selectedCategories.length > 0)
        filters.categories = selectedCategories.join(",");

      // Apply duration filter boundaries
      if (durationFilter) {
        const { minDuration, maxDuration } =
          durationRangeToSeconds(durationFilter);
        if (minDuration !== null) filters.minDuration = minDuration;
        if (maxDuration !== null) filters.maxDuration = maxDuration;
      }

      // Apply level filter
      if (levelFilter) filters.level = levelFilter;

      // Apply price filter
      if (priceFilter === "free") filters.price = 0;
      if (priceFilter === "paid") filters.paidOnly = true;

      // Apply rating filter
      if (ratingFilter) filters.minRating = ratingFilter;

      // Apply sorting preference
      if (sortBy) filters.sortBy = sortBy;

      track("courses_filter_apply", {
        search: searchQuery || "",
        categories: selectedCategories,
        durationFilter,
        levelFilter,
        priceFilter,
        ratingFilter,
        sortBy,
      });

      const res = await api.get("/courses", { params: filters });

      const data =
        Array.isArray(res.data) ? res.data : res.data.courses || [];

      setCourses(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger course fetch on filter or search change
  useEffect(() => {
    fetchCourses();
  }, [
    selectedCategories,
    durationFilter,
    levelFilter,
    priceFilter,
    ratingFilter,
    sortBy,
    location.search
  ]);

  // Fetch user specific course enrollments & subscription status
  const fetchEnrollments = async () => {
    try {
      if (!studentId) return;
      setEnrollmentsLoading(true);

      const res = await api.get("/enrollments");

      if (res.data.success) {
        const enrollmentMap = {};
        res.data.enrollments.forEach((e) => {
          if (e.course?._id) {
            enrollmentMap[e.course._id] = {
              status: e.status,
              expiryDate: e.expiryDate,
            };
          }
        });
        setEnrolledCoursesIds(enrollmentMap);

        if (res.data.subscription) {
          setMySubscription(res.data.subscription);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchCategories();
    fetchEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync category state with URL parameters
  useEffect(() => {
    if (!Array.isArray(categories) || categories.length === 0) return;
    const queryParams = new URLSearchParams(location.search);
    const categoryNames = queryParams.get("category");
    setSelectedCategories(categoryNames ? categoryNames.split(",") : []);
  }, [categories, location.search]);

  // Handle category checkbox toggle
  const handleCategoryChange = (catName) => {
    setSelectedCategories((prev) => {
      const newSelected = prev.includes(catName)
        ? prev.filter((c) => c !== catName)
        : [...prev, catName];

      const params = new URLSearchParams(location.search);
      if (newSelected.length > 0) params.set("category", newSelected.join(","));
      else params.delete("category");
      navigate(`?${params.toString()}`, { replace: true });

      return newSelected;
    });
  };

  // Load Razorpay SDK dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Execute course enrollment process
  const handleEnroll = async (course) => {
    track("enroll_click", { courseId: course._id, price: Number(course.price || 0), from: "courses_list" });

    try {
      setEnrollLoadingIds((prev) => [...prev, course._id]);
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        notify("Please log in to enroll", "danger");
        return;
      }

      const isCorporateCourse = course.isGlobal === false;
      const isCompanyEmployee = !!user?.companyId;

      let isCoveredBySub = false;
      if (mySubscription?.active) {
        if (mySubscription.accessType === "all") {
          isCoveredBySub = true;
        } else if (mySubscription.accessType === "selected" && mySubscription.courseIds.includes(course._id)) {
          isCoveredBySub = true;
        }
      }

      // ===== BYPASS RAZORPAY CONDITION =====
      if (!course.price || course.price === 0 || (isCorporateCourse && isCompanyEmployee) || isCoveredBySub) {

        const payload = {
          courseId: course._id,
          amount: 0,
          source: isCoveredBySub ? "subscription" : "purchase"
        };

        const { data } = await api.post("/enrollments", payload);

        if (data.success) {
          track("enroll_success", { courseId: course._id, price: 0 });
          notify(isCoveredBySub ? "Enrolled via Subscription!" : "Enrolled successfully!");
          fetchEnrollments();
        } else notify(data.message || "Enrollment failed.", "danger");
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        notify("Razorpay SDK failed to load.", "danger");
        return;
      }

      // Create payment order for paid courses
      const { data } = await api.post("/payment/create-order", {
        courseId: course._id,
        studentId: user._id,
      });

      if (!data.success) return notify(data.message, "danger");

      track("payment_order_created", {
        courseId: course._id,
        amount: data.amount,
        currency: data.currency,
      });

      const { key, orderId, amount, currency } = data;

      const options = {
        key,
        amount: amount * 100,
        currency,
        name: "LearnX Platform",
        description: course.title,
        order_id: orderId,
        handler: async function (response) {
          const verify = await api.post("/payment/verify-payment", {
            ...response,
            studentId: user._id,
            courseId: course._id,
          });

          if (verify.data.success) {
            track("enroll_success", { courseId: course._id, price: Number(course.price || 0) });

            notify("Enrollment successful!");
            fetchEnrollments();

            if (verify.data.receiptUrl) {
              const base = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");
              window.open(`${base}${verify.data.receiptUrl}`, "_blank");
            }
          } else notify("Payment verification failed!", "danger");
        },
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: THEME_PRIMARY }, 
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error(error);
      notify("Enrollment failed", "danger");
    } finally {
      setEnrollLoadingIds((prev) => prev.filter((id) => id !== course._id));
    }
  };

  // Open confirmation modal for course re-enrollment
  const confirmReenroll = (course) => {
    track("renew_click", { courseId: course._id, price: Number(course.price || 0) });

    setConfirmModal({
      show: true,
      title: "Re-enroll Course",
      message: `Your access has expired or been cancelled. Do you want to re-enroll in "${course.title}"?`,
      onConfirm: executeReenroll,
      data: course,
    });
  };

  // Execute re-enrollment logic after confirmation
  const executeReenroll = async (course) => {
    setConfirmModal({ ...confirmModal, show: false });
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        notify("Please log in again.", "danger");
        return;
      }

      if (!course.price || course.price === 0) {
        const { data } = await api.post("/enrollments", { courseId: course._id, amount: 0 });
        if (data.success) {
          track("enroll_success", { courseId: course._id, price: 0 });
          notify("Re-enrolled successfully!");
          fetchEnrollments();
        } else notify(data.message, "danger");
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) return notify("Razorpay SDK failed to load.", "danger");

      const { data } = await api.post("/payment/create-order", {
        courseId: course._id,
        studentId: user._id,
      });
      if (!data.success) return notify(data.message, "danger");

      track("payment_order_created", {
        courseId: course._id,
        amount: data.amount,
        currency: data.currency,
      });

      const { key, orderId, amount, currency } = data;

      const options = {
        key,
        amount: amount * 100,
        currency,
        name: "LearnX Platform",
        description: `Re-enrollment for ${course.title}`,
        order_id: orderId,
        handler: async function (response) {
          const verify = await api.post("/payment/verify-payment", {
            ...response,
            studentId: user._id,
            courseId: course._id,
          });

          if (verify.data.success) {
            track("enroll_success", { courseId: course._id, price: Number(course.price || 0) });
            notify("Re-enrollment successful!");
            fetchEnrollments();
          } else notify("Payment verification failed!", "danger");
        },
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: THEME_PRIMARY },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      notify("Re-enrollment failed", "danger");
    }
  };

  // Format seconds to human readable duration
  const formatDuration = (seconds = 0) => {
    const totalSeconds = Number(seconds || 0);

    const totalMinutes = Math.ceil(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Format rating to single decimal place
  const formatRating = (avg = 0) => {
    const n = Number(avg || 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n.toFixed(1);
  };

  // Convert duration dropdown values to seconds boundaries
  const durationRangeToSeconds = (val) => {
    switch (val) {
      case "lt_60":
        return { minDuration: 0, maxDuration: 60 * 60 - 1 };

      case "60_90":
        return { minDuration: 60 * 60, maxDuration: 90 * 60 };

      case "90_120":
        return { minDuration: 90 * 60 + 1, maxDuration: 120 * 60 };

      case "120_180":
        return { minDuration: 120 * 60 + 1, maxDuration: 180 * 60 };

      case "gt_180":
        return { minDuration: 180 * 60 + 1, maxDuration: null };

      default:
        return { minDuration: null, maxDuration: null };
    }
  };

  // Setup current page course slice
  const approvedCourses = courses.filter((c) => c.status === "approved");
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = approvedCourses.slice(indexOfFirstCourse, indexOfLastCourse);
  const totalPages = Math.ceil(approvedCourses.length / coursesPerPage);

  // Handle pagination navigation
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Render main UI
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", paddingBottom: "60px", marginTop: "1.5%" }}>
      <style>{`
        .modern-sidebar {
          background: #ffffff;
          border-radius: 24px;
          padding: 32px 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0,0,0,0.02);
        }
        .modern-select {
          background-color: #f8f9fc;
          border: 1px solid transparent;
          color: #333;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .modern-select:focus {
          background-color: #fff;
          border-color: ${THEME_PRIMARY};
          box-shadow: 0 0 0 4px ${THEME_PRIMARY_LIGHT};
        }
        .filter-title {
          font-size: 0.75rem;
          letter-spacing: 1.5px;
          font-weight: 800;
          color: #8b95a5;
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .custom-checkbox-wrap {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .custom-checkbox-wrap:hover {
          background: ${THEME_PRIMARY_LIGHT};
        }
        .custom-checkbox-wrap input[type="checkbox"] {
          accent-color: ${THEME_PRIMARY};
          width: 18px;
          height: 18px;
          cursor: pointer;
          border-color: #cbd5e1;
        }
        
        .masterpiece-card {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.03);
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .masterpiece-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
        }
        .card-img-container {
          position: relative;
          padding: 12px;
          padding-bottom: 0;
        }
        .card-img-custom {
          border-radius: 14px;
          height: 160px;
          width: 100%;
          object-fit: cover;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.05);
        }
        .pill-badge {
          position: absolute;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          backdrop-filter: blur(8px);
        }
        .pill-tl { top: 22px; left: 22px; }
        .pill-tr { top: 22px; right: 22px; }
        
        .btn-theme-primary {
          background: ${THEME_PRIMARY};
          color: white;
          border: none;
          transition: all 0.3s ease;
        }
        .btn-theme-primary:hover {
          background: ${THEME_PRIMARY};
          filter: brightness(1.1);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px ${THEME_PRIMARY_LIGHT};
        }
        .btn-theme-outline {
          background: transparent;
          color: ${THEME_PRIMARY};
          border: 2px solid ${THEME_PRIMARY};
          transition: all 0.3s ease;
        }
        .btn-theme-outline:hover {
          background: ${THEME_PRIMARY_LIGHT};
          color: ${THEME_PRIMARY};
        }

        .page-header-banner {
          background: linear-gradient(135deg, ${THEME_PRIMARY} 0%, #1a1a1a 100%);
          padding: 80px 0 60px 0;
          margin-bottom: -40px;
          color: white;
        }

        /* --- SKELETON LOADER CSS --- */
        .skeleton {
          background: #e2e5e7;
          background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
          background-size: 200px 100%;
          background-repeat: no-repeat;
          border-radius: 4px;
          display: inline-block;
          line-height: 1;
          width: 100%;
          animation: skeletonShimmer 1.5s infinite linear;
        }
        @keyframes skeletonShimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .skeleton-img { height: 160px; border-radius: 14px; margin: 12px; width: calc(100% - 24px); }
        .skeleton-title { height: 24px; width: 75%; margin-bottom: 12px; }
        .skeleton-text { height: 14px; margin-bottom: 8px; }
        .skeleton-text-short { width: 60%; }
        .skeleton-meta { height: 16px; width: 40px; }
        .skeleton-btn { height: 38px; width: 90px; border-radius: 50rem; }
      `}</style>

      {/* --- CUSTOM NOTIFICATION UI --- */}
      {notification.show && (
        <div
          className="shadow-lg d-flex align-items-center p-3"
          style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            zIndex: 9999,
            minWidth: "300px",
            borderRadius: "16px",
            background: notification.type === "danger" ? "#fff0f0" : "#ffffff",
            borderLeft: `6px solid ${notification.type === "danger" ? "#dc3545" : THEME_PRIMARY}`,
            color: "#2b2b2b",
          }}
        >
          <span className="me-3 fs-5">{notification.type === "success" ? "✅" : "⚠️"}</span>
          <span className="fw-bold">{notification.message}</span>
        </div>
      )}

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {confirmModal.show && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
            zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px",
          }}
        >
          <div className="bg-white p-5 rounded-4 shadow-lg border-0" style={{ maxWidth: "450px", width: "100%" }}>
            <div className="text-center mb-4">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '60px', height: '60px', background: THEME_PRIMARY_LIGHT, color: THEME_PRIMARY }}>
                <i className="bi bi-arrow-repeat fs-2"></i>
              </div>
              <h4 className="fw-bolder m-0" style={{ color: "#1a1a1a", letterSpacing: "-0.5px" }}>{confirmModal.title}</h4>
            </div>
            <p className="text-muted text-center mb-5 fs-6">{confirmModal.message}</p>
            <div className="d-flex gap-3 justify-content-center">
              <button
                className="btn btn-light rounded-pill px-5 py-2 fw-bold"
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
              >
                Cancel
              </button>
              <button
                className="btn btn-theme-primary rounded-pill px-5 py-2 fw-bold"
                onClick={() => confirmModal.onConfirm(confirmModal.data)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.5)", zIndex: 1040, backdropFilter: "blur(4px)",
          }}
        />
      )}

      <div className="container position-relative" style={{ zIndex: 2 }}>
        {/* Mobile Filter Toggle */}
        <div className="d-lg-none mb-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="btn w-100 d-flex justify-content-between align-items-center shadow-sm py-3 px-4"
            style={{ borderRadius: "16px", border: "none", background: "#fff" }}
          >
            <span className="fw-bold text-dark"><i className="bi bi-sliders me-2" style={{ color: THEME_PRIMARY }}></i> Show Filters</span>
            <span className="badge rounded-pill text-white px-3 py-2" style={{ background: THEME_PRIMARY }}>
              {selectedCategories.length} Active
            </span>
          </button>
        </div>

        <div className="row g-4 g-xl-5">
          {/* Sidebar Filters */}
          <aside
            className={`col-lg-3 ${isSidebarOpen ? "d-block" : "d-none d-lg-block"}`}
            style={
              isSidebarOpen
                ? {
                  position: "fixed", top: 0, left: 0, height: "100vh", width: "320px", zIndex: 1050,
                  background: "#fff", padding: "30px 20px", boxShadow: "15px 0 40px rgba(0,0,0,0.1)",
                  overflowY: "auto", borderTopRightRadius: "24px", borderBottomRightRadius: "24px"
                }
                : {}
            }
          >
            <div className={isSidebarOpen ? "" : "modern-sidebar sticky-top"} style={{ top: "40px" }}>
              <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <h5 className="fw-bolder m-0 text-dark"><i className="bi bi-funnel-fill me-2" style={{ color: THEME_PRIMARY }}></i> Filters</h5>
                {isSidebarOpen && <button className="btn-close shadow-none" onClick={() => setIsSidebarOpen(false)}></button>}
              </div>

              <div className="d-flex flex-column gap-4">

                {/* Categories */}
                <div>
                  <h6 className="filter-title">Categories</h6>
                  <div className="d-flex flex-column gap-1">
                    {categories.map((cat) => (
                      <label key={cat._id} className="custom-checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat._id)}
                          onChange={() => {
                            handleCategoryChange(cat._id);
                            if (window.innerWidth < 992) setIsSidebarOpen(false);
                          }}
                        />
                        <span className="text-dark fw-medium ms-3">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <h6 className="filter-title">Duration</h6>
                  <select
                    className="form-select form-select-lg modern-select rounded-3 py-2"
                    value={durationFilter}
                    onChange={(e) => setDurationFilter(e.target.value)}
                  >
                    <option value="">Any Duration</option>
                    <option value="lt_60">&lt; 60 mins</option>
                    <option value="60_90">1 - 1.5 hours</option>
                    <option value="90_120">1.5 - 2 hours</option>
                    <option value="120_180">2 - 3 hours</option>
                    <option value="gt_180">&gt; 3 hours</option>
                  </select>
                </div>

                {/* Level */}
                <div>
                  <h6 className="filter-title">Difficulty Level</h6>
                  <select
                    className="form-select form-select-lg modern-select rounded-3 py-2"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                  >
                    <option value="">All Levels</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                {/* Price */}
                <div>
                  <h6 className="filter-title">Pricing</h6>
                  <select
                    className="form-select form-select-lg modern-select rounded-3 py-2"
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                  >
                    <option value="">All Pricing</option>
                    <option value="free">Free Only</option>
                    <option value="paid">Premium Only</option>
                  </select>
                </div>

                {/* Rating */}
                <div>
                  <h6 className="filter-title">Student Rating</h6>
                  <select
                    className="form-select form-select-lg modern-select rounded-3 py-2"
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                  >
                    <option value="">Any Rating</option>
                    <option value="4">4.0 & above</option>
                    <option value="3">3.0 & above</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <h6 className="filter-title">Sort By</h6>
                  <select
                    className="form-select form-select-lg modern-select rounded-3 py-2"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="">Most Relevant</option>
                    <option value="newest">Newest Additions</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setDurationFilter("");
                    setLevelFilter("");
                    setPriceFilter("");
                    setRatingFilter("");
                    setSortBy("");

                    const params = new URLSearchParams(location.search);
                    params.delete("category");
                    navigate(`?${params.toString()}`, { replace: true });

                    setIsSidebarOpen(false);
                  }}
                  className="btn btn-light fw-bold w-100 py-3 rounded-pill mt-2 transition"
                  style={{ color: THEME_PRIMARY, backgroundColor: THEME_PRIMARY_LIGHT }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </aside>

          {/* Main Course Grid Area */}
          <main className="col-lg-9">
            {(loading || enrollmentsLoading) ? (
              // Enhanced Skeleton Grid shown while EITHER courses or enrollments are loading
              <div className="row g-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="col-md-6 col-lg-4 mb-2">
                    <div className="masterpiece-card" style={{ pointerEvents: 'none' }}>
                      <div className="card-img-container">
                        <div className="skeleton skeleton-img"></div>
                      </div>
                      <div className="card-body d-flex flex-column p-3">
                        <div className="skeleton skeleton-title mt-2"></div>
                        <div className="d-flex gap-2 mb-3">
                          <div className="skeleton" style={{ width: '16px', height: '16px', borderRadius: '50%' }}></div>
                          <div className="skeleton" style={{ width: '50%' }}></div>
                        </div>
                        <div className="skeleton skeleton-text"></div>
                        <div className="skeleton skeleton-text"></div>
                        <div className="skeleton skeleton-text skeleton-text-short mb-4"></div>
                        
                        <div className="d-flex align-items-center gap-3 mb-3 pb-2 border-bottom border-light">
                          <div className="skeleton skeleton-meta"></div>
                          <div className="skeleton skeleton-meta"></div>
                          <div className="skeleton skeleton-meta"></div>
                        </div>
                        
                        <div className="d-flex justify-content-between align-items-center mt-auto">
                          <div className="skeleton" style={{ width: '50px', height: '24px', margin: 0 }}></div>
                          <div className="skeleton skeleton-btn"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center" style={{ background: "#fff0f0", color: "#dc3545" }}>
                <i className="bi bi-exclamation-triangle-fill display-4 mb-3"></i>
                <h5 className="fw-bolder m-0">{error}</h5>
              </div>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-4 px-2">
                  <h4 className="fw-bolder text-dark m-0" style={{ letterSpacing: "-0.5px" }}>
                    Showing <span style={{ color: THEME_PRIMARY }}>{approvedCourses.length}</span> Results
                  </h4>
                </div>

                {approvedCourses.length === 0 ? (
                  <div className="text-center py-5 bg-white rounded-4 shadow-sm border-0 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "400px" }}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px', background: '#f8f9fa' }}>
                      <i className="bi bi-search fs-1 text-muted opacity-50"></i>
                    </div>
                    <h4 className="fw-bolder text-dark">No matches found</h4>
                    <p className="text-muted fs-6">Try adjusting your filters or searching for something else.</p>
                  </div>
                ) : (
                  <div className="row g-4">
                    {currentCourses.map((course) => {
                      const enrollment = enrolledCoursesIds[course._id];
                      const isExpired = enrollment?.expiryDate && new Date(enrollment.expiryDate) < new Date();
                      const isEnrolled = enrollment?.status === "active" || enrollment?.status === "completed";
                      const isCompleted = enrollment?.status === "completed";
                      const isExpiredOrCancelled = enrollment?.status === "cancelled" || isExpired;

                      return (
                        <div key={course._id} className="col-md-6 col-lg-4 mb-2">
                          <div className="masterpiece-card">

                            <div className="card-img-container">
                              <img
                                src={
                                  course.thumbnail
                                    ? course.thumbnail.startsWith("http")
                                      ? course.thumbnail
                                      : `${BASE_URL}${course.thumbnail}`
                                    : "https://via.placeholder.com/400x225"
                                }
                                className="card-img-custom"
                                alt={course.title}
                              />

                              {isEnrolled && (
                                <span
                                  className="pill-badge pill-tl"
                                  style={{
                                    background: isCompleted ? "rgba(255, 202, 44, 0.9)" : "rgba(25, 135, 84, 0.9)",
                                    color: isCompleted ? "#000" : "#fff",
                                  }}
                                >
                                  {isCompleted ? "COMPLETED" : "ENROLLED"}
                                </span>
                              )}

                              <span
                                className="pill-badge pill-tr shadow-sm"
                                style={{ background: "rgba(255, 255, 255, 0.95)", color: "#1a1a1a" }}
                              >
                                {course.level?.charAt(0).toUpperCase() + course.level?.slice(1)}
                              </span>
                            </div>

                            {/* Content Container */}
                            <div className="card-body d-flex flex-column p-3">

                              {/* B2B / Corporate Badge */}
                              {course.isGlobal === false && loggedInUser?.companyId && (
                                <div className="mb-3">
                                  <span className="badge rounded-pill" style={{ background: "#fff3cd", color: "#856404", padding: "6px 12px", border: "1px solid #ffeeba", fontWeight: "700" }}>
                                    <i className="bi bi-building me-1"></i> Corporate Access
                                  </span>
                                </div>
                              )}

                              {/* Title */}
                              <h5 className="fw-bolder mb-2" style={{ lineHeight: "1.4", fontSize: '1.15rem' }}>
                                <Link
                                  to={`/courses/${course._id}`}
                                  className="text-dark text-decoration-none"
                                  onClick={() => track("course_open", { courseId: course._id, source: "courses_list_title" })}
                                >
                                  {course.title}
                                </Link>
                              </h5>

                              {/* Instructor */}
                              <div className="text-muted small mb-3 fw-semibold d-flex align-items-center justify-content-start gap-2">
                                <i className="bi bi-person-fill text-secondary"></i>
                                <span>{course.instructor?.name || "Expert Instructor"}</span>
                              </div>

                              {/* Description (Clamped) */}
                              <p
                                className="text-secondary small mb-2 flex-grow-1"
                                style={{
                                  display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical",
                                  overflow: "hidden", lineHeight: "1.6"
                                }}
                              >
                                {course.description}
                              </p>

                              {/* Meta Info Row */}
                              <div className="d-flex align-items-center gap-3 mb-3 pb-2 border-bottom border-light">
                                {formatRating(course.averageRating) && (
                                  <div className="d-flex align-items-center gap-1 text-dark small fw-bolder">
                                    <i className="bi bi-star-fill text-warning"></i>
                                    {formatRating(course.averageRating)}
                                  </div>
                                )}
                                <div className="d-flex align-items-center gap-1 text-muted small fw-medium">
                                  <i className="bi bi-people-fill"></i> {course.totalEnrolled || 0}
                                </div>
                                {Number(course.totalDuration || 0) > 0 && (
                                  <div className="d-flex align-items-center gap-1 text-muted small fw-medium">
                                    <i className="bi bi-clock-fill"></i> {formatDuration(course.totalDuration)}
                                  </div>
                                )}
                              </div>

                              {/* Action Footer */}
                              <div className="d-flex justify-content-between align-items-center mt-auto">

                                {/* Price Section */}
                                <div>
                                  {(course.isGlobal === false && loggedInUser?.companyId) ||
                                    (mySubscription?.active && (mySubscription.accessType === "all" || mySubscription.courseIds.includes(course._id))) ? (
                                    <span className="badge rounded-pill bg-success-subtle text-success fw-bold px-3 py-2 border border-success border-opacity-25">
                                      <i className="bi bi-star-fill me-1"></i> Included
                                    </span>
                                  ) : (
                                    <span className="fw-bolder fs-5 text-dark">
                                      {Number(course.price) === 0 ? "Free" : `₹${course.price}`}
                                    </span>
                                  )}
                                </div>

                                {/* Button Section */}
                                <div>
                                  {isEnrolled ? (
                                    <button
                                      onClick={() => {
                                        track("course_open", { courseId: course._id, source: "courses_list_learn_btn" });
                                        navigate(`/courses/${course._id}`);
                                      }}
                                      className="btn btn-theme-primary rounded-pill px-4 py-2 fw-bold"
                                    >
                                      Learn
                                    </button>
                                  ) : (
                                    <div className="d-flex gap-2">
                                      {/* Subscription CTA for Paid normal courses */}
                                      {Number(course.price || 0) > 0 && course.isGlobal !== false && (
                                        <button
                                          className="btn btn-light rounded-pill px-3 py-2 fw-bold shadow-sm"
                                          onClick={() => {
                                            track("subscribe_cta_click", { courseId: course._id, source: "courses_list" });
                                            navigate(PLANS_ROUTE);
                                          }}
                                          title="Get with Subscription"
                                        >
                                          <i className="bi bi-gem text-warning"></i>
                                        </button>
                                      )}

                                      {/* Main Enroll / Renew Button */}
                                      <button
                                        onClick={() => (isExpiredOrCancelled ? confirmReenroll(course) : handleEnroll(course))}
                                        disabled={enrollLoadingIds.includes(course._id)}
                                        className={`btn rounded-pill px-4 py-2 fw-bold ${isExpiredOrCancelled ? "btn-dark" : "btn-theme-primary"}`}
                                      >
                                        {enrollLoadingIds.includes(course._id) ? (
                                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        ) : isExpiredOrCancelled ? "Renew" :
                                          (course.isGlobal === false && loggedInUser?.companyId ? "Start" : "Enroll")
                                        }
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Render pagination controls */}
                {totalPages > 1 && (
                  <nav className="mt-5 pt-4 border-top border-light d-flex justify-content-center">
                    <ul className="pagination gap-2 m-0">
                      {[...Array(totalPages)].map((_, i) => (
                        <li key={i} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
                          <button
                            className="page-link rounded-circle border-0 fw-bolder d-flex align-items-center justify-content-center transition shadow-sm"
                            style={{
                              width: "44px", height: "44px",
                              background: currentPage === i + 1 ? THEME_PRIMARY : "#fff",
                              color: currentPage === i + 1 ? "#fff" : "#4a5568",
                              transform: currentPage === i + 1 ? "scale(1.05)" : "scale(1)"
                            }}
                            onClick={() => handlePageChange(i + 1)}
                          >
                            {i + 1}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Courses;