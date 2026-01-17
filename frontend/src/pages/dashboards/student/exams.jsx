import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { 
  ChevronLeft, Menu, X, Timer, Award, 
  RotateCcw, CheckCircle, AlertCircle, Bookmark, PlayCircle
} from "lucide-react";

export default function Exams() {
  const { courseId, examId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [exams, setExams] = useState([]);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [examStatuses, setExamStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem("user"));
  const studentId = loggedInUser?._id;

  const primaryPurple = "#6f42c1";
  const accentOrange = "#fcb269";

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const [courseRes, examsRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/exams/course/${courseId}`),
        ]);

        setCourse(courseRes.data);
        setExams(examsRes.data);

        const progressStatuses = {};
        await Promise.all(
          examsRes.data.map(async (ex) => {
            try {
              const res = await api.get(`/exams/${ex._id}/result/${studentId}`);
              if (res.data?.isCompleted) progressStatuses[ex._id] = "completed";
            } catch {
              progressStatuses[ex._id] = "pending";
            }
          })
        );
        setExamStatuses(progressStatuses);

        if (examId) {
          const singleExamRes = await api.get(`/exams/${examId}`);
          setExam(singleExamRes.data);
          setTimeLeft(singleExamRes.data.duration * 60);

          try {
            const attemptRes = await api.get(`/exams/${examId}/result/${studentId}`);
            if (attemptRes.data) {
              setAttemptNumber(attemptRes.data.attemptNumber || 0);
              setResult(attemptRes.data);
            }
          } catch (err) {
            if (err.response?.status === 404) setAttemptNumber(0);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, [courseId, examId, studentId]);

  useEffect(() => {
    if (!timeLeft || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const handleAnswerChange = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSubmit = async () => {
    if (submitted || attemptNumber >= 3) return;
    setSubmitted(true);
    try {
      let correct = 0;
      exam.questions.forEach((q) => {
        if (answers[q._id] === q.correctAnswer) correct++;
      });
      const score = Math.round((correct / exam.questions.length) * 100);
      const res = await api.post(`/exams/submit`, { studentId, courseId, examId, score });
      setResult(res.data);
      setAttemptNumber(res.data.attemptNumber || attemptNumber + 1);
      if (res.data.isCompleted) setExamStatuses(prev => ({ ...prev, [examId]: "completed" }));
    } catch (err) {
      setSubmitted(false);
      alert("Submission failed.");
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-warning"></div>
      <h5 className="ms-3 text-secondary fw-light">Loading exam...</h5>  
    </div>
  );

  return (
    <div className="exam-page-root">
      <style>{`
        .exam-page-root { display: flex; height: 100vh; background: #fff; overflow: hidden; position: relative; }
        
        /* Sidebar Responsive Fix */
        .exam-sidebar { 
          width: 350px; background: #fdfdfd; border-right: 1px solid #eee; 
          display: flex; flex-direction: column; transition: all 0.3s ease-in-out;
          height: 100vh; z-index: 2000;
        }
        .sidebar-header { padding: 25px; border-bottom: 2px solid #f8f8f8; }
        .exam-scroll-area { flex: 1; overflow-y: auto; }
        
        .exam-nav-item {
          padding: 18px 25px; cursor: pointer; border-bottom: 1px solid #f9f9f9;
          display: flex; align-items: center; gap: 15px; transition: 0.2s;
          color: #666; font-weight: 500; text-decoration: none;
        }
        .exam-nav-item:hover { background: #fcfaff; color: ${primaryPurple}; }
        .exam-nav-item.active { 
          background: #f3eeff; color: ${primaryPurple}; 
          border-left: 5px solid ${primaryPurple}; 
        }

        /* Overlay */
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); 
          z-index: 1500; display: none;
        }

        .exam-main-content { flex: 1; overflow-y: auto; background: #fff; width: 100%; }
        .sticky-top-bar {
          position: sticky; top: 0; z-index: 1000; background: #fff;
          padding: 15px 20px; border-bottom: 1px solid #eee;
          display: flex; justify-content: space-between; align-items: center;
        }

        .question-container { max-width: 850px; margin: 20px auto; padding: 0 15px; }
        .q-card { 
          border: 1px solid #efefef; border-radius: 15px; padding: 20px; 
          margin-bottom: 20px; transition: 0.3s;
        }
        
        .option-tile {
          display: flex; align-items: center; gap: 12px; padding: 12px;
          border: 2px solid #f0f0f0; border-radius: 12px; margin-top: 10px;
          cursor: pointer; transition: 0.2s;
        }
        .option-tile:hover { border-color: ${accentOrange}; background: #fff9f2; }
        .option-tile.selected { border-color: ${primaryPurple}; background: #f3eeff; }

        .btn-purple { background: ${primaryPurple}; color: white; border: none; }
        .btn-purple:hover { background: #5a32a3; color: white; }

        /* Mobile View Styles */
        @media (max-width: 991px) {
          .exam-sidebar { 
            position: fixed; left: 0; top: 0; 
            transform: ${sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'};
            box-shadow: ${sidebarOpen ? '10px 0 30px rgba(0,0,0,0.1)' : 'none'};
          }
          .overlay { display: ${sidebarOpen ? 'block' : 'none'}; }
          .sticky-top-bar { padding: 10px 15px; }
          .question-container { margin-top: 10px; }
          .q-card { padding: 15px; }
        }
      `}</style>

      {/* Click overlay to close sidebar on mobile */}
      <div className="overlay" onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className="exam-sidebar shadow-sm">
        <div className="sidebar-header d-flex justify-content-between align-items-center">
          <div>
            <button className="btn btn-link p-0 text-muted text-decoration-none small mb-2" onClick={() => navigate(`/courses/${courseId}`)}>
                <ChevronLeft size={16}/> Back to Course
            </button>
            <h5 className="fw-bold d-flex align-items-center gap-2 mb-0">
              <Bookmark size={20} className="text-purple"/> Assessments
            </h5>
          </div>
          <button className="btn d-lg-none p-0" onClick={() => setSidebarOpen(false)}>
            <X size={24} className="text-muted" />
          </button>
        </div>
        <div className="exam-scroll-area">
          {exams.map((ex, i) => (
            <div 
              key={ex._id} 
              className={`exam-nav-item ${ex._id === examId ? 'active' : ''}`}
              onClick={() => { navigate(`/course/${courseId}/exam/${ex._id}`); setSidebarOpen(false); }}
            >
              <div className="fw-bold" style={{ opacity: 0.4 }}>{i + 1 < 10 ? `0${i + 1}` : i + 1}</div>
              <div className="flex-grow-1 text-truncate small">{ex.title}</div>
              {examStatuses[ex._id] === "completed" && <CheckCircle size={18} className="text-success" />}
            </div>
          ))}
        </div>
      </aside>

      {/* Content Area */}
      <main className="exam-main-content">
        <div className="sticky-top-bar">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-light d-lg-none p-2" onClick={() => setSidebarOpen(true)}>
              <Menu size={20}/>
            </button>
            {exam && (
              <div className="d-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill">
                <Timer size={16} className={timeLeft < 60 ? "text-danger" : "text-purple"}/>
                <span className={`fw-bold small ${timeLeft < 60 ? 'text-danger' : 'text-purple'}`}>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
          <button className="btn btn-purple rounded-pill px-3 py-1 btn-sm fw-bold shadow-sm" onClick={handleSubmit} disabled={submitted}>
            Submit Exam
          </button>
        </div>

        <div className="question-container">
          {!examId || !exam ? (
            <div className="text-center py-5">
              <PlayCircle size={60} className="text-purple opacity-25 mb-4"/>
              <h2 className="fw-bold">Ready to Start?</h2>
              <p className="text-muted px-3">Select an assessment module from the list to begin.</p>
            </div>
          ) : (attemptNumber >= 3 || result?.isCompleted) && !submitted ? (
            <div className="card border-0 shadow-sm p-4 p-md-5 text-center rounded-4">
              <Award size={60} className="text-purple mb-4 mx-auto"/>
              <h2 className="fw-bold h4">Assessment View</h2>
              <p className="text-muted small mb-4">You have already completed this exam or reached the attempt limit.</p>
              
              <div className="row g-3 justify-content-center mb-4">
                <div className="col-6 col-sm-auto">
                   <div className="p-2 p-md-3 border rounded-3">
                     <small className="d-block text-muted" style={{ fontSize: '11px' }}>Your Best Score</small>
                     <span className="h5 fw-bold text-purple">{result?.bestScore}%</span>
                   </div>
                </div>
                <div className="col-6 col-sm-auto">
                   <div className="p-2 p-md-3 border rounded-3">
                     <small className="d-block text-muted" style={{ fontSize: '11px' }}>Attempts Used</small>
                     <span className="h5 fw-bold text-orange">{attemptNumber}/3</span>
                   </div>
                </div>
              </div>
              
              <button className="btn btn-purple px-4 py-2 rounded-pill fw-bold" onClick={() => navigate(`/courses/${courseId}`)}>
                Back to Lessons
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 border-bottom pb-3">
                <h2 className="fw-bold text-dark h4">{exam.title}</h2>
                <div className="d-flex gap-3 mt-2">
                  <span className="small text-muted d-flex align-items-center"><Bookmark size={14} className="text-orange me-1"/> {exam.questions.length} Qs</span>
                  <span className="small text-muted d-flex align-items-center"><Timer size={14} className="text-orange me-1"/> {exam.duration} Min</span>
                </div>
              </div>

              {exam.questions.map((q, index) => (
                <div key={q._id || index} className="q-card">
                  <div className="d-flex gap-2 mb-3">
                    <span className="badge p-2 px-3 rounded-pill d-flex align-items-center" style={{ background: '#f3eeff', color: primaryPurple, height: '30px' }}>
                      {index + 1}
                    </span>
                    <h6 className="fw-bold lh-base m-0 pt-1">{q.questionText}</h6>
                  </div>
                  <div className="options-grid">
                    {q.options.map((opt, i) => (
                      <div 
                        key={i} 
                        className={`option-tile ${answers[q._id] === opt ? 'selected' : ''}`}
                        onClick={() => handleAnswerChange(q._id, opt)}
                      >
                        <div className="dot border rounded-circle d-flex align-items-center justify-content-center" style={{ width: 16, height: 16, flexShrink: 0 }}>
                           {answers[q._id] === opt && <div className="rounded-circle" style={{ width: 8, height: 8, background: primaryPurple }}></div>}
                        </div>
                        <span className="small fw-medium">{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="text-center mt-4 pb-5">
                <button className="btn btn-purple btn-lg px-5 rounded-pill fw-bold shadow" onClick={handleSubmit}>
                   Complete & Submit
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}