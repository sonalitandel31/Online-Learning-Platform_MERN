import { useEffect, useState } from "react";
import api from "../../../api/api";
import { Search, ShieldCheck, AlertTriangle, XCircle, Clock } from "lucide-react";

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const { data } = await api.get("/subscriptions/admin/subscribers");
      if (data.success) {
        setSubscribers(data.subscriptions);
      }
    } catch (err) {
      console.error("Failed to fetch subscribers", err);
    } finally {
      setLoading(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill"><ShieldCheck size={14} className="me-1"/> Active</span>;
      case "trial":
        return <span className="badge bg-info-subtle text-info px-3 py-2 rounded-pill"><Clock size={14} className="me-1"/> Trial</span>;
      case "past_due":
        return <span className="badge bg-warning-subtle text-warning px-3 py-2 rounded-pill"><AlertTriangle size={14} className="me-1"/> Past Due</span>;
      case "cancelled":
      case "expired":
        return <span className="badge bg-secondary-subtle text-secondary px-3 py-2 rounded-pill"><XCircle size={14} className="me-1"/> {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
      default:
        return <span className="badge bg-light text-dark px-3 py-2 rounded-pill">{status}</span>;
    }
  };

  // Filter list based on search
  const filteredSubs = subscribers.filter(sub => 
    sub.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sub.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: "#1e1b4b" }}>Subscriber Management</h2>
          <p className="text-muted mb-0">View and monitor all student subscriptions.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm" style={{ borderRadius: "20px" }}>
        <div className="card-header bg-white border-bottom-0 p-4">
          <div className="input-group" style={{ maxWidth: "400px" }}>
            <span className="input-group-text bg-light border-0"><Search size={18} className="text-muted" /></span>
            <input 
              type="text" 
              className="form-control bg-light border-0" 
              placeholder="Search by student name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="bg-light text-muted small text-uppercase" style={{ letterSpacing: "0.5px" }}>
              <tr>
                <th className="ps-4 py-3 border-0 rounded-start">Student</th>
                <th className="border-0">Plan Details</th>
                <th className="border-0">Start Date</th>
                <th className="border-0">Expiry Date</th>
                <th className="border-0 rounded-end">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-5"><div className="spinner-border text-primary" /></td></tr>
              ) : filteredSubs.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-5 text-muted">No subscribers found.</td></tr>
              ) : (
                filteredSubs.map((sub) => (
                  <tr key={sub._id} className="border-bottom">
                    <td className="ps-4 py-3">
                      <div className="fw-bold text-dark">{sub.userId?.name || "Unknown"}</div>
                      <div className="small text-muted">{sub.userId?.email}</div>
                    </td>
                    <td>
                      <div className="fw-bold" style={{ color: "#6f42c1" }}>{sub.planId?.name || "N/A"}</div>
                      <div className="small text-muted">{sub.planId?.billingCycle}</div>
                    </td>
                    <td>
                      <div className="fw-medium text-dark">{new Date(sub.startDate).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div className="fw-medium text-dark">
                        {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "-"}
                      </div>
                    </td>
                    <td>{getStatusBadge(sub.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}