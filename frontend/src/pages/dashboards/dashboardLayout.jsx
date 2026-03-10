import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaBook,
  FaChartLine,
  FaClipboardList,
  FaChevronDown,
  FaSignOutAlt,
  FaUsers,
  FaRupeeSign,
  FaBars,
  FaTimes,
  FaVideo
} from "react-icons/fa";

const findActiveSectionLabel = (links, pathname) => {
  if (!Array.isArray(links)) return null;

  for (const section of links) {
    if (!section) continue;

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
  // Changed state to hold only a single active section name (string)
  const [openSection, setOpenSection] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem("role") || "instructor";

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const activeLabel = findActiveSectionLabel(sidebarLinks, location.pathname);
    if (!activeLabel) return;

    // Open the section corresponding to the current URL route
    setOpenSection(activeLabel);
  }, [location.pathname, sidebarLinks]);

  const toggleSection = (label) => {
    // If clicking the already open section, close it. Otherwise, open the new one (closing others).
    setOpenSection((prev) => (prev === label ? "" : label));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
    window.location.reload();
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const styles = {
    layout: {
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      backgroundColor: "#f8f9fc",
    },
    mobileHeader: {
      display: isMobile ? "flex" : "none",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      height: "65px",
      backgroundColor: "#6f42c1",
      color: "white",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1040,
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    },
    sidebar: {
      backgroundColor: "#6f42c1",
      width: "280px",
      display: "flex",
      flexDirection: "column",
      position: isMobile ? "fixed" : "relative",
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 1050,
      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      transform: isMobile
        ? isSidebarOpen
          ? "translateX(0)"
          : "translateX(-100%)"
        : "translateX(0)",
      boxShadow: isMobile && isSidebarOpen ? "4px 0px 20px rgba(0,0,0,0.25)" : "none",
    },
    sidebarHeader: {
      padding: "24px 20px",
      textAlign: "center",
    },
    navContainer: {
      flexGrow: 1,
      overflowY: "auto",
      padding: "0 12px 20px 12px",
    },
    sidebarLink: {
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      padding: "12px 16px",
      borderRadius: "8px",
      marginBottom: "6px",
      textDecoration: "none",
      fontWeight: 600,
      fontSize: "0.95rem",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      userSelect: "none",
    },
    nestedContainer: {
      paddingLeft: "26px",
      borderLeft: "2px solid rgba(255, 255, 255, 0.2)",
      marginLeft: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      overflow: "hidden",
      transition: "max-height 0.35s ease-in-out, opacity 0.3s ease-in-out, margin 0.3s ease-in-out",
    },
    nestedLink: {
      fontSize: "0.85rem",
      display: "flex",
      alignItems: "center",
      textDecoration: "none",
      color: "rgba(255, 255, 255, 0.8)",
      borderRadius: "6px",
      padding: "10px 12px",
      fontWeight: 500,
      whiteSpace: "nowrap",
    },
    main: {
      flexGrow: 1,
      padding: isMobile ? "85px 15px 20px 15px" : "30px 40px",
      overflowY: "auto",
      position: "relative",
    },
    backdrop: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 1045,
      opacity: isSidebarOpen ? 1 : 0,
      visibility: isSidebarOpen ? "visible" : "hidden",
      transition: "all 0.3s ease",
    },
    logoutBtn: {
      margin: "15px",
      backgroundColor: "rgba(220, 53, 69, 0.9)",
      justifyContent: "center",
      padding: "12px",
    },
  };

  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .nav-item:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .child-nav {
          transition: all 0.2s ease;
        }
        .child-nav:hover {
          background-color: rgba(255, 255, 255, 0.15) !important;
          color: white !important;
          transform: translateX(4px);
        }
      `}</style>

      <div style={styles.layout}>
        <div style={styles.mobileHeader}>
          <h5 className="m-0 fw-bold" style={{ letterSpacing: "0.5px" }}>
            My Dashboard
          </h5>
          <button
            className="btn text-white p-0"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {isMobile && (
          <div style={styles.backdrop} onClick={() => setIsSidebarOpen(false)} />
        )}

        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h4 className="m-0 fw-bold">
              <Link
                to={userRole === "admin" ? "/admin-dashboard" : "/instructor-dashboard"}
                style={{ textDecoration: "none", color: "white", letterSpacing: "1px" }}
              >
                Dashboard
              </Link>
            </h4>
          </div>

          <div style={styles.navContainer} className="sidebar-scroll">
            {Array.isArray(sidebarLinks) &&
              sidebarLinks.map((link, idx) => {
                // Check if this specific link is the currently open one
                const isOpen = openSection === link.label;

                return (
                  <div key={idx}>
                    <div
                      className="nav-item"
                      style={{
                        ...styles.sidebarLink,
                        backgroundColor: isOpen ? "rgba(0, 0, 0, 0.15)" : "transparent",
                      }}
                      onClick={() => toggleSection(link.label)}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ opacity: isOpen ? 1 : 0.8, fontSize: "1.1rem" }}>
                          {link.icon}
                        </span>
                        {link.label}
                      </span>
                      {Array.isArray(link.children) && (
                        <FaChevronDown
                          size={12}
                          style={{
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.3s ease-in-out"
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        ...styles.nestedContainer,
                        maxHeight: isOpen ? "500px" : "0px",
                        opacity: isOpen ? 1 : 0,
                        marginTop: isOpen ? "4px" : "0px",
                        marginBottom: isOpen ? "12px" : "0px",
                      }}
                    >
                      {Array.isArray(link.children) &&
                        link.children.map((child, cidx) =>
                          child?.path && child?.label ? (
                            <Link
                              key={cidx}
                              to={child.path}
                              onClick={() => isMobile && setIsSidebarOpen(false)}
                              className="child-nav"
                              style={{
                                ...styles.nestedLink,
                                backgroundColor: isActive(child.path)
                                  ? "rgba(255, 255, 255, 0.2)"
                                  : "transparent",
                                color: isActive(child.path) ? "white" : "rgba(255, 255, 255, 0.7)",
                                fontWeight: isActive(child.path) ? 600 : 500,
                              }}
                            >
                              {child.label}
                            </Link>
                          ) : null
                        )}
                    </div>
                  </div>
                );
              })}
          </div>

          <div
            className="nav-item"
            style={{ ...styles.sidebarLink, ...styles.logoutBtn }}
            onClick={handleLogout}
          >
            <FaSignOutAlt /> Logout
          </div>
        </div>

        <div style={styles.main} className="sidebar-scroll">
          <div className="container-fluid p-0">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

export const instructorSidebarLinks = [
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
    label: "Live Classes",
    icon: <FaVideo />, // or any icon you like (FaVideo is better if you import it)
    children: [
      { label: "Manage Live Classes", path: "/instructor-dashboard/live-classes" },
      { label: "Create Live Class", path: "/instructor-dashboard/live-classes/create" },
    ],
  },
  {
    label: "Earnings & Payouts",
    icon: <FaRupeeSign />,
    children: [
      { label: "My Earnings", path: "/instructor-dashboard/earnings" },
      { label: "Payout History", path: "/instructor-dashboard/payout-history" },
      { label: "Platform Policies", path: "/instructor-dashboard/platform-rules" }
    ],
  },
  {
    label: "Platform Insights",
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
    label: "Live Classes",
    icon: <FaVideo />,
    children: [
      { label: "All Live Classes", path: "/admin-dashboard/live-classes" },
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
    label: "Subscription & Plans",
    icon: <FaRupeeSign />,
    children: [
      { label: "Manage Plans", path: "/admin-dashboard/subscription-plans" },
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
  {
    label: "Settings",
    icon: <FaClipboardList />,
    children: [
      { label: "System Settings", path: "/admin-dashboard/system-settings" },
    ],
  },
];