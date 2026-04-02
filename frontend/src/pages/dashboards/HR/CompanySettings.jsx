import React, { useState, useEffect } from 'react';
// import { useTheme } from '../../../context/ThemeContext'; // Dynamic theme update ke liye
import api from '../../../api/api';
// 1. IMPORT LAYOUT AND SIDEBAR LINKS
import DashboardLayout, { hrSidebarLinks } from '../dashboardLayout';
import { FaPalette, FaCreditCard, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const CompanySettings = () => {
    const [companyData, setCompanyData] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [themeColor, setThemeColor] = useState('#000000');

    // Inline status states
    const [statusMessage, setStatusMessage] = useState("");
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        // Fetch current settings on load
        api.get('/companies/settings')
            .then(res => {
                setCompanyData(res.data.data);
                setLogoUrl(res.data.data.branding?.logoUrl || '');
                setThemeColor(res.data.data.branding?.themeColor || '#6f42c1');
            })
            .catch(err => {
                setStatusMessage("Failed to load company settings.");
                setIsError(true);
            });
    }, []);

    const handleUpdateBranding = async (e) => {
        e.preventDefault();
        setStatusMessage("Updating...");
        setIsError(false);

        try {
            await api.put('/companies/branding', { logoUrl, themeColor });
            setStatusMessage("Branding updated successfully! Refresh to see changes globally.");
            setIsError(false);
            // Agar aapke paas context hai toh aap yahan update call trigger kar sakte hain
        } catch (error) {
            setStatusMessage("Failed to update branding. Please try again.");
            setIsError(true);
        }
    };

    if (!companyData) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
            <div className="spinner-border text-primary" role="status"></div>
        </div>
    );

    return (
        <div className="container mt-2" style={{ maxWidth: '850px', marginLeft: 0 }}>

            <div className="mb-4">
                <h2 className="fw-bold mb-1 text-dark">Company Settings</h2>
                <p className="text-muted small">Manage your subscription licenses and corporate white-labeling.</p>
            </div>

            {/* Inline Status Message */}
            {statusMessage && (
                <div className={`alert ${isError ? 'alert-danger' : 'alert-success'} border-0 shadow-sm d-flex align-items-center mb-4`}>
                    {isError ? <FaExclamationCircle className="me-2 fs-5" /> : <FaCheckCircle className="me-2 fs-5" />}
                    <div className="fw-bold">{statusMessage}</div>
                </div>
            )}

            {/* Billing & Subscription Info Panel */}
            <div className="card shadow-sm border-0 rounded-4 mb-4 overflow-hidden">
                <div className="card-header bg-dark text-white py-3 border-0 d-flex align-items-center gap-2">
                    <FaCreditCard /> <h6 className="mb-0 fw-bold">Subscription Details</h6>
                </div>
                <div className="card-body p-4 bg-light">
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="p-3 bg-white rounded-3 border">
                                <p className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: '1px' }}>Current Plan</p>
                                <p className="fw-bolder fs-4 text-dark mb-0">{companyData.subscription?.plan || "Enterprise Base"}</p>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="p-3 bg-white rounded-3 border">
                                <p className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: '1px' }}>Active Licenses Available</p>
                                <p className="fw-bolder fs-4 text-primary mb-0">
                                    {companyData.subscription?.usedLicenses || 0} / {companyData.subscription?.purchasedLicenses || companyData.subscription?.activeLicenses || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branding Update Form */}
            <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                <div className="card-header bg-primary text-white py-3 border-0 d-flex align-items-center gap-2">
                    <FaPalette /> <h6 className="mb-0 fw-bold">White-Labeling (Branding)</h6>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleUpdateBranding}>

                        <div className="row mb-4">
                            <div className="col-md-8">
                                <label className="form-label fw-bold">Company Logo URL</label>
                                <input
                                    type="text"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    className="form-control bg-light border-0 p-3"
                                    placeholder="https://example.com/logo.png"
                                />
                                <div className="form-text mt-2 small">Provide a direct link to your transparent PNG logo.</div>
                            </div>
                            <div className="col-md-4 d-flex align-items-end justify-content-center">
                                {logoUrl ? (
                                    <div className="border rounded p-2 text-center" style={{ background: '#f8f9fa', width: '120px', height: '60px' }}>
                                        <img src={logoUrl} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <div className="border rounded p-2 text-center text-muted small d-flex align-items-center justify-content-center" style={{ background: '#f8f9fa', width: '120px', height: '60px' }}>
                                        No Preview
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="form-label fw-bold">Primary Theme Color</label>
                            <div className="d-flex align-items-center gap-3">
                                <input
                                    type="color"
                                    value={themeColor}
                                    onChange={(e) => setThemeColor(e.target.value)}
                                    className="form-control form-control-color border-0 shadow-sm p-1 rounded-circle"
                                    style={{ width: '60px', height: '60px', cursor: 'pointer' }}
                                    title="Choose your brand color"
                                />
                                <div className="d-flex flex-column">
                                    <span className="fw-bold font-monospace fs-5 text-dark">{themeColor.toUpperCase()}</span>
                                    <span className="text-muted small">This color will be used for buttons and headers across the platform.</span>
                                </div>
                            </div>
                        </div>

                        <hr className="mb-4 opacity-25" />

                        <div className="d-flex justify-content-end">
                            <button
                                type="submit"
                                className="btn btn-primary px-5 py-2 fw-bold rounded-pill shadow-sm"
                            >
                                Save Branding Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    );
};

export default CompanySettings;