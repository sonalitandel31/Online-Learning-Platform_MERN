import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function AllCourses() {
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    api
      .get("/admin/courses")
      .then((res) => {
        setCourses(res.data);
        setFiltered(res.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    let filteredList = courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor?.name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || c.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        c.category?.name === categoryFilter ||
        c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    setFiltered(filteredList);
  }, [search, statusFilter, categoryFilter, courses]);

  const categories = [
    ...new Set(courses.map((c) => c.category?.name).filter(Boolean)),
  ];

  // Helper for Status Badge Color
  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "#28a745";
      case "pendingApproval": return "#ffc107";
      case "rejected": return "#dc3545";
      default: return "#6c757d";
    }
  };

  return (
    <div className="admin-container">
      {/* Global Styles for Responsiveness */}
      <style>{`
        .admin-container {
          padding: 20px;
          background-color: #f8f9fc;
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .header-title {
          color: #6f42c1;
          text-align: center;
          margin-bottom: 30px;
          font-weight: 800;
          font-size: 2rem;
        }
        .filter-section {
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }
        .input-style {
          padding: 10px 15px;
          border-radius: 8px;
          border: 1px solid #ddd;
          outline: none;
          min-width: 200px;
          flex: 1;
          max-width: 300px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          padding: 10px;
        }
        .course-card {
          background-color: #fff;
          border-radius: 15px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .course-card:hover {
          transform: translateY(-8px);
        }
        .card-img {
          width: 100%;
          height: 160px;
          object-fit: cover;
        }
        .no-thumb {
          height: 160px;
          background: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #adb5bd;
        }
        .card-body {
          padding: 15px;
          flex-grow: 1;
        }
        .badge {
          padding: 4px 8px;
          border-radius: 5px;
          color: white;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: bold;
        }
        .footer-date {
          background-color: #fcfcfc;
          padding: 10px 15px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #888;
          text-align: right;
        }
        
        /* Mobile Adjustments */
        @media (max-width: 600px) {
          .header-title { font-size: 1.5rem; }
          .input-style { max-width: 100%; min-width: 100%; }
          .admin-container { padding: 10px; }
        }
      `}</style>

      <h2 className="header-title">Course Management Dashboard</h2>

      <div className="filter-section">
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-style"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-style"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pendingApproval">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-style"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid-container">
        {filtered.map((course) => (
          <div key={course._id} className="course-card">
            {course.thumbnail ? (
              <img
                src={course.thumbnail.startsWith("http") ? course.thumbnail : `${import.meta.env.VITE_BASE_URL}${course.thumbnail}`}
                alt={course.title}
                className="card-img"
              />
            ) : (
              <div className="no-thumb">No Thumbnail Available</div>
            )}

            <div className="card-body">
              <h5 style={{ color: "#333", margin: "0 0 10px 0", fontSize: "1.1rem" }}>{course.title}</h5>
              
              <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.8" }}>
                <div><strong>Instructor:</strong> {course.instructor?.name || "N/A"}</div>
                <div><strong>Category:</strong> {course.category?.name || "N/A"}</div>
                <div><strong>Level:</strong> {course.level}</div>
                <div style={{ marginTop: '8px' }}>
                   <span className="badge" style={{ backgroundColor: getStatusColor(course.status) }}>
                    {course.status}
                  </span>
                  <span style={{ float: 'right', fontWeight: 'bold', color: '#6f42c1', fontSize: '15px' }}>
                    ₹{course.price}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "15px" }}>
                <details style={{ marginBottom: "8px", fontSize: "13px" }}>
                  <summary style={{ cursor: "pointer", color: "#6f42c1", fontWeight: "600" }}>
                    Lessons ({course.lessons?.length || 0})
                  </summary>
                  <ul style={{ paddingLeft: "20px", marginTop: "5px", color: "#555" }}>
                    {course.lessons?.map((l) => (
                      <li key={l._id}>{l.title}</li>
                    ))}
                  </ul>
                </details>

                <details style={{ fontSize: "13px" }}>
                  <summary style={{ cursor: "pointer", color: "#6f42c1", fontWeight: "600" }}>
                    Exams ({course.exams?.length || 0})
                  </summary>
                  <ul style={{ paddingLeft: "20px", marginTop: "5px", color: "#555" }}>
                    {course.exams?.map((e) => (
                      <li key={e._id}>{e.title}</li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>

            <div className="footer-date">
              Published: {new Date(course.createdAt).toLocaleDateString("en-GB")}
            </div>
          </div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#999' }}>
          <h4>No courses found matching your criteria.</h4>
        </div>
      )}
    </div>
  );
}