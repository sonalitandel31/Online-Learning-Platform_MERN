import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import api from '../../../api/api';
import DashboardLayout, { hrSidebarLinks } from '../dashboardLayout';
import {
    FaClock, FaCheckCircle, FaExclamationTriangle,
    FaDownload, FaUsers
} from 'react-icons/fa';
import { Doughnut, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    PointElement, LineElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend
);

const HRDashboard = () => {
    // --- States ---
    const [user, setUser] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [data, setData] = useState(null);
    const [timeRange, setTimeRange] = useState("7d");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ✅ Branding State
    const [brandColor, setBrandColor] = useState("#6f42c1"); // Default Fallback

    const location = useLocation();
    const navigate = useNavigate();
    const BASE_URL = import.meta.env.VITE_BASE_URL || "";

    const isMainDashboard = location.pathname === '/hr-dashboard' || location.pathname === '/hr-dashboard/';

    // ✅ Utility: Convert Hex to RGBA for chart & UI backgrounds
    const hexToRgba = (hex, opacity) => {
        if (!hex) return `rgba(111, 66, 193, ${opacity})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    // --- Fetch Data (Profile + Analytics + Settings together) ---
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // ✅ 3 APIs parallel mein fetch karo: Profile, Analytics, aur Company Settings (for Branding)
                const [profileRes, analyticsRes, settingsRes] = await Promise.all([
                    api.get('/profile'),
                    api.get(`/hr/analytics?range=${timeRange}`),
                    api.get('/companies/settings')
                ]);

                // Set Brand Color
                const theme = settingsRes.data?.data?.branding?.themeColor || '#6f42c1';
                setBrandColor(theme);

                // Set User Profile
                const userData = profileRes.data.user;
                setUser(userData);
                const fullUrl = userData?.profilePic?.startsWith("http")
                    ? userData.profilePic
                    : `${BASE_URL.replace(/\/$/, "")}${userData?.profilePic}`;
                setProfileImage(userData?.profilePic ? fullUrl : `${BASE_URL}/uploads/default.png`);

                // Set Analytics Data
                setData(analyticsRes.data.data);

            } catch (err) {
                console.error("Dashboard load failed", err);
                setError("Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [timeRange, BASE_URL]);

    // --- ✅ DYNAMIC Chart Configurations (Using Brand Color) ---
    const completionData = {
        labels: ['Completed', 'Remaining'],
        datasets: [{
            data: [data?.summary?.completionRate || 0, 100 - (data?.summary?.completionRate || 0)],
            backgroundColor: [brandColor, '#e9ecef'], // Doughnut chart filled with brand color
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const engagementData = {
        labels: data?.trend?.map(t => t._id) || [],
        datasets: [{
            label: 'Lessons Completed',
            data: data?.trend?.map(t => t.lessonsDone) || [],
            borderColor: brandColor, // Line color
            backgroundColor: hexToRgba(brandColor, 0.1), // Area under the line
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: brandColor // Data point dots
        }]
    };

    return (
        <DashboardLayout sidebarLinks={hrSidebarLinks}>
            {/* ✅ Dynamic Styles for hover and pulse effects */}
            <style>{`
                .hr-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;}
                .profile-img { width: 48px; height: 48px; border-radius: 50%; border: 2px solid ${brandColor}; cursor: pointer; object-fit: cover; transition: transform 0.2s; }
                .profile-img:hover { transform: scale(1.05); box-shadow: 0 4px 12px ${hexToRgba(brandColor, 0.3)}; }
                .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
            `}</style>

            <div className="container-fluid px-0 px-md-3 mt-2 mb-5">

                {isMainDashboard ? (
                    <>

                        {/* 🌟 Header Section */}
                        <div className="hr-header">
                            <div>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>
                                    Corporate Dashboard
                                </h2>
                                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
                                    {loading ? "Loading profile..." : `Welcome back, ${user?.name || "HR Manager"}`}
                                </p>
                            </div>

                            {!loading && (
                                <img
                                    src={profileImage || "/default-avatar.png"}
                                    alt="Profile"
                                    className="profile-img shadow-sm"
                                    onClick={() => navigate("/hr-dashboard/profile")}
                                    title="Edit Profile & Settings"
                                />
                            )}
                        </div>
                        
                        {loading && (
                            <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '50vh' }}>
                                <div className="spinner-border mb-3" style={{ width: '3rem', height: '3rem', color: brandColor }} />
                                <p className="fw-bold text-muted animate-pulse">Aggregating Enterprise Data...</p>
                            </div>
                        )}
                        {error && <div className="alert alert-danger shadow-sm border-0">{error}</div>}

                        {/* 📊 Main Content Area */}
                        {!loading && data && (
                            <>
                                {/* Filters */}
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="fw-bold m-0 text-dark">Real-time Insights</h5>
                                    <div className="d-flex gap-2">
                                        <select
                                            className="form-select border-0 shadow-sm rounded-pill px-4 py-2 bg-white"
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

                                {/* Quick Stats Grid */}
                                <div className="row g-4 mb-4">
                                    {/* 1. Completion Rate (Semantic Green) */}
                                    <div className="col-md-3">
                                        <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 bg-success bg-opacity-10 text-success" style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}>
                                                <FaCheckCircle />
                                            </div>
                                            <h6 className="text-muted fw-bold small text-uppercase mb-1">Completion Rate</h6>
                                            <h3 className="fw-bolder m-0">{data?.summary?.completionRate || 0}%</h3>
                                        </div>
                                    </div>

                                    {/* 2. Active Now (Brand Color applied) */}
                                    <div className="col-md-3">
                                        <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ backgroundColor: hexToRgba(brandColor, 0.1), color: brandColor, width: '56px', height: '56px', fontSize: '1.5rem' }}>
                                                <FaUsers />
                                            </div>
                                            <h6 className="text-muted fw-bold small text-uppercase mb-1">Active Now (24h)</h6>
                                            <h3 className="fw-bolder m-0">{data?.summary?.activeLearners || 0}</h3>
                                        </div>
                                    </div>

                                    {/* 3. Avg Progress (Semantic Blue/Info) */}
                                    <div className="col-md-3">
                                        <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 bg-info bg-opacity-10 text-info" style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}>
                                                <FaClock />
                                            </div>
                                            <h6 className="text-muted fw-bold small text-uppercase mb-1">Avg. Progress</h6>
                                            <h3 className="fw-bolder m-0">{data?.summary?.avgProgress || 0}%</h3>
                                        </div>
                                    </div>

                                    {/* 4. At Risk (Semantic Red/Danger) */}
                                    <div className="col-md-3">
                                        <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                                            <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 bg-danger bg-opacity-10 text-danger" style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}>
                                                <FaExclamationTriangle />
                                            </div>
                                            <h6 className="text-muted fw-bold small text-uppercase mb-1">At-Risk Employees</h6>
                                            <h3 className="fw-bolder m-0">{data?.summary?.totalAtRisk || 0}</h3>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Area */}
                                <div className="row g-4 mb-4">
                                    <div className="col-lg-8">
                                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <h5 className="fw-bold m-0 text-dark">Learning Activity Trend</h5>
                                                <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">Lessons Done</span>
                                            </div>
                                            <div style={{ height: '320px' }}>
                                                {data?.trend?.length > 0 ? (
                                                    <Line key={timeRange} data={engagementData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
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
                                                <h2 className="fw-bold mb-0">{data?.summary?.completionRate || 0}%</h2>
                                                <p className="text-muted small">Overall Completion</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Leaderboard Area */}
                                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white overflow-hidden">
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <h5 className="fw-bold m-0">Enterprise Leaderboard</h5>
                                        <button
                                            className="btn btn-sm btn-link text-decoration-none fw-bold"
                                            style={{ color: brandColor }}
                                            onClick={() => navigate("/hr-dashboard/employees")}
                                        >
                                            View All Employees
                                        </button>
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
                                                    data.leaderboard.map((emp) => (
                                                        <tr key={emp._id} style={{ cursor: 'pointer' }}>
                                                            <td className="px-4 fw-bold">{emp.name}</td>
                                                            <td className="text-muted">{emp.email}</td>
                                                            <td className="text-center">
                                                                <span className="badge rounded-pill bg-light text-dark border px-3">
                                                                    {emp.coursesDone} Finished
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="fw-bold" style={{ color: brandColor }}>{Math.round(emp.avgScore || 0)}%</div>
                                                            </td>
                                                            <td className="px-4 text-end">
                                                                <span className={`badge bg-${emp.coursesDone > 0 ? 'success' : 'warning'} bg-opacity-10 text-${emp.coursesDone > 0 ? 'success' : 'warning'} px-3 py-2`}>
                                                                    {emp.coursesDone >= 2 ? 'Elite' : 'On Track'}
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
                            </>
                        )}
                    </>
                ) : (
                    <Outlet />
                )}
            </div>
        </DashboardLayout>
    );
};

export default HRDashboard;