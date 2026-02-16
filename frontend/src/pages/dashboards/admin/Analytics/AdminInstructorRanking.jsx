import { useEffect, useState } from "react";
import { FaTrophy, FaChartLine } from "react-icons/fa";
import api from "../../../../api/api";

export default function AdminInstructorRanking() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await api.get("/analytics/admin/instructor-scores", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setRows(Array.isArray(res.data?.results) ? res.data.results : []);
      } catch (e) {
        setErr("Failed to load instructor rankings.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  if (loading) return <div className="container mt-5">Loading...</div>;
  if (err) return <div className="container mt-5 alert alert-danger">{err}</div>;

  return (
    <div className="container mt-4" style={{ marginTop: 90 }}>
      <h3 className="fw-bold d-flex align-items-center gap-2">
        <FaTrophy /> Instructor Ranking
      </h3>

      <div className="card p-3 shadow-sm border-0 mt-3">
        {rows.length === 0 ? (
          <div className="text-muted">No instructor data found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Instructor</th>
                  <th>Score</th>
                  <th>Courses</th>
                  <th>Avg Engagement</th>
                  <th>High Risk %</th>
                  <th>Avg Drop %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
                  <tr key={r.instructorId}>
                    <td className="fw-bold">{index + 1}</td>

                    <td>
                      <div className="fw-bold">{r.name}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {r.email}
                      </div>
                    </td>

                    <td className="fw-bold">
                      <span
                        className={`badge ${
                          r.score >= 80
                            ? "bg-success"
                            : r.score >= 60
                            ? "bg-warning text-dark"
                            : "bg-danger"
                        }`}
                      >
                        {r.score}
                      </span>
                    </td>

                    <td>{r.courseCount}</td>
                    <td>{r.avgEngagement}</td>
                    <td>{r.highRiskRate}%</td>
                    <td>{r.avgDropRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 text-muted" style={{ fontSize: 13 }}>
        <FaChartLine className="me-2" />
        Score formula: 50% Engagement + 30% Risk + 20% Drop-Off.
      </div>
    </div>
  );
}
