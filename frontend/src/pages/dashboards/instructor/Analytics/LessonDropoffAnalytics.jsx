import { useEffect, useMemo, useState } from "react";
import {
    FaChalkboardTeacher, FaChartLine, FaSyncAlt,
    FaLightbulb, FaArrowDown, FaRegClock, FaLayerGroup, FaInfoCircle
} from "react-icons/fa";
import api from "../../../../api/api";
import { motion, AnimatePresence } from "framer-motion";

export default function LessonDropoffAnalytics() {
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [rows, setRows] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [err, setErr] = useState("");

    const token = localStorage.getItem("token");

    const colors = {
        primary: "#6f42c1",
        primaryLight: "#f3e8ff",
        bg: "#f8fafc",
        border: "#e2e8f0",
        textMain: "#1e293b",
        textMuted: "#64748b",
        card: "#ffffff",
        danger: "#ef4444",
        warning: "#f59e0b",
        success: "#10b981"
    };

    // --- Core Logic remains unchanged ---
    const fetchInstructorCourses = async () => {
        const candidates = [
            "/instructor/courses",
            "/instructor/courses?status=approved",
            "/instructor-dashboard/instructor_courses",
            "/instructor/instructor_courses",
            "/instructor/my-courses",
        ];

        for (const url of candidates) {
            try {
                const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
                const list = res.data?.courses || res.data?.myCourses || (Array.isArray(res.data) ? res.data : null);
                if (Array.isArray(list)) return list;
            } catch { }
        }
        throw new Error("No instructor courses endpoint matched.");
    };

    const fetchDropoff = async (courseId) => {
        if (!courseId) return;
        try {
            setLoadingData(true);
            setErr("");
            const res = await api.get(`/analytics/insights/course/${courseId}/lesson-dropoff?days=30`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
            setSuggestions(Array.isArray(res.data?.suggestions) ? res.data.suggestions : []);
        } catch (e) {
            setErr("Failed to load lesson drop-off analytics.");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const list = await fetchInstructorCourses();
                const normalized = list
                    .map((c) => ({ _id: c._id, title: c.title || c.courseTitle || "Untitled" }))
                    .filter((c) => c._id);
                setCourses(normalized);
                const firstId = normalized[0]?._id || "";
                setSelectedCourseId(firstId);
                if (firstId) await fetchDropoff(firstId);
            } catch (e) {
                setErr("Could not load instructor courses.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [token]);

    useEffect(() => {
        if (selectedCourseId) fetchDropoff(selectedCourseId);
    }, [selectedCourseId]);

    const worst = useMemo(() => rows.filter((r) => r.opens >= 1).slice(0, 50), [rows]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
            <div className="spinner-grow text-primary" role="status"></div>
        </div>
    );

    return (
        <div style={{ padding: "clamp(16px, 4vw, 32px)", background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

                {/* Header Section */}
                <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", gap: "1.5rem" }}>
                    <div className="text-start">
                        <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900, letterSpacing: "-1px" }}>
                            Lesson Drop-Off
                        </h2>
                        <p style={{ margin: "4px 0 0", color: colors.textMuted, fontWeight: 500 }}>
                            Track content friction: Lesson opens vs completions (last 30 days)
                        </p>
                    </div>
                    <div>
                        <button
                            onClick={() => fetchDropoff(selectedCourseId)}
                            disabled={loadingData || !selectedCourseId}
                            style={{
                                background: "linear-gradient(135deg, #6f42c1 0%, #8553e8 100%)",
                                color: "#fff",
                                borderRadius: "14px",
                                padding: "12px 28px",
                                fontWeight: "700",
                                border: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "10px",
                                boxShadow: "0 10px 20px -5px rgba(111, 66, 193, 0.4)",
                                transition: "all 0.3s ease"
                            }}
                        >
                            <FaSyncAlt className={loadingData ? "fa-spin" : ""} />
                            {loadingData ? "Updating..." : "Refresh Analytics"}
                        </button>
                    </div>
                </header>

                {/* Filter Section */}
                <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
                    <div className="row g-3 align-items-center">
                        <div className="col-auto">
                            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", color: colors.primary, fontSize: "24px" }}>
                                <FaChalkboardTeacher />
                            </div>
                        </div>
                        <div className="col text-start">
                            <h6 className="m-0 fw-bold text-dark">Analytics Context</h6>
                            <p className="m-0 text-muted small">Viewing drop-off data for course content</p>
                        </div>
                        <div className="col-12 col-lg-5">
                            <select className="form-select border-0 bg-light fw-bold py-3" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} style={{ borderRadius: "14px", cursor: "pointer" }}>
                                {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    {/* Optimization Tips - Strictly Left Aligned */}
                    <div className="col-12 col-lg-4">
                        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", padding: "24px", height: "100%", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)" }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start", // Left Aligned
                                gap: "12px",
                                marginBottom: "1.5rem"
                            }}>
                                <div style={{ color: colors.primary, background: colors.primaryLight, padding: "8px", borderRadius: "10px", display: "flex" }}>
                                    <FaLightbulb />
                                </div>
                                <h5 className="m-0 fw-bold text-dark" style={{ letterSpacing: "-0.5px" }}>Optimization Tips</h5>
                            </div>

                            {suggestions.length === 0 ? (
                                <div className="text-start py-4">
                                    <p className="text-muted small">Insufficient data to generate optimization strategies at this time.</p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {suggestions.map((s, i) => (
                                        <div key={s.lessonId + i} className="text-start" style={{ padding: "16px", background: "#f8fafc", borderRadius: "16px", borderLeft: `4px solid ${colors.primary}` }}>
                                            <div className="fw-bold text-dark mb-1 small">{s.lessonTitle}</div>
                                            <div className="text-muted" style={{ fontSize: "12px", lineHeight: "1.5" }}>{s.message}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="col-12 col-lg-8">
                        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)" }}>
                            <div style={{
                                padding: "24px",
                                borderBottom: `1px solid ${colors.border}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: "12px"
                            }}>
                                <FaChartLine className="text-primary" />
                                <h5 className="m-0 fw-bold text-dark">Lesson Performance</h5>

                                <div className="badge bg-light text-muted fw-bold small rounded-pill px-3 py-2 border ms-auto">
                                    Last 30 Days
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead style={{ background: "#fcfcfd" }}>
                                        <tr style={{ color: colors.textMuted, fontSize: "11px", textTransform: "uppercase", fontWeight: "800" }}>
                                            <th className="ps-4 py-4 text-start">Content</th>
                                            <th className="text-center">Opens</th>
                                            <th className="text-center">Drops</th>
                                            <th className="text-center" style={{ minWidth: "120px" }}>Health</th>
                                            <th className="pe-4 text-end">Last Event</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {worst.map((r) => (
                                            <tr key={r.lessonId}>
                                                <td className="ps-4 text-start">
                                                    <div className="fw-bold text-dark mb-0">{r.lessonTitle || "Untitled"}</div>
                                                    <div style={{ fontSize: "10px" }} className="text-muted">{r.lessonId}</div>
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge bg-light text-dark border rounded-pill px-3">{r.opens}</span>
                                                </td>
                                                <td className="text-center">
                                                    <span style={{ fontWeight: "800", color: (r.dropRate || 0) > 0.4 ? colors.danger : colors.textMain }}>
                                                        {Math.round((r.dropRate || 0) * 100)}%
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <div className="progress" style={{ height: "6px", borderRadius: "10px" }}>
                                                        <div className="progress-bar" style={{
                                                            width: `${Math.round((r.completionRate || 0) * 100)}%`,
                                                            background: (r.completionRate || 0) > 0.7 ? colors.success : colors.warning
                                                        }} />
                                                    </div>
                                                </td>
                                                <td className="pe-4 text-end text-muted small">
                                                    {r.lastOpenAt ? new Date(r.lastOpenAt).toLocaleDateString() : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Info Section - Left Aligned */}
                            <div style={{ padding: "20px 24px", background: "#f8f9fa", borderTop: `1px solid ${colors.border}` }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", color: colors.textMuted, fontSize: "12px" }}>
                                    <FaInfoCircle />
                                    <span className="text-start">Pro Tip: System identifies "Opens" via <b>lesson_select</b> events. Refresh to sync latest student interactions.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}