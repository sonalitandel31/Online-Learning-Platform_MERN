import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaBook,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaClock,
  FaRupeeSign,
} from "react-icons/fa";
import { Line } from "react-chartjs-2";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import DashboardLayout, { adminSidebarLinks } from "../dashboardLayout";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import AdminEngagementChart from "../../../components/AdminEngagementChart";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);

  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  const colors = {
    primary: "#6f42c1",
    secondary: "#8f63ff",
    bg: "#f8fafc",
    cardBg: "#ffffff",
    textMain: "#1e293b",
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await api.get("/admin/dashboard");
        const { stats: statsData, chartData: chartDataFromApi, user } = res.data;

        setUser(user);

        const fullUrl = user.profilePic?.startsWith("http")
          ? user.profilePic
          : `${BASE_URL.replace(/\/$/, "")}${user.profilePic}`;
        setProfileImage(fullUrl || `${BASE_URL}/uploads/default.png`);

        setStats([
          { title: "Total Users", value: statsData?.totalUsers ?? 0, icon: <FaUsers size={28} /> },
          { title: "Total Instructors", value: statsData?.totalInstructors ?? 0, icon: <FaChalkboardTeacher size={28} /> },
          { title: "Total Students", value: statsData?.totalStudents ?? 0, icon: <FaUserGraduate size={28} /> },
          { title: "Total Courses", value: statsData?.totalCourses ?? 0, icon: <FaBook size={28} /> },
          { title: "Pending", value: statsData?.pendingApprovals ?? 0, icon: <FaClock size={28} /> },
          { title: "Revenue", value: `₹${Number(statsData?.revenue ?? 0).toLocaleString("en-IN")}`, icon: <FaRupeeSign size={28} /> },
        ]);

        const monthsLabels = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthsLabels.push(d.toLocaleString("default", { month: "short", year: "2-digit" }));
        }

        const usersMap = chartDataFromApi?.monthlyUsers?.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}) || {};

        const enrollMap = chartDataFromApi?.monthlyEnrollments?.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}) || {};

        const userData = monthsLabels.map((_, idx) => usersMap[idx + 1] || 0);
        const enrollmentData = monthsLabels.map((_, idx) => enrollMap[idx + 1] || 0);

        setChartData({
          labels: monthsLabels,
          datasets: [
            {
              label: "New Users",
              data: userData,
              borderColor: colors.primary,
              backgroundColor: "rgba(111,66,193,0.1)",
              fill: true,
              tension: 0.4,
            },
            {
              label: "Enrollments",
              data: enrollmentData,
              borderColor: colors.secondary,
              backgroundColor: "rgba(143,99,255,0.1)",
              fill: true,
              tension: 0.4,
            },
          ],
        });

        setLoading(false);
      } catch (err) {
        console.error("Dashboard error:", err);
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [BASE_URL]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
    },
    scales: { 
      y: { beginAtZero: true, grid: { display: false } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    },
  };

  if (loading) {
    return (
      <DashboardLayout sidebarLinks={adminSidebarLinks}>
        <style>{`
          .admin-main { padding: 10px; font-family: 'Inter', sans-serif; }
          .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
          .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
          
          /* Skeleton Animation */
          .skeleton {
            background: #f1f5f9;
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite linear;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          
          /* Skeleton Shapes */
          .skel-title { width: 200px; height: 28px; border-radius: 6px; margin-bottom: 8px; }
          .skel-sub { width: 140px; height: 16px; border-radius: 4px; }
          .skel-avatar { width: 45px; height: 45px; border-radius: 50%; }
          .skel-card { height: 140px; border-radius: 15px; border: 1px solid #eef2f6; }
          .skel-chart { height: 350px; border-radius: 15px; border: 1px solid #eef2f6; }
          .skel-engagement { height: 300px; border-radius: 15px; border: 1px solid #eef2f6; margin-top: 1rem; }

          @media (min-width: 768px) {
            .admin-main { padding: 20px; }
            .stat-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
          }
          @media (min-width: 1200px) {
            .stat-grid { grid-template-columns: repeat(6, 1fr); }
          }
        `}</style>

        <div className="admin-main">
          {/* Header Skeleton */}
          <div className="admin-header">
            <div>
              <div className="skeleton skel-title"></div>
              <div className="skeleton skel-sub"></div>
            </div>
            <div className="skeleton skel-avatar"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="stat-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton skel-card"></div>
            ))}
          </div>

          {/* Chart Skeletons */}
          <div className="skeleton skel-chart"></div>
          <div className="skeleton skel-engagement"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={adminSidebarLinks}>
      <style>{`
        .admin-main { padding: 10px; font-family: 'Inter', sans-serif; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 15px; border: 1px solid #eef2f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-5px); }
        .icon-wrapper { color: ${colors.primary}; margin-bottom: 12px; display: inline-block; padding: 10px; background: #f3effb; border-radius: 12px; }
        .stat-label { font-size: 0.85rem; color: #64748b; margin-bottom: 5px; font-weight: 500; }
        .stat-value { font-size: 1.25rem; font-weight: 800; color: ${colors.textMain}; margin: 0; }
        
        .chart-container { background: white; padding: 20px; border-radius: 15px; border: 1px solid #eef2f6; height: 350px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .profile-img { width: 45px; height: 45px; border-radius: 50%; border: 2px solid ${colors.primary}; cursor: pointer; object-fit: cover; }

        @media (min-width: 768px) {
            .admin-main { padding: 20px; }
            .stat-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .stat-value { font-size: 1.5rem; }
        }
        @media (min-width: 1200px) {
            .stat-grid { grid-template-columns: repeat(6, 1fr); }
        }
      `}</style>

      <div className="admin-main">
        {location.pathname === "/admin-dashboard" ? (
          <>
            <div className="admin-header">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: colors.textMain, margin: 0 }}>Platform Overview</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Welcome back, {user?.name}</p>
              </div>
              <img
                src={profileImage}
                alt="Profile"
                className="profile-img"
                onClick={() => navigate("/admin-dashboard/profile")}
              />
            </div>

            <div className="stat-grid">
              {stats.map((stat, i) => (
                <div key={i} className="stat-card">
                  <div className="icon-wrapper">{stat.icon}</div>
                  <div className="stat-label">{stat.title}</div>
                  <h3 className="stat-value">{stat.value}</h3>
                </div>
              ))}
            </div>

            <div className="chart-container">
              <h4 style={{ fontSize: '1rem', marginBottom: '15px', fontWeight: 700 }}>Growth Analytics</h4>
              <div style={{ height: '270px' }}>
                {chartData?.datasets && <Line data={chartData} options={chartOptions} />}
              </div>
            </div>
            <div className="mt-4">
              <AdminEngagementChart />
            </div>
          </>
        ) : (
          <Outlet />
        )}
      </div>
    </DashboardLayout>
  );
}