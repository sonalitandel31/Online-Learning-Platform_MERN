import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../../api/api";
import { track } from "../../utils/track";

function Home() {
  const [categories, setCategories] = useState([]);
  const [newCourses, setNewCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [trendingCourses, setTrendingCourses] = useState([]);
  const [recLevel, setRecLevel] = useState("");
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);

  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BASE_URL;
  const isLoggedIn = !!localStorage.getItem("token");

  const BRAND_COLOR = "#8540ee";
  const SOFT_BG = "#f8f9ff";

  useEffect(() => {
    track("home_view", {});
    fetchCategories();
    fetchNewCourses();
    fetchTrending();
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchRecommended();
  }, [recLevel, isLoggedIn]);

  const fetchTrending = async () => {
    try {
      const res = await api.get("/courses/trending", { withCredentials: true });
      setTrendingCourses(res.data.courses || []);
    } catch (err) { console.error(err); }
  };

  const fetchRecommended = async () => {
    try {
      const res = await api.get(`/courses/recommended?level=${recLevel}`, { withCredentials: true });
      setRecommendedCourses(res.data.courses || []);
    } catch (err) { console.error(err); }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("courses/categories", { withCredentials: true });
      setCategories(res.data.categories || []);
    } catch (err) { setCategories([]); }
  };

  const fetchNewCourses = async () => {
    try {
      const res = await api.get("/courses", { withCredentials: true });
      const approved = (res.data.courses || [])
        .filter(c => c.status === "approved")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);
      setNewCourses(approved);
    } catch (err) { setNewCourses([]); }
  };

  // Component..
  const CourseCard = ({ course, extraClass = "" }) => (
    <div className={`col-lg-3 col-md-4 col-sm-6 mb-4 ${extraClass}`}>
      <div
        className="card h-100 border-0 shadow-sm"
        style={{
          borderRadius: "20px",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          overflow: "hidden",
          cursor: "pointer"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-10px)";
          e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 5px 15px rgba(0,0,0,0.05)";
        }}
        onClick={() => navigate(`/courses/${course._id}`)}
      >
        <div style={{ position: "relative", height: "170px" }}>
          <img
            src={course.thumbnail ? `${BASE_URL}${course.thumbnail}` : "https://via.placeholder.com/300x180"}
            alt={course.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <span style={{
            position: "absolute", top: "12px", right: "12px",
            background: "rgba(255,255,255,0.9)", padding: "4px 12px",
            borderRadius: "50px", fontSize: "0.75rem", fontWeight: "700", color: BRAND_COLOR
          }}>
            {course.level?.toUpperCase()}
          </span>
        </div>
        <div className="card-body d-flex flex-column p-3">
          <h6 className="fw-bold mb-2 text-dark" style={{ lineHeight: "1.4" }}>{course.title}</h6>
          <p className="text-muted small mb-3" style={{ fontSize: "0.85rem" }}>
            {course.description?.length > 70 ? course.description.substring(0, 70) + "..." : course.description}
          </p>
          <div className="mt-auto d-flex justify-content-between align-items-center">
            <div className="small text-muted"><i className="fa fa-user-friends me-1"></i> {course.enrolledCount || 0}</div>
            <div className="fw-bold" style={{ color: BRAND_COLOR, fontSize: "1.1rem" }}>
              {course.price ? `₹${course.price}` : "Free"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh", fontFamily: "'Inter', sans-serif", marginTop:"-1%" }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-row { animation: fadeIn 0.5s ease forwards; }
        `}
      </style>

      {/* Hero Section */}
      <section className="py-5 text-center text-white" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80")`,
        backgroundSize: "cover", backgroundPosition: "center", minHeight: "60vh", display: "flex", alignItems: "center"
      }}>
        <div className="container">
          <h1 className="display-4 fw-bold mb-3">Master New Skills with <span style={{ color: "#a87ffb" }}>LearnX</span></h1>
          <p className="lead mx-auto mb-4" style={{ maxWidth: "600px" }}>Expert-led courses for your career.</p>
          <button className="btn btn-lg px-4 py-3 shadow" style={{ background: BRAND_COLOR, color: "white", borderRadius: "12px", border: "none" }} onClick={() => navigate("/courses")}>
            Start Learning Now
          </button>
        </div>
      </section>

      {/* Recommended Section */}
      {isLoggedIn && recommendedCourses.length > 0 && (
        <section className="container py-5">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div><h2 className="fw-bold">Tailored for You</h2><p className="text-muted">Based on your interests</p></div>
            <select className="form-select border-0 shadow-sm" style={{ width: "150px", backgroundColor: SOFT_BG }} value={recLevel} onChange={(e) => setRecLevel(e.target.value)}>
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="row">
            {recommendedCourses.slice(0, showAllRecommended ? 8 : 4).map(course => <CourseCard key={course._id} course={course} />)}
          </div>
          <div className="d-flex justify-content-end mt-2">
            <button className="btn fw-bold" style={{ color: BRAND_COLOR }} onClick={() => setShowAllRecommended(!showAllRecommended)}>
              {showAllRecommended ? "Show Less" : "View More"}
            </button>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-5" style={{ backgroundColor: SOFT_BG }}>
        <div className="container">
          <h2 className="text-center fw-bold mb-5">Explore Categories</h2>
          <div className="row g-3 justify-content-center">
            {categories.map((cat) => (
              <div key={cat._id} className="col-6 col-md-3 col-lg-2">
                <div
                  className="p-3 text-center shadow-sm bg-white"
                  style={{
                    borderRadius: "18px",
                    cursor: "pointer",
                    border: "2px solid transparent", // Default transparent border
                    transition: "all 0.3s ease",      // Smooth effect
                  }}
                  onClick={() => navigate(`/courses?category=${cat._id}`)}

                  // --- INLINE HOVER LOGIC ---
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = BRAND_COLOR;
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.backgroundColor = "#fcfaff"; // Light purple hint
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <h6 className="mb-0 fw-bold" style={{ color: "#444" }}>{cat.name}</h6>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="container py-5">
        <h2 className="fw-bold mb-4">Trending Now <i className="fa fa-fire text-danger"></i></h2>
        <div className="row">
          {trendingCourses.slice(0, 4).map(course => <CourseCard key={course._id} course={course} />)}
          {showAllTrending && trendingCourses.slice(4, 8).map(course => (
            <CourseCard key={course._id} course={course} extraClass="animate-row" />
          ))}
        </div>
        <div className="d-flex justify-content-end">
          <button className="btn fw-bold" style={{ color: BRAND_COLOR }} onClick={() => setShowAllTrending(!showAllTrending)}>
            {showAllTrending ? "Show Less" : "View More"}
          </button>
        </div>
      </section>

      {/* New Courses Section */}
      <section className="container py-5">
        <div className="p-5" style={{ background: "#1a1a1a", borderRadius: "30px", color: "white" }}>
          <div className="row align-items-center mb-4">
            <div className="col-md-8"><h2>Newly Released</h2></div>
            <div className="col-md-4 text-md-end"><button className="btn btn-light" onClick={() => navigate("/courses")}>Browse All</button></div>
          </div>
          <div className="row">
            {newCourses.slice(0, 4).map(course => (
              <div key={course._id} className="col-md-3 mb-3">
                <div className="bg-white p-2 rounded-4 text-dark h-100" onClick={() => navigate(`/courses/${course._id}`)}>
                  <img src={course.thumbnail ? `${BASE_URL}${course.thumbnail}` : ""} className="w-100 rounded-3 mb-2" style={{ height: "120px", objectFit: "cover" }} alt="" />
                  <p className="fw-bold small mb-1">{course.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- WHY CHOOSE SECTION --- */}
      <section className="container py-5 text-center">
        <h2 className="fw-bold mb-5">Learning that delivers results</h2>
        <div className="row g-4">
          {[
            { icon: "fa-graduation-cap", title: "Expert Instruction", desc: "Learn from industry professionals." },
            { icon: "fa-bolt", title: "Interactive Learning", desc: "Hands-on projects and quizzes." },
            { icon: "fa-certificate", title: "Global Certification", desc: "Verifiable certificates for your CV." },
            { icon: "fa-life-ring", title: "Dedicated Support", desc: "24/7 help from our community." }
          ].map((item, i) => (
            <div key={i} className="col-md-3">
              <div className="p-4 h-100 rounded-4" style={{ backgroundColor: "#fbfbff" }}>
                <div className="mb-3 d-inline-block p-3 rounded-circle" style={{ background: `${BRAND_COLOR}10`, color: BRAND_COLOR }}>
                  <i className={`fa ${item.icon} fa-2x`}></i>
                </div>
                <h5 className="fw-bold">{item.title}</h5>
                <p className="text-muted small mb-0">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section className="container py-5 mb-5">
        <div className="row align-items-center g-5">
          <div className="col-md-6 position-relative">
            <div style={{ position: "absolute", top: "-20px", left: "-20px", width: "100px", height: "100px", background: BRAND_COLOR, borderRadius: "20px", zIndex: -1, opacity: 0.1 }}></div>
            <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80" className="img-fluid rounded-5 shadow-lg" alt="About" />
          </div>
          <div className="col-md-6">
            <h2 className="display-6 fw-bold mb-4">Transforming Lives Through <span style={{ color: BRAND_COLOR }}>Education</span></h2>
            <p className="text-muted mb-4 fs-5">LearnX is more than just an online platform. It's a global community of learners and mentors dedicated to pushing the boundaries of what's possible.</p>
            <button className="btn btn-lg px-4" onClick={() => navigate("/aboutus")} style={{ background: BRAND_COLOR, color: "white", borderRadius: "12px" }}>Our Story</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;