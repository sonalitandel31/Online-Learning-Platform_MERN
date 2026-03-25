import React, { useEffect, useState } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";
import { Brain, Target, Zap, ChevronRight, AlertCircle, Search } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import api from "../../../api/api";

const SkillAnalysis = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); 

  const colors = {
    primary: "#6f42c1",
    secondary: "#ec4899",
    success: "#10b981",
    warning: "#f59e0b",
    bg: "#fcfaff"
  };

  useEffect(() => {
    const fetchSkillData = async () => {
      try {
        const res = await api.get("/ai/skill-analysis");
        if (res.data.success) {
          setSkills(res.data.skills);
        }
      } catch (err) {
        console.error("Error fetching skills", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSkillData();
  }, []);

  // Filter logic for the search bar
  const filteredSkills = skills.filter(s =>
    s.skillName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Weak skills for insights
  const weakSkills = skills.filter(s => s.level < 50);

  // Helper to calculate overall readiness (average of all skills)
  const overallReadiness = skills.length > 0 
    ? Math.round(skills.reduce((acc, curr) => acc + curr.level, 0) / skills.length) 
    : 0;

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" />
    </div>
  );

  return (
    <div className="container-fluid py-5" style={{ backgroundColor: colors.bg, minHeight: "100vh" }}>
      <div className="container">
        {/* Header Section */}
        <div className="row mb-5 align-items-center">
          <div className="col-md-7">
            <h1 className="fw-bolder text-dark display-5 mb-2">AI Skill Intelligence</h1>
            <p className="text-muted fs-5">Deep analysis of your technical proficiency based on exams and behavioral data.</p>
          </div>
          <div className="col-md-5 text-md-end">
            <div className="p-3 bg-white rounded-4 shadow-sm border d-inline-block">
              <span className="text-muted small d-block fw-bold mb-1">OVERALL READINESS</span>
              <h2 className="fw-bold mb-0 text-primary">{overallReadiness}%</h2>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* 1. Radar Chart: Holistic View */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
              <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                <Brain size={20} color={colors.primary} /> Proficiency Radar
              </h5>
              <div style={{ width: "100%", height: 350 }}>
                {/* Tip: Agar radar chart mein 10 se zyada items ho jayein toh wo messy lagta hai. 
                  Aap top 6-8 recent ya important skills hi slice karke chart ko pass kar sakte ho.
                  Example: data={skills.slice(0, 8)}
                */}
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skills.slice(0, 8)}> 
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="skillName" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Skill Level" dataKey="level" stroke={colors.primary} fill={colors.primary} fillOpacity={0.4} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="small text-muted text-center mt-3">
                This chart shows your balance across top technical domains.
              </p>
            </div>
          </div>

          {/* 2. Detailed Breakdown: Bars (NOW WITH SEARCH & SCROLL) */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white d-flex flex-column">
              
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <Target size={20} color={colors.secondary} /> Detailed Proficiency
                </h5>
                {/* Search Bar */}
                <div className="input-group input-group-sm w-50">
                  <span className="input-group-text bg-light border-end-0"><Search size={14} /></span>
                  <input 
                    type="text" 
                    className="form-control bg-light border-start-0 focus-ring-none shadow-none" 
                    placeholder="Search skills..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Scrollable Container (Fixed Height) */}
              <div 
                className="flex-grow-1 custom-scrollbar pe-2" 
                style={{ maxHeight: "350px", overflowY: "auto" }}
              >
                {filteredSkills.length === 0 ? (
                  <div className="text-center text-muted py-4 small">No skills found matching "{searchTerm}"</div>
                ) : (
                  filteredSkills.map((s, idx) => (
                    <div key={idx} className="mb-4">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-bold small text-dark">{s.skillName}</span>
                        <span className="fw-bold small text-primary">{s.level}%</span>
                      </div>
                      <div className="progress rounded-pill" style={{ height: "8px" }}>
                        <div
                          className="progress-bar"
                          style={{
                            width: `${s.level}%`,
                            backgroundColor: s.level > 70 ? colors.success : s.level > 40 ? colors.primary : colors.warning
                          }}
                        />
                      </div>
                      <div className="d-flex gap-3 mt-2">
                        <small className="text-muted" style={{fontSize: "11px"}}>Attempts: {s.totalQuestionsAttempted}</small>
                        <small className="text-muted" style={{fontSize: "11px"}}>Accuracy: {((s.correctAnswers / s.totalQuestionsAttempted) * 100 || 0).toFixed(0)}%</small>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>

          {/* 3. Actionable Insights (NOW SCROLLABLE) */}
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
              <div className="row g-0">
                <div className="col-md-4 bg-primary p-5 text-white d-flex flex-column justify-content-center">
                  <Zap size={40} className="mb-3" />
                  <h3 className="fw-bold">Smart Insights</h3>
                  <p className="opacity-75 mb-0">AI-generated recommendations to bridge your current skill gaps.</p>
                  <div className="mt-3 badge bg-white text-primary align-self-start px-3 py-2 rounded-pill">
                    {weakSkills.length} Action Items
                  </div>
                </div>
                
                <div className="col-md-8 bg-white">
                  {/* Scrollable List for Insights */}
                  <div className="list-group list-group-flush custom-scrollbar p-3" style={{ maxHeight: "250px", overflowY: "auto" }}>
                    {weakSkills.length === 0 ? (
                      <div className="text-center text-muted py-5">
                        <Target size={40} className="mb-2 opacity-50" />
                        <p>You are doing great! No immediate weak areas detected.</p>
                      </div>
                    ) : (
                      weakSkills.map((s, i) => (
                        <div key={i} className="list-group-item border-0 px-3 d-flex align-items-start gap-3 py-3 mb-2 bg-light rounded-3">
                          <div className="p-2 bg-white shadow-sm rounded-3 text-warning">
                            <AlertCircle size={20} />
                          </div>
                          <div>
                            <h6 className="fw-bold mb-1">Focus on {s.skillName}</h6>
                            <p className="text-muted small mb-1">Your proficiency is below 50%. We recommend taking a refresher course in this domain.</p>
                            <Link
                              to={`/courses/${s.courseId}`} className="btn btn-sm btn-link text-primary p-0 mt-1 fw-bold text-decoration-none"
                            >
                              View Recommended Course <ChevronRight size={14} />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillAnalysis;