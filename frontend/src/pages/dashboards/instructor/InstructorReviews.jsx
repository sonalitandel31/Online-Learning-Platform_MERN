import React, { useState, useEffect } from "react";
import api from "../../../api/api";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaStar, FaRegStar, FaBookOpen, FaUserCircle, FaRegCalendarAlt, FaFilter, FaQuoteLeft } from "react-icons/fa";

const InstructorReviews = () => {
  const [ratings, setRatings] = useState([]);
  const [filteredRatings, setFilteredRatings] = useState([]);
  const [courses, setCourses] = useState([]); 
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
  
  // Custom Theme Colors
  const THEME = {
    purple: "#7b2cbf",
    lightPurple: "#f8f5ff",
    yellow: "#ffb703",
    textDark: "#2b2d42",
    textMuted: "#8d99ae",
    border: "#edf2f4"
  };

  useEffect(() => {
    fetchInstructorRatings();
  }, []);

  const fetchInstructorRatings = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/courses/instructor/all-ratings");
      
      if (res.data && res.data.success) {
        const fetchedRatings = res.data.ratings;
        setRatings(fetchedRatings);
        setFilteredRatings(fetchedRatings);

        // Extract unique courses for the filter dropdown
        const uniqueCoursesMap = new Map();
        fetchedRatings.forEach((item) => {
          if (item.course && !uniqueCoursesMap.has(item.course._id)) {
            uniqueCoursesMap.set(item.course._id, {
              id: item.course._id,
              title: item.course.title
            });
          }
        });
        setCourses(Array.from(uniqueCoursesMap.values()));
      }
    } catch (err) {
      console.error("Error fetching ratings:", err);
      setError("Failed to load reviews. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);

    if (courseId === "ALL") {
      setFilteredRatings(ratings);
    } else {
      const filtered = ratings.filter(
        (rating) => rating.course && rating.course._id === courseId
      );
      setFilteredRatings(filtered);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FaStar key={i} color={THEME.yellow} className="me-1" size={16} />);
      } else {
        stars.push(<FaRegStar key={i} color="#e0e0e0" className="me-1" size={16} />);
      }
    }
    return stars;
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // --- SKELETON LOADER (LIST VIEW) ---
  const SkeletonListItem = () => (
    <div className="p-4 mb-3 bg-white" style={{ borderRadius: "12px", border: `1px solid ${THEME.border}` }}>
      <div className="d-flex justify-content-between mb-3">
        <div className="d-flex align-items-center">
          <div className="skeleton-bg rounded-circle me-3" style={{ width: "45px", height: "45px" }}></div>
          <div>
            <div className="skeleton-bg mb-2" style={{ height: "14px", width: "120px", borderRadius: "4px" }}></div>
            <div className="skeleton-bg" style={{ height: "12px", width: "80px", borderRadius: "4px" }}></div>
          </div>
        </div>
        <div className="skeleton-bg" style={{ height: "20px", width: "100px", borderRadius: "4px" }}></div>
      </div>
      <div className="skeleton-bg mb-2" style={{ height: "14px", width: "100%", borderRadius: "4px" }}></div>
      <div className="skeleton-bg" style={{ height: "14px", width: "70%", borderRadius: "4px" }}></div>
    </div>
  );

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#fcfcfc", minHeight: "100vh" }}>
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
          .skeleton-bg {
            background-color: #f0f0f0;
            background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
            background-size: 200px 100%;
            background-repeat: no-repeat;
            animation: shimmer 1.5s infinite linear;
          }
          .review-list-item {
            transition: all 0.2s ease-in-out;
            border: 1px solid ${THEME.border};
          }
          .review-list-item:hover {
            border-color: ${THEME.purple};
            box-shadow: 0 4px 15px rgba(123, 44, 191, 0.08);
            transform: translateX(5px);
          }
          .custom-select {
            cursor: pointer;
            border-color: ${THEME.border};
          }
          .custom-select:focus {
            border-color: ${THEME.purple};
            box-shadow: 0 0 0 0.2rem rgba(123, 44, 191, 0.15);
          }
        `}
      </style>

      {/* HEADER SECTION */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 p-4 bg-white shadow-sm" style={{ borderRadius: "16px" }}>
        <div className="mb-3 mb-md-0">
          <h3 className="fw-bold mb-1" style={{ color: THEME.textDark }}>Student Feedback</h3>
          <p className="mb-0" style={{ color: THEME.textMuted, fontSize: "0.95rem" }}>
            Monitor and analyze reviews across your courses
          </p>
        </div>
        
        <div className="d-flex align-items-center gap-3">
          <div className="px-4 py-2 text-center" style={{ backgroundColor: THEME.lightPurple, borderRadius: "12px", border: `1px solid rgba(123, 44, 191, 0.2)` }}>
            <span className="d-block fw-bolder fs-4" style={{ color: THEME.purple, lineHeight: "1" }}>
              {filteredRatings.length}
            </span>
            <span style={{ fontSize: "0.75rem", color: THEME.purple, fontWeight: "600", textTransform: "uppercase" }}>Reviews</span>
          </div>

          <div className="input-group" style={{ width: "250px" }}>
            <span className="input-group-text bg-white border-end-0" style={{ color: THEME.textMuted }}>
              <FaFilter />
            </span>
            <select 
              className="form-select border-start-0 custom-select fw-medium text-dark shadow-none" 
              value={selectedCourse}
              onChange={handleFilterChange}
              disabled={isLoading || courses.length === 0}
            >
              <option value="ALL">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title.length > 25 ? course.title.substring(0, 25) + '...' : course.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm rounded-3">
          {error}
        </div>
      )}

      {/* REVIEWS LIST SECTION */}
      <div className="bg-white p-4 shadow-sm" style={{ borderRadius: "16px" }}>
        {isLoading ? (
          <>
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </>
        ) : filteredRatings.length === 0 ? (
          <div className="text-center py-5">
            <div className="d-inline-flex justify-content-center align-items-center mb-3" style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: THEME.lightPurple, color: THEME.purple }}>
              <FaQuoteLeft size={30} />
            </div>
            <h5 className="fw-bold" style={{ color: THEME.textDark }}>No Reviews Found</h5>
            <p style={{ color: THEME.textMuted }}>
              {selectedCourse === "ALL" 
                ? "Students haven't reviewed your courses yet." 
                : "No reviews for this specific course yet."}
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredRatings.map((item) => (
              <div key={item._id} className="review-list-item bg-white p-4 rounded-3">
                
                {/* Top Row: User Info & Course Badge */}
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex align-items-center gap-3">
                    {/* User Avatar */}
                    <div className="d-flex justify-content-center align-items-center rounded-circle fw-bold shadow-sm" 
                         style={{ width: "45px", height: "45px", backgroundColor: THEME.lightPurple, color: THEME.purple, border: `2px solid white` }}>
                      {item.student?.name ? item.student.name.charAt(0).toUpperCase() : <FaUserCircle size={20}/>}
                    </div>
                    
                    {/* User Details */}
                    <div>
                      <h6 className="mb-0 fw-bold" style={{ color: THEME.textDark }}>
                        {item.student?.name || "Anonymous Learner"}
                      </h6>
                      <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: "0.85rem", color: THEME.textMuted }}>
                        <span className="d-flex align-items-center gap-1">
                          <FaRegCalendarAlt /> {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Course Name Badge */}
                  <div className="d-none d-md-flex align-items-center px-3 py-1 rounded-pill" style={{ backgroundColor: "#f8f9fa", border: `1px solid ${THEME.border}`, fontSize: "0.8rem", color: THEME.textMuted }}>
                    <FaBookOpen className="me-2" style={{ color: THEME.purple }} />
                    <span className="text-truncate" style={{ maxWidth: "150px" }}>
                      {item.course?.title || "Unknown Course"}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Rating Stars */}
                <div className="d-flex align-items-center mb-2 gap-2">
                  <div className="d-flex">{renderStars(item.rating)}</div>
                  <span className="fw-bold" style={{ color: THEME.textDark, fontSize: "0.95rem" }}>
                    {item.rating}.0
                  </span>
                </div>

                {/* Bottom Row: The Actual Review Text */}
                <div className="position-relative mt-2 p-3 rounded-3" style={{ backgroundColor: THEME.lightPurple }}>
                  <FaQuoteLeft className="position-absolute" style={{ top: "10px", left: "10px", color: THEME.purple, opacity: "0.1", fontSize: "24px" }} />
                  <p className="mb-0 position-relative z-1" style={{ color: THEME.textDark, fontSize: "0.95rem", lineHeight: "1.6", paddingLeft: "20px" }}>
                    {item.review ? (
                      item.review
                    ) : (
                      <span className="fst-italic opacity-50">Student left a rating without a written review.</span>
                    )}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorReviews;