import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function RejectedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/courses/rejected")
      .then(res => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const styles = {
    container: { padding: "1.5rem", backgroundColor: "#f8f9fc", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" },
    heading: { color: "#6f42c1", fontWeight: 700, textAlign: "center", marginBottom: "1.5rem" },
    cardsContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" },
    card: { background: "#fff", borderRadius: "12px", boxShadow: "0 3px 10px rgba(0,0,0,0.08)", overflow: "hidden", cursor: "default", transition: "0.25s" },
    cardHover: { transform: "translateY(-3px)", boxShadow: "0 5px 15px rgba(0,0,0,0.12)" },
    thumb: { width: "100%", height: "120px", objectFit: "cover" },
    body: { padding: "10px" },
    title: { color: "#6f42c1", fontWeight: 600, fontSize: "1rem", marginBottom: "4px" },
    text: { fontSize: "0.85rem", color: "#333", marginBottom: "2px" },
    label: { fontWeight: 600, color: "#6f42c1", marginRight: "4px" },
    details: { marginBottom: "6px", fontSize: "0.85rem" },
    summary: { cursor: "pointer", color: "#6f42c1", fontWeight: 600, fontSize: "0.85rem" },
    ul: { marginTop: "4px", paddingLeft: "14px", maxHeight: "50px", overflowY: "auto" },
    footer: { backgroundColor: "#fafafa", borderTop: "1px solid #eee", padding: "6px 10px", fontSize: "11px", color: "#777", textAlign: "right" },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Rejected Courses</h2>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "70vh", color: "#6f42c1", }}>
            <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #6f42c1", borderRadius: "50%", width: "50px", height: "50px", animation: "spin 1s linear infinite", marginBottom: "20px", }} />
            <p>Loading...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
      ) : courses.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6f42c1" }}>🎉 No rejected courses!</p>
      ) : (
        <div style={styles.cardsContainer}>
          {courses.map(c => (
            <div key={c._id} style={styles.card} onMouseEnter={e => Object.assign(e.currentTarget.style, styles.cardHover)} onMouseLeave={e => Object.assign(e.currentTarget.style, styles.card)}>
              {c.thumbnail ? (
                <img src={c.thumbnail.startsWith("http") ? c.thumbnail : `${import.meta.env.VITE_BASE_URL?.replace(/\/$/, "")}/${c.thumbnail?.replace(/^\//, "")}`} alt={c.title} style={styles.thumb} />
              ) : (
                <div style={{ ...styles.thumb, backgroundColor: "#f2f2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "12px" }}>No Thumbnail</div>
              )}

              <div style={styles.body}>
                <div style={styles.title}>{c.title}</div>
                <div style={styles.text}><span style={styles.label}>Instructor:</span>{c.instructor?.name || "N/A"}</div>
                <div style={styles.text}><span style={styles.label}>Category:</span>{c.category?.name || "N/A"}</div>
                <div style={styles.text}><span style={styles.label}>Level:</span>{c.level || "—"}</div>
                <div style={styles.text}><span style={styles.label}>Price:</span> ₹{c.price ?? 0}</div>

                <details style={styles.details}><summary style={styles.summary}>Lessons ({c.lessons?.length || 0})</summary>
                  <ul style={styles.ul}>{c.lessons?.slice(0, 5).map(l => <li key={l._id}>{l.title} ({l.contentType})</li>)}</ul>
                </details>

                <details style={styles.details}><summary style={styles.summary}>Exams ({c.exams?.length || 0})</summary>
                  <ul style={styles.ul}>{c.exams?.slice(0, 5).map(e => <li key={e._id}>{e.title} ({e.duration} min)</li>)}</ul>
                </details>
              </div>

              <div style={styles.footer}>Rejected on: {new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-GB")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
