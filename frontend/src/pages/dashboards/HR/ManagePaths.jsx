import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import { FaPlus, FaRoute, FaUserPlus } from 'react-icons/fa';

const ManagePaths = () => {
    const [paths, setPaths] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({ title: '', description: '', courses: [] });

    // UI Feedback States (No alerts used)
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // ... existing state ...
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedPath, setSelectedPath] = useState(null);
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [pathsRes, coursesRes, empRes] = await Promise.all([
                api.get('/hr/learning-paths'),
                // Sirf approved courses fetch karne ke liye query parameter add kiya
                api.get('/courses?approved=true'),
                api.get('/hr/employees')
            ]);

            // SAFE FALLBACKS
            setPaths(pathsRes.data?.data || []);

            // BUG FIX: Backend 'courses' key mein data bhej raha hai
            setAllCourses(coursesRes.data?.courses || []);

            setEmployees(empRes.data?.data || []);
        } catch (err) {
            setErrorMsg("Failed to load data. Please check your connection.");
        }
    };

    const handleCreatePath = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        try {
            await api.post('/hr/learning-paths', formData);
            setShowModal(false);
            setFormData({ title: '', description: '', courses: [] }); // Reset form

            setSuccessMsg("Learning Path created successfully!");
            fetchInitialData();

            // Auto-hide success message after 3 seconds
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err) {
            setErrorMsg("Error creating path. Please try again.");
        }
    };

    const openAssignModal = (path) => {
        setSelectedPath(path);
        // Pre-select employees who are already assigned to this path
        setSelectedEmployees(path.assignedTo || []);
        setAssignModalOpen(true);
        setErrorMsg("");
        setSuccessMsg("");
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        try {
            await api.post('/hr/learning-paths/assign', {
                pathId: selectedPath._id,
                employeeIds: selectedEmployees
            });

            setSuccessMsg(`Successfully assigned ${selectedPath.title} to selected employees!`);
            setAssignModalOpen(false);
            fetchInitialData(); // Refresh the list to update the "Enrolled" count

            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (err) {
            setErrorMsg("Failed to assign learning path. Please try again.");
        }
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold"><FaRoute className="me-2 text-primary" />Learning Paths</h2>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <FaPlus className="me-2" /> Create New Path
                </button>
            </div>

            {/* Inline Feedback Messages */}
            {errorMsg && <div className="alert alert-danger shadow-sm border-0">{errorMsg}</div>}
            {successMsg && <div className="alert alert-success shadow-sm border-0">{successMsg}</div>}

            <div className="row g-4">
                {/* Safely mapping paths */}
                {(paths || []).map(path => (
                    <div className="col-md-6" key={path._id}>
                        <div className="card shadow-sm border-0 p-4 h-100">
                            <h4 className="fw-bold">{path.title}</h4>
                            <p className="text-muted small">{path.description}</p>

                            <h6 className="mt-3 fw-bold small text-uppercase">Courses in Path:</h6>
                            <div className="list-group list-group-flush mb-3">
                                {/* Safely mapping courses inside a path */}
                                {(path.courses || []).map((c, idx) => (
                                    <div key={c._id || idx} className="list-group-item px-0 border-0 py-1 small">
                                        <span className="badge bg-secondary me-2">{idx + 1}</span> {c.title || 'Course'}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                                <span className="small text-muted">{(path.assignedTo || []).length} Employees Enrolled</span>
                                <button className="btn btn-sm btn-outline-primary fw-bold" onClick={() => openAssignModal(path)}>
                                    <FaUserPlus className="me-1" /> Assign
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {paths.length === 0 && !errorMsg && (
                    <div className="col-12 text-center text-muted p-5">
                        No learning paths designed yet. Click "Create New Path" to start.
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content p-4 border-0 shadow">
                            <h3 className="fw-bold mb-4">Design Learning Path</h3>
                            <form onSubmit={handleCreatePath}>
                                <input
                                    type="text"
                                    className="form-control mb-3"
                                    placeholder="Path Title (e.g. Sales Onboarding)"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                                <textarea
                                    className="form-control mb-3"
                                    placeholder="Description"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>

                                <h6 className="fw-bold mb-3">Select Courses (In Order):</h6>

                                {(allCourses || []).length > 0 ? (
                                    <div className="row g-2 mb-4">
                                        {(allCourses || []).map(course => (
                                            <div className="col-6" key={course._id}>
                                                <div className="form-check p-2 border rounded">
                                                    <input
                                                        className="form-check-input ms-1"
                                                        type="checkbox"
                                                        value={course._id}
                                                        checked={formData.courses.includes(course._id)}
                                                        onChange={e => {
                                                            const selected = e.target.checked
                                                                ? [...formData.courses, course._id]
                                                                : formData.courses.filter(id => id !== course._id);
                                                            setFormData({ ...formData, courses: selected });
                                                        }}
                                                    />
                                                    <label className="form-check-label small ms-2">{course.title}</label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-warning small py-2 mb-4">
                                        No courses available. Please ensure courses exist in the system.
                                    </div>
                                )}

                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={formData.courses.length === 0}>
                                        Save Path
                                    </button>
                                    <button type="button" className="btn btn-light w-100 fw-bold" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {assignModalOpen && selectedPath && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold text-primary">
                                    Assign: {selectedPath.title}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setAssignModalOpen(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p className="text-muted small mb-3">
                                    Select the employees who should complete this learning path.
                                </p>

                                {/* Employee Selection List */}
                                <div className="list-group mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {(employees || []).length > 0 ? (
                                        employees.map(emp => (
                                            <label key={emp._id} className="list-group-item d-flex gap-3 align-items-center">
                                                <input
                                                    className="form-check-input flex-shrink-0"
                                                    type="checkbox"
                                                    value={emp._id}
                                                    checked={selectedEmployees.includes(emp._id)}
                                                    onChange={(e) => {
                                                        const updatedSelection = e.target.checked
                                                            ? [...selectedEmployees, emp._id]
                                                            : selectedEmployees.filter(id => id !== emp._id);
                                                        setSelectedEmployees(updatedSelection);
                                                    }}
                                                />
                                                <span className="pt-1 form-checked-content">
                                                    <strong>{emp.name}</strong>
                                                    <small className="d-block text-muted">{emp.email}</small>
                                                </span>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="alert alert-warning small py-2">
                                            No employees found. Please add employees first.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-secondary" onClick={() => setAssignModalOpen(false)}>Cancel</button>
                                <button
                                    type="button"
                                    className="btn btn-primary fw-bold"
                                    onClick={handleAssignSubmit}
                                    disabled={selectedEmployees.length === 0}
                                >
                                    Confirm Assignment
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