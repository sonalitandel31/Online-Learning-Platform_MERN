import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  FaUserCircle, FaSearch, FaBars, FaTimes, FaMap, FaChartBar, 
  FaTachometerAlt, FaUser, FaBook, FaPlayCircle, FaCrown, 
  FaFileInvoiceDollar, FaSignOutAlt 
} from "react-icons/fa";
import "../styles/home.css";
import api from "../api/api";

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false); // Mobile Menu State
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Profile Dropdown State
  const [hasEnrollment, setHasEnrollment] = useState(false);

  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  const role = useMemo(() => (localStorage.getItem("role") || "").toLowerCase(), [user]);

  const dashboardPath = useMemo(() => {
    if (role === "admin") return "/admin-dashboard";
    if (role === "instructor") return "/instructor-dashboard";
    return null;
  }, [role]);

  const subscriptionPlansPath = "/subscription-plans";
  const mySubscriptionPath = "/me/subscription";
  const learningPathRoute = "/learning-path"; 
  const skillAnalysisRoute = "/skill-analysis"; 

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get("search") || "");
  }, [location.search]);

  // Close both menus when navigating
  const closeMenu = () => {
    setIsOpen(false);
    setIsProfileOpen(false);
  };

  const handleLogout = () => {
    closeMenu();
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    closeMenu();
    navigate(`/courses${searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery)}` : ""}`);
  };

  // Toggle profile dropdown manually via React
  const handleProfileClick = (e) => {
    e.preventDefault();
    setIsProfileOpen(!isProfileOpen);
  };

  const pickArray = (res) => {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.courses)) return d.courses;
    if (Array.isArray(d?.enrollments)) return d.enrollments;
    if (Array.isArray(d?.result)) return d.result;
    return [];
  };

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        if (role !== "student") {
          setHasEnrollment(false);
          return;
        }

        const token = localStorage.getItem("token") || "";
        if (!token) {
          setHasEnrollment(false);
          return;
        }

        const res = await api.get("/enrollments", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const enrollments = pickArray(res);
        const now = new Date();

        const ok = enrollments.some((e) => {
          const statusOk = e?.status === "active" || e?.status === "completed";
          const expiry = e?.expiryDate ? new Date(e.expiryDate) : null;
          const notExpired = !expiry || expiry >= now;
          return statusOk && notExpired;
        });

        setHasEnrollment(ok);
      } catch (err) {
        console.error("Enrollment check failed:", err);
        setHasEnrollment(false);
      }
    };

    checkEnrollment();
  }, [role]);

  return (
    <>
      <style>
        {`
          /* Core Navbar Glassmorphism */
          .custom-navbar {
            background: rgba(138, 74, 243, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            width: 100%;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1050;
            padding: 0.8rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Brand / Logo */
          .navbar-brand { 
            font-weight: 800 !important; 
            font-size: 1.8rem !important; 
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
          }
          .brand-x {
            color: #FFD700;
            text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
          }

          /* Search Bar Animations */
          .search-wrapper { 
            position: relative; 
            flex: 1; 
            max-width: 400px; 
            margin: 0 2rem;
            transition: max-width 0.4s ease;
          }
          .search-wrapper:focus-within {
            max-width: 480px;
          }

          .search-input {
            border-radius: 50px !important;
            padding: 0.7rem 1.2rem 0.7rem 3.2rem !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            background: rgba(255, 255, 255, 0.15) !important;
            color: white !important;
            font-size: 0.95rem;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .search-input::placeholder { color: rgba(255, 255, 255, 0.8); }
          .search-input:focus {
            background: rgba(255, 255, 255, 0.25) !important;
            border-color: rgba(255, 255, 255, 0.6) !important;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.2) !important;
            outline: none;
          }

          .search-icon-inside {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.9);
            z-index: 5;
            transition: transform 0.3s ease;
          }
          .search-wrapper:focus-within .search-icon-inside {
            transform: translateY(-50%) scale(1.1);
            color: #FFD700;
          }

          /* Nav Links */
          .nav-link-custom { 
            margin: 0 12px; 
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9) !important;
            position: relative;
            padding: 0.5rem 0 !important;
            transition: color 0.3s ease;
          }
          .nav-link-custom::after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: 0;
            left: 0;
            background-color: #FFD700;
            transition: width 0.3s ease;
            border-radius: 2px;
          }
          .nav-link-custom:hover { color: #ffffff !important; }
          .nav-link-custom:hover::after { width: 100%; }

          /* Premium Login Button */
          .btn-login {
            color: #8A4AF3 !important;
            background: white !important;
            border: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: all 0.3s ease !important;
          }
          .btn-login:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255,255,255,0.3);
          }

          /* Dropdown Styling */
          .dropdown-menu {
            display: none; /* Controlled via React state now */
            border-radius: 16px !important;
            margin-top: 15px !important;
            padding: 10px !important;
            border: 1px solid rgba(0,0,0,0.05) !important;
            box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important;
            animation: slideUpFade 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 2000 !important;
            min-width: 240px;
            right: 0; /* Align to right */
            left: auto;
          }
          
          /* Show class applied by React state */
          .dropdown-menu.show {
            display: block;
          }

          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          .dropdown-item {
            display: flex;
            align-items: center;
            border-radius: 10px !important;
            padding: 10px 16px !important;
            font-weight: 500;
            color: #4a5568 !important;
            transition: all 0.2s ease !important;
            margin-bottom: 2px;
          }
          .dropdown-item i, .dropdown-item svg {
            margin-right: 12px;
            font-size: 1.1rem;
            color: #8A4AF3;
            transition: transform 0.2s ease;
          }
          
          .dropdown-item:hover {
            background-color: #f5f0ff !important; 
            color: #7b3ce0 !important;
            transform: translateX(0.5px);
          }
          .dropdown-item:hover svg { transform: scale(1.1); }

          .dropdown-item.text-danger { color: #e53e3e !important; }
          .dropdown-item.text-danger svg { color: #e53e3e; }
          .dropdown-item.text-danger:hover {
            background-color: #fff5f5 !important;
            color: #c53030 !important;
          }

          /* Profile Avatar */
          .profile-btn { transition: transform 0.3s ease; outline: none; }
          .profile-btn:hover { transform: scale(1.05); }
          .profile-img {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 2px solid #FFD700;
            object-fit: cover;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          }

          /* Mobile Nav Adjustments */
          @media (max-width: 991.98px) {
            .navbar-collapse {
              background: rgba(138, 74, 243, 0.98);
              backdrop-filter: blur(20px);
              padding: 1.5rem;
              border-radius: 24px;
              margin-top: 15px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.3);
              border: 1px solid rgba(255,255,255,0.1);
              max-height: 80vh;
              overflow-y: auto;
            }
            .search-wrapper { 
              margin: 1rem 0 1.5rem 0; 
              max-width: 100%;
              order: -1; 
            }
            .nav-link-custom { padding: 12px 0 !important; border-bottom: 1px solid rgba(255,255,255,0.1); margin: 0; }
            .nav-link-custom::after { display: none; }
            
            /* Mobile Dropdown Fixes */
            .dropdown-menu {
              position: static !important; /* Forces it to flow with document instead of floating */
              background: rgba(255, 255, 255, 0.05) !important; /* Blends into mobile menu */
              border: none !important;
              box-shadow: none !important;
              padding-left: 10px !important;
              margin-top: 10px !important;
              animation: slideDown 0.3s ease;
            }
            
            @keyframes slideDown {
               from { opacity: 0; transform: translateY(-10px); }
               to { opacity: 1; transform: translateY(0); }
            }

            .dropdown-item {
              color: rgba(255, 255, 255, 0.9) !important;
            }
            .dropdown-item i, .dropdown-item svg {
              color: #FFD700 !important; /* Make icons pop on dark mobile background */
            }
            .dropdown-item:hover {
              background-color: rgba(255, 255, 255, 0.1) !important; 
              color: #ffffff !important;
            }
            .dropdown-item.text-danger { color: #ff8a8a !important; }
            .dropdown-item.text-danger svg { color: #ff8a8a !important; }
          }

          body { padding-top: 90px; }
        `}
      </style>

      <nav className="navbar navbar-expand-lg navbar-dark custom-navbar">
        <div className="container">
          <Link className="navbar-brand text-white" to="/" onClick={closeMenu}>
            Learn<span className="brand-x">X</span>
          </Link>

          <button
            className="navbar-toggler border-0 shadow-none"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
          >
            {isOpen ? <FaTimes size={24} color="white" /> : <FaBars size={24} color="white" />}
          </button>

          <div className={`collapse navbar-collapse ${isOpen ? "show" : ""}`}>
            
            <form className="search-wrapper" onSubmit={handleSearch}>
              <FaSearch className="search-icon-inside" />
              <input
                className="form-control search-input"
                type="search"
                placeholder="Find your next course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            <ul className="navbar-nav ms-auto align-items-lg-center">
              <li className="nav-item">
                <Link className="nav-link nav-link-custom" to="/" onClick={closeMenu}>
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link nav-link-custom" to="/courses" onClick={closeMenu}>
                  Courses
                </Link>
              </li>

              {!user ? (
                <li className="nav-item ms-lg-3 mt-3 mt-lg-0">
                  <Link
                    className="btn btn-login rounded-pill px-4 py-2 fw-bold w-100"
                    to="/login"
                    onClick={closeMenu}
                  >
                    Login
                  </Link>
                </li>
              ) : (
                <li className="nav-item dropdown ms-lg-4 mt-3 mt-lg-0 position-relative">
                  {/* Removed data-bs-toggle to manage via React state */}
                  <button
                    type="button"
                    className="nav-link profile-btn d-flex align-items-center bg-transparent border-0 p-0"
                    id="profileDropdown"
                    onClick={handleProfileClick}
                    style={{ cursor: "pointer" }}
                  >
                    {user.profilePic ? (
                      <img
                        src={
                          user.profilePic.startsWith("http")
                            ? user.profilePic
                            : `${BASE_URL}${user.profilePic}`
                        }
                        alt="Profile"
                        className="profile-img"
                      />
                    ) : (
                      <div className="d-flex align-items-center">
                         <FaUserCircle size={38} className="text-white" />
                         <span className="d-lg-none text-white ms-3 fw-bold">My Account</span>
                      </div>
                    )}
                  </button>

                  {/* Conditionally add 'show' class based on state */}
                  <ul className={`dropdown-menu dropdown-menu-end ${isProfileOpen ? "show" : ""}`}>
                    
                    <div className="px-3 py-2 mb-2 d-lg-none" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <p className="mb-0 fw-bold fs-6" style={{ color: "var(--bs-gray-800)" }}>{user.name}</p>
                      <small className="opacity-75">{user.email}</small>
                    </div>

                    {dashboardPath && (
                      <>
                        <li>
                          <Link className="dropdown-item" to={dashboardPath} onClick={closeMenu}>
                            <FaTachometerAlt /> Dashboard
                          </Link>
                        </li>
                        <li><hr className="dropdown-divider my-1 d-none d-lg-block" /></li>
                      </>
                    )}

                    <li>
                      <Link className="dropdown-item" to="/profile" onClick={closeMenu}>
                        <FaUser /> My Profile
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/learning" onClick={closeMenu}>
                        <FaBook /> My Learnings
                      </Link>
                    </li>

                    {role === "student" && (
                      <>
                        <li>
                          <Link className="dropdown-item" to={learningPathRoute} onClick={closeMenu}>
                            <FaMap /> Learning Roadmap
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item" to={skillAnalysisRoute} onClick={closeMenu}>
                            <FaChartBar /> Skill Intelligence
                          </Link>
                        </li>
                      </>
                    )}

                    {role === "student" && (
                      <>
                        <li><hr className="dropdown-divider my-1 d-none d-lg-block" /></li>

                        {hasEnrollment && (
                          <li>
                            <Link className="dropdown-item" to="/live-classes" onClick={closeMenu}>
                              <FaPlayCircle /> Live Classes
                            </Link>
                          </li>
                        )}
                        <li>
                          <Link className="dropdown-item" to={subscriptionPlansPath} onClick={closeMenu}>
                            <FaCrown /> Subscription Plans
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item" to={mySubscriptionPath} onClick={closeMenu}>
                            <FaFileInvoiceDollar /> My Subscription
                          </Link>
                        </li>
                      </>
                    )}

                    <li><hr className="dropdown-divider my-1 d-none d-lg-block" /></li>
                    <li>
                      <button className="dropdown-item text-danger w-100 text-start" onClick={handleLogout}>
                        <FaSignOutAlt /> Logout
                      </button>
                    </li>
                  </ul>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;