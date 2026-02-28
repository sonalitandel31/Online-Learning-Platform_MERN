import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function RejectedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/courses/rejected")
      .then((res) => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const styles = {
    container: {
      padding: "1.5rem",
      backgroundColor: "#f8f9fc",
      minHeight: "100vh",
      fontFamily: "'Segoe UI', sans-serif",
    },
    heading: {
      color: "#6f42c1",
      fontWeight: 700,
      textAlign: "center",
      marginBottom: "1.5rem",
    },
    cardsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "1.5rem",
    },
    card: {
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      overflow: "hidden",
      cursor: "default",
      transition: "all 0.25s ease",
      display: "flex",
      flexDirection: "column",
    },
    cardHover: {
      transform: "translateY(-4px)",
      boxShadow: "0 8px 20px rgba(220, 53, 69, 0.15)", // Soft red shadow for rejected theme
    },
    thumb: { width: "100%", height: "140px", objectFit: "cover" },
    body: { padding: "16px", flexGrow: 1 },
    title: {
      color: "#2d3748",
      fontWeight: 700,
      fontSize: "1.1rem",
      marginBottom: "8px",
      lineHeight: "1.3",
    },
    text: { fontSize: "0.85rem", color: "#4a5568", marginBottom: "4px" },
    label: { fontWeight: 600, color: "#6f42c1", marginRight: "6px" },
    
    // Improved expandables matching the Pending page
    details: {
      marginBottom: "8px",
      fontSize: "0.85rem",
      backgroundColor: "#f8f9fa",
      padding: "8px",
      borderRadius: "6px",
    },
    summary: { cursor: "pointer", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" },
    ul: {
      marginTop: "6px",
      paddingLeft: "20px",
      maxHeight: "60px",
      overflowY: "auto",
      color: "#718096",
      marginBottom: 0,
    },
    
    // Improved Rejection Box Styles
    rejectBox: {
      margin: "12px 0",
      background: "#fff5f5",
      border: "1px solid #fed7d7",
      borderRadius: "8px",
      padding: "12px",
    },
    rejectHeader: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "8px",
    },
    rejectTitle: {
      fontSize: "0.9rem",
      fontWeight: 700,
      color: "#c53030",
    },
    rejectLine: {
      fontSize: "0.85rem",
      color: "#9b2c2c",
      marginBottom: "6px",
      lineHeight: 1.4,
    },
    rejectMuted: {
      fontSize: "0.85rem",
      color: "#9b2c2c",
      opacity: 0.9,
      lineHeight: 1.4,
      backgroundColor: "rgba(254, 215, 215, 0.3)", // slight highlight for the note
      padding: "6px",
      borderRadius: "4px",
    },
    
    footer: {
      backgroundColor: "#f8f9fa",
      borderTop: "1px solid #edf2f7",
      padding: "10px 16px",
      fontSize: "12px",
      color: "#a0aec0",
      textAlign: "right",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Rejected Courses</h2>

      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "70vh",
            color: "#6f42c1",
          }}
        >
          <div
            style={{
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #6f42c1",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              animation: "spin 1s linear infinite",
              marginBottom: "20px",
            }}
          />
          <p>Loading...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : courses.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6f42c1", fontSize: "1.1rem", marginTop: "2rem" }}>
          ✅ No rejected courses!
        </p>
      ) : (
        <div style={styles.cardsContainer}>
          {courses.map((c) => {
            const rejectionReason = c?.review?.rejectionReason || "";
            const reviewNote = c?.review?.reviewNote || "";

            const hasRejectInfo =
              String(rejectionReason || "").trim() ||
              String(reviewNote || "").trim();

            return (
              <div
                key={c._id}
                style={styles.card}
                onMouseEnter={(e) =>
                  Object.assign(e.currentTarget.style, styles.cardHover)
                }
                onMouseLeave={(e) =>
                  Object.assign(e.currentTarget.style, styles.card)
                }
              >
                {c.thumbnail ? (
                  <img
                    src={
                      c.thumbnail.startsWith("http")
                        ? c.thumbnail
                        : `${import.meta.env.VITE_BASE_URL?.replace(/\/$/, "")}/${c.thumbnail?.replace(/^\//, "")}`
                    }
                    alt={c.title}
                    style={styles.thumb}
                  />
                ) : (
                  <div
                    style={{
                      ...styles.thumb,
                      backgroundColor: "#edf2f7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#a0aec0",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    No Thumbnail Provided
                  </div>
                )}

                <div style={styles.body}>
                  <div style={styles.title}>{c.title}</div>
                  <div style={styles.text}>
                    <span style={styles.label}>Instructor:</span>
                    {c.instructor?.name || "N/A"}
                  </div>
                  <div style={styles.text}>
                    <span style={styles.label}>Category:</span>
                    {c.category?.name || "N/A"}
                  </div>
                  <div style={styles.text}>
                    <span style={styles.label}>Level:</span>
                    {c.level || "—"}
                  </div>
                  <div style={styles.text}>
                    <span style={styles.label}>Price:</span> ₹{c.price ?? 0}
                  </div>

                  {/* Redesigned Rejection info */}
                  {hasRejectInfo ? (
                    <div style={styles.rejectBox}>
                      <div style={styles.rejectHeader}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c53030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span style={styles.rejectTitle}>Rejection Details</span>
                      </div>
                      
                      {rejectionReason ? (
                        <div style={styles.rejectLine}>
                          <span style={{ fontWeight: 700 }}>Reason:</span>{" "}
                          {rejectionReason}
                        </div>
                      ) : null}
                      {reviewNote ? (
                        <div style={styles.rejectMuted}>
                          <span style={{ fontWeight: 700 }}>Admin Note:</span>{" "}
                          {reviewNote}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ ...styles.rejectBox, borderColor: "#e2e8f0", background: "#f8fafc" }}>
                      <div style={styles.rejectHeader}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span style={{ ...styles.rejectTitle, color: "#475569" }}>
                          Status: Rejected
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                        No specific reason or note was provided during rejection.
                      </div>
                    </div>
                  )}

                  <details style={styles.details}>
                    <summary style={styles.summary}>
                      Lessons ({c.lessons?.length || 0})
                    </summary>
                    <ul style={styles.ul}>
                      {c.lessons?.slice(0, 5).map((l, index) => (
                        <li key={l._id || `lesson-${index}`}>
                          {l.title} ({l.contentType})
                        </li>
                      ))}
                    </ul>
                  </details>

                  <details style={styles.details}>
                    <summary style={styles.summary}>
                      Exams ({c.exams?.length || 0})
                    </summary>
                    <ul style={styles.ul}>
                      {c.exams?.slice(0, 5).map((e, index) => (
                        <li key={e._id || `exam-${index}`}>
                          {e.title} ({e.duration} min)
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>

                <div style={styles.footer}>
                  Rejected on:{" "}
                  {new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-GB")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}