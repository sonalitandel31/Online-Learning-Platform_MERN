import { useState, useEffect } from "react";
import api from "../../../api/api";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Courses() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Custom UI States (Replacing toast and alert)
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null, data: null });

  const coursesPerPage = 9;
  const location = useLocation();
  const navigate = useNavigate();

  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;

  const [enrollLoadingIds, setEnrollLoadingIds] = useState([]);
  const [enrolledCoursesIds, setEnrolledCoursesIds] = useState({});
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  // Helper to show custom notification
  const notify = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 4000);
  };

  useEffect(() => {
    if (!loggedInUser) {
      navigate("/login", { replace: true });
    }
  }, [loggedInUser, navigate]);

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

  const fetchCourses = async (filters = {}) => {
    try {
      setLoading(true);
      setError("");
      const params = { limit: 100, ...filters };
      const res = await api.get("/courses", { params });
      const data = Array.isArray(res.data) ? res.data : res.data.courses || [];
      setCourses(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      if (!studentId) return;
      setEnrollmentsLoading(true);
      const token = localStorage.getItem("token");
      const res = await api.get("/enrollments", {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  useEffect(() => {
    fetchCategories();
    fetchEnrollments();
  }, []);

  useEffect(() => {
    if (!Array.isArray(categories) || categories.length === 0) return;
    const queryParams = new URLSearchParams(location.search);
    const categoryNames = queryParams.get("category");
    setSelectedCategories(categoryNames ? categoryNames.split(",") : []);
  }, [categories, location.search]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const searchQuery = queryParams.get("search") || "";

    const filters = {};
    if (searchQuery.trim() !== "") filters.search = searchQuery;
    if (selectedCategories.length > 0)
      filters.categories = selectedCategories.join(",");

    fetchCourses(filters);
  }, [selectedCategories, location.search]);

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

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleEnroll = async (course) => {
    try {
      setEnrollLoadingIds((prev) => [...prev, course._id]);
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        notify("Please log in to enroll", "danger");
        return;
      }

      if (!course.price || course.price === 0) {
        const { data } = await api.post(
          "/enrollments",
          { courseId: course._id, amount: 0 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.success) {
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

      const { data } = await api.post(
        "/payment/create-order",
        { courseId: course._id, studentId: user._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data.success) return notify(data.message, "danger");

      const { key, orderId, amount, currency } = data;
      const options = {
        key,
        amount: amount * 100,
        currency,
        name: "LearnX Platform",
        description: course.title,
        order_id: orderId,
        handler: async function (response) {
          const verify = await api.post(
            "/payment/verify-payment",
            {
              ...response,
              studentId: user._id,
              courseId: course._id,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (verify.data.success) {
            notify("Enrollment successful!");
            fetchEnrollments();
          } else notify("Payment verification failed!", "danger");
        },
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: "#9f64f7" },
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

  const confirmUnenroll = (courseId) => {
    setConfirmModal({
      show: true,
      title: "Unenroll Course",
      message: "Are you sure you want to unenroll? This will remove your access to the content.",
      onConfirm: executeUnenroll,
      data: courseId
    });
  };

  const executeUnenroll = async (courseId) => {
    try {
      const token = localStorage.getItem("token");
      await api.put(`/enrollments/unenroll/${courseId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      notify("Unenrolled successfully");
      fetchEnrollments();
    } catch (err) {
      notify("Failed to unenroll", "danger");
    } finally {
      setConfirmModal({ ...confirmModal, show: false });
    }
  };

  const confirmReenroll = (course) => {
    setConfirmModal({
      show: true,
      title: "Re-enroll Course",
      message: `Do you want to re-enroll in ${course.title}?`,
      onConfirm: executeReenroll,
      data: course
    });
  };

  const executeReenroll = async (course) => {
    setConfirmModal({ ...confirmModal, show: false });
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!course.price || course.price === 0) {
        const { data } = await api.post("/enrollments", { courseId: course._id, amount: 0 }, { headers: { Authorization: `Bearer ${token}` } });
        if (data.success) {
          notify("Re-enrolled successfully!");
          fetchEnrollments();
        } else notify(data.message, "danger");
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) return notify("Razorpay SDK failed to load.", "danger");

      const { data } = await api.post("/payment/create-order", { courseId: course._id, studentId: user._id }, { headers: { Authorization: `Bearer ${token}` } });
      if (!data.success) return notify(data.message, "danger");

      const { key, orderId, amount, currency } = data;
      const options = {
        key, amount: amount * 100, currency, name: "LearnX Platform",
        description: `Re-enrollment for ${course.title}`,
        order_id: orderId,
        handler: async function (response) {
          const verify = await api.post("/payment/verify-payment", { ...response, studentId: user._id, courseId: course._id }, { headers: { Authorization: `Bearer ${token}` } });
          if (verify.data.success) {
            notify("Re-enrollment successful!");
            fetchEnrollments();
          } else notify("Payment verification failed!", "danger");
        },
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: "#9f64f7" },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      notify("Re-enrollment failed", "danger");
    }
  };

  if (enrollmentsLoading)
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading enrollments...</span>
        </div>
      </div>
    );

  const approvedCourses = courses.filter((c) => c.status === "approved");
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = approvedCourses.slice(indexOfFirstCourse, indexOfLastCourse);
  const totalPages = Math.ceil(approvedCourses.length / coursesPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: "40px 20px", background: "#f0f2f5", minHeight: "100vh", marginTop: "60px", position: "relative" }}>

      {/* --- CUSTOM NOTIFICATION UI --- */}
      {notification.show && (
        <div
          className={`alert alert-${notification.type} shadow`}
          style={{ position: "fixed", top: "80px", right: "20px", zIndex: 9999, minWidth: "280px", borderRadius: "12px", border: "none" }}
        >
          <div className="d-flex align-items-center">
            <span className="me-2">{notification.type === 'success' ? '✅' : '❌'}</span>
            <span className="fw-bold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {confirmModal.show && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div className="bg-white p-4 rounded-4 shadow-lg" style={{ maxWidth: "400px", width: "100%" }}>
            <h5 className="fw-bold mb-3">{confirmModal.title}</h5>
            <p className="text-muted mb-4">{confirmModal.message}</p>
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-light rounded-pill px-4" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Cancel</button>
              <button className="btn btn-primary rounded-pill px-4" style={{ background: "#9f64f7", border: "none" }} onClick={() => confirmModal.onConfirm(confirmModal.data)}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", zIndex: 1040, backdropFilter: "blur(4px)" }} />
      )}

      <div className="container">
        <div className="d-lg-none mb-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="btn btn-white w-100 d-flex justify-content-between align-items-center shadow-sm py-3 px-4"
            style={{ borderRadius: "12px", border: "1px solid #e1e1e1", background: "#fff" }}
          >
            <span className="fw-bold">Filters</span>
            <span className="badge bg-primary rounded-pill" style={{ background: "#9f64f7" }}>{selectedCategories.length}</span>
          </button>
        </div>

        <div className="row g-4">
          <aside className={`col-lg-3 ${isSidebarOpen ? 'd-block' : 'd-none d-lg-block'}`}
            style={isSidebarOpen ? { position: "fixed", top: 0, left: 0, height: "100vh", width: "280px", zIndex: 1050, background: "#fff", padding: "30px", boxShadow: "10px 0 30px rgba(0,0,0,0.1)", overflowY: "auto" } : {}}>
            <div style={{ position: isSidebarOpen ? "static" : "sticky", top: "100px" }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold m-0">Filter Categories</h5>
                {isSidebarOpen && <button className="btn-close" onClick={() => setIsSidebarOpen(false)}></button>}
              </div>
              <div className="d-flex flex-column gap-2">
                {categories.map((cat) => (
                  <label key={cat._id} className="d-flex align-items-center gap-2 p-1" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedCategories.includes(cat.name)}
                      onChange={() => {
                        handleCategoryChange(cat.name);
                        if (window.innerWidth < 992) setIsSidebarOpen(false);
                      }}
                    />
                    <span className="text-muted small fw-medium">{cat.name}</span>
                  </label>
                ))}
                <hr />
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    const params = new URLSearchParams(location.search);
                    params.delete("category");
                    navigate(`?${params.toString()}`, { replace: true });
                    setIsSidebarOpen(false);
                  }}
                  className="btn btn-link text-decoration-none p-0 text-start fw-bold"
                  style={{ color: "#9f64f7", fontSize: "0.9rem" }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </aside>

          <main className="col-lg-9">
            {loading ? (
              <div className="text-center py-5"><div className="spinner-grow text-primary"></div></div>
            ) : error ? (
              <div className="alert alert-danger">{error}</div>
            ) : (
              <>
                <h4 className="fw-bold mb-4">{approvedCourses.length} Courses Available</h4>
                {approvedCourses.length === 0 ? (
                  <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                    <p className="text-muted">No results found.</p>
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
                          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: "16px", transition: "transform 0.3s" }}>
                            <div className="position-relative">
                              <img
                                src={course.thumbnail ? (course.thumbnail.startsWith("http") ? course.thumbnail : `${BASE_URL}${course.thumbnail}`) : "https://via.placeholder.com/400x225"}
                                className="card-img-top"
                                style={{ height: "180px", objectFit: "cover", borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}
                                alt={course.title}
                              />
                              {isEnrolled && (
                                <span className="position-absolute top-0 end-0 m-3 badge rounded-pill p-2" style={{ background: isCompleted ? "#00cec9" : "#6c5ce7", fontSize: "0.65rem" }}>
                                  {isCompleted ? "COMPLETED" : "ACTIVE"}
                                </span>
                              )}
                            </div>
                            <div className="card-body d-flex flex-column">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-primary fw-bold small text-uppercase" style={{ color: "#9f64f7" }}>
                                  {course.level}
                                </span>
                                <span className="text-muted small">
                                  <i className="bi bi-people-fill me-1"></i>
                                  {/* <span className="me-1">👥</span> */}
                                  {course.totalEnrolled || 0}
                                </span>
                              </div>
                              <h6 className="fw-bold mb-1">
                                <Link to={`/courses/${course._id}`} className="text-dark text-decoration-none">{course.title}</Link>
                              </h6>
                              <p className="text-muted small mb-1">
                                <i className="bi bi-person-circle me-1"></i>
                                {/* <span className="me-1">👤</span> */}
                                {course.instructor?.name || "Expert Instructor"}
                              </p>
                              <p className="text-muted small mb-3 flex-grow-1" style={{ display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {course.description}
                              </p>
                              <div className="d-flex justify-content-between align-items-center mt-auto">
                                <span className="fw-bold h5 mb-0">
                                  {Number(course.price) === 0 ? "Free" : `₹${course.price}`}
                                </span>

                                {isEnrolled ? (
                                  <button onClick={() => navigate(`/courses/${course._id}`)} className="btn btn-sm btn-primary rounded-pill px-3" style={{ background: "#9f64f7", border: "none" }}>Learn</button>
                                ) : (
                                  <button
                                    onClick={() => isExpiredOrCancelled ? confirmReenroll(course) : handleEnroll(course)}
                                    disabled={enrollLoadingIds.includes(course._id)}
                                    className={`btn btn-sm rounded-pill px-3 fw-bold ${isExpiredOrCancelled ? 'btn-outline-warning' : 'btn-dark'}`}
                                  >
                                    {enrollLoadingIds.includes(course._id) ? '...' : (isExpiredOrCancelled ? 'Renew' : 'Enroll')}
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

                {totalPages > 1 && (
                  <nav className="mt-5">
                    <ul className="pagination justify-content-center gap-2">
                      {[...Array(totalPages)].map((_, i) => (
                        <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                          <button
                            className="page-link rounded-circle border-0 shadow-sm"
                            style={currentPage === i + 1 ? { background: "#9f64f7", color: "#fff" } : {}}
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