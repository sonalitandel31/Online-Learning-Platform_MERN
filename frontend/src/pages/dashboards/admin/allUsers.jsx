import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/api";
import { Button, Form, Row, Col, Modal, Spinner, Badge, Card } from "react-bootstrap";
import { FaUserPlus, FaSearch, FaFilter, FaEnvelope, FaCalendarAlt, FaBuilding, FaUser } from "react-icons/fa";

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [roleFilter, setRoleFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });
  const [addingAdmin, setAddingAdmin] = useState(false);

  // New states for the Block/Unblock Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  const BASE_URL = import.meta.env.VITE_BASE_URL || "";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Opens the confirmation modal and sets the target user
  const handleToggleBlockClick = (user) => {
    setUserToToggle(user);
    setShowConfirmModal(true);
  };

  // Executes the API call after confirmation
  const executeToggleBlock = async () => {
    if (!userToToggle) return;
    
    setIsToggling(true);
    const isBlocking = !userToToggle.isBlocked;

    try {
      await api.put(`/admin/users/${userToToggle._id}/toggle-block`, {
        reason: isBlocking ? "Administrative action" : "" 
      });
      
      // Close modal, clear state, and refresh grid
      setShowConfirmModal(false);
      setUserToToggle(null);
      fetchUsers(); 
    } catch (err) {
      console.error("Error updating user status:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const computeActivity = (u) => {
    if (u?.isBlocked) return "Blocked";
    if (!u?.lastActiveAt) return "Never";

    const now = Date.now();
    const last = new Date(u.lastActiveAt).getTime();

    const MIN_5 = 5 * 60 * 1000;
    const DAY_7 = 7 * 24 * 60 * 60 * 1000;
    const DAY_30 = 30 * 24 * 60 * 60 * 1000;

    if (now - last <= MIN_5) return "Online";
    if (now - last <= DAY_7) return "Active";
    if (now - last <= DAY_30) return "Inactive";
    return "Dormant";
  };

  const getUserActivity = (u) => u.activity || computeActivity(u);

  const activityBadge = (activity) => {
    if (activity === "Blocked") return <Badge bg="danger">Blocked</Badge>;
    if (activity === "Online") return <Badge bg="success">Online</Badge>;
    if (activity === "Active") return <Badge bg="primary">Active</Badge>;
    if (activity === "Inactive") return <Badge bg="warning" text="dark">Inactive</Badge>;
    if (activity === "Dormant") return <Badge bg="secondary">Dormant</Badge>;
    return <Badge bg="light" text="dark">Never</Badge>;
  };

  const formatLastActive = (u) => {
    if (!u?.lastActiveAt) return "No activity yet";
    const d = new Date(u.lastActiveAt);
    return d.toLocaleString();
  };

  useEffect(() => {
    let tempUsers = [...users];

    if (roleFilter !== "all") {
      tempUsers = tempUsers.filter((u) => u.role === roleFilter);
    }

    if (activityFilter !== "all") {
      tempUsers = tempUsers.filter((u) => getUserActivity(u).toLowerCase() === activityFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      tempUsers = tempUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(tempUsers);
  }, [roleFilter, activityFilter, searchTerm, users]);

  const handleViewDetails = async (user) => {
    setSelectedUser(user);
    setLoadingDetails(true);
    setShowDetailsModal(true);

    try {
      let res;
      if (user.role === "student") res = await api.get(`/admin/students/${user._id}`);
      else if (user.role === "instructor") res = await api.get(`/admin/instructors/${user._id}`);
      else res = { data: {} };
      setUserDetails(res.data);
    } catch (err) {
      setUserDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAddingAdmin(true);
    try {
      await api.post("/addAdmin", newAdmin);
      setShowAddAdminModal(false);
      setNewAdmin({ name: "", email: "", password: "" });
      fetchUsers();
    } catch (err) {
      console.error("Error adding admin:", err);
    } finally {
      setAddingAdmin(false);
    }
  };

  const colors = {
    primary: "#a24bf4", // Modern Indigo
    secondary: "#4f46e5",
    lightBg: "#f1f5f9",
    textMuted: "#64748b",
    cardShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  };

  // Skeleton Card Component
  const UserSkeleton = () => (
    <div className="user-card skeleton-card">
      <div className="skeleton-avatar mb-3"></div>
      <div className="skeleton-line short mb-2"></div>
      <div className="skeleton-line long mb-3"></div>
      <div className="skeleton-line medium mb-2"></div>
      <div className="skeleton-line medium mb-4"></div>
      <div className="skeleton-button"></div>
    </div>
  );

  return (
    <div className="users-page">
      <style>{`
        .users-page { padding: 20px; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .page-header { color: #1e293b; font-weight: 800; margin-bottom: 25px; letter-spacing: -0.025em; }

        /* Filter Section Styling */
        .filter-section { 
          background: white; 
          padding: 24px; 
          border-radius: 16px; 
          margin-bottom: 30px; 
          box-shadow: ${colors.cardShadow};
          border: 1px solid #e2e8f0;
        }

        .filter-control {
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          padding: 10px 15px;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .filter-control:focus {
          border-color: ${colors.primary};
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        /* User Grid */
        .user-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
          gap: 24px; 
        }

        /* User Card Styling */
        .user-card { 
          background: white; 
          border-radius: 20px; 
          padding: 24px; 
          border: 1px solid #e2e8f0; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          position: relative; 
          display: flex;
          flex-direction: column;
        }
        .user-card:hover { 
          transform: translateY(-5px); 
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          border-color: ${colors.primary};
        }

        .user-avatar { 
          width: 80px; 
          height: 80px; 
          border-radius: 24px; 
          object-fit: cover; 
          margin-bottom: 16px;
          background: #f1f5f9;
        }
        
        .role-badge { 
          position: absolute; 
          top: 24px; 
          right: 24px; 
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .user-name { font-size: 1.15rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .user-email { font-size: 0.9rem; color: ${colors.textMuted}; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

        .corporate-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .meta-info {
          padding-top: 16px;
          margin-top: auto;
          border-top: 1px solid #f1f5f9;
        }

        /* Add Admin Button Card */
        .add-admin-card { 
          border: 2px dashed #cbd5e1; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          min-height: 280px; 
          cursor: pointer; 
          color: ${colors.primary}; 
          background: #f8fafc; 
        }
        .add-admin-card:hover { 
          background: #eff6ff; 
          border-color: ${colors.primary};
          color: ${colors.secondary};
        }

        /* Skeleton Animation */
        @keyframes shimmer {
          0% { background-position: -468px 0; }
          100% { background-position: 468px 0; }
        }
        .skeleton-card { pointer-events: none; }
        .skeleton-avatar, .skeleton-line, .skeleton-button {
          background: #f6f7f8;
          background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
          background-repeat: no-repeat;
          background-size: 800px 104px;
          animation: shimmer 1.5s infinite linear;
        }
        .skeleton-avatar { width: 80px; height: 80px; border-radius: 24px; }
        .skeleton-line { height: 12px; border-radius: 4px; }
        .skeleton-line.short { width: 40%; }
        .skeleton-line.medium { width: 70%; }
        .skeleton-line.long { width: 100%; }
        .skeleton-button { height: 38px; border-radius: 10px; width: 100%; }

        @media (max-width: 768px) {
          .users-page { padding: 15px; }
          .filter-section { padding: 15px; }
          .user-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <h2 className="page-header">User Management</h2>

      {/* Filter Section */}
      <div className="filter-section">
        <Row className="g-3">
          <Col xs={12} lg={5}>
            <div className="position-relative">
              <FaSearch className="position-absolute" style={{ top: "14px", left: "15px", color: colors.textMuted }} />
              <Form.Control
                className="filter-control"
                style={{ paddingLeft: "45px" }}
                type="text"
                placeholder="Search name or email address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Col>

          <Col xs={6} lg={3}>
            <div className="d-flex align-items-center gap-2">
              <Form.Select
                className="filter-control"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">👥 All Roles</option>
                <option value="admin">🛡️ Admin</option>
                <option value="instructor">🎓 Instructor</option>
                <option value="student">📖 Student</option>
                <option value="hr_manager">💼 HR Manager</option>
              </Form.Select>
            </div>
          </Col>

          <Col xs={6} lg={4}>
            <div className="d-flex align-items-center gap-2">
              <Form.Select
                className="filter-control"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
              >
                <option value="all">⚡ All Activity</option>
                <option value="online">Online Now</option>
                <option value="active">Active (7d)</option>
                <option value="inactive">Inactive (30d)</option>
                <option value="dormant">Dormant</option>
                <option value="never">Never Logged In</option>
                <option value="blocked">Blocked</option>
              </Form.Select>
            </div>
          </Col>
        </Row>
      </div>

      {/* User Grid */}
      <div className="user-grid">
        {loadingUsers ? (
          // Render 6 Skeletons while loading
          Array(6).fill(0).map((_, i) => <UserSkeleton key={i} />)
        ) : (
          <>
            {filteredUsers.map((u) => {
              const activity = getUserActivity(u);

              return (
                <div key={u._id} className="user-card">
                  <Badge
                    bg={u.role === "admin" ? "danger" : u.role === "instructor" ? "success" : u.role === "hr_manager" ? "info" : "primary"}
                    className="role-badge"
                  >
                    {u.role === "hr_manager" ? "HR Manager" : u.role}
                  </Badge>

                  <img
                    src={u.profilePic ? `${BASE_URL}${u.profilePic}` : "/default-avatar.png"}
                    alt={u.name}
                    className="user-avatar"
                    onError={(e) => (e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png")}
                  />

                  <h5 className="user-name">{u.name}</h5>
                  <div className="user-email">
                    <FaEnvelope size={12} /> {u.email}
                  </div>

                  {(u.role === "student" || u.role === "hr_manager") && (
                    <div className="corporate-container">
                      {u.companyId ? (
                        <span className="corporate-tag" style={{ color: "#b45309", backgroundColor: "#fffbeb" }}>
                          <FaBuilding /> Corporate {u.role === "hr_manager" ? "HR" : "Employee"}
                        </span>
                      ) : (
                        <span className="corporate-tag" style={{ color: "#047857", backgroundColor: "#ecfdf5" }}>
                          <FaUser /> Individual Student
                        </span>
                      )}
                    </div>
                  )}

                  <div className="d-flex align-items-center gap-2 mb-3">
                    {activityBadge(activity)}
                    <small style={{ color: colors.textMuted, fontSize: '0.75rem' }}>
                      {activity !== "Never" ? formatLastActive(u) : "No activity"}
                    </small>
                  </div>

                  <div className="meta-info mb-3">
                    <div className="d-flex justify-content-between small">
                      <span className="text-muted">Member Since</span>
                      <span className="fw-bold">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      style={{
                        flex: 1,
                        backgroundColor: colors.primary,
                        border: "none",
                        borderRadius: "10px",
                        padding: '10px',
                        fontWeight: '600'
                      }}
                      onClick={() => handleViewDetails(u)}
                    >
                      View Profile
                    </Button>

                    {/* NEW BLOCK/UNBLOCK BUTTON */}
                    {u.role !== "admin" && ( 
                      <Button
                        size="sm"
                        variant={u.isBlocked ? "outline-success" : "outline-danger"}
                        style={{
                          borderRadius: "10px",
                          padding: '10px',
                          fontWeight: '600'
                        }}
                        onClick={() => handleToggleBlockClick(u)}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {roleFilter === "admin" && (
              <div className="user-card add-admin-card" onClick={() => setShowAddAdminModal(true)}>
                <div style={{ background: '#eef2ff', padding: '20px', borderRadius: '50%', marginBottom: '15px' }}>
                  <FaUserPlus size={32} />
                </div>
                <span style={{ fontWeight: 700 }}>Add Administrator</span>
                <small className="text-muted">Create new system access</small>
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered size="lg" className="profile-modal">
        <Modal.Header closeButton style={{ border: 'none', padding: '25px 25px 10px' }}>
          <Modal.Title style={{ fontSize: "1.25rem", fontWeight: '800' }}>User Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '10px 25px 40px' }}>
          {loadingDetails ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading extended profile...</p>
            </div>
          ) : userDetails && selectedUser ? (
            <Row className="align-items-center">
              <Col md={4} className="text-center border-end-md pe-md-4">
                <img
                  src={selectedUser.profilePic ? `${BASE_URL}${selectedUser.profilePic}` : "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                  style={{ width: "140px", height: "140px", borderRadius: "30px", objectFit: "cover", boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                  alt="profile"
                  onError={(e) => (e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png")}
                />
                <h4 className="mt-4 mb-1 fw-bold">{selectedUser.name}</h4>
                <div className="d-flex justify-content-center gap-2 mt-2">
                  <Badge bg="primary">{selectedUser.role.replace('_', ' ')}</Badge>
                  {activityBadge(getUserActivity(selectedUser))}
                </div>
              </Col>
              <Col md={8} className="ps-md-5 mt-4 mt-md-0">
                <div className="detail-section">
                  <h6 className="text-uppercase text-primary small fw-bold mb-3" style={{ letterSpacing: '1px' }}>Account Information</h6>
                  <p className="mb-2"><strong><FaEnvelope className="me-2 text-muted" /> Email:</strong> {selectedUser.email}</p>
                  <p className="mb-2"><strong><FaCalendarAlt className="me-2 text-muted" /> Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>

                  <hr className="my-4" style={{ opacity: 0.1 }} />

                  <h6 className="text-uppercase text-primary small fw-bold mb-3" style={{ letterSpacing: '1px' }}>Role Specifications</h6>
                  {selectedUser.role === "student" ? (
                    <div className="bg-light p-3 rounded-3">
                      <p className="mb-2"><strong>Education:</strong> {userDetails.education || "Not specified"}</p>
                      <p className="mb-0"><strong>Current Enrollment:</strong> {userDetails.enrolledCourses?.length || 0} active courses</p>
                    </div>
                  ) : selectedUser.role === "instructor" ? (
                    <div className="bg-light p-3 rounded-3">
                      <p className="mb-2"><strong>Expertise:</strong> {userDetails.expertise?.join(", ") || "N/A"}</p>
                      <p className="mb-2"><strong>Experience:</strong> {userDetails.experience} Years</p>
                      <p className="mb-0 small"><strong>Bio:</strong> {userDetails.bio || "No bio available"}</p>
                    </div>
                  ) : selectedUser.role === "hr_manager" ? (
                    <div className="bg-light p-3 rounded-3">
                      <p className="mb-2"><strong>Account Type:</strong> B2B Enterprise Client</p>
                      <p className="mb-0"><strong>Permission:</strong> Corporate Training Administrator</p>
                    </div>
                  ) : (
                    <div className="bg-light p-3 rounded-3">
                      <p className="mb-0"><strong>System Access:</strong> Full Administrative Privileges</p>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">User details could not be retrieved.</p>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Add Admin Modal */}
      <Modal show={showAddAdminModal} onHide={() => setShowAddAdminModal(false)} centered className="add-admin-modal">
        <Modal.Header closeButton style={{ border: 'none' }}>
          <Modal.Title className="fw-bold">New Administrator</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pb-4">
          <p className="text-muted small mb-4">Provide details to grant administrative access to the platform.</p>
          <Form onSubmit={handleAddAdmin}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Full Name</Form.Label>
              <Form.Control
                required
                className="filter-control"
                type="text"
                placeholder="Enter full name"
                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Email Address</Form.Label>
              <Form.Control
                required
                className="filter-control"
                type="email"
                placeholder="admin@platform.com"
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Access Password</Form.Label>
              <Form.Control
                required
                className="filter-control"
                type="password"
                placeholder="••••••••"
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              />
            </Form.Group>
            <Button
              type="submit"
              disabled={addingAdmin}
              style={{
                width: "100%",
                background: colors.primary,
                border: "none",
                padding: '12px',
                borderRadius: '12px',
                fontWeight: '700'
              }}
            >
              {addingAdmin ? <Spinner size="sm" /> : "Create Admin Account"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Confirmation Modal for Block/Unblock */}
      <Modal 
        show={showConfirmModal} 
        onHide={() => !isToggling && setShowConfirmModal(false)} 
        centered 
        size="sm"
      >
        <Modal.Body className="text-center p-4">
          <div className="mb-3">
            <span style={{ fontSize: '3rem' }}>
              {userToToggle?.isBlocked ? "✅" : "⚠️"}
            </span>
          </div>
          
          <h5 className="fw-bold mb-3">
            {userToToggle?.isBlocked ? "Unblock User?" : "Block User?"}
          </h5>
          
          <p className="text-muted mb-4 small">
            {userToToggle?.isBlocked 
              ? `Are you sure you want to restore access for ${userToToggle?.name}?` 
              : `Are you sure you want to revoke access for ${userToToggle?.name}? They will not be able to log in.`}
          </p>

          <div className="d-flex gap-2 justify-content-center">
            <Button 
              variant="light" 
              onClick={() => setShowConfirmModal(false)}
              disabled={isToggling}
              style={{ borderRadius: '8px', fontWeight: '600', width: '100px' }}
            >
              Cancel
            </Button>
            <Button 
              variant={userToToggle?.isBlocked ? "success" : "danger"} 
              onClick={executeToggleBlock}
              disabled={isToggling}
              style={{ borderRadius: '8px', fontWeight: '600', width: '100px' }}
            >
              {isToggling ? <Spinner size="sm" /> : "Confirm"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>

    </div>
  );
}