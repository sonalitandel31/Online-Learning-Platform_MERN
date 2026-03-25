import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Users, Activity, Award, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/api"; // Aapka API instance

const AdminEngagementChart = () => {
  const [loading, setLoading] = useState(true);
  const [engagementData, setEngagementData] = useState([]);
  
  // Real-time totals calculate karne ke liye
  const [totals, setTotals] = useState({ activeUsers: 0, aiInsights: 0, badges: 0 });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get("/analytics/ai-metrics", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      if (res.data && res.data.success) {
        const data = res.data.data;
        setEngagementData(data);
        
        // Calculate totals for the top cards
        const totalUsers = data.reduce((sum, day) => sum + day.activeUsers, 0);
        const totalAi = data.reduce((sum, day) => sum + day.aiInsightsGenerated, 0);
        const totalBadges = data.reduce((sum, day) => sum + day.badgesAwarded, 0);
        
        setTotals({ activeUsers: totalUsers, aiInsights: totalAi, badges: totalBadges });
      }
    } catch (error) {
      console.error("Failed to fetch AI metrics", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light mt-4">
        <div className="spinner-border text-primary mb-3" role="status"></div>
        <p className="text-muted fw-bold">Loading Analytics Engine...</p>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm rounded-4 mb-4 mt-4" style={{ backgroundColor: "#ffffff" }}>
      <div className="card-header bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="fw-bolder text-dark mb-1">Platform Engagement & AI Metrics</h5>
          <p className="text-muted small">Tracking student activity, AI recommendations, and gamification trends (Last 7 Days).</p>
        </div>
        <div className="badge bg-light text-primary border px-3 py-2 rounded-pill">
          <TrendingUp size={16} className="me-1" /> Live Data
        </div>
      </div>

      <div className="card-body px-4">
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="p-3 rounded-4" style={{ backgroundColor: "#f8f9fa", borderLeft: "4px solid #6366f1" }}>
              <div className="d-flex align-items-center mb-2 text-muted">
                <Users size={18} className="me-2" /> <span className="fw-bold small">WEEKLY ACTIVE STUDENTS</span>
              </div>
              <h3 className="fw-bolder mb-0 text-dark">{totals.activeUsers}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-3 rounded-4" style={{ backgroundColor: "#f8f9fa", borderLeft: "4px solid #ec4899" }}>
              <div className="d-flex align-items-center mb-2 text-muted">
                <Activity size={18} className="me-2" /> <span className="fw-bold small">AI INSIGHTS GENERATED</span>
              </div>
              <h3 className="fw-bolder mb-0 text-dark">{totals.aiInsights}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-3 rounded-4" style={{ backgroundColor: "#f8f9fa", borderLeft: "4px solid #f59e0b" }}>
              <div className="d-flex align-items-center mb-2 text-muted">
                <Award size={18} className="me-2" /> <span className="fw-bold small">BADGES AWARDED</span>
              </div>
              <h3 className="fw-bolder mb-0 text-dark">{totals.badges}</h3>
            </div>
          </div>
        </div>

        <div style={{ height: "300px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={engagementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="activeUsers" name="Active Students" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              <Area type="monotone" dataKey="aiInsightsGenerated" name="AI Insights" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorAI)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminEngagementChart;