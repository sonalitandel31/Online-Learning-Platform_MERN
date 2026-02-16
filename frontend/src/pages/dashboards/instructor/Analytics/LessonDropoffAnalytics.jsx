import { useEffect, useMemo, useState } from "react";
import { FaChalkboardTeacher, FaChartLine, FaSyncAlt } from "react-icons/fa";
import api from "../../../../api/api";

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
        bg: "#f8fafc",
        border: "#e2e8f0",
        textMain: "#1e293b",
        textMuted: "#64748b",
        card: "#ffffff",
    };

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
            console.error(e);
            setErr("Failed to load lesson drop-off analytics.");
            setRows([]);
            setSuggestions([]);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                setErr("");

                const list = await fetchInstructorCourses();
                const normalized = list
                    .map((c) => ({ _id: c._id, title: c.title || c.courseTitle || "Untitled" }))
                    .filter((c) => c._id);

                setCourses(normalized);

                const firstId = normalized[0]?._id || "";
                setSelectedCourseId(firstId);
                if (firstId) await fetchDropoff(firstId);
            } catch (e) {
                console.error(e);
                setErr("Could not load instructor courses.");
            } finally {
                setLoading(false);
            }
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (!selectedCourseId) return;
        fetchDropoff(selectedCourseId);
    }, [selectedCourseId]);

    // const worst = useMemo(() => rows.filter((r) => r.opens >= 10).slice(0, 10), [rows]);
    const worst = useMemo(() => rows.filter((r) => r.opens >= 1).slice(0, 50), [rows]);

    if (loading) return <div className="container mt-5">Loading...</div>;

    return (
        <div style={{ padding: 16, background: colors.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0, color: colors.textMain, fontWeight: 900 }}>Lesson Drop-Off</h2>
                <p style={{ margin: "6px 0 0", color: colors.textMuted, fontWeight: 500 }}>
                    Shows where students stop: lesson opened vs completed (last 30 days)
                </p>
            </div>

            {err && <div className="alert alert-danger">{err}</div>}

            {/* Filter */}
            <div
                style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginBottom: 14,
                }}
            >
                <div
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: "#f5f3ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: colors.primary,
                        fontSize: 18,
                    }}
                >
                    <FaChalkboardTeacher />
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: colors.textMuted, textTransform: "uppercase" }}>
                        Course
                    </div>
                    <select
                        className="form-select"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        style={{ marginTop: 6, borderRadius: 12, padding: "12px 12px", fontWeight: 700 }}
                    >
                        {courses.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className="btn btn-outline-dark"
                    onClick={() => fetchDropoff(selectedCourseId)}
                    style={{ borderRadius: 12, fontWeight: 800, padding: "12px 14px" }}
                    disabled={loadingData || !selectedCourseId}
                >
                    <FaSyncAlt style={{ marginRight: 8 }} />
                    {loadingData ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {/* Suggestions */}
            <div
                style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 14,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ color: colors.primary }}>
                        <FaChartLine />
                    </div>
                    <div style={{ fontWeight: 900, color: colors.textMain }}>Suggestions</div>
                </div>

                {suggestions.length === 0 ? (
                    <div style={{ color: colors.textMuted }}>No suggestions yet (need more data).</div>
                ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, color: colors.textMain }}>
                        {suggestions.map((s, i) => (
                            <li key={s.lessonId + i} style={{ marginBottom: 6 }}>
                                <div className="fw-bold">
                                    {s.lessonTitle}
                                </div>
                                <div style={{ fontSize: 13 }}>
                                    {s.message}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Table */}
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 900, color: colors.textMain, marginBottom: 10 }}>Lessons (worst drop first)</div>

                {worst.length === 0 ? (
                    <div style={{ color: colors.textMuted }}>No lesson data yet. Students must open/complete lessons.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm align-middle">
                            <thead>
                                <tr>
                                    <th>Lesson</th>
                                    <th>Opens</th>
                                    <th>Completes</th>
                                    <th>Completion %</th>
                                    <th>Drop %</th>
                                    <th>Last Open</th>
                                    <th>Last Complete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {worst.map((r) => (
                                    <tr key={r.lessonId}>
                                        <td>
                                            <div className="fw-bold">
                                                {r.lessonTitle || "Untitled Lesson"}
                                            </div>
                                            <div style={{ fontSize: 11, color: "#64748b" }}>
                                                {r.lessonId}
                                            </div>
                                        </td>
                                        <td className="fw-bold">{r.opens}</td>
                                        <td className="fw-bold">{r.completes}</td>
                                        <td className="fw-bold">{Math.round((r.completionRate || 0) * 100)}%</td>
                                        <td className="fw-bold">{Math.round((r.dropRate || 0) * 100)}%</td>
                                        <td style={{ fontSize: 12, color: colors.textMuted }}>
                                            {r.lastOpenAt ? new Date(r.lastOpenAt).toLocaleString() : "—"}
                                        </td>
                                        <td style={{ fontSize: 12, color: colors.textMuted }}>
                                            {r.lastCompleteAt ? new Date(r.lastCompleteAt).toLocaleString() : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ marginTop: 10, color: colors.textMuted, fontSize: 12 }}>
                    Note: We use <b>lesson_select</b> as "open".
                </div>
            </div>
        </div>
    );
}
