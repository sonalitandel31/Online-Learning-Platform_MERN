import { useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await api.post("/contact", {
        name: formData.name,
        email: formData.email,
        subject: "Contact Form Message",
        message: formData.message,
      });

      toast.success("Your message has been sent successfully!");
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: "60px 20px" }}>

      <div
        style={{
          textAlign: "center",
          marginBottom: "40px",
          background: "#f3e8ff",
          padding: "35px 15px",
          borderRadius: "18px",
          boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontWeight: "700", fontSize: "40px", color: "#7c3aed" }}>
          Contact Us
        </h1>
        <p style={{ opacity: 0.8, fontSize: "18px" }}>
          We're here to help! Reach out for support, questions, or feedback.
        </p>
      </div>

      <div className="container">
        <div className="row g-4">

          <div className="col-md-6">
            <div
              style={{
                background: "#faf5ff",
                padding: "25px",
                borderRadius: "15px",
                border: "2px solid #e9d5ff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
            >
              <h3 style={{ fontWeight: "700", marginBottom: "20px", color: "#7c3aed" }}>
                Send us a Message
              </h3>

              {msg && (
                <div className="alert alert-info py-2 text-center">
                  {msg}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-bold">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={{ padding: "10px" }}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={{ padding: "10px" }}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Message</label>
                  <textarea
                    name="message"
                    className="form-control"
                    rows="4"
                    placeholder="Write your message..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                    style={{ padding: "10px" }}
                  ></textarea>
                </div>

                <button
                  disabled={loading}
                  className="btn w-100"
                  style={{
                    background: "#7c3aed",
                    color: "white",
                    padding: "12px",
                    fontWeight: "600",
                    borderRadius: "10px",
                    fontSize: "17px",
                  }}
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>

          <div className="col-md-6">
            <div
              style={{
                background: "#faf5ff",
                padding: "25px",
                borderRadius: "15px",
                border: "2px solid #e9d5ff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
            >
              <h3 style={{ fontWeight: "700", marginBottom: "20px", color: "#7c3aed" }}>
                Our Contact Details
              </h3>

              <ul style={{ listStyle: "none", paddingLeft: 0, fontSize: "17px", lineHeight: "1.9" }}>
                <li><strong>Email:</strong> support@lms.com</li>
                <li><strong>Phone:</strong> +91 9876543210</li>
                <li><strong>Address:</strong> Valsad, Gujarat, India</li>
              </ul>

              <div className="mt-4">
                <iframe
                  title="map"
                  width="100%"
                  height="280"
                  style={{
                    border: 0,
                    borderRadius: "15px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  }}
                  loading="lazy"
                  allowFullScreen
                  src="https://maps.google.com/maps?q=Valsadt&t=&z=13&ie=UTF8&iwloc=&output=embed"
                ></iframe>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
