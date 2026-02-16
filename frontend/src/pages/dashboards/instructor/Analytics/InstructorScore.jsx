import { useEffect, useState } from "react";
import api from "../../../../api/api";

export default function InstructorScore() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await api.get("/analytics/instructor/score/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data?.data || null);
      } catch (e) {
        setErr("Failed to load instructor score.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  if (loading) return <div className="container mt-5">Loading...</div>;
  if (err) return <div className="container mt-5 alert alert-danger">{err}</div>;
  if (!data) return <div className="container mt-5">No data.</div>;

  return (
    <div className="container mt-4" style={{ marginTop: 90 }}>
      <h3 className="fw-bold">Instructor Performance Score</h3>

      <div className="row g-3 mt-2">
        <div className="col-md-3">
          <div className="card p-3 shadow-sm border-0">
            <div className="text-muted small">Score</div>
            <div className="h2 fw-bold">{data.score}/100</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 shadow-sm border-0">
            <div className="text-muted small">Courses</div>
            <div className="h2 fw-bold">{data.courseCount}</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 shadow-sm border-0">
            <div className="text-muted small">Avg Engagement</div>
            <div className="h2 fw-bold">{data.avgEngagement}</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 shadow-sm border-0">
            <div className="text-muted small">High Risk Rate</div>
            <div className="h2 fw-bold">{data.highRiskRate}%</div>
          </div>
        </div>
      </div>

      <div className="card p-3 shadow-sm border-0 mt-3">
        <div className="text-muted small">Avg Lesson Drop-off</div>
        <div className="h4 fw-bold">{data.avgDropRate}%</div>
        <div className="text-muted" style={{ fontSize: 13 }}>
          Lower is better. This shows how many students open lessons but don’t complete.
        </div>
      </div>
    </div>
  );
}
