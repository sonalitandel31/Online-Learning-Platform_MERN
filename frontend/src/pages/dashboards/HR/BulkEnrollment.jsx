import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import Swal from 'sweetalert2'; 
import { FaCloudUploadAlt, FaDownload, FaExclamationTriangle, FaCheckCircle, FaFileCsv } from 'react-icons/fa';

const BulkEnrollment = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true); 
    const [uploadResult, setUploadResult] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [brandColor, setBrandColor] = useState('#0d6efd'); 

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });

    const hexToRgba = (hex, opacity) => {
        if (!hex) return 'rgba(13, 110, 253, 0.1)';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    useEffect(() => {
        const fetchSettings = async () => {
            setPageLoading(true);
            try {
                const res = await api.get('/companies/settings');
                const theme = res.data?.data?.branding?.themeColor || '#0d6efd';
                setBrandColor(theme);
            } catch (err) {
                console.error("Failed to load branding", err);
            } finally {
                setPageLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === "text/csv") {
            setFile(selectedFile);
            setUploadResult(null);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Invalid File',
                text: 'Please upload a valid .csv file',
                confirmButtonColor: brandColor
            });
        }
    };

    const downloadTemplate = () => {
        const csvContent = "name,email,employeeId,password\nJohn Doe,john@example.com,EMP001,pass123\nJane Smith,jane@example.com,EMP002,pass456";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employee_template.csv';
        a.click();
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('csvFile', file);

        setLoading(true);
        
        Swal.fire({
            title: 'Processing CSV...',
            text: 'We are validating data and allocating licenses.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const response = await api.post('/hr/bulk-enroll', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            Swal.close();
            setUploadResult(response.data.summary);
            setFile(null);

            Toast.fire({
                icon: 'success',
                title: `Successfully processed ${response.data.summary.totalProcessed} rows`
            });

        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: error.response?.data?.message || "There was an error processing your CSV file.",
                confirmButtonColor: brandColor
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-3 mb-5 px-3 px-md-4" style={{ maxWidth: '900px' }}>
            
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

            {/* ✅ FIXED LAYOUT: Heading is full width, button aligned properly without stretching */}
            <div className="mb-4">
                <h2 className="fw-bold text-dark mb-1 d-block w-100">Bulk Enrollment</h2>
                <div className="row align-items-center mt-2">
                    <div className="col-12 col-md-7 mb-3 mb-md-0">
                        <p className="text-muted small mb-0">Onboard your entire team in seconds using our pre-formatted CSV.</p>
                    </div>
                    <div className="col-12 col-md-5 text-md-end">
                        {!pageLoading && (
                            <button 
                                onClick={downloadTemplate}
                                className="btn btn-sm rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                                style={{ 
                                    color: brandColor, 
                                    border: `1px solid ${brandColor}`,
                                    backgroundColor: 'transparent' 
                                }}
                            >
                                <FaDownload size={14} /> Download Template
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {pageLoading ? (
                /* 💀 SKELETON LOADER UI 💀 */
                <div className="card border-2 border-dashed rounded-4 mb-4 border-light-subtle">
                    <div className="card-body p-4 p-md-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                        <div className="skeleton-box rounded-circle mb-4" style={{ width: '80px', height: '80px' }}></div>
                        <div className="skeleton-box mb-2" style={{ width: '250px', height: '24px' }}></div>
                        <div className="skeleton-box mb-4" style={{ width: '180px', height: '16px' }}></div>
                        <div className="skeleton-box rounded-pill" style={{ width: '200px', height: '45px' }}></div>
                    </div>
                </div>
            ) : (
                /* ✨ ACTUAL CONTENT ✨ */
                <>
                    {/* Drag & Drop Upload Zone */}
                    <div 
                        className="card border-2 border-dashed rounded-4 mb-4"
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const droppedFile = e.dataTransfer.files[0];
                            if (droppedFile?.type === "text/csv") setFile(droppedFile);
                        }}
                        style={{ 
                            transition: '0.3s all ease-in-out',
                            borderColor: isDragging ? brandColor : '#dee2e6',
                            backgroundColor: isDragging ? hexToRgba(brandColor, 0.05) : '#ffffff'
                        }}
                    >
                        <div className="card-body p-4 p-md-5 text-center">
                            <div className="mb-4">
                                <FaCloudUploadAlt 
                                    size={70} 
                                    style={{ color: file ? '#198754' : brandColor, opacity: file ? 1 : 0.6, transition: '0.3s' }} 
                                />
                            </div>
                            {file ? (
                                <div className="animate__animated animate__fadeIn">
                                    <div className="d-inline-flex align-items-center justify-content-center p-3 bg-success bg-opacity-10 rounded-circle mb-3">
                                        <FaFileCsv size={30} className="text-success" />
                                    </div>
                                    <h5 className="fw-bold text-dark mb-1 text-truncate px-3">{file.name}</h5>
                                    <p className="text-success fw-bold small">File ready for processing</p>
                                    <button className="btn btn-link text-danger text-decoration-none p-0 small mt-2" onClick={() => setFile(null)}>Remove file</button>
                                </div>
                            ) : (
                                <div>
                                    <h5 className="fw-bold text-dark mb-2">Drag & drop your CSV file here</h5>
                                    <p className="text-muted small mb-4">or click to browse from your computer</p>
                                    <input 
                                        type="file" accept=".csv" 
                                        onChange={handleFileChange} 
                                        className="position-absolute opacity-0 start-0 top-0 w-100 h-100" 
                                        style={{ cursor: 'pointer', zIndex: 10 }}
                                    />
                                </div>
                            )}

                            <div className="mt-4 pt-2 position-relative" style={{ zIndex: 11 }}>
                                <button 
                                    onClick={handleUpload} 
                                    disabled={loading || !file}
                                    className="btn text-white px-5 py-3 fw-bold rounded-pill shadow-sm border-0 w-100 w-md-auto"
                                    style={{ 
                                        backgroundColor: (loading || !file) ? '#6c757d' : brandColor,
                                        transition: '0.3s background-color'
                                    }}
                                >
                                    {loading ? "Allocating Licenses..." : "Start Enrollment Process"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Section */}
                    {uploadResult && (
                        <div className="animate__animated animate__fadeInUp">
                            <div className="row g-3 mb-4">
                                <div className="col-6">
                                    <div className="card border-0 shadow-sm rounded-4 h-100">
                                        <div className="card-body p-3 p-md-4 d-flex flex-column flex-md-row align-items-center align-items-md-start gap-3 text-center text-md-start">
                                            <div className="bg-success bg-opacity-10 p-3 rounded-circle text-success flex-shrink-0">
                                                <FaCheckCircle size={24}/>
                                            </div>
                                            <div>
                                                <h3 className="fw-black mb-0 text-success">{uploadResult.successCount}</h3>
                                                <p className="text-muted small fw-bold mb-0 text-uppercase" style={{ letterSpacing: '0.5px' }}>Successfully Enrolled</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="card border-0 shadow-sm rounded-4 h-100">
                                        <div className="card-body p-3 p-md-4 d-flex flex-column flex-md-row align-items-center align-items-md-start gap-3 text-center text-md-start">
                                            <div className="bg-danger bg-opacity-10 p-3 rounded-circle text-danger flex-shrink-0">
                                                <FaExclamationTriangle size={24}/>
                                            </div>
                                            <div>
                                                <h3 className="fw-black mb-0 text-danger">{uploadResult.errorCount}</h3>
                                                <p className="text-muted small fw-bold mb-0 text-uppercase" style={{ letterSpacing: '0.5px' }}>Failed Entries</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Error Table */}
                            {uploadResult.errors && uploadResult.errors.length > 0 && (
                                <div className="card border-0 shadow-sm rounded-4 overflow-hidden mt-2">
                                    <div className="card-header bg-danger bg-opacity-10 border-0 py-3">
                                        <h6 className="fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                                            <FaExclamationTriangle /> Error Report
                                        </h6>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0 small">
                                            <thead className="bg-light text-muted">
                                                <tr>
                                                    <th className="px-3 px-md-4 py-3">Row</th>
                                                    <th className="py-3">Validation Issue</th>
                                                    <th className="py-3 px-3 px-md-4 text-end">Identifier</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {uploadResult.errors.map((err, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 px-md-4 py-3 fw-bold text-dark">#{err.row}</td>
                                                        <td className="py-3 text-danger fw-medium">{err.issue}</td>
                                                        <td className="py-3 px-3 px-md-4 text-muted text-end text-truncate" style={{ maxWidth: '150px' }}>{err.email || "N/A"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BulkEnrollment;