import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function Students() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    api.get("/admin/students").then(res => setStudents(res.data)).catch(console.error);
  }, []);

  return (
    <>
      <h2 style={{ color: "#6f42c1" }}>Students</h2>
      <div className="bg-white p-3 rounded mt-3">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Education</th><th>Enrolled</th></tr></thead>
          <tbody>
            {students.map(s => (
              <tr key={s._id}>
                <td>{s.user?.name || "—"}</td>
                <td>{s.user?.email || "—"}</td>
                <td>{s.education || "—"}</td>
                <td>{(s.enrolledCourses || []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
