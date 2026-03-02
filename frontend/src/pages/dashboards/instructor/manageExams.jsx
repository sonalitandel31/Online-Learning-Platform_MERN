import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaListOl,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function ManageExams() {
  const { courseId: selectedCourseId } = useParams();
  const token = localStorage.getItem("token");

  const EDITABLE_STATUSES = ["draft", "pendingApproval"];

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [currentCourseId, setCurrentCourseId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // --- Exam Preview Modal (View Exams Only) ---
  const [showExamPreview, setShowExamPreview] = useState(false);
  const [previewCourse, setPreviewCourse] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [form, setForm] = useState({
    title: "",
    duration: "",
    questions: [],
  });

  // --- Theme Colors ---
  const colors = {
    primary: "#6f42c1",
    primaryLight: "#e0d4f7",
    danger: "#dc3545",
    success: "#198754",
    warning: "#d97706",
    bg: "#f8fafc",
    border: "#e2e8f0",
  };

  const isCourseEditable = (status) => EDITABLE_STATUSES.includes(status);

  // fetch courses (with examsCount)
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await api.get("/instructor/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const coursesData = (res.data.courses || []).map((course) => ({
          ...course,
          exams: (course.exams || []).map((ex) => ({
            ...ex,
            questionsCount: Array.isArray(ex.questions) ? ex.questions.length : 0,
          })),
          examsCount:
            course.examsCount ??
            course.totalExams ??
            (Array.isArray(course.exams) ? course.exams.length : 0) ??
            0,
          expanded: false,
          examsLoading: false,
        }));

        setCourses(coursesData);
      } catch (err) {
        setError("Failed to fetch courses");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchCourses();
  }, [token]);

  // auto expand selected course (do NOT depend on courses)
  useEffect(() => {
    if (!selectedCourseId) return;
    setCourses((prev) =>
      prev.map((course) =>
        course._id === selectedCourseId ? { ...course, expanded: true } : course
      )
    );
  }, [selectedCourseId]);

  const toggleCourse = async (courseId) => {
    let shouldFetch = false;

    setCourses((prev) =>
      prev.map((c) => {
        if (c._id !== courseId) return c;
        if (!c.expanded && (c.exams?.length || 0) === 0) shouldFetch = true;
        return { ...c, expanded: !c.expanded };
      })
    );

    if (!shouldFetch) return;

    try {
      setCourses((prev) =>
        prev.map((c) => (c._id === courseId ? { ...c, examsLoading: true } : c))
      );

      const res = await api.get(`/instructor/course/${courseId}/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses((prev) =>
        prev.map((c) =>
          c._id === courseId
            ? { ...c, exams: res.data.exams || [], examsCount: res.data.examsCount ?? (res.data.exams || []).length, examsLoading: false }
            : c
        )
      );
    } catch {
      setError("Failed to fetch exams");
      setCourses((prev) =>
        prev.map((c) => (c._id === courseId ? { ...c, examsLoading: false } : c))
      );
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { questionText: "", options: ["", "", "", ""], correctAnswer: "", marks: 1 },
      ],
    }));
  };

  const removeQuestion = (index) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.questions];
      updated[index][field] = value;
      return { ...prev, questions: updated };
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setForm((prev) => {
      const updated = [...prev.questions];
      updated[qIndex].options[optIndex] = value;
      return { ...prev, questions: updated };
    });
  };

  const openModal = (courseId, exam = null) => {
    const course = courses.find((c) => c._id === courseId);
    if (!course) return;

    if (!isCourseEditable(course.status)) {
      setWarning("You cannot add/edit exams for an approved course!");
      return;
    }

    setCurrentCourseId(courseId);

    if (exam) {
      setEditingExam(exam);
      setForm({
        title: exam.title || "",
        duration: exam.duration || "",
        questions: exam.questions || [],
      });
    } else {
      setEditingExam(null);
      setForm({ title: "", duration: "", questions: [] });
    }

    setModalOpen(true);
    setError("");
    setWarning("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const course = courses.find((c) => c._id === currentCourseId);
    if (!course || !isCourseEditable(course.status)) return;

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        duration: form.duration,
        questions: form.questions,
      };

      let res;
      if (editingExam) {
        res = await api.put(`/instructor/exam/${editingExam._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourses((prev) =>
          prev.map((c) =>
            c._id !== currentCourseId
              ? c
              : {
                ...c,
                exams: c.exams.map((ex) =>
                  ex._id === editingExam._id ? res.data.exam : ex
                ),
              }
          )
        );
      } else {
        res = await api.post(`/instructor/course/${currentCourseId}/add-exam`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourses((prev) =>
          prev.map((c) =>
            c._id !== currentCourseId
              ? c
              : {
                ...c,
                exams: [...c.exams, res.data.exam],
                examsCount: (c.examsCount || 0) + 1,
              }
          )
        );
      }

      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save exam");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (courseId, examId) => {
    const course = courses.find((c) => c._id === courseId);
    if (!course || !isCourseEditable(course.status)) return;
    if (!window.confirm("Are you sure you want to delete this exam?")) return;

    try {
      await api.delete(`/instructor/exam/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses((prev) =>
        prev.map((c) =>
          c._id !== courseId
            ? c
            : {
              ...c,
              exams: c.exams.filter((ex) => ex._id !== examId),
              examsCount: Math.max((c.examsCount || 1) - 1, 0),
            }
        )
      );
    } catch (err) {
      setError("Failed to delete exam");
    }
  };

  const openExamsPreview = async (courseId) => {
    try {
      setShowExamPreview(true);
      setPreviewLoading(true);
      setPreviewError("");

      const course = courses.find((c) => c._id === courseId) || null;

      // If exams already present
      if (course && Array.isArray(course.exams) && course.exams.length > 0) {
        setPreviewCourse(course);
        return;
      }

      // Otherwise fetch
      const res = await api.get(`/instructor/course/${courseId}/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const exams = res.data?.exams || [];

      // update main list too
      setCourses((prev) =>
        prev.map((c) =>
          c._id === courseId
            ? {
              ...c,
              exams,
              examsCount: res.data.examsCount ?? exams.length,
            }
            : c
        )
      );

      // preview course
      setPreviewCourse({ ...(course || {}), _id: courseId, title: course?.title || "", exams });
    } catch (err) {
      console.error(err);
      setPreviewError(err?.response?.data?.message || "Failed to load exams");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeExamsPreview = () => {
    setShowExamPreview(false);
    setPreviewCourse(null);
    setPreviewError("");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "70vh",
        }}
      >
        <div className="spinner" />
        <p style={{ marginTop: "15px", color: colors.primary }}>Loading exams...</p>
        <style>{`
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid ${colors.primary};
            border-radius: 50%;
            width: 45px;
            height: 45px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="manage-exams-container">
      <style>{`
        .manage-exams-container { padding: 15px; background: ${colors.bg}; min-height: 100vh; }
        .course-row { background: #fff; border: 1px solid ${colors.border}; border-radius: 12px; margin-bottom: 15px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .course-header { padding: 18px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
        .course-header:hover { background: #f8fafc; }
        
        .exam-table { width: 100%; border-collapse: collapse; display: none; }
        .exam-table th { background: #f8fafc; padding: 14px; text-align: left; font-size: 0.85rem; color: #64748b; border-bottom: 1px solid ${colors.border}; text-transform: uppercase; }
        .exam-table td { padding: 14px; border-bottom: 1px solid ${colors.border}; vertical-align: middle; }

        .exam-mobile-list { display: flex; flex-direction: column; gap: 12px; padding: 15px; background: #fdfdfd; }
        .exam-card { background: #fff; padding: 16px; border-radius: 10px; border: 1px solid ${colors.border}; }

        @media (min-width: 768px) {
          .manage-exams-container { padding: 30px; }
          .exam-table { display: table; }
          .exam-mobile-list { display: none; }
        }

        .btn-add { background: ${colors.primary}; color: white; padding: 12px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 15px; }
        .btn-add:disabled { background: #cbd5e1; cursor: not-allowed; }

        .question-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid ${colors.border}; margin-bottom: 20px; }
        .opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        @media (max-width: 600px) { .opt-grid { grid-template-columns: 1fr; } }

        .pill { font-size: 0.75rem; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: ${colors.primary}; font-weight: 800; }
      `}</style>

      <h2 style={{ marginBottom: "25px", fontWeight: "800", color: "#1e293b" }}>
        Manage Exams
      </h2>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "14px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {warning && (
        <div
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "14px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FaExclamationTriangle /> {warning}
        </div>
      )}

      {courses.map((course) => (
        <div key={course._id} className="course-row">
          <div
            className="course-header"
            onClick={() => toggleCourse(course._id)}
            style={{
              background: course._id === selectedCourseId ? colors.primaryLight : "white",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "1.1rem",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                {course.title}
                <span className="pill">
                  {course.examsCount === null || course.examsCount === undefined
                    ? "..."
                    : `${course.examsCount} Exams`}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                Status:{" "}
                <span
                  style={{
                    fontWeight: "bold",
                    color: course.status === "approved" ? colors.success : colors.warning,
                  }}
                >
                  {(course.status || "").toUpperCase()}
                </span>
              </div>
            </div>

            {course.expanded ? (
              <FaChevronUp color={colors.primary} />
            ) : (
              <FaChevronDown color="#94a3b8" />
            )}
          </div>

          <div
            style={{
              maxHeight: course.expanded ? "5000px" : "0px",
              overflow: "hidden",
              transition: "max-height 0.5s ease",
            }}
          >
            <button
              className="btn-add"
              onClick={() => openModal(course._id)}
              disabled={!isCourseEditable(course.status)}
            >
              <FaPlus size={12} /> Add New Exam
            </button>
            <button
              className="btn-add"
              type="button"
              onClick={() => openExamsPreview(course._id)}
              style={{
                background: "rgba(111,66,193,0.12)",
                color: colors.primary,
                border: `1px solid rgba(111,66,193,0.25)`,
                marginTop: 0,
              }}
            >
              View Exams
            </button>

            {course.examsLoading ? (
              <p style={{ padding: "30px", textAlign: "center", color: colors.primary }}>
                Fetching exams...
              </p>
            ) : course.exams.length === 0 ? (
              <p style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                No exams added to this course.
              </p>
            ) : (
              <>
                {/* DESKTOP TABLE */}
                <table className="exam-table">
                  <thead>
                    <tr>
                      <th>Exam Title</th>
                      <th>Duration</th>
                      <th>Questions</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.exams.map((exam) => (
                      <tr key={exam._id}>
                        <td style={{ fontWeight: "600", color: "#334155" }}>{exam.title}</td>
                        <td>
                          <FaClock style={{ marginRight: "6px", opacity: 0.5 }} />{" "}
                          {exam.duration} mins
                        </td>
                        <td>
                          <FaListOl style={{ marginRight: "6px", opacity: 0.5 }} />{" "}
                          {exam.questionsCount ?? 0} items
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end" }}>
                            <FaEdit
                              onClick={() => openModal(course._id, exam)}
                              style={{
                                cursor: isCourseEditable(course.status) ? "pointer" : "not-allowed",
                                color: colors.primary,
                                opacity: isCourseEditable(course.status) ? 1 : 0.3,
                              }}
                            />
                            <FaTrash
                              onClick={() => handleDelete(course._id, exam._id)}
                              style={{
                                cursor: isCourseEditable(course.status) ? "pointer" : "not-allowed",
                                color: colors.danger,
                                opacity: isCourseEditable(course.status) ? 1 : 0.3,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* MOBILE LIST */}
                <div className="exam-mobile-list">
                  {course.exams.map((exam) => (
                    <div key={exam._id} className="exam-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={{ fontWeight: "700" }}>{exam.title}</div>
                        <div style={{ display: "flex", gap: "15px" }}>
                          <FaEdit onClick={() => openModal(course._id, exam)} style={{ color: colors.primary }} />
                          <FaTrash onClick={() => handleDelete(course._id, exam._id)} style={{ color: colors.danger }} />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "15px", fontSize: "0.8rem", color: "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FaClock /> {exam.duration}m
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FaListOl /> {exam.questions?.length || 0} Qs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      {modalOpen && (
        <div style={modalOverlayStyle}>
          <form onSubmit={handleSubmit} style={modalContentStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, color: colors.primary }}>
                {editingExam ? "Edit Exam" : "New Exam"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "10px" }}>
              <label style={labelStyle}>Exam Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="Final Assessment"
              />

              <label style={labelStyle}>Duration (Minutes)</label>
              <input
                name="duration"
                type="number"
                value={form.duration}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="60"
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "25px 0 15px 0",
                }}
              >
                <h4 style={{ margin: 0 }}>Questions ({form.questions.length})</h4>
                <button
                  type="button"
                  onClick={addQuestion}
                  style={{
                    background: colors.primary,
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                  }}
                >
                  + Add Question
                </button>
              </div>

              {form.questions.map((q, qIndex) => (
                <div key={qIndex} className="question-box">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ fontWeight: "800", color: colors.primary }}># {qIndex + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      style={{
                        background: "none",
                        border: "none",
                        color: colors.danger,
                        fontWeight: "700",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                      }}
                    >
                      REMOVE
                    </button>
                  </div>

                  <label style={labelStyle}>Question Text</label>
                  <input
                    value={q.questionText}
                    onChange={(e) => handleQuestionChange(qIndex, "questionText", e.target.value)}
                    required
                    style={inputStyle}
                    placeholder="What is the output of..."
                  />

                  <label style={labelStyle}>Options</label>
                  <div className="opt-grid">
                    {q.options.map((opt, i) => (
                      <input
                        key={i}
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(qIndex, i, e.target.value)}
                        required
                        style={{ ...inputStyle, marginBottom: 0 }}
                      />
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "15px" }}>
                    <div>
                      <label style={labelStyle}>Correct Answer</label>
                      <select
                        value={q.correctAnswer}
                        onChange={(e) => handleQuestionChange(qIndex, "correctAnswer", e.target.value)}
                        required
                        style={inputStyle}
                      >
                        <option value="">Select Option</option>
                        {q.options.map(
                          (opt, idx) =>
                            opt.trim() && (
                              <option key={idx} value={opt}>
                                {opt}
                              </option>
                            )
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Marks</label>
                      <input
                        type="number"
                        value={q.marks}
                        onChange={(e) => handleQuestionChange(qIndex, "marks", e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "20px",
                paddingTop: "15px",
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <button type="button" onClick={() => setModalOpen(false)} disabled={submitting} style={cancelBtnStyle}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} style={submitBtnStyle}>
                {submitting ? "Saving..." : editingExam ? "Update Exam" : "Create Exam"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showExamPreview && (
        <div style={modalOverlayStyle}>
          <div
            style={{
              ...modalContentStyle,
              maxWidth: "950px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, color: colors.primary, fontWeight: 900 }}>
                Exams Preview
              </h3>

              <button
                onClick={closeExamsPreview}
                style={{ border: "none", background: "transparent", fontSize: "28px", cursor: "pointer", color: "#94a3b8" }}
              >
                &times;
              </button>
            </div>

            {previewLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: colors.primary, fontWeight: 700 }}>
                Loading exams...
              </div>
            ) : previewError ? (
              <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "10px" }}>
                {previewError}
              </div>
            ) : !previewCourse ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                No course found.
              </div>
            ) : (previewCourse.exams || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                No exams attached.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {(previewCourse.exams || []).map((ex, exIdx) => (
                  <div
                    key={ex._id || exIdx}
                    style={{
                      background: "#fff",
                      border: `1px solid ${colors.border}`,
                      borderRadius: "14px",
                      padding: "14px",
                    }}
                  >
                    {/* Exam header */}
                    <div style={{ fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span>{exIdx + 1}. {ex.title}</span>

                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 900,
                          background: "#e6f4ea",
                          color: "#15803d",
                          padding: "2px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        {ex.duration} min
                      </span>

                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 900,
                          background: "#eef2ff",
                          color: colors.primary,
                          padding: "2px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        {(ex.questions || []).length} Qs
                      </span>
                    </div>

                    {/* Questions */}
                    {(ex.questions || []).length === 0 ? (
                      <div style={{ marginTop: "10px", color: "#94a3b8", fontStyle: "italic" }}>
                        No questions provided.
                      </div>
                    ) : (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(ex.questions || []).map((q, qIdx) => (
                          <div
                            key={q._id || qIdx}
                            style={{
                              background: "#f8fafc",
                              border: `1px solid ${colors.border}`,
                              borderRadius: "12px",
                              padding: "12px",
                            }}
                          >
                            <div style={{ fontWeight: 800, marginBottom: "6px", color: "#0f172a" }}>
                              Q{qIdx + 1}. {q.questionText}
                            </div>

                            <ul style={{ margin: 0, paddingLeft: "22px", color: "#334155" }}>
                              {(q.options || []).map((opt, oIdx) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <li
                                    key={`${qIdx}-${oIdx}`}
                                    style={{
                                      marginBottom: "6px",
                                      fontWeight: isCorrect ? 900 : 400,
                                      color: isCorrect ? "#15803d" : "inherit",
                                    }}
                                  >
                                    {opt} {isCorrect ? "✅" : ""}
                                  </li>
                                );
                              })}
                            </ul>

                           {/*  <div
                              style={{
                                marginTop: "10px",
                                background: "#dcfce7",
                                color: "#15803d",
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: "10px",
                                fontWeight: 900,
                                fontSize: "0.85rem",
                              }}
                            >
                              Correct Answer: {q.correctAnswer || "—"}
                            </div> */}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styled Components Replacements
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(15, 23, 42, 0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "10px",
  backdropFilter: "blur(4px)",
};

const modalContentStyle = {
  background: "#fff",
  padding: "25px",
  borderRadius: "15px",
  width: "100%",
  maxWidth: "750px",
  maxHeight: "90vh",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
};

const labelStyle = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: "700",
  color: "#64748b",
  marginBottom: "6px",
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  marginBottom: "15px",
  boxSizing: "border-box",
  fontSize: "15px",
};

const cancelBtnStyle = {
  padding: "10px 20px",
  background: "#f1f5f9",
  color: "#64748b",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};

const submitBtnStyle = {
  padding: "10px 20px",
  background: "#6f42c1",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};