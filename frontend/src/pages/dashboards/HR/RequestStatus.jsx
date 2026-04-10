import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import Swal from 'sweetalert2';
import {
    FaClock, FaCheckCircle, FaTimesCircle, FaInfoCircle,
    FaHistory, FaUsers, FaTag, FaCalendarAlt, FaCommentDots
} from 'react-icons/fa';

const RequestStatus = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [brandColor, setBrandColor] = useState('#6f42c1');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsRes, requestsRes] = await Promise.all([
                    api.get('/companies/settings'),
                    api.get('/hr/my-requests')
                ]);
                setBrandColor(settingsRes.data.data.branding?.themeColor || '#6f42c1');
                setRequests(requestsRes.data.data);
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const hexToRgba = (hex, opacity) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    // ✅ FIXED: Case-insensitive status matching
    const getStatusStyle = (status) => {
        const s = status ? status.toLowerCase() : 'pending';
        switch (s) {
            case 'approved': return { color: '#059669', bg: '#ecfdf5', icon: <FaCheckCircle />, border: '#10b981' };
            case 'rejected': return { color: '#dc2626', bg: '#fef2f2', icon: <FaTimesCircle />, border: '#ef4444' };
            case 'reviewed':
            case 'in-development': return { color: '#0284c7', bg: '#f0f9ff', icon: <FaInfoCircle />, border: '#0ea5e9' };
            default: return { color: '#d97706', bg: '#fffbeb', icon: <FaClock />, border: '#f59e0b' };
        }
    };

    return (
        <div className="container mt-3 mb-5 px-3 px-md-4" style={{ maxWidth: '1050px' }}>

            <style>{`
                .skeleton-box {
                    background: #e2e5e7;
                    background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
                    border-radius: 6px;
                    background-size: 200% 100%;
                    animation: 1.5s shine linear infinite;
                }
                @keyframes shine { to { background-position-x: -200%; } }
                .card-hover-effect { transition: all 0.3s ease; border: 1px solid transparent !important; }
                .card-hover-effect:hover { 
                    transform: translateY(-5px); 
                    box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important;
                    border-color: ${hexToRgba(brandColor, 0.2)} !important;
                }
            `}</style>

            <div className="mb-4 mb-md-5 text-start w-100">
                <h2 className="fw-bold text-dark mb-1 d-flex align-items-center justify-content-start w-100">
                    <FaHistory className="me-2 flex-shrink-0" style={{ color: brandColor }} />
                    <span className="text-start">Training Request History</span>
                </h2>
                <p className="text-muted small mb-0 text-start">Track your curriculum requests with your company branding.</p>
            </div>

            {loading ? (
                /* 💀 Skeleton remains same but with 850px constraint */
                <div className="row g-4">
                    {[...Array(3)].map((_, i) => (
                        <div className="col-12" key={i}>
                            <div className="card shadow-sm border-0 rounded-4 overflow-hidden p-4">
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
                                    <div>
                                        <div className="skeleton-box mb-2" style={{ height: '24px', width: '200px' }}></div>
                                        <div className="skeleton-box rounded-pill" style={{ height: '30px', width: '120px' }}></div>
                                    </div>
                                    <div className="skeleton-box rounded-pill" style={{ height: '35px', width: '100px' }}></div>
                                </div>
                                <div className="row g-3 py-3 border-top border-bottom border-light">
                                    {[1, 2, 3].map(s => (
                                        <div className="col-4" key={s}><div className="skeleton-box" style={{ height: '20px', width: '80%' }}></div></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
                    <FaInfoCircle size={50} className="text-muted opacity-25 mb-3" />
                    <h5 className="text-muted fw-bold">No Records Found</h5>
                </div>
            ) : (
                <div className="row g-4">
                    {requests.map((req) => {
                        const style = getStatusStyle(req.status);
                        return (
                            <div className="col-12" key={req._id}>
                                <div className="card shadow-sm border-0 rounded-4 overflow-hidden card-hover-effect">
                                    <div className="card-body p-4 text-start"> {/* ✅ Forced text-start */}

                                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
                                            <div>
                                                <h4 className="fw-bold text-dark mb-2">{req.topic}</h4>
                                                <span className="badge bg-light text-dark border rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2">
                                                    <FaTag style={{ color: brandColor }} size={12} />
                                                    {req.categoryName || 'General Training'}
                                                </span>
                                            </div>

                                            <div
                                                className="px-4 py-2 rounded-pill d-inline-flex align-items-center gap-2 fw-bold text-uppercase"
                                                style={{ backgroundColor: style.bg, color: style.color, fontSize: '0.75rem', border: `1px solid ${style.border}` }}
                                            >
                                                {style.icon} {req.status}
                                            </div>
                                        </div>

                                        <div className="row g-0 py-3 border-top border-bottom border-light w-100 m-0">

                                            {/* Column 1: Target Audience */}
                                            <div className="col-6 col-md-4 text-start">
                                                <div className="small text-muted mb-1 d-flex align-items-center justify-content-start gap-2">
                                                    <FaUsers className="flex-shrink-0" />
                                                    <span style={{ fontSize: '0.85rem' }}>Target</span>
                                                </div>
                                                <div className="fw-bold text-dark text-truncate pe-2">
                                                    {req.targetAudience}
                                                </div>
                                            </div>

                                            {/* Column 2: Expected Learners */}
                                            <div className="col-6 col-md-4 text-start">
                                                <div className="small text-muted mb-1 d-flex align-items-center justify-content-start gap-2">
                                                    <FaUsers className="flex-shrink-0" style={{ color: brandColor }} />
                                                    <span style={{ fontSize: '0.85rem' }}>Learners</span>
                                                </div>
                                                <div className="fw-bold text-dark">
                                                    {req.expectedEmployees} Seats
                                                </div>
                                            </div>

                                            {/* Column 3: Date (Responsive Margin for Mobile) */}
                                            <div className="col-12 col-md-4 text-start mt-3 mt-md-0">
                                                <div className="small text-muted mb-1 d-flex align-items-center justify-content-start gap-2">
                                                    <FaCalendarAlt className="flex-shrink-0" />
                                                    <span style={{ fontSize: '0.85rem' }}>Date Requested</span>
                                                </div>
                                                <div className="fw-bold text-dark">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>

                                        </div>

                                        {req.adminNotes && (
                                            <div className="mt-4 p-3 rounded-4 border-start border-4" style={{ backgroundColor: hexToRgba(brandColor, 0.08), borderLeftColor: brandColor }}>
                                                <div className="d-flex align-items-center gap-2 mb-2 fw-bold small" style={{ color: brandColor }}>
                                                    <FaCommentDots /> Admin Feedback
                                                </div>
                                                <p className="text-dark small mb-0 font-italic">"{req.adminNotes}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RequestStatus;