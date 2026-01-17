import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import api from "../../api/api";

function Home() {
  const [categories, setCategories] = useState([]);
  const [newCourses, setNewCourses] = useState([]);
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BASE_URL;

  //fetch categories..
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("courses/categories", { withCredentials: true });
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error("Fetch Categories Error:", err);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // fetch latest 8 approved courses..
  useEffect(() => {
    const fetchNewCourses = async () => {
      try {
        const res = await api.get("/courses", { withCredentials: true });

        // 1. Filter: Sirf approved courses lo
        // 2. Sort: Latest date ke hisaab se
        // 3. Slice: Sirf top 8
        const approvedAndSorted = (res.data || [])
          .filter(course => course.status === "approved") // Status check
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 8);

        setNewCourses(approvedAndSorted);
      } catch (err) {
        console.error("Fetch Courses Error:", err);
        setNewCourses([]);
      }
    };
    fetchNewCourses();
  }, []);

  return (
    <div className="home-container">
      <section className="hero-section text-center" style={{ marginTop: "-4%" }}>
        <h1 className="hero-title">
          Expand Your Knowledge with <span>LearnX</span>
        </h1>
        <p className="hero-subtitle">
          Explore top-rated courses and start learning new skills today!
        </p>
        <button className="explore-btn" onClick={() => navigate("/courses")}>
          Explore Courses
        </button>
      </section>

      <section className="why-choose-section" style={{ margin: "50px 0", textAlign: "center", padding: "0 20px" }}>
        <h2 className="section-title" style={{ fontSize: "2rem", color: "#333", fontWeight: "600", marginBottom: "50px" }}>
          Why Choose <span style={{ color: "#7626edff" }}>LearnX</span>?
        </h2>

        <div className="features-grid" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "100px", fontSize: "1rem", color: "#555" }}>
          {[
            { icon: "fa fa-graduation-cap", title: "Expert Instructors", desc: "Learn from industry professionals." },
            { icon: "fa fa-clock", title: "Flexible Learning", desc: "Study anytime, anywhere." },
            { icon: "fa fa-certificate", title: "Certified Courses", desc: "Get recognized certificates." },
            { icon: "fa fa-users", title: "Community Support", desc: "Join our learner community." },
          ].map((item, index) => (
            <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: "150px", maxWidth: "200px" }}>
              <i className={item.icon} style={{ fontSize: "2.3rem", color: "#985eefff", marginBottom: "10px" }}></i>
              <h4 style={{ margin: "6px 0", fontSize: "1.2rem", fontWeight: "500" }}>{item.title}</h4>
              <p style={{ margin: "0", fontSize: "1rem", color: "#666" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="categories-section" style={{ marginTop: "40px", marginBottom: "40px", textAlign: "center" }}>
        <h2 className="section-title" style={{ marginBottom: "25px", fontSize: "2rem", color: "#333", fontWeight: "600" }}>
          Browse by Category
        </h2>

        <div className="categories-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px", justifyItems: "center", alignItems: "center" }}>
          {categories.length > 0 ? (
            categories.map((cat) => (
              <div
                key={cat._id || cat.name}
                className="category-card"
                onClick={() => {
                  const formattedCategory = cat.name.replace(/ /g, "+");
                  navigate(`/courses?category=${formattedCategory}`);
                }}
                style={{
                  background: "#fff",
                  borderRadius: "30px",
                  padding: "16px",
                  width: "100%",
                  maxWidth: "180px",
                  cursor: "pointer",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
                }}
              >
                <h5 style={{ margin: "0", fontSize: "0.9rem", color: "#993bf2ff" }}>{cat.name}</h5>
              </div>
            ))
          ) : (
            <p style={{ color: "#888", fontSize: "1rem" }}>No categories available.</p>
          )}
        </div>
      </section>

      <section className="courses-section container my-5">
        <h2 className="section-title text-center mb-4" style={{ marginTop: "-3%" }}>
          Newly Added Courses
        </h2>
        <div className="row">
          {newCourses.length > 0 ? (
            newCourses.map((course) => (
              <div key={course._id} className="col-md-3 col-sm-6 mb-4">
                <div className="course-card">
                  <div className="course-image">
                    <img
                      src={course.thumbnail ? `${BASE_URL}${course.thumbnail}` : "https://via.placeholder.com/300x180"}
                      alt={course.title}
                      style={{ objectFit: "fill" }}
                    />
                  </div>
                  <div className="course-info">
                    <h5 className="course-title">
                      <Link to={`/courses/${course._id}`}>{course.title}</Link>
                    </h5>
                    <p className="course-description">
                      {course.description?.length > 80
                        ? course.description.substring(0, 80) + "..."
                        : course.description}
                    </p>
                    <div className="course-meta d-flex justify-content-between align-items-center">
                      <span className="level">{course.level}</span>
                      <span className="price">{course.price ? `₹${course.price}` : "Free"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted">No new courses available.</p>
          )}
        </div>
      </section>

      <section className="about-section container my-5">
        <div className="about-grid" style={{ marginTop: "-10%", marginBottom: "-3%" }}>
          <div className="about-image">
            <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80" alt="About LearnX" />
          </div>
          <div className="about-text">
            <h2>About <span>LearnX</span></h2>
            <p>
              At LearnX, we are dedicated to empowering learners worldwide. Explore high-quality courses, learn from expert instructors, and gain skills that truly matter. Our mission is to make learning accessible, engaging, and impactful for everyone.
            </p>
            <button className="learn-more-btn" onClick={() => navigate("/aboutus")}>Learn More</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
