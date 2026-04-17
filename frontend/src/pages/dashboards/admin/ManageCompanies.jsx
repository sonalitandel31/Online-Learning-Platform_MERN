import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import { Row, Col, Modal, Form, Button, Badge, Spinner } from 'react-bootstrap';
import {
    FaBuilding,
    FaPlus,
    FaCheckCircle,
    FaExclamationCircle,
    FaUsers,
    FaEye,
    FaEnvelope,
    FaCalendarAlt,
    FaUserTie,
    FaEdit,
    FaTimes,
    FaGlobe
} from 'react-icons/fa';

// --- Skeleton Component for Table Loading ---
const TableSkeleton = () => (
    <div className="skeleton-row">
        <div className="skeleton-item" style={{ width: '35%' }}></div>
        <div className="skeleton-item" style={{ width: '15%' }}></div>
        <div className="skeleton-item" style={{ width: '15%' }}></div>
        <div className="skeleton-item" style={{ width: '25%' }}></div>
    </div>
);

const ManageCompanies = () => {
    const [companies, setCompanies] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [status, setStatus] = useState({ type: '', message: '' });

    const [selectedCompany, setSelectedCompany] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [editingLicenseCompany, setEditingLicenseCompany] = useState(null);
    const [newLicenseCount, setNewLicenseCount] = useState(0);
    const [updateLoading, setUpdateLoading] = useState(false);

    const [formData, setFormData] = useState({
        companyName: '',
        domain: '',
        purchasedLicenses: 100,
        hrName: '',
        hrEmail: '',
        hrPassword: ''
    });

    // Theme Colors
    const colors = {
        primary: "#6c5ce7",     // Purple
        secondary: "#fd9644",   // Orange
        accent: "#f1c40f",      // Yellow/Gold
        lightBg: "#f8f9fd",
        darkText: "#2d3436",
        muted: "#636e72"
    };

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
            setStatus({ type: 'success', message: `Successfully registered ${formData.companyName}!` });
            setFormData({ companyName: '', domain: '', purchasedLicenses: 100, hrName: '', hrEmail: '', hrPassword: '' });
            setShowForm(false);
            fetchCompanies();
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.response?.data?.message || "Failed to register company."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLicense = async (e) => {
        e.preventDefault();
        setUpdateLoading(true);
        setStatus({ type: '', message: '' });
        try {
            await api.put(`/companies/${editingLicenseCompany._id}/licenses`, {
                purchasedLicenses: newLicenseCount
            });
            setStatus({ type: 'success', message: `Updated licenses for ${editingLicenseCompany.companyName} to ${newLicenseCount}!` });
            setEditingLicenseCompany(null);
            fetchCompanies();
        } catch (error) {
            setStatus({ type: 'error', message: "Failed to allocate licenses." });
        } finally {
            setUpdateLoading(false);
        }
    };

    const openDetailsModal = (company) => {
        setSelectedCompany(company);
        setShowModal(true);
    };

    return (
        <div className="manage-companies-page">
            <style>{`
                .manage-companies-page { background: ${colors.lightBg}; min-height: 100vh; padding: 30px; }
                .page-title { color: ${colors.darkText}; font-weight: 850; letter-spacing: -1px; }
                
                .main-card { 
                    background: white; border-radius: 20px; border: none; 
                    box-shadow: 0 10px 30px rgba(108, 92, 231, 0.05); overflow: hidden; 
                }

                .btn-purple { background: ${colors.primary}; color: white; border: none; font-weight: 700; border-radius: 12px; transition: 0.3s; }
                .btn-purple:hover { background: #5b4bc4; transform: translateY(-2px); color: white; }

                .btn-orange { background: ${colors.secondary}; color: white; border: none; font-weight: 700; border-radius: 12px; transition: 0.3s; }
                .btn-orange:hover { background: #e67e22; transform: translateY(-2px); color: white; }

                .table thead th { 
                    background: #fcfcfd; color: ${colors.muted}; font-size: 0.75rem; 
                    text-transform: uppercase; letter-spacing: 1px; padding: 18px 24px; border-bottom: 1px solid #f1f2f6;
                }
                .table tbody td { padding: 20px 24px; border-bottom: 1px solid #f8f9fa; vertical-align: middle; }
                
                .company-name { font-weight: 700; color: ${colors.darkText}; font-size: 1rem; margin-bottom: 2px; }
                .domain-tag { font-size: 0.85rem; color: ${colors.primary}; display: flex; align-items: center; gap: 5px; }

                .license-badge { 
                    background: rgba(108, 92, 231, 0.1); color: ${colors.primary}; 
                    font-weight: 700; padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(108, 92, 231, 0.2);
                }

                .status-active { 
                    background-color: #e3fcef !important; /* Light Greenish-Blue tint */
                    color: #00b894 !important; 
                    border: none;
                }

                .status-inactive { 
                    background-color: #fff3cd !important; /* Orange/Yellow tint */
                    color: #d35400 !important;
                    border: none;
                }

                /* Registration Form Styling */
                .form-section-title { color: ${colors.primary}; font-weight: 800; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
                .form-control { border-radius: 12px; padding: 12px 15px; border: 2px solid #f1f2f6; transition: 0.3s; }
                .form-control:focus { border-color: ${colors.primaryLight}; box-shadow: 0 0 0 4px rgba(108, 92, 231, 0.1); }

                /* Allocation Panel */
                .allocation-panel { 
                    background: white; border: 2px solid ${colors.secondary}; border-radius: 20px; 
                    padding: 25px; margin-top: 30px; animation: slideUp 0.4s ease;
                }

                /* Skeleton */
                @keyframes shimmer { 0% { background-position: -450px 0; } 100% { background-position: 450px 0; } }
                .skeleton-row { display: flex; gap: 20px; padding: 20px; border-bottom: 1px solid #eee; }
                .skeleton-item { 
                    height: 20px; background: linear-gradient(to right, #f0f0f0 8%, #f8f8f8 18%, #f0f0f0 33%);
                    background-size: 800px 104px; animation: shimmer 2s infinite linear; border-radius: 4px;
                }

                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

                @media (max-width: 768px) {
                    .manage-companies-page { padding: 15px; }
                    .d-flex.justify-content-between { flex-direction: column; align-items: flex-start !important; gap: 20px; }
                    .btn-purple { width: 100%; }
                }
            `}</style>

            <div className="d-flex justify-content-between align-items-center mb-5">
                <div>
                    <h2 className="page-title mb-1"><FaBuilding className="me-2" style={{ color: colors.primary }} /> B2B Client Center</h2>
                    <p className="text-muted fw-medium">Manage enterprise subscriptions and corporate onboarding.</p>
                </div>
                <Button 
                    className={showForm ? "btn-light border" : "btn-purple shadow"} 
                    onClick={() => { setShowForm(!showForm); setStatus({ type: '', message: '' }); }}
                >
                    {showForm ? <><FaTimes className="me-2" /> Close Form</> : <><FaPlus className="me-2" /> Register New Client</>}
                </Button>
            </div>

            {status.message && (
                <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-danger'} border-0 shadow-sm rounded-4 d-flex align-items-center mb-4 animate-fade-in`}>
                    {status.type === 'success' ? <FaCheckCircle className="me-3 fs-4" /> : <FaExclamationCircle className="me-3 fs-4" />}
                    <div className="fw-bold">{status.message}</div>
                </div>
            )}

            {showForm && (
                <div className="main-card p-4 p-md-5 mb-5 animate-fade-in">
                    <h4 className="form-section-title"><FaBuilding /> Company Identity</h4>
                    <Form onSubmit={handleRegisterCompany}>
                        <Row className="g-4 mb-5">
                            <Col md={6}>
                                <Form.Label className="small fw-bold text-muted">Legal Company Name</Form.Label>
                                <Form.Control name="companyName" value={formData.companyName} onChange={handleInputChange} required placeholder="e.g. Microsoft Corporation" />
                            </Col>
                            <Col md={4}>
                                <Form.Label className="small fw-bold text-muted">Official Domain</Form.Label>
                                <Form.Control name="domain" value={formData.domain} onChange={handleInputChange} required placeholder="microsoft.com" />
                            </Col>
                            <Col md={2}>
                                <Form.Label className="small fw-bold text-muted">Initial Seats</Form.Label>
                                <Form.Control type="number" name="purchasedLicenses" value={formData.purchasedLicenses} onChange={handleInputChange} required min="1" />
                            </Col>
                        </Row>

                        <h4 className="form-section-title" style={{ color: colors.secondary }}><FaUserTie /> Primary HR Administrator</h4>
                        <Row className="g-4 mb-4">
                            <Col md={4}>
                                <Form.Label className="small fw-bold text-muted">Full Name</Form.Label>
                                <Form.Control name="hrName" value={formData.hrName} onChange={handleInputChange} required placeholder="HR name" />
                            </Col>
                            <Col md={4}>
                                <Form.Label className="small fw-bold text-muted">Work Email</Form.Label>
                                <Form.Control type="email" name="hrEmail" value={formData.hrEmail} onChange={handleInputChange} required placeholder="hr@domain.com" />
                            </Col>
                            <Col md={4}>
                                <Form.Label className="small fw-bold text-muted">Temporary Password</Form.Label>
                                <Form.Control type="password" name="hrPassword" value={formData.hrPassword} onChange={handleInputChange} required placeholder="••••••••" />
                            </Col>
                        </Row>

                        <div className="text-end border-top pt-4 mt-2">
                            <Button type="submit" className="btn-orange px-5 py-3 shadow" disabled={loading}>
                                {loading ? <Spinner size="sm" /> : 'Confirm Registration & Create HR'}
                            </Button>
                        </div>
                    </Form>
                </div>
            )}

            {!showForm && (
                <div className="main-card">
                    {fetchLoading ? (
                        <div className="p-3">
                            {Array(5).fill(0).map((_, i) => <TableSkeleton key={i} />)}
                        </div>
                    ) : companies.length === 0 ? (
                        <div className="text-center p-5">
                            <FaBuilding size={60} className="mb-3 opacity-25" />
                            <h4 className="fw-bold text-muted">No corporate clients onboarded.</h4>
                            <p>Start by registering your first B2B partner.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Organization</th>
                                        <th className="text-center">License Pool</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-end">Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map((company) => (
                                        <tr key={company._id}>
                                            <td>
                                                <div className="company-name">{company.companyName}</div>
                                                <div className="domain-tag"><FaGlobe size={12} /> {company.domain}</div>
                                            </td>
                                            <td className="text-center">
                                                <div className="license-badge">
                                                    <FaUsers className="me-2" /> 
                                                    {company.subscription?.activeLicenses || company.subscription?.purchasedLicenses || 0}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <Badge className={`px-3 py-2 rounded-pill ${company.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                                    {company.isActive !== false ? '● ACTIVE CLIENT' : '● SUSPENDED'}
                                                </Badge>
                                            </td>
                                            <td className="text-end">
                                                <button 
                                                    className="btn btn-sm btn-light fw-bold border text-muted px-3 py-2 me-2"
                                                    onClick={() => openDetailsModal(company)}
                                                >
                                                    <FaEye className="me-2" /> Details
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-purple px-3 py-2"
                                                    onClick={() => {
                                                        setEditingLicenseCompany(company);
                                                        setNewLicenseCount(company.subscription?.purchasedLicenses || company.subscription?.activeLicenses || 0);
                                                        setStatus({ type: '', message: '' });
                                                    }}
                                                >
                                                    <FaEdit className="me-2" /> Allocate
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

            {editingLicenseCompany && (
                <div className="allocation-panel shadow-lg">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold m-0" style={{ color: colors.secondary }}>
                            <FaEdit className="me-2" /> Modify License Allocation
                        </h5>
                        <FaTimes style={{ cursor: 'pointer' }} onClick={() => setEditingLicenseCompany(null)} />
                    </div>
                    <p className="text-muted small mb-4">Updating seat count for <strong>{editingLicenseCompany.companyName}</strong>. Ensure billing is confirmed.</p>
                    
                    <Form onSubmit={handleUpdateLicense}>
                        <Row className="g-3 align-items-end">
                            <Col md={4}>
                                <Form.Label className="small fw-bold">Currently Purchased</Form.Label>
                                <Form.Control disabled className="bg-light fw-bold" value={editingLicenseCompany.subscription?.purchasedLicenses || 0} />
                            </Col>
                            <Col md={4}>
                                <Form.Label className="small fw-bold text-dark">New License Total</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    className="border-primary fw-bold" 
                                    value={newLicenseCount} 
                                    onChange={(e) => setNewLicenseCount(Number(e.target.value))}
                                    min={editingLicenseCompany.subscription?.usedLicenses || 1}
                                    required 
                                />
                            </Col>
                            <Col md={4}>
                                <Button type="submit" className="btn-purple w-100 py-2 shadow-sm" disabled={updateLoading}>
                                    {updateLoading ? <Spinner size="sm" /> : 'Apply New Allocation'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </div>
            )}

            {/* Company Details Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-dark text-white border-0 py-4">
                    <Modal.Title className="fw-bold"><FaBuilding className="me-2 text-warning" /> {selectedCompany?.companyName}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-light p-4">
                    {selectedCompany && (
                        <Row className="g-4">
                            <Col md={6}>
                                <div className="card border-0 shadow-sm rounded-4 h-100 p-4">
                                    <h6 className="text-uppercase fw-bold text-muted small mb-4">Subscription Insight</h6>
                                    <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                                        <span className="text-muted">Total Seats:</span>
                                        <span className="fw-bold text-primary">{selectedCompany.subscription?.activeLicenses || 0}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                                        <span className="text-muted">Onboarded On:</span>
                                        <span className="fw-bold"><FaCalendarAlt className="me-1 text-muted" /> {new Date(selectedCompany.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-muted">Client Status:</span>
                                        <Badge bg={selectedCompany.isActive !== false ? "success" : "danger"}>
                                            {selectedCompany.isActive !== false ? "ACTIVE" : "SUSPENDED"}
                                        </Badge>
                                    </div>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="card border-0 shadow-sm rounded-4 h-100 p-4" style={{ background: 'rgba(253, 150, 68, 0.05)' }}>
                                    <h6 className="text-uppercase fw-bold text-muted small mb-4" style={{ color: colors.secondary }}>Administration</h6>
                                    <p className="small mb-3">Company Domain: <strong>@{selectedCompany.domain}</strong></p>
                                    <div className="alert alert-warning border-0 small py-2 px-3">
                                        <FaUserTie className="me-2" /> 
                                        HR Managers are managed via the <strong>User Directory</strong>. Filter by the corporate domain to manage admins.
                                    </div>
                                    <Button variant="outline-dark" size="sm" className="w-100 mt-2 fw-bold" href="/admin-dashboard/users">Go to User Directory</Button>
                                </div>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 bg-light pb-4">
                    <Button variant="secondary" className="px-5 rounded-pill fw-bold" onClick={() => setShowModal(false)}>Close Overview</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ManageCompanies;