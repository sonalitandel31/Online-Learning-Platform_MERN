import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaBook,
  FaChartLine,
  FaClipboardList,
  FaChevronDown,
  FaChevronUp,
  FaSignOutAlt,
  FaUsers,
  FaRupeeSign,
  FaBars,
  FaTimes
} from "react-icons/fa";

export default function DashboardLayout({ sidebarLinks, children }) {
  const [openSections, setOpenSections] = useState({});
  // Mobile par default false (close) rahega
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 992);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem("role") || "instructor";

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      // Agar screen resize hoke mobile size pe aaye toh sidebar close kar do
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSection = (label) => {
    setOpenSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
    window.location.reload();
  };

  const styles = {
    sidebar: {
      backgroundColor: "#6f42c1",
      minHeight: "100vh",
      width: isSidebarOpen ? "320px" : "0px",
      display: "flex",
      flexDirection: "column",
      padding: isSidebarOpen ? "2rem 1rem" : "0px",
      position: isMobile ? "fixed" : "relative",
      zIndex: 1050,
      transition: "all 0.3s ease",
      overflowX: "hidden",
      boxShadow: isMobile && isSidebarOpen ? "4px 0px 10px rgba(0,0,0,0.2)" : "none",
    },
    sidebarLink: {
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      padding: "10px 15px",
      borderRadius: "8px",
      marginBottom: "8px",
      textDecoration: "none",
      fontWeight: 500,
      cursor: "pointer",
      transition: "background 0.3s",
      whiteSpace: "nowrap",
    },
    nestedLink: {
      paddingLeft: "35px",
      fontSize: "0.9rem",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "6px",
      textDecoration: "none",
      color: "white",
      borderRadius: "6px",
      padding: "8px 12px",
      transition: "background 0.3s",
      whiteSpace: "nowrap",
    },
    main: {
      flexGrow: 1,
      padding: isMobile ? "15px" : "30px",
      backgroundColor: "#f9f7fc",
      minHeight: "100vh",
      width: "100%",
      transition: "all 0.3s ease",
      marginTop: isMobile ? "60px" : "0px",
    },
    mobileHeader: {
      display: isMobile ? "flex" : "none",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      height: "60px",
      backgroundColor: "#6f42c1",
      color: "white",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1040,
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: "flex", position: "relative" }}>
      
      <div style={styles.mobileHeader}>
        <h5 className="m-0 fw-bold">Dashboard</h5>
        <button 
          className="btn text-white p-0" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1049
          }}
        />
      )}
      
      <div style={styles.sidebar}>
        <h3 className="text-center fw-bold mb-5 text-white">
          <Link
            to={userRole === "admin" ? "/admin-dashboard" : "/instructor-dashboard"}
            style={{ textDecoration: "none", color: "white" }}
          >
            Dashboard
          </Link>
        </h3>

        <div className="flex-grow-1">
          {Array.isArray(sidebarLinks) &&
            sidebarLinks.map((link, idx) => (
              <div key={idx}>
                <div
                  style={{
                    ...styles.sidebarLink,
                    backgroundColor: openSections[link.label] ? "#5931a0" : "transparent",
                  }}
                  onClick={() => toggleSection(link.label)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {link.icon} {link.label}
                  </span>
                  {Array.isArray(link.children) &&
                    (openSections[link.label] ? <FaChevronUp /> : <FaChevronDown />)}
                </div>

                {Array.isArray(link.children) &&
                  openSections[link.label] &&
                  link.children.map((child, cidx) =>
                    child?.path && child?.label ? (
                      <Link
                        key={cidx}
                        to={child.path}
                        onClick={() => isMobile && setIsSidebarOpen(false)}
                        style={{
                          ...styles.nestedLink,
                          backgroundColor: isActive(child.path) ? "#5931a0" : "transparent",
                        }}
                      >
                        - {child.label}
                      </Link>
                    ) : null
                  )}
              </div>
            ))}
        </div>

        <hr style={{ borderColor: "rgba(255,255,255,0.3)" }} />

        <div
          style={{
            ...styles.sidebarLink,
            backgroundColor: "#dc3545",
            justifyContent: "center",
          }}
          onClick={handleLogout}
        >
          <FaSignOutAlt style={{ marginRight: "10px" }} />
          Logout
        </div>
      </div>

      <div style={styles.main}>
        <div className="container-fluid">
          {children}
        </div>
      </div>
    </div>
  );
}

// ... Sidebar Links Exports (Same as before)
export const instructorSidebarLinks = [
    {
      label: "Courses",
      icon: <FaBook />,
      children: [
        { label: "My Courses", path: "/instructor-dashboard/instructor_courses" },
        { label: "Add New Course", path: "/instructor-dashboard/add_courses" },
        { label: "Pending Approvals", path: "/instructor-dashboard/pending_approvals" },
        { label: "Course Discussions", path: "/instructor-dashboard/course-discussions" }
      ],
    },
    {
      label: "Categories",
      icon: <FaBook />,
      children: [
        { label: "Request Category", path: "/instructor-dashboard/request-category" },
      ],
    },
    {
      label: "Lessons",
      icon: <FaBook />,
      children: [
        { label: "Manage Lessons", path: "/instructor-dashboard/manage_lessons" },
      ],
    },
    {
      label: "Exams",
      icon: <FaClipboardList />,
      children: [
        { label: "Manage Exams", path: "/instructor-dashboard/manage_exams" },
      ],
    },
    {
      label: "Students",
      icon: <FaUser />,
      children: [
        { label: "Enrolled Students", path: "/instructor-dashboard/enrolled_students" },
      ],
    },
    {
      label: "Earnings",
      icon: <FaRupeeSign />,
      children: [
        { label: "My Earnings", path: "/instructor-dashboard/earnings" },
        { label: "Payout History", path: "/instructor-dashboard/payout-history" },
      ],
    },
    {
      label: "Analytics / Reports",
      icon: <FaChartLine />,
      children: [
        { label: "Course Analytics", path: "/instructor-dashboard/course_analytics" },
        { label: "Student Progress", path: "/instructor-dashboard/student_progress" },
      ],
    },
  ];
  
  export const adminSidebarLinks = [
    {
      label: "Users",
      icon: <FaUsers />,
      children: [
        { label: "All Users", path: "/admin-dashboard/users" },
      ],
    },
    {
      label: "Courses",
      icon: <FaBook />,
      children: [
        { label: "All Courses", path: "/admin-dashboard/courses" },
        { label: "Pending Approval", path: "/admin-dashboard/pending-courses" },
        { label: "Rejected Courses", path: "/admin-dashboard/rejected-courses" },
      ],
    },
    {
      label: "Categories",
      icon: <FaBook />,
      children: [
        { label: "Manage Categories", path: "/admin-dashboard/categories" },
        { label: "Suggestions", path: "/admin-dashboard/category-suggestions" },
      ],
    },
    {
      label: "Payments & Revenue",
      icon: <FaRupeeSign />,
      children: [
        { label: "Earnings Overview", path: "/admin-dashboard/revenue" },
        { label: "Instructor Payouts", path: "/admin-dashboard/payouts" },
        { label: "Transactions", path: "/admin-dashboard/transactions" },
      ],
    },
    {
      label: "Reports & Analytics",
      icon: <FaClipboardList />,
      children: [
        { label: "Enrollment Stats", path: "/admin-dashboard/reports/enrollments" },
        { label: "Course Performance", path: "/admin-dashboard/reports/courses" },
      ],
    },
    {
      label: "Support",
      icon: <FaBell />,
      children: [
        { label: "Contact Messages", path: "/admin-dashboard/contact-messages" },
        { label: "Forum Discussions", path: "/admin-dashboard/discussions" }
      ],
    },
  ];