import React, { useState, useEffect } from 'react';
import api from '../../../api/api';

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
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get("/courses/categories", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const cats = Array.isArray(res.data) ? res.data : res.data.categories || [];
                setCategories(cats);
            } catch (err) {
                console.error("Failed to fetch categories", err);
            }
        };
        fetchCategories();
    }, [token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // ✅ Logic: Agar dropdown mein "other" select kiya, toh text box dikhao
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
        setMessage({ type: '', text: '' });

        try {
            // Hum dono bhej rahe hain: category ID (ya 'other') aur custom string
            await api.post('/hr/request-course', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // ✅ Sahi jagah par Success message
            setMessage({ type: 'success', text: 'Course request sent successfully! Our team will contact you shortly.' });
            
            // Reset form ONLY on success
            setFormData({ topic: '', category: '', customCategory: '', targetAudience: '', expectedEmployees: '', requirements: '' });
            setShowCustomInput(false);

        } catch (error) {
            console.error("Course request error:", error);
            // ✅ BUG FIXED: Ab catch block mein properly 'danger' (error) message aayega!
            setMessage({ 
                type: 'danger', 
                text: error.response?.data?.message || error.response?.data?.error || 'Failed to send request. Please try again later.' 
            });
            // Yahan se reset form wali lines hata di hain, taaki user ka type kiya hua data bacha rahe
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4" style={{ maxWidth: '800px' }}>
            <h2 className="fw-bold mb-4">Request Custom Training</h2>
            
            <div className="alert alert-info border-0 shadow-sm mb-4" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                <strong>Need a specific course for your team?</strong> Fill out the form below, and our expert instructors will design a custom curriculum tailored to your company's exact needs.
            </div>

            {message.text && (
                <div className={`alert alert-${message.type} mb-4`}>
                    {message.text}
                </div>
            )}

            <div className="card shadow-sm border-0 p-4">
                <form onSubmit={handleSubmit}>
                    
                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Course Topic / Title</label>
                            <input type="text" className="form-control" name="topic" value={formData.topic} onChange={handleChange} required placeholder="e.g., Advanced Cybersecurity" />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Category</label>
                            <select className="form-select" name="category" value={formData.category} onChange={handleChange} required>
                                <option value="">-- Select Category --</option>
                                {categories.map((cat) => (
                                    <option key={cat._id} value={cat._id}>
                                        {cat.name}
                                    </option>
                                ))}
                                {/* ✅ NEW: The Magic Option */}
                                <option value="other" className="fw-bold text-primary">➕ Other (Specify New Category)</option>
                            </select>

                            {/* ✅ NEW: Ye input box tabhi dikhega jab "Other" select hoga */}
                            {showCustomInput && (
                                <div className="mt-2">
                                    <input 
                                        type="text" 
                                        className="form-control border-primary" 
                                        name="customCategory" 
                                        value={formData.customCategory} 
                                        onChange={handleChange} 
                                        required 
                                        placeholder="Type your new category here..." 
                                        style={{ backgroundColor: '#f0f9ff' }}
                                    />
                                    <small className="text-muted">We will add this category to our system for you.</small>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Target Audience</label>
                            <input type="text" className="form-control" name="targetAudience" value={formData.targetAudience} onChange={handleChange} required placeholder="e.g., Sales Team, IT Dept" />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Expected Trainees</label>
                            <input type="number" className="form-control" name="expectedEmployees" value={formData.expectedEmployees} onChange={handleChange} required min="1" placeholder="e.g., 50" />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-semibold">Specific Requirements / Goals</label>
                        <textarea className="form-control" name="requirements" rows="4" value={formData.requirements} onChange={handleChange} required placeholder="What specific skills should the employees learn by the end of this course?"></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary px-4 py-2 fw-bold" disabled={loading} style={{ backgroundColor: '#2563eb', border: 'none' }}>
                        {loading ? 'Submitting Request...' : 'Submit Request'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RequestCourse;