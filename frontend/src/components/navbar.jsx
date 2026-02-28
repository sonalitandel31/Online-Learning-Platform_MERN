import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaUserCircle, FaSearch, FaBars, FaTimes } from "react-icons/fa";
import "../styles/home.css";

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  // role from localStorage (e.g. "admin" | "instructor" | "student")
  const role = useMemo(() => (localStorage.getItem("role") || "").toLowerCase(), [user]);

  // dashboard route by role
  const dashboardPath = useMemo(() => {
    if (role === "admin") return "/admin-dashboard";
    if (role === "instructor") return "/instructor-dashboard";
    return null;
  }, [role]);

  // ✅ Student dropdown routes (keep consistent everywhere)
  const subscriptionPlansPath = "/subscription-plans"; // change if your route is different
  const mySubscriptionPath = "/me/subscription"; // change if your route is different

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get("search") || "");
  }, [location.search]);

  const closeMenu = () => setIsOpen(false);

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

  // Mobile: profile click pe collapse close kar do (dropdown conflict reduce)
  const handleProfileClick = () => {
    if (isOpen) setIsOpen(false);
  };

  return (
    <>
      <style>
        {`
          .custom-navbar {
            background: rgba(159, 100, 247, 0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            width: 100%;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1050;
            padding: 0.6rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            transition: all 0.3s ease;
          }

          .navbar-brand { 
            font-weight: 800 !important; 
            font-size: 1.6rem !important; 
            letter-spacing: -0.5px;
          }

          .search-wrapper { 
            position: relative; 
            flex: 1; 
            max-width: 450px; 
            margin: 0 1.5rem; 
          }

          .search-input {
            border-radius: 50px !important;
            padding: 0.6rem 1rem 0.6rem 2.8rem !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            font-size: 0.95rem;
            transition: all 0.3s ease !important;
          }

          .search-input::placeholder { color: rgba(255, 255, 255, 0.7); }

          .search-input:focus {
            background: rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 0 15px rgba(0,0,0,0.1) !important;
            outline: none;
          }

          .search-icon-inside {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.8);
            z-index: 5;
          }

          .nav-link { 
            margin: 0 8px; 
            font-weight: 500;
            opacity: 0.9;
            transition: all 0.2s ease;
          }

          .nav-link:hover { opacity: 1; transform: translateY(-1px); }

          .toggler-icon {
            color: white;
            font-size: 1.4rem;
          }

          /* Dropdown Styling */
          .dropdown-menu {
            border-radius: 12px !important;
            margin-top: 15px !important;
            border: 1px solid #eee !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
            animation: fadeIn 0.2s ease-out;
            z-index: 2000 !important; /* ✅ overlay conflict fix */
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @media (max-width: 991.98px) {
            .navbar-collapse {
              background: #9153f5;
              padding: 1.5rem;
              border-radius: 20px;
              margin-top: 15px;
              box-shadow: 0 15px 30px rgba(0,0,0,0.2);
            }
            .search-wrapper { 
              margin: 1rem 0; 
              max-width: 100%;
              order: -1; 
            }
            .nav-item { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .nav-item:last-child { border: none; }
          }

          body { padding-top: 80px; }
          
          .dropdown-item:active {
            background-color: #f3effb !important; 
            color: #c635dc !important;
          }

          .dropdown-item:hover {
            background-color: #f6eff6; 
          }

          .dropdown-item.text-danger:active {
            background-color: #f3effb !important;
            color: #dc4935 !important;
          }

          .dropdown-item.text-danger:hover {
            background-color: #fff4e6; 
          }
        `}
      </style>

      <nav className="navbar navbar-expand-lg navbar-dark custom-navbar">
        <div className="container">
          <Link className="navbar-brand text-white" to="/" onClick={closeMenu}>
            Learn<span style={{ color: "#FFD700" }}>X</span>
          </Link>

          <button
            className="navbar-toggler border-0 shadow-none"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
          >
            {isOpen ? <FaTimes className="toggler-icon" /> : <FaBars className="toggler-icon" />}
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
                <Link className="nav-link text-white" to="/" onClick={closeMenu}>
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link text-white" to="/courses" onClick={closeMenu}>
                  Courses
                </Link>
              </li>

              {!user ? (
                <li className="nav-item ms-lg-2">
                  <Link
                    className="btn btn-white bg-white rounded-pill px-4 fw-bold w-100"
                    style={{ color: "#9f64f7", border: "none" }}
                    to="/login"
                    onClick={closeMenu}
                  >
                    Login
                  </Link>
                </li>
              ) : (
                <li className="nav-item dropdown ms-lg-3">
                  <button
                    type="button"
                    className="nav-link dropdown-toggle d-flex align-items-center bg-transparent border-0 p-0"
                    id="profileDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
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
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.8)",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <FaUserCircle size={32} className="text-white" />
                    )}
                  </button>

                  <ul
                    className="dropdown-menu dropdown-menu-end p-2 border-0 shadow-lg"
                    aria-labelledby="profileDropdown"
                  >
                    <div
                      className="px-3 py-2 mb-1 d-lg-none"
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <p className="mb-0 fw-bold text-dark">{user.name}</p>
                      <small className="text-muted">{user.email}</small>
                    </div>

                    {dashboardPath && (
                      <>
                        <li>
                          <Link
                            className="dropdown-item rounded-2 py-2 fw-semibold"
                            to={dashboardPath}
                            onClick={closeMenu}
                          >
                            Dashboard
                          </Link>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                      </>
                    )}

                    <li>
                      <Link
                        className="dropdown-item rounded-2 py-2"
                        to="/profile"
                        onClick={closeMenu}
                      >
                        My Profile
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="dropdown-item rounded-2 py-2"
                        to="/learning"
                        onClick={closeMenu}
                      >
                        My Learnings
                      </Link>
                    </li>

                    {role === "student" && (
                      <>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>

                        <li>
                          <Link
                            className="dropdown-item rounded-2 py-2"
                            to={subscriptionPlansPath}
                            onClick={closeMenu}
                          >
                            Subscription Plans
                          </Link>
                        </li>
                        <li>
                          <Link
                            className="dropdown-item rounded-2 py-2"
                            to={mySubscriptionPath}
                            onClick={closeMenu}
                          >
                            My Subscription
                          </Link>
                        </li>
                      </>
                    )}

                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <button
                        className="dropdown-item text-danger rounded-2 py-2 fw-500"
                        onClick={handleLogout}
                      >
                        Logout
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