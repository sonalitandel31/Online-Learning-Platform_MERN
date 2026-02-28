import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { track } from "../../utils/track";
import "bootstrap/dist/css/bootstrap.min.css";
import { 
  FiUser, FiEdit, FiShield, FiMail, FiBookOpen, 
  FiCamera, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiChevronRight
} from "react-icons/fi";
import { FaFire, FaMedal } from "react-icons/fa";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("view"); // view | edit | password

  const [formData, setFormData] = useState({});
  const [userData, setUserData] = useState({});

  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  // Custom inline status banner
  const [status, setStatus] = useState({ message: "", type: "" });

  const BASE_URL = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");
  const DEFAULT_PROFILE = `${BASE_URL}/uploads/default.png`;

  const showNotification = (msg, type = "danger") => {
    setStatus({ message: msg, type });
    setTimeout(() => setStatus({ message: "", type: "" }), 4500);
  };

  useEffect(() => {
    return () => {
      if (profilePicPreview) URL.revokeObjectURL(profilePicPreview);
    };
  }, [profilePicPreview]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile");
        const userDataFromApi = res.data.user;
        const profileDataFromApi = res.data.profile;

        const fullPicUrl = userDataFromApi?.profilePic
          ? userDataFromApi.profilePic.startsWith("http")
            ? userDataFromApi.profilePic
            : `${BASE_URL}${userDataFromApi.profilePic}`
          : DEFAULT_PROFILE;

        setUser(userDataFromApi);
        setProfile(profileDataFromApi);

        setUserData({
          name: userDataFromApi?.name || "",
          email: userDataFromApi?.email || "",
        });

        setProfilePicUrl(fullPicUrl);
        setFormData(profileDataFromApi || {});

        track("profile_view", {
          userId: userDataFromApi?._id,
          role: userDataFromApi?.role,
        });
      } catch (err) {
        console.error("Fetch profile error:", err.response?.data || err);
        showNotification("Failed to load profile.", "danger");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setModeTracked = (nextMode) => {
    track("profile_tab_change", { from: mode, to: nextMode });
    if (nextMode === "edit") track("profile_edit_open", { userId: user?._id });
    setMode(nextMode);
  };

  const handleUserChange = (e) =>
    setUserData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfilePicFile(file);

    track("profile_photo_select", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (profilePicPreview) URL.revokeObjectURL(profilePicPreview);
    const newPreview = URL.createObjectURL(file);
    setProfilePicPreview(newPreview);
  };

  const handleSave = async () => {
    try {
      track("profile_update_attempt", { userId: user?._id });

      const data = new FormData();

      Object.entries(userData).forEach(([key, value]) => data.append(key, value));

      Object.entries(formData).forEach(([key, value]) => {
        if (
          ![
            "_id",
            "user",
            "__v",
            "createdAt",
            "updatedAt",
            "coursesCreated",
            "enrolledCourses",
            "xpTotal",
            "xpByCourse",
            "streakCount",
            "lastStreakDate",
            "badges",
          ].includes(key)
        ) {
          data.append(key, Array.isArray(value) ? value.join(",") : value);
        }
      });

      if (profilePicFile instanceof File) data.append("profilePic", profilePicFile);

      const res = await api.put("/profile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedPic = res.data.user?.profilePic
        ? res.data.user.profilePic.startsWith("http")
          ? res.data.user.profilePic
          : `${BASE_URL}${res.data.user.profilePic}`
        : DEFAULT_PROFILE;

      setUser((prev) => ({ ...prev, ...userData, profilePic: updatedPic }));
      setProfile((prev) => ({ ...prev, ...formData }));
      setProfilePicUrl(updatedPic);

      setProfilePicFile(null);
      if (profilePicPreview) URL.revokeObjectURL(profilePicPreview);
      setProfilePicPreview(null);

      localStorage.setItem(
        "user",
        JSON.stringify({ ...res.data.user, profilePic: updatedPic })
      );

      track("profile_update_success", { userId: res.data.user?._id });

      showNotification("Profile updated successfully!", "success");
      setMode("view");
    } catch (err) {
      track("profile_update_failed", {
        userId: user?._id,
        message: err?.response?.data?.message || err?.message,
      });
      showNotification(err.response?.data?.message || "Failed to update profile", "danger");
    }
  };

  const handlePasswordChange = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwords;

    track("password_change_attempt", { userId: user?._id });

    if (!oldPassword || !newPassword || !confirmPassword) {
      track("password_change_failed", { reason: "missing_fields" });
      showNotification("Please fill all fields", "danger");
      return;
    }

    if (newPassword.length <= 6 || newPassword.length >= 10) {
      track("password_change_failed", { reason: "length_invalid" });
      showNotification("Password must be between 7 and 9 characters", "danger");
      return;
    }

    if (newPassword !== confirmPassword) {
      track("password_change_failed", { reason: "mismatch" });
      showNotification("Passwords do not match", "danger");
      return;
    }

    try {
      await api.put("/profile/password", passwords);
      track("password_change_success", { userId: user?._id });
      showNotification("Password changed successfully!", "success");
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setMode("view");
    } catch (err) {
      track("password_change_failed", {
        reason: "api_error",
        message: err?.response?.data?.message || err?.message,
      });
      showNotification(err.response?.data?.message || "Failed to change password", "danger");
    }
  };

  const excludeFields = useMemo(
    () => ["_id", "user", "__v", "createdAt", "updatedAt", "coursesCreated", "enrolledCourses"],
    []
  );

  const isGamificationKey = (k) =>
    ["xpByCourse", "badges", "lastStreakDate", "xpTotal", "streakCount"].includes(k);

  const formatLabel = (k) =>
    String(k).replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();

  const formatDate = (d) => {
    if (!d) return "Not set";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "Not set";
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isObjectIdLike = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

  const displayPic = profilePicPreview || profilePicUrl || DEFAULT_PROFILE;
  const courses = user?.role === "student" ? profile?.enrolledCourses : null;

  const renderXpByCourse = (xpByCourse) => {
    if (!Array.isArray(xpByCourse) || xpByCourse.length === 0) return null;

    return (
      <div className="row g-3">
        {xpByCourse.map((item, idx) => {
          const courseTitle = item?.course?.title || item?.course?.name || (typeof item?.course === "string" ? item.course : "Course");
          return (
            <div className="col-md-6" key={item?.course?._id || idx}>
              <div className="d-flex align-items-center justify-content-between p-3 rounded-4 bg-white border border-light shadow-sm transition-all hover-shadow">
                <div className="fw-semibold text-dark text-truncate pe-3" style={{ maxWidth: "75%" }}>
                  {isObjectIdLike(courseTitle) ? "Course" : courseTitle}
                </div>
                <div className="fw-bold" style={{ color: "#7C3AED" }}>
                  {item?.xp ?? 0} <span className="small text-muted fw-normal">XP</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBadges = (badges) => {
    if (!Array.isArray(badges) || badges.length === 0) return null;

    return (
      <div className="row g-3 mt-1">
        {badges.map((badge, idx) => (
          <div className="col-md-6" key={badge?.key || idx}>
            <div className="d-flex align-items-center gap-3 p-3 rounded-4 bg-white border border-light shadow-sm">
              <div 
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 48, height: 48, background: "#FFFBEB", color: "#F59E0B", fontSize: "20px" }}
              >
                {badge?.icon || <FaMedal />}
              </div>
              <div>
                <div className="fw-bold text-dark">{badge?.title || badge?.key || "Badge"}</div>
                {badge?.earnedAt && (
                  <div className="text-muted small mt-1">{formatDate(badge.earnedAt)}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: "80vh", background: "#FAF5FF" }}>
        <div className="spinner-border" style={{ color: "#7C3AED" }} role="status" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
        <div className="text-center p-5 bg-white rounded-4 shadow-sm border" style={{ maxWidth: 400 }}>
          <FiShield size={48} className="mb-3 text-muted" />
          <h4 className="fw-bold text-dark">Session Expired</h4>
          <p className="text-muted mb-4">Please log in again to access your profile.</p>
          <button className="btn w-100 fw-semibold py-2 rounded-pill" style={{ background: "#7C3AED", color: "white" }} onClick={() => navigate("/login")}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F3FF", padding: "60px 16px 40px", fontFamily: "'Inter', sans-serif", marginTop:"-1%" }}>
      <div className="container px-0" style={{ maxWidth: 900 }}>
        
        {status.message && (
          <div 
            className="d-flex align-items-center gap-2 p-3 mb-4 rounded-3 shadow-sm animate-fade-in"
            style={{ 
              backgroundColor: status.type === "success" ? "#ECFDF5" : "#FEF2F2", 
              color: status.type === "success" ? "#065F46" : "#991B1B",
              borderLeft: `4px solid ${status.type === "success" ? "#10B981" : "#EF4444"}`
            }}
          >
            {status.type === "success" ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
            <span className="fw-medium flex-grow-1">{status.message}</span>
            <button className="btn-close" style={{ fontSize: "10px" }} onClick={() => setStatus({ message: "", type: "" })}></button>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="card border-0 rounded-4 shadow-sm overflow-hidden mb-4">
          <div 
            style={{ 
              height: "88px", 
              // background: "linear-gradient(135deg, #7C3AED 0%, #853bf5 100%)",
              position: "relative" 
            }}
          >
            {/* Subtle overlay pattern could go here */}
            <div style={{ position: "absolute", right: 20, top: 20, opacity: 0.2 }}>
               <FiBookOpen size={100} color="white" />
            </div>
          </div>
          
          <div className="bg-white px-4 px-md-5 pb-4 position-relative">
            <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-end gap-4" style={{ marginTop: "-60px" }}>
              <div 
                className="rounded-circle bg-white p-1 shadow" 
                style={{ width: 130, height: 130, zIndex: 2 }}
              >
                <img
                  src={displayPic}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: "100%", height: "100%", objectFit: "cover", border: "3px solid #F59E0B" }}
                />
              </div>
              <div className="text-center text-sm-start flex-grow-1 pb-sm-2">
                <h2 className="fw-bolder text-dark mb-1">{user.name}</h2>
                <div className="text-muted d-flex align-items-center justify-content-center justify-content-sm-start gap-2">
                  <FiMail /> {user.email}
                </div>
              </div>
              <div className="pb-sm-3">
                <span className="badge rounded-pill fw-bold" style={{ background: "#FEF3C7", color: "#D97706", padding: "8px 16px", letterSpacing: "0.5px" }}>
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white p-2 rounded-4 shadow-sm mb-4 d-flex justify-content-center justify-content-md-start flex-wrap gap-2">
          <button
            className="btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all"
            style={{ 
              background: mode === "view" ? "#8f58ee" : "transparent", 
              color: mode === "view" ? "white" : "#6B7280",
              border: "none"
            }}
            onClick={() => setModeTracked("view")}
          >
            <FiUser size={18} /> Overview
          </button>
          <button
            className="btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all"
            style={{ 
              background: mode === "edit" ? "#8f58ee" : "transparent", 
              color: mode === "edit" ? "white" : "#6B7280",
              border: "none"
            }}
            onClick={() => setModeTracked("edit")}
          >
            <FiEdit size={18} /> Edit Profile
          </button>
          <button
            className="btn rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 transition-all"
            style={{ 
              background: mode === "password" ? "#8f58ee" : "transparent", 
              color: mode === "password" ? "white" : "#6B7280",
              border: "none"
            }}
            onClick={() => setModeTracked("password")}
          >
            <FiShield size={18} /> Security
          </button>
        </div>

        {/* Main Content Area */}
        <div className="card border-0 rounded-4 shadow-sm p-4 p-md-5">
          
          {/* VIEW MODE */}
          {mode === "view" && (
            <div className="animate-fade-in">
              <h5 className="fw-bold mb-4" style={{ color: "#4C1D95" }}>Personal Information</h5>
              <div className="row g-4 mb-5">
                <div className="col-md-6">
                  <div className="p-3 rounded-4 bg-light border-0">
                    <span className="d-block text-muted small fw-semibold text-uppercase mb-1">Full Name</span>
                    <span className="fw-bold text-dark fs-6">{user.name}</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 rounded-4 bg-light border-0">
                    <span className="d-block text-muted small fw-semibold text-uppercase mb-1">Email Address</span>
                    <span className="fw-bold text-dark fs-6">{user.email}</span>
                  </div>
                </div>
                {profile && Object.entries(profile)
                  .filter(([k]) => !excludeFields.includes(k) && !isGamificationKey(k))
                  .map(([k, v]) => (
                    <div className="col-md-6" key={k}>
                      <div className="p-3 rounded-4 bg-light border-0">
                        <span className="d-block text-muted small fw-semibold text-uppercase mb-1">{formatLabel(k)}</span>
                        <span className="fw-bold text-dark fs-6">{Array.isArray(v) ? v.join(", ") : v || "Not specified"}</span>
                      </div>
                    </div>
                ))}
              </div>

              {(typeof profile?.xpTotal === "number" || profile?.streakCount > 0) && (
                <>
                  <h5 className="fw-bold mb-4 mt-5" style={{ color: "#4C1D95" }}>Performance & Achievements</h5>
                  <div className="row g-4 mb-4">
                    {typeof profile?.xpTotal === "number" && (
                      <div className="col-sm-6 col-md-4">
                        <div className="p-4 rounded-4 border-0 text-center shadow-sm" style={{ background: "#F5F3FF" }}>
                          <FiTrendingUp size={24} className="mb-2" style={{ color: "#7C3AED" }} />
                          <div className="text-muted small fw-semibold">Total XP</div>
                          <div className="fw-bolder fs-3 mt-1" style={{ color: "#4C1D95" }}>{profile.xpTotal}</div>
                        </div>
                      </div>
                    )}
                    {typeof profile?.streakCount === "number" && (
                      <div className="col-sm-6 col-md-4">
                        <div className="p-4 rounded-4 border-0 text-center shadow-sm" style={{ background: "#FFFBEB" }}>
                          <FaFire size={24} className="mb-2" style={{ color: "#F59E0B" }} />
                          <div className="text-muted small fw-semibold">Current Streak</div>
                          <div className="fw-bolder fs-3 mt-1" style={{ color: "#B45309" }}>{profile.streakCount}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {renderXpByCourse(profile?.xpByCourse)}
                  {renderBadges(profile?.badges)}
                </>
              )}

              {user.role === "student" && Array.isArray(courses) && courses.length > 0 && (
                <>
                  <h5 className="fw-bold mb-4 mt-5" style={{ color: "#4C1D95" }}>Enrolled Courses</h5>
                  <div className="d-flex flex-column gap-3">
                    {courses.map((c) => (
                      <button
                        type="button"
                        key={c._id}
                        className="btn text-start p-3 rounded-4 shadow-sm border border-light d-flex justify-content-between align-items-center"
                        style={{ background: "#fff", transition: "all 0.2s ease" }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 .125rem .25rem rgba(0,0,0,.075)"; }}
                        onClick={() => {
                          track("profile_course_click", { courseId: c._id, title: c.title });
                          navigate(`/courses/${c._id}`);
                        }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-circle" style={{ background: "#F5F3FF", color: "#7C3AED" }}>
                            <FiBookOpen size={20} />
                          </div>
                          <span className="fw-bold text-dark fs-6">{c.title}</span>
                        </div>
                        <div className="p-1 rounded-circle" style={{ background: "#FFFBEB", color: "#F59E0B" }}>
                           <FiChevronRight size={20} />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* EDIT MODE */}
          {mode === "edit" && (
            <div className="animate-fade-in row justify-content-center">
              <div className="col-lg-8">
                <div className="d-flex flex-column align-items-center mb-5">
                  <div className="position-relative">
                    <img
                      src={displayPic}
                      alt="Preview"
                      className="rounded-circle shadow-sm"
                      style={{ width: 120, height: 120, objectFit: "cover", border: "4px solid #F5F3FF" }}
                    />
                    <label 
                      className="position-absolute bottom-0 end-0 p-2 rounded-circle shadow cursor-pointer" 
                      style={{ background: "#F59E0B", color: "white", border: "2px solid white", cursor: "pointer" }}
                    >
                      <FiCamera size={18} />
                      <input type="file" className="d-none" onChange={handleProfilePicChange} accept="image/*" />
                    </label>
                  </div>
                  <span className="text-muted small mt-2 fw-medium">Upload a new photo (JPG/PNG)</span>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold text-dark">Full Name</label>
                  <input
                    className="form-control form-control-lg bg-light border-0 rounded-3 px-3 py-2 fs-6"
                    type="text"
                    name="name"
                    value={userData.name || ""}
                    onChange={handleUserChange}
                  />
                </div>

                {Object.entries(formData)
                  .filter(([k]) => !excludeFields.includes(k) && !isGamificationKey(k))
                  .map(([k, v]) => (
                    <div className="mb-4" key={k}>
                      <label className="form-label fw-semibold text-dark text-capitalize">
                        {formatLabel(k)}
                      </label>
                      <input
                        className="form-control form-control-lg bg-light border-0 rounded-3 px-3 py-2 fs-6"
                        type="text"
                        value={Array.isArray(v) ? v.join(", ") : v || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            [k]: Array.isArray(v)
                              ? e.target.value.split(",").map((i) => i.trim()).filter(Boolean)
                              : e.target.value,
                          }))
                        }
                      />
                    </div>
                ))}

                <button
                  className="btn btn-lg w-100 fw-bold rounded-pill shadow-sm mt-3"
                  style={{ background: "#8f58ee", color: "white" }}
                  onClick={handleSave}
                >
                  Save Profile Changes
                </button>
              </div>
            </div>
          )}

          {/* PASSWORD MODE */}
          {mode === "password" && (
            <div className="animate-fade-in row justify-content-center">
              <div className="col-lg-7">
                <div className="text-center mb-4">
                  <div className="d-inline-flex p-3 rounded-circle mb-3 bg-light text-muted">
                    <FiShield size={32} />
                  </div>
                  <h5 className="fw-bold" style={{ color: "#4C1D95" }}>Update Password</h5>
                  <p className="text-muted small">Protect your account with a secure password.</p>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold text-dark">Current Password</label>
                  <input
                    className="form-control form-control-lg bg-light border-0 rounded-3 px-3 py-2 fs-6"
                    type="password"
                    value={passwords.oldPassword}
                    onChange={(e) => setPasswords((p) => ({ ...p, oldPassword: e.target.value }))}
                  />
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between">
                    <label className="form-label fw-semibold text-dark">New Password</label>
                    <span className="text-muted small">7-9 characters</span>
                  </div>
                  <input
                    className="form-control form-control-lg bg-light border-0 rounded-3 px-3 py-2 fs-6"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                  />
                </div>

                <div className="mb-5">
                  <label className="form-label fw-semibold text-dark">Confirm New Password</label>
                  <input
                    className="form-control form-control-lg bg-light border-0 rounded-3 px-3 py-2 fs-6"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                  />
                </div>

                <button
                  className="btn btn-lg w-100 fw-bold rounded-pill shadow-sm"
                  style={{ background: "#F59E0B", color: "white" }}
                  onClick={handlePasswordChange}
                >
                  Update Security Settings
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}