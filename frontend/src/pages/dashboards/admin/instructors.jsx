import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function Instructors() {
  const [instructors, setInstructors] = useState([]);

  useEffect(() => {
    api.get("/admin/instructors").then(res => setInstructors(res.data)).catch(console.error);
  }, []);

  return (
    <>
      <h2 style={{ color: "#6f42c1" }}>Instructors</h2>
      <div className="bg-white p-3 rounded mt-3">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Bio</th><th>Expertise</th></tr></thead>
          <tbody>
            {instructors.map(i => (
              <tr key={i._id}>
                <td>{i.user?.name || "—"}</td>
                <td>{i.user?.email || "—"}</td>
                <td style={{maxWidth:300}}>{i.bio}</td>
                <td>{(i.expertise || []).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
