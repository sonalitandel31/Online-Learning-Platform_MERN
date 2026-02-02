import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import "../../styles/profile.css";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("view");

  const [formData, setFormData] = useState({});
  const [userData, setUserData] = useState({});

  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // ✅ FIX 1: Separate file + preview URL (no memory leak)
  const [profilePicUrl, setProfilePicUrl] = useState(null); // string URL from server
  const [profilePicFile, setProfilePicFile] = useState(null); // File
  const [profilePicPreview, setProfilePicPreview] = useState(null); // objectURL

  // Custom notification state (No alerts/toasts)
  const [status, setStatus] = useState({ message: "", type: "" });

  const BASE_URL = import.meta.env.VITE_BASE_URL || "";
  const DEFAULT_PROFILE = `${BASE_URL}/uploads/default.png`;

  const showNotification = (msg, type = "error") => {
    setStatus({ message: msg, type });
    setTimeout(() => setStatus({ message: "", type: "" }), 5000);
  };

  // ✅ cleanup preview URL
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

        const fullPicUrl = userDataFromApi.profilePic
          ? userDataFromApi.profilePic.startsWith("http")
            ? userDataFromApi.profilePic
            : `${BASE_URL}${userDataFromApi.profilePic}`
          : DEFAULT_PROFILE;

        setUser(userDataFromApi);
        setProfile(profileDataFromApi);

        setUserData({
          name: userDataFromApi.name,
          email: userDataFromApi.email,
        });

        setProfilePicUrl(fullPicUrl);
        setFormData(profileDataFromApi || {});
      } catch (err) {
        console.error("Fetch profile error:", err.response?.data || err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [BASE_URL, DEFAULT_PROFILE]);

  const handleUserChange = (e) =>
    setUserData({ ...userData, [e.target.name]: e.target.value });

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfilePicFile(file);

    // revoke old preview then create new
    if (profilePicPreview) URL.revokeObjectURL(profilePicPreview);
    const newPreview = URL.createObjectURL(file);
    setProfilePicPreview(newPreview);
  };

  const handleSave = async () => {
    try {
      const data = new FormData();

      // user fields
      Object.entries(userData).forEach(([key, value]) => data.append(key, value));

      // profile fields (exclude system fields)
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

      const updatedPic = res.data.user.profilePic
        ? res.data.user.profilePic.startsWith("http")
          ? res.data.user.profilePic
          : `${BASE_URL}${res.data.user.profilePic}`
        : DEFAULT_PROFILE;

      setUser((prev) => ({ ...prev, ...userData, profilePic: updatedPic }));
      setProfile((prev) => ({ ...prev, ...formData }));

      setProfilePicUrl(updatedPic);

      // reset file states after save
      setProfilePicFile(null);
      if (profilePicPreview) URL.revokeObjectURL(profilePicPreview);
      setProfilePicPreview(null);

      localStorage.setItem(
        "user",
        JSON.stringify({ ...res.data.user, profilePic: updatedPic })
      );

      showNotification("Profile updated successfully!", "success");
      setMode("view");
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handlePasswordChange = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwords;

    if (!oldPassword || !newPassword || !confirmPassword) {
      showNotification("Please fill all fields");
      return;
    }

    // Validation: 7, 8, or 9 characters
    if (newPassword.length <= 6 || newPassword.length >= 10) {
      showNotification("Password must be between 7 and 9 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification("Passwords do not match");
      return;
    }

    try {
      await api.put("/profile/password", passwords);
      showNotification("Password changed successfully!", "success");
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setMode("view");
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to change password");
    }
  };

  if (loading)
    return (
      <div
        className="ml-course-loading"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "80vh",
          fontFamily: "'Inter', sans-serif",
          color: "#6D28D9",
        }}
      >
        <div className="ml-spinner" style={{ borderTopColor: "#6D28D9" }} />
        <p style={{ marginTop: "1rem", fontWeight: 500 }}>Loading profile...</p>
      </div>
    );

  if (!user)
    return (
      <div className="profile-simple-container">
        <p>Please log in again.</p>
      </div>
    );

  const excludeFields = [
    "_id",
    "user",
    "__v",
    "createdAt",
    "updatedAt",
    "coursesCreated",
    "enrolledCourses",
  ];

  const courses = user.role === "student" ? profile?.enrolledCourses : null;

  // ✅ helpers
  const formatLabel = (k) =>
    String(k)
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .trim()
      .toUpperCase();

  const formatDate = (d) => {
    if (!d) return "Not set";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "Not set";
    return dt.toLocaleString();
  };

  const isObjectIdLike = (v) =>
    typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

  const renderXpByCourse = (xpByCourse) => {
    if (!Array.isArray(xpByCourse) || xpByCourse.length === 0) {
      return <div className="empty-state">No XP earned yet</div>;
    }

    return (
      <div className="gamification-grid">
        {xpByCourse.map((item, idx) => {
          const courseTitle =
            item?.course?.title ||
            item?.course?.name ||
            (typeof item?.course === "string" ? item.course : "Course");

          const xp = item?.xp ?? 0;

          return (
            <div
              key={item?.course?._id || item?.course || idx}
              className="xp-card"
            >
              <div className="xp-card-title">
                {isObjectIdLike(courseTitle) ? "Course" : courseTitle}
              </div>
              <div className="xp-card-value">
                {xp} <span className="xp-unit">XP</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBadges = (badges) => {
    if (!Array.isArray(badges) || badges.length === 0) {
      return <div className="empty-state">No badges earned yet</div>;
    }

    return (
      <div className="badges-grid">
        {badges.map((badge, idx) => (
          <div key={badge?.key || idx} className="badge-card">
            <div className="badge-icon">{badge?.icon || "🏅"}</div>
            <div className="badge-info">
              <div className="badge-title">
                {badge?.title || badge?.key || "Badge"}
              </div>
              {badge?.description && (
                <div className="badge-desc">{badge.description}</div>
              )}
              <div className="badge-date">
                {badge?.earnedAt ? formatDate(badge.earnedAt) : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ✅ excludes gamification from edit inputs
  const isGamificationKey = (k) =>
    ["xpByCourse", "badges", "lastStreakDate", "xpTotal", "streakCount"].includes(
      k
    );

  const displayPic = profilePicPreview || profilePicUrl || DEFAULT_PROFILE;

  return (
    <div className="profile-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .profile-wrapper { padding: 40px 20px; min-height: 90vh; background: #f9fafb; font-family: 'Inter', sans-serif; color: #1f2937; }
        .profile-card { background: #ffffff; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05); max-width: 900px; margin: 0 auto; overflow: hidden; position: relative; }

        .profile-header { background: linear-gradient(135deg, #a16ff1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; color: white; position: relative; }
        .profile-pic-container { width: 140px; height: 140px; margin: 0 auto 20px; }
        .profile-pic { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 5px solid rgba(255, 255, 255, 0.3); box-shadow: 0 8px 20px rgba(0,0,0,0.15); background: white; }
        .user-name { font-size: 2rem; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
        .user-email { font-size: 1rem; opacity: 0.9; margin-top: 5px; font-weight: 400; }
        .user-role-badge { display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; }

        .profile-nav { padding: 20px 30px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
        .nav-btn { padding: 12px 24px; border: none; background: transparent; font-size: 0.95rem; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.3s ease; }
        .nav-btn:hover { color: #6D28D9; background: #f9fafb; border-radius: 8px 8px 0 0; }
        .nav-btn.active { color: #6D28D9; border-bottom-color: #6D28D9; }

        .profile-body { padding: 40px 30px; }

        .section-title { font-size: 1.1rem; font-weight: 700; color: #374151; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .section-title::after { content: ""; flex: 1; height: 1px; background: #e5e7eb; }

        .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        .info-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .info-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); border-color: #d1d5db; }
        .info-label { display: block; font-size: 0.75rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
        .info-value { font-size: 1rem; color: #111827; font-weight: 500; word-break: break-word; }

        .form-container { max-width: 600px; margin: 0 auto; }
        .input-group { margin-bottom: 24px; }
        .input-group label { display: block; margin-bottom: 8px; font-size: 0.9rem; font-weight: 600; color: #374151; }
        .input-field { width: 100%; padding: 14px 16px; font-size: 1rem; border: 2px solid #e5e7eb; border-radius: 10px; outline: none; transition: all 0.2s; box-sizing: border-box; background: #f9fafb; }
        .input-field:focus { border-color: #6D28D9; background: #fff; box-shadow: 0 0 0 4px rgba(109, 40, 217, 0.1); }
        .file-input { display: block; margin: 0 auto; font-size: 0.9rem; color: #6b7280; }

        .action-btn { width: 100%; background: #6D28D9; color: white; padding: 16px; border: none; border-radius: 12px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; margin-top: 10px; }
        .action-btn:hover { background: #5b21b6; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3); }

        .gamification-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .xp-card { background: #f3f4f6; padding: 12px; border-radius: 10px; border-left: 4px solid #6D28D9; }
        .xp-card-title { font-size: 0.85rem; font-weight: 600; color: #4b5563; margin-bottom: 4px; }
        .xp-card-value { font-size: 1.1rem; font-weight: 800; color: #111827; }
        .xp-unit { font-size: 0.75rem; color: #6D28D9; }

        .badges-grid { display: flex; flex-wrap: wrap; gap: 16px; }
        .badge-card { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; flex: 1 1 250px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .badge-icon { font-size: 2rem; background: #f3f4f6; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
        .badge-title { font-weight: 700; color: #1f2937; font-size: 0.95rem; }
        .badge-desc { font-size: 0.8rem; color: #6b7280; margin-top: 2px; }
        .badge-date { font-size: 0.7rem; color: #9ca3af; margin-top: 4px; }

        .empty-state { color: #9ca3af; font-style: italic; font-size: 0.9rem; }

        .courses-list { display: grid; gap: 12px; }
        .course-card-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background: #fff; border: 1px solid #e5e7eb;
          border-radius: 12px; text-decoration: none; color: #374151;
          font-weight: 600; transition: all 0.2s;
          cursor: pointer;
        }
        .course-card-link:hover { border-color: #6D28D9; background: #f5f3ff; transform: translateX(4px); }
        .course-card-link::after { content: "→"; font-weight: bold; color: #6D28D9; }

        .status-container { position: absolute; top: 0; left: 0; right: 0; z-index: 10; }
        .status-banner { padding: 15px; text-align: center; font-weight: 600; font-size: 0.95rem; animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .status-error { background: #fee2e2; color: #991b1b; }
        .status-success { background: #dcfce7; color: #166534; }
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @media (max-width: 640px) {
          .profile-header { padding: 30px 20px; }
          .profile-body { padding: 30px 20px; }
          .profile-nav { overflow-x: auto; white-space: nowrap; justify-content: flex-start; }
          .user-name { font-size: 1.5rem; }
        }
      `}</style>

      <div className="profile-card">
        {status.message && (
          <div className="status-container">
            <div className={`status-banner status-${status.type}`}>
              {status.message}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="profile-header">
          <div className="profile-header-content">
            <div className="profile-pic-container">
              <img src={displayPic} alt="Profile" className="profile-pic" />
            </div>
            <h2 className="user-name">{user.name}</h2>
            <p className="user-email">{user.email}</p>
            <span className="user-role-badge">{user.role}</span>
          </div>
        </div>

        {/* Nav */}
        <div className="profile-nav">
          <button className={`nav-btn ${mode === "view" ? "active" : ""}`} onClick={() => setMode("view")}>
            Overview
          </button>
          <button className={`nav-btn ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>
            Edit Profile
          </button>
          <button className={`nav-btn ${mode === "password" ? "active" : ""}`} onClick={() => setMode("password")}>
            Security
          </button>
        </div>

        {/* Body */}
        <div className="profile-body">
          {mode === "view" && (
            <div>
              <div className="section-title">Personal Details</div>

              <div className="info-grid">
                <div className="info-card">
                  <span className="info-label">FULL NAME</span>
                  <div className="info-value">{user.name}</div>
                </div>

                <div className="info-card">
                  <span className="info-label">EMAIL ADDRESS</span>
                  <div className="info-value">{user.email}</div>
                </div>

                {/* Dynamic profile fields excluding gamification */}
                {profile &&
                  Object.entries(profile)
                    .filter(([k]) => !excludeFields.includes(k))
                    .filter(([k]) => !isGamificationKey(k))
                    .map(([k, v]) => (
                      <div className="info-card" key={k}>
                        <span className="info-label">{formatLabel(k)}</span>
                        <span className="info-value">
                          {Array.isArray(v) ? v.join(", ") : v || "Not set"}
                        </span>
                      </div>
                    ))}
              </div>

              {/* Gamification */}
              {(profile?.xpByCourse?.length > 0 ||
                profile?.badges?.length > 0 ||
                typeof profile?.xpTotal === "number") && (
                <>
                  <div className="section-title" style={{ marginTop: "40px" }}>
                    Achievements
                  </div>

                  <div className="info-grid" style={{ marginBottom: "20px" }}>
                    {typeof profile?.xpTotal === "number" && (
                      <div className="info-card">
                        <span className="info-label">TOTAL XP</span>
                        <div className="info-value" style={{ color: "#6D28D9", fontSize: "1.2rem", fontWeight: "bold" }}>
                          {profile.xpTotal}
                        </div>
                      </div>
                    )}

                    {typeof profile?.streakCount === "number" && (
                      <div className="info-card">
                        <span className="info-label">CURRENT STREAK</span>
                        <div className="info-value">{profile.streakCount} 🔥</div>
                      </div>
                    )}

                    {profile?.lastStreakDate && (
                      <div className="info-card">
                        <span className="info-label">LAST ACTIVITY</span>
                        <div className="info-value">{formatDate(profile.lastStreakDate)}</div>
                      </div>
                    )}
                  </div>

                  {profile?.xpByCourse && (
                    <div style={{ marginBottom: "20px" }}>
                      <span className="info-label" style={{ marginBottom: "12px" }}>
                        XP BREAKDOWN
                      </span>
                      {renderXpByCourse(profile.xpByCourse)}
                    </div>
                  )}

                  {profile?.badges && (
                    <div>
                      <span className="info-label" style={{ marginBottom: "12px" }}>
                        BADGES EARNED
                      </span>
                      {renderBadges(profile.badges)}
                    </div>
                  )}
                </>
              )}

              {/* Enrolled Courses */}
              {user.role === "student" && courses?.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: "40px" }}>
                    Enrolled Courses
                  </div>

                  <div className="courses-list">
                    {courses.map((c) => (
                      // ✅ FIX 2: button instead of <a>
                      <button
                        type="button"
                        key={c._id}
                        className="course-card-link"
                        onClick={() => navigate(`/courses/${c._id}`)}
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {mode === "edit" && (
            <div className="form-container">
              <div style={{ textAlign: "center", marginBottom: "30px" }}>
                <img src={displayPic} alt="Preview" className="profile-pic" style={{ width: 140, height: 140 }} />
                <input type="file" onChange={handleProfilePicChange} className="file-input" />
              </div>

              <div className="input-group">
                <label>Full Name</label>
                <input
                  className="input-field"
                  type="text"
                  name="name"
                  value={userData.name || ""}
                  onChange={handleUserChange}
                  placeholder="Enter your full name"
                />
              </div>

              {Object.entries(formData)
                .filter(([k]) => !excludeFields.includes(k))
                .filter(([k]) => !isGamificationKey(k))
                .map(([k, v]) => (
                  <div key={k} className="input-group">
                    <label>{k.replace(/([A-Z])/g, " $1")}</label>
                    <input
                      className="input-field"
                      type="text"
                      value={Array.isArray(v) ? v.join(", ") : v || ""}
                      placeholder={`Enter your ${k.toLowerCase()}`}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [k]: Array.isArray(v)
                            ? e.target.value
                                .split(",")
                                .map((i) => i.trim())
                                .filter(Boolean)
                            : e.target.value,
                        })
                      }
                    />
                  </div>
                ))}

              <button className="action-btn" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          )}

          {mode === "password" && (
            <div className="form-container">
              <div className="input-group">
                <label>Current Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="••••••••"
                  value={passwords.oldPassword}
                  onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>New Password (7-9 chars)</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="New password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Confirm Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Confirm new password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                />
              </div>

              <button className="action-btn" onClick={handlePasswordChange}>
                Update Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
