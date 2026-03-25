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
  FaShieldAlt,
  FaCog,
  FaChartBar
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

  const [showExamPreview, setShowExamPreview] = useState(false);
  const [previewCourse, setPreviewCourse] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [examResults, setExamResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [currentExamTitle, setCurrentExamTitle] = useState("");

  const initialFormState = {
    title: "",
    duration: "",
    settings: {
      passingScore: 60,
      maxAttempts: 3,
      negativeMarking: 0,
      shuffleQuestions: false,
      shuffleOptions: false,
    },
    proctoring: {
      tabSwitchLimit: 3,
      fullscreenRequired: true,
      webcamRequired: false,
    },
    questions: [],
  };

  const [form, setForm] = useState(initialFormState);

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

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [name]: type === "checkbox" ? checked : Number(value),
      },
    }));
  };

  const handleProctoringChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      proctoring: {
        ...prev.proctoring,
        [name]: type === "checkbox" ? checked : Number(value),
      },
    }));
  };

  // --- CHANGED: Added skillTag to default object ---
  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { questionText: "", options: ["", "", "", ""], correctAnswer: "", marks: 1, skillTag: "" },
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
        settings: {
          passingScore: exam.settings?.passingScore ?? 60,
          maxAttempts: exam.settings?.maxAttempts ?? 3,
          negativeMarking: exam.settings?.negativeMarking ?? 0,
          shuffleQuestions: exam.settings?.shuffleQuestions ?? false,
          shuffleOptions: exam.settings?.shuffleOptions ?? false,
        },
        proctoring: {
          tabSwitchLimit: exam.proctoring?.tabSwitchLimit ?? 3,
          fullscreenRequired: exam.proctoring?.fullscreenRequired ?? true,
          webcamRequired: exam.proctoring?.webcamRequired ?? false,
        },
        questions: exam.questions || [],
      });
    } else {
      setEditingExam(null);
      setForm(initialFormState);
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
        duration: Number(form.duration),
        settings: form.settings,
        proctoring: form.proctoring,
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

      if (course && Array.isArray(course.exams) && course.exams.length > 0) {
        setPreviewCourse(course);
        return;
      }

      const res = await api.get(`/instructor/course/${courseId}/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const exams = res.data?.exams || [];

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

      setPreviewCourse({ ...(course || {}), _id: courseId, title: course?.title || "", exams });
    } catch (err) {
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

  const handleViewResults = async (exam) => {
    setResultsModalOpen(true);
    setCurrentExamTitle(exam.title);
    setResultsLoading(true);
    setResultsError("");
    setExamResults([]);

    try {
      const res = await api.get(`/instructor/exam-results/${exam._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExamResults(res.data.results || []);
    } catch (err) {
      console.error("Failed to fetch results", err);
      setResultsError("Failed to load exam results. Please try again.");
    } finally {
      setResultsLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "70vh" }}>
        <div className="spinner" />
        <p style={{ marginTop: "15px", color: colors.primary }}>Loading exams...</p>
        <style>{`.spinner { border: 4px solid #f3f3f3; border-top: 4px solid ${colors.primary}; border-radius: 50%; width: 45px; height: 45px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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

        .config-box { background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid ${colors.border}; margin-bottom: 20px; }
        .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .config-checkbox { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; font-weight: 600; color: #334155; }
        
        .question-box { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid ${colors.border}; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
        .opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        @media (max-width: 600px) { .opt-grid { grid-template-columns: 1fr; } }

        .pill { font-size: 0.75rem; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: ${colors.primary}; font-weight: 800; }
        
        .badge-success { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
        .badge-danger { background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
        .badge-warning { background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
      `}</style>

      <h2 style={{ marginBottom: "25px", fontWeight: "800", color: "#1e293b" }}>
        Manage Exams
      </h2>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "14px", borderRadius: "10px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {warning && (
        <div style={{ background: "#fef3c7", color: "#92400e", padding: "14px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <FaExclamationTriangle /> {warning}
        </div>
      )}

      {courses.map((course) => (
        <div key={course._id} className="course-row">
          <div
            className="course-header"
            onClick={() => toggleCourse(course._id)}
            style={{ background: course._id === selectedCourseId ? colors.primaryLight : "white" }}
          >
            <div>
              <div style={{ fontWeight: "700", fontSize: "1.1rem", display: "flex", gap: "10px", alignItems: "center" }}>
                {course.title}
                <span className="pill">
                  {course.examsCount === null || course.examsCount === undefined ? "..." : `${course.examsCount} Exams`}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                Status: <span style={{ fontWeight: "bold", color: course.status === "approved" ? colors.success : colors.warning }}>{(course.status || "").toUpperCase()}</span>
              </div>
            </div>
            {course.expanded ? <FaChevronUp color={colors.primary} /> : <FaChevronDown color="#94a3b8" />}
          </div>

          <div style={{ maxHeight: course.expanded ? "5000px" : "0px", overflow: "hidden", transition: "max-height 0.5s ease" }}>
            <button className="btn-add" onClick={() => openModal(course._id)} disabled={!isCourseEditable(course.status)}>
              <FaPlus size={12} /> Add New Exam
            </button>
            <button
              className="btn-add"
              type="button"
              onClick={() => openExamsPreview(course._id)}
              style={{ background: "rgba(111,66,193,0.12)", color: colors.primary, border: `1px solid rgba(111,66,193,0.25)`, marginTop: 0 }}
            >
              View Exams
            </button>

            {course.examsLoading ? (
              <p style={{ padding: "30px", textAlign: "center", color: colors.primary }}>Fetching exams...</p>
            ) : course.exams.length === 0 ? (
              <p style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No exams added to this course.</p>
            ) : (
              <>
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
                        <td><FaClock style={{ marginRight: "6px", opacity: 0.5 }} /> {exam.duration} mins</td>
                        <td><FaListOl style={{ marginRight: "6px", opacity: 0.5 }} /> {exam.questionsCount ?? 0} items</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end", alignItems: "center" }}>
                            <FaChartBar
                              onClick={() => handleViewResults(exam)}
                              style={{ cursor: "pointer", color: colors.success, fontSize: "1.1rem" }}
                              title="View Analytics & Results"
                            />
                            <FaEdit
                              onClick={() => openModal(course._id, exam)}
                              style={{ cursor: isCourseEditable(course.status) ? "pointer" : "not-allowed", color: colors.primary, opacity: isCourseEditable(course.status) ? 1 : 0.3 }}
                              title="Edit Exam"
                            />
                            <FaTrash
                              onClick={() => handleDelete(course._id, exam._id)}
                              style={{ cursor: isCourseEditable(course.status) ? "pointer" : "not-allowed", color: colors.danger, opacity: isCourseEditable(course.status) ? 1 : 0.3 }}
                              title="Delete Exam"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="exam-mobile-list">
                  {course.exams.map((exam) => (
                    <div key={exam._id} className="exam-card">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                        <div style={{ fontWeight: "700" }}>{exam.title}</div>
                        <div style={{ display: "flex", gap: "15px" }}>
                          <FaChartBar onClick={() => handleViewResults(exam)} style={{ color: colors.success }} />
                          <FaEdit onClick={() => openModal(course._id, exam)} style={{ color: colors.primary }} />
                          <FaTrash onClick={() => handleDelete(course._id, exam._id)} style={{ color: colors.danger }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "15px", fontSize: "0.8rem", color: "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FaClock /> {exam.duration}m</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FaListOl /> {exam.questions?.length || 0} Qs</span>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: colors.primary }}>{editingExam ? "Edit Exam" : "New Exam"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8" }}>&times;</button>
            </div>

            <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "10px" }}>

              <div className="config-box">
                <div className="config-grid">
                  <div>
                    <label style={labelStyle}>Exam Title</label>
                    <input name="title" value={form.title} onChange={handleChange} required style={inputStyle} placeholder="Final Assessment" />
                  </div>
                  <div>
                    <label style={labelStyle}>Duration (Minutes)</label>
                    <input name="duration" type="number" value={form.duration} onChange={handleChange} required style={inputStyle} placeholder="60" min="1" />
                  </div>
                </div>
              </div>

              {/* Exam Rules & Settings */}
              <div className="config-box">
                <h5 style={{ color: colors.primary, display: "flex", alignItems: "center", gap: "8px", marginTop: 0, marginBottom: "15px" }}>
                  <FaCog /> Exam Rules
                </h5>
                <div className="config-grid">
                  <div>
                    <label style={labelStyle}>Passing Score (%)</label>
                    <input name="passingScore" type="number" value={form.settings.passingScore} onChange={handleSettingChange} required style={inputStyle} min="1" max="100" />
                  </div>
                  <div>
                    <label style={labelStyle}>Max Attempts</label>
                    <input name="maxAttempts" type="number" value={form.settings.maxAttempts} onChange={handleSettingChange} required style={inputStyle} min="1" />
                  </div>
                  <div>
                    <label style={labelStyle}>Negative Marking</label>
                    <input name="negativeMarking" type="number" step="0.01" value={form.settings.negativeMarking} onChange={handleSettingChange} required style={inputStyle} min="0" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
                  <label className="config-checkbox">
                    <input type="checkbox" name="shuffleQuestions" checked={form.settings.shuffleQuestions} onChange={handleSettingChange} />
                    Shuffle Questions
                  </label>
                  <label className="config-checkbox">
                    <input type="checkbox" name="shuffleOptions" checked={form.settings.shuffleOptions} onChange={handleSettingChange} />
                    Shuffle Options
                  </label>
                </div>
              </div>

              {/* Security & Proctoring */}
              <div className="config-box" style={{ background: "#fff5f5", borderColor: "#fed7d7" }}>
                <h5 style={{ color: colors.danger, display: "flex", alignItems: "center", gap: "8px", marginTop: 0, marginBottom: "15px" }}>
                  <FaShieldAlt /> Security & Proctoring
                </h5>
                <div className="config-grid">
                  <div>
                    <label style={labelStyle}>Tab Switch Limit</label>
                    <input name="tabSwitchLimit" type="number" value={form.proctoring.tabSwitchLimit} onChange={handleProctoringChange} required style={{ ...inputStyle, borderColor: "#fed7d7" }} min="0" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
                  <label className="config-checkbox" style={{ color: colors.danger }}>
                    <input type="checkbox" name="fullscreenRequired" checked={form.proctoring.fullscreenRequired} onChange={handleProctoringChange} />
                    Require Fullscreen
                  </label>
                  <label className="config-checkbox" style={{ color: colors.danger }}>
                    <input type="checkbox" name="webcamRequired" checked={form.proctoring.webcamRequired} onChange={handleProctoringChange} />
                    Require Webcam Active
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "25px 0 15px 0" }}>
                <h4 style={{ margin: 0 }}>Questions ({form.questions.length})</h4>
                <button type="button" onClick={addQuestion} style={{ background: colors.primary, color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>
                  + Add Question
                </button>
              </div>

              {form.questions.map((q, qIndex) => (
                <div key={qIndex} className="question-box">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ fontWeight: "800", color: colors.primary }}># {qIndex + 1}</span>
                    <button type="button" onClick={() => removeQuestion(qIndex)} style={{ background: "none", border: "none", color: colors.danger, fontWeight: "700", cursor: "pointer", fontSize: "0.75rem" }}>
                      REMOVE
                    </button>
                  </div>

                  <label style={labelStyle}>Question Text</label>
                  <input value={q.questionText} onChange={(e) => handleQuestionChange(qIndex, "questionText", e.target.value)} required style={inputStyle} placeholder="What is the output of..." />

                  {/* --- CHANGED: Added Skill Tag Input --- */}
                  <label style={labelStyle}>Skill Tag (AI Tracking)</label>
                  <input value={q.skillTag || ""} onChange={(e) => handleQuestionChange(qIndex, "skillTag", e.target.value)} required style={inputStyle} placeholder="e.g. React Hooks, Algebra, CSS Grid" />

                  <label style={labelStyle}>Options</label>
                  <div className="opt-grid">
                    {q.options.map((opt, i) => (
                      <input key={i} placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => handleOptionChange(qIndex, i, e.target.value)} required style={{ ...inputStyle, marginBottom: 0 }} />
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "15px" }}>
                    <div>
                      <label style={labelStyle}>Correct Answer</label>
                      <select value={q.correctAnswer} onChange={(e) => handleQuestionChange(qIndex, "correctAnswer", e.target.value)} required style={inputStyle}>
                        <option value="">Select Option</option>
                        {q.options.map((opt, idx) => opt.trim() && (<option key={idx} value={opt}>{opt}</option>))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Marks</label>
                      <input type="number" value={q.marks} onChange={(e) => handleQuestionChange(qIndex, "marks", e.target.value)} style={inputStyle} min="1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", paddingTop: "15px", borderTop: `1px solid ${colors.border}` }}>
              <button type="button" onClick={() => setModalOpen(false)} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
              <button type="submit" disabled={submitting} style={submitBtnStyle}>{submitting ? "Saving..." : editingExam ? "Update Exam" : "Create Exam"}</button>
            </div>
          </form>
        </div>
      )}

      {/* --- NEW: Analytics / Results Modal --- */}
      {resultsModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "900px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: colors.primary, display: "flex", alignItems: "center", gap: "10px" }}>
                <FaChartBar /> Analytics: {currentExamTitle}
              </h3>
              <button onClick={() => setResultsModalOpen(false)} style={{ border: "none", background: "transparent", fontSize: "28px", cursor: "pointer", color: "#94a3b8" }}>&times;</button>
            </div>

            {resultsError && (
              <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "10px", marginBottom: "15px" }}>
                {resultsError}
              </div>
            )}

            {resultsLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: colors.primary, fontWeight: "bold" }}>
                Loading student results...
              </div>
            ) : examResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                No students have taken this exam yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: "60vh" }}>
                <table className="exam-table" style={{ display: "table", width: "100%" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#f8fafc" }}>
                    <tr>
                      <th>Student</th>
                      <th>Score</th>
                      <th>Attempt</th>
                      <th>Tab Switches</th>
                      <th>Security Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((res, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: "600" }}>{res.student?.name || "Unknown"}</td>
                        <td style={{ fontWeight: "bold", color: res.isPassed ? colors.success : colors.danger }}>
                          {res.score}%
                        </td>
                        <td>{res.attemptNumber}</td>
                        <td>
                          {res.cheat?.tabSwitches > 0 ? (
                            <span className="badge-warning">{res.cheat.tabSwitches} Warnings</span>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td>
                          {res.cheat?.autoSubmitted ? (
                            <span className="badge-danger">Disqualified (Auto-Submitted)</span>
                          ) : (
                            <span className="badge-success">Clean</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showExamPreview && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "950px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, color: colors.primary, fontWeight: 900 }}>Exams Preview</h3>
              <button onClick={closeExamsPreview} style={{ border: "none", background: "transparent", fontSize: "28px", cursor: "pointer", color: "#94a3b8" }}>&times;</button>
            </div>
            {previewLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: colors.primary, fontWeight: 700 }}>Loading exams...</div>
            ) : previewError ? (
              <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "10px" }}>{previewError}</div>
            ) : !previewCourse ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>No course found.</div>
            ) : (previewCourse.exams || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>No exams attached.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {(previewCourse.exams || []).map((ex, exIdx) => (
                  <div key={ex._id || exIdx} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: "14px", padding: "14px" }}>
                    <div style={{ fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span>{exIdx + 1}. {ex.title}</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 900, background: "#e6f4ea", color: "#15803d", padding: "2px 10px", borderRadius: "999px" }}>{ex.duration} min</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 900, background: "#eef2ff", color: colors.primary, padding: "2px 10px", borderRadius: "999px" }}>{(ex.questions || []).length} Qs</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px", paddingBottom: "12px", borderBottom: `1px dashed ${colors.border}` }}>
                      <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: `1px solid ${colors.border}`, padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                        Pass: {ex.settings?.passingScore ?? 60}%
                      </span>
                      <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: `1px solid ${colors.border}`, padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                        Negative Marking: {ex.settings?.negativeMarking ?? 0}
                      </span>
                      <span style={{ fontSize: "0.75rem", background: "#f8fafc", border: `1px solid ${colors.border}`, padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: "600" }}>
                        Attempts: {ex.settings?.maxAttempts ?? 3}
                      </span>
                      <span style={{ fontSize: "0.75rem", background: "#fff5f5", border: "1px solid #fed7d7", padding: "3px 8px", borderRadius: "6px", color: "#991b1b", fontWeight: "700" }}>
                        Tab Limit: {ex.proctoring?.tabSwitchLimit ?? 3}
                      </span>

                      {ex.proctoring?.webcamRequired && (
                        <span style={{ fontSize: "0.75rem", background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "6px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                          📸 Webcam Req.
                        </span>
                      )}

                      {ex.proctoring?.fullscreenRequired && (
                        <span style={{ fontSize: "0.75rem", background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "6px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                          🖥️ Fullscreen Req.
                        </span>
                      )}
                    </div>

                    {(ex.questions || []).length === 0 ? (
                      <div style={{ marginTop: "10px", color: "#94a3b8", fontStyle: "italic" }}>No questions provided.</div>
                    ) : (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(ex.questions || []).map((q, qIdx) => (
                          <div key={q._id || qIdx} style={{ background: "#f8fafc", border: `1px solid ${colors.border}`, borderRadius: "12px", padding: "12px" }}>
                            <div style={{ fontWeight: 800, marginBottom: "6px", color: "#0f172a" }}>
                              Q{qIdx + 1}. {q.questionText}
                              {/* --- CHANGED: Show Skill Tag in Preview --- */}
                              {q.skillTag && (
                                <span style={{ marginLeft: "10px", fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px" }}>
                                  {q.skillTag}
                                </span>
                              )}
                            </div>
                            <ul style={{ margin: 0, paddingLeft: "22px", color: "#334155" }}>
                              {(q.options || []).map((opt, oIdx) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <li key={`${qIdx}-${oIdx}`} style={{ marginBottom: "6px", fontWeight: isCorrect ? 900 : 400, color: isCorrect ? "#15803d" : "inherit" }}>
                                    {opt} {isCorrect ? "✅" : ""}
                                  </li>
                                );
                              })}
                            </ul>
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

const modalOverlayStyle = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "10px", backdropFilter: "blur(4px)" };
const modalContentStyle = { background: "#fff", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "750px", maxHeight: "90vh", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" };
const labelStyle = { display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", marginBottom: "6px", textTransform: "uppercase" };
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "15px", boxSizing: "border-box", fontSize: "15px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };
const submitBtnStyle = { padding: "10px 20px", background: "#6f42c1", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };