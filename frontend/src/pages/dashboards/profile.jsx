import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { track } from "../../utils/track";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  FiUser, FiEdit, FiShield, FiMail, FiBookOpen,
  FiCamera, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiChevronRight, FiBarChart2
} from "react-icons/fi";
import { FaFire, FaMedal } from "react-icons/fa";

import { useTheme } from "../../context/ThemeContext"; 

export default function Profile() {
  const navigate = useNavigate();
  
  const { primaryColor } = useTheme();

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

  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [status, setStatus] = useState({ message: "", type: "" });

  const BASE_URL = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");
  const DEFAULT_PROFILE = `${BASE_URL}/uploads/default.png`;

  const fieldPlaceholders = {
    interests: "e.g. React, Node.js, Artificial Intelligence",
    education: "e.g. M.Sc. in Computer Applications, B.Tech",
    targetGoals: "e.g. Full Stack Developer, Data Scientist",
    bio: "e.g. Passionate learner exploring MERN stack development.",
    location: "e.g. Surat, Gujarat, India",
    skills: "e.g. JavaScript, Python, UI/UX Design",
    experience: "e.g. 2 years in Web Development",
    about: "Describe your professional background in brief..."
  };

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
  }, []); // <--- Removed setPrimaryColor dependency as it's now handled globally

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
    if (profilePicPreview) URL.revokeObjectURL(profilePicPreview);
    const newPreview = URL.createObjectURL(file);
    setProfilePicPreview(newPreview);
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      Object.entries(userData).forEach(([key, value]) => data.append(key, value));
      Object.entries(formData).forEach(([key, value]) => {
        if (!["_id", "user", "__v", "createdAt", "updatedAt", "coursesCreated", "enrolledCourses", "xpTotal", "xpByCourse", "streakCount", "lastStreakDate", "badges", "skillProficiency"].includes(key)) {
          data.append(key, Array.isArray(value) ? value.join(",") : value);
        }
      });
      if (profilePicFile instanceof File) data.append("profilePic", profilePicFile);

      const res = await api.put("/profile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedPic = res.data.user?.profilePic
        ? res.data.user.profilePic.startsWith("http") ? res.data.user.profilePic : `${BASE_URL}${res.data.user.profilePic}`
        : DEFAULT_PROFILE;

      setUser((prev) => ({ ...prev, ...userData, profilePic: updatedPic }));
      setProfile((prev) => ({ ...prev, ...formData }));
      setProfilePicUrl(updatedPic);
      setProfilePicFile(null);
      setMode("view");
      showNotification("Profile updated successfully!", "success");
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to update profile", "danger");
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      return showNotification("Passwords do not match", "danger");
    }
    try {
      await api.put("/profile/password", passwords);
      showNotification("Password changed successfully!", "success");
      setMode("view");
    } catch (err) {
      showNotification(err.response?.data?.message || "Error changing password", "danger");
    }
  };

  const excludeFields = useMemo(() => ["_id", "user", "__v", "createdAt", "updatedAt", "coursesCreated", "enrolledCourses", "skillProficiency"], []);
  const isGamificationKey = (k) => ["xpByCourse", "badges", "lastStreakDate", "xpTotal", "streakCount"].includes(k);
  const formatLabel = (k) => String(k).replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not set";

  const calculateLevel = (xp) => {
    const xpPerLevel = 500; 
    const currentXp = xp || 0;
    const level = Math.floor(currentXp / xpPerLevel) + 1;
    const currentLevelProgressXp = currentXp % xpPerLevel;
    const progressPercentage = (currentLevelProgressXp / xpPerLevel) * 100;
    
    return { level, nextLevelXp: xpPerLevel, currentLevelProgressXp, progressPercentage };
  };

  const renderSkillProficiency = (skills) => {
    if (!Array.isArray(skills) || skills.length === 0) return null;

    return (
      <div className="mt-5">
        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2" style={{ color: primaryColor }}>
          <FiBarChart2 size={22} /> Skill Proficiency Intelligence
        </h5>
        <div className="row g-4">
          {skills.map((s, idx) => {
            const level = s.level || 0;
            let color = "#F98080"; 
            let status = "Learning";
            let bg = "#FDF2F2";

            if (level >= 80) { color = "#10B981"; status = "Expert"; bg = "#DEF7EC"; }
            else if (level >= 40) { color = "#3F83F8"; status = "Intermediate"; bg = "#E1EFFE"; }

            return (
              <div className="col-md-6" key={idx}>
                <div className="p-4 rounded-4 bg-white border border-light shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-dark">{s.skill}</span>
                    <span className="badge rounded-pill" style={{ backgroundColor: bg, color: color, fontSize: '10px' }}>{status}</span>
                  </div>
                  <div className="progress rounded-pill mb-2" style={{ height: "10px" }}>
                    <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${level}%`, backgroundColor: color }} />
                  </div>
                  <div className="d-flex justify-content-between">
                    <small className="text-muted small" style={{ fontSize: '11px' }}>Mastery Level</small>
                    <small className="fw-bold" style={{ color: color }}>{level}%</small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderXpByCourse = (xpByCourse) => {
    if (!Array.isArray(xpByCourse) || xpByCourse.length === 0) return null;
    return (
      <div className="row g-3 mt-4">
        {xpByCourse.map((item, idx) => (
          <div className="col-md-6" key={idx}>
            <div className="d-flex align-items-center justify-content-between p-3 rounded-4 bg-white border border-light shadow-sm">
              <div className="fw-semibold text-dark text-truncate pe-3">{item?.course?.title || "Course"}</div>
              <div className="fw-bold" style={{ color: primaryColor }}>{item?.xp ?? 0} <span className="small text-muted fw-normal">XP</span></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBadges = (badges) => {
    if (!Array.isArray(badges) || badges.length === 0) return null;
    return (
      <div className="row g-3 mt-4">
        {badges.map((badge, idx) => (
          <div className="col-md-6" key={idx}>
            <div className="d-flex align-items-center gap-3 p-3 rounded-4 bg-white border border-light shadow-sm">
              <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: 48, height: 48, background: "#FFFBEB", color: "#F59E0B", fontSize: "20px" }}>
                {badge?.icon || <FaMedal />}
              </div>
              <div>
                <div className="fw-bold text-dark">{badge?.title || badge?.key}</div>
                <div className="text-muted small">{formatDate(badge.earnedAt)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const displayPic = profilePicPreview || profilePicUrl || DEFAULT_PROFILE;
  
  const levelInfo = profile ? calculateLevel(profile.xpTotal) : { level: 1, nextLevelXp: 500, currentLevelProgressXp: 0, progressPercentage: 0 };

  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary" /></div>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F3FF", padding: "60px 16px 40px", fontFamily: "'Inter', sans-serif", marginTop: "-1%" }}>
      <div className="container px-0" style={{ maxWidth: 900 }}>

        {status.message && (
          <div className={`alert alert-${status.type} border-0 shadow-sm mb-4 d-flex align-items-center gap-2`}>
            {status.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />} {status.message}
          </div>
        )}

        {/* Profile Header */}
        <div className="card border-0 rounded-4 shadow-sm overflow-hidden mb-4">
          <div style={{ height: "88px", position: "relative", backgroundColor: primaryColor }}>
            <div style={{ position: "absolute", right: 20, top: 20, opacity: 0.2 }}><FiBookOpen size={100} color="white" /></div>
          </div>
          <div className="bg-white px-4 px-md-5 pb-4 position-relative">
            <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-end gap-4" style={{ marginTop: "-60px" }}>
              <div className="rounded-circle bg-white p-1 shadow" style={{ width: 130, height: 130, zIndex: 2 }}>
                <img src={displayPic} alt="Profile" className="rounded-circle w-100 h-100 object-fit-cover" style={{ border: "3px solid #F59E0B" }} />
              </div>
              <div className="text-center text-sm-start flex-grow-1 pb-sm-2">
                <h2 className="fw-bolder text-dark mb-1">{user.name}</h2>
                <div className="text-muted d-flex align-items-center gap-2 justify-content-center justify-content-sm-start"><FiMail /> {user.email}</div>
              </div>
              <div className="pb-sm-3 d-flex gap-2">
                <span className="badge rounded-pill fw-bold" style={{ background: "#FEF3C7", color: "#D97706", padding: "8px 16px" }}>{user.role.toUpperCase()}</span>
                {(user.role === 'student' || user.role === 'intern') && (
                  <span className="badge rounded-pill fw-bold shadow-sm" style={{ background: primaryColor, color: "white", padding: "8px 16px" }}>
                    Level {levelInfo.level}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white p-2 rounded-2 shadow-sm mb-4">
          {["view", "edit", "password"].map((m) => (
            <button key={m} className="btn px-4 py-1.7 fw-semibold text-capitalize border-0"
              style={{ background: mode === m ? primaryColor : "transparent", color: mode === m ? "white" : "#6B7280" }}
              onClick={() => setModeTracked(m)}>
              {m === 'view' ? <FiUser className="me-1" /> : m === 'edit' ? <FiEdit className="me-1" /> : <FiShield className="me-1" />} {m}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card border-0 rounded-4 shadow-sm p-4 p-md-5">
          {mode === "view" && (
            <div className="animate-fade-in">
              <h5 className="fw-bold mb-4" style={{ color: primaryColor }}>Personal Information</h5>
              <div className="row g-4 mb-5">
                <div className="col-md-6">
                  <div className="p-3 rounded-4 bg-light">
                    <small className="text-muted text-uppercase fw-bold d-block mb-1" style={{ fontSize: '10px' }}>Full Name</small>
                    <span className="fw-bold">{user.name}</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 rounded-4 bg-light">
                    <small className="text-muted text-uppercase fw-bold d-block mb-1" style={{ fontSize: '10px' }}>Email Address</small>
                    <span className="fw-bold">{user.email}</span>
                  </div>
                </div>
                {profile && Object.entries(profile)
                  .filter(([k]) => !excludeFields.includes(k) && !isGamificationKey(k))
                  .map(([k, v]) => (
                    <div className="col-md-6" key={k}>
                      <div className="p-3 rounded-4 bg-light">
                        <small className="text-muted text-uppercase fw-bold d-block mb-1" style={{ fontSize: '10px' }}>{formatLabel(k)}</small>
                        <span className="fw-bold">{Array.isArray(v) ? v.join(", ") : v || "Not specified"}</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Achievements Grid */}
              {(user.role === "student" || user.role === "intern") && (
                <>
                  <div className="row g-4">
                    <div className="col-sm-6">
                      <div className="p-4 rounded-4 border-0 text-center shadow-sm" style={{ background: "#F5F3FF" }}>
                        <FiTrendingUp size={24} className="mb-2 text-primary" />
                        <div className="text-muted small fw-semibold">Total Learning XP</div>
                        <div className="fw-bolder fs-3 text-primary mb-3">{profile?.xpTotal || 0}</div>
                        
                        <div className="px-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted fw-bold" style={{ fontSize: "10px" }}>Lvl {levelInfo.level}</small>
                            <small className="text-muted fw-bold" style={{ fontSize: "10px" }}>Lvl {levelInfo.level + 1}</small>
                          </div>
                          <div className="progress rounded-pill" style={{ height: "8px", backgroundColor: "#E0E7FF" }}>
                            <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                                 style={{ width: `${levelInfo.progressPercentage}%` }} />
                          </div>
                          <small className="text-muted mt-2 d-block fw-semibold" style={{ fontSize: "11px" }}>
                            {levelInfo.currentLevelProgressXp} / {levelInfo.nextLevelXp} XP
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-6">
                      <div className="p-4 rounded-4 border-0 text-center shadow-sm" style={{ background: "#FFFBEB", height: '100%' }}>
                        <FaFire size={24} className="mb-2 text-warning" />
                        <div className="text-muted small fw-semibold">Learning Streak</div>
                        <div className="fw-bolder fs-3 text-warning mt-2">{profile?.streakCount || 0} Days</div>
                      </div>
                    </div>
                  </div>

                  {renderSkillProficiency(profile?.skillProficiency)}
                  {renderXpByCourse(profile?.xpByCourse)}
                  {renderBadges(profile?.badges)}

                  {profile?.enrolledCourses?.length > 0 && (
                    <div className="mt-5">
                      <h5 className="fw-bold mb-4" style={{ color: primaryColor }}>Ongoing Courses</h5>
                      <div className="d-flex flex-column gap-3">
                        {profile.enrolledCourses.map((c) => (
                          <div key={c._id} className="p-3 rounded-4 bg-white border border-light d-flex justify-content-between align-items-center shadow-sm" style={{cursor: 'pointer'}} onClick={() => navigate(`/courses/${c._id}`)}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="p-2 rounded-circle bg-light text-primary"><FiBookOpen /></div>
                              <span className="fw-bold text-dark">{c.title}</span>
                            </div>
                            <FiChevronRight className="text-muted" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {mode === "edit" && (
            <div className="animate-fade-in row justify-content-center">
              <div className="col-lg-8">
                <div className="text-center mb-5">
                  <div className="position-relative d-inline-block">
                    <img src={displayPic} alt="Preview" className="rounded-circle shadow-sm" style={{ width: 120, height: 120, objectFit: "cover", border: "4px solid #F5F3FF" }} />
                    <label className="position-absolute bottom-0 end-0 p-2 rounded-circle shadow bg-warning text-white border-white border-2 cursor-pointer" style={{ cursor: 'pointer' }}>
                      <FiCamera size={18} /><input type="file" className="d-none" onChange={handleProfilePicChange} accept="image/*" />
                    </label>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold">Full Name</label>
                  <input className="form-control form-control-lg bg-light border-0" type="text" name="name" value={userData.name} onChange={handleUserChange} placeholder="e.g. John Doe" />
                </div>
                {Object.entries(formData)
                  .filter(([k]) => !excludeFields.includes(k) && !isGamificationKey(k))
                  .map(([k, v]) => (
                    <div className="mb-4" key={k}>
                      <label className="form-label fw-bold text-capitalize">{formatLabel(k)}</label>
                      <input className="form-control form-control-lg bg-light border-0" type="text" placeholder={fieldPlaceholders[k] || `Enter ${k}`}
                        value={Array.isArray(v) ? v.join(", ") : v || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, [k]: Array.isArray(v) ? e.target.value.split(",").map(i => i.trim()) : e.target.value }))} />
                    </div>
                  ))}
                <button className="btn btn-lg w-100 fw-bold rounded-pill text-white mt-4" style={{ background: primaryColor }} onClick={handleSave}>Save Changes</button>
              </div>
            </div>
          )}

          {mode === "password" && (
            <div className="animate-fade-in row justify-content-center">
              <div className="col-lg-7">
                <div className="text-center mb-5"><FiShield size={48} className="text-muted mb-3" /><h5 className="fw-bold">Account Security</h5></div>
                <div className="mb-4"><label className="form-label fw-bold">Old Password</label><input className="form-control form-control-lg bg-light border-0" type="password" placeholder="••••••••" value={passwords.oldPassword} onChange={e => setPasswords({ ...passwords, oldPassword: e.target.value })} /></div>
                <div className="mb-4"><label className="form-label fw-bold">New Password</label><input className="form-control form-control-lg bg-light border-0" type="password" placeholder="New Password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} /></div>
                <div className="mb-5"><label className="form-label fw-bold">Confirm Password</label><input className="form-control form-control-lg bg-light border-0" type="password" placeholder="Confirm Password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} /></div>
                <button className="btn btn-lg w-100 fw-bold rounded-pill text-white" style={{ background: primaryColor }} onClick={handlePasswordChange}>Update Password</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}