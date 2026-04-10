import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import { FaPalette, FaCreditCard, FaCheckCircle, FaExclamationCircle, FaArrowUp } from 'react-icons/fa';
import Swal from 'sweetalert2'; 

const CompanySettings = () => {
    const [companyData, setCompanyData] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [themeColor, setThemeColor] = useState('#0d6efd'); // Default fallback
    const [loading, setLoading] = useState(true); // ✅ Added explicit loading state

    const [statusMessage, setStatusMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });

    // Utility for translucent backgrounds
    const hexToRgba = (hex, opacity) => {
        if (!hex) return 'rgba(13, 110, 253, 0.1)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    useEffect(() => {
        setLoading(true);
        api.get('/companies/settings')
            .then(res => {
                setCompanyData(res.data.data);
                setLogoUrl(res.data.data.branding?.logoUrl || '');
                setThemeColor(res.data.data.branding?.themeColor || '#0d6efd');
            })
            .catch(err => {
                setStatusMessage("Failed to load company settings.");
                setIsError(true);
            })
            .finally(() => {
                setLoading(false); // Stop loading regardless of success/fail
            });
    }, []);

    const handleUpdateBranding = async (e) => {
        e.preventDefault();
        setStatusMessage("Updating...");
        setIsError(false);

        try {
            await api.put('/companies/branding', { logoUrl, themeColor });
            
            Toast.fire({
                icon: 'success',
                title: 'Branding updated successfully!'
            });

            setStatusMessage("Branding updated successfully! Navigate to other pages to see the new theme.");
            setIsError(false);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: "We couldn't update your branding settings. Please try again.",
                confirmButtonColor: themeColor
            });
            setIsError(true);
        }
    };

    const handleRequestUpgrade = async () => {
        const result = await Swal.fire({
            title: 'Request More Licenses?',
            text: "This will send a formal request to our billing team for an invoice.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: themeColor, 
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, send request',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            setStatusMessage("Sending request to Admin...");
            setIsError(false);

            try {
                await api.post('/companies/request-upgrade', {
                    message: "High priority: Requesting more licenses for our workforce."
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Request Sent!',
                    text: 'Our billing team will contact you shortly via email.',
                    confirmButtonColor: themeColor
                });

                setStatusMessage("Request sent successfully!");
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'System Error',
                    text: 'Failed to send request. Please email billing@learnx.com directly.',
                    confirmButtonColor: themeColor
                });
                setIsError(true);
            }
        }
    };

    return (
        <div className="container mt-3 mb-5 px-3 px-md-4" style={{ maxWidth: '850px', marginLeft: 0 }}>
            
            {/* 🌟 MAGIC: Skeleton CSS Styles */}
            <style>{`
                .skeleton-box {
                    background: #e2e5e7;
                    background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
                    border-radius: 6px;
                    background-size: 200% 100%;
                    animation: 1.5s shine linear infinite;
                }
                @keyframes shine {
                    to { background-position-x: -200%; }
                }
            `}</style>

            <div className="mb-4">
                <h2 className="fw-bold mb-1 text-dark">Company Settings</h2>
                <p className="text-muted small">Manage your subscription licenses and corporate white-labeling.</p>
            </div>

            {statusMessage && !loading && (
                <div className={`alert ${isError ? 'alert-danger' : 'alert-success'} border-0 shadow-sm d-flex align-items-center mb-4`}>
                    {isError ? <FaExclamationCircle className="me-2 fs-5" /> : <FaCheckCircle className="me-2 fs-5" />}
                    <div className="fw-bold">{statusMessage}</div>
                </div>
            )}

            {loading ? (
                <>
                    {/* Subscription Skeleton */}
                    <div className="card shadow-sm border-0 rounded-4 mb-4 overflow-hidden">
                        <div className="card-header bg-light py-3 border-0 d-flex justify-content-between align-items-center">
                            <div className="skeleton-box" style={{ height: '24px', width: '200px' }}></div>
                            <div className="skeleton-box rounded-pill" style={{ height: '32px', width: '180px' }}></div>
                        </div>
                        <div className="card-body p-3 p-md-4 bg-light">
                            <div className="row g-4">
                                <div className="col-12 col-md-6">
                                    <div className="p-3 bg-white rounded-3 border">
                                        <div className="skeleton-box mb-2" style={{ height: '14px', width: '100px' }}></div>
                                        <div className="skeleton-box" style={{ height: '28px', width: '150px' }}></div>
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <div className="p-3 bg-white rounded-3 border">
                                        <div className="skeleton-box mb-2" style={{ height: '14px', width: '150px' }}></div>
                                        <div className="skeleton-box" style={{ height: '28px', width: '100px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branding Skeleton */}
                    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                        <div className="card-header bg-light py-4 border-0">
                            <div className="skeleton-box" style={{ height: '24px', width: '250px' }}></div>
                        </div>
                        <div className="card-body p-3 p-md-4">
                            <div className="row mb-4">
                                <div className="col-12 col-md-8">
                                    <div className="skeleton-box mb-2" style={{ height: '18px', width: '120px' }}></div>
                                    <div className="skeleton-box w-100" style={{ height: '45px' }}></div>
                                </div>
                                <div className="col-12 col-md-4 mt-3 mt-md-0 d-flex align-items-end justify-content-start justify-content-md-center">
                                    <div className="skeleton-box rounded" style={{ height: '60px', width: '120px' }}></div>
                                </div>
                            </div>
                            <div className="mb-5">
                                <div className="skeleton-box mb-2" style={{ height: '18px', width: '150px' }}></div>
                                <div className="d-flex gap-3 align-items-center">
                                    <div className="skeleton-box rounded-circle" style={{ height: '60px', width: '60px' }}></div>
                                    <div>
                                        <div className="skeleton-box mb-1" style={{ height: '20px', width: '80px' }}></div>
                                        <div className="skeleton-box" style={{ height: '14px', width: '250px' }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex justify-content-end">
                                <div className="skeleton-box rounded-pill" style={{ height: '40px', width: '200px' }}></div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* License Management Section */}
                    <div className="card shadow-sm border-0 rounded-4 mb-4 overflow-hidden">
                        <div className="card-header text-white py-3 border-0 d-flex justify-content-between align-items-center flex-wrap gap-3" style={{ backgroundColor: '#212529' }}>
                            <div className="d-flex align-items-center gap-2">
                                <FaCreditCard /> <h6 className="mb-0 fw-bold">Subscription Details</h6>
                            </div>
                            <button
                                className="btn btn-sm rounded-pill px-3 fw-bold"
                                style={{ color: themeColor, border: `1px solid ${themeColor}` }}
                                onClick={handleRequestUpgrade}
                            >
                                <FaArrowUp className="me-1" /> Request More Licenses
                            </button>
                        </div>

                        <div className="card-body p-3 p-md-4 bg-light">
                            <div className="row g-4">
                                <div className="col-12 col-md-6">
                                    <div className="p-3 bg-white rounded-3 border h-100">
                                        <p className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: '1px' }}>Current Plan</p>
                                        <p className="fw-bolder fs-4 text-dark mb-0">{companyData.subscription?.plan || "Enterprise Base"}</p>
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <div className="p-3 bg-white rounded-3 border h-100">
                                        <p className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: '1px' }}>Active Licenses Available</p>
                                        <p className="fw-bolder fs-4 mb-0" style={{ color: themeColor }}>
                                            {companyData.subscription?.usedLicenses || 0} / {companyData.subscription?.activeLicenses || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* White-labeling (Branding) Section */}
                    <div className="card shadow-sm border-0 rounded-4 overflow-hidden" style={{ transition: 'all 0.3s ease' }}>
                        <div className="card-header text-white py-3 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: themeColor, transition: 'background-color 0.3s ease' }}>
                            <FaPalette /> <h6 className="mb-0 fw-bold">White-Labeling (Branding)</h6>
                        </div>
                        
                        <div className="card-body p-3 p-md-4">
                            <form onSubmit={handleUpdateBranding}>
                                <div className="row mb-4">
                                    {/* ✅ Responsive col-12 added for mobile stacking */}
                                    <div className="col-12 col-md-8">
                                        <label className="form-label fw-bold">Company Logo URL</label>
                                        <input
                                            type="text"
                                            value={logoUrl}
                                            onChange={(e) => setLogoUrl(e.target.value)}
                                            className="form-control bg-light border-0 p-3 shadow-none"
                                            placeholder="https://example.com/logo.png"
                                        />
                                        <div className="form-text mt-2 small">Direct link to your transparent PNG logo.</div>
                                    </div>
                                    {/* ✅ Mobile spacing (mt-3) and dynamic alignment */}
                                    <div className="col-12 col-md-4 mt-3 mt-md-0 d-flex align-items-end justify-content-start justify-content-md-center">
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
                                            className="form-control form-control-color border-0 shadow-sm p-1 rounded-circle flex-shrink-0"
                                            style={{ width: '60px', height: '60px', cursor: 'pointer' }}
                                            title="Choose your brand color"
                                        />
                                        <div className="d-flex flex-column">
                                            <span className="fw-bold font-monospace fs-5" style={{ color: themeColor }}>{themeColor.toUpperCase()}</span>
                                            <span className="text-muted small">Change the color picker to see a live preview above!</span>
                                        </div>
                                    </div>
                                </div>

                                <hr className="mb-4 opacity-25" />

                                <div className="d-flex justify-content-end">
                                    {/* Responsive full-width button on very small screens, auto width on md+ */}
                                    <button
                                        type="submit"
                                        className="btn text-white w-100 w-md-auto px-5 py-2 fw-bold rounded-pill shadow-sm border-0"
                                        style={{ backgroundColor: themeColor, transition: 'background-color 0.3s ease' }}
                                    >
                                        Save Branding Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CompanySettings;