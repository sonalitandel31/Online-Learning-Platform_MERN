import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/api";

function MyLearnings() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(window.innerWidth);

  // ✅ timer state
  const [nowTs, setNowTs] = useState(Date.now());
  const timerRef = useRef(null);

  // ✅ gamification summary
  const [gamiLoading, setGamiLoading] = useState(true);
  const [gami, setGami] = useState({ xpTotal: 0, streakCount: 0, xpByCourse: [] });

  // ✅ badges overall + course-wise cache
  const [badgeLoading, setBadgeLoading] = useState(true);
  const [badges, setBadges] = useState([]); // global badges
  const [courseBadgesMap, setCourseBadgesMap] = useState({}); // { courseId: badges[] }

  const navigate = useNavigate();

  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;
  const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";

  // ✅ responsive
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ stable ticking timer (handles strict mode safely)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ✅ update immediately when tab becomes visible
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNowTs(Date.now());
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // ✅ fetch enrollments
  useEffect(() => {
    if (!studentId) {
      setError("User not logged in.");
      setLoading(false);
      return;
    }

    const fetchEnrollments = async () => {
      try {
        setLoading(true);

        const res = await api.get(`/enrollments`);
        const enrollmentsArray = Array.isArray(res.data)
          ? res.data
          : res.data.enrollments || res.data.data || [];

        const formatted = enrollmentsArray.map((enrollment) => ({
          enrollmentId: enrollment._id,
          enrollmentStatus: enrollment.status,
          expiryDate: enrollment.expiryDate,
          progress: enrollment.progress ?? 0,
          certificate: enrollment.certificate ?? null,

          amount: enrollment.amount ?? 0,
          paymentStatus: enrollment.paymentStatus,
          paymentId: enrollment.paymentId || null,
          orderId: enrollment.orderId || null,
          paymentDate: enrollment.paymentDate || null,

          receiptUrl: enrollment.receiptUrl || null,

          ...(enrollment.course || {}),
        }));

        setCourses(formatted);
      } catch (err) {
        setError("Failed to load your courses.");
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [studentId]);

  // ✅ fetch gamification overall
  useEffect(() => {
    const loadGamification = async () => {
      try {
        setGamiLoading(true);
        const res = await api.get("/gamification/me");
        setGami({
          xpTotal: res.data?.xpTotal ?? 0,
          streakCount: res.data?.streakCount ?? 0,
          xpByCourse: res.data?.xpByCourse ?? [],
        });
      } catch (e) {
        console.error("Gamification load failed:", e);
        setGami({ xpTotal: 0, streakCount: 0, xpByCourse: [] });
      } finally {
        setGamiLoading(false);
      }
    };

    loadGamification();
  }, []);

  // ✅ fetch global badges
  useEffect(() => {
    const loadBadges = async () => {
      try {
        setBadgeLoading(true);
        const res = await api.get("/gamification/badges");
        setBadges(Array.isArray(res.data?.badges) ? res.data.badges : []);
      } catch (e) {
        console.error("Badges load failed:", e);
        setBadges([]);
      } finally {
        setBadgeLoading(false);
      }
    };

    loadBadges();
  }, []);

  // ✅ fetch course badges on-demand (cache)
  const loadCourseBadges = async (courseId) => {
    try {
      if (!courseId) return;
      if (courseBadgesMap[String(courseId)]) return; // cached

      const res = await api.get(`/gamification/badges?courseId=${courseId}`);
      const list = Array.isArray(res.data?.badges) ? res.data.badges : [];

      setCourseBadgesMap((prev) => ({
        ...prev,
        [String(courseId)]: list,
      }));
    } catch (e) {
      console.error("Course badges fetch failed:", e);
      setCourseBadgesMap((prev) => ({
        ...prev,
        [String(courseId)]: [],
      }));
    }
  };

  // ✅ map courseId -> xp
  const xpMap = useMemo(() => {
    const map = {};
    (gami.xpByCourse || []).forEach((x) => {
      const courseId = x?.course?._id || x?.course;
      if (courseId) map[String(courseId)] = x?.xp ?? 0;
    });
    return map;
  }, [gami]);

  // ✅ certificate download
  const handleDownloadCertificate = (certificateUrl) => {
    if (!certificateUrl) return alert("No certificate available yet.");

    const link = document.createElement("a");
    link.href = `${BASE_URL}${certificateUrl}`;
    link.setAttribute("download", "certificate.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // ✅ receipt: direct download (blob)
  /* const handleDownloadReceipt = async (course) => {
    try {
      const amount = Number(course.amount || 0);
      if (amount <= 0) return;

      const receiptEndpoint = course.receiptUrl
        ? course.receiptUrl.startsWith("http")
          ? course.receiptUrl
          : `${BASE_URL}${course.receiptUrl}`
        : null;

      if (receiptEndpoint) {
        const res = await fetch(receiptEndpoint, { credentials: "include" });
        if (!res.ok) throw new Error("Receipt fetch failed");
        const blob = await res.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payment-receipt-${course.enrollmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      }

      const res = await api.get(`/enrollments/${course.enrollmentId}/receipt`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `payment-receipt-${course.enrollmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Receipt download failed.");
    }
  }; */

  // ✅ receipt: direct download (blob)
  const handleDownloadReceipt = async (course) => {
    try {
      const amount = Number(course.amount || 0);
      if (amount <= 0) return;

      const receiptEndpoint = course.receiptUrl
        ? course.receiptUrl.startsWith("http")
          ? course.receiptUrl
          : `${BASE_URL}${course.receiptUrl}`
        : null;

      if (receiptEndpoint) {
        const res = await fetch(receiptEndpoint, { credentials: "include" });
        if (!res.ok) throw new Error("Receipt fetch failed");
        const blob = await res.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payment-receipt-${course.enrollmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      }

      const res = await api.get(`/enrollments/${course.enrollmentId}/receipt`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `payment-receipt-${course.enrollmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      // 👇 NEW: Decode the blob error to see what the backend is actually complaining about
      if (e.response && e.response.data && e.response.data instanceof Blob) {
        const text = await e.response.data.text();
        try {
          const errData = JSON.parse(text);
          alert(errData.message || "Receipt download failed.");
        } catch {
          alert("Receipt download failed.");
        }
      } else {
        alert("Receipt download failed. " + (e.message || ""));
      }
    }
  };

  // ✅ badge status (priority)
  const getBadgeInfo = (course) => {
    const exp = course.expiryDate ? new Date(course.expiryDate) : null;
    const status = course.enrollmentStatus;
    const progress = course.progress ?? 0;
    const isExpired = exp ? exp.getTime() < nowTs : false;

    if (status === "cancelled") {
      return { label: "Cancelled", bg: "#F3F4F6", color: "#374151", border: "#9CA3AF" };
    }
    if (isExpired) {
      return { label: "Expired", bg: "#FEF2F2", color: "#B91C1C", border: "#FCA5A5" };
    }
    if (status === "completed" || progress >= 100) {
      return { label: "Completed", bg: "#ECFDF5", color: "#047857", border: "#6EE7B7" };
    }
    return { label: "Active", bg: "#EFF6FF", color: "#1D4ED8", border: "#93C5FD" };
  };

  // ✅ timer helpers
  const formatRemaining = (ms) => {
    if (ms <= 0) return "Expired";
    const totalSeconds = Math.floor(ms / 1000);

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const getExpiryText = (course) => {
    if (!course.expiryDate) return null;

    const exp = new Date(course.expiryDate).getTime();
    if (Number.isNaN(exp)) return "Invalid expiry date";

    const remaining = exp - nowTs;
    if (remaining <= 0) return "Expired";
    return `Expires in ${formatRemaining(remaining)}`;
  };

  // ✅ paid check (Reverted so the button shows up again)
  const hasPaid = useMemo(
    () => (course) => {
      const amount = Number(course.amount || 0);
      // Agar course free hai (amount 0 hai), toh receipt button nahi dikhega
      if (amount <= 0) return false; 
      
      // Sirf check karein ki payment complete hui hai ya nahi
      return course.paymentStatus === "complete" || !!(course.paymentId || course.orderId);
    },
    []
  );

  // styles
  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "80px auto",
      padding: "0 20px",
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: "#1a1a1a",
    },
    title: {
      fontSize: "2rem",
      fontWeight: "800",
      marginBottom: "30px",
      borderLeft: "6px solid #059669",
      paddingLeft: "15px",
      color: "#111827",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
    },
    grid: {
      display: "grid",
      gridTemplateColumns:
        width > 992 ? "1fr 1fr 1fr" : width > 600 ? "1fr 1fr" : "1fr",
      gap: "25px",
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      transition: "transform 0.2s ease",
      position: "relative",
    },
    thumbnail: (url) => ({
      height: "180px",
      width: "100%",
      backgroundImage: `url(${url})`,
      backgroundPosition: "center center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      overflow: "hidden",
      borderBottom: "1px solid #f3f4f6",
    }),
    badge: (info) => ({
      position: "absolute",
      top: "12px",
      left: "12px",
      background: info.bg,
      color: info.color,
      border: `1px solid ${info.border}`,
      padding: "6px 10px",
      borderRadius: "999px",
      fontSize: "0.78rem",
      fontWeight: "700",
      letterSpacing: "0.2px",
      backdropFilter: "blur(6px)",
    }),
    timerPill: (isDanger) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      borderRadius: "999px",
      border: `1px solid ${isDanger ? "#FCA5A5" : "#D1D5DB"}`,
      background: isDanger ? "#FEF2F2" : "#F9FAFB",
      color: isDanger ? "#B91C1C" : "#374151",
      fontSize: "0.78rem",
      fontWeight: "700",
      width: "fit-content",
      marginTop: "10px",
      marginBottom: "10px",
    }),
    details: {
      padding: "20px",
      flexGrow: 1,
      display: "flex",
      flexDirection: "column",
    },
    courseTitle: {
      fontSize: "1.2rem",
      margin: "0 0 10px 0",
      color: "#1f2937",
      fontWeight: "700",
    },
    description: {
      fontSize: "0.9rem",
      color: "#6b7280",
      lineHeight: "1.5",
      marginBottom: "10px",
    },
    xpLine: {
      fontSize: "0.85rem",
      fontWeight: "800",
      color: "#111827",
      marginTop: "6px",
      marginBottom: "6px",
    },
    badgeRow: {
      display: "flex",
      gap: "6px",
      flexWrap: "wrap",
      marginTop: "6px",
      marginBottom: "8px",
    },
    badgeChip: {
      fontSize: "11px",
      padding: "5px 10px",
      borderRadius: "999px",
      border: "1px solid #FDE68A",
      background: "#FFFBEB",
      fontWeight: 800,
      color: "#92400E",
      maxWidth: "100%",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    progressWrapper: {
      marginBottom: "16px",
      marginTop: "auto",
    },
    progressBg: {
      height: "8px",
      backgroundColor: "#f3f4f6",
      borderRadius: "10px",
      overflow: "hidden",
      marginBottom: "8px",
    },
    progressFill: (percent) => ({
      width: `${percent}%`,
      height: "100%",
      transition: "width 0.5s ease-out",
      backgroundColor:
        percent < 40 ? "#ef4444" : percent < 75 ? "#f59e0b" : "#10b981",
    }),
    progressText: {
      fontSize: "0.8rem",
      fontWeight: "600",
      color: "#4b5563",
    },
    btnContainer: {
      display: "flex",
      flexDirection: width < 420 ? "column" : "row",
      gap: "10px",
      marginTop: "12px",
    },
    primaryBtn: {
      flex: 1,
      padding: "8px",
      backgroundColor: "#232833",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontWeight: "600",
      cursor: "pointer",
      textAlign: "center",
    },
    receiptBtn: {
      flex: 1,
      padding: "8px",
      backgroundColor: "transparent",
      color: "#111827",
      border: "2px solid #111827",
      borderRadius: "8px",
      fontWeight: "600",
      cursor: "pointer",
    },
    certBtn: {
      flex: 1,
      padding: "8px",
      backgroundColor: "transparent",
      color: "#059669",
      border: "2px solid #059669",
      borderRadius: "8px",
      fontWeight: "600",
      cursor: "pointer",
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{`
          .skeleton {
            background: #e2e5e7;
            background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
            background-size: 200px 100%;
            background-repeat: no-repeat;
            border-radius: 4px;
            display: inline-block;
            line-height: 1;
            animation: skeletonShimmer 1.5s infinite linear;
          }
          @keyframes skeletonShimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
        `}</style>
        
        {/* Title Skeleton */}
        <div style={{ ...styles.title, borderLeftColor: "#e5e7eb" }}>
          <div className="skeleton" style={{ width: "250px", height: "40px", borderRadius: "8px" }}></div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div className="skeleton rounded-pill" style={{ width: "100px", height: "32px" }}></div>
            <div className="skeleton rounded-pill" style={{ width: "100px", height: "32px" }}></div>
            <div className="skeleton rounded-pill" style={{ width: "100px", height: "32px" }}></div>
          </div>
        </div>

        {/* Grid Skeleton */}
        <div style={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={styles.card}>
              <div className="skeleton" style={{ height: "180px", width: "100%", borderRadius: "16px 16px 0 0" }}></div>
              <div style={styles.details}>
                <div className="skeleton mb-3" style={{ height: "24px", width: "70%" }}></div>
                <div className="skeleton mb-2" style={{ height: "14px", width: "100%" }}></div>
                <div className="skeleton mb-4" style={{ height: "14px", width: "90%" }}></div>
                
                <div className="skeleton mb-4" style={{ height: "16px", width: "40%" }}></div>

                <div style={{ marginTop: "auto" }}>
                  <div className="skeleton mb-2" style={{ height: "8px", width: "100%", borderRadius: "10px" }}></div>
                  <div className="skeleton mb-3" style={{ height: "12px", width: "30%" }}></div>
                  
                  <div style={styles.btnContainer}>
                    <div className="skeleton" style={{ flex: 1, height: "40px", borderRadius: "8px" }}></div>
                    <div className="skeleton" style={{ flex: 1, height: "40px", borderRadius: "8px" }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error)
    return (
      <p style={{ textAlign: "center", color: "#ef4444", marginTop: "100px" }}>
        {error}
      </p>
    );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        <span>My Learnings</span>

        <span style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.9rem",
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontWeight: 800,
            }}
          >
            ⭐ Total XP: {gamiLoading ? "..." : gami.xpTotal}
          </span>

          <span
            style={{
              fontSize: "0.9rem",
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontWeight: 800,
            }}
          >
            🔥 Streak: {gamiLoading ? "..." : `${gami.streakCount} days`}
          </span>

          <span
            style={{
              fontSize: "0.9rem",
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontWeight: 800,
            }}
            title="Badges earned across all courses"
          >
            🏅 Badges: {badgeLoading ? "..." : badges.length}
          </span>
        </span>
      </h2>

      <div style={styles.grid}>
        {courses.map((course, idx) => {
          const progressPercent = course.progress ?? 0;

          const thumb = course.thumbnail
            ? course.thumbnail.startsWith("http")
              ? course.thumbnail
              : `${BASE_URL}${course.thumbnail}`
            : "/placeholder.png";

          const badge = getBadgeInfo(course);
          const isExpired = badge.label === "Expired";
          const isCancelled = badge.label === "Cancelled";
          const primaryLabel = isExpired || isCancelled ? "View Details" : "Continue";

          const expiryText = getExpiryText(course);
          const expDanger =
            expiryText &&
            expiryText !== "Expired" &&
            course.expiryDate &&
            new Date(course.expiryDate).getTime() - nowTs <= 24 * 60 * 60 * 1000;

          const courseXp = xpMap[String(course._id)] ?? 0;
          const courseBadges = courseBadgesMap[String(course._id)];

          return (
            <div
              key={course._id || idx}
              style={styles.card}
              onMouseEnter={() => loadCourseBadges(course._id)}
            >
              <span style={styles.badge(badge)}>{badge.label}</span>

              <div style={styles.thumbnail(thumb)} />

              <div style={styles.details}>
                <h3 style={styles.courseTitle}>{course.title || "Untitled Course"}</h3>

                <p style={styles.description}>
                  {course.description?.substring(0, 100) || "No description available."}...
                </p>

                <div style={styles.xpLine}>
                  ⭐ XP Earned: {gamiLoading ? "..." : courseXp}
                </div>

                {Array.isArray(courseBadges) && courseBadges.length > 0 && (
                  <div style={styles.badgeRow}>
                    {courseBadges.slice(0, 3).map((b, i) => (
                      <span
                        key={`${b.key}-${i}`}
                        style={styles.badgeChip}
                        title={b.description || b.title}
                      >
                        {b.icon || "🏅"} {b.title || b.key}
                      </span>
                    ))}
                    {courseBadges.length > 3 && (
                      <span style={{ ...styles.badgeChip, borderColor: "#E5E7EB", background: "#F9FAFB", color: "#111827" }}>
                        +{courseBadges.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {course.expiryDate && (
                  <div style={styles.timerPill(expDanger || isExpired)}>{expiryText}</div>
                )}

                <div style={styles.progressWrapper}>
                  <div style={styles.progressBg}>
                    <div style={styles.progressFill(progressPercent)} />
                  </div>
                  <span style={styles.progressText}>{progressPercent}% Completed</span>
                </div>

                <div style={styles.btnContainer}>
                  <button
                    onClick={() => navigate(`/courses/${course._id}`)}
                    style={styles.primaryBtn}
                  >
                    {primaryLabel}
                  </button>

                  {hasPaid(course) && (
                    <button
                      onClick={() => handleDownloadReceipt(course)}
                      style={styles.receiptBtn}
                      title="Download payment receipt"
                    >
                      Receipt
                    </button>
                  )}

                  {(progressPercent >= 100 || course.enrollmentStatus === "completed") && (
                    <button
                      onClick={() => navigate(`/certificate/${course.enrollmentId}`)}
                      style={styles.certBtn}
                    >
                      View Certificate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyLearnings;