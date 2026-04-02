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
  FaEye
} from "react-icons/fa";

const CourseRequests = () => {
  const [requests, setRequests] = useState([]);
  const [instructors, setInstructors] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updateMsg, setUpdateMsg] = useState({ type: "", text: "" });

  // ✅ NEW: Modal states for viewing full details
  const [selectedReq, setSelectedReq] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      setError("Data load karne mein error aayi. Please check backend routes.");
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
      case "approved": return <span className="badge bg-success-subtle text-success border border-success px-2 py-1"><FaCheckCircle className="me-1" /> Approved</span>;
      case "rejected": return <span className="badge bg-danger-subtle text-danger border border-danger px-2 py-1"><FaTimesCircle className="me-1" /> Rejected</span>;
      case "reviewed": return <span className="badge bg-info-subtle text-info border border-info px-2 py-1"><FaInfoCircle className="me-1" /> Reviewed</span>;
      case "in-development": return <span className="badge bg-primary-subtle text-primary border border-primary px-2 py-1"><FaTools className="me-1" /> In-Dev</span>;
      default: return <span className="badge bg-warning-subtle text-warning border border-warning px-2 py-1"><FaClock className="me-1" /> Pending</span>;
    }
  };

  // ✅ NEW: Helper to open details modal
  const openDetailsModal = (req) => {
    setSelectedReq(req);
    setShowModal(true);
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark m-0">B2B Course Requests</h2>
          <p className="text-muted small m-0">Approve requests and assign them to instructors for development.</p>
        </div>
        <button 
          className="btn btn-success d-flex align-items-center gap-2 shadow-sm"
          onClick={handleExport}
          disabled={requests.length === 0}
        >
          <FaDownload /> Export CSV
        </button>
      </div>

      {updateMsg.text && (
        <div className={`alert alert-${updateMsg.type} border-0 shadow-sm mb-4`} role="alert">
          {updateMsg.text}
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm border-0 rounded-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="text-muted text-uppercase small">
                <th className="px-4 py-3">Company</th>
                <th className="py-3">Topic & Details</th>
                <th className="py-3 text-center">Trainees</th>
                <th className="py-3">Requested By</th>
                <th className="py-3">Assignment</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-end px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">Loading requests...</td>
                </tr>
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req._id}>
                    <td className="px-4 py-3">
                      <div className="fw-bold text-dark">{req.companyId?.companyName || "N/A"}</div>
                      <div className="small text-muted">{req.companyId?.domain || "B2B Client"}</div>
                    </td>
                    
                    {/* ✅ UPDATED: Topic, Category & Details Button */}
                    <td className="py-3">
                      <div className="fw-bold text-dark mb-1">{req.topic}</div>
                      
                      {/* Check if custom category was requested */}
                      {req.category === 'other' || req.customCategory ? (
                        <span className="badge bg-warning text-dark border border-warning d-inline-block mb-2">
                          🆕 New Category: {req.customCategory}
                        </span>
                      ) : (
                        <div className="small text-primary mb-2">{req.category?.name || "Existing Category"}</div>
                      )}
                      
                      {/* View Requirements Button */}
                      <div>
                        <button 
                          className="btn btn-sm btn-light border shadow-sm text-secondary d-flex align-items-center gap-1"
                          onClick={() => openDetailsModal(req)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          <FaEye /> View Full Details
                        </button>
                      </div>
                    </td>

                    <td className="py-3 text-center">
                      <span className="badge bg-light text-dark border">{req.expectedEmployees} Users</span>
                    </td>
                    <td className="py-3">
                      <div className="small fw-medium">{req.hrId?.name || "Unknown HR"}</div>
                      <div className="small text-muted">{req.hrId?.email}</div>
                    </td>
                    <td className="py-3">
                        {req.assignedInstructor ? (
                            <div className="d-flex align-items-center gap-2 text-primary fw-bold small">
                                <FaUserTie /> {req.assignedInstructor.name}
                            </div>
                        ) : (
                            <span className="text-muted small italic">Not Assigned</span>
                        )}
                    </td>
                    <td className="py-3">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3 text-end px-4">
                      <div className="d-flex flex-column gap-2 align-items-end">
                        <select 
                          className="form-select form-select-sm shadow-sm"
                          style={{ width: '130px' }}
                          value={req.status}
                          onChange={(e) => handleStatusChange(req._id, e.target.value)}
                          disabled={req.status === 'in-development'}
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="in-development" disabled>In Dev</option>
                        </select>

                        {req.status === 'approved' && !req.assignedInstructor && (
                            <select 
                                className="form-select form-select-sm border-primary text-primary shadow-sm"
                                style={{ width: '130px' }}
                                onChange={(e) => handleAssignInstructor(req._id, e.target.value)}
                                defaultValue=""
                            >
                                <option value="" disabled>Assign To...</option>
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
                  <td colSpan="7" className="text-center py-5 text-muted">No B2B course requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-muted small px-2">
        <FaInfoCircle /> <strong>Admin Tip:</strong> Mark a request as "Approved" to unlock the Instructor Assignment dropdown. Once assigned, the status automatically moves to "In-Development".
      </div>

      {/* ========================================= */}
      {/* ✅ NEW: FULL DETAILS MODAL */}
      {/* ========================================= */}
      {showModal && selectedReq && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
              
              <div className="modal-header bg-primary text-white" style={{ borderRadius: '15px 15px 0 0' }}>
                <h5 className="modal-title fw-bold">
                  Course Request Details
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              
              <div className="modal-body p-4">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <p className="text-muted small mb-1 text-uppercase fw-bold">Requested By Company</p>
                    <h5 className="text-dark mb-0">{selectedReq.companyId?.companyName}</h5>
                    <p className="text-secondary small">{selectedReq.companyId?.domain}</p>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <p className="text-muted small mb-1 text-uppercase fw-bold">HR Representative</p>
                    <h6 className="text-dark mb-0">{selectedReq.hrId?.name}</h6>
                    <p className="text-secondary small">{selectedReq.hrId?.email}</p>
                  </div>
                </div>

                <hr className="text-muted opacity-25" />

                <div className="mb-4">
                  <p className="text-muted small mb-1 text-uppercase fw-bold">Course Topic</p>
                  <h4 className="fw-bold text-primary">{selectedReq.topic}</h4>
                  
                  <div className="d-flex gap-3 mt-2">
                    {selectedReq.category === 'other' || selectedReq.customCategory ? (
                      <span className="badge bg-warning text-dark border border-warning fs-6">🆕 Custom Category: {selectedReq.customCategory}</span>
                    ) : (
                      <span className="badge bg-light text-dark border fs-6">Category: {selectedReq.category?.name || "Existing"}</span>
                    )}
                    <span className="badge bg-light text-dark border fs-6 d-flex align-items-center gap-1">
                      <FaUserTie /> Trainees: {selectedReq.expectedEmployees}
                    </span>
                  </div>
                </div>

                <div className="mb-4 bg-light p-3 rounded-3 border">
                  <p className="text-muted small mb-2 text-uppercase fw-bold">Target Audience</p>
                  <p className="text-dark mb-0 fw-medium">{selectedReq.targetAudience || "Not specified by HR"}</p>
                </div>

                <div className="bg-light p-3 rounded-3 border">
                  <p className="text-muted small mb-2 text-uppercase fw-bold">Specific Requirements / Goals</p>
                  <p className="text-dark mb-0" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedReq.requirements || "No specific requirements provided."}
                  </p>
                </div>
              </div>
              
              <div className="modal-footer border-0 pb-4 pe-4">
                <button type="button" className="btn btn-secondary px-4 fw-bold rounded-pill" onClick={() => setShowModal(false)}>
                  Close
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