export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-muted" style={{ fontSize: "18px" }}>
            Learn how we collect, use, and protect your personal information.
          </p>
        </div>
      </div>

      {/* CONTENT SECTIONS */}
      <div className="container" style={{ maxWidth: "950px" }}>
        <div className="row g-4">

          {[
            {
              title: "1. Data Collection",
              text:
                "We collect essential information such as your name, email, and usage activity to deliver a personalized and effective learning experience.",
            },
            {
              title: "2. How We Use Your Data",
              text:
                "Your information is used to provide services like course personalization, account updates, communication, and platform support.",
            },
            {
              title: "3. Cookies & Tracking",
              text:
                "We use cookies to store preferences, enhance performance, and improve overall navigation across the platform.",
            },
            {
              title: "4. Data Protection & Security",
              text:
                "Your data is stored securely and encrypted where required. We do not share personal information with third parties unless legally required.",
            },
            {
              title: "5. Your Rights",
              text:
                "You may request access, modification, exporting, or deletion of your personal information at any time.",
            },
            {
              title: "6. Policy Updates",
              text:
                "This policy may be updated periodically. Significant changes will be communicated to all users.",
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
