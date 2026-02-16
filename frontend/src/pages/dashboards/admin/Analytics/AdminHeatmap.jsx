import { useEffect, useState } from "react";
import api from "../../../../api/api";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminHeatmap() {
  const [grid, setGrid] = useState({});
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get("/analytics/admin/heatmap?days=30", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rows = res.data?.rows || [];

        const map = {};
        rows.forEach((r) => {
          const key = `${r.day}-${r.hour}`;
          map[key] = r.count;
        });

        setGrid(map);
      } catch (e) {
        console.error("Heatmap load error:", e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  if (loading) return <div className="container mt-5">Loading...</div>;

  const getColor = (value) => {
    if (!value) return "#f1f5f9";
    if (value < 10) return "#dbeafe";
    if (value < 30) return "#93c5fd";
    if (value < 60) return "#3b82f6";
    return "#1d4ed8";
  };

  return (
    <div className="container mt-4" style={{ marginTop: 90 }}>
      <h3 className="fw-bold">Platform Engagement Heatmap (Last 30 Days)</h3>

      <div className="table-responsive mt-3">
        <table className="table table-bordered text-center align-middle">
          <thead>
            <tr>
              <th>Day / Hour</th>
              {[...Array(24).keys()].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {days.map((dayLabel, i) => (
              <tr key={i}>
                <th>{dayLabel}</th>
                {[...Array(24).keys()].map((h) => {
                  const value = grid[`${i + 1}-${h}`] || 0;
                  return (
                    <td
                      key={h}
                      style={{
                        backgroundColor: getColor(value),
                        color: value > 30 ? "white" : "black",
                        fontSize: 12,
                      }}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-muted" style={{ fontSize: 13 }}>
        Darker = more activity. Shows when students are most active.
      </div>
    </div>
  );
}
