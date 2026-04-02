import React, { useState, useEffect } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom'; 
import api from '../../../api/api';
import DashboardLayout, { hrSidebarLinks } from '../dashboardLayout'; 

const HRDashboard = () => {
    const [stats, setStats] = useState(null);
    const [user, setUser] = useState(null); // ✅ NEW: Store user info
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [profileImage, setProfileImage] = useState(null); // ✅ NEW: Profile Image

    const location = useLocation(); 
    const navigate = useNavigate(); // ✅ NEW: For navigation

    const BASE_URL = import.meta.env.VITE_BASE_URL || "";

    const colors = {
        primary: "#6f42c1",
        textMain: "#1e293b",
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch HR dashboard stats
                const res = await api.get('/hr/dashboard');
                setStats(res.data.data);

                // ✅ NEW: Fetch basic user profile to get Name and Image
                // Note: We use the common profile endpoint that your Profile.jsx uses
                const profileRes = await api.get('/profile'); 
                const userData = profileRes.data.user;
                setUser(userData);

                const fullUrl = userData?.profilePic?.startsWith("http")
                  ? userData.profilePic
                  : `${BASE_URL.replace(/\/$/, "")}${userData?.profilePic}`;
                setProfileImage(userData?.profilePic ? fullUrl : `${BASE_URL}/uploads/default.png`);

            } catch (err) {
                setError("Dashboard data load nahi ho paya. Kripya apna connection check karein.");
            } finally {
                setLoading(false);
            }
        };

        if (location.pathname === '/hr-dashboard' || location.pathname === '/hr-dashboard/') {
            fetchStats();
        } else {
            setLoading(false);
        }
    }, [location.pathname, BASE_URL]);

    return (
        <DashboardLayout sidebarLinks={hrSidebarLinks}>
            {/* ✅ NEW: CSS matching your Admin Dashboard */}
            <style>{`
                .hr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding: 10px 0; }
                .profile-img { width: 45px; height: 45px; border-radius: 50%; border: 2px solid ${colors.primary}; cursor: pointer; object-fit: cover; transition: transform 0.2s; }
                .profile-img:hover { transform: scale(1.05); }
                .stat-card { border-left: 4px solid ${colors.primary} !important; border-radius: 12px; transition: transform 0.2s; }
                .stat-card:hover { transform: translateY(-5px); }
            `}</style>

            <div className="container-fluid px-0 px-md-3 mt-2">
                
                {/* Condition: Agar main URL par hain toh Stats dikhao, warna child page (Outlet) dikhao */}
                {location.pathname === '/hr-dashboard' || location.pathname === '/hr-dashboard/' ? (
                    <>
                        {/* ✅ NEW: Top Header with Welcome Message and Profile Image */}
                        <div className="hr-header">
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: colors.textMain, margin: 0 }}>Corporate Dashboard</h2>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Welcome back, {user?.name || "HR Manager"}</p>
                            </div>
                            <img
                                src={profileImage || "/default-avatar.png"}
                                alt="Profile"
                                className="profile-img shadow-sm"
                                onClick={() => navigate("/hr-dashboard/profile")}
                                title="Edit Profile & Settings"
                            />
                        </div>
                        
                        {loading && (
                            <div className="d-flex justify-content-center py-5">
                                <div className="spinner-border text-primary" role="status"></div>
                            </div>
                        )}
                        {error && <div className="alert alert-danger shadow-sm border-0">{error}</div>}

                        {stats && !loading && (
                            <div className="row g-4 mt-2">
                                <div className="col-md-4">
                                    <div className="card shadow-sm border-0 p-4 h-100 stat-card">
                                        <h6 className="text-uppercase fw-bold text-muted mb-2" style={{fontSize: '0.8rem', letterSpacing: '1px'}}>Total Employees</h6>
                                        <h2 className="display-5 fw-bold text-dark mb-0">{stats.totalEmployees}</h2>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="card shadow-sm border-0 p-4 h-100 stat-card">
                                        <h6 className="text-uppercase fw-bold text-muted mb-2" style={{fontSize: '0.8rem', letterSpacing: '1px'}}>Active Learners (7 Days)</h6>
                                        <h2 className="display-5 fw-bold text-primary mb-0">{stats.activeLearners}</h2>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="card shadow-sm border-0 p-4 h-100 stat-card">
                                        <h6 className="text-uppercase fw-bold text-muted mb-2" style={{fontSize: '0.8rem', letterSpacing: '1px'}}>Engagement Rate</h6>
                                        <h2 className="display-5 fw-bold text-success mb-0">{stats.engagementRate}</h2>
                                    </div>
                                </div>
                            </div>
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