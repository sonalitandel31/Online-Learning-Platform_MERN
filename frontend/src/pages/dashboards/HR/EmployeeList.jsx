import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import { FaPlus, FaTimes } from 'react-icons/fa'; // Icons for button and close

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formMsg, setFormMsg] = useState({ type: '', text: '' });
    
    // New Employee Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        employeeId: '',
        password: ''
    });

    const fetchEmployees = () => {
        setLoading(true);
        api.get('/hr/employees')
            .then(res => {
                setEmployees(res.data.data);
                setLoading(false);
            })
            .catch(err => {
                setError("Employee list fetch karne me error aayi.");
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Handle Form Inputs
    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle Adding Single Employee
    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormMsg({ type: '', text: '' });

        try {
            // Call the new single employee API
            await api.post('/hr/add-employee', formData);
            
            setFormMsg({ type: 'success', text: 'Employee added successfully!' });
            setFormData({ name: '', email: '', employeeId: '', password: '' }); // Clear form
            
            // Refresh the table data
            fetchEmployees();

            // Auto-close modal after 1.5 seconds
            setTimeout(() => {
                setShowModal(false);
                setFormMsg({ type: '', text: '' });
            }, 1500);

        } catch (err) {
            setFormMsg({ 
                type: 'danger', 
                text: err.response?.data?.message || "Failed to add employee." 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mt-4">
            {/* Header with Add Button */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold m-0">Employee Roster</h2>
                <button 
                    className="btn btn-primary d-flex align-items-center gap-2"
                    onClick={() => setShowModal(true)}
                >
                    <FaPlus /> Add Single Employee
                </button>
            </div>
            
            {error && <div className="alert alert-danger mb-4">{error}</div>}

            {/* Employee Table */}
            <div className="card shadow-sm border-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="py-3">Email</th>
                                <th className="py-3">Emp ID</th>
                                <th className="py-3">Last Active</th>
                                <th className="py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center p-4 text-muted">Loading employees...</td>
                                </tr>
                            ) : employees.length > 0 ? (
                                employees.map(emp => (
                                    <tr key={emp._id}>
                                        <td className="px-4 py-3 fw-medium">{emp.name}</td>
                                        <td className="py-3 text-muted">{emp.email}</td>
                                        <td className="py-3">{emp.employeeId || 'N/A'}</td>
                                        <td className="py-3 text-muted">
                                            {emp.lastActiveAt ? new Date(emp.lastActiveAt).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="py-3">
                                            <span className={`badge ${emp.isBlocked ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'} px-2 py-1 rounded-pill`}>
                                                {emp.isBlocked ? 'Blocked' : 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center p-5 text-muted">
                                        No employees found. Add one manually or use Bulk Enrollment.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BOOTSTRAP MODAL FOR ADDING SINGLE EMPLOYEE */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title fw-bold">Add New Employee</h5>
                                <button type="button" className="btn border-0 p-0 text-muted" onClick={() => setShowModal(false)}>
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="modal-body">
                                {formMsg.text && (
                                    <div className={`alert alert-${formMsg.type} py-2 mb-3`}>
                                        {formMsg.text}
                                    </div>
                                )}
                                <form onSubmit={handleAddEmployee}>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small mb-1">Full Name</label>
                                        <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Rahul Sharma" />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small mb-1">Work Email</label>
                                        <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} required placeholder="rahul@company.com" />
                                    </div>
                                    <div className="row g-3 mb-4">
                                        <div className="col-6">
                                            <label className="form-label text-muted small mb-1">Employee ID</label>
                                            <input type="text" className="form-control" name="employeeId" value={formData.employeeId} onChange={handleInputChange} placeholder="EMP-101" />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label text-muted small mb-1">Password</label>
                                            <input type="text" className="form-control" name="password" value={formData.password} onChange={handleInputChange} required placeholder="Temporary Password" />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={isSubmitting}>
                                        {isSubmitting ? 'Adding...' : 'Add Employee'}
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