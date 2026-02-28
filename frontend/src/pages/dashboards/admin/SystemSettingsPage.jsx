import React, { useEffect, useState } from "react";
import api from "../../../api/api";
import { Button, Form, Card, Alert, Spinner, Row, Col } from "react-bootstrap";

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form state
  const [defaultPlatformCommission, setDefaultPlatformCommission] = useState(30);
  const [mode, setMode] = useState("manual");
  const [noteRequired, setNoteRequired] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState([]);

  // add reason
  const [newReason, setNewReason] = useState("");

  // messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await api.get("/system-settings/admin");
      const s = res.data;

      setDefaultPlatformCommission(s?.defaultPlatformCommission ?? 30);
      setMode(s?.contentApproval?.mode || "manual");
      setNoteRequired(s?.contentApproval?.reviewNoteRequiredOnReject ?? true);
      setRejectionReasons(s?.contentApproval?.rejectionReasons || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const addReason = () => {
    const r = String(newReason || "").trim();
    if (!r) return;

    // prevent duplicates (case-insensitive)
    const exists = rejectionReasons.some((x) => x.toLowerCase() === r.toLowerCase());
    if (exists) {
      setNewReason("");
      return;
    }

    setRejectionReasons((prev) => [...prev, r]);
    setNewReason("");
  };

  const removeReason = (idx) => {
    setRejectionReasons((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setError("");
    setSuccess("");

    const commissionNum = Number(defaultPlatformCommission);
    if (Number.isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      setError("Platform commission must be between 0 and 100.");
      return;
    }

    if (!["manual", "auto"].includes(mode)) {
      setError("Invalid approval mode.");
      return;
    }

    // sanitize reasons
    const cleanedReasons = (rejectionReasons || [])
      .map((x) => String(x).trim())
      .filter(Boolean);

    if (cleanedReasons.length === 0) {
      setError("Please add at least 1 rejection reason.");
      return;
    }

    try {
      setSaving(true);

      await api.put("/system-settings/admin", {
        defaultPlatformCommission: commissionNum,
        contentApproval: {
          mode,
          reviewNoteRequiredOnReject: !!noteRequired,
          rejectionReasons: cleanedReasons,
        },
      });

      setSuccess("Settings saved successfully.");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

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
    label: { fontWeight: 600, color: "#6f42c1" },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "#f2ecff",
      color: "#5a2ea6",
      padding: "6px 10px",
      borderRadius: "999px",
      fontSize: "0.85rem",
      marginRight: "8px",
      marginBottom: "8px",
      border: "1px solid #e6dbff",
    },
    pillBtn: {
      border: "none",
      background: "transparent",
      color: "#dc3545",
      fontWeight: 800,
      cursor: "pointer",
      lineHeight: 1,
    },
    infoBox: {
      background: "#fff",
      border: "1px solid #eee",
      borderRadius: "10px",
      padding: "12px",
      fontSize: "0.9rem",
      color: "#333",
    },
  };

  const instructorShare = Math.max(0, 100 - Number(defaultPlatformCommission || 0));

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>System Settings</h2>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}>
          <Spinner animation="border" />
        </div>
      ) : (
        <Row className="justify-content-center">
          <Col xs={12} md={10} lg={8}>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            {success ? <Alert variant="success">{success}</Alert> : null}

            <Card style={styles.card}>
              <Card.Body>
                {/* Commission */}
                <h5 style={{ color: "#6f42c1", fontWeight: 700, marginBottom: "12px" }}>
                  Commission
                </h5>

                <Form.Group className="mb-3">
                  <Form.Label style={styles.label}>Default Platform Commission (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    max={100}
                    value={defaultPlatformCommission}
                    onChange={(e) => setDefaultPlatformCommission(e.target.value)}
                    placeholder="e.g. 30"
                  />
                  <Form.Text muted>
                    Instructor share will be <b>{instructorShare}%</b> (100 - platform commission).
                  </Form.Text>
                </Form.Group>

                <hr />

                {/* Approval */}
                <h5 style={{ color: "#6f42c1", fontWeight: 700, marginBottom: "12px" }}>
                  Content Approval Rules
                </h5>

                <Form.Group className="mb-3">
                  <Form.Label style={styles.label}>Approval Mode</Form.Label>
                  <Form.Select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="manual">Manual (Admin approval required)</option>
                    <option value="auto">Auto (Approve on submit)</option>
                  </Form.Select>
                  
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="noteRequiredSwitch"
                    label="Require review note when rejecting a course"
                    checked={noteRequired}
                    onChange={(e) => setNoteRequired(e.target.checked)}
                  />
                </Form.Group>

                <hr />

                {/* Rejection reasons */}
                <h5 style={{ color: "#6f42c1", fontWeight: 700, marginBottom: "12px" }}>
                  Rejection Reasons (Shown to Instructor)
                </h5>

                <div style={{ marginBottom: "10px" }}>
                  {rejectionReasons.length === 0 ? (
                    <div style={styles.infoBox}>
                      No reasons added yet. Add at least one reason.
                    </div>
                  ) : (
                    rejectionReasons.map((r, idx) => (
                      <span key={`${r}-${idx}`} style={styles.pill}>
                        {r}
                        <button
                          type="button"
                          style={styles.pillBtn}
                          onClick={() => removeReason(idx)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <Row className="g-2 align-items-center">
                  <Col xs={12} md={9}>
                    <Form.Control
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      placeholder="Add new rejection reason..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addReason();
                        }
                      }}
                    />
                  </Col>
                  <Col xs={12} md={3}>
                    <Button
                      variant="outline-primary"
                      style={{ width: "100%" }}
                      onClick={addReason}
                      disabled={!String(newReason || "").trim()}
                    >
                      Add
                    </Button>
                  </Col>
                </Row>

                <hr />

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <Button variant="secondary" onClick={fetchSettings} disabled={saving}>
                    Reset
                  </Button>
                  <Button variant="primary" onClick={save} disabled={saving}>
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}