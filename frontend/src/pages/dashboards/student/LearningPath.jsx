import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  Lock, 
  PlayCircle, 
  Trophy, 
  Star, 
  Map, 
  Building2, 
  Sparkles 
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../../../api/api";

const LearningPath = () => {
  const [activeTab, setActiveTab] = useState("personal"); // 'personal' (AI) vs 'corporate' (HR)
  const [roadmap, setRoadmap] = useState([]); // For AI Roadmap
  const [corporatePaths, setCorporatePaths] = useState([]); // For HR Assigned Paths
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || {});
  
  const navigate = useNavigate();

  const colors = {
    completed: "#10b981",
    active: "#6f42c1",
    locked: "#94a3b8",
    bg: "#fcfaff"
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch AI Roadmap
      const aiRes = await api.get("/ai/roadmap");
      if (aiRes.data.success) {
        setRoadmap(aiRes.data.roadmap);
      }

      // 2. Fetch Corporate Paths (Sirf tab chalega agar companyId hai)
      if (user.companyId) {
        // Ensure this endpoint matches your backend route for fetching a student's assigned paths
        const corpRes = await api.get("/hr/my-learning-paths");
        if (corpRes.data.success) {
          // BUG FIXED HERE: Changed 'res' to 'corpRes'
          setCorporatePaths(corpRes.data.data);
        }
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" />
    </div>
  );

  // --- Sub-Component: AI Roadmap Section ---
  const PersonalRoadmap = () => (
    <div className="col-lg-8 position-relative mx-auto">
      {roadmap.length === 0 ? (
        <div className="text-center py-5">
           <Map size={60} className="text-muted mb-3 opacity-50" />
           <h2 className="fw-bold">No AI Journey Found</h2>
           <p className="text-muted">Update your goals to generate an AI roadmap.</p>
           <button className="btn btn-primary mt-3" onClick={() => navigate('/profile')}>Update Profile</button>
        </div>
      ) : (
        <>
          <div className="position-absolute h-100" style={{ width: '4px', background: '#e2e8f0', left: '38px', top: '20px', zIndex: 0 }}></div>
          {roadmap.map((step) => (
            <div key={step._id} className="d-flex mb-5 position-relative align-items-center z-1">
              <div className="d-flex align-items-center justify-content-center rounded-circle border border-4 border-white shadow-sm flex-shrink-0" 
                style={{ width: '50px', height: '50px', backgroundColor: step.status === 'completed' ? colors.completed : step.status === 'in-progress' ? colors.active : colors.locked, color: 'white', marginLeft: '15px' }}>
                {step.status === 'completed' ? <CheckCircle2 size={24} /> : step.status === 'in-progress' ? <PlayCircle size={24} /> : <Lock size={20} />}
              </div>
              <div className="ms-4 card border-0 shadow-sm rounded-4 overflow-hidden flex-grow-1" style={{ opacity: step.status === 'locked' ? 0.6 : 1, borderLeft: `6px solid ${step.status === 'completed' ? colors.completed : step.status === 'in-progress' ? colors.active : colors.locked}` }}>
                <div className="row g-0 align-items-center">
                  <div className="col-md-8 p-4">
                    <span className="badge bg-light text-secondary mb-2 text-uppercase">{step.level}</span>
                    <h5 className="fw-bold text-dark mb-1">{step.title}</h5>
                    <button className="btn btn-sm px-4 mt-3 rounded-pill fw-bold" style={{ backgroundColor: colors.active, color: 'white' }} onClick={() => navigate(`/courses/${step._id}`)}>
                      {step.status === 'completed' ? "Review Course" : "Continue Learning"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  // --- Sub-Component: Corporate Path Section ---
  const CorporateRoadmap = () => (
    <div className="col-lg-9 mx-auto">
      {corporatePaths.length === 0 ? (
        <div className="text-center py-5">
          <Building2 size={60} className="text-muted mb-3 opacity-50" />
          <h2 className="fw-bold">No Corporate Path</h2>
          <p className="text-muted">Your organization hasn't assigned a specific roadmap yet.</p>
        </div>
      ) : (
        corporatePaths.map((path) => (
          <div key={path._id} className="mb-5 bg-white p-4 rounded-4 shadow-sm border">
            <h4 className="fw-bold text-primary mb-3"><Building2 size={20} className="me-2"/> {path.title}</h4>
            <div className="position-relative ps-4">
              <div className="position-absolute h-100" style={{ width: '4px', background: '#e2e8f0', left: '38px', top: '0' }}></div>
              {path.courses.map((course) => (
                <div key={course._id} className="d-flex mb-4 position-relative align-items-center">
                  <div className="rounded-circle bg-white border border-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px', zIndex: 1, marginLeft: '18px' }}>
                    <PlayCircle size={20} className="text-primary" />
                  </div>
                  <div className="ms-4 card border-0 bg-light p-3 flex-grow-1">
                    <h6 className="fw-bold m-0">{course.title}</h6>
                    <button className="btn btn-link btn-sm p-0 text-start text-decoration-none" onClick={() => navigate(`/courses/${course._id}`)}>Go to course →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="container-fluid py-5" style={{ backgroundColor: colors.bg, minHeight: "100vh" }}>
      <div className="container">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="fw-bolder text-dark mb-2 display-6">Learning Path</h1>
          <p className="text-muted">Choose your journey and start learning.</p>
        </div>

        {/* Tab Switcher - Only shows if user is part of a company */}
        {user.companyId && (
          <div className="d-flex justify-content-center mb-5">
            <div className="btn-group p-1 bg-white shadow-sm rounded-pill border">
              <button 
                className={`btn rounded-pill px-4 fw-bold ${activeTab === 'personal' ? 'btn-primary' : 'btn-light text-muted'}`}
                onClick={() => setActiveTab('personal')}
              >
                <Sparkles size={18} className="me-2" /> My AI Roadmap
              </button>
              <button 
                className={`btn rounded-pill px-4 fw-bold ${activeTab === 'corporate' ? 'btn-primary' : 'btn-light text-muted'}`}
                onClick={() => setActiveTab('corporate')}
              >
                <Building2 size={18} className="me-2" /> Corporate Training
              </button>
            </div>
          </div>
        )}

        <div className="row justify-content-center">
          {activeTab === 'personal' ? <PersonalRoadmap /> : <CorporateRoadmap />}
        </div>
      </div>
    </div>
  );
};

export default LearningPath;