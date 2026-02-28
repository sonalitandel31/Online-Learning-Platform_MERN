import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Card, Alert, Spinner, Row, Col } from "react-bootstrap";

export default function PlatformRules() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [commission, setCommission] = useState(30);
  const [instructorShare, setInstructorShare] = useState(70);
  const [approvalMode, setApprovalMode] = useState("manual");
  const [rejectionReasons, setRejectionReasons] = useState([]);

  useEffect(() => {
    const fetchRules = async () => {
      setError("");
      setLoading(true);
      try {
        // backend: GET /api/system-settings/public
        const res = await api.get("/system-settings/public");
        const s = res.data || {};

        setCommission(Number(s.commission ?? 30));
        setInstructorShare(Number(s.instructorShare ?? (100 - (s.commission ?? 30))));
        setApprovalMode(s.approvalMode || "manual");
        setRejectionReasons(Array.isArray(s.rejectionReasons) ? s.rejectionReasons : []);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load platform rules");
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, []);

  const styles = {
    container: {
      padding: "1.5rem",
      backgroundColor: "#f8f9fc",
      minHeight: "100vh",
      fontFamily: "'Segoe UI', sans-serif",
    },
    heading: {
      color: "#6f42c1",
      fontWeight: 700,
      textAlign: "center",
      marginBottom: "1.5rem",
    },
    card: {
      borderRadius: "14px",
      border: "none",
      boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
    },
    sectionTitle: {
      color: "#6f42c1",
      fontWeight: 700,
      marginBottom: "10px",
    },
    rowItem: {
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0",
      borderBottom: "1px solid #eee",
      fontSize: "0.95rem",
      color: "#333",
    },
    key: { fontWeight: 600 },
    pill: {
      display: "inline-block",
      background: "#f2ecff",
      color: "#5a2ea6",
      padding: "6px 10px",
      borderRadius: "999px",
      fontSize: "0.85rem",
      marginRight: "8px",
      marginBottom: "8px",
      border: "1px solid #e6dbff",
    },
    note: {
      background: "#fff",
      border: "1px solid #eee",
      borderRadius: "10px",
      padding: "12px",
      fontSize: "0.9rem",
      color: "#333",
    },
  };

  const approvalLabel =
    approvalMode === "auto" ? "Auto (Published automatically)" : "Manual (Admin approval required)";

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Platform Rules & Commission</h2>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}>
          <Spinner animation="border" />
        </div>
      ) : (
        <Row className="justify-content-center">
          <Col xs={12} md={10} lg={8}>
            {error ? <Alert variant="danger">{error}</Alert> : null}

            <Card style={styles.card}>
              <Card.Body>
                <h5 style={styles.sectionTitle}>Commission</h5>

                <div style={styles.rowItem}>
                  <div style={styles.key}>Platform Commission</div>
                  <div>{commission}%</div>
                </div>

                <div style={styles.rowItem}>
                  <div style={styles.key}>Your Share</div>
                  <div>{instructorShare}%</div>
                </div>

                <div style={{ ...styles.note, marginTop: "12px" }}>
                  <b>Example:</b> If a student pays <b>₹1000</b>, your earning is approx{" "}
                  <b>₹{Math.round((1000 * instructorShare) / 100)}</b> (before taxes/fees if applicable).
                </div>

                <hr />

                <h5 style={styles.sectionTitle}>Content Approval</h5>

                <div style={styles.rowItem}>
                  <div style={styles.key}>Approval Mode</div>
                  <div>{approvalLabel}</div>
                </div>

                <div style={{ ...styles.note, marginTop: "12px" }}>
                  <b>How it works:</b>
                  <ul style={{ marginTop: "8px", marginBottom: 0, paddingLeft: "18px" }}>
                    <li>Create / update your course normally.</li>
                    <li>Submit for approval (or admin reviews, based on your workflow).</li>
                    <li>
                      If rejected, you will see the exact <b>reason</b> and <b>review note</b> on your course.
                    </li>
                  </ul>
                </div>

                <hr />

                <h5 style={styles.sectionTitle}>Common Rejection Reasons</h5>

                {rejectionReasons.length === 0 ? (
                  <div style={styles.note}>No rejection reasons configured yet.</div>
                ) : (
                  <div>
                    {rejectionReasons.map((r) => (
                      <span key={r} style={styles.pill}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}