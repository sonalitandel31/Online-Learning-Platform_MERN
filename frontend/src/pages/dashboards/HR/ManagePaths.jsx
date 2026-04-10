import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import Swal from 'sweetalert2';
import { FaPlus, FaRoute, FaUserPlus, FaCheckCircle, FaLayerGroup, FaInfoCircle } from 'react-icons/fa';

const ManagePaths = () => {
    const [paths, setPaths] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [employees, setEmployees] = useState([]);
    
    const [showModal, setShowModal] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedPath, setSelectedPath] = useState(null);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    
    const [formData, setFormData] = useState({ title: '', description: '', courses: [] });
    const [brandColor, setBrandColor] = useState('#0d6efd'); 
    const [loading, setLoading] = useState(true); 

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });

    const hexToRgba = (hex, opacity) => {
        if (!hex) return 'rgba(13, 110, 253, 0.1)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [pathsRes, coursesRes, empRes, settingsRes] = await Promise.all([
                api.get('/hr/learning-paths'),
                api.get('/courses?approved=true'),
                api.get('/hr/employees'),
                api.get('/companies/settings')
            ]);

            setPaths(pathsRes.data?.data || []);
            setAllCourses(coursesRes.data?.courses || []);
            setEmployees(empRes.data?.data || []);
            setBrandColor(settingsRes.data?.data?.branding?.themeColor || '#0d6efd');
            
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Data Sync Failed',
                text: 'Unable to load paths or courses. Check server connection.',
                confirmButtonColor: brandColor
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePath = async (e) => {
        e.preventDefault();
        Swal.fire({ title: 'Saving Path...', didOpen: () => { Swal.showLoading(); } });

        try {
            await api.post('/hr/learning-paths', formData);
            Swal.close();
            setShowModal(false);
            setFormData({ title: '', description: '', courses: [] });

            Toast.fire({ icon: 'success', title: 'Learning Path created successfully!' });
            fetchInitialData();
        } catch (err) {
            Swal.close();
            Swal.fire({ icon: 'error', title: "Error", text: "Could not save path.", confirmButtonColor: brandColor });
        }
    };

    const openAssignModal = (path) => {
        setSelectedPath(path);
        setSelectedEmployees(path.assignedTo || []);
        setAssignModalOpen(true);
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        Swal.fire({ title: 'Assigning Employees...', didOpen: () => { Swal.showLoading(); } });

        try {
            await api.post('/hr/learning-paths/assign', {
                pathId: selectedPath._id,
                employeeIds: selectedEmployees
            });

            Swal.close();
            setAssignModalOpen(false);
            fetchInitialData();

            Swal.fire({
                icon: 'success',
                title: 'Assigned!',
                text: `${selectedPath.title} is now mandatory for selected employees.`,
                confirmButtonColor: brandColor 
            });
        } catch (err) {
            Swal.close();
            Swal.fire({ icon: 'error', title: "Assignment Failed", text: "Please try again later.", confirmButtonColor: brandColor });
        }
    };

    return (
        <div className="container mt-3 mb-5 px-3 px-md-4">
            
            <style>{`
                .skeleton-box {
                    background: #e2e5e7;
                    background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
                    border-radius: 6px;
                    background-size: 200% 100%;
                    animation: 1.5s shine linear infinite;
                }
                @keyframes shine { to { background-position-x: -200%; } }
                
                .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
                .card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important; }
                .cursor-pointer { cursor: pointer; }
            `}</style>

            {/* ✅ FIXED LAYOUT: Heading is full width, button aligned cleanly below on mobile */}
            <div className="mb-4">
                <h2 className="fw-bold text-dark mb-2 d-block w-100">
                    <FaRoute className="me-2" style={{ color: brandColor }} />Learning Paths
                </h2>
                <div className="row align-items-center mt-2">
                    <div className="col-12 col-md-7 mb-3 mb-md-0">
                        <p className="text-muted small mb-0">Bundle courses into sequences for specific departments.</p>
                    </div>
                    <div className="col-12 col-md-5 text-md-end">
                        {!loading && (
                            <button 
                                className="btn text-white rounded-pill px-4 py-2 shadow-sm fw-bold border-0 d-inline-flex align-items-center justify-content-center gap-2" 
                                style={{ backgroundColor: brandColor }}
                                onClick={() => setShowModal(true)}
                            >
                                <FaPlus size={14} /> Design New Path
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                /* 💀 SKELETON LOADER UI */
                <div className="row g-4">
                    {[...Array(3)].map((_, i) => (
                        <div className="col-12 col-md-6 col-lg-4" key={i}>
                            <div className="card shadow-sm border-0 h-100 rounded-4 overflow-hidden">
                                <div className="card-body p-4 d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="skeleton-box rounded-3" style={{ height: '40px', width: '40px' }}></div>
                                        <div className="skeleton-box rounded-pill" style={{ height: '24px', width: '80px' }}></div>
                                    </div>
                                    <div className="skeleton-box mb-2" style={{ height: '24px', width: '70%' }}></div>
                                    <div className="skeleton-box mb-4 flex-grow-1" style={{ height: '40px', width: '100%' }}></div>
                                    
                                    <div className="bg-light rounded-3 p-3 mb-3">
                                        <div className="skeleton-box mb-2" style={{ height: '14px', width: '50px' }}></div>
                                        <div className="skeleton-box mb-1" style={{ height: '16px', width: '90%' }}></div>
                                        <div className="skeleton-box" style={{ height: '16px', width: '70%' }}></div>
                                    </div>
                                    
                                    <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                                        <div className="skeleton-box" style={{ height: '16px', width: '80px' }}></div>
                                        <div className="skeleton-box rounded-pill" style={{ height: '30px', width: '80px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ✨ ACTUAL CONTENT ✨ */
                <div className="row g-4">
                    {(paths || []).map(path => (
                        <div className="col-12 col-md-6 col-lg-4" key={path._id}>
                            <div className="card shadow-sm border-0 h-100 rounded-4 overflow-hidden card-hover">
                                <div className="card-body p-4 d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className="p-2 rounded-3" style={{ backgroundColor: hexToRgba(brandColor, 0.1), color: brandColor }}>
                                            <FaLayerGroup size={20} />
                                        </div>
                                        <span className="badge bg-light text-dark border rounded-pill px-3 py-2">
                                            {(path.courses || []).length} Modules
                                        </span>
                                    </div>
                                    
                                    <h5 className="fw-bold mb-2 text-truncate" title={path.title}>{path.title}</h5>
                                    <p className="text-muted small flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {path.description}
                                    </p>

                                    <div className="bg-light rounded-3 p-3 mb-3">
                                        <h6 className="small fw-bold text-uppercase opacity-50 mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Curriculum</h6>
                                        {(path.courses || []).slice(0, 3).map((c, idx) => (
                                            <div key={idx} className="small d-flex align-items-center gap-2 mb-1 text-truncate">
                                                <FaCheckCircle style={{ color: brandColor, minWidth: '12px' }} size={12} /> 
                                                <span className="text-truncate" title={c.title}>{c.title}</span>
                                            </div>
                                        ))}
                                        {path.courses.length > 3 && <div className="small mt-1 fw-bold" style={{ color: brandColor }}>+ {path.courses.length - 3} more...</div>}
                                    </div>

                                    <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                                        <div className="small fw-medium">
                                            <span className="fs-5 fw-bold" style={{ color: brandColor }}>{(path.assignedTo || []).length}</span> <span className="text-muted">Enrolled</span>
                                        </div>
                                        <button 
                                            className="btn btn-sm btn-dark rounded-pill px-4 py-2 fw-bold" 
                                            onClick={() => openAssignModal(path)}
                                        >
                                            <FaUserPlus className="me-2" /> Assign
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {paths.length === 0 && (
                        <div className="col-12 text-center py-5 bg-white rounded-4 border shadow-sm my-3">
                            <FaRoute size={50} className="text-muted opacity-25 mb-3" />
                            <h5 className="text-muted fw-bold">No Learning Paths Created</h5>
                            <p className="small text-muted mb-0">Start by bundling existing courses into a custom curriculum.</p>
                        </div>
                    )}
                </div>
            )}

            {/* DESIGN MODAL */}
            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered px-2">
                        <div className="modal-content border-0 shadow-lg rounded-4 p-3 p-md-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="fw-bold mb-0">Create Learning Journey</h5>
                                <button className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
                            </div>
                            
                            <form onSubmit={handleCreatePath}>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Path Name</label>
                                    <input
                                        type="text" className="form-control bg-light border-0 shadow-none p-3"
                                        placeholder="e.g. Senior Leadership Program"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label small fw-bold text-muted">Strategic Goal</label>
                                    <textarea
                                        className="form-control bg-light border-0 shadow-none p-3"
                                        placeholder="Describe what employees will achieve..."
                                        rows="3"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </div>

                                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                    <FaInfoCircle style={{ color: brandColor }} /> Select Course Sequence
                                </h6>

                                <div className="row g-2 mb-4" style={{ maxHeight: '220px', overflowY: 'auto', overflowX: 'hidden' }}>
                                    {(allCourses || []).map(course => (
                                        <div className="col-12 col-md-6" key={course._id}>
                                            <label 
                                                className="card h-100 border-2 p-3 cursor-pointer"
                                                style={formData.courses.includes(course._id) 
                                                    ? { borderColor: brandColor, backgroundColor: hexToRgba(brandColor, 0.05) } 
                                                    : { borderColor: '#e2e8f0' }
                                                }
                                            >
                                                <div className="form-check m-0 d-flex align-items-center">
                                                    <input
                                                        className="form-check-input shadow-none mt-0 flex-shrink-0"
                                                        type="checkbox"
                                                        checked={formData.courses.includes(course._id)}
                                                        onChange={e => {
                                                            const selected = e.target.checked
                                                                ? [...formData.courses, course._id]
                                                                : formData.courses.filter(id => id !== course._id);
                                                            setFormData({ ...formData, courses: selected });
                                                        }}
                                                    />
                                                    <span className="ms-2 small fw-bold text-truncate" title={course.title}>{course.title}</span>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                    {allCourses.length === 0 && <p className="text-muted small px-3">No active courses available.</p>}
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn text-white w-100 fw-bold py-3 rounded-3 border-0 mt-2 shadow-sm" 
                                    style={{ backgroundColor: brandColor }}
                                    disabled={formData.courses.length === 0}
                                >
                                    Save & Publish Path
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN MODAL */}
            {assignModalOpen && selectedPath && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered px-2">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header text-white p-3 p-md-4 border-0" style={{ backgroundColor: brandColor }}>
                                <h5 className="modal-title fw-bold text-truncate" title={`Enroll Employees: ${selectedPath.title}`}>
                                    Enroll Employees: {selectedPath.title}
                                </h5>
                                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setAssignModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-3 p-md-4">
                                <p className="text-muted small mb-3">Selected employees will be notified of this new mandatory training.</p>

                                <div className="list-group border-0 pe-2" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    {employees.map(emp => {
                                        const isSelected = selectedEmployees.includes(emp._id);
                                        return (
                                            <label 
                                                key={emp._id} 
                                                className="list-group-item d-flex gap-3 align-items-center border-0 rounded-3 mb-2 p-2 p-md-3 cursor-pointer shadow-sm"
                                                style={isSelected 
                                                    ? { backgroundColor: hexToRgba(brandColor, 0.05), borderLeft: `4px solid ${brandColor}` } 
                                                    : { backgroundColor: '#ffffff', border: '1px solid #f1f5f9' }
                                                }
                                            >
                                                <input
                                                    className="form-check-input flex-shrink-0 shadow-none mt-0"
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const updated = e.target.checked
                                                            ? [...selectedEmployees, emp._id]
                                                            : selectedEmployees.filter(id => id !== emp._id);
                                                        setSelectedEmployees(updated);
                                                    }}
                                                />
                                                <div className="text-truncate w-100">
                                                    <div className="fw-bold text-dark text-truncate" title={emp.name}>{emp.name}</div>
                                                    <div className="text-muted small text-truncate" title={emp.email}>{emp.email}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {employees.length === 0 && <p className="text-muted small">No active employees found.</p>}
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-3 p-md-4 pt-0 d-flex flex-column flex-md-row gap-2">
                                <button type="button" className="btn btn-light rounded-pill px-4 py-2 fw-bold w-100 w-md-auto order-2 order-md-1 shadow-sm" onClick={() => setAssignModalOpen(false)}>Cancel</button>
                                <button
                                    type="button"
                                    className="btn text-white rounded-pill px-5 py-2 fw-bold shadow-sm border-0 w-100 w-md-auto order-1 order-md-2"
                                    style={{ backgroundColor: brandColor }}
                                    onClick={handleAssignSubmit}
                                    disabled={selectedEmployees.length === 0}
                                >
                                    Confirm Enrollment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagePaths;