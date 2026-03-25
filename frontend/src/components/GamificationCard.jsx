import { useEffect, useState } from "react";
import api from "../api/api";
import "bootstrap/dist/css/bootstrap.min.css";
import { Flame, Trophy, Award, Star } from "lucide-react";

const GamificationCard = () => {
    const [stats, setStats] = useState({
        xpTotal: 0,
        streakCount: 0,
        badges: [],
    });
    const [loading, setLoading] = useState(true);

    const BRAND_COLOR = "#8540ee";

    useEffect(() => {
        fetchGamificationStats();
    }, []);

    const fetchGamificationStats = async () => {
        try {
            // Sahi API Endpoint jo aapke system mein already working hai
            const res = await api.get("/profile", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });

            // Data 'profile' object ke andar aata hai
            if (res.data && res.data.profile) {
                setStats({
                    xpTotal: res.data.profile.xpTotal || 0,
                    streakCount: res.data.profile.streakCount || 0,
                    badges: res.data.profile.badges || [],
                });
            }
        } catch (error) {
            console.error("Failed to fetch gamification stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null; // Silent load, no annoying spinners

    return (
        <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ backgroundColor: "#fcfaff", border: `1px solid ${BRAND_COLOR}20` }}>
            <div className="card-body p-4">
                <h5 className="fw-bold mb-4 text-dark d-flex align-items-center gap-2">
                    <Trophy size={22} color={BRAND_COLOR} /> Your Learning Journey
                </h5>

                <div className="row g-3">
                    {/* XP Tracker */}
                    <div className="col-md-6">
                        <div className="d-flex align-items-center p-3 rounded-3 bg-white shadow-sm h-100">
                            <div className="p-3 rounded-circle me-3" style={{ backgroundColor: "#fff8e1", color: "#f5b041" }}>
                                <Star size={28} fill="#f5b041" />
                            </div>
                            <div>
                                <p className="text-muted small mb-0 fw-bold">TOTAL XP</p>
                                <h3 className="fw-bolder mb-0 text-dark">{stats.xpTotal} <span style={{ fontSize: "14px", color: "gray" }}>XP</span></h3>
                            </div>
                        </div>
                    </div>

                    {/* Daily Streak */}
                    <div className="col-md-6">
                        <div className="d-flex align-items-center p-3 rounded-3 bg-white shadow-sm h-100">
                            <div className="p-3 rounded-circle me-3" style={{ backgroundColor: "#ffebee", color: "#e74c3c" }}>
                                <Flame size={28} fill="#e74c3c" />
                            </div>
                            <div>
                                <p className="text-muted small mb-0 fw-bold">DAY STREAK</p>
                                <h3 className="fw-bolder mb-0 text-dark">{stats.streakCount} <span style={{ fontSize: "14px", color: "gray" }}>Days</span></h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges Section */}
                <div className="mt-4 pt-3 border-top">
                    <p className="text-muted small fw-bold mb-3">EARNED BADGES ({stats.badges.length})</p>
                    {stats.badges.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2">
                            {stats.badges.map((badge, index) => (
                                <div key={index} className="badge bg-white text-dark border p-2 d-flex align-items-center gap-2 shadow-sm rounded-pill px-3">
                                    <span style={{ fontSize: "1.2rem" }}>{badge.icon || "🏅"}</span>
                                    <span className="fw-bold">{badge.title}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-muted small bg-white p-3 rounded-3 border-dashed text-center">
                            <Award size={20} className="mb-2 text-secondary opacity-50" />
                            <p className="mb-0">Complete lessons and pass exams to earn your first badge!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GamificationCard;