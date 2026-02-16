import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { track } from "../../utils/track"; // ✅ analytics
import "bootstrap/dist/css/bootstrap.min.css";

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

  // ✅ profile pic state
  const [profilePicUrl, setProfilePicUrl] = useState(null); // url from server
  const [profilePicFile, setProfilePicFile] = useState(null); // File
  const [profilePicPreview, setProfilePicPreview] = useState(null); // objectURL

  // ✅ custom status banner
  const [status, setStatus] = useState({ message: "", type: "" }); // type: success | danger | info

  const BASE_URL = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");
  const DEFAULT_PROFILE = `${BASE_URL}/uploads/default.png`;

  const showNotification = (msg, type = "danger") => {
    setStatus({ message: msg, type });
    setTimeout(() => setStatus({ message: "", type: "" }), 4500);
  };

  // ✅ cleanup preview
  useEffect(() => {
    return () => {
      if (profilePicPreview) URL.revokeObjectURL(profilePicPreview);
    };
  }, [profilePicPreview]);

  // ✅ fetch profile
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

  // ✅ tab change with analytics
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

      const updatedPic = res.data.user?.profilePic
        ? res.data.user.profilePic.startsWith("http")
          ? res.data.user.profilePic
          : `${BASE_URL}${res.data.user.profilePic}`
        : DEFAULT_PROFILE;

      setUser((prev) => ({ ...prev, ...userData, profilePic: updatedPic }));
      setProfile((prev) => ({ ...prev, ...formData }));
      setProfilePicUrl(updatedPic);

      // reset file state
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

  // ----- helpers -----
  const excludeFields = useMemo(
    () => ["_id", "user", "__v", "createdAt", "updatedAt", "coursesCreated", "enrolledCourses"],
    []
  );

  const isGamificationKey = (k) =>
    ["xpByCourse", "badges", "lastStreakDate", "xpTotal", "streakCount"].includes(k);

  const formatLabel = (k) =>
    String(k).replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim().toUpperCase();

  const formatDate = (d) => {
    if (!d) return "Not set";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "Not set";
    return dt.toLocaleString();
  };

  const isObjectIdLike = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

  const displayPic = profilePicPreview || profilePicUrl || DEFAULT_PROFILE;

  const courses = user?.role === "student" ? profile?.enrolledCourses : null;

  const renderXpByCourse = (xpByCourse) => {
    if (!Array.isArray(xpByCourse) || xpByCourse.length === 0) {
      return <div className="text-muted fst-italic">No XP earned yet</div>;
    }

    return (
      <div className="row g-3">
        {xpByCourse.map((item, idx) => {
          const courseTitle =
            item?.course?.title ||
            item?.course?.name ||
            (typeof item?.course === "string" ? item.course : "Course");

          const xp = item?.xp ?? 0;

          return (
            <div className="col-md-6" key={item?.course?._id || item?.course || idx}>
              <div
                className="p-3 rounded-4 border bg-light"
                style={{ borderLeft: "4px solid #6D28D9" }}
              >
                <div className="small fw-bold text-secondary">
                  {isObjectIdLike(courseTitle) ? "Course" : courseTitle}
                </div>
                <div className="fs-5 fw-bolder mt-1">
                  {xp} <span className="fs-6 text-primary">XP</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBadges = (badges) => {
    if (!Array.isArray(badges) || badges.length === 0) {
      return <div className="text-muted fst-italic">No badges earned yet</div>;
    }

    return (
      <div className="row g-3">
        {badges.map((badge, idx) => (
          <div className="col-md-6" key={badge?.key || idx}>
            <div className="d-flex gap-3 align-items-start p-3 rounded-4 border bg-white">
              <div
                className="d-flex align-items-center justify-content-center rounded-3"
                style={{
                  width: 52,
                  height: 52,
                  background: "#f3f4f6",
                  fontSize: 24,
                }}
              >
                {badge?.icon || "🏅"}
              </div>
              <div className="flex-grow-1">
                <div className="fw-bold">{badge?.title || badge?.key || "Badge"}</div>
                {badge?.description && (
                  <div className="text-muted small mt-1">{badge.description}</div>
                )}
                {badge?.earnedAt && (
                  <div className="text-muted small mt-2">
                    Earned: {formatDate(badge.earnedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ----- UI -----
  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: "80vh" }}>
        <div className="spinner-border" role="status" />
        <div className="mt-3 text-muted fw-semibold">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ marginTop: 90 }}>
        <div className="alert alert-warning">
          Please log in again.
        </div>
        <button className="btn btn-dark" onClick={() => navigate("/login")}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-light" style={{ minHeight: "90vh", padding: "40px 16px", marginTop: 70 }}>
      <div className="container" style={{ maxWidth: 980 }}>
        {/* status banner */}
        {status.message && (
          <div
            className={`alert alert-${status.type} shadow-sm`}
            style={{
              position: "sticky",
              top: 78,
              zIndex: 10,
              borderRadius: 14,
              border: "none",
            }}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div className="fw-semibold">{status.message}</div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setStatus({ message: "", type: "" })}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          {/* header */}
          <div
            className="p-4 text-center text-white"
            style={{
              background: "linear-gradient(135deg, #a16ff1 0%, #8b5cf6 100%)",
            }}
          >
            <div
              className="mx-auto rounded-circle bg-white"
              style={{
                width: 140,
                height: 140,
                padding: 6,
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src={displayPic}
                alt="Profile"
                className="rounded-circle"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <h2 className="mt-3 mb-1 fw-bolder">{user.name}</h2>
            <div className="opacity-75">{user.email}</div>
            <span
              className="badge mt-2"
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(4px)",
                padding: "8px 14px",
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {user.role}
            </span>
          </div>

          {/* tabs */}
          <div className="px-3 px-md-4 pt-3 border-bottom bg-white">
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <button
                className={`btn rounded-pill px-4 fw-semibold ${
                  mode === "view" ? "btn-primary" : "btn-outline-primary"
                }`}
                style={{ background: mode === "view" ? "#6D28D9" : "", borderColor: "#6D28D9" }}
                onClick={() => setModeTracked("view")}
              >
                Overview
              </button>

              <button
                className={`btn rounded-pill px-4 fw-semibold ${
                  mode === "edit" ? "btn-primary" : "btn-outline-primary"
                }`}
                style={{ background: mode === "edit" ? "#6D28D9" : "", borderColor: "#6D28D9" }}
                onClick={() => setModeTracked("edit")}
              >
                Edit Profile
              </button>

              <button
                className={`btn rounded-pill px-4 fw-semibold ${
                  mode === "password" ? "btn-primary" : "btn-outline-primary"
                }`}
                style={{ background: mode === "password" ? "#6D28D9" : "", borderColor: "#6D28D9" }}
                onClick={() => setModeTracked("password")}
              >
                Security
              </button>
            </div>
          </div>

          {/* body */}
          <div className="p-3 p-md-4 bg-white">
            {/* OVERVIEW */}
            {mode === "view" && (
              <>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <h5 className="m-0 fw-bold text-dark">Personal Details</h5>
                  <div className="flex-grow-1" style={{ height: 1, background: "#e5e7eb" }} />
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-3 rounded-4 border bg-light">
                      <div className="text-muted small fw-semibold">FULL NAME</div>
                      <div className="fw-bold mt-1">{user.name}</div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-3 rounded-4 border bg-light">
                      <div className="text-muted small fw-semibold">EMAIL ADDRESS</div>
                      <div className="fw-bold mt-1">{user.email}</div>
                    </div>
                  </div>

                  {/* dynamic profile fields */}
                  {profile &&
                    Object.entries(profile)
                      .filter(([k]) => !excludeFields.includes(k))
                      .filter(([k]) => !isGamificationKey(k))
                      .map(([k, v]) => (
                        <div className="col-md-6" key={k}>
                          <div className="p-3 rounded-4 border bg-white">
                            <div className="text-muted small fw-semibold">{formatLabel(k)}</div>
                            <div className="fw-semibold mt-1">
                              {Array.isArray(v) ? v.join(", ") : v || "Not set"}
                            </div>
                          </div>
                        </div>
                      ))}
                </div>

                {/* ACHIEVEMENTS */}
                {(profile?.xpByCourse?.length > 0 ||
                  profile?.badges?.length > 0 ||
                  typeof profile?.xpTotal === "number") && (
                  <>
                    <div className="d-flex align-items-center gap-2 mt-5 mb-3">
                      <h5 className="m-0 fw-bold text-dark">Achievements</h5>
                      <div className="flex-grow-1" style={{ height: 1, background: "#e5e7eb" }} />
                    </div>

                    <div className="row g-3 mb-3">
                      {typeof profile?.xpTotal === "number" && (
                        <div className="col-md-4">
                          <div className="p-3 rounded-4 border bg-light">
                            <div className="text-muted small fw-semibold">TOTAL XP</div>
                            <div className="fw-bolder mt-1" style={{ color: "#6D28D9", fontSize: 22 }}>
                              {profile.xpTotal}
                            </div>
                          </div>
                        </div>
                      )}

                      {typeof profile?.streakCount === "number" && (
                        <div className="col-md-4">
                          <div className="p-3 rounded-4 border bg-light">
                            <div className="text-muted small fw-semibold">CURRENT STREAK</div>
                            <div className="fw-bolder mt-1">{profile.streakCount} 🔥</div>
                          </div>
                        </div>
                      )}

                      {profile?.lastStreakDate && (
                        <div className="col-md-4">
                          <div className="p-3 rounded-4 border bg-light">
                            <div className="text-muted small fw-semibold">LAST ACTIVITY</div>
                            <div className="fw-semibold mt-1">{formatDate(profile.lastStreakDate)}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {profile?.xpByCourse && (
                      <div className="mb-4">
                        <div className="text-muted small fw-semibold mb-2">XP BREAKDOWN</div>
                        {renderXpByCourse(profile.xpByCourse)}
                      </div>
                    )}

                    {profile?.badges && (
                      <div className="mb-2">
                        <div className="text-muted small fw-semibold mb-2">BADGES EARNED</div>
                        {renderBadges(profile.badges)}
                      </div>
                    )}
                  </>
                )}

                {/* Enrolled Courses */}
                {user.role === "student" && Array.isArray(courses) && courses.length > 0 && (
                  <>
                    <div className="d-flex align-items-center gap-2 mt-5 mb-3">
                      <h5 className="m-0 fw-bold text-dark">Enrolled Courses</h5>
                      <div className="flex-grow-1" style={{ height: 1, background: "#e5e7eb" }} />
                    </div>

                    <div className="d-grid gap-2">
                      {courses.map((c) => (
                        <button
                          type="button"
                          key={c._id}
                          className="btn btn-outline-dark text-start rounded-4 py-3 px-3"
                          onClick={() => {
                            track("profile_course_click", { courseId: c._id, title: c.title });
                            navigate(`/courses/${c._id}`);
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="fw-semibold">{c.title}</div>
                            <div className="text-muted fw-bold">→</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* EDIT */}
            {mode === "edit" && (
              <div className="row justify-content-center">
                <div className="col-lg-8">
                  <div className="text-center mb-4">
                    <img
                      src={displayPic}
                      alt="Preview"
                      className="rounded-circle border"
                      style={{ width: 140, height: 140, objectFit: "cover" }}
                    />
                    <div className="mt-3">
                      <input type="file" className="form-control" onChange={handleProfilePicChange} />
                      <div className="form-text">Upload JPG/PNG image.</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Full Name</label>
                    <input
                      className="form-control form-control-lg"
                      type="text"
                      name="name"
                      value={userData.name || ""}
                      onChange={handleUserChange}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* dynamic fields */}
                  {Object.entries(formData)
                    .filter(([k]) => !excludeFields.includes(k))
                    .filter(([k]) => !isGamificationKey(k))
                    .map(([k, v]) => (
                      <div className="mb-3" key={k}>
                        <label className="form-label fw-semibold">
                          {k.replace(/([A-Z])/g, " $1")}
                        </label>
                        <input
                          className="form-control"
                          type="text"
                          value={Array.isArray(v) ? v.join(", ") : v || ""}
                          placeholder={`Enter your ${String(k).toLowerCase()}`}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [k]: Array.isArray(v)
                                ? e.target.value
                                    .split(",")
                                    .map((i) => i.trim())
                                    .filter(Boolean)
                                : e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}

                  <button
                    className="btn btn-lg w-100 fw-bold rounded-pill mt-2"
                    style={{ background: "#6D28D9", color: "white" }}
                    onClick={handleSave}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* PASSWORD */}
            {mode === "password" && (
              <div className="row justify-content-center">
                <div className="col-lg-7">
                  <div className="alert alert-info border-0 rounded-4">
                    Password must be <b>7 to 9 characters</b>.
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Current Password</label>
                    <input
                      className="form-control"
                      type="password"
                      value={passwords.oldPassword}
                      onChange={(e) => setPasswords((p) => ({ ...p, oldPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">New Password</label>
                    <input
                      className="form-control"
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                      placeholder="7-9 characters"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Confirm Password</label>
                    <input
                      className="form-control"
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    className="btn btn-lg w-100 fw-bold rounded-pill"
                    style={{ background: "#6D28D9", color: "white" }}
                    onClick={handlePasswordChange}
                  >
                    Update Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}
