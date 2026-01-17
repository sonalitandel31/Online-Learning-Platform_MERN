export default function Support() {
  return (
    <div className="min-h-screen bg-white py-5">
      <div className="container">
        
        {/* TITLE */}
        <h1 className="text-center fw-bold mb-4" style={{ color: "#6a0dad", marginTop:"50px" }}>
          Support & Help Center
        </h1>

        <div
          className="mx-auto p-4 p-md-5 shadow-lg rounded-4"
          style={{ maxWidth: "850px", background: "#f8f3ff" }}
        >
          {/* Intro */}
          <h4 className="fw-bold" style={{ color: "#6a0dad" }}>
            How can we assist you?
          </h4>
          <p className="text-muted">
            We’re available 24/7 to support your learning journey.  
            Whether it's course access, payments, instructor queries, or account issues —
            we’re here to help!
          </p>

          {/* Contact Cards */}
          <div className="row gy-3 mt-3">

            <div className="col-md-4">
              <div
                className="p-3 rounded-3 h-100"
                style={{ background: "white", borderLeft: "5px solid #8a2be2" }}
              >
                <h6 className="fw-bold">📩 Email Support</h6>
                <p className="mb-0 text-muted">support@lms.com</p>
              </div>
            </div>

            <div className="col-md-4">
              <div
                className="p-3 rounded-3 h-100"
                style={{ background: "white", borderLeft: "5px solid #8a2be2" }}
              >
                <h6 className="fw-bold">📞 Phone</h6>
                <p className="mb-0 text-muted">+91 9876543210</p>
              </div>
            </div>

            <div className="col-md-4">
              <div
                className="p-3 rounded-3 h-100"
                style={{ background: "white", borderLeft: "5px solid #8a2be2" }}
              >
                <h6 className="fw-bold">🖥️ Helpdesk</h6>
                <p className="mb-0 text-muted">www.lmssupport.com</p>
              </div>
            </div>

          </div>

          {/* FAQ / Common Issues */}
          <h4 className="fw-bold mt-4" style={{ color: "#6a0dad" }}>
            Common Issues
          </h4>
          <ul className="text-muted">
            <li>Course not loading or video buffering issues</li>
            <li>Payment completed but course not unlocked</li>
            <li>Instructor content approval pending</li>
            <li>Login problems or password reset help</li>
            <li>Profile or enrollment details not updating</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
