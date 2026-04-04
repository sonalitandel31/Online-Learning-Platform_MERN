import ProtectedRoute from "./routes/ProtectedRoute";

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import './App.css';
/* import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; */


// student
import Home from "./pages/dashboards/home";
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import Navbar from './components/navbar';
import Footer from './components/footer';
import Profile from './pages/dashboards/profile';
import Courses from './pages/dashboards/student/courses';
import CourseDetail from './pages/dashboards/student/courseDetail';
import CourseDiscussion from "./pages/dashboards/student/CourseDiscussion";
import Lesson from './pages/dashboards/student/lessons';
import Exams from './pages/dashboards/student/exams';
import MyLearnings from './pages/dashboards/student/myLearnings';
import SubscriptionPlans from "./pages/dashboards/student/SubscriptionPlans";
import MySubscription from "./pages/dashboards/student/MySubscription";
import StudentLiveClasses from "./pages/dashboards/student/liveClasses";
import StudentLiveClassRoom from "./pages/dashboards/student/liveClassRoom";
import SkillAnalysis from "./pages/dashboards/student/SkillAnalysis";
import LearningPath from "./pages/dashboards/student/LearningPath";
import CertificateViewer from "./pages/dashboards/student/CertificateViewer";

//admin
import AdminDashboard from './pages/dashboards/admin/adminDashboard';
import AllUsers from './pages/dashboards/admin/allUsers';
import AllCourses from './pages/dashboards/admin/allCourses';
import PendingCourses from './pages/dashboards/admin/pendingCourses';
import RejectedCourses from './pages/dashboards/admin/rejectedCourses';
import Transactions from './pages/dashboards/admin/transactions';
import CoursePerformance from './pages/dashboards/admin/coursePerformance';
import Revenue from './pages/dashboards/admin/revenue';
import Payouts from './pages/dashboards/admin/payouts';
import EnrollmentStats from './pages/dashboards/admin/enrollmentStats';
import ManageCategories from './pages/dashboards/admin/manageCategories';
import CategorySuggestions from './pages/dashboards/admin/categorySuggestions';
import AdminContactMessages from './pages/dashboards/admin/contactMessages';
import ForumDiscussions from "./pages/dashboards/admin/Discussions";
import AnalyticsDashboard from "./pages/dashboards/admin/Analytics/AnalyticsDashboard";
import AdminInstructorRanking from "./pages/dashboards/admin/Analytics/AdminInstructorRanking";
import AdminHeatmap from "./pages/dashboards/admin/Analytics/AdminHeatmap";
import AdminPlatformRisk from "./pages/dashboards/admin/Analytics/AdminPlatformRisk";
import AdminSubscriptionPlans from "./pages/dashboards/admin/AdminSubscriptionPlans";
import SystemSettingsPage from "./pages/dashboards/admin/SystemSettingsPage";
import AdminLiveClasses from "./pages/dashboards/admin/liveClasses";
import ManageCompanies from "./pages/dashboards/admin/ManageCompanies";
import CourseRequests from "./pages/dashboards/admin/B2BRequests";

//instructor
import InstructorDashboard from './pages/dashboards/instructor/InstructorDashboard';
import InstructorCourses from './pages/dashboards/instructor/instructorCourses';
import AddCourse from './pages/dashboards/instructor/addCourses';
import PendingApprovals from './pages/dashboards/instructor/pendingApprovals';
import ManageLessons from './pages/dashboards/instructor/manageLessons';
import EnrolledStudents from './pages/dashboards/instructor/enrolledStudents';
import StudentProgress from './pages/dashboards/instructor/studentProgress';
import ManageExams from './pages/dashboards/instructor/manageExams';
import ExamResults from './pages/dashboards/instructor/examResults';
import CourseAnalytics from './pages/dashboards/instructor/courseAnalytics';
import InstructorEarnings from './pages/dashboards/instructor/earnings';
import PayoutHistory from './pages/dashboards/instructor/payoutHistory';
import RequestCategory from './pages/dashboards/instructor/requestCategory';
import CourseDiscussions from "./pages/dashboards/instructor/ManageCourseDiscussions";
import EngagementAnalytics from "./pages/dashboards/instructor/Analytics/EngagementAnalytics";
import CourseEventAnalytics from "./pages/dashboards/instructor/Analytics/CourseEventAnalytics";
import EngagementScoreLeaderboard from "./pages/dashboards/instructor/Analytics/EngagementScoreLeaderboard";
import DropoutRiskAnalytics from "./pages/dashboards/instructor/Analytics/DropoutRiskAnalytics";
import LessonDropoffAnalytics from "./pages/dashboards/instructor/Analytics/LessonDropoffAnalytics";
import InstructorScore from "./pages/dashboards/instructor/Analytics/InstructorScore";
import InstructorLiveClasses from "./pages/dashboards/instructor/liveClasses/liveClasses";
import CreateLiveClass from "./pages/dashboards/instructor/liveClasses/createLiveClass";
import InstructorLiveClassAttendance from "./pages/dashboards/instructor/liveClasses/liveClassAttendance";
import RescheduleLiveClass from "./pages/dashboards/instructor/liveClasses/RescheduleLiveClass";
import AddRecording from "./pages/dashboards/instructor/liveClasses/addRecording";
import InstructorLiveClassRoom from "./pages/dashboards/instructor/liveClasses/liveClassRoom";
import PlatformRules from "./pages/dashboards/instructor/platformRules";
import AssignedB2BProjects from "./pages/dashboards/instructor/AssignedB2BProjects";

// hr
import HRDashboard from "./pages/dashboards/HR/HRDashboard";
import EmployeeList from "./pages/dashboards/HR/EmployeeList";
import BulkEnrollment from "./pages/dashboards/HR/BulkEnrollment";
import CompanySettings from "./pages/dashboards/HR/CompanySettings";
import RequestCourse from "./pages/dashboards/HR/RequestCourse";
import RequestStatus from "./pages/dashboards/HR/RequestStatus";
import ManagePaths from "./pages/dashboards/HR/ManagePaths";
import HRAnalytics from "./pages/dashboards/HR/HRAnalytics";

//common
import ForgotPassword from './pages/auth/forgotPassword';
import ContactUs from './pages/contactus';
import PrivacyPolicy from './pages/privacyPolicy';
import Terms from './pages/terms';
import Support from './pages/support';
import AboutUs from './pages/aboutus';

import { ThemeProvider } from "./context/ThemeContext";
import { useTheme } from "./context/ThemeContext";
import api from "./api/api"; 

function ThemeUpdater({ user }) {
  const { setPrimaryColor, setLogoUrl } = useTheme();

  useEffect(() => {
    if (!user) {
        setPrimaryColor('#6f42c1');
        setLogoUrl(null);
        localStorage.removeItem("themeColor");
        localStorage.removeItem("themeLogo");
        return;
    }

    const fetchUserBranding = async () => {
      try {
        const res = await api.get('/profile');
        const branding = res.data.user?.companyId?.branding;

        if (branding?.themeColor) {
           setPrimaryColor(branding.themeColor);
           localStorage.setItem("themeColor", branding.themeColor);
        }
        if (branding?.logoUrl) {
           setLogoUrl(branding.logoUrl);
           localStorage.setItem("themeLogo", branding.logoUrl); 
        }
      } catch (error) {
         console.error("Theme fetch error", error);
      }
    };

    fetchUserBranding();
  }, [user]);

  return null;
}

function App() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const shouldShowNavbar = !(
    location.pathname.startsWith("/admin-dashboard") ||
    location.pathname.startsWith("/instructor-dashboard") ||
    location.pathname.startsWith("/hr-dashboard")
  );

  return (
    <>
      <ThemeProvider>
        <ThemeUpdater user={user} />
        {shouldShowNavbar && <Navbar user={user} setUser={setUser} />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/learning" element={<MyLearnings />} />
            <Route path="/live-classes/:liveClassId/classroom" element={<StudentLiveClassRoom />} />
          </Route>
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/course/:id/discussion" element={<CourseDiscussion />} />
          <Route path="/course/:courseId/lessons/:lessonId" element={<Lesson />} />
          <Route path="/course/:courseId/exam/:examId" element={<Exams />} />
          <Route path="/certificate/:enrollmentId" element={<CertificateViewer />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/contactus" element={<ContactUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/support" element={<Support />} />
          <Route path="/subscription-plans" element={<SubscriptionPlans />} />
          <Route path="/me/subscription" element={<MySubscription />} />
          <Route path="/live-classes" element={<StudentLiveClasses />} />
          <Route path="/skill-analysis" element={<SkillAnalysis />} />
          <Route path="/learning-path" element={<LearningPath />} />

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />}>
              <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
              <Route path="users" element={<AllUsers />} />
              <Route path="courses" element={<AllCourses />} />
              <Route path="pending-courses" element={<PendingCourses />} />
              <Route path="rejected-courses" element={<RejectedCourses />} />
              <Route path="discussion" element={<ForumDiscussions />} />
              <Route path="categories" element={<ManageCategories />} />
              <Route path="category-suggestions" element={<CategorySuggestions />} />
              <Route path="revenue" element={<Revenue />} />
              <Route path="payouts" element={<Payouts />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="instructor-ranking" element={<AdminInstructorRanking />} />
              <Route path="heatmap" element={<AdminHeatmap />} />
              <Route path="platform-risk" element={<AdminPlatformRisk />} />
              <Route path="reports/enrollments" element={<EnrollmentStats />} />
              <Route path="reports/courses" element={<CoursePerformance />} />
              <Route path="contact-messages" element={<AdminContactMessages />} />
              <Route path="discussions" element={<ForumDiscussions />} />
              <Route path="subscription-plans" element={<AdminSubscriptionPlans />} />
              <Route path="system-settings" element={<SystemSettingsPage />} />
              <Route path="live-classes" element={<AdminLiveClasses />} />
              <Route path="live-classes/:liveClassId/attendance" element={<InstructorLiveClassAttendance />} />
              <Route path="companies" element={<ManageCompanies />} />
              <Route path="b2b-requests" element={<CourseRequests />} />
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
              <Route path="platform-rules" element={<PlatformRules />} />
              <Route path="earnings" element={<InstructorEarnings />} />
              <Route path="payout-history" element={<PayoutHistory />} />
              <Route path="engagement-analytics" element={<EngagementAnalytics />} />
              <Route path="course-event-analytics" element={<CourseEventAnalytics />} />
              <Route path="engagement-score" element={<EngagementScoreLeaderboard />} />
              <Route path="dropout-risk" element={<DropoutRiskAnalytics />} />
              <Route path="lesson-dropoff" element={<LessonDropoffAnalytics />} />
              <Route path="instructor-score" element={<InstructorScore />} />
              <Route path="course_analytics" element={<CourseAnalytics />} />
              <Route path="student_progress" element={<StudentProgress />} />
              <Route path="course-discussions" element={<CourseDiscussions />} />
              <Route path="live-classes" element={<InstructorLiveClasses />} />
              <Route path="live-classes/create" element={<CreateLiveClass />} />
              <Route path="live-classes/:liveClassId/attendance" element={<InstructorLiveClassAttendance />} />
              <Route path="live-classes/:liveClassId/reschedule" element={<RescheduleLiveClass />} />
              <Route path="live-classes/:liveClassId/recording" element={<AddRecording />} />
              <Route path="live-classes/:liveClassId/classroom" element={<InstructorLiveClassRoom />} />
              <Route path="b2b-projects" element={<AssignedB2BProjects />} />
              <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["hr_manager"]} />}>
            <Route path="/hr-dashboard" element={<HRDashboard />}>
              <Route path="employees" element={<EmployeeList />} />
              <Route path="analytics" element={<HRAnalytics />} />
              <Route path="bulk-enroll" element={<BulkEnrollment />} />
              <Route path="corporate-settings" element={<CompanySettings />} />
              <Route path="manage-paths" element={<ManagePaths />} />
              <Route path="request-course" element={<RequestCourse />} />
              <Route path="request-status" element={<RequestStatus />} />
              <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
            </Route>
          </Route>

        </Routes>
        <Footer />
      </ThemeProvider>
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
