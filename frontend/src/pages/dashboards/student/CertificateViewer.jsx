import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/api';
import { useTheme } from '../../../context/ThemeContext';
import { FaDownload, FaArrowLeft } from 'react-icons/fa';

const CertificateViewer = () => {
    const { enrollmentId } = useParams();
    const navigate = useNavigate();
    const { primaryColor } = useTheme();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const themeCol = primaryColor || '#6f42c1';
    const BASE_URL = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");

    useEffect(() => {
        const fetchCertificateData = async () => {
            try {
                const res = await api.get(`/enrollments/${enrollmentId}`);
                setData(res.data.enrollment);
            } catch (err) {
                console.error("Certificate fetch error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCertificateData();
    }, [enrollmentId]);

    const handleDownload = async () => {
        if (!data?.certificate) return;
        try {
            const fileUrl = `${BASE_URL}${data.certificate}`;
            const response = await fetch(fileUrl, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const safeCourseName = data.course?.title
                ? data.course.title.replace(/\s+/g, '_') 
                : "Course";

            const link = document.createElement("a");
            link.href = downloadUrl;
            // File ka naam course ke title par set kiya
            link.download = `${safeCourseName}_Certificate.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error("Download Error", err);
            alert("Download failed. Please try again.");
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
            <div className="spinner-border" style={{ color: themeCol }} />
        </div>
    );

    if (!data || data.status !== 'completed' || !data.certificate) {
        return (
            <div className="container text-center py-5 mt-5">
                <h3 className="text-danger mt-5">Certificate Not Available</h3>
                <p>Please complete the course to generate your certificate.</p>
                <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    const pdfUrl = `${BASE_URL}${data.certificate}`;

    return (
        <div className="container-fluid py-4" style={{ minHeight: '100vh' }}>
            <div className="container mb-4 d-flex justify-content-between align-items-center">
                <button className="btn btn-light rounded-pill px-4 shadow-sm fw-bold border" onClick={() => navigate(-1)}>
                    <FaArrowLeft className="me-2" /> Back to Learning
                </button>

                <div>
                    <h4 className="fw-bolder m-0 d-none d-md-block text-dark">Certificate of Completion</h4>
                </div>

                <button
                    className="btn rounded-pill px-4 text-white shadow-sm fw-bold"
                    style={{ backgroundColor: themeCol }}
                    onClick={handleDownload}
                >
                    <FaDownload className="me-2" /> Download PDF
                </button>
            </div>

            {/* PDF Viewer Container */}
            <div className="container d-flex justify-content-center">
                <div className="shadow-lg bg-white rounded-3 overflow-hidden" style={{ width: '100%', maxWidth: '1100px', height: '80vh', border: '1px solid #e0e0e0' }}>
                    {/* Using standard object tag to render PDF directly in browser */}
                    <object
                        data={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        type="application/pdf"
                        width="100%"
                        height="100%"
                        style={{ display: 'block' }}
                    >
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 p-5 text-center">
                            <p className="mb-3 fw-bold text-muted">Your browser does not support embedded PDFs.</p>
                            <button
                                className="btn rounded-pill px-4 text-white fw-bold"
                                style={{ backgroundColor: themeCol }}
                                onClick={handleDownload}
                            >
                                <FaDownload className="me-2" /> Download PDF Directly
                            </button>
                        </div>
                    </object>
                </div>
            </div>
        </div>
    );
};

export default CertificateViewer;