import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/api";

function MyLearnings() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;
  const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

  // Handle Responsiveness
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!studentId) {
      setError("User not logged in.");
      setLoading(false);
      return;
    }

    const fetchEnrollments = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/enrollments`);
        let enrollmentsArray = Array.isArray(res.data)
          ? res.data
          : res.data.enrollments || res.data.data || [];

        const formattedCourses = enrollmentsArray.map((enrollment) => ({
          ...enrollment.course,
          progress: enrollment.progress || 0,
          certificate: enrollment.certificate || null,
        }));

        setCourses(formattedCourses);
      } catch (err) {
        setError("Failed to load your courses.");
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [studentId]);

  const handleDownloadCertificate = async (certificateUrl) => {
    if (!certificateUrl) return alert("No certificate available yet.");
    const link = document.createElement("a");
    link.href = `${BASE_URL}${certificateUrl}`;
    link.setAttribute("download", "certificate.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Inline Style Objects (No Blue)
  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "80px auto",
      padding: "0 20px",
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: "#1a1a1a",
    },
    title: {
      fontSize: "2rem",
      fontWeight: "800",
      marginBottom: "30px",
      borderLeft: "6px solid #059669", // Emerald Green
      paddingLeft: "15px",
      color: "#111827",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: width > 992 ? "1fr 1fr 1fr" : width > 600 ? "1fr 1fr" : "1fr",
      gap: "25px",
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      transition: "transform 0.2s ease",
    },
    thumbnail: (url) => ({
      height: "180px",
      width: "100%",
      backgroundImage: `url(${url})`,
      backgroundPosition: "center center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",     
      overflow: "hidden",
      borderBottom: "1px solid #f3f4f6",
    }),
    details: {
      padding: "20px",
      flexGrow: 1,
      display: "flex",
      flexDirection: "column",
    },
    courseTitle: {
      fontSize: "1.2rem",
      margin: "0 0 10px 0",
      color: "#1f2937",
      fontWeight: "700",
    },
    description: {
      fontSize: "0.9rem",
      color: "#6b7280",
      lineHeight: "1.5",
      marginBottom: "20px",
    },
    progressWrapper: {
      marginBottom: "20px",
      marginTop: "auto",
    },
    progressBg: {
      height: "8px",
      backgroundColor: "#f3f4f6",
      borderRadius: "10px",
      overflow: "hidden",
      marginBottom: "8px",
    },
    progressFill: (percent) => ({
      width: `${percent}%`,
      height: "100%",
      transition: "width 0.5s ease-out",
      backgroundColor: percent < 40 ? "#ef4444" : percent < 75 ? "#f59e0b" : "#10b981",
    }),
    progressText: {
      fontSize: "0.8rem",
      fontWeight: "600",
      color: "#4b5563",
    },
    btnContainer: {
      display: "flex",
      flexDirection: width < 400 ? "column" : "row",
      gap: "10px",
    },
    primaryBtn: {
      flex: 1,
      padding: "8px",
      backgroundColor: "#232833", // Deep Obsidian
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontWeight: "600",
      cursor: "pointer",
      textAlign: "center",
    },
    certBtn: {
      flex: 1,
      padding: "8px",
      backgroundColor: "transparent",
      color: "#059669",
      border: "2px solid #059669",
      borderRadius: "8px",
      fontWeight: "600",
      cursor: "pointer",
    },
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-warning"></div>
      <h5 className="text-secondary fw-light">Loading your learnings...</h5>
    </div>
  );

  if (error) return <p style={{ textAlign: "center", color: "#ef4444", marginTop: "100px" }}>{error}</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>My Learnings</h2>
      <div style={styles.grid}>
        {courses.map((course, idx) => {
          const progressPercent = course.progress ?? 0;
          const thumb = course.thumbnail
            ? (course.thumbnail.startsWith("http") ? course.thumbnail : `${BASE_URL}${course.thumbnail}`)
            : "/placeholder.png";

          return (
            <div key={course._id || idx} style={styles.card}>
              <div style={styles.thumbnail(thumb)} />

              <div style={styles.details}>
                <h3 style={styles.courseTitle}>{course.title || "Untitled Course"}</h3>
                <p style={styles.description}>
                  {course.description?.substring(0, 100) || "No description available."}...
                </p>

                <div style={styles.progressWrapper}>
                  <div style={styles.progressBg}>
                    <div style={styles.progressFill(progressPercent)} />
                  </div>
                  <span style={styles.progressText}>{progressPercent}% Completed</span>
                </div>

                <div style={styles.btnContainer}>
                  <button
                    onClick={() => navigate(`/courses/${course._id}`)}
                    style={styles.primaryBtn}
                  >
                    Continue
                  </button>

                  {progressPercent === 100 && course.certificate && (
                    <button
                      onClick={() => handleDownloadCertificate(course.certificate)}
                      style={styles.certBtn}
                    >
                      Certificate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyLearnings;