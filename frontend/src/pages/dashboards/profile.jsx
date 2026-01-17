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
  const [profilePic, setProfilePic] = useState(null);
  
  // Custom notification state (No alerts/toasts)
  const [status, setStatus] = useState({ message: "", type: "" });

  const BASE_URL = import.meta.env.VITE_BASE_URL || "";
  const DEFAULT_PROFILE = `${BASE_URL}/uploads/default.png`;

  const showNotification = (msg, type = "error") => {
    setStatus({ message: msg, type });
    setTimeout(() => setStatus({ message: "", type: "" }), 5000);
  };

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
        setProfilePic(fullPicUrl);
        setFormData(profileDataFromApi || {});
      } catch (err) {
        console.error("Fetch profile error:", err.response?.data || err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [BASE_URL]);

  const handleUserChange = (e) =>
    setUserData({ ...userData, [e.target.name]: e.target.value });

  const handleProfilePicChange = (e) => {
    if (e.target.files && e.target.files[0]) setProfilePic(e.target.files[0]);
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      Object.entries(userData).forEach(([key, value]) => data.append(key, value));
      Object.entries(formData).forEach(([key, value]) => {
        if (!["_id", "user", "__v", "createdAt", "updatedAt", "coursesCreated", "enrolledCourses"].includes(key)) {
          data.append(key, Array.isArray(value) ? value.join(",") : value);
        }
      });

      if (profilePic instanceof File) data.append("profilePic", profilePic);

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
      setProfilePic(updatedPic);

      localStorage.setItem("user", JSON.stringify({ ...res.data.user, profilePic: updatedPic }));
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

  if (loading) return (
    <div className="ml-course-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div className="ml-spinner" />
      <p className="ml-loading-text">Loading profile...</p>
    </div>
  );

  if (!user) return <div className="profile-simple-container"><p>Please log in again.</p></div>;

  const excludeFields = ["_id", "user", "__v", "createdAt", "updatedAt", "coursesCreated", "enrolledCourses"];
  const courses = user.role === "student" ? profile?.enrolledCourses : null;

  return (
    <div className="profile-wrapper">
      <style>{`
        .profile-wrapper { padding: 20px; max-width: 900px; margin: 40px auto; font-family: 'Inter', sans-serif; }
        .profile-card { background: #fff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 30px; position: relative; }
        .status-banner { padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: 500; animation: slideDown 0.3s ease; }
        .status-error { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .status-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .profile-title { font-size: 1.8rem; color: #1f2937; margin-bottom: 25px; text-align: center; font-weight: 700; }
        .profile-tabs { display: flex; gap: 10px; margin-bottom: 30px; background: #f3f4f6; padding: 5px; border-radius: 12px; }
        .tab-btn { flex: 1; padding: 10px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-weight: 600; color: #6b7280; transition: 0.3s; }
        .tab-btn.active { background: #fff; color: #6D28D9; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .profile-pic { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #f3f4f6; margin-bottom: 15px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px; }
        .info-item { padding: 15px; background: #f9fafb; border-radius: 10px; }
        .info-label { display: block; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; margin-bottom: 5px; }
        .info-value { color: #111827; font-weight: 500; }
        .input-group-simple { margin-bottom: 20px; }
        .input-group-simple label { display: block; margin-bottom: 8px; font-weight: 600; color: #374151; }
        .input-group-simple input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }
        .save-btn-simple { width: 100%; background: #6D28D9; color: white; padding: 14px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 10px; }
        .course-link { display: block; padding: 12px; background: #f3f4f6; margin-bottom: 8px; border-radius: 8px; text-decoration: none; color: #6D28D9; font-weight: 500; cursor: pointer; }
        .course-link:hover { background: #ede9fe; transform: translateX(5px); transition: 0.2s; }
      `}</style>

      <div className="profile-card">
        {status.message && <div className={`status-banner status-${status.type}`}>{status.message}</div>}

        <h2 className="profile-title">{user.role.toUpperCase()} Account</h2>

        <div className="profile-tabs">
          <button className={`tab-btn ${mode === "view" ? "active" : ""}`} onClick={() => setMode("view")}>View Profile</button>
          <button className={`tab-btn ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>Edit Details</button>
          <button className={`tab-btn ${mode === "password" ? "active" : ""}`} onClick={() => setMode("password")}>Security</button>
        </div>

        {mode === "view" && (
          <div>
            <div style={{ textAlign: 'center' }}>
              <img src={profilePic || DEFAULT_PROFILE} alt="Profile" className="profile-pic" />
              <h3>{user.name}</h3>
              <p style={{ color: '#6b7280' }}>{user.email}</p>
            </div>
            <div className="info-grid">
              <div className="info-item"><span className="info-label">Role</span><span className="info-value">{user.role}</span></div>
              {profile && Object.entries(profile).filter(([k]) => !excludeFields.includes(k)).map(([k, v]) => (
                <div className="info-item" key={k}>
                  <span className="info-label">{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="info-value">{Array.isArray(v) ? v.join(", ") : v || "Not set"}</span>
                </div>
              ))}
            </div>
            {user.role === "student" && courses?.length > 0 && (
              <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <h4>Enrolled Courses</h4>
                {courses.map(c => (
                  <a key={c._id} className="course-link" onClick={() => navigate(`/courses/${c._id}`)}>{c.title}</a>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "edit" && (
          <div>
            <div style={{ textAlign: 'center' }}>
              <img src={profilePic instanceof File ? URL.createObjectURL(profilePic) : profilePic} alt="Preview" className="profile-pic" />
              <input type="file" onChange={handleProfilePicChange} style={{ display: 'block', margin: '10px auto' }} />
            </div>
            <div className="input-group-simple">
              <label>Full Name</label>
              <input type="text" name="name" value={userData.name || ""} onChange={handleUserChange} placeholder="Enter your full name" />
            </div>
            {Object.entries(formData).filter(([k]) => !excludeFields.includes(k)).map(([k, v]) => (
              <div key={k} className="input-group-simple">
                <label>{k.replace(/([A-Z])/g, ' $1')}</label>
                <input 
                  type="text" 
                  value={Array.isArray(v) ? v.join(", ") : v || ""} 
                  placeholder={`Enter your ${k.toLowerCase()}`}
                  onChange={(e) => setFormData({ ...formData, [k]: Array.isArray(v) ? e.target.value.split(",").map(i => i.trim()) : e.target.value })} 
                />
              </div>
            ))}
            <button className="save-btn-simple" onClick={handleSave}>Save Changes</button>
          </div>
        )}

        {mode === "password" && (
          <div>
            <div className="input-group-simple">
              <label>Current Password</label>
              <input type="password" placeholder="••••••••" value={passwords.oldPassword} onChange={e => setPasswords({...passwords, oldPassword: e.target.value})} />
            </div>
            <div className="input-group-simple">
              <label>New Password (7-9 chars)</label>
              <input type="password" placeholder="New password" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} />
            </div>
            <div className="input-group-simple">
              <label>Confirm Password</label>
              <input type="password" placeholder="Confirm new password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} />
            </div>
            <button className="save-btn-simple" onClick={handlePasswordChange}>Update Password</button>
          </div>
        )}
      </div>
    </div>
  );
}