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

  // Fetch user specific course enrollments
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
    // Track enrollment intent
    track("enroll_click", {
      courseId: course._id,
      price: Number(course.price || 0),
      from: "courses_list",
    });

    try {
      setEnrollLoadingIds((prev) => [...prev, course._id]);
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        notify("Please log in to enroll", "danger");
        return;
      }

      // Handle free course enrollment directly
      if (!course.price || course.price === 0) {
        const { data } = await api.post("/enrollments", { courseId: course._id, amount: 0 });

        if (data.success) {
          track("enroll_success", { courseId: course._id, price: 0 });
          notify("Enrolled successfully!");
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

            // Open receipt in new tab
            if (verify.data.receiptUrl) {
              const base = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");
              window.open(`${base}${verify.data.receiptUrl}`, "_blank");
            }
          } else notify("Payment verification failed!", "danger");
        },
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: "#7b2cbf" },
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
      message: `Do you want to re-enroll in ${course.title}?`,
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
        theme: { color: "#7b2cbf" },
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

  // Render full-page context loader while fetching enrollments
  if (enrollmentsLoading)
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh", width: "100vw", position: "fixed", top: 0, left: 0, background: "rgba(240, 242, 245, 0.9)", backdropFilter: "blur(8px)", zIndex: 1050 }}>
        <div className="card shadow-lg border-0 rounded-4 p-5 text-center" style={{ width: "350px", background: "#fff" }}>
          <i className="bi bi-journal-richtext display-3 mb-3" style={{ color: "#7b2cbf" }}></i>
          <h5 className="fw-bold mb-3" style={{ color: "#2b2b2b" }}>Accessing Dashboard...</h5>
          <div className="progress" style={{ height: "6px", borderRadius: "10px", background: "#f0f2f5" }}>
            <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: "100%", background: "#ffca2c" }}></div>
          </div>
        </div>
      </div>
    );

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
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        padding: "40px 20px",
        background: "#f8f9fa",
        minHeight: "100vh",
        position: "relative",
        marginTop:"-1%"
      }}
    >
      <style>{`
        .course-card { transition: all 0.3s ease; }
        .course-card:hover { transform: translateY(-6px); box-shadow: 0 15px 30px rgba(123, 44, 191, 0.1) !important; }
        .custom-check:checked { background-color: #7b2cbf; border-color: #7b2cbf; }
        .filter-select:focus { border-color: #7b2cbf; box-shadow: 0 0 0 0.25rem rgba(123, 44, 191, 0.25); }
        @keyframes pulse-dot { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        .dot { animation: pulse-dot 1.2s infinite ease-in-out; background-color: #7b2cbf; width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
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
            borderRadius: "12px",
            background: notification.type === "danger" ? "#fff0f0" : "#f0fff4",
            borderLeft: `6px solid ${notification.type === "danger" ? "#dc3545" : "#198754"}`,
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
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <div className="bg-white p-4 rounded-4 shadow-lg border-0" style={{ maxWidth: "420px", width: "100%" }}>
            <div className="d-flex align-items-center mb-3">
              <i className="bi bi-arrow-repeat fs-3 me-2" style={{ color: "#ffca2c" }}></i>
              <h5 className="fw-bold m-0" style={{ color: "#2b2b2b" }}>{confirmModal.title}</h5>
            </div>
            <p className="text-muted mb-4 fs-6">{confirmModal.message}</p>
            <div className="d-flex gap-3 justify-content-end">
              <button
                className="btn btn-light rounded-pill px-4 fw-bold shadow-sm"
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
              >
                Cancel
              </button>
              <button
                className="btn text-white rounded-pill px-4 fw-bold shadow-sm"
                style={{ background: "#7b2cbf", border: "none" }}
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
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 1040,
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      <div className="container py-3">
        {/* Mobile Filter Toggle */}
        <div className="d-lg-none mb-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="btn w-100 d-flex justify-content-between align-items-center shadow-sm py-3 px-4"
            style={{ borderRadius: "16px", border: "1px solid #e9ecef", background: "#fff" }}
          >
            <span className="fw-bold text-dark"><i className="bi bi-sliders me-2 text-muted"></i> Filters</span>
            <span className="badge rounded-pill text-dark px-3 py-2" style={{ background: "#ffca2c" }}>
              {selectedCategories.length} Active
            </span>
          </button>
        </div>

        <div className="row g-5">
          {/* Sidebar Filters */}
          <aside
            className={`col-lg-3 ${isSidebarOpen ? "d-block" : "d-none d-lg-block"}`}
            style={
              isSidebarOpen
                ? {
                  position: "fixed",
                  top: 0,
                  left: 0,
                  height: "100vh",
                  width: "300px",
                  zIndex: 1050,
                  background: "#fff",
                  padding: "30px 20px",
                  boxShadow: "15px 0 40px rgba(0,0,0,0.1)",
                  overflowY: "auto",
                  borderTopRightRadius: "24px",
                  borderBottomRightRadius: "24px"
                }
                : {}
            }
          >
            <div className="bg-white rounded-4 shadow-sm p-4 border" style={{ position: isSidebarOpen ? "static" : "sticky", top: "100px", borderColor: "#e9ecef" }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold m-0 text-dark"><i className="bi bi-funnel me-2" style={{ color: "#7b2cbf" }}></i> Filters</h5>
                {isSidebarOpen && <button className="btn-close shadow-none" onClick={() => setIsSidebarOpen(false)}></button>}
              </div>
              
              <div className="d-flex flex-column gap-2">
                <h6 className="fw-bold text-secondary text-uppercase" style={{ fontSize: "0.8rem", letterSpacing: "1px" }}>Categories</h6>
                {categories.map((cat) => (
                  <label key={cat._id} className="d-flex align-items-center gap-2 p-1 rounded hover-bg-light" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      className="form-check-input custom-check m-0 shadow-sm"
                      checked={selectedCategories.includes(cat._id)}
                      onChange={() => {
                        handleCategoryChange(cat._id);
                        if (window.innerWidth < 992) setIsSidebarOpen(false);
                      }}
                    />
                    <span className="text-dark small fw-medium">{cat.name}</span>
                  </label>
                ))}
                
                <hr className="text-muted opacity-25" />
                <h6 className="fw-bold text-secondary text-uppercase" style={{ fontSize: "0.8rem", letterSpacing: "1px" }}>Duration</h6>
                <select
                  className="form-select form-select-sm filter-select rounded-3 shadow-sm border-0 bg-light py-2"
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value)}
                >
                  <option value="">Any Duration</option>
                  <option value="lt_60">&lt; 60 min</option>
                  <option value="60_90">1:00 – 1:30 hr</option>
                  <option value="90_120">1:30 – 2:00 hr</option>
                  <option value="120_180">2:00 – 3:00 hr</option>
                  <option value="gt_180">&gt; 3 hr</option>
                </select>

                <hr className="text-muted opacity-25" />
                <h6 className="fw-bold text-secondary text-uppercase" style={{ fontSize: "0.8rem", letterSpacing: "1px" }}>Level</h6>
                <select
                  className="form-select form-select-sm filter-select rounded-3 shadow-sm border-0 bg-light py-2"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>

                <hr className="text-muted opacity-25" />
                <h6 className="fw-bold text-secondary text-uppercase" style={{ fontSize: "0.8rem", letterSpacing: "1px" }}>Price</h6>
                <select
                  className="form-select form-select-sm filter-select rounded-3 shadow-sm border-0 bg-light py-2"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>

                <hr className="text-muted opacity-25" />
                <h6 className="fw-bold text-secondary text-uppercase" style={{ fontSize: "0.8rem", letterSpacing: "1px" }}>Rating</h6>
                <select
                  className="form-select form-select-sm filter-select rounded-3 shadow-sm border-0 bg-light py-2"
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                >
                  <option value="">Any Rating</option>
                  <option value="4">4★ & above</option>
                  <option value="3">3★ & above</option>
                </select>

                <hr className="text-muted opacity-25" />
                <select
                  className="form-select filter-select rounded-3 shadow-sm border-0 bg-light py-2"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="">Sort By</option>
                  <option value="newest">Newest</option>
                  <option value="price_low">Price: Low → High</option>
                  <option value="price_high">Price: High → Low</option>
                  <option value="rating">Top Rated</option>
                </select>

                <hr className="text-muted opacity-25" />
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
                  className="btn btn-link text-decoration-none p-0 text-center fw-bold w-100 py-2 rounded-3"
                  style={{ color: "#6f42c1", background: "#f8f9fa" }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </aside>

          {/* Main Course Grid Area */}
          <main className="col-lg-9">
            {loading ? (
              // Section-level context loading effect
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center w-100 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "400px" }}>
                <i className="bi bi-search display-3 mb-4" style={{ color: "#7b2cbf" }}></i>
                <h4 className="fw-bold text-dark mb-4">Curating Courses...</h4>
                <div className="d-flex justify-content-center gap-3">
                  <div className="dot shadow-sm"></div>
                  <div className="dot shadow-sm"></div>
                  <div className="dot shadow-sm"></div>
                </div>
              </div>
            ) : error ? (
              <div className="alert border-0 shadow-sm rounded-4 p-4 text-center" style={{ background: "#fff0f0", color: "#dc3545" }}>
                <i className="bi bi-exclamation-triangle-fill fs-3 d-block mb-2"></i>
                <span className="fw-bold">{error}</span>
              </div>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-end mb-4 px-2">
                  <h3 className="fw-bolder text-dark m-0" style={{ letterSpacing: "-0.5px" }}>
                    Explore <span style={{ color: "#7b2cbf" }}>{approvedCourses.length}</span> Courses
                  </h3>
                </div>

                {approvedCourses.length === 0 ? (
                  <div className="text-center py-5 bg-white rounded-4 shadow-sm border-0">
                    <i className="bi bi-inbox fs-1 text-muted opacity-50 mb-3 d-block"></i>
                    <h5 className="fw-bold text-dark">No courses found</h5>
                    <p className="text-muted">Try adjusting your filters or search query.</p>
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
                        <div key={course._id} className="col-md-6 col-xl-4">
                          <div className="card h-100 border-0 shadow-sm course-card bg-white" style={{ borderRadius: "20px" }}>
                            <div className="position-relative p-2 pb-0">
                              <img
                                src={
                                  course.thumbnail
                                    ? course.thumbnail.startsWith("http")
                                      ? course.thumbnail
                                      : `${BASE_URL}${course.thumbnail}`
                                    : "https://via.placeholder.com/400x225"
                                }
                                className="card-img-top"
                                style={{
                                  height: "180px",
                                  objectFit: "cover",
                                  borderRadius: "16px",
                                }}
                                alt={course.title}
                              />
                              {isEnrolled && (
                                <span
                                  className="position-absolute top-0 end-0 m-3 badge rounded-pill shadow-sm px-3 py-2 fw-bold"
                                  style={{
                                    background: isCompleted ? "#ffca2c" : "#7b2cbf",
                                    color: isCompleted ? "#000" : "#fff",
                                    fontSize: "0.7rem",
                                    letterSpacing: "0.5px"
                                  }}
                                >
                                  {isCompleted ? "COMPLETED" : "ACTIVE"}
                                </span>
                              )}
                            </div>

                            <div className="card-body d-flex flex-column p-4">
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="badge rounded-pill" style={{ background: "#f3e8ff", color: "#6f42c1", padding: "6px 12px", fontWeight: "700" }}>
                                  {course.level}
                                </span>

                                <div className="text-end d-flex gap-3 align-items-center">
                                  {formatRating(course.averageRating) && (
                                    <span className="text-dark small fw-bold d-flex align-items-center gap-1">
                                      <i className="bi bi-star-fill text-warning"></i> {formatRating(course.averageRating)}
                                    </span>
                                  )}
                                  <span className="text-muted small d-flex align-items-center gap-1">
                                    <i className="bi bi-people-fill text-secondary"></i>
                                    {course.totalEnrolled || 0}
                                  </span>
                                </div>
                              </div>

                              <h5 className="fw-bolder mb-2" style={{ lineHeight: "1.4" }}>
                                <Link
                                  to={`/courses/${course._id}`}
                                  className="text-dark text-decoration-none"
                                  onClick={() => track("course_open", { courseId: course._id, source: "courses_list_title" })}
                                >
                                  {course.title}
                                </Link>
                              </h5>

                              <p className="text-muted small mb-3 fw-medium d-flex align-items-center gap-2">
                                <i className="bi bi-person-circle fs-5" style={{ color: "#adb5bd" }}></i>
                                {course.instructor?.name || "Expert Instructor"}
                              </p>

                              <p
                                className="text-secondary small mb-4 flex-grow-1"
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: "2",
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  lineHeight: "1.6"
                                }}
                              >
                                {course.description}
                              </p>

                              <div className="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-light">
                                <div className="d-flex flex-column">
                                  <span className="fw-bolder fs-5 text-dark">
                                    {Number(course.price) === 0 ? "Free" : `₹${course.price}`}
                                  </span>
                                  {Number(course.totalDuration || 0) > 0 && (
                                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                                      <i className="bi bi-clock me-1"></i>{formatDuration(course.totalDuration)}
                                    </span>
                                  )}
                                </div>

                                {isEnrolled ? (
                                  <button
                                    onClick={() => {
                                      track("course_open", { courseId: course._id, source: "courses_list_learn_btn" });
                                      navigate(`/courses/${course._id}`);
                                    }}
                                    className="btn btn-sm text-white rounded-pill px-4 py-2 shadow-sm fw-bold"
                                    style={{ background: "#7b2cbf", border: "none" }}
                                  >
                                    Learn Now
                                  </button>
                                ) : (
                                  <div className="d-flex gap-2">
                                    <button
                                      onClick={() => (isExpiredOrCancelled ? confirmReenroll(course) : handleEnroll(course))}
                                      disabled={enrollLoadingIds.includes(course._id)}
                                      className={`btn btn-sm rounded-pill px-4 py-2 fw-bold shadow-sm ${isExpiredOrCancelled ? "btn-warning text-dark" : "text-white"}`}
                                      style={isExpiredOrCancelled ? {} : { background: "#2b2b2b", border: "none" }}
                                    >
                                      {/* Button-level context loading effect */}
                                      {enrollLoadingIds.includes(course._id) ? (
                                        <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enrolling...</>
                                      ) : isExpiredOrCancelled ? "Renew" : "Enroll"}
                                    </button>

                                    {Number(course.price || 0) > 0 && (
                                      <button
                                        className="btn btn-sm rounded-pill px-3 py-2 fw-bold shadow-sm"
                                        style={{ background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba" }}
                                        onClick={() => {
                                          track("subscribe_cta_click", { courseId: course._id, source: "courses_list" });
                                          navigate(PLANS_ROUTE);
                                        }}
                                      >
                                        Subscribe
                                      </button>
                                    )}
                                  </div>
                                )}
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
                  <nav className="mt-5 pt-3">
                    <ul className="pagination justify-content-center gap-2">
                      {[...Array(totalPages)].map((_, i) => (
                        <li key={i} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
                          <button
                            className="page-link rounded-circle border-0 shadow-sm fw-bold d-flex align-items-center justify-content-center"
                            style={{
                              width: "40px",
                              height: "40px",
                              background: currentPage === i + 1 ? "#7b2cbf" : "#fff",
                              color: currentPage === i + 1 ? "#fff" : "#2b2b2b"
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