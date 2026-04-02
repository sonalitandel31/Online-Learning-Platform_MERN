import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import { FaClock, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';

const RequestStatus = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchMyRequests = async () => {
            try {
                const res = await api.get('/hr/my-requests');
                setRequests(res.data.data);
            } catch (err) {
                setError("Could not load your requests. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchMyRequests();
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Approved': return { color: '#10b981', bg: '#ecfdf5', icon: <FaCheckCircle /> };
            case 'Rejected': return { color: '#ef4444', bg: '#fef2f2', icon: <FaTimesCircle /> };
            case 'In-Review': return { color: '#0ea5e9', bg: '#f0f9ff', icon: <FaInfoCircle /> };
            default: return { color: '#f59e0b', bg: '#fffbeb', icon: <FaClock /> };
        }
    };

    if (loading) return <div className="p-5 text-center text-muted">Loading your requests...</div>;

    return (
        <div className="container mt-4">
            <h2 className="fw-bold mb-4">Training Request History</h2>

            {error && <div className="alert alert-danger">{error}</div>}

            {requests.length === 0 ? (
                <div className="card border-0 shadow-sm p-5 text-center">
                    <p className="text-muted m-0">You haven't made any custom course requests yet.</p>
                </div>
            ) : (
                <div className="row g-3">
                    {requests.map((req) => {
                        const style = getStatusStyle(req.status);
                        return (
                            <div className="col-12" key={req._id}>
                                <div className="card shadow-sm border-0 p-3 h-100">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <h5 className="fw-bold mb-1 text-dark">{req.topic}</h5>
                                            <span className="badge text-uppercase small" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>
                                                {req.category === 'other' ? req.customCategory : req.category}
                                            </span>
                                        </div>
                                        <div 
                                            className="px-3 py-1 rounded-pill d-flex align-items-center gap-2 fw-bold small"
                                            style={{ backgroundColor: style.bg, color: style.color }}
                                        >
                                            {style.icon} {req.status}
                                        </div>
                                    </div>

                                    <div className="row mt-3 small text-muted">
                                        <div className="col-md-4">
                                            <strong>Target:</strong> {req.targetAudience}
                                        </div>
                                        <div className="col-md-4">
                                            <strong>Trainees:</strong> {req.expectedEmployees}
                                        </div>
                                        <div className="col-md-4 text-md-end">
                                            <strong>Date:</strong> {new Date(req.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {req.adminNotes && (
                                        <div className="mt-3 p-2 rounded bg-light border-start border-3 border-info">
                                            <small className="text-dark d-block fw-bold">Admin Message:</small>
                                            <small className="text-muted">{req.adminNotes}</small>
                                        </div>
                                    )}
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