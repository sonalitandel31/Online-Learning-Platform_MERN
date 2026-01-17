import React from "react";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram } from "react-icons/fa";

export default function Footer() {
  const footerStyle = {
    backgroundColor: "#1c1c1c",
    color: "#fff",
    padding: "40px 20px 20px 20px",
    fontFamily: "Arial, sans-serif",
  };

  const columnStyle = {
    flex: "1 1 200px",
    marginBottom: "20px",
    minWidth: "150px",
  };

  const linkStyle = {
    color: "#fff",
    textDecoration: "none",
    display: "block",
    marginBottom: "8px",
    fontSize: "0.95rem",
  };

  const socialIconStyle = {
    color: "#fff",
    fontSize: "20px",
    marginRight: "15px",
    cursor: "pointer",
    transition: "color 0.3s",
  };

  const socialIconHover = (e) => {
    e.target.style.color = "#9f64f7ff";
  };

  const socialIconLeave = (e) => {
    e.target.style.color = "#fff";
  };

  const containerStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
  };

  const bottomStyle = {
    borderTop: "1px solid #555",
    textAlign: "center",
    paddingTop: "15px",
    marginTop: "20px",
    fontSize: "0.85rem",
    color: "#ccc",
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        {/* Column 1 */}
        <div style={columnStyle}>
          <h5 style={{ fontWeight: "bold", marginBottom: "10px" }}>LMS Platform</h5>
          <p style={{ fontSize: "0.85rem", lineHeight: "1.5" }}>
            A complete online learning system for students and instructors. Learn, teach, and grow your skills with ease.
          </p>
        </div>

        {/* Column 2 */}
        <div style={columnStyle}>
          <h6 style={{ fontWeight: "bold", marginBottom: "10px" }}>Quick Links</h6>
          <a href="/courses" style={linkStyle}>Courses</a>
          <a href="/aboutus" style={linkStyle}>About Us</a>
          <a href="/contactus" style={linkStyle}>Contact Us</a>
        </div>

        {/* Column 3 */}
        <div style={columnStyle}>
          <h6 style={{ fontWeight: "bold", marginBottom: "10px" }}>Resources</h6>
          <a href="/privacy" style={linkStyle}>Privacy Policy</a>
          <a href="/terms" style={linkStyle}>Terms & Conditions</a>
          <a href="/support" style={linkStyle}>Support</a>
        </div>

        {/* Column 4 */}
        <div style={columnStyle}>
          <h6 style={{ fontWeight: "bold", marginBottom: "10px" }}>Follow Us</h6>
          <div style={{ display: "flex", marginTop: "5px" }}>
            <FaFacebookF style={socialIconStyle} onMouseEnter={socialIconHover} onMouseLeave={socialIconLeave} />
            <FaTwitter style={socialIconStyle} onMouseEnter={socialIconHover} onMouseLeave={socialIconLeave} />
            <FaInstagram style={socialIconStyle} onMouseEnter={socialIconHover} onMouseLeave={socialIconLeave} />
            <FaLinkedinIn style={socialIconStyle} onMouseEnter={socialIconHover} onMouseLeave={socialIconLeave} />
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={bottomStyle}>
        © {new Date().getFullYear()} LMS Platform. All Rights Reserved.
      </div>
    </footer>
  );
}
