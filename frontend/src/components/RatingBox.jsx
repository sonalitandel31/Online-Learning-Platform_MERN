import { useEffect, useState } from "react";
import api from "../api/api";

function RatingBox({ courseId, token, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingMine, setLoadingMine] = useState(true);
  const [hasExisting, setHasExisting] = useState(false);
  const [message, setMessage] = useState("");

  // Load previous rating
  useEffect(() => {
    const fetchMyRating = async () => {
      try {
        setLoadingMine(true);

        const { data } = await api.get(
          `/courses/${courseId}/my-rating`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const r = data?.rating;

        if (r) {
          setHasExisting(true);
          setRating(Number(r.rating || 0));
          setReview(r.review || "");
        } else {
          setHasExisting(false);
        }
      } catch (err) {
        setHasExisting(false);
      } finally {
        setLoadingMine(false);
      }
    };

    if (courseId && token) fetchMyRating();
  }, [courseId, token]);

  const handleSubmit = async () => {
    if (!rating) return setMessage("Please select rating ⭐");

    try {
      setSaving(true);
      setMessage("");

      await api.post(
        `/courses/${courseId}/rate`,
        { rating, review },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setHasExisting(true);
      setMessage(hasExisting ? "Rating updated ✅" : "Rating submitted ✅");

      if (onSuccess) await onSuccess();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to submit rating");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-top">
      <div className="fw-bold mb-2">Rate this course</div>

      {/* Star selector */}
      <div className="d-flex gap-1 mb-2">
        {[1,2,3,4,5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            style={{
              background: "none",
              border: "none",
              fontSize: "22px",
              color: s <= rating ? "#f59e0b" : "#cbd5e1",
              cursor: "pointer"
            }}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        className="form-control"
        rows={2}
        placeholder="Write review (optional)"
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />

      <button
        className="btn btn-dark w-100 mt-2"
        onClick={handleSubmit}
        disabled={saving || loadingMine}
      >
        {saving ? "Saving..." : hasExisting ? "Update Rating" : "Submit Rating"}
      </button>

      {message && (
        <div className="small text-muted mt-2">{message}</div>
      )}
    </div>
  );
}

export default RatingBox;