import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
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

import { FaUser, FaBook, FaPlus, FaGraduationCap } from "react-icons/fa";
import DashboardLayout, { instructorSidebarLinks } from "../dashboardLayout";
import api from "../../../api/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function InstructorDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeCourses, setActiveCourses] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [newStudents, setNewStudents] = useState(0);
  const [profile, setProfile] = useState({ name: "", image: "/uploads/default.png" });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/instructor/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setActiveCourses(res.data.myCourses.length || 0);
        setPendingApprovals(res.data.pendingApprovals.length || 0);
        setNewStudents(res.data.newStudents || 0);

        const profileImage = res.data.profile?.image
          ? res.data.profile.image.startsWith("http")
            ? res.data.profile.image
            : `${BASE_URL}${res.data.profile.image}`
          : `${BASE_URL}/uploads/default.png`;

        setProfile({
          name: res.data.profile?.name || "Instructor",
          image: profileImage,
        });

        setChartData({
          labels: res.data.chartData.labels,
          datasets: [
            {
              label: "Enrollments",
              data: res.data.chartData.data,
              borderColor: "#6d28d9",
              backgroundColor: "rgba(109, 40, 217, 0.1)",
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: "#6d28d9",
            },
          ],
        });
      } catch (error) {
        console.error("Dashboard fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [BASE_URL]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1f2937",
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: { 
      y: { 
        beginAtZero: true,
        grid: { color: "#f3f4f6" }
      },
      x: {
        grid: { display: false }
      }
    },
  };

  const styles = {
    primaryColor: "#6d28d9",
    textPurple: { color: "#6d28d9" },
    headerSection: {
      background: "#fff",
      padding: "30px",
      borderRadius: "16px",
      marginBottom: "30px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
    },
    card: {
      borderRadius: "16px",
      textAlign: "left",
      padding: "24px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      backgroundColor: "white",
      border: "1px solid #f1f5f9",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      transition: "all 0.3s ease",
    },
    iconCircle: (bg) => ({
      width: "50px",
      height: "50px",
      borderRadius: "12px",
      backgroundColor: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "15px",
      color: "#fff"
    }),
    chartCard: {
      borderRadius: "16px",
      padding: "25px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
      backgroundColor: "white",
      marginTop: "20px",
      border: "1px solid #f1f5f9",
    },
    profileBorder: {
      border: "3px solid #6d28d9",
      padding: "2px",
      cursor: "pointer",
      width: "55px",
      height: "55px",
      objectFit: "cover",
      transition: "transform 0.2s"
    },
  };

  return (
    <DashboardLayout sidebarLinks={instructorSidebarLinks}>
      {location.pathname === "/instructor-dashboard" ? (
        <div className="container-fluid p-0">
          
          {/* ✅ Skeleton CSS Styles */}
          <style>{`
            .profile-img:hover { transform: scale(1.05); }
            .dashboard-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); }
            
            .skeleton {
              background: #f1f5f9;
              background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite linear;
              border-radius: 4px;
            }
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            
            .skel-header-title { width: 300px; height: 32px; margin-bottom: 8px; border-radius: 6px; }
            .skel-header-sub { width: 400px; height: 16px; border-radius: 4px; }
            .skel-avatar { width: 55px; height: 55px; border-radius: 50%; flex-shrink: 0; }
            
            .skel-card-icon { width: 50px; height: 50px; border-radius: 12px; margin-bottom: 15px; }
            .skel-card-label { width: 120px; height: 14px; margin-bottom: 8px; }
            .skel-card-value { width: 60px; height: 32px; border-radius: 6px; }
            
            .skel-chart-title { width: 200px; height: 24px; border-radius: 6px; }
            .skel-chart-badge { width: 100px; height: 24px; border-radius: 50rem; }
            .skel-chart-area { width: 100%; height: 350px; border-radius: 8px; }

            @media (max-width: 768px) {
              .skel-header-title, .skel-header-sub { width: 100%; }
            }
          `}</style>

          {loading ? (
            <>
              {/* Skeleton Header Section */}
              <div style={styles.headerSection} className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div style={{ width: '100%' }}>
                  <div className="skeleton skel-header-title"></div>
                  <div className="skeleton skel-header-sub"></div>
                </div>
                <div className="d-flex align-items-center">
                  <div className="skeleton skel-avatar"></div>
                </div>
              </div>

              {/* Skeleton Stats Cards */}
              <div className="row g-4 mb-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="col-12 col-md-4">
                    <div style={styles.card}>
                      <div className="skeleton skel-card-icon"></div>
                      <div className="skeleton skel-card-label"></div>
                      <div className="skeleton skel-card-value"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Skeleton Chart */}
              <div style={styles.chartCard}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="skeleton skel-chart-title"></div>
                  <div className="skeleton skel-chart-badge"></div>
                </div>
                <div className="skeleton skel-chart-area"></div>
              </div>
            </>
          ) : (
            <>
              {/* Header Section */}
              <div style={styles.headerSection} className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <h2 style={{ ...styles.textPurple, fontWeight: "800", marginBottom: "5px" }}>
                    Welcome back, {profile.name}!
                  </h2>
                  <p className="text-muted m-0">
                    Here’s what’s happening with your courses and students today.
                  </p>
                </div>

                <div className="d-flex align-items-center">
                  <img
                    src={profile.image}
                    alt="profile"
                    className="rounded-circle shadow-sm profile-img"
                    style={styles.profileBorder}
                    onClick={() => navigate("/instructor-dashboard/profile")}
                  />
                </div>
              </div>

              {/* Stats Cards */}
              <div className="row g-4 mb-4">
                {[
                  { icon: FaBook, title: "Active Courses", value: activeCourses, color: "#6d28d9", bg: "#ede9fe" },
                  { icon: FaPlus, title: "Pending Approvals", value: pendingApprovals, color: "#db2777", bg: "#fce7f3" },
                  { icon: FaGraduationCap, title: "Total Students", value: newStudents, color: "#059669", bg: "#dcfce7" },
                ].map((card, idx) => (
                  <div key={idx} className="col-12 col-md-4">
                    <div style={styles.card} className="dashboard-card">
                      <div style={styles.iconCircle(card.color)}>
                        <card.icon size={22} />
                      </div>
                      <h6 className="text-uppercase fw-bold text-muted small mb-1">{card.title}</h6>
                      <h2 className="fw-bold m-0" style={{ fontSize: "2rem" }}>{card.value}</h2>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enrollment Chart */}
              <div style={styles.chartCard}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold m-0" style={styles.textPurple}>
                    Enrollment Trends
                  </h5>
                  <span className="badge rounded-pill bg-light text-dark px-3 py-2 border">Last 6 Months</span>
                </div>
                <div style={{ height: "350px", position: "relative" }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            </>
          )}

        </div>
      ) : (
        <Outlet />
      )}
    </DashboardLayout>
  );
}