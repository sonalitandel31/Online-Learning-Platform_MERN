import { useEffect, useState } from "react";
import api from "../../../../api/api";
import { FaExclamationTriangle } from "react-icons/fa";

export default function AdminPlatformRisk() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        const run = async () => {
            try {
                const res = await api.get("/analytics/admin/platform-risk", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setData(res.data);
            } catch (e) {
                console.error("Platform risk error:", e);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [token]);

    if (loading) return <div className="container mt-5">Loading...</div>;
    if (!data) return <div className="container mt-5">No data.</div>;

    return (
        <div className="container mt-4" style={{ marginTop: 90 }}>
            <h3 className="fw-bold d-flex align-items-center gap-2">
                <FaExclamationTriangle /> Platform Risk Overview
            </h3>

            <div className="row g-3 mt-2">
                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0">
                        <div className="text-muted small">Total Students</div>
                        <div className="h2 fw-bold">{data.totalStudents}</div>
                    </div>
                </div>

                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0">
                        <div className="text-muted small">Medium Risk (7+ days)</div>
                        <div className="h2 fw-bold">{data.mediumRisk}</div>
                    </div>
                </div>

                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0">
                        <div className="text-muted small">High Risk (14+ days)</div>
                        <div className="h2 fw-bold text-danger">{data.highRisk}</div>
                    </div>
                </div>

                <div className="col-md-3">
                    <div className="card p-3 shadow-sm border-0">
                        <div className="text-muted small">High Risk %</div>
                        <div className="h2 fw-bold">{data.highRiskRate}%</div>
                    </div>
                </div>
            </div>

            <div className="card p-3 shadow-sm border-0 mt-4">
                <h5 className="fw-bold">Top Risky Courses</h5>

                {data.topRiskCourses?.length === 0 ? (
                    <div className="text-muted">No course risk data.</div>
                ) : (
                    <table className="table table-sm mt-2">
                        <thead>
                            <tr>
                                <th>Course</th>
                                <th>Total Students</th>
                                <th>High Risk</th>
                                <th>High Risk %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.topRiskCourses.map((c) => (
                                <tr key={c.courseId}>
                                    <td>
                                        <div className="fw-bold">
                                            {c.courseTitle || "Untitled Course"}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#64748b" }}>
                                            {c.courseId}
                                        </div>
                                    </td>
                                    <td>{c.totalStudents}</td>
                                    <td>{c.highRiskCount}</td>
                                    <td>{Math.round(c.highRiskRate)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
