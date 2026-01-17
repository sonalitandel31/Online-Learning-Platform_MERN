export default function Terms() {
  return (
    <div className="min-h-screen bg-white py-5">

      {/* HEADER */}
      <div className="container mb-5">
        <div
          className="text-center p-4 p-md-5 rounded shadow-sm"
          style={{
            background: "#f3e8ff",
            borderRadius: "20px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
          }}
        >
          <h1 className="fw-bold" style={{ color: "#7c3aed", fontSize: "42px" }}>
            Terms & Conditions
          </h1>
          <p className="mt-2 text-muted" style={{ fontSize: "18px" }}>
            Please review these terms carefully before accessing or using our platform.
          </p>
        </div>
      </div>

      {/* TERMS SECTIONS */}
      <div className="container" style={{ maxWidth: "950px" }}>
        <div className="row g-4">

          {/* CARD TEMPLATE */}
          {[
            {
              title: "1. Acceptance of Terms",
              text:
                "By using our platform, you agree to follow all rules, policies, and guidelines listed here. If you disagree with any part, please stop using the platform immediately.",
            },
            {
              title: "2. Course Access",
              text:
                "Course access is provided only after successful payment. Each course has its own validity period depending on instructor settings.",
            },
            {
              title: "3. Refund Policy",
              text:
                "Refunds are granted only after admin review in genuine cases like duplicate payments or technical issues. Completed courses or downloaded files are not refundable.",
            },
            {
              title: "4. Instructor Guidelines",
              text:
                "Instructors must upload original content and follow platform rules. Any copyright violation may result in content removal or account suspension.",
            },
            {
              title: "5. Account Termination",
              text:
                "We may suspend or terminate accounts involved in misuse, fraud, or violations of platform rules.",
            },
            {
              title: "6. Updates to Terms",
              text:
                "These terms may be updated regularly. Continued use of the platform means you accept the latest version.",
            },
          ].map((item, index) => (
            <div className="col-12" key={index}>
              <div
                className="p-4 rounded shadow-sm h-100"
                style={{
                  background: "#faf5ff",
                  borderLeft: "6px solid #7c3aed",
                  lineHeight: "1.7",
                }}
              >
                <h4 className="fw-bold mb-2" style={{ color: "#7c3aed" }}>
                  {item.title}
                </h4>
                <p className="text-secondary">{item.text}</p>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
