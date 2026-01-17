import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/api";
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp, FaClock, FaListOl, FaExclamationTriangle } from "react-icons/fa";

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
    border: "#e2e8f0"
  };

  const isCourseEditable = (status) => EDITABLE_STATUSES.includes(status);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await api.get("/instructor/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const coursesData = res.data.courses.map((course) => ({
          ...course,
          exams: [],
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
    fetchCourses();
  }, [token]);

  useEffect(() => {
    if (selectedCourseId && courses.length > 0) {
      setCourses((prev) =>
        prev.map((course) =>
          course._id === selectedCourseId ? { ...course, expanded: true } : course
        )
      );
    }
  }, [selectedCourseId, courses]);

  const toggleCourse = async (courseId) => {
    setCourses((prev) =>
      prev.map((course) =>
        course._id === courseId ? { ...course, expanded: !course.expanded } : course
      )
    );

    const course = courses.find((c) => c._id === courseId);
    if (course && course.exams.length === 0) {
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
              ? { ...c, exams: res.data.exams || [], examsLoading: false }
              : c
          )
        );
      } catch (err) {
        setError("Failed to fetch exams");
      }
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
    if (!isCourseEditable(course.status)) {
      setWarning("You cannot add/edit exams for an approved course!");
      return;
    }

    setCurrentCourseId(courseId);
    if (exam) {
      setEditingExam(exam);
      setForm({
        title: exam.title,
        duration: exam.duration,
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
    if (!isCourseEditable(course.status)) return;

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
                  exams: c.exams.map((ex) => (ex._id === editingExam._id ? res.data.exam : ex)),
                }
          )
        );
      } else {
        res = await api.post(`/instructor/course/${currentCourseId}/add-exam`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourses((prev) =>
          prev.map((c) =>
            c._id !== currentCourseId ? c : { ...c, exams: [...c.exams, res.data.exam] }
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
    if (!isCourseEditable(course.status)) return;
    if (!window.confirm("Are you sure you want to delete this exam?")) return;

    try {
      await api.delete(`/instructor/exam/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses((prev) =>
        prev.map((c) =>
          c._id !== courseId ? c : { ...c, exams: c.exams.filter((ex) => ex._id !== examId) }
        )
      );
    } catch (err) {
      setError("Failed to delete exam");
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

        .question-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid ${colors.border}; margin-bottom: 20px; }
        .opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        @media (max-width: 600px) { .opt-grid { grid-template-columns: 1fr; } }
      `}</style>

      <h2 style={{ marginBottom: "25px", fontWeight: "800", color: "#1e293b" }}>Manage Exams</h2>

      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "14px", borderRadius: "10px", marginBottom: "20px" }}>{error}</div>}
      {warning && <div style={{ background: "#fef3c7", color: "#92400e", padding: "14px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}><FaExclamationTriangle /> {warning}</div>}

      {courses.map((course) => (
        <div key={course._id} className="course-row">
          <div className="course-header" onClick={() => toggleCourse(course._id)} style={{ background: course._id === selectedCourseId ? colors.primaryLight : "white" }}>
            <div>
              <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>{course.title}</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                Status: <span style={{ fontWeight: "bold", color: course.status === "approved" ? colors.success : colors.warning }}>{course.status.toUpperCase()}</span>
              </div>
            </div>
            {course.expanded ? <FaChevronUp color={colors.primary} /> : <FaChevronDown color="#94a3b8" />}
          </div>

          <div style={{ maxHeight: course.expanded ? "5000px" : "0px", overflow: "hidden", transition: "max-height 0.5s ease" }}>
            <button className="btn-add" onClick={() => openModal(course._id)} disabled={!isCourseEditable(course.status)}>
              <FaPlus size={12} /> Add New Exam
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
                        <td><FaListOl style={{ marginRight: "6px", opacity: 0.5 }} /> {exam.questions?.length || 0} items</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end" }}>
                            <FaEdit onClick={() => openModal(course._id, exam)} style={{ cursor: isCourseEditable(course.status) ? "pointer" : "not-allowed", color: colors.primary, opacity: isCourseEditable(course.status) ? 1 : 0.3 }} />
                            <FaTrash onClick={() => handleDelete(course._id, exam._id)} style={{ cursor: isCourseEditable(course.status) ? "pointer" : "not-allowed", color: colors.danger, opacity: isCourseEditable(course.status) ? 1 : 0.3 }} />
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
                           <FaEdit onClick={() => openModal(course._id, exam)} style={{ color: colors.primary }} />
                           <FaTrash onClick={() => handleDelete(course._id, exam._id)} style={{ color: colors.danger }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "15px", fontSize: "0.8rem", color: "#64748b" }}>
                        <span><FaClock /> {exam.duration}m</span>
                        <span><FaListOl /> {exam.questions?.length} Qs</span>
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
              <label style={labelStyle}>Exam Title</label>
              <input name="title" value={form.title} onChange={handleChange} required style={inputStyle} placeholder="Final Assessment" />

              <label style={labelStyle}>Duration (Minutes)</label>
              <input name="duration" type="number" value={form.duration} onChange={handleChange} required style={inputStyle} placeholder="60" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "25px 0 15px 0" }}>
                <h4 style={{ margin: 0 }}>Questions ({form.questions.length})</h4>
                <button type="button" onClick={addQuestion} style={{ background: colors.primary, color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>+ Add Question</button>
              </div>

              {form.questions.map((q, qIndex) => (
                <div key={qIndex} className="question-box">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ fontWeight: "800", color: colors.primary }}># {qIndex + 1}</span>
                    <button type="button" onClick={() => removeQuestion(qIndex)} style={{ background: "none", border: "none", color: colors.danger, fontWeight: "700", cursor: "pointer", fontSize: "0.75rem" }}>REMOVE</button>
                  </div>

                  <label style={labelStyle}>Question Text</label>
                  <input value={q.questionText} onChange={(e) => handleQuestionChange(qIndex, "questionText", e.target.value)} required style={inputStyle} placeholder="What is the output of..." />

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
                        {q.options.map((opt, idx) => opt.trim() && <option key={idx} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Marks</label>
                      <input type="number" value={q.marks} onChange={(e) => handleQuestionChange(qIndex, "marks", e.target.value)} style={inputStyle} />
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
    </div>
  );
}

// Styled Components Replacements
const modalOverlayStyle = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "10px", backdropFilter: "blur(4px)" };
const modalContentStyle = { background: "#fff", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "750px", maxHeight: "90vh", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" };
const labelStyle = { display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", marginBottom: "6px", textTransform: "uppercase" };
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "15px", boxSizing: "border-box", fontSize: "15px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };
const submitBtnStyle = { padding: "10px 20px", background: "#6f42c1", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" };