import ProtectedRoute from "./routes/ProtectedRoute";

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import './App.css';
/* import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; */

import Home from "./pages/dashboards/home";
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import Navbar from './components/navbar';
import Footer from './components/footer';
import Profile from './pages/dashboards/profile';

import AdminDashboard from './pages/dashboards/admin/adminDashboard';
import AllUsers from './pages/dashboards/admin/allUsers';
import AllCourses from './pages/dashboards/admin/allCourses';
import PendingCourses from './pages/dashboards/admin/pendingCourses';
import RejectedCourses from './pages/dashboards/admin/rejectedCourses';
import Transactions from './pages/dashboards/admin/transactions';
import CoursePerformance from './pages/dashboards/admin/coursePerformance';
import Instructors from './pages/dashboards/admin/instructors';
import Students from './pages/dashboards/admin/students';
import Revenue from './pages/dashboards/admin/revenue';
import Payouts from './pages/dashboards/admin/payouts';

import InstructorDashboard from './pages/dashboards/instructor/InstructorDashboard';
import InstructorCourses from './pages/dashboards/instructor/instructorCourses';
import AddCourse from './pages/dashboards/instructor/addCourses';
import PendingApprovals from './pages/dashboards/instructor/pendingApprovals';
import ManageLessons from './pages/dashboards/instructor/manageLessons';
import EnrolledStudents from './pages/dashboards/instructor/enrolledStudents';
import StudentProgress from './pages/dashboards/instructor/studentProgress';
import ManageExams from './pages/dashboards/instructor/manageExams';
import ExamResults from './pages/dashboards/instructor/examResults';

import Courses from './pages/dashboards/student/courses';
import CourseDetail from './pages/dashboards/student/courseDetail';
import CourseDiscussion from "./pages/dashboards/student/CourseDiscussion";
import Lesson from './pages/dashboards/student/lessons';
import Exams from './pages/dashboards/student/exams';
import MyLearnings from './pages/dashboards/student/myLearnings';
import EnrollmentStats from './pages/dashboards/admin/enrollmentStats';
import ForgotPassword from './pages/auth/forgotPassword';
import CourseAnalytics from './pages/dashboards/instructor/courseAnalytics';
import InstructorEarnings from './pages/dashboards/instructor/earnings';
import PayoutHistory from './pages/dashboards/instructor/payoutHistory';
import ManageCategories from './pages/dashboards/admin/manageCategories';
import CategorySuggestions from './pages/dashboards/admin/categorySuggestions';
import RequestCategory from './pages/dashboards/instructor/requestCategory';
import ContactUs from './pages/contactus';
import PrivacyPolicy from './pages/privacyPolicy';
import Terms from './pages/terms';
import Support from './pages/support';
import AboutUs from './pages/aboutus';
import AdminContactMessages from './pages/dashboards/admin/contactMessages';
import ForumDiscussions from "./pages/dashboards/admin/Discussions";
import CourseDiscussions from "./pages/dashboards/instructor/ManageCourseDiscussions";

function App() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const shouldShowNavbar = !(
    location.pathname.startsWith("/admin-dashboard") ||
    location.pathname.startsWith("/instructor-dashboard")
  );

  return (
    <>
      {shouldShowNavbar && <Navbar user={user} setUser={setUser} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
        <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/learning" element={<MyLearnings />} />
        </Route>
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/course/:id/discussion" element={<CourseDiscussion />} />
        <Route path="/course/:courseId/lessons/:lessonId" element={<Lesson />} />
        <Route path="/course/:courseId/exam/:examId" element={<Exams />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/aboutus" element={<AboutUs />} />
        <Route path="/contactus" element={<ContactUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/support" element={<Support />} />

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />}>
            <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
            <Route path="users" element={<AllUsers />} />
            <Route path="instructors" element={<Instructors />} />
            <Route path="students" element={<Students />} />
            <Route path="courses" element={<AllCourses />} />
            <Route path="pending-courses" element={<PendingCourses />} />
            <Route path="rejected-courses" element={<RejectedCourses />} />
            <Route path="discussion" element={<ForumDiscussions />} />
            <Route path="categories" element={<ManageCategories />} />
            <Route path="category-suggestions" element={<CategorySuggestions />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="payouts" element={<Payouts />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="reports/enrollments" element={<EnrollmentStats />} />
            <Route path="reports/courses" element={<CoursePerformance />} />
            <Route path="contact-messages" element={<AdminContactMessages />} />
            <Route path="discussions" element={<ForumDiscussions />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["instructor"]} />}>
          <Route path="/instructor-dashboard" element={<InstructorDashboard />}>
            <Route path="instructor_courses" element={<InstructorCourses />} />
            <Route path="add_courses" element={<AddCourse />} />
            <Route path="pending_approvals" element={<PendingApprovals />} />
            <Route path="request-category" element={<RequestCategory />} />
            <Route path="manage_lessons/:id?" element={<ManageLessons />} />
            <Route path="enrolled_students" element={<EnrolledStudents />} />
            <Route path="manage_exams" element={<ManageExams />} />
            <Route path="exam_results" element={<ExamResults />} />
            <Route path="earnings" element={<InstructorEarnings />} />
            <Route path="payout-history" element={<PayoutHistory />} />
            <Route path="course_analytics" element={<CourseAnalytics />} />
            <Route path="student_progress" element={<StudentProgress />} />
            <Route path="course-discussions" element={<CourseDiscussions />} />
            <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
          </Route>
        </Route>

      </Routes>
      <Footer />
    </>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}
