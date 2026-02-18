import { useEffect, useState, useRef } from "react";
import api from "../../../../api/api";
import html2canvas from "html2canvas";
import { FaDownload, FaChartArea, FaInfoCircle, FaCalendarAlt, FaFireAlt, FaUsers } from "react-icons/fa";
import { motion } from "framer-motion";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function AdminHeatmap() {
    const [grid, setGrid] = useState({});
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, peak: 0 });
    const heatmapRef = useRef(null);
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                const res = await api.get("/analytics/admin/heatmap?days=30", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const rows = res.data?.rows || [];
                const map = {};
                let total = 0;
                let peak = 0;

                rows.forEach((r) => {
                    const key = `${r.day}-${r.hour}`;
                    map[key] = r.count;
                    total += r.count;
                    if (r.count > peak) peak = r.count;
                });

                setGrid(map);
                setStats({ total, peak });
            } catch (e) {
                console.error("Heatmap load error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchHeatmap();
    }, [token]);

    const getColor = (value) => {
        if (!value || value === 0) return "#f1f5f9"; 
        if (value < 10) return "#ddd6fe"; 
        if (value < 30) return "#a78bfa"; 
        if (value < 60) return "#7c3aed"; 
        return "#4c1d95"; 
    };

    const downloadHeatmap = async () => {
        if (!heatmapRef.current) return;
        const canvas = await html2canvas(heatmapRef.current, {
            scale: 2,
            backgroundColor: "#ffffff",
            borderRadius: 12
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `engagement-report-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
    };

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div className="mx-auto" style={{ maxWidth: '1200px' }}>
                
                {/* Dashboard Header */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div className="d-flex align-items-center gap-2">
                        {/* <FaChartArea className="text" size={24} /> */}
                        <div>
                            <h2 className="fw-bold text-dark m-0" style={{ fontSize: '1.5rem', lineHeight: '1' }}>
                                Engagement Heatmap
                            </h2>
                            <p className="text-muted mb-0 mt-1 small">Hourly interaction density patterns over the 30-day cycle.</p>
                        </div>
                    </div>
                    <button 
                        onClick={downloadHeatmap}
                        className="btn btn-primary rounded-pill px-4 d-inline-flex align-items-center gap-2 shadow-sm border-0"
                        style={{ backgroundColor: '#6366f1', height: '40px' }}
                    >
                        <FaDownload size={14} /> Export Report
                    </button>
                </div>

                {/* Quick Stats Summary */}
                <div className="row g-3 mb-4">
                    <SummaryCard 
                        label="Total Interactions" 
                        value={stats.total.toLocaleString()} 
                        color="#6366f1" 
                        icon={<FaUsers size={20} className="text-primary" />} 
                    />
                    <SummaryCard 
                        label="Peak Activity" 
                        value={`${stats.peak} hits`} 
                        color="#8b5cf6" 
                        icon={<FaFireAlt size={20} style={{color: '#8b5cf6'}} />} 
                    />
                    <SummaryCard 
                        label="Analysis Window" 
                        value="Last 30 Days" 
                        color="#64748b" 
                        icon={<FaCalendarAlt size={18} className="text-secondary" />} 
                    />
                </div>

                {/* Heatmap Card */}
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-header bg-white border-bottom p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div>
                            <h6 className="fw-bold m-0 text-dark">Activity Density Grid</h6>
                            <small className="text-muted">Interactive view of user engagement timestamps</small>
                        </div>
                        <div className="d-flex align-items-center gap-2 bg-light p-2 rounded-3">
                            <span className="tiny-text fw-bold text-muted px-1">LOW</span>
                            {[5, 15, 45, 75].map((v) => (
                                <div key={v} style={{ width: 14, height: 14, backgroundColor: getColor(v), borderRadius: '3px' }} />
                            ))}
                            <span className="tiny-text fw-bold text-muted px-1">HIGH</span>
                        </div>
                    </div>

                    <div className="card-body p-4 overflow-auto">
                        <div ref={heatmapRef} style={{ minWidth: "900px", padding: "10px" }}>
                            {/* X-Axis: Time Labels */}
                            <div className="d-flex mb-3">
                                <div style={{ width: "60px" }}></div>
                                <div className="d-flex flex-grow-1 border-bottom pb-2">
                                    {HOURS.map((h) => (
                                        <div key={h} className="flex-grow-1 text-center text-muted fw-bold" style={{ fontSize: "11px" }}>
                                            {h % 3 === 0 ? `${h}h` : '•'}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Heatmap Rows */}
                            {DAYS.map((dayLabel, i) => (
                                <div key={dayLabel} className="d-flex align-items-center mb-2">
                                    <div className="text-muted fw-bold pe-3 text-end" style={{ width: "60px", fontSize: '12px' }}>
                                        {dayLabel}
                                    </div>
                                    <div className="d-flex flex-grow-1 gap-2">
                                        {HOURS.map((h) => {
                                            const value = grid[`${i + 1}-${h}`] || 0;
                                            return (
                                                <motion.div
                                                    key={h}
                                                    whileHover={{ scale: 1.3, zIndex: 10 }}
                                                    title={`${dayLabel}, ${h}:00: ${value} hits`}
                                                    style={{
                                                        flex: 1,
                                                        aspectRatio: "1/1",
                                                        backgroundColor: getColor(value),
                                                        borderRadius: "4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "10px",
                                                        fontWeight: "700",
                                                        color: value > 30 ? "#fff" : "#1e293b",
                                                        cursor: 'crosshair',
                                                        boxShadow: value > 0 ? 'inset 0 0 0 1px rgba(0,0,0,0.05)' : 'none'
                                                    }}
                                                >
                                                    {value > 20 ? value : ""}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-light p-3 d-flex align-items-center justify-content-center gap-2 border-top">
                        <FaInfoCircle className="text-muted" size={14} />
                        <span className="text-muted small fw-medium">All activity data is aggregated and displayed in UTC.</span>
                    </div>
                </div>
            </div>

            <style>{`
                .tiny-text { font-size: 10px; }
                ::-webkit-scrollbar { height: 8px; }
                ::-webkit-scrollbar-track { background: #f1f5f9; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}

function SummaryCard({ label, value, color, icon }) {
    return (
        <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 p-3 h-100" style={{ borderLeft: `4px solid ${color}` }}>
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <div className="text-muted tiny-text fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>{label}</div>
                        <h4 className="fw-bold m-0 mt-1" style={{ color: '#1e293b' }}>{value}</h4>
                    </div>
                    <div className="p-2 rounded-3 bg-light d-flex align-items-center justify-content-center" style={{ width: '46px', height: '46px' }}>
                        {icon}
                    </div>
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center bg-white">
            <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
            <p className="mt-3 text-muted fw-bold">Synthesizing Heatmap Data...</p>
        </div>
    );
}