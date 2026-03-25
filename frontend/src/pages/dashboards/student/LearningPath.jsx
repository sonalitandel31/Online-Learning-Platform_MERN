import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Lock, PlayCircle, Trophy, Star, Map } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../../../api/api";

const LearningPath = () => {
  const [roadmap, setRoadmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const colors = {
    completed: "#10b981", // Green
    active: "#6f42c1",    // Purple
    locked: "#94a3b8",    // Grey
    bg: "#fcfaff"
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
    try {
      const res = await api.get("/ai/roadmap");
      if (res.data.success) {
        setRoadmap(res.data.roadmap);
      }
    } catch (err) {
      console.error("Roadmap fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" />
    </div>
  );

  // IMPROVEMENT 1: Handle Empty State cleanly
  if (roadmap.length === 0) return (
    <div className="container text-center py-5 mt-5">
      <Map size={60} className="text-muted mb-3 opacity-50" />
      <h2 className="fw-bold">No Learning Path Found</h2>
      <p className="text-muted">Update your goals or interests in your profile to generate an AI roadmap.</p>
      <button className="btn btn-primary mt-3" onClick={() => navigate('/profile')}>Update Profile</button>
    </div>
  );

  return (
    <div className="container-fluid py-5" style={{ backgroundColor: colors.bg, minHeight: "100vh" }}>
      <div className="container">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="fw-bolder text-dark mb-2 display-5">Your Learning Journey</h1>
          <p className="text-muted fs-5">A step-by-step roadmap tailored to your goals.</p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8 position-relative">
            
            {/* The Vertical Timeline Line */}
            <div 
              className="position-absolute h-100" 
              style={{ width: '4px', background: '#e2e8f0', left: '38px', top: '20px', zIndex: 0 }}
            ></div>

            {/* Loop through courses */}
            {roadmap.map((step, index) => (
              <div key={step._id} className="d-flex mb-5 position-relative align-items-center z-1">
                
                {/* Status Icon Indicator */}
                <div 
                  className="d-flex align-items-center justify-content-center rounded-circle border border-4 border-white shadow-sm flex-shrink-0" 
                  style={{ 
                    width: '50px', 
                    height: '50px', 
                    backgroundColor: step.status === 'completed' ? colors.completed : step.status === 'in-progress' ? colors.active : colors.locked,
                    color: 'white',
                    marginLeft: '15px' // Aligns perfectly with the vertical line
                  }}
                >
                  {step.status === 'completed' ? <CheckCircle2 size={24} /> : step.status === 'in-progress' ? <PlayCircle size={24} /> : <Lock size={20} />}
                </div>

                {/* Course Details Card */}
                <div 
                  className="ms-4 card border-0 shadow-sm rounded-4 overflow-hidden flex-grow-1" 
                  style={{ 
                    opacity: step.status === 'locked' ? 0.6 : 1, // Dims locked courses
                    borderLeft: `6px solid ${step.status === 'completed' ? colors.completed : step.status === 'in-progress' ? colors.active : colors.locked}` 
                  }}
                >
                  <div className="row g-0 align-items-center">
                    {/* Thumbnail */}
                    <div className="col-md-4 d-none d-md-block h-100">
                      <img 
                        src={step.thumbnail ? `${import.meta.env.VITE_BASE_URL}${step.thumbnail}` : "https://via.placeholder.com/300x200?text=Course"} 
                        className="img-fluid h-100 object-fit-cover w-100" 
                        alt={step.title} 
                        style={{ minHeight: "180px" }}
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="col-md-8 p-4">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <span className="badge bg-light text-secondary mb-2 text-uppercase">{step.level}</span>
                          <h5 className="fw-bold text-dark mb-1">{step.title}</h5>
                          <p className="text-muted small mb-0">{step.category}</p>
                        </div>
                        {step.status === 'completed' && <div className="text-success fw-bold small bg-success bg-opacity-10 px-2 py-1 rounded"><Trophy size={14} className="me-1"/> Done</div>}
                      </div>

                      {/* Dynamic Bottom Section (Progress or Lock Info) */}
                      {step.status !== 'locked' ? (
                        <div className="mt-4">
                          <div className="d-flex justify-content-between mb-1 small text-muted">
                            <span>Course Progress</span>
                            <span className="fw-bold">{step.progress || 0}%</span>
                          </div>
                          <div className="progress mb-3 rounded-pill" style={{ height: '8px' }}>
                            <div className="progress-bar rounded-pill" style={{ width: `${step.progress || 0}%`, backgroundColor: colors.active }}></div>
                          </div>
                          <button 
                            className="btn btn-sm px-4 rounded-pill fw-bold" 
                            style={{ backgroundColor: colors.active, color: 'white' }}
                            onClick={() => navigate(`/courses/${step._id}`)}
                          >
                            {step.status === 'completed' ? "Review Course" : "Continue Learning"}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 py-2 px-3 bg-light border rounded-3 d-inline-block">
                          <Lock size={14} className="me-2 text-muted"/>
                          <span className="text-muted small fw-medium">Complete previous modules to unlock.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Final Milestone at the bottom */}
            <div className="text-center mt-5 position-relative z-1">
              <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-white shadow-sm border mb-3" style={{width: '80px', height: '80px'}}>
                <Star size={40} className="text-warning" fill="#ffc107" />
              </div>
              <h4 className="fw-bold">Career Readiness Goal</h4>
              <p className="text-muted small">Complete all modules above to achieve expert proficiency.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPath;