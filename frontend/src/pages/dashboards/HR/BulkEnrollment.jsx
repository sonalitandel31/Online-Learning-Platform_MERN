import React, { useState } from 'react';
import api from '../../../api/api';

const BulkEnrollment = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [generalError, setGeneralError] = useState("");

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setUploadResult(null); // Reset previous results
        setGeneralError("");
    };

    const handleUpload = async () => {
        if (!file) {
            setGeneralError("Please select a CSV file first.");
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', file);

        setLoading(true);
        try {
            const response = await api.post('/hr/bulk-enroll', formData, {
                headers: { 'Content-Type': 'multipart/form-data' } // Important for files
            });
            
            setUploadResult(response.data.summary);
            setFile(null); // clear input
        } catch (error) {
            setGeneralError("An error occurred while uploading. Please check the file format.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4" style={{ maxWidth: '800px' }}>
            <h2 className="fw-bold mb-4">Bulk Employee Enrollment</h2>
            
            {/* File Upload Area */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-5 text-center border border-2 border-dashed rounded">
                    <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange} 
                        className="form-control w-50 mx-auto mb-3"
                    />
                    <button 
                        onClick={handleUpload} 
                        disabled={loading || !file}
                        className="btn btn-primary px-4 py-2 fw-bold"
                    >
                        {loading ? "Uploading..." : "Upload CSV"}
                    </button>
                    <div className="mt-3 text-muted small">
                        Please upload a CSV file with headers: <strong>name, email, employeeId, password</strong>
                    </div>
                </div>
            </div>

            {/* General Error Panel (Inline) */}
            {generalError && (
                <div className="alert alert-danger mb-4">
                    {generalError}
                </div>
            )}

            {/* Detailed Success & Error Report Panel */}
            {uploadResult && (
                <div className="card shadow-sm border-0 p-4">
                    <h4 className="fw-bold mb-3">Upload Summary</h4>
                    
                    <div className="row g-3 mb-4">
                        <div className="col-sm-6">
                            <div className="p-3 bg-success bg-opacity-10 text-success rounded fw-bold border border-success border-opacity-25">
                                Successfully enrolled: {uploadResult.successCount}
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="p-3 bg-danger bg-opacity-10 text-danger rounded fw-bold border border-danger border-opacity-25">
                                Failed rows: {uploadResult.errorCount}
                            </div>
                        </div>
                    </div>

                    {/* Inline Error Table - Clean UX for bulk issues */}
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover mt-3">
                                <thead className="table-light">
                                    <tr>
                                        <th className="py-2">Row #</th>
                                        <th className="py-2">Issue</th>
                                        <th className="py-2">Email Provided</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uploadResult.errors.map((err, idx) => (
                                        <tr key={idx}>
                                            <td className="py-2 fw-bold">{err.row}</td>
                                            <td className="py-2 text-danger">{err.issue}</td>
                                            <td className="py-2 text-muted">{err.email || "N/A"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BulkEnrollment;