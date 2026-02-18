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

const findActiveSectionLabel = (links, pathname) => {
  if (!Array.isArray(links)) return null;

  for (const section of links) {
    if (!section) continue;

    // if section itself has a path (future-proof)
    if (section.path && pathname.startsWith(section.path)) return section.label;

    if (Array.isArray(section.children)) {
      for (const child of section.children) {
        if (child?.path && pathname.startsWith(child.path)) {
          return section.label;
        }
      }
    }
  }
  return null;
};


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

  useEffect(() => {
    const activeLabel = findActiveSectionLabel(sidebarLinks, location.pathname);
    if (!activeLabel) return;

    setOpenSections({ [activeLabel]: true });
  }, [location.pathname, sidebarLinks]);

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
      width: isSidebarOpen ? "340px" : "0px",
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

  // const isActive = (path) => location.pathname === path;
  const isActive = (path) => location.pathname.startsWith(path);

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

export const instructorSidebarLinks = [
  {
    label: "Dashboard & Insights",
    icon: <FaChartLine />,
    children: [
      { label: "Engagement (DAU)", path: "/instructor-dashboard/engagement-analytics" },
      { label: "Course Events", path: "/instructor-dashboard/course-event-analytics" },
      { label: "Engagement Score", path: "/instructor-dashboard/engagement-score" },
      { label: "Drop-out Risk", path: "/instructor-dashboard/dropout-risk" },
      { label: "Lesson Drop-Off", path: "/instructor-dashboard/lesson-dropoff" },
      { label: "My Performance Score", path: "/instructor-dashboard/instructor-score" },
      { label: "Course Analytics", path: "/instructor-dashboard/course_analytics" },
      { label: "Student Progress", path: "/instructor-dashboard/student_progress" },
    ],
  },

  {
    label: "Course Management",
    icon: <FaBook />,
    children: [
      { label: "My Courses", path: "/instructor-dashboard/instructor_courses" },
      { label: "Add New Course", path: "/instructor-dashboard/add_courses" },
      { label: "Pending Approvals", path: "/instructor-dashboard/pending_approvals" },
      { label: "Manage Lessons", path: "/instructor-dashboard/manage_lessons" },
      { label: "Manage Exams", path: "/instructor-dashboard/manage_exams" },
    ],
  },

  {
    label: "Students & Community",
    icon: <FaUsers />,
    children: [
      { label: "Enrolled Students", path: "/instructor-dashboard/enrolled_students" },
      { label: "Course Discussions", path: "/instructor-dashboard/course-discussions" },
    ],
  },

  {
    label: "Categories",
    icon: <FaClipboardList />,
    children: [
      { label: "Request Category", path: "/instructor-dashboard/request-category" },
    ],
  },

  {
    label: "Earnings & Payouts",
    icon: <FaRupeeSign />,
    children: [
      { label: "My Earnings", path: "/instructor-dashboard/earnings" },
      { label: "Payout History", path: "/instructor-dashboard/payout-history" },
    ],
  },
];

export const adminSidebarLinks = [
  {
    label: "User Management",
    icon: <FaUsers />,
    children: [
      { label: "All Users", path: "/admin-dashboard/users" },
    ],
  },

  {
    label: "Course Management",
    icon: <FaBook />,
    children: [
      { label: "All Courses", path: "/admin-dashboard/courses" },
      { label: "Pending Approval", path: "/admin-dashboard/pending-courses" },
      { label: "Rejected Courses", path: "/admin-dashboard/rejected-courses" },
    ],
  },

  {
    label: "Categories",
    icon: <FaClipboardList />,
    children: [
      { label: "Manage Categories", path: "/admin-dashboard/categories" },
      { label: "Suggestions", path: "/admin-dashboard/category-suggestions" },
    ],
  },

  {
    label: "Payments & Finance",
    icon: <FaRupeeSign />,
    children: [
      { label: "Earnings Overview", path: "/admin-dashboard/revenue" },
      { label: "Instructor Payouts", path: "/admin-dashboard/payouts" },
      { label: "Transactions", path: "/admin-dashboard/transactions" },
    ],
  },

  {
    label: "Analytics & Reports",
    icon: <FaChartLine />,
    children: [
      { label: "Platform Analytics", path: "/admin-dashboard/analytics" },
      { label: "Engagement Heatmap", path: "/admin-dashboard/heatmap" },
      { label: "Platform Risk", path: "/admin-dashboard/platform-risk" },
      { label: "Instructor Ranking", path: "/admin-dashboard/instructor-ranking" },
      { label: "Enrollment Stats", path: "/admin-dashboard/reports/enrollments" },
      { label: "Course Performance", path: "/admin-dashboard/reports/courses" },
    ],
  },

  {
    label: "Support & Messages",
    icon: <FaBell />,
    children: [
      { label: "Contact Messages", path: "/admin-dashboard/contact-messages" },
      { label: "Forum Discussions", path: "/admin-dashboard/discussions" },
    ],
  },
];
