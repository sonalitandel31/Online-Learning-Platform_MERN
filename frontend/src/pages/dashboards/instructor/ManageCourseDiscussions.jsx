import React, { useEffect, useState } from "react";
import { CheckCircle, MessageSquare, User, BookOpen, Send, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import api from "../../../api/api";

const CourseDiscussions = () => {
  const [groupedQuestions, setGroupedQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null); // Accordion effect ke liye

  const fetchDiscussions = async () => {
    try {
      const res = await api.get("/forum/instructor/questions");
      
      // Data ko Course Title ke hisab se group karna
      const groups = res.data.reduce((acc, q) => {
        const courseName = q.courseTitle || "Other Discussions";
        if (!acc[courseName]) acc[courseName] = [];
        acc[courseName].push(q);
        return acc;
      }, {});
      
      setGroupedQuestions(groups);
    } catch (err) {
      console.error("Failed to load discussions");
    } finally {
      setLoading(false);
    }
  };

  const markSolved = async (questionId, answerId) => {
    try {
      await api.put(`/forum/question/${questionId}/solve`, { answerId });
      fetchDiscussions();
    } catch (err) {
      console.error("Failed to mark as solved");
    }
  };

  const postAnswer = async (questionId, answerText) => {
    if (!answerText.trim()) return;
    try {
      await api.post("/forum/answer", { questionId, answerText });
      fetchDiscussions();
    } catch (err) {
      console.error("Failed to post answer");
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, []);

  if (loading) return (
    <div className="d-flex justify-content-center p-5">
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  return (
    <div className="container-fluid p-0">
      <style>{`
        :root {
          --brand-purple: #7e50d3;
          --brand-light-purple: #f3effb;
          --brand-orange: #fd7e14;
          --brand-yellow: #ffc107;
        }
        .course-card {
          border: none;
          border-radius: 20px;
          background: white;
          box-shadow: 0 10px 30px rgba(111, 66, 193, 0.05);
          margin-bottom: 25px;
          border: 1px solid rgba(111, 66, 193, 0.1);
        }
        .course-header {
          background: linear-gradient(90deg, var(--brand-purple), #8e67d5);
          color: white;
          padding: 20px;
          border-radius: 19px 19px 0 0;
          cursor: pointer;
        }
        .question-item {
          border-bottom: 1px solid #f0f0f0;
          padding: 20px;
        }
        .question-item:last-child { border-bottom: none; }
        
        .answer-box {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 12px;
          margin-top: 10px;
          border-left: 4px solid #dee2e6;
        }
        .verified-box {
          background: #fff9db;
          border-left-color: var(--brand-orange);
        }
        .btn-post {
          background: var(--brand-purple);
          color: white;
          border-radius: 8px;
          font-weight: 600;
        }
        .btn-post:hover { background: #5a32a3; color: white; }
        .badge-count {
          background: rgba(255,255,255,0.2);
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 0.8rem;
        }
      `}</style>

      <div className="d-flex align-items-center gap-2 mb-4">
        <h4 className="fw-bold m-0">Course Wise Discussions</h4>
      </div>

      {Object.keys(groupedQuestions).length === 0 ? (
        <div className="alert bg-brand-light text-center py-5 rounded-4">No questions found.</div>
      ) : (
        Object.entries(groupedQuestions).map(([courseName, questions]) => (
          <div key={courseName} className="course-card">
            {/* Course Header */}
            <div 
              className="course-header d-flex justify-content-between align-items-center"
              onClick={() => setExpandedCourse(expandedCourse === courseName ? null : courseName)}
            >
              <div className="d-flex align-items-center gap-3">
                <BookOpen size={24} />
                <div>
                  <h5 className="m-0 fw-bold">{courseName}</h5>
                  <span className="badge-count">{questions.length} Questions</span>
                </div>
              </div>
              {expandedCourse === courseName ? <ChevronUp /> : <ChevronDown />}
            </div>

            {/* Questions List for this Course */}
            {(expandedCourse === courseName || Object.keys(groupedQuestions).length === 1) && (
              <div className="card-body p-0">
                {questions.map((q) => (
                  <div key={q._id} className="question-item">
                    <div className="d-flex justify-content-between">
                      <h6 className="fw-bold text-dark">{q.title}</h6>
                      {q.isSolved && <span className="text-success small fw-bold"><CheckCircle size={14}/> Solved</span>}
                    </div>
                    <small className="text-muted"><User size={12}/> Asked by {q.userId?.name}</small>

                    {/* Answers Section */}
                    <div className="ms-3 mt-3">
                      {q.answers?.map((ans) => (
                        <div key={ans._id} className={`answer-box ${ans.isVerified ? 'verified-box' : ''}`}>
                          <div className="d-flex justify-content-between align-items-start">
                            <p className="small mb-1">{ans.answerText}</p>
                            {ans.isVerified && <ShieldCheck size={16} className="text-warning"/>}
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-1">
                            <small className="fw-bold text-brand-purple">{ans.userId?.name}</small>
                            {!q.isSolved && !ans.isVerified && (
                              <button 
                                className="btn btn-sm py-0 text-brand-orange fw-bold" 
                                onClick={() => markSolved(q._id, ans._id)}
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input for this question */}
                    {!q.isSolved && (
                      <div className="mt-3 d-flex gap-2">
                        <input
                          type="text"
                          className="form-control form-control-sm border-0 bg-light"
                          placeholder="Reply to this student..."
                          value={q.newAnswer || ""}
                          onChange={(e) => {
                            const updatedGroups = { ...groupedQuestions };
                            updatedGroups[courseName] = updatedGroups[courseName].map(ques => 
                              ques._id === q._id ? { ...ques, newAnswer: e.target.value } : ques
                            );
                            setGroupedQuestions(updatedGroups);
                          }}
                        />
                        <button 
                          className="btn btn-sm btn-post px-3"
                          onClick={() => postAnswer(q._id, q.newAnswer || "")}
                        >
                          <Send size={14}/>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default CourseDiscussions;