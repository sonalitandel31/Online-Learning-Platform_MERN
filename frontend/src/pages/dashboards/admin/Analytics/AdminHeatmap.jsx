import { useEffect, useState, useRef } from "react";
import api from "../../../../api/api";
import html2canvas from "html2canvas";
import { FaDownload, FaInfoCircle, FaCalendarAlt, FaFireAlt, FaUsers } from "react-icons/fa";
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

// ✅ NEW Skeleton Loading Component
function LoadingSkeleton() {
    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <style>{`
                .skeleton {
                    background: #f1f5f9;
                    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite linear;
                    border-radius: 4px;
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .skel-title { width: 250px; height: 28px; margin-bottom: 8px; border-radius: 6px; }
                .skel-subtitle { width: 350px; height: 16px; border-radius: 4px; }
                .skel-btn { width: 140px; height: 40px; border-radius: 50rem; }
                
                .skel-stat-card { height: 85px; border-radius: 16px; border: 1px solid #f1f5f9; padding: 16px; display: flex; justify-content: space-between; align-items: center; background: white;}
                .skel-stat-label { width: 100px; height: 12px; margin-bottom: 8px; }
                .skel-stat-value { width: 80px; height: 24px; }
                .skel-stat-icon { width: 46px; height: 46px; border-radius: 8px; }

                .skel-heat-card { background: white; border-radius: 16px; height: 500px; border: 1px solid #f1f5f9; margin-top: 24px;}
                .skel-heat-header { height: 80px; border-bottom: 1px solid #f1f5f9; padding: 24px; }
                .skel-heat-body { padding: 24px; }
                
                .skel-heat-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
                .skel-heat-label { width: 40px; height: 12px; }
                .skel-heat-cell { flex: 1; aspect-ratio: 1/1; border-radius: 4px; }
            `}</style>

            <div className="mx-auto" style={{ maxWidth: '1200px' }}>
                
                {/* Header Skeleton */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div>
                        <div className="skeleton skel-title"></div>
                        <div className="skeleton skel-subtitle"></div>
                    </div>
                    <div className="skeleton skel-btn"></div>
                </div>

                {/* Stats Skeleton */}
                <div className="row g-3 mb-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="col-md-4">
                            <div className="skel-stat-card shadow-sm">
                                <div>
                                    <div className="skeleton skel-stat-label"></div>
                                    <div className="skeleton skel-stat-value"></div>
                                </div>
                                <div className="skeleton skel-stat-icon"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Heatmap Skeleton */}
                <div className="skel-heat-card shadow-sm">
                    <div className="skel-heat-header d-flex justify-content-between">
                        <div>
                            <div className="skeleton" style={{ width: '150px', height: '20px', marginBottom: '8px' }}></div>
                            <div className="skeleton" style={{ width: '250px', height: '14px' }}></div>
                        </div>
                        <div className="skeleton" style={{ width: '150px', height: '30px', borderRadius: '8px' }}></div>
                    </div>
                    <div className="skel-heat-body">
                        {/* X-axis placeholder */}
                        <div className="skel-heat-row" style={{ paddingLeft: '50px', marginBottom: '16px' }}>
                             <div className="skeleton" style={{ width: '100%', height: '10px' }}></div>
                        </div>
                        {/* 7 Days of skeleton blocks */}
                        {Array.from({ length: 7 }).map((_, r) => (
                            <div key={r} className="skel-heat-row">
                                <div className="skeleton skel-heat-label"></div>
                                {Array.from({ length: 24 }).map((_, c) => (
                                    <div key={c} className="skeleton skel-heat-cell" style={{ opacity: Math.random() * 0.5 + 0.1 }}></div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}