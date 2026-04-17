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
    <div className="container-fluid py-4">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .skeleton {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background-color: #e2e8f0;
        }
        .skeleton-darker {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background-color: #cbd5e1;
        }
      `}</style>
      
      <div className="mb-4">
        <div className="skeleton" style={{ height: "32px", width: "250px", marginBottom: "8px", borderRadius: "6px" }}></div>
        <div className="skeleton" style={{ height: "20px", width: "350px", borderRadius: "6px", maxWidth: "100%" }}></div>
      </div>

      <div className="row g-4">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="col-md-6 col-lg-4">
            <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '15px' }}>
              <div className="card-header py-3 skeleton" style={{ borderRadius: '15px 15px 0 0', border: 'none' }}>
                <div className="skeleton-darker" style={{ height: '14px', width: '40%', borderRadius: '4px', marginBottom: '8px' }}></div>
                <div className="skeleton-darker" style={{ height: '24px', width: '70%', borderRadius: '4px' }}></div>
              </div>
              
              <div className="card-body">
                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <div className="skeleton" style={{ height: "28px", width: "120px", borderRadius: "50rem" }}></div>
                  <div className="skeleton" style={{ height: "16px", width: "90px", borderRadius: "4px" }}></div>
                </div>

                <div className="mb-3">
                  <div className="skeleton" style={{ height: "14px", width: "130px", marginBottom: "8px", borderRadius: "4px" }}></div>
                  <div className="skeleton" style={{ height: "80px", width: "100%", borderRadius: "0.25rem" }}></div>
                </div>
              </div>

              <div className="card-footer bg-white border-0 pb-3">
                <div className="skeleton" style={{ height: "38px", width: "100%", borderRadius: "0.375rem" }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
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