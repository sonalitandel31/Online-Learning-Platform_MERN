import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/admin-dashboard" replace />;
    if (role === "instructor") return <Navigate to="/instructor-dashboard" replace />;
    if (role === "student") return <Navigate to="/" replace />;

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
