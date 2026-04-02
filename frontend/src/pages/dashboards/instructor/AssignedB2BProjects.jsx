import React, { useState, useEffect } from "react";
import api from "../../../api/api";
import { useNavigate } from "react-router-dom";
import { 
  FaBuilding, 
  FaUsers, 
  FaClipboardList, 
  FaPlusCircle, 
  FaInfoCircle 
} from "react-icons/fa";

const AssignedB2BProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const fetchMyProjects = async () => {
    try {
      setLoading(true);
      // Backend API call (Jo humne pichle step mein discuss ki thi)
      const res = await api.get("/instructor/assigned-b2b-projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data.data);
    } catch (err) {
      setError("Failed to load assigned projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProjects();
  }, []);

 const handleStartProject = (project) => {
    navigate("/instructor-dashboard/add_courses", { 
      state: { 
        preFill: {
          title: project.topic,
          category: project.category?._id || project.category,
          isGlobal: false, // Kyunki ye B2B request hai
          selectedCompany: project.companyId?._id // Taaki company auto-select ho jaye
        }
      } 
    });
  };

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">Loading your B2B projects...</p>
    </div>
  );

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2 className="fw-bold">My B2B Assignments</h2>
        <p className="text-muted">High-priority custom training projects assigned to you by the Administrator.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {projects.length === 0 ? (
        <div className="text-center py-5 bg-white rounded shadow-sm border">
          <FaClipboardList size={50} className="text-muted opacity-25 mb-3" />
          <h4 className="text-muted">No projects assigned yet.</h4>
          <p className="text-muted small">When Admin assigns you a corporate request, it will appear here.</p>
        </div>
      ) : (
        <div className="row g-4">
          {projects.map((project) => (
            <div key={project._id} className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow-sm transition-all hover-shadow" style={{ borderRadius: '15px' }}>
                <div className="card-header bg-primary text-white py-3" style={{ borderRadius: '15px 15px 0 0' }}>
                  <div className="d-flex align-items-center gap-2 small mb-1 opacity-75">
                    <FaBuilding /> {project.companyId?.companyName}
                  </div>
                  <h5 className="card-title mb-0 fw-bold">{project.topic}</h5>
                </div>
                
                <div className="card-body">
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <span className="badge bg-info-subtle text-info border border-info rounded-pill px-3">
                      {project.category?.name || "Custom Category"}
                    </span>
                    <span className="small text-muted fw-bold">
                      <FaUsers className="me-1" /> {project.expectedEmployees} Trainees
                    </span>
                  </div>

                  <div className="mb-3">
                    <h6 className="fw-bold small text-uppercase text-muted" style={{ letterSpacing: '1px' }}>HR Requirements:</h6>
                    <p className="card-text small text-dark bg-light p-2 rounded" style={{ height: '80px', overflowY: 'auto' }}>
                      {project.requirements || "No specific requirements provided."}
                    </p>
                  </div>

                  {/* <div className="alert alert-warning py-2 small mb-0 border-0">
                    <FaInfoCircle className="me-1" /> <strong>Admin Note:</strong> {project.adminNotes || "Start course development ASAP."}
                  </div> */}
                </div>

                <div className="card-footer bg-white border-0 pb-3">
                  <button 
                    className="btn btn-primary w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                    onClick={() => handleStartProject(project)}
                  >
                    <FaPlusCircle /> Create Course Content
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .hover-shadow:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default AssignedB2BProjects;