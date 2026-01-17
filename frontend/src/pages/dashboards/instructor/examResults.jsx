import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import DashboardLayout from "../dashboardLayout";

export default function ExamResults() {
  const { examId } = useParams();
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { data } = await axios.get(`/instructor/exam-results/${examId}`);
        setResults(data.results || []);
      } catch (error) {
        console.error("Fetch exam results error:", error);
        setResults([]);
      }
    };

    fetchResults();
  }, [examId]);

  return (
    <>
      <h3 className="text-purple mb-4">Exam Results</h3>

      {results.length === 0 ? (
  <p>No results yet.</p>
) : (
  <div className="table-responsive">
    <table className="table table-striped table-hover">
      <thead>
        <tr>
          <th>#</th>
          <th>Student Name</th>
          <th>Email</th>
          <th>Score</th>
          <th>Attempts</th>
          <th>Completed</th>
          <th>Last Attempt</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, index) => (
          <tr key={r.student._id}>
            <td>{index + 1}</td>
            <td>{r.student?.name || "N/A"}</td>
            <td>{r.student?.email || "N/A"}</td>
            <td>{r.score}</td>
            <td>{r.attempts}</td>
            <td>{r.isCompleted ? "Yes" : "No"}</td>
            <td>{r.lastAttemptAt ? new Date(r.lastAttemptAt).toLocaleString() : "N/A"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

      </>
  );
}
