import React, { useEffect, useState } from "react";
import api from "../../../api/api";

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  
  // Inline UI State
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);

  const showStatus = (text, type = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: "", type: "" }), 3000);
  };

  const fetchCats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (err) {
      showStatus("Error loading categories", "error");
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await api.post("/categories/create", { name: newCategory });
      setNewCategory("");
      showStatus("Category added successfully!");
      fetchCats();
    } catch (err) {
      showStatus("Failed to add category", "error");
    }
  };

  const approveCategory = async (id) => {
    try {
      await api.put(`/categories/approve/${id}`);
      showStatus("Category approved");
      fetchCats();
    } catch (err) {
      showStatus("Action failed", "error");
    }
  };

  const rejectCategory = async (id) => {
    try {
      await api.put(`/categories/reject/${id}`);
      showStatus("Category rejected");
      fetchCats();
    } catch (err) {
      showStatus("Action failed", "error");
    }
  };

  const deleteCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      showStatus("Category deleted", "error");
      setConfirmDeleteId(null);
      fetchCats();
    } catch (err) {
      showStatus("Delete failed", "error");
    }
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/categories/update/${id}`, { name: editName });
      setEditingId(null);
      setEditName("");
      showStatus("Updated successfully");
      fetchCats();
    } catch (err) {
      showStatus("Update failed", "error");
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const highlightText = (text) => {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, "gi");
    return text.replace(regex, "<mark style='background:#e9d5ff; border-radius:2px;'>$1</mark>");
  };

  return (
    <div className="manage-container">
      <div className="header-flex">
        <h2 className="title">Manage Categories</h2>
        {statusMessage.text && (
          <div className={`status-pill ${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="action-bar">
        <div className="input-group">
          <input
            type="text"
            className="main-input"
            placeholder="Enter new category..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addCategory()}
          />
          <button onClick={addCategory} className="btn-primary">Add</button>
        </div>

        <input
          type="text"
          placeholder="🔍 Search..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <div className="table-header desktop-only">
          <div>Category</div>
          <div>Status</div>
          <div>Requested By</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        <div className="table-body">
          {loading ? (
             <div className="empty-state">Refreshing list...</div>
          ) : categories
            .filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase()))
            .map((cat) => (
              <div key={cat._id} className="table-row">
                <div className="cell name-cell">
                  {editingId === cat._id ? (
                    <input
                      type="text"
                      className="edit-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: highlightText(cat.name) }} />
                  )}
                </div>

                <div className="cell">
                  <span className={`badge-status ${cat.status}`}>{cat.status}</span>
                </div>

                <div className="cell meta-cell">
                  {cat.suggestedBy ? (
                    <span>{cat.suggestedBy.name} <small className="email-text">({cat.suggestedBy.email})</small></span>
                  ) : "Admin"}
                </div>

                <div className="cell actions-cell">
                  {editingId === cat._id ? (
                    <div className="btn-group">
                      <button onClick={() => saveEdit(cat._id)} className="btn-save">Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-cancel">Cancel</button>
                    </div>
                  ) : confirmDeleteId === cat._id ? (
                    <div className="btn-group confirm-ui">
                      <span className="confirm-text">Are you sure?</span>
                      <button onClick={() => deleteCategory(cat._id)} className="btn-confirm-yes">Yes</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="btn-cancel">No</button>
                    </div>
                  ) : (
                    <div className="btn-group">
                      {cat.status === "pending" && (
                        <>
                          <button onClick={() => approveCategory(cat._id)} className="btn-approve">Approve</button>
                          <button onClick={() => rejectCategory(cat._id)} className="btn-reject">Reject</button>
                        </>
                      )}
                      <button onClick={() => { setEditingId(cat._id); setEditName(cat.name); }} className="btn-edit">Edit</button>
                      <button onClick={() => setConfirmDeleteId(cat._id)} className="btn-delete">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
          {!loading && categories.length === 0 && (
            <div className="empty-state">No categories found.</div>
          )}
        </div>
      </div>

      <style>{`
        .manage-container { background: #ffffff; padding: 20px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); font-family: 'Inter', sans-serif; max-width: 1200px; margin: auto; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 10px; }
        .title { color: #6a0dad; margin: 0; font-size: 1.5rem; }

        /* Status Pill Instead of Toast */
        .status-pill { padding: 8px 16px; border-radius: 30px; font-size: 0.85rem; font-weight: 600; animation: fadeIn 0.3s ease; }
        .status-pill.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .status-pill.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        .action-bar { display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px; }
        .input-group { display: flex; gap: 8px; flex: 2; }
        .main-input, .search-input, .edit-input { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; outline: none; }
        .btn-primary { background: #6a0dad; color: white; border: none; padding: 0 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
        
        .table-wrapper { border-radius: 12px; border: 1px solid #f1f5f9; }
        .table-header { display: grid; grid-template-columns: 2fr 1fr 2fr 2.5fr; background: #f8fafc; padding: 15px; font-weight: 700; color: #64748b; font-size: 0.9rem; }
        .table-row { display: grid; grid-template-columns: 2fr 1fr 2fr 2.5fr; padding: 15px; border-bottom: 1px solid #f1f5f9; align-items: center; }
        
        .badge-status { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: capitalize; }
        .badge-status.approved { background: #dcfce7; color: #166534; }
        .badge-status.pending { background: #fef9c3; color: #854d0e; }
        .badge-status.rejected { background: #fee2e2; color: #991b1b; }

        .btn-group { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-group button { padding: 6px 12px; border-radius: 6px; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        
        .btn-approve { background: #6a0dad; color: white; }
        .btn-reject { background: #fee2e2; color: #991b1b; }
        .btn-edit { background: #f1f5f9; color: #475569; }
        .btn-delete { background: #7f1d1d; color: white; }
        .btn-confirm-yes { background: #dc2626; color: white; }
        .btn-save { background: #059669; color: white; }
        .btn-cancel { background: #94a3b8; color: white; }
        
        .confirm-ui { background: #fff1f2; padding: 4px 8px; border-radius: 8px; align-items: center; border: 1px solid #fda4af; }
        .confirm-text { font-size: 0.75rem; color: #9f1239; font-weight: 700; margin-right: 5px; }

        .empty-state { padding: 40px; text-align: center; color: #94a3b8; grid-column: span 4; }

        @media (max-width: 900px) {
          .table-header.desktop-only { display: none; }
          .table-row { grid-template-columns: 1fr; gap: 12px; padding: 20px; border-bottom: 8px solid #f8fafc; }
          .cell { display: flex; align-items: center; justify-content: space-between; }
          .mobile-label { display: block; font-weight: 700; color: #94a3b8; font-size: 0.75rem; }
          .btn-group { justify-content: flex-start; width: 100%; margin-top: 5px; }
          .email-text { display: inline; }
        }
        @media (min-width: 600px) { .action-bar { flex-direction: row; } .search-input { max-width: 300px; } }
      `}</style>
    </div>
  );
}