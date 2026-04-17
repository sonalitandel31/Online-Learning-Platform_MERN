import React, { useState, useEffect } from "react";
import api from "../../../api/api";
import { 
  FaDownload, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaInfoCircle,
  FaUserTie,
  FaTools,
  FaEye,
  FaChevronRight,
  FaPlus
} from "react-icons/fa";

// Skeleton component for the loading state during data fetch
const RequestSkeleton = () => (
  <tr className="skeleton-row">
    <td className="px-4 py-4"><div className="skeleton-box w-75"></div><div className="skeleton-box w-50 mt-2"></div></td>
    <td className="py-4"><div className="skeleton-box w-100"></div><div className="skeleton-box w-25 mt-2"></div></td>
    <td className="py-4"><div className="skeleton-box mx-auto w-50"></div></td>
    <td className="py-4"><div className="skeleton-box w-75"></div></td>
    <td className="py-4"><div className="skeleton-box w-50"></div></td>
    <td className="py-4"><div className="skeleton-box w-50"></div></td>
    <td className="px-4 py-4 text-end"><div className="skeleton-box ms-auto w-75"></div></td>
  </tr>
);

const CourseRequests = () => {
  const [requests, setRequests] = useState([]);
  const [instructors, setInstructors] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updateMsg, setUpdateMsg] = useState({ type: "", text: "" });

  const [selectedReq, setSelectedReq] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Redesign Theme Colors
  const colors = {
    purple: "#6c5ce7",
    purpleLight: "#a29bfe",
    orange: "#fd9644",
    yellow: "#f1c40f",
    dark: "#2d3436",
    bg: "#f8f9fc"
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, insRes] = await Promise.all([
        api.get("/admin/b2b-requests"),
        api.get("/admin/instructors-list") 
      ]);
      setRequests(reqRes.data.data);
      setInstructors(insRes.data.data);
      setError("");
    } catch (err) {
      setError("Failed to load data. Please check backend routes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      setUpdateMsg({ type: "info", text: "Updating status..." });
      await api.put(`/admin/b2b-requests/${id}`, { status: newStatus });
      
      setUpdateMsg({ type: "success", text: `Status updated to ${newStatus}!` });
      fetchData(); 
      setTimeout(() => setUpdateMsg({ type: "", text: "" }), 3000);
    } catch (err) {
      setUpdateMsg({ type: "danger", text: "Update failed." });
    }
  };

  const handleAssignInstructor = async (requestId, instructorId) => {
    if (!instructorId) return;
    
    try {
      setUpdateMsg({ type: "info", text: "Assigning instructor..." });
      await api.put(`/admin/assign-instructor/${requestId}`, { 
        instructorId,
        adminNotes: "Good news! An expert instructor has been assigned and your course development has officially started."
      });
      
      setUpdateMsg({ type: "success", text: "Instructor assigned successfully!" });
      fetchData();
      setTimeout(() => setUpdateMsg({ type: "", text: "" }), 3000);
    } catch (err) {
      setUpdateMsg({ type: "danger", text: "Assignment failed." });
    }
  };

  const handleExport = () => {
    const exportUrl = `${import.meta.env.VITE_BASE_URL || 'http://localhost:3000'}/admin/b2b-requests/export`;
    window.open(exportUrl, "_blank");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved": return <span className="custom-badge bg-success-soft text-success"><FaCheckCircle className="me-1" /> Approved</span>;
      case "rejected": return <span className="custom-badge bg-danger-soft text-danger"><FaTimesCircle className="me-1" /> Rejected</span>;
      case "reviewed": return <span className="custom-badge bg-info-soft text-info"><FaInfoCircle className="me-1" /> Reviewed</span>;
      case "in-development": return <span className="custom-badge bg-purple-soft text-purple"><FaTools className="me-1" /> In-Dev</span>;
      default: return <span className="custom-badge bg-warning-soft text-warning"><FaClock className="me-1" /> Pending</span>;
    }
  };

  const openDetailsModal = (req) => {
    setSelectedReq(req);
    setShowModal(true);
  };

  return (
    <div className="requests-page-wrapper">
      <style>{`
        /* FIX: Prevents the component from pushing/squeezing the sidebar */
        .requests-page-wrapper { 
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0; 
          background: ${colors.bg}; 
          min-height: 100vh; 
          padding: 30px;
          overflow-x: hidden;
        }

        .page-header h2 { color: ${colors.dark}; font-weight: 800; letter-spacing: -0.5px; }
        
        .main-card { 
          border: none; 
          border-radius: 20px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.04); 
          overflow: hidden; 
          background: white;
          width: 100%;
        }
        
        /* Table responsive behavior */
        .table-container { width: 100%; overflow-x: auto; }

        .custom-table { width: 100%; min-width: 900px; border-collapse: collapse; }
        .custom-table thead { background: #fcfcfd; }
        .custom-table th { color: #8b95a1; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; padding: 20px 15px; border-bottom: 1px solid #f1f2f6; text-align: left; }
        .custom-table td { padding: 20px 15px; border-bottom: 1px solid #f8f9fa; vertical-align: middle; }
        
        /* Badges & UI Elements */
        .custom-badge { padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; }
        .bg-success-soft { background: #e6fcf5; border: 1px solid #c3fae8; }
        .bg-danger-soft { background: #fff5f5; border: 1px solid #ffe3e3; }
        .bg-info-soft { background: #e7f5ff; border: 1px solid #d0ebff; }
        .bg-purple-soft { background: #f3f0ff; border: 1px solid #e5dbff; color: ${colors.purple} !important; }
        .bg-warning-soft { background: #fff9db; border: 1px solid #fff3bf; }
        
        .btn-export { background: ${colors.orange}; border: none; color: white; font-weight: 700; padding: 10px 20px; border-radius: 12px; transition: 0.3s; }
        .btn-export:hover { background: #e67e22; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(253, 150, 68, 0.3); }
        
        .btn-details { background: white; border: 1px solid #edf2f7; color: ${colors.purple}; font-weight: 600; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; border: 1px solid #eee; }
        .btn-details:hover { background: ${colors.purple}; color: white; border-color: ${colors.purple}; }

        .status-select { border-radius: 10px; border: 1px solid #edf2f7; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 8px; background: white; }
        .assign-select { border-color: ${colors.purple}; color: ${colors.purple}; font-weight: 700; }

        /* Skeleton Animation */
        @keyframes shimmer { 0% { background-position: -450px 0; } 100% { background-position: 450px 0; } }
        .skeleton-box { height: 12px; background: linear-gradient(to right, #f0f0f0 8%, #f8f8f8 18%, #f0f0f0 33%); background-size: 800px 104px; animation: shimmer 2s infinite linear; border-radius: 4px; }

        /* Modal Redesign */
        .modal-purple-header { background: ${colors.purple}; color: white; border: none; padding: 25px; }
        .modal-content { border-radius: 24px; overflow: hidden; border: none; }
        .info-card { background: #f8f9fa; border-radius: 16px; padding: 20px; border: 1px solid #eee; }
        .label-text { color: #8b95a1; font-size: 0.7rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }

        @media (max-width: 768px) {
          .requests-page-wrapper { padding: 15px; }
          .page-header { flex-direction: column; align-items: flex-start !important; gap: 15px; }
          .btn-export { width: 100%; }
        }
      `}</style>

      {/* Title and Actions */}
      <div className="d-flex justify-content-between align-items-center mb-5 page-header">
        <div>
          <h2 className="m-0">B2B Course Requests</h2>
          <p className="text-muted fw-medium mt-1">Review incoming corporate training needs and assign expert instructors.</p>
        </div>
        <button 
          className="btn-export d-flex align-items-center gap-2 shadow-sm"
          onClick={handleExport}
          disabled={requests.length === 0}
        >
          <FaDownload /> Export Database (CSV)
        </button>
      </div>

      {/* Notifications */}
      {updateMsg.text && (
        <div className={`alert alert-${updateMsg.type} border-0 shadow-sm rounded-4 mb-4 py-3 px-4 animate-fade-in`} role="alert">
          <div className="d-flex align-items-center gap-2 fw-bold">
            {updateMsg.type === 'success' ? <FaCheckCircle /> : <FaInfoCircle />}
            {updateMsg.text}
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">{error}</div>}

      {/* Request Table Card */}
      <div className="main-card">
        <div className="table-container">
          <table className="custom-table align-middle">
            <thead>
              <tr>
                <th className="px-4">Client / Organization</th>
                <th>Requested Course</th>
                <th className="text-center">Trainees</th>
                <th>Point of Contact</th>
                <th>Instructor</th>
                <th>Status</th>
                <th className="text-end px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(6).fill(0).map((_, i) => <RequestSkeleton key={i} />)
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req._id}>
                    <td className="px-4">
                      <div className="fw-bolder text-dark fs-6">{req.companyId?.companyName || "Private Client"}</div>
                      <div className="text-muted small fw-medium">{req.companyId?.domain || "Enterprise"}</div>
                    </td>
                    
                    <td>
                      <div className="fw-bold text-dark mb-1">{req.topic}</div>
                      {req.category === 'other' || req.customCategory ? (
                        <div style={{ color: colors.orange, fontSize: '0.75rem', fontWeight: 800 }}>
                          <span className="me-1">●</span> CUSTOM: {req.customCategory}
                        </div>
                      ) : (
                        <div className="small fw-bold" style={{ color: colors.purple }}>{req.category?.name || "General"}</div>
                      )}
                      <button 
                        className="btn-details mt-2 d-flex align-items-center gap-2"
                        onClick={() => openDetailsModal(req)}
                      >
                        <FaEye /> Full Analysis
                      </button>
                    </td>

                    <td className="text-center">
                      <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: '#f1f2f6', color: '#2f3542', border: '1px solid #dfe4ea' }}>
                        {req.expectedEmployees} Users
                      </span>
                    </td>

                    <td>
                      <div className="fw-bold small">{req.hrId?.name || "HR Manager"}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{req.hrId?.email}</div>
                    </td>

                    <td>
                        {req.assignedInstructor ? (
                            <div className="d-flex align-items-center gap-2 fw-bold small" style={{ color: colors.purple }}>
                                <div style={{ background: '#f3f0ff', padding: '5px', borderRadius: '6px' }}>
                                    <FaUserTie />
                                </div>
                                {req.assignedInstructor.name}
                            </div>
                        ) : (
                            <span className="text-muted small italic">Not Yet Assigned</span>
                        )}
                    </td>

                    <td>{getStatusBadge(req.status)}</td>

                    <td className="text-end px-4">
                      <div className="d-flex flex-column gap-2 align-items-end">
                        <select 
                          className="status-select shadow-sm"
                          style={{ width: '145px' }}
                          value={req.status}
                          onChange={(e) => handleStatusChange(req._id, e.target.value)}
                          disabled={req.status === 'in-development'}
                        >
                          <option value="pending">Set Pending</option>
                          <option value="reviewed">Under Review</option>
                          <option value="approved">Approve Proposal</option>
                          <option value="rejected">Reject Proposal</option>
                          <option value="in-development" disabled>In Development</option>
                        </select>

                        {req.status === 'approved' && !req.assignedInstructor && (
                            <select 
                                className="status-select assign-select shadow-sm"
                                style={{ width: '145px' }}
                                onChange={(e) => handleAssignInstructor(req._id, e.target.value)}
                                defaultValue=""
                            >
                                <option value="" disabled>Select Expert...</option>
                                {instructors.map(ins => (
                                    <option key={ins._id} value={ins._id}>{ins.name}</option>
                                ))}
                            </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="text-muted">
                        <FaInfoCircle className="mb-2" size={30} />
                        <p className="fw-bold">No course requests found in the current cycle.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Tip Footer */}
      <div className="mt-4 p-3 rounded-4 d-flex align-items-center gap-3" style={{ background: '#fff9db', border: '1px solid #fff3bf' }}>
        <div style={{ background: colors.yellow, color: 'white', padding: '10px', borderRadius: '12px' }}>
            <FaInfoCircle size={20}/>
        </div>
        <div className="small text-dark">
            <strong>Administrator Note:</strong> Once a request is <span className="fw-bold">Approved</span>, you can assign an instructor. Assigning an instructor moves the request into the <span className="fw-bold">Development Pipeline</span>.
        </div>
      </div>

      {/* Request Details Modal */}
      {showModal && selectedReq && (
        <div className="modal show d-block p-4" style={{ backgroundColor: 'rgba(10, 10, 10, 0.7)', zIndex: 1050, backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg">
              
              <div className="modal-purple-header d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="modal-title fw-bold m-0">Project Scope & Details</h4>
                  <p className="small m-0 mt-1 opacity-75">Full request summary for administrative review.</p>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              
              <div className="modal-body p-4 p-md-5">
                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <div className="info-card h-100">
                        <div className="label-text mb-2">Requesting Entity</div>
                        <h5 className="fw-bold text-dark m-0">{selectedReq.companyId?.companyName}</h5>
                        <p className="small m-0 fw-bold" style={{ color: colors.purple }}>{selectedReq.companyId?.domain}</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="info-card h-100 border-start" style={{ borderColor: colors.orange }}>
                        <div className="label-text mb-2">Primary Contact (HR)</div>
                        <h6 className="fw-bold text-dark m-0">{selectedReq.hrId?.name}</h6>
                        <p className="text-muted small m-0">{selectedReq.hrId?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="label-text mb-2">Core Subject / Topic</div>
                  <h3 className="fw-extrabold" style={{ color: colors.dark }}>{selectedReq.topic}</h3>
                  
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    {selectedReq.category === 'other' || selectedReq.customCategory ? (
                      <span className="custom-badge bg-warning-soft text-warning fs-6">
                        <FaPlus className="me-2" /> CUSTOM CATEGORY: {selectedReq.customCategory}
                      </span>
                    ) : (
                      <span className="custom-badge bg-purple-soft fs-6">
                        CATEGORY: {selectedReq.category?.name}
                      </span>
                    )}
                    <span className="custom-badge bg-info-soft fs-6">
                      <FaUserTie className="me-2" /> TOTAL SEATS: {selectedReq.expectedEmployees}
                    </span>
                  </div>
                </div>

                <div className="row g-4">
                    <div className="col-12">
                        <div className="info-card">
                            <div className="label-text mb-2">Target Audience Tier</div>
                            <p className="text-dark fw-bold mb-0">
                                {selectedReq.targetAudience || "No specific level indicated."}
                            </p>
                        </div>
                    </div>
                    <div className="col-12">
                        <div className="info-card border-0" style={{ background: '#fcfcfd', border: '1px dashed #ced4da' }}>
                            <div className="label-text mb-2">Client Requirements & Learning Objectives</div>
                            <p className="text-dark mb-0 lh-lg" style={{ whiteSpace: "pre-wrap" }}>
                                {selectedReq.requirements || "No custom curriculum notes provided."}
                            </p>
                        </div>
                    </div>
                </div>
              </div>
              
              <div className="modal-footer border-0 p-4">
                <button 
                  type="button" 
                  className="btn px-5 py-2 fw-bold rounded-pill text-white shadow" 
                  style={{ background: colors.dark }} 
                  onClick={() => setShowModal(false)}
                >
                  Close Analysis
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseRequests;