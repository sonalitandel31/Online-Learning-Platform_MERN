import React, { useEffect, useState } from "react";
import { 
  CheckCircle, MessageSquare, Search, 
  Filter, Layout, Clock, AlertCircle, ChevronRight 
} from "lucide-react";
import api from "../../../api/api";

const ForumDiscussions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAllDiscussions = async () => {
    try {
      const res = await api.get("/forum/admin/questions");
      setQuestions(res.data);
    } catch (err) {
      console.error("Admin discussion fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllDiscussions(); }, []);

  // Stats calculation
  const totalQuestions = questions.length;
  const solvedQuestions = questions.filter(q => q.isSolved).length;
  const openQuestions = totalQuestions - solvedQuestions;

  // Filtered Questions for Search
  const filteredQuestions = questions.filter(q => 
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center p-5">
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  return (
    <div className="container-fluid py-3">
      <style>{`
        :root {
          --admin-purple: #6f42c1;
          --admin-yellow: #ffc107;
          --admin-bg: #fdfbff;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #f0f0f0;
          box-shadow: 0 4px 12px rgba(111, 66, 193, 0.03);
        }
        .search-box {
          background: #f1f3f5;
          border: 1px solid transparent;
          border-radius: 12px;
          padding: 10px 15px;
          transition: 0.3s;
        }
        .search-box:focus-within {
          background: white;
          border-color: var(--admin-purple);
          box-shadow: 0 0 0 3px rgba(111, 66, 193, 0.1);
        }
        .table-container {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #eee;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
        }
        .custom-table thead {
          background: #f8f9fa;
        }
        .custom-table th {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.5px;
          color: #6c757d;
          padding: 18px;
          border: none;
        }
        .custom-table td {
          padding: 18px;
          vertical-align: middle;
          border-top: 1px solid #f8f9fa;
          font-size: 0.9rem;
        }
        .badge-open { background: #fff9db; color: #856404; border: 1px solid #ffeeba; }
        .badge-solved { background: #e7fbf3; color: #0d8a5f; border: 1px solid #d3f9e8; }
        .course-link { color: var(--admin-purple); font-weight: 600; text-decoration: none; }
      `}</style>

      {/* Header & Stats */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-800 text-dark mb-1">Global Forum Monitor</h4>
          <p className="text-muted small">Overview of all student-instructor interactions</p>
        </div>
        
        <div className="d-flex gap-3">
          <div className="stat-card d-flex align-items-center gap-3">
            <div className="bg-light-purple p-2 rounded-3 text-primary"><MessageSquare size={20}/></div>
            <div><div className="small text-muted">Total</div><div className="fw-bold">{totalQuestions}</div></div>
          </div>
          <div className="stat-card d-flex align-items-center gap-3">
            <div className="p-2 rounded-3 text-warning" style={{background: '#fff9db'}}><Clock size={20}/></div>
            <div><div className="small text-muted">Open</div><div className="fw-bold">{openQuestions}</div></div>
          </div>
          <div className="stat-card d-flex align-items-center gap-3">
            <div className="p-2 rounded-3 text-success" style={{background: '#e7fbf3'}}><CheckCircle size={20}/></div>
            <div><div className="small text-muted">Solved</div><div className="fw-bold">{solvedQuestions}</div></div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="row mb-4">
        <div className="col-md-6 col-lg-4">
          <div className="search-box d-flex align-items-center gap-2">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              className="border-0 bg-transparent w-100 shadow-none outline-none" 
              placeholder="Search by course or question..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-container">
        {filteredQuestions.length === 0 ? (
          <div className="p-5 text-center">
            <AlertCircle size={40} className="text-muted mb-2" />
            <p className="text-muted">No discussions found matching your search.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table custom-table m-0">
              <thead>
                <tr>
                  <th>Course Info</th>
                  <th>Discussion Thread</th>
                  <th>Participant</th>
                  <th>Status</th>
                  <th className="text-center">Replies</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q) => (
                  <tr key={q._id}>
                    <td>
                      <div className="course-link">{q.courseTitle}</div>
                      <div className="text-muted" style={{fontSize: '0.7rem'}}>ID: {q._id.slice(-6)}</div>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div className="fw-bold text-dark text-truncate">{q.title}</div>
                      <div className="text-muted small text-truncate">Latest activity monitored</div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="bg-light rounded-circle p-1"><Layout size={14}/></div>
                        <span className="fw-500">{q.userId?.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td>
                      {q.isSolved ? (
                        <span className="badge badge-solved rounded-pill px-3">Solved</span>
                      ) : (
                        <span className="badge badge-open rounded-pill px-3">Open</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="fw-bold">{q.answerCount || 0}</div>
                    </td>
                    <td>
                      <button className="btn btn-link text-muted p-0 hover-primary">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumDiscussions;