import React, { useState, useEffect } from 'react';
import {
    FaChartBar, FaUserGraduate, FaClock, FaCheckCircle,
    FaExclamationTriangle, FaDownload, FaFilter, FaUsers
} from 'react-icons/fa';
import { Doughnut, Line } from 'react-chartjs-2';
import api from '../../../api/api';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend
);

const HRAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState("7d");

    // Dynamic Theme Colors
    const THEME_PRIMARY = "var(--primary-color, #6f42c1)";

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                // Range pass kar rahe hain: 7d, 30d, ya 90d
                const res = await api.get(`/hr/analytics?range=${timeRange}`);
                setData(res.data.data);
            } catch (err) {
                console.error("Analytics fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [timeRange]);

    if (loading) return (
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '70vh' }}>
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem', borderColor: THEME_PRIMARY, borderRightColor: 'transparent' }} />
            <p className="fw-bold text-muted animate-pulse">Aggregating Enterprise Data...</p>
        </div>
    );

    // --- REAL DATA MAPPING ---

    // Doughnut Chart: Completion vs Pending
    const completionData = {
        labels: ['Completed', 'Remaining'],
        datasets: [{
            data: [data?.summary?.completionRate || 0, 100 - (data?.summary?.completionRate || 0)],
            backgroundColor: [THEME_PRIMARY, '#e9ecef'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    // Line Chart: Trend from Backend
    const engagementData = {
        labels: data?.trend?.map(t => t._id) || [],
        datasets: [{
            label: 'Lessons Completed',
            data: data?.trend?.map(t => t.lessonsDone) || [],
            borderColor: THEME_PRIMARY,
            backgroundColor: 'rgba(111, 66, 193, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: THEME_PRIMARY
        }]
    };

    return (
        <div className="container-fluid py-4">

            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Corporate Insights</h2>
                    <p className="text-muted small">Real-time performance tracking for your organization.</p>
                </div>
                <div className="d-flex gap-2">
                    <select
                        className="form-select border-0 shadow-sm rounded-pill px-4 py-2"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{ width: '160px', cursor: 'pointer', fontWeight: '600' }}
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 3 Months</option>
                    </select>
                    <button className="btn btn-dark rounded-pill px-4 shadow-sm d-flex align-items-center gap-2">
                        <FaDownload size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid - Mapping Summary Object */}
            <div className="row g-4 mb-5">
                {[
                    { label: "Completion Rate", value: `${data?.summary?.completionRate}%`, icon: <FaCheckCircle />, color: "success" },
                    { label: "Active Now (24h)", value: data?.summary?.activeLearners, icon: <FaUsers />, color: "primary" },
                    { label: "Avg. Progress", value: `${data?.summary?.avgProgress}%`, icon: <FaClock />, color: "info" },
                    { label: "At-Risk Employees", value: data?.summary?.totalAtRisk, icon: <FaExclamationTriangle />, color: "danger" }
                ].map((stat, i) => (
                    <div key={i} className="col-md-3">
                        <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                            <div className={`d-inline-flex p-3 rounded-circle mb-3 bg-${stat.color} bg-opacity-10 text-${stat.color}`}>
                                {stat.icon}
                            </div>
                            <h6 className="text-muted fw-bold small text-uppercase mb-1">{stat.label}</h6>
                            <h3 className="fw-bolder m-0">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Area */}
            <div className="row g-4 mb-4">
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-bold m-0 text-dark">Learning Activity Trend</h5>
                            <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">Lessons Done</span>
                        </div>
                        <div style={{ height: '320px' }}>
                            {data?.trend?.length > 0 ? (
                                <Line data={engagementData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                            ) : (
                                <div className="h-100 d-flex justify-content-center align-items-center text-muted">No activity data for this range</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                        <h5 className="fw-bold mb-4 text-dark text-center">Org. Progress</h5>
                        <div style={{ height: '230px' }}>
                            <Doughnut data={completionData} options={{ maintainAspectRatio: false, cutout: '75%' }} />
                        </div>
                        <div className="mt-4 text-center">
                            <h2 className="fw-bold mb-0">{data?.summary?.completionRate}%</h2>
                            <p className="text-muted small">Overall Completion</p>
                        </div>
                        <div className="mt-2">
                            <div className="d-flex justify-content-between small mb-2 text-muted">
                                <span>Avg. Syllabus Coverage</span>
                                <span>{data?.summary?.avgProgress}%</span>
                            </div>
                            <div className="progress rounded-pill" style={{ height: '8px', background: '#f0f0f0' }}>
                                <div className="progress-bar" style={{ width: `${data?.summary?.avgProgress}%`, backgroundColor: THEME_PRIMARY }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performing Employees List - Mapping Leaderboard Array */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white overflow-hidden">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold m-0">Enterprise Leaderboard</h5>
                    <button className="btn btn-sm btn-link text-decoration-none fw-bold" style={{ color: THEME_PRIMARY }}>View All Employees</button>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle border-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="border-0 px-4 py-3 rounded-start">Employee</th>
                                <th className="border-0 py-3">Email</th>
                                <th className="border-0 py-3 text-center">Courses Completed</th>
                                <th className="border-0 py-3 text-center">Avg. Progress</th>
                                <th className="border-0 py-3 rounded-end px-4 text-end">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.leaderboard?.length > 0 ? (
                                data.leaderboard.map((emp, i) => (
                                    <tr key={emp._id} style={{ cursor: 'pointer' }}>
                                        <td className="px-4 fw-bold">{emp.name}</td>
                                        <td className="text-muted">{emp.email}</td>
                                        <td className="text-center">
                                            <span className="badge rounded-pill bg-light text-dark border px-3">
                                                {emp.coursesDone} Finished
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="fw-bold" style={{ color: THEME_PRIMARY }}>{Math.round(emp.avgScore)}%</div>
                                        </td>
                                        <td className="px-4 text-end">
                                            <span className={`badge bg-${emp.coursesDone > 0 ? 'success' : 'warning'} bg-opacity-10 text-${emp.coursesDone > 0 ? 'success' : 'warning'} px-3 py-2`}>
                                                {emp.coursesDone > 2 ? 'Elite' : 'On Track'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-4 text-muted">No performers found in this period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HRAnalytics;