import { useState, useEffect } from "react";
import api from "../api/api"; // Ensure this path matches your project structure

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: "", type: "" });

  // --- History State ---
  const [lookupEmail, setLookupEmail] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // --- Handlers for New Message Form ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      if (selectedFile.type.startsWith("image/")) {
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);
      } else {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  };

  const removeAttachment = () => {
    setFile(null);
    setPreview(null);
    const fileInput = document.getElementById("fileInput");
    if (fileInput) fileInput.value = ""; 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ text: "", type: "" });

    const data = new FormData();
    data.append("name", formData.name);
    data.append("email", formData.email);
    data.append("subject", "Contact Form Message");
    data.append("message", formData.message);
    if (file) {
      data.append("attachment", file);
    }

    try {
      await api.post("/contact", data);
      setStatus({ text: "Your message has been sent successfully!", type: "success" });
      
      // If they are currently looking at their history, refresh it
      if (historyFetched && lookupEmail === formData.email) {
        fetchHistory(formData.email);
      }

      setFormData({ name: "", email: "", message: "" });
      removeAttachment(); 
      setTimeout(() => setStatus({ text: "", type: "" }), 5000);
    } catch (error) {
      setStatus({ text: "Something went wrong. Please try again.", type: "error" });
    }

    setLoading(false);
  };

  // --- Handlers for Ticket History ---
  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (lookupEmail) fetchHistory(lookupEmail);
  };

  const fetchHistory = async (emailToFetch) => {
    setHistoryLoading(true);
    setHistoryFetched(true);
    try {
      const res = await api.get(`/contact/history/${emailToFetch}`);
      setHistory(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch history");
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  return (
    <div className="contact-layout" style={{ marginTop: "-1.5%"}}>
      
      <div className="contact-hero">
        <h1 className="hero-title">Get in Touch</h1>
        <p className="hero-subtitle">
          We're here to help! Reach out for support, questions, or feedback.
        </p>
      </div>

      <div className="contact-container">
        
        {/* Top Layout: Form and Details */}
        <div className="contact-grid">
          
          {/* Main Contact Form */}
          <div className="contact-card">
            <h3 className="card-title">Send us a Message</h3>

            {status.text && (
              <div className={`status-banner ${status.type}`}>
                {status.type === 'success' ? '✓' : '⚠'} {status.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" name="name" className="modern-input" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" name="email" className="modern-input" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea name="message" className="modern-input textarea" rows="4" placeholder="How can we help you?" value={formData.message} onChange={handleChange} required ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Attachment <span className="text-muted">(Optional)</span></label>
                <input id="fileInput" type="file" className="modern-file-input" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" />
                <span className="input-hint">Upload a screenshot or document if needed.</span>

                {preview && (
                  <div className="preview-container">
                    <img src={preview} alt="Upload Preview" className="preview-image" />
                    <button type="button" onClick={removeAttachment} className="btn-remove" title="Remove image">✕</button>
                  </div>
                )}

                {file && !preview && (
                  <div className="document-preview">
                    <span className="doc-name">📎 {file.name}</span>
                    <button type="button" onClick={removeAttachment} className="btn-remove-text">Remove</button>
                  </div>
                )}
              </div>

              <button disabled={loading} className="btn-submit">
                {loading ? <span className="loading-state"><div className="mini-spinner"></div> Sending...</span> : "Send Message"}
              </button>
            </form>
          </div>

          {/* Details & Map */}
          <div className="contact-card details-card">
            <h3 className="card-title">Our Contact Details</h3>

            <div className="info-list">
              <div className="info-item">
                <div className="info-icon">✉</div>
                <div>
                  <span className="info-label">Email Us</span>
                  <strong className="info-value">support@lms.com</strong>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">☏</div>
                <div>
                  <span className="info-label">Call Us</span>
                  <strong className="info-value">+91 9876543210</strong>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📍</div>
                <div>
                  <span className="info-label">Visit Us</span>
                  <strong className="info-value">Valsad, Gujarat, India</strong>
                </div>
              </div>
            </div>

            <div className="map-container">
              <iframe title="map" width="100%" height="100%" className="google-map" loading="lazy" allowFullScreen src="https://maps.google.com/maps?q=Valsadt&t=&z=13&ie=UTF8&iwloc=&output=embed"></iframe>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: TICKET HISTORY */}
        <div className="history-section">
          <div className="history-header">
            <h2 className="history-title">Track Your Support History</h2>
            <p className="history-subtitle">Enter your email to view your past messages and admin responses.</p>
            
            <form onSubmit={handleLookupSubmit} className="history-lookup-form">
              <input 
                type="email" 
                className="modern-input" 
                placeholder="Enter your email address" 
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn-submit lookup-btn">
                {historyLoading ? "Searching..." : "View History"}
              </button>
            </form>
          </div>

          {historyFetched && !historyLoading && (
            <div className="history-results">
              {history.length === 0 ? (
                <div className="empty-history">
                  <span className="empty-icon">📭</span>
                  <p>No previous support tickets found for <strong>{lookupEmail}</strong>.</p>
                </div>
              ) : (
                <div className="ticket-list">
                  {history.map((ticket) => (
                    <div key={ticket._id} className={`ticket-card ${ticket.status.toLowerCase()}`}>
                      <div className="ticket-header">
                        <div className="ticket-meta">
                          <span className="ticket-date">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                          <span className={`pill ${ticket.status.toLowerCase()}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <h4 className="ticket-subject">{ticket.subject}</h4>
                      </div>
                      
                      <div className="ticket-body">
                        <p className="section-label">Your Message</p>
                        <div className="message-content">{ticket.message}</div>
                      </div>

                      {ticket.status === "Resolved" && ticket.adminResponse && (
                        <div className="ticket-response">
                          <p className="section-label success-label">Admin Response</p>
                          <div className="response-content">{ticket.adminResponse}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <style>{`
        :root {
          --primary: #7c3aed;
          --primary-hover: #6d28d9;
          --bg-main: #f8fafc;
          --bg-card: #ffffff;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --border-color: #e2e8f0;
          --success-bg: #dcfce7;
          --success-text: #166534;
          --warning-bg: #fef3c7;
          --warning-text: #92400e;
          --danger-bg: #fee2e2;
          --danger-text: #991b1b;
          --radius-lg: 20px;
          --radius-md: 12px;
          --shadow-sm: 0 4px 6px -1px rgba(0,0,0,0.05);
          --shadow-md: 0 10px 25px -5px rgba(0,0,0,0.05);
        }

        .contact-layout {
          background-color: var(--bg-main);
          min-height: 100vh;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text-main);
          padding-bottom: 5rem;
        }

        /* Hero Section */
        .contact-hero { background: #ede9fe; padding: 4rem 2rem; text-align: center; border-bottom: 1px solid #ddd6fe; margin-bottom: -3rem; }
        .hero-title { color: var(--primary); font-size: 2.5rem; font-weight: 800; margin: 0 0 0.5rem 0; letter-spacing: -0.025em; }
        .hero-subtitle { color: #5b21b6; font-size: 1.1rem; margin: 0; opacity: 0.8; max-width: 600px; margin: 0 auto; }

        /* Grid Layout */
        .contact-container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; position: relative; z-index: 10; }
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 3rem; }
        @media (max-width: 850px) { .contact-grid { grid-template-columns: 1fr; } }

        /* Cards */
        .contact-card { background: var(--bg-card); border-radius: var(--radius-lg); padding: 2.5rem; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; }
        .card-title { font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin: 0 0 1.5rem 0; }

        /* Status Banner */
        .status-banner { padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; animation: slideDown 0.3s ease-out; }
        .status-banner.success { background: var(--success-bg); color: var(--success-text); border: 1px solid #bbf7d0; }
        .status-banner.error { background: var(--danger-bg); color: var(--danger-text); border: 1px solid #fecaca; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* Form Elements */
        .form-group { margin-bottom: 1.5rem; }
        .form-label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main); }
        .text-muted { color: var(--text-muted); font-weight: 400; }
        
        .modern-input { width: 100%; padding: 0.875rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: #f8fafc; font-family: inherit; font-size: 0.95rem; transition: all 0.2s ease; box-sizing: border-box; }
        .modern-input:focus { outline: none; border-color: var(--primary); background: #ffffff; box-shadow: 0 0 0 4px #ede9fe; }
        .textarea { resize: vertical; min-height: 120px; }

        .modern-file-input { display: block; width: 100%; padding: 0.5rem; border: 1px dashed #cbd5e1; border-radius: var(--radius-md); background: #f8fafc; cursor: pointer; font-size: 0.9rem; }
        .input-hint { display: block; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; }

        .preview-container { position: relative; display: inline-block; margin-top: 1rem; }
        .preview-image { max-width: 100%; max-height: 160px; border-radius: var(--radius-md); border: 1px solid var(--border-color); object-fit: contain; display: block; }
        .btn-remove { position: absolute; top: -10px; right: -10px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.1s; }
        .btn-remove:hover { transform: scale(1.1); background: #dc2626; }
        .document-preview { margin-top: 1rem; padding: 0.75rem 1rem; background: #f1f5f9; border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; }
        .doc-name { font-size: 0.9rem; font-weight: 500; color: #334155; }
        .btn-remove-text { background: none; border: none; color: #ef4444; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0; }
        .btn-remove-text:hover { text-decoration: underline; }

        /* Buttons */
        .btn-submit { width: 100%; background: var(--primary); color: white; border: none; padding: 1rem; border-radius: var(--radius-md); font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.2); }
        .btn-submit:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 6px 8px -1px rgba(124, 58, 237, 0.3); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .loading-state { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .mini-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; }

        /* Contact Details */
        .details-card { background: #faf5ff; border: 1px solid #e9d5ff; }
        .info-list { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2.5rem; }
        .info-item { display: flex; align-items: flex-start; gap: 1rem; }
        .info-icon { width: 42px; height: 42px; border-radius: 12px; background: #ede9fe; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .info-label { display: block; font-size: 0.85rem; color: var(--text-muted); font-weight: 500; margin-bottom: 0.25rem; }
        .info-value { display: block; font-size: 1rem; color: var(--text-main); font-weight: 600; }
        .map-container { flex-grow: 1; min-height: 250px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); }
        .google-map { border: 0; }

        /* History Section */
        .history-section { background: var(--bg-card); border-radius: var(--radius-lg); padding: 2.5rem; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); }
        .history-header { text-align: center; max-width: 600px; margin: 0 auto 2rem auto; }
        .history-title { font-size: 1.75rem; font-weight: 800; color: var(--primary); margin: 0 0 0.5rem 0; }
        .history-subtitle { color: var(--text-muted); font-size: 1rem; margin-bottom: 1.5rem; }
        
        .history-lookup-form { display: flex; gap: 1rem; }
        .history-lookup-form .modern-input { flex-grow: 1; }
        .lookup-btn { width: auto; padding: 0.875rem 1.5rem; white-space: nowrap; }

        @media (max-width: 600px) { .history-lookup-form { flex-direction: column; } .lookup-btn { width: 100%; } }

        .empty-history { text-align: center; padding: 3rem; color: var(--text-muted); background: #f8fafc; border-radius: var(--radius-md); border: 1px dashed var(--border-color); }
        .empty-history .empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.5; }

        .ticket-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .ticket-card { border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; }
        .ticket-card.pending { border-left: 4px solid #fbbf24; }
        .ticket-card.resolved { border-left: 4px solid #22c55e; }
        
        .ticket-header { padding: 1.25rem; background: #f8fafc; border-bottom: 1px solid var(--border-color); }
        .ticket-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .ticket-date { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .ticket-subject { margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 700; }
        
        .pill { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
        .pill.resolved { background: var(--success-bg); color: var(--success-text); }
        .pill.pending { background: var(--warning-bg); color: var(--warning-text); }

        .ticket-body { padding: 1.25rem; }
        .section-label { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em; margin: 0 0 0.5rem 0; }
        .message-content { color: #334155; line-height: 1.6; font-size: 0.95rem; white-space: pre-wrap; }

        .ticket-response { padding: 1.25rem; background: var(--success-bg); border-top: 1px solid #bbf7d0; }
        .success-label { color: var(--success-text); }
        .response-content { color: var(--success-text); font-weight: 500; line-height: 1.6; font-size: 0.95rem; white-space: pre-wrap; }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}