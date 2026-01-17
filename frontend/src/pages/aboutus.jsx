export default function AboutUs() {
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#444" }}>

      <div style={{ textAlign: "center", marginBottom: "40px", marginTop:"70px", background: "#f3e8ff", padding: "35px 15px", borderRadius: "18px", boxShadow: "0 6px 14px rgba(0,0,0,0.08)",}}>
        <h1 style={{ fontWeight: "700", fontSize: "40px", color: "#7c3aed" }}>
          About Us
        </h1>
        <p style={{ opacity: 0.8, fontSize: "18px" }}>
          Empowering learners & instructors through modern digital education
        </p>
      </div>
        
      <div style={{ padding: "60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontWeight: "700", marginBottom: "20px", color: "#7c3aed", }}>
          Who We Are
        </h2>

        <p style={{ textAlign: "center", fontSize: "19px", maxWidth: "850px", margin: "0 auto", lineHeight: "1.7",}}>
          We are a team of passionate educators, developers, and creators on a mission
          to transform online learning. Our LMS provides a powerful yet easy-to-use
          platform that connects learners and instructors worldwide.
        </p>
      </div>

      <div style={{ padding: "60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div className="row align-items-center">

          <div className="col-md-6">
            <h2 style={{ fontWeight: "700", marginBottom: "15px", color: "#7c3aed" }}>
              Our Story
            </h2>

            <p style={{ fontSize: "18px", lineHeight: "1.7" }}>
              Our journey began with a belief — education should be accessible for everyone.
              Today, we have built a strong learning ecosystem helping thousands gain modern skills.
            </p>

            <p style={{ fontSize: "18px", lineHeight: "1.7" }}>
              Fuelled by innovation and powerful technology, we designed an LMS that simplifies
              teaching, boosts productivity, and enhances every learner’s growth journey.
            </p>
          </div>

          <div className="col-md-6 text-center mt-4 mt-md-0">
            <img src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b" alt="Our Story" style={{ width: "100%", borderRadius: "20px", boxShadow: "0 8px 18px rgba(0,0,0,0.2)",}} />
          </div>
        </div>
      </div>

      <div style={{ padding: "60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontWeight: "700", marginBottom: "30px", color: "#7c3aed", }} >
          What Our Platform Offers
        </h2>

        <div className="row g-4">
          {[
            { title: "Smart Learning Tools", desc: "Quizzes, assignments, progress tracking, certification & forums." },
            { title: "Instructor Dashboard", desc: "Manage courses, track earnings, analyze student performance." },
            { title: "Secure Payments", desc: "Fast & safe checkout, invoices, and multiple payment methods." },
            { title: "HD Video Player", desc: "Smooth playback, speed control & bookmarking for easy learning." },
          ].map((item, idx) => (
            <div key={idx} className="col-12 col-sm-6 col-lg-3">
              <div
                style={{ padding: "25px", background: "#ffffff", borderRadius: "15px", border: "2px solid #eee", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", transition: "all 0.3s ease", cursor: "pointer", height: "100%",}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.borderColor = "#7c3aed";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#eee";
                }}
              >
                <h5 style={{ fontWeight: "700", color: "#7c3aed", fontSize: "18px" }}>
                  ⭐ {item.title}
                </h5>
                <p style={{ marginTop: "10px", fontSize: "16px" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "60px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontWeight: "700", marginBottom: "30px", color: "#7c3aed", }}>
          Why Students & Instructors Love Us
        </h2>

        <div className="row g-4">

          <div className="col-md-6 d-flex justify-content-center">
            <div style={{ padding: "25px", background: "#faf5ff", borderRadius: "15px", border: "2px solid #e9d5ff", width: "97%", }} >
              <h5 style={{ fontWeight: "700", color: "#7c3aed" }}>For Students</h5>
              <ul style={{ marginTop: "15px", fontSize: "18px", lineHeight: "1.8" }}>
                <li>Structured & high-quality courses</li>
                <li>Affordable learning</li>
                <li>Certificate of completion</li>
                <li>Learn at your own pace</li>
              </ul>
            </div>
          </div>

          <div className="col-md-6 d-flex justify-content-center">
            <div style={{ padding: "25px", background: "#faf5ff", borderRadius: "15px", border: "2px solid #e9d5ff", width: "97%", }} >
              <h5 style={{ fontWeight: "700", color: "#7c3aed" }}>For Instructors</h5>
              <ul style={{ marginTop: "15px", fontSize: "18px", lineHeight: "1.8" }}>
                <li>High revenue share</li>
                <li>Easy course creation tools</li>
                <li>Real-time analytics</li>
                <li>Community & support</li>
                <li>Zero technical complexity</li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <h2
          style={{
            fontWeight: "700",
            marginBottom: "20px",
            color: "#7c3aed",
          }}
        >
          Our Vision for the Future
        </h2>

        <p
          style={{
            fontSize: "19px",
            maxWidth: "850px",
            margin: "0 auto",
            lineHeight: "1.7",
          }}
        >
          Our vision is to create the world’s most trusted digital learning environment —
          where anyone can learn new skills and instructors can grow their teaching careers globally.
          We aim to introduce AI mentorship, advanced analytics, and global instructor collaboration.
        </p>
      </div>

    </div>
  );
}
