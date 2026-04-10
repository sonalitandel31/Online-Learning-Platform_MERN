import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import { FaPlus, FaTrash, FaUserFriends, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'; 

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brandColor, setBrandColor] = useState('#0d6efd'); 
    
    const [formData, setFormData] = useState({ name: '', email: '', employeeId: '', password: '' });
    
    // UI Feedback States
    const [feedback, setFeedback] = useState(null);
    const [employeeToDelete, setEmployeeToDelete] = useState(null); // Controls delete confirmation modal

    const hexToRgba = (hex, opacity) => {
        if (!hex) return 'rgba(13, 110, 253, 0.1)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [settingsRes, employeesRes] = await Promise.all([
                api.get('/companies/settings'),
                api.get('/hr/employees')
            ]);
            setBrandColor(settingsRes.data?.data?.branding?.themeColor || '#0d6efd');
            setEmployees(employeesRes.data?.data || []);
        } catch (err) {
            setFeedback({ type: 'error', text: 'Could not sync roster data. Please refresh.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInitialData(); }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFeedback(null);

        try {
            await api.post('/hr/add-employee', formData);
            setFeedback({ type: 'success', text: 'Employee added successfully!' });
            setFormData({ name: '', email: '', employeeId: '', password: '' });
            fetchInitialData(); 
            setShowModal(false);
            
            // Auto hide feedback after 4 seconds
            setTimeout(() => setFeedback(null), 4000);
        } catch (err) {
            setFeedback({ 
                type: 'error', 
                text: err.response?.data?.message || "Check your license quota." 
            });
            setShowModal(false); // Close modal to show error on main screen
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!employeeToDelete) return;
        
        try {
            await api.delete(`/hr/employee/${employeeToDelete._id}`);
            setFeedback({ type: 'success', text: '1 License restored to your quota.' });
            fetchInitialData();
            
            setTimeout(() => setFeedback(null), 4000);
        } catch (err) {
            setFeedback({ type: 'error', text: 'Could not remove employee.' });
        } finally {
            setEmployeeToDelete(null); // Close modal
        }
    };

    return (
        <div className="container mt-4 mb-5">
            <style>{`
                .skeleton-box {
                    background: #e2e5e7;
                    background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
                    border-radius: 6px;
                    background-size: 200% 100%;
                    animation: 1.5s shine linear infinite;
                }
                @keyframes shine { to { background-position-x: -200%; } }
            `}</style>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold m-0 text-dark">Employee Roster</h2>
                    <p className="text-muted small mb-0">Manage your workforce and license consumption.</p>
                </div>
                <button 
                    className="btn text-white d-flex align-items-center gap-2 rounded-pill px-4 shadow-sm fw-bold border-0"
                    style={{ backgroundColor: brandColor }}
                    onClick={() => { setFeedback(null); setShowModal(true); }}
                >
                    <FaPlus /> Add Employee
                </button>
            </div>

            {/* Inline Feedback Banner */}
            {feedback && (
                <div className={`alert ${feedback.type === 'error' ? 'alert-danger' : 'alert-success'} border-0 shadow-sm mb-4`}>
                    <div className="d-flex align-items-center fw-bold">
                        {feedback.type === 'error' ? <FaExclamationTriangle className="me-2" /> : <FaCheckCircle className="me-2" />}
                        {feedback.text}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                            <tr className="text-muted small text-uppercase">
                                <th className="px-4 py-3">Employee Name</th>
                                <th className="py-3">Email Address</th>
                                <th className="py-3">Status</th>
                                <th className="py-3 text-end px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(5)].map((_, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-3"><div className="skeleton-box" style={{ height: '20px', width: '70%' }}></div></td>
                                        <td className="py-3"><div className="skeleton-box" style={{ height: '20px', width: '85%' }}></div></td>
                                        <td className="py-3"><div className="skeleton-box rounded-pill" style={{ height: '24px', width: '60px' }}></div></td>
                                        <td className="py-3 text-end px-4 d-flex justify-content-end"><div className="skeleton-box" style={{ height: '24px', width: '24px' }}></div></td>
                                    </tr>
                                ))
                            ) : employees.length > 0 ? (
                                employees.map(emp => (
                                    <tr key={emp._id}>
                                        <td className="px-4 py-3 fw-bold text-dark">{emp.name}</td>
                                        <td className="py-3 text-muted small">{emp.email}</td>
                                        <td className="py-3">
                                            <span className={`badge ${emp.isBlocked ? 'bg-danger' : 'bg-success'} bg-opacity-10 text-${emp.isBlocked ? 'danger' : 'success'} px-3 py-2 rounded-pill`}>
                                                {emp.isBlocked ? 'Blocked' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-end px-4">
                                            <button 
                                                className="btn btn-link text-danger p-0 shadow-none"
                                                onClick={() => setEmployeeToDelete(emp)}
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center p-5 text-muted">
                                        <FaUserFriends size={40} className="mb-3 opacity-25" /><br/>
                                        No employees found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Inline Confirmation Modal for Delete */}
            {employeeToDelete && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-body p-4 text-center">
                                <div className="bg-danger bg-opacity-10 text-danger d-inline-flex p-3 rounded-circle mb-3">
                                    <FaExclamationTriangle size={30} />
                                </div>
                                <h5 className="fw-bold text-dark">Remove {employeeToDelete.name}?</h5>
                                <p className="text-muted small mb-4">This action cannot be undone. 1 license seat will be freed up.</p>
                                
                                <div className="d-flex justify-content-center gap-2">
                                    <button className="btn btn-light rounded-pill px-4 fw-bold" onClick={() => setEmployeeToDelete(null)}>Cancel</button>
                                    <button className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm" onClick={confirmDelete}>Yes, Remove</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Employee Modal */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header border-0 p-4" style={{ backgroundColor: hexToRgba(brandColor, 0.1) }}>
                                <h5 className="modal-title fw-bold" style={{ color: brandColor }}>Register New Employee</h5>
                                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <form onSubmit={handleAddEmployee}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Full Name</label>
                                        <input type="text" className="form-control bg-light border-0 shadow-none" name="name" onChange={handleInputChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Work Email</label>
                                        <input type="email" className="form-control bg-light border-0 shadow-none" name="email" onChange={handleInputChange} required />
                                    </div>
                                    <div className="row g-3 mb-4">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold text-muted">Employee ID</label>
                                            <input type="text" className="form-control bg-light border-0 shadow-none" name="employeeId" onChange={handleInputChange} />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold text-muted">Password</label>
                                            <input type="text" className="form-control bg-light border-0 shadow-none" name="password" onChange={handleInputChange} required />
                                        </div>
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="btn text-white w-100 fw-bold py-2 rounded-3 shadow-sm border-0" 
                                        style={{ backgroundColor: isSubmitting ? '#6c757d' : brandColor }}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Processing...' : 'Assign License & Create'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeList;