import { useEffect, useState } from "react";
import api from "../../../api/api";

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState(null);
  const [dau, setDau] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [oRes, dRes] = await Promise.all([
          api.get("/analytics/overview"),
          api.get("/analytics/dau?days=14"),
        ]);

        setOverview(oRes.data);
        setDau(dRes.data?.dau || []);
      } catch (e) {
        console.error("analytics dashboard error:", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <div className="container mt-5">Loading analytics...</div>;
  if (!overview?.success) return <div className="container mt-5">No analytics data.</div>;

  return (
    <div className="container mt-4" style={{ marginTop: "90px" }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold">Analytics Dashboard</h3>
        <span className="badge bg-dark">
          Range: {new Date(overview.range.from).toLocaleDateString()} - {new Date(overview.range.to).toLocaleDateString()}
        </span>
      </div>

      {/* cards */}
      <div className="row g-3">
        <div className="col-md-6 col-lg-3">
          <div className="card p-3 shadow-sm border-0">
            <div className="text-muted small">Total Events</div>
            <div className="h3 fw-bold">{overview.totalEvents}</div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card p-3 shadow-sm border-0">
            <div className="text-muted small">Unique Users</div>
            <div className="h3 fw-bold">{overview.uniqueUsers}</div>
          </div>
        </div>
      </div>

      {/* Top Events */}
      <div className="row g-3 mt-1">
        <div className="col-lg-6">
          <div className="card p-3 shadow-sm border-0">
            <h6 className="fw-bold mb-3">Top Events</h6>
            {overview.eventBreakdown?.length ? (
              overview.eventBreakdown.map((e) => (
                <div key={e._id} className="d-flex justify-content-between border-bottom py-2">
                  <span className="text-muted">{e._id}</span>
                  <span className="fw-bold">{e.count}</span>
                </div>
              ))
            ) : (
              <div className="text-muted">No data</div>
            )}
          </div>
        </div>

        {/* Top Pages */}
        <div className="col-lg-6">
          <div className="card p-3 shadow-sm border-0">
            <h6 className="fw-bold mb-3">Top Pages</h6>
            {overview.topPages?.length ? (
              overview.topPages.map((p) => (
                <div key={p._id} className="d-flex justify-content-between border-bottom py-2">
                  <span className="text-muted text-truncate" style={{ maxWidth: "75%" }}>{p._id}</span>
                  <span className="fw-bold">{p.count}</span>
                </div>
              ))
            ) : (
              <div className="text-muted">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* DAU */}
      <div className="card p-3 shadow-sm border-0 mt-3">
        <h6 className="fw-bold mb-3">Daily Active Users (Last 14 days)</h6>
        {dau.length ? (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>DAU</th>
                  <th>Events</th>
                </tr>
              </thead>
              <tbody>
                {dau.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td className="fw-bold">{d.dau}</td>
                    <td>{d.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted">No DAU data</div>
        )}
      </div>
    </div>
  );
}
