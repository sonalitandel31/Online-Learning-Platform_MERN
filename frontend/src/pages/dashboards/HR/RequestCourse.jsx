import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import Swal from 'sweetalert2';
import { FaGraduationCap, FaPaperPlane, FaInfoCircle, FaUsers, FaTasks } from 'react-icons/fa';

const RequestCourse = () => {
    const [formData, setFormData] = useState({
        topic: '',
        category: '',
        customCategory: '',
        targetAudience: '',
        expectedEmployees: '',
        requirements: ''
    });

    const [categories, setCategories] = useState([]);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [loading, setLoading] = useState(false); // For Submit button
    const [pageLoading, setPageLoading] = useState(true); // ✅ For Skeleton Loader
    const [brandColor, setBrandColor] = useState('#6f42c1'); // Default Fallback

    const token = localStorage.getItem("token");

    // Utility to create translucent backgrounds
    const hexToRgba = (hex, opacity) => {
        if (!hex) return 'rgba(111, 66, 193, 0.1)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            setPageLoading(true);
            try {
                // ✅ Fetch Brand Color & Categories in parallel for speed
                const [settingsRes, categoriesRes] = await Promise.all([
                    api.get('/companies/settings'),
                    api.get("/courses/categories", { headers: { Authorization: `Bearer ${token}` } })
                ]);

                const theme = settingsRes.data?.data?.branding?.themeColor || '#6f42c1';
                setBrandColor(theme);

                const cats = Array.isArray(categoriesRes.data) ? categoriesRes.data : categoriesRes.data?.categories || [];
                setCategories(cats);
            } catch (err) {
                console.error("Sync Error", err);
            } finally {
                setPageLoading(false);
            }
        };
        fetchInitialData();
    }, [token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'category') {
            if (value === 'other') {
                setShowCustomInput(true);
                setFormData({ ...formData, category: 'other' });
            } else {
                setShowCustomInput(false);
                setFormData({ ...formData, category: value, customCategory: '' });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        Swal.fire({
            title: 'Submitting Request...',
            text: 'Linking with our curriculum experts.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            await api.post('/hr/request-course', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'Request Received!',
                text: 'We will design your curriculum shortly.',
                confirmButtonColor: brandColor // ✅ Dynamic Button Color
            });

            setFormData({ topic: '', category: '', customCategory: '', targetAudience: '', expectedEmployees: '', requirements: '' });
            setShowCustomInput(false);

        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to submit.',
                confirmButtonColor: brandColor
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-3 mb-5 px-3 px-md-4" style={{ maxWidth: '850px' }}>

            {/* 🌟 MAGIC: Skeleton CSS Styles */}
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

            {/* Header Section */}
            <div className="mb-4 mb-md-5 text-start">
                <h2 className="fw-bold text-dark mb-1 d-flex align-items-center justify-content-start">
                    <FaGraduationCap className="me-2" style={{ color: brandColor }} /> Request Custom Training
                </h2>
                <p className="text-muted small mb-0">Personalized learning paths for your company.</p>
            </div>
            {pageLoading ? (
                /* 💀 SKELETON LOADER UI 💀 */
                <>
                    {/* Banner Skeleton */}
                    <div className="card border-0 rounded-4 mb-4 shadow-sm overflow-hidden bg-light">
                        <div className="card-body p-4 d-flex align-items-center gap-3">
                            <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: '50px', height: '50px' }}></div>
                            <div className="w-100">
                                <div className="skeleton-box mb-2" style={{ height: '18px', width: '200px' }}></div>
                                <div className="skeleton-box" style={{ height: '14px', width: '80%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Form Skeleton */}
                    <div className="card shadow-sm border-0 rounded-4 p-4 p-md-5">
                        <div className="row g-4 mb-4">
                            <div className="col-12 col-md-6">
                                <div className="skeleton-box mb-2" style={{ height: '14px', width: '100px' }}></div>
                                <div className="skeleton-box w-100" style={{ height: '50px' }}></div>
                            </div>
                            <div className="col-12 col-md-6">
                                <div className="skeleton-box mb-2" style={{ height: '14px', width: '120px' }}></div>
                                <div className="skeleton-box w-100" style={{ height: '50px' }}></div>
                            </div>
                        </div>
                        <div className="row g-4 mb-4">
                            <div className="col-12 col-md-6">
                                <div className="skeleton-box mb-2" style={{ height: '14px', width: '110px' }}></div>
                                <div className="skeleton-box w-100" style={{ height: '50px' }}></div>
                            </div>
                            <div className="col-12 col-md-6">
                                <div className="skeleton-box mb-2" style={{ height: '14px', width: '130px' }}></div>
                                <div className="skeleton-box w-100" style={{ height: '50px' }}></div>
                            </div>
                        </div>
                        <div className="mb-5">
                            <div className="skeleton-box mb-2" style={{ height: '14px', width: '150px' }}></div>
                            <div className="skeleton-box w-100" style={{ height: '120px' }}></div>
                        </div>
                        <div className="d-flex justify-content-end">
                            <div className="skeleton-box rounded-pill w-100 w-md-auto" style={{ height: '50px', width: '200px' }}></div>
                        </div>
                    </div>
                </>
            ) : (
                /* ✨ ACTUAL CONTENT ✨ */
                <>
                    {/* Informational Banner with Dynamic Gradient Background */}
                    <div
                        className="card border-0 rounded-4 mb-4 shadow-sm overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${hexToRgba(brandColor, 0.1)} 0%, ${hexToRgba(brandColor, 0.2)} 100%)` }}
                    >
                        <div className="card-body p-4 d-flex align-items-center justify-content-start gap-3 text-start w-100">
                            <div className="bg-white p-3 rounded-circle shadow-sm flex-shrink-0 d-flex align-items-center justify-content-center" style={{ color: brandColor, width: '48px', height: '48px' }}>
                                <FaInfoCircle size={24} />
                            </div>
                            <div className="text-start">
                                <h6 className="fw-bold mb-1" style={{ color: brandColor }}>Tailored Curriculum</h6>
                                <p className="mb-0 small text-dark opacity-75">Your brand color is applied to this request for a personalized experience.</p>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm border-0 rounded-4 p-4 p-md-5">
                        <form onSubmit={handleSubmit}>

                            <div className="row g-4 mb-4">
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-bold text-muted small">Course Topic</label>
                                    <input
                                        type="text" className="form-control bg-light border-0 p-3 shadow-none"
                                        name="topic" value={formData.topic} onChange={handleChange}
                                        required placeholder="e.g. Advanced Cybersecurity"
                                    />
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-bold text-muted small">Primary Category</label>
                                    <select
                                        className="form-select bg-light border-0 p-3 shadow-none"
                                        name="category" value={formData.category} onChange={handleChange} required
                                    >
                                        <option value="">-- Select Category --</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                        <option value="other" style={{ color: brandColor, fontWeight: 'bold' }}>+ Custom Category</option>
                                    </select>

                                    {showCustomInput && (
                                        <div className="mt-3 animate__animated animate__fadeInDown">
                                            <input
                                                type="text"
                                                className="form-control p-3 shadow-none"
                                                style={{ border: `1px solid ${brandColor}`, backgroundColor: hexToRgba(brandColor, 0.05) }}
                                                name="customCategory"
                                                value={formData.customCategory}
                                                onChange={handleChange}
                                                required
                                                placeholder="Enter category name"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="row g-4 mb-4">
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-bold text-muted small">Target Audience</label>
                                    <input
                                        type="text" className="form-control bg-light border-0 p-3 shadow-none"
                                        name="targetAudience" value={formData.targetAudience} onChange={handleChange}
                                        required placeholder="e.g. Finance Team"
                                    />
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-bold text-muted small">Seats Required</label>
                                    <input
                                        type="number" className="form-control bg-light border-0 p-3 shadow-none"
                                        name="expectedEmployees" value={formData.expectedEmployees} onChange={handleChange}
                                        required min="1" placeholder="e.g. 50"
                                    />
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="form-label fw-bold text-muted small">Specific Requirements</label>
                                <textarea
                                    className="form-control bg-light border-0 p-3 shadow-none"
                                    name="requirements" rows="5" value={formData.requirements} onChange={handleChange}
                                    required placeholder="What goals should this course fulfill?"
                                ></textarea>
                            </div>

                            <div className="text-end">
                                <button
                                    type="submit"
                                    className="btn px-5 py-3 fw-bold rounded-pill shadow-sm text-white border-0 w-100 w-md-auto d-inline-flex align-items-center justify-content-center gap-2"
                                    style={{ backgroundColor: brandColor, transition: '0.3s' }}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="spinner-border spinner-border-sm"></span>
                                    ) : (
                                        <><FaPaperPlane /> Send Request</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default RequestCourse;