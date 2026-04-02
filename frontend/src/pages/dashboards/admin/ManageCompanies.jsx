import React, { useState, useEffect } from 'react';
import api from '../../../api/api'; 
import { 
    FaBuilding, 
    FaPlus, 
    FaCheckCircle, 
    FaExclamationCircle, 
    FaUsers, 
    FaEye, 
    FaEnvelope, 
    FaCalendarAlt, 
    FaUserTie 
} from 'react-icons/fa';

const ManageCompanies = () => {
    const [companies, setCompanies] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    // ✅ NEW: Modal States for View Details
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        companyName: '',
        domain: '',
        purchasedLicenses: 100,
        hrName: '',
        hrEmail: '',
        hrPassword: ''
    });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setFetchLoading(true);
        try {
            const response = await api.get('/companies/all');
            setCompanies(response.data.data);
        } catch (error) {
            console.error("Failed to fetch companies");
        } finally {
            setFetchLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegisterCompany = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            await api.post('/companies/register', formData);
            
            setStatus({ type: 'success', message: `Successfully registered ${formData.companyName}! HR account created.` });
            setFormData({ companyName: '', domain: '', purchasedLicenses: 100, hrName: '', hrEmail: '', hrPassword: '' });
            setShowForm(false);
            
            fetchCompanies(); 
        } catch (error) {
            setStatus({ 
                type: 'error', 
                message: error.response?.data?.message || error.response?.data?.warning || "Failed to register company." 
            });
        } finally {
            setLoading(false);
        }
    };

    // ✅ NEW: Helper to open details modal
    const openDetailsModal = (company) => {
        setSelectedCompany(company);
        setShowModal(true);
    };

    return (
        <div className="p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-5">
                <div>
                    <h2 className="fw-bold mb-1"><FaBuilding className="me-2 text-primary" /> Manage B2B Clients</h2>
                    <p className="text-muted">Onboard new corporate clients and view their enterprise details.</p>
                </div>
                <button 
                    className="btn btn-primary px-4 py-2 fw-bold shadow-sm"
                    onClick={() => {
                        setShowForm(!showForm);
                        setStatus({ type: '', message: '' }); 
                    }}
                >
                    {showForm ? 'Cancel Registration' : <><FaPlus className="me-2" /> Onboard New Company</>}
                </button>
            </div>

            {status.message && (
                <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-danger'} border-0 shadow-sm d-flex align-items-center mb-4`}>
                    {status.type === 'success' ? <FaCheckCircle className="me-2 fs-5" /> : <FaExclamationCircle className="me-2 fs-5" />}
                    <div className="fw-bold">{status.message}</div>
                </div>
            )}

            {/* Registration Form */}
            {showForm && (
                <div className="card shadow-sm border-0 rounded-4 p-4 mb-5">
                    <h4 className="fw-bold mb-4 text-dark">Client Registration Details</h4>
                    <form onSubmit={handleRegisterCompany}>
                        <div className="row g-4">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Company Name</label>
                                <input type="text" className="form-control" name="companyName" value={formData.companyName} onChange={handleInputChange} required placeholder="e.g. Tata Consultancy Services" />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-semibold">Corporate Domain</label>
                                <input type="text" className="form-control" name="domain" value={formData.domain} onChange={handleInputChange} required placeholder="e.g. tcs.com" />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label fw-semibold">Licenses</label>
                                <input type="number" className="form-control" name="purchasedLicenses" value={formData.purchasedLicenses} onChange={handleInputChange} required min="1" />
                            </div>

                            <div className="col-12"><hr className="my-2 opacity-25" /></div>
                            <h5 className="fw-bold mb-0 mt-3 text-primary"><FaUserTie className="me-2"/>Initial HR Manager Account</h5>

                            <div className="col-md-4">
                                <label className="form-label fw-semibold">HR Full Name</label>
                                <input type="text" className="form-control" name="hrName" value={formData.hrName} onChange={handleInputChange} required placeholder="e.g. Priya Sharma" />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-semibold">HR Work Email</label>
                                <input type="email" className="form-control" name="hrEmail" value={formData.hrEmail} onChange={handleInputChange} required placeholder="priya@tcs.com" />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-semibold">Temporary Password</label>
                                <input type="text" className="form-control" name="hrPassword" value={formData.hrPassword} onChange={handleInputChange} required placeholder="Create a strong password" />
                            </div>

                            <div className="col-12 mt-4">
                                <button type="submit" className="btn btn-dark px-5 py-2 fw-bold" disabled={loading}>
                                    {loading ? 'Registering...' : 'Complete Registration'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Existing Companies Table */}
            {!showForm && (
                <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                    {fetchLoading ? (
                        <div className="p-5 text-center text-muted">
                            <div className="spinner-border text-primary mb-3" role="status"></div>
                            <div>Loading corporate clients...</div>
                        </div>
                    ) : companies.length === 0 ? (
                        <div className="text-center p-5 bg-light">
                            <FaBuilding size={48} className="text-muted mb-3 opacity-50" />
                            <h5 className="text-muted fw-bold">No corporate clients found.</h5>
                            <p className="text-muted small">Click "Onboard New Company" to add your first enterprise client.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr className="text-muted text-uppercase small">
                                        <th className="px-4 py-3">Company Info</th>
                                        <th className="py-3 text-center">Licenses Total</th>
                                        <th className="py-3 text-center">Status</th>
                                        <th className="py-3 text-end px-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map((company) => (
                                        <tr key={company._id}>
                                            <td className="px-4 py-3">
                                                <div className="fw-bold text-dark fs-6">{company.companyName}</div>
                                                <div className="small text-muted d-flex align-items-center gap-1 mt-1">
                                                    <FaEnvelope className="opacity-75" /> {company.domain}
                                                </div>
                                            </td>
                                            <td className="py-3 text-center">
                                                <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 rounded-pill fs-6">
                                                    <FaUsers className="me-1" /> {company.subscription?.activeLicenses || 0}
                                                </span>
                                            </td>
                                            <td className="py-3 text-center">
                                                <span className={`badge px-3 py-2 rounded-pill ${company.isActive !== false ? 'bg-success' : 'bg-danger'}`}>
                                                    {company.isActive !== false ? 'Active Client' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-end px-4">
                                                <button 
                                                    className="btn btn-sm btn-light border shadow-sm text-secondary fw-bold px-3 py-2 d-inline-flex align-items-center gap-2"
                                                    onClick={() => openDetailsModal(company)}
                                                >
                                                    <FaEye /> View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================= */}
            {/* ✅ NEW: FULL COMPANY DETAILS MODAL */}
            {/* ========================================= */}
            {showModal && selectedCompany && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
                            
                            {/* Modal Header */}
                            <div className="modal-header bg-dark text-white p-4" style={{ borderRadius: '15px 15px 0 0' }}>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-white text-dark rounded-circle d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                        <FaBuilding size={24} className="text-primary"/>
                                    </div>
                                    <div>
                                        <h4 className="modal-title fw-bold mb-0">{selectedCompany.companyName}</h4>
                                        <div className="small text-light opacity-75">{selectedCompany.domain}</div>
                                    </div>
                                </div>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            
                            {/* Modal Body */}
                            <div className="modal-body p-4 bg-light">
                                <div className="row g-4">
                                    
                                    {/* Subscription Block */}
                                    <div className="col-md-6">
                                        <div className="card h-100 border-0 shadow-sm rounded-4">
                                            <div className="card-body p-4">
                                                <h6 className="text-uppercase text-muted fw-bold mb-3 d-flex align-items-center gap-2">
                                                    <FaCheckCircle className="text-success"/> Subscription Status
                                                </h6>
                                                
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <span className="text-secondary fw-medium">Total Licenses</span>
                                                    <span className="badge bg-primary fs-6 rounded-pill px-3">{selectedCompany.subscription?.activeLicenses || 0}</span>
                                                </div>
                                                
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <span className="text-secondary fw-medium">Onboarding Date</span>
                                                    <span className="text-dark fw-bold d-flex align-items-center gap-1">
                                                        <FaCalendarAlt className="text-muted"/> {new Date(selectedCompany.createdAt).toLocaleDateString('en-GB')}
                                                    </span>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-secondary fw-medium">Account Status</span>
                                                    <span className={`fw-bold ${selectedCompany.isActive !== false ? 'text-success' : 'text-danger'}`}>
                                                        {selectedCompany.isActive !== false ? '● Active' : '● Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* HR Info Block */}
                                    <div className="col-md-6">
                                        <div className="card h-100 border-0 shadow-sm rounded-4">
                                            <div className="card-body p-4">
                                                <h6 className="text-uppercase text-muted fw-bold mb-3 d-flex align-items-center gap-2">
                                                    <FaUserTie className="text-info"/> Admin / HR Info
                                                </h6>
                                                
                                                <div className="alert alert-info bg-info-subtle border-0 rounded-3 mb-0">
                                                    <p className="mb-2 text-dark fw-medium">
                                                        The HR Manager accounts for this company are managed securely in the <strong>Users Table</strong>.
                                                    </p>
                                                    <p className="mb-0 text-muted small">
                                                        To view or reset passwords for the HR representatives of <strong>{selectedCompany.companyName}</strong>, please navigate to the <a href="/admin-dashboard/users" className="fw-bold text-decoration-none">All Users</a> section and filter by the "HR" role or their domain (<em>@{selectedCompany.domain}</em>).
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="modal-footer border-0 p-4 pt-0 bg-light" style={{ borderRadius: '0 0 15px 15px' }}>
                                <button type="button" className="btn btn-secondary px-5 py-2 fw-bold rounded-pill shadow-sm" onClick={() => setShowModal(false)}>
                                    Close Details
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ManageCompanies;