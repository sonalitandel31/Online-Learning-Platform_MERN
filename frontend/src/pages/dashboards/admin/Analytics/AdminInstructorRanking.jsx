import { useEffect, useState } from "react";
import { FaTrophy, FaChartLine, FaUserTie, FaLayerGroup, FaExclamationCircle, FaInfoCircle } from "react-icons/fa";
import api from "../../../../api/api";
import { motion } from "framer-motion";

export default function AdminInstructorRanking() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                setLoading(true);
                setErr("");
                const res = await api.get("/analytics/admin/instructor-scores", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setRows(Array.isArray(res.data?.results) ? res.data.results : []);
            } catch (e) {
                setErr("Failed to synchronize instructor rankings.");
            } finally {
                setLoading(false);
            }
        };
        fetchRankings();
    }, [token]);

    const getScoreVariant = (score) => {
        if (score >= 80) return { color: "#198754", bg: "#e8f5e9", label: "Elite" };
        if (score >= 60) return { color: "#fd7e14", bg: "#fff3e0", label: "Good" };
        return { color: "#dc3545", bg: "#ffebee", label: "Critical" };
    };

    if (loading) return <LoadingSkeleton />;
    if (err) return <ErrorState message={err} />;

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px' }}>
                
                {/* Header Section */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div className="d-flex align-items-center gap-2">
                        {/* <FaTrophy className="text-warning" size={28} /> */}
                        <div>
                            <h2 className="fw-bold text-dark m-0" style={{ fontSize: '2rem' }}>Instructor Leaderboard</h2>
                            <p className="text-muted mb-0 mt-1 small">Performance ranking based on engagement, risk, and retention.</p>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2 bg-white border px-3 py-2 rounded-pill shadow-sm">
                        <span className="dot-pulse"></span>
                        <span className="small fw-bold text-secondary">Live Performance Data</span>
                    </div>
                </div>

                {/* Main Ranking Card */}
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-body p-0">
                        {rows.length === 0 ? (
                            <div className="p-5 text-center text-muted">
                                <FaUserTie size={48} className="mb-3 opacity-25" />
                                <p className="fw-bold">No instructor data available for this period.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0 custom-ranking-table">
                                    <thead>
                                        <tr>
                                            <th className="ps-4">Rank</th>
                                            <th>Instructor Profiles</th>
                                            <th className="text-center">Courses</th>
                                            <th className="text-center">Performance Score</th>
                                            <th className="text-center">Avg Engagement</th>
                                            <th className="text-center">Churn Risk</th>
                                            <th className="pe-4 text-center">Avg Drop %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, index) => {
                                            const variant = getScoreVariant(r.score);
                                            return (
                                                <motion.tr 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    key={r.instructorId}
                                                >
                                                    <td className="ps-4">
                                                        <div className={`rank-badge ${index < 3 ? `top-${index + 1}` : ''}`}>
                                                            {index + 1}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-3 py-2">
                                                            <div className="avatar-placeholder">
                                                                {r.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="fw-bold text-dark">{r.name}</div>
                                                                <div className="text-muted tiny">{r.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="badge bg-light text-dark border fw-bold">{r.courseCount}</span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-inline-flex flex-column">
                                                            <span className="fw-black h5 m-0" style={{ color: variant.color }}>{r.score}</span>
                                                            <span className="tiny fw-bold text-uppercase opacity-75">{variant.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center fw-semibold text-dark">{r.avgEngagement}</td>
                                                    <td className="text-center">
                                                        <div className="d-flex align-items-center justify-content-center gap-2">
                                                            <div className="progress w-50" style={{ height: '6px' }}>
                                                                <div 
                                                                    className="progress-bar bg-danger" 
                                                                    style={{ width: `${r.highRiskRate}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="small fw-bold">{r.highRiskRate}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="pe-4 text-center fw-bold text-secondary">
                                                        {r.avgDropRate}%
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Score Legend Footer */}
                <div className="mt-4 p-3 rounded-4 bg-white border shadow-sm d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-2 text-muted small">
                        <FaInfoCircle />
                        <strong>Score Formula:</strong> 50% Engagement + 30% Risk mitigation + 20% Retention.
                    </div>
                    <div className="d-flex gap-3">
                        <div className="small d-flex align-items-center gap-1"><span className="dot" style={{background: '#198754'}}></span> Elite (&gt;80)</div>
                        <div className="small d-flex align-items-center gap-1"><span className="dot" style={{background: '#fd7e14'}}></span> Good (&gt;60)</div>
                        <div className="small d-flex align-items-center gap-1"><span className="dot" style={{background: '#dc3545'}}></span> Critical (&lt;60)</div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-ranking-table thead th {
                    background: #fcfcfd;
                    color: #8898aa;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 700;
                    padding: 1.2rem 1rem;
                    border-bottom: 2px solid #f4f6f8;
                }
                .custom-ranking-table tbody td { padding: 1rem; border-bottom: 1px solid #f4f6f8; }
                
                .rank-badge {
                    width: 32px; height: 32px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; background: #f1f3f9; color: #4b5563; font-size: 0.85rem;
                }
                .rank-badge.top-1 { background: #fef3c7; color: #d97706; border: 2px solid #fbbf24; }
                .rank-badge.top-2 { background: #f3f4f6; color: #4b5563; border: 2px solid #d1d5db; }
                .rank-badge.top-3 { background: #ffedd5; color: #9a3412; border: 2px solid #fdba74; }

                .avatar-placeholder {
                    width: 40px; height: 40px; border-radius: 12px;
                    background: #6366f115; color: #6366f1;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: 1.1rem;
                }
                
                .dot-pulse {
                    width: 8px; height: 8px; border-radius: 50%; background: #10b981;
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                    animation: pulse 2s infinite;
                }
                .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
                .tiny { font-size: 0.75rem; }
                @keyframes pulse { 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
                
                .fw-black { font-weight: 900; }
            `}</style>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center bg-white">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <p className="fw-bold text-muted">Calculating Global Rankings...</p>
        </div>
    );
}

function ErrorState({ message }) {
    return (
        <div className="container mt-5 text-center p-5 bg-white rounded-4 shadow-sm">
            <FaExclamationCircle size={48} className="text-danger mb-3" />
            <h4 className="fw-bold">Data Sync Failed</h4>
            <p className="text-muted">{message}</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary px-4 rounded-pill">Retry Connection</button>
        </div>
    );
}