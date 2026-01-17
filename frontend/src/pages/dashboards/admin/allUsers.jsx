import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Button, Form, Row, Col, Modal, Spinner, Badge } from "react-bootstrap";
import { FaUserPlus, FaSearch, FaFilter, FaUserCircle } from "react-icons/fa";

export default function AllUsers() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });
    const [addingAdmin, setAddingAdmin] = useState(false);

    const BASE_URL = import.meta.env.VITE_BASE_URL || "";

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get("/admin/users");
            setUsers(res.data);
            setFilteredUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        let tempUsers = [...users];
        if (roleFilter !== "all") tempUsers = tempUsers.filter(u => u.role === roleFilter);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            tempUsers = tempUsers.filter(u => 
                u.name.toLowerCase().includes(term) || 
                u.email.toLowerCase().includes(term)
            );
        }
        setFilteredUsers(tempUsers);
    }, [roleFilter, searchTerm, users]);

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
        primary: "#6f42c1",
        secondary: "#8f63ff",
        lightBg: "#f8f9fa",
        textMuted: "#6c757d"
    };

    return (
        <div className="users-page">
            <style>{`
                .users-page { padding: 15px; background: #f4f7f6; min-height: 100vh; }
                .page-header { color: ${colors.primary}; font-weight: 800; margin-bottom: 20px; }
                
                .filter-section { background: white; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
                
                .user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
                
                .user-card { background: white; border-radius: 15px; padding: 20px; border: 1px solid #eee; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; overflow: hidden; }
                .user-card:hover { transform: translateY(-8px); box-shadow: 0 12px 20px rgba(0,0,0,0.1); }
                
                .user-avatar { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid ${colors.primary}; margin-bottom: 15px; }
                .role-badge { position: absolute; top: 15px; right: 15px; text-transform: capitalize; }
                
                .add-admin-card { border: 2px dashed ${colors.primary}; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px; cursor: pointer; color: ${colors.primary}; background: #faf5ff; }
                .add-admin-card:hover { background: #f3e8ff; }

                @media (min-width: 768px) { .users-page { padding: 30px; } }
            `}</style>

            <h2 className="page-header">User Management</h2>

            <div className="filter-section">
                <Row className="g-3">
                    <Col xs={12} md={5}>
                        <div className="position-relative">
                            <FaSearch className="position-absolute" style={{ top: '12px', left: '12px', color: colors.textMuted }} />
                            <Form.Control 
                                style={{ paddingLeft: '40px', borderRadius: '10px' }}
                                type="text" 
                                placeholder="Search by name or email..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </Col>
                    <Col xs={12} md={4}>
                        <div className="d-flex align-items-center gap-2">
                            <FaFilter color={colors.primary} />
                            <Form.Select 
                                style={{ borderRadius: '10px' }}
                                value={roleFilter} 
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="instructor">Instructor</option>
                                <option value="student">Student</option>
                            </Form.Select>
                        </div>
                    </Col>
                </Row>
            </div>

            <div className="user-grid">
                {/* User Cards */}
                {filteredUsers.map((u) => (
                    <div key={u._id} className="user-card">
                        <Badge bg={u.role === 'admin' ? 'danger' : u.role === 'instructor' ? 'success' : 'primary'} className="role-badge">
                            {u.role}
                        </Badge>
                        <img 
                            src={u.profilePic ? `${BASE_URL}${u.profilePic}` : "/default-avatar.png"} 
                            alt={u.name} 
                            className="user-avatar"
                            onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                        />
                        <h5 style={{ fontWeight: 700, margin: '0 0 5px 0' }}>{u.name}</h5>
                        <p style={{ fontSize: '0.85rem', color: colors.textMuted, marginBottom: '15px' }}>{u.email}</p>
                        
                        <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '15px' }}>
                            <div><strong>Joined:</strong> {new Date(u.createdAt).toLocaleDateString()}</div>
                        </div>

                        <Button 
                            size="sm" 
                            style={{ backgroundColor: colors.primary, border: 'none', borderRadius: '8px', width: '100%' }}
                            onClick={() => handleViewDetails(u)}
                        >
                            View Profile
                        </Button>
                    </div>
                ))}

                {/* Add Admin Option */}
                {roleFilter === "admin" && (
                    <div className="user-card add-admin-card" onClick={() => setShowAddAdminModal(true)}>
                        <FaUserPlus size={40} />
                        <span style={{ fontWeight: 700, marginTop: '10px' }}>Add Admin</span>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered size="lg">
                <Modal.Header closeButton style={{ background: colors.primary, color: 'white' }}>
                    <Modal.Title style={{ fontSize: '1.1rem' }}>User Profile Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingDetails ? (
                        <div className="text-center py-5"><Spinner animation="border" variant="purple" /></div>
                    ) : userDetails && selectedUser ? (
                        <Row>
                            <Col md={4} className="text-center border-end">
                                <img 
                                    src={`${BASE_URL}${selectedUser.profilePic}`} 
                                    style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f0f0f0' }} 
                                    alt="profile"
                                />
                                <h4 className="mt-3 mb-1">{selectedUser.name}</h4>
                                <Badge bg="info">{selectedUser.role}</Badge>
                            </Col>
                            <Col md={8} className="ps-md-4">
                                <h6 className="text-uppercase text-muted small fw-bold mt-2">Contact Information</h6>
                                <p><strong>Email:</strong> {selectedUser.email}</p>
                                
                                <hr />
                                
                                <h6 className="text-uppercase text-muted small fw-bold">Professional Info</h6>
                                {selectedUser.role === "student" ? (
                                    <>
                                        <p><strong>Education:</strong> {userDetails.education || "N/A"}</p>
                                        <p><strong>Enrolled:</strong> {userDetails.enrolledCourses?.length || 0} Courses</p>
                                    </>
                                ) : (
                                    <>
                                        <p><strong>Expertise:</strong> {userDetails.expertise?.join(", ") || "N/A"}</p>
                                        <p><strong>Experience:</strong> {userDetails.experience} Years</p>
                                        <p><strong>Bio:</strong> {userDetails.bio || "No bio available"}</p>
                                    </>
                                )}
                            </Col>
                        </Row>
                    ) : <p className="text-center">Details not found.</p>}
                </Modal.Body>
            </Modal>

            {/* Add Admin Modal */}
            <Modal show={showAddAdminModal} onHide={() => setShowAddAdminModal(false)} centered>
                <Modal.Header closeButton><strong>Add New Administrator</strong></Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleAddAdmin}>
                        <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control required type="text" placeholder="John Doe" onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control required type="email" placeholder="admin@platform.com" onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label>Access Password</Form.Label>
                            <Form.Control required type="password" placeholder="••••••••" onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} />
                        </Form.Group>
                        <Button type="submit" disabled={addingAdmin} style={{ width: '100%', background: colors.primary, border: 'none' }}>
                            {addingAdmin ? <Spinner size="sm" /> : "Create Admin Account"}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
}