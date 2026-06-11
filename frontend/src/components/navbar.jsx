import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaUserCircle, FaSearch, FaBars, FaTimes, FaMap, FaChartBar,
  FaTachometerAlt, FaUser, FaBook, FaPlayCircle, FaCrown,
  FaFileInvoiceDollar, FaSignOutAlt, FaDownload
} from "react-icons/fa";
import "../styles/home.css";
import api from "../api/api";

import { useTheme } from '../context/ThemeContext';

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasEnrollment, setHasEnrollment] = useState(false);

  const { logoUrl } = useTheme();

  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  const role = useMemo(() => (localStorage.getItem("role") || "").toLowerCase(), [user]);

  const dashboardPath = useMemo(() => {
    if (role === "admin") return "/admin-dashboard";
    if (role === "instructor") return "/instructor-dashboard";
    if (role === "hr_manager") return "/hr-dashboard";
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
    window.location.reload();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    closeMenu();
    navigate(`/courses${searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery)}` : ""}`);
  };

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
          .custom-navbar {
            background: var(--primary-color, rgba(138, 74, 243, 0.85));
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            width: 100%;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1050;
            padding: 0.6rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Layout Alignment */
          .nav-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 0 1rem;
          }

          .navbar-brand { 
            font-weight: 800 !important; 
            font-size: 1.8rem !important; 
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            margin-right: 1.5rem;
          }

          /* Search Bar Animations */
          .search-wrapper { 
            position: relative; 
            flex-grow: 1; 
            max-width: 500px; 
            margin: 0 auto;
          }

          .search-input {
            border-radius: 50px !important;
            padding: 0.6rem 1.2rem 0.6rem 3.2rem !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            background: rgba(255, 255, 255, 0.15) !important;
            color: white !important;
            font-size: 0.95rem;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
            transition: all 0.3s ease !important;
            width: 100%;
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
            transition: color 0.3s ease;
          }
          .search-wrapper:focus-within .search-icon-inside {
            color: #FFD700;
          }

          /* Nav Links container */
          .right-nav-items {
            display: flex;
            align-items: center;
            gap: 1.5rem;
          }

          .nav-link-custom { 
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9) !important;
            position: relative;
            padding: 0.5rem 0 !important;
            text-decoration: none;
          }
          .nav-link-custom:hover { color: #ffffff !important; }

          /* Premium Login Button */
          .btn-login {
            color: var(--primary-color, #8A4AF3) !important;
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
            display: none; 
            border-radius: 16px !important;
            margin-top: 15px !important;
            padding: 10px !important;
            border: 1px solid rgba(0,0,0,0.05) !important;
            box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important;
            animation: slideUpFade 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 2000 !important;
            min-width: 240px;
            right: 0; 
            left: auto;
            position: absolute;
          }
          .dropdown-menu.show { display: block; }

          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          .dropdown-item {
            display: flex; align-items: center; border-radius: 10px !important;
            padding: 10px 16px !important; font-weight: 500; color: #4a5568 !important;
            transition: all 0.2s ease !important; margin-bottom: 2px;
          }
          .dropdown-item i, .dropdown-item svg {
            margin-right: 12px; font-size: 1.1rem; color: var(--primary-color, #8A4AF3);
            transition: transform 0.2s ease;
          }
          .dropdown-item:hover {
            background-color: #f5f0ff !important; color: var(--primary-color, #7b3ce0) !important;
          }
          .dropdown-item.text-danger { color: #e53e3e !important; }
          .dropdown-item.text-danger svg { color: #e53e3e; }
          .dropdown-item.text-danger:hover { background-color: #fff5f5 !important; color: #c53030 !important; }

          /* Profile Avatar */
          .profile-btn { transition: transform 0.3s ease; outline: none; }
          .profile-btn:hover { transform: scale(1.05); }
          .profile-img {
            width: 42px; height: 42px; border-radius: 50%;
            border: 2px solid #FFD700; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          }

          /* Mobile Nav Adjustments */
          @media (max-width: 991.98px) {
            .nav-container { flex-wrap: wrap; }
            .navbar-toggler { order: 2; margin-left: auto; }
            .search-wrapper { order: 3; max-width: 100%; margin: 1rem 0; width: 100%; }
            .right-nav-items { 
                flex-direction: column; width: 100%; gap: 1rem; align-items: flex-start;
                background: var(--primary-color, rgba(138, 74, 243, 0.98));
                padding: 1rem; border-radius: 12px; margin-top: 10px;
                display: none;
            }
            .right-nav-items.show { display: flex; }
            .dropdown-menu { position: static !important; width: 100%; box-shadow: none !important; border: none !important; background: transparent !important;}
            .dropdown-item { color: white !important;}
            .dropdown-item i, .dropdown-item svg { color: #FFD700 !important; }
            .dropdown-item:hover { background: rgba(255,255,255,0.1) !important;}
          }
          body { padding-top: 80px; }
        `}
      </style>

      <nav className="custom-navbar">
        <div className="container nav-container">

          {/* LEFT: BRAND / LOGO */}
          <Link className="navbar-brand" to="/">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Company Logo"
                style={{ height: '35px', maxWidth: '140px', objectFit: 'contain', background: 'transparent' }}
              />
            ) : (
              <h3 className="fw-bolder m-0 text-white">
                Learn<span style={{ color: '#ffca2c' }}>X</span>
              </h3>
            )}
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            className="navbar-toggler border-0 shadow-none d-lg-none"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
          >
            {isOpen ? <FaTimes size={24} color="white" /> : <FaBars size={24} color="white" />}
          </button>

          {/* CENTER: SEARCH BAR (Visible on Desktop) */}
          <form className={`search-wrapper ${isOpen ? "d-block d-lg-block" : "d-none d-lg-block"}`} onSubmit={handleSearch}>
            <FaSearch className="search-icon-inside" />
            <input
              className="form-control search-input"
              type="search"
              placeholder="Find your next course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* RIGHT: NAVIGATION LINKS & PROFILE */}
          <div className={`right-nav-items ${isOpen ? "show" : ""}`}>
            <Link className="nav-link-custom" to="/" onClick={closeMenu}>Home</Link>
            <Link className="nav-link-custom" to="/courses" onClick={closeMenu}>Courses</Link>

            {!user ? (
              <Link className="btn btn-login rounded-pill px-4 py-2 fw-bold" to="/login" onClick={closeMenu}>
                Login
              </Link>
            ) : (
              <div className="position-relative">
                <button
                  type="button"
                  className="profile-btn d-flex align-items-center bg-transparent border-0 p-0"
                  onClick={handleProfileClick}
                >
                  {user.profilePic ? (
                    <img
                      src={user.profilePic.startsWith("http") ? user.profilePic : `${BASE_URL}${user.profilePic}`}
                      alt="Profile"
                      className="profile-img"
                    />
                  ) : (
                    <FaUserCircle size={38} className="text-white" />
                  )}
                </button>

                <ul className={`dropdown-menu ${isProfileOpen ? "show" : ""}`}>
                  <div className="px-3 py-2 mb-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
                    <p className="mb-0 fw-bold fs-6" style={{ color: "var(--bs-gray-800)" }}>{user.name}</p>
                    <small className="text-muted">{user.email}</small>
                  </div>

                  {dashboardPath && (
                    <>
                      <li>
                        <Link className="dropdown-item" to={dashboardPath} onClick={closeMenu}>
                          <FaTachometerAlt /> Dashboard
                        </Link>
                      </li>
                      <li><hr className="dropdown-divider my-1" /></li>
                    </>
                  )}

                  <li><Link className="dropdown-item" to="/profile" onClick={closeMenu}><FaUser /> My Profile</Link></li>
                  <li><Link className="dropdown-item" to="/learning" onClick={closeMenu}><FaBook /> My Learnings</Link></li>

                  <li><Link className="dropdown-item" to="/downloads" onClick={closeMenu}><FaDownload /> My Downloads</Link></li>

                  {role === "student" && (
                    <>
                      <li><Link className="dropdown-item" to={learningPathRoute} onClick={closeMenu}><FaMap /> Learning Roadmap</Link></li>
                      <li><Link className="dropdown-item" to={skillAnalysisRoute} onClick={closeMenu}><FaChartBar /> Skill Intelligence</Link></li>
                      <li><hr className="dropdown-divider my-1" /></li>
                      
                      {hasEnrollment && (
                        <li><Link className="dropdown-item" to="/live-classes" onClick={closeMenu}><FaPlayCircle /> Live Classes</Link></li>
                      )}
                      
                      <li><Link className="dropdown-item" to={subscriptionPlansPath} onClick={closeMenu}><FaCrown /> Subscription Plans</Link></li>
                      <li><Link className="dropdown-item" to={mySubscriptionPath} onClick={closeMenu}><FaFileInvoiceDollar /> My Subscription</Link></li>
                    </>
                  )}

                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <button className="dropdown-item text-danger w-100 text-start" onClick={handleLogout}>
                      <FaSignOutAlt /> Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

        </div>
      </nav>
    </>
  );
};

export default Navbar;