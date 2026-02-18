import { useEffect, useState } from "react";
import api from "../../../../api/api";
import { FaExclamationTriangle, FaUsers, FaChartLine, FaLayerGroup, FaSyncAlt, FaChevronRight } from "react-icons/fa";
import { motion } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AdminPlatformRisk() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchData = async () => {
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
        fetchData();
    }, [token]);

    if (loading) return <LoadingSkeleton />;
    if (!data) return <ErrorState />;

    const chartData = {
        labels: ['High Risk', 'Medium Risk', 'Stable'],
        datasets: [{
            data: [data.highRisk, data.mediumRisk, data.totalStudents - (data.highRisk + data.mediumRisk)],
            backgroundColor: ['#dc3545', '#fd7e14', '#198754'],
            hoverOffset: 4,
            borderWidth: 0,
        }]
    };

    return (
        <div className="platform-risk-container">
            <div className="content-header mb-4">
                <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                    <span>Analytics</span> <FaChevronRight size={10} /> <span>Platform Risk</span>
                </div>
                <div className="d-flex justify-content-between align-items-end">
                    <div>
                        <h2 className="fw-bold text-dark m-0">Platform Integrity</h2>
                        <p className="text-muted m-0">Predictive churn analysis and retention tracking</p>
                    </div>
                    <div className="status-indicator shadow-sm">
                        <span className="dot"></span> Live Analytics
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-xl-8">
                    <div className="row g-3">
                        <StatCard title="Total Students" value={data.totalStudents} icon={<FaUsers />} color="#6f42c1" />
                        <StatCard title="Risk Intensity" value={`${data.highRiskRate}%`} icon={<FaChartLine />} color="#0dcaf0" sub="Churn Probability" />
                        <StatCard title="Medium Risk" value={data.mediumRisk} icon={<FaLayerGroup />} color="#fd7e14" sub="7+ Days Inactive" />
                        <StatCard title="High Risk" value={data.highRisk} icon={<FaExclamationTriangle />} color="#dc3545" sub="Immediate Action" />
                    </div>

                    <div className="custom-card mt-4">
                        <div className="card-header-flex">
                            <h5 className="fw-bold m-0">High-Risk Courses</h5>
                            <button className="refresh-btn" onClick={() => window.location.reload()}><FaSyncAlt /> Sync</button>
                        </div>
                        <div className="table-responsive">
                            <table className="table custom-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>Course Name</th>
                                        <th className="text-center" style={{ width: '15%' }}>Enrolled</th>
                                        <th className="text-center" style={{ width: '20%' }}>At Risk</th>
                                        <th style={{ width: '25%' }}>Risk level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topRiskCourses?.map((c) => (
                                        <tr key={c.courseId}>
                                            <td className="py-3">
                                                <div className="fw-bold text-truncate" style={{ maxWidth: '280px' }}>{c.courseTitle}</div>
                                                <div className="text-muted tiny">UID: {c.courseId}</div>
                                            </td>
                                            <td className="text-center fw-semibold text-dark">
                                                {c.totalStudents}
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center">
                                                    <span className="risk-badge-fixed">
                                                        {c.highRiskCount} Students
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="progress-wrapper">
                                                    <div className="progress flex-grow-1" style={{height: '8px', borderRadius: '10px', background: '#e9ecef'}}>
                                                        <div 
                                                            className={`progress-bar ${c.highRiskRate > 40 ? 'bg-danger' : 'bg-warning'}`} 
                                                            style={{width: `${c.highRiskRate}%`}}
                                                        ></div>
                                                    </div>
                                                    <span className="tiny fw-bold text-dark">{Math.round(c.highRiskRate)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="col-xl-4">
                    <div className="custom-card h-100 shadow-sm">
                        <h6 className="fw-bold mb-4 text-uppercase ls-1" style={{ fontSize: '0.8rem', color: '#6c757d' }}>Risk Distribution</h6>
                        <div className="chart-wrapper">
                            <Doughnut data={chartData} options={{ cutout: '80%', plugins: { legend: { display: false } } }} />
                            <div className="chart-center">
                                <span className="pct">{data.highRiskRate}%</span>
                                <span className="lbl">Critical</span>
                            </div>
                        </div>
                        <div className="legend-list mt-5">
                            <LegendItem color="#dc3545" label="High Risk" count={data.highRisk} />
                            <LegendItem color="#fd7e14" label="Medium Risk" count={data.mediumRisk} />
                            <LegendItem color="#198754" label="Stable Users" count={data.totalStudents - (data.highRisk + data.mediumRisk)} />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .platform-risk-container { padding: 25px; background: #f8f9fa; min-height: 100vh; }
                .custom-card { background: white; border-radius: 20px; border: 1px solid #eef0f2; padding: 24px; }
                .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                
                .stat-box { display: flex; align-items: center; justify-content: space-between; background: white; border-radius: 18px; padding: 22px; border: 1px solid #eef0f2; height: 100%; }
                .stat-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
                
                .status-indicator { background: white; color: #2e7d32; padding: 8px 16px; border-radius: 50px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 10px; border: 1px solid #e0e0e0; }
                .status-indicator .dot { width: 8px; height: 8px; background: #4caf50; border-radius: 50%; animation: pulse 2s infinite; }
                
                .custom-table th { background: transparent; color: #adb5bd; font-size: 0.7rem; text-transform: uppercase; padding: 12px 15px; border-bottom: 2px solid #f8f9fa; letter-spacing: 1px; }
                .custom-table td { padding: 18px 15px; vertical-align: middle; border-bottom: 1px solid #f8f9fa; font-size: 0.92rem; }
                
                .risk-badge-fixed { 
                    background: #fff5f5; 
                    color: #e53e3e; 
                    padding: 6px 14px; 
                    border-radius: 10px; 
                    font-weight: 700; 
                    font-size: 0.8rem; 
                    border: 1px solid #fecdd3;
                    display: inline-block;
                    min-width: 100px;
                    text-align: center;
                }
                
                .chart-wrapper { position: relative; max-width: 240px; margin: 0 auto; }
                .chart-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
                .chart-center .pct { display: block; font-size: 2rem; font-weight: 800; color: #1e293b; line-height: 1; }
                .chart-center .lbl { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-top: 4px; }
                
                .refresh-btn { background: white; border: 1px solid #e2e8f0; padding: 8px 18px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
                .refresh-btn:hover { background: #f1f5f9; }
                
                .progress-wrapper { display: flex; align-items: center; gap: 12px; }
                .tiny { font-size: 0.75rem; color: #64748b; }
                .ls-1 { letter-spacing: 1px; }
                
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            `}</style>
        </div>
    );
}

function StatCard({ title, value, icon, color, sub }) {
    return (
        <div className="col-md-6 col-lg-3">
            <motion.div whileHover={{ y: -4 }} className="stat-box shadow-sm">
                <div>
                    <div className="small fw-bold text-uppercase" style={{ letterSpacing: '0.5px', color: '#94a3b8', fontSize: '0.65rem' }}>{title}</div>
                    <h3 className="fw-bold m-0 mt-1" style={{ color: '#1e293b' }}>{value}</h3>
                    {sub && <div className="tiny mt-1 fw-bold" style={{color, fontSize: '0.7rem'}}>{sub}</div>}
                </div>
                <div className="stat-icon" style={{background: `${color}10`, color: color}}>
                    {icon}
                </div>
            </motion.div>
        </div>
    );
}

function LegendItem({ color, label, count }) {
    return (
        <div className="d-flex justify-content-between align-items-center mb-3 p-3 rounded-4" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <div className="d-flex align-items-center gap-3">
                <div style={{width: 10, height: 10, borderRadius: '3px', background: color}}></div>
                <span className="small text-dark fw-bold" style={{ fontSize: '0.85rem' }}>{label}</span>
            </div>
            <span className="badge bg-white text-dark border fw-bold shadow-sm" style={{ padding: '5px 10px' }}>{count}</span>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center bg-white">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
            <span className="mt-3 fw-bold text-muted">Analyzing Platform Data...</span>
        </div>
    );
}

function ErrorState() {
    return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center">
            <FaExclamationTriangle size={50} className="text-danger mb-3" />
            <h4 className="fw-bold">Synchronization Error</h4>
            <p className="text-muted">The risk engine is currently unavailable.</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary px-4 rounded-pill">Retry Sync</button>
        </div>
    );
}