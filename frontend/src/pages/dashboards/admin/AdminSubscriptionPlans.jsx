import { useEffect, useState } from "react";
import api from "../../../api/api";
import { 
  Plus, 
  List, 
  RefreshCw, 
  Edit3, 
  ToggleLeft, 
  Link as LinkIcon, 
  CheckCircle, 
  AlertCircle, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Settings,
  DollarSign,
  Layers,
  Layout
} from "lucide-react";

export default function AdminSubscriptionPlans() {
  // ---------------------------
  // 1. STATE MANAGEMENT
  // ---------------------------
  const [tab, setTab] = useState("list"); // View Toggle: list | create

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [msg, setMsg] = useState({ type: "", text: "" });
  const notify = (type, text) => setMsg({ type, text });

  // Creation Form State (Preserving all fields)
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    currency: "INR",
    billingCycle: "monthly",
    accessType: "all",
    courseIds: [],
    trialDays: 0,
    isActive: true,
    sortOrder: 0,
    isFeatured: false,
  });

  // Edit Modal State (Preserving all fields)
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  // Individual action loading states (Toggle/Razorpay buttons)
  const [actionLoading, setActionLoading] = useState({});

  // Filtering, Searching, and Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [sortOption, setSortOption] = useState("newest");

  const [coursePage, setCoursePage] = useState(1);
  const [coursePages, setCoursePages] = useState(1);
  const [courseTotal, setCourseTotal] = useState(0);

  const COURSE_LIMIT = 8;

  // Helper to set action-specific loading (e.g., toggle loading for plan X)
  const setAction = (planId, key, val) => {
    setActionLoading((prev) => ({
      ...prev,
      [planId]: { ...(prev[planId] || {}), [key]: val },
    }));
  };

  // ---------------------------
  // 2. DATA FETCHING (API)
  // ---------------------------
  
  // Load all plans for the table
  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const { data } = await api.get("/subscription-plans");
      setPlans(data?.plans || []);
    } catch (e) {
      console.error(e);
      notify("danger", "Failed to load subscription plans");
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

  // Load courses for the "Selected Courses" selector
  const fetchCourses = async (page = 1) => {
    try {
      setCoursesLoading(true);
      const params = {
        page,
        limit: COURSE_LIMIT,
        approved: true,
        sort: sortOption,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategory) params.category = selectedCategory;

      const { data } = await api.get("/courses", { params });

      setCourses(data?.courses || []);
      setCoursePages(data?.pages || 1);
      setCourseTotal(data?.total || 0);
      setCoursePage(data?.page || 1);
    } catch {
      notify("danger", "Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  };

  // Load categories for the filter dropdown
  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data?.categories || data || []);
    } catch (err) {
      console.error("Category load failed");
    }
  };

  // ---------------------------
  // 3. EFFECTS (Lifecycle)
  // ---------------------------

  useEffect(() => {
    fetchPlans();
    fetchCategories();
  }, []);

  // Debounce search to wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCoursePage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Refetch courses when filters or pagination changes
  useEffect(() => {
    if (form.accessType === "selected" || (editOpen && editPlan?.accessType === "selected")) {
      fetchCourses(coursePage);
    }
  }, [form.accessType, editOpen, debouncedSearch, selectedCategory, sortOption, coursePage]);

  // Reset page when category or sort changes
  useEffect(() => {
    setCoursePage(1);
  }, [selectedCategory, sortOption]);

  // ---------------------------
  // 4. LOGIC HANDLERS
  // ---------------------------

  // Handle inputs for the Create Form
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "trialDays" || name === "sortOrder") ? Number(value || 0) : value,
    }));
  };

  // Add/Remove course from the creation selection
  const toggleCourseInForm = (courseId) => {
    setForm((prev) => {
      const set = new Set((prev.courseIds || []).map(String));
      const id = String(courseId);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, courseIds: Array.from(set) };
    });
  };

  // Add/Remove course from the edit modal selection
  const toggleCourseInEdit = (courseId) => {
    setEditPlan((prev) => {
      if (!prev) return prev;
      const set = new Set((prev.courseIds || []).map(String));
      const id = String(courseId);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, courseIds: Array.from(set) };
    });
  };

  const formatMoney = (p) => `₹${Number(p?.price || 0)}`;

  // Validator logic
  const validatePayload = (payload) => {
    if (!payload.name?.trim()) return "Plan name is required";
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price < 0) return "Price must be number >= 0";
    if (payload.accessType === "selected" && (!payload.courseIds || payload.courseIds.length === 0)) {
      return "Select at least 1 course for selected plan";
    }
    return null;
  };

  // API Call: Create Plan
  const createPlan = async (e) => {
    e.preventDefault();
    notify("", "");
    const payload = { 
        ...form, 
        price: Number(form.price),
        courseIds: form.accessType === "selected" ? form.courseIds : [] 
    };
    const err = validatePayload(payload);
    if (err) return notify("danger", err);

    try {
      setCreateLoading(true);
      const { data } = await api.post("/subscription-plans", payload);
      if (!data?.success) return notify("danger", data?.message || "Failed to create plan");
      notify("success", "Plan created successfully");
      setTab("list");
      setForm({ name: "", description: "", price: "", currency: "INR", billingCycle: "monthly", accessType: "all", courseIds: [], trialDays: 0, isActive: true, sortOrder: 0, isFeatured: false });
      fetchPlans();
    } catch (e) { notify("danger", "Server error creating plan"); } finally { setCreateLoading(false); }
  };

  // API Call: Toggle Active Status
  const toggleActive = async (planId) => {
    try {
      setAction(planId, "toggle", true);
      const { data } = await api.patch(`/subscription-plans/${planId}/toggle`);
      if (data?.success) { notify("success", "Plan status updated"); fetchPlans(); }
    } catch { notify("danger", "Toggle failed"); } finally { setAction(planId, "toggle", false); }
  };

  // API Call: Link to Razorpay
  const createRazorpayMapping = async (planId) => {
    try {
      setAction(planId, "razorpay", true);
      const { data } = await api.post(`/razorpay/plans/${planId}/create-razorpay-plan`);
      if (data?.success) { notify("success", "Linked successfully"); fetchPlans(); }
    } catch (e) { notify("danger", "Razorpay mapping failed"); } finally { setAction(planId, "razorpay", false); }
  };

  // Edit Modal Helpers
  const openEdit = (plan) => {
    setEditPlan({ ...plan, courseIds: Array.isArray(plan.courseIds) ? plan.courseIds.map(String) : [] });
    setEditOpen(true);
    notify("", "");
  };

  const closeEdit = () => { setEditOpen(false); setEditPlan(null); };

  const onEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditPlan((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "price" || name === "trialDays" || name === "sortOrder") ? Number(value || 0) : value,
    }));
  };

  const saveEdit = async () => {
    if (!editPlan?._id) return;
    const payload = { ...editPlan, courseIds: editPlan.accessType === "selected" ? editPlan.courseIds : [] };
    if (editPlan.providerPlanId) { delete payload.price; delete payload.billingCycle; }
    
    try {
      setEditSaving(true);
      const { data } = await api.put(`/subscription-plans/${editPlan._id}`, payload);
      if (data?.success) { notify("success", "Plan updated"); closeEdit(); fetchPlans(); }
    } catch (e) { notify("danger", "Update failed"); } finally { setEditSaving(false); }
  };

  // Styling Variables
  const colors = { primary: "#8b63f1", amber: "#f59e0b" };

  return (
    <div className="container py-4" style={{ maxWidth: 1150 }}>
      {/* --- HEADER --- */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: "#1e1b4b" }}>Subscription Plans</h2>
          <p className="text-muted mb-0">Manage pricing, access, and Razorpay mapping.</p>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group bg-white p-1 rounded-pill shadow-sm border">
            <button className={`btn rounded-pill px-4 border-0 ${tab === "list" ? "text-white shadow-sm" : "text-muted"}`} 
                    style={tab === "list" ? { backgroundColor: colors.primary } : {}} onClick={() => setTab("list")}><List size={18} className="me-1"/> List</button>
            <button className={`btn rounded-pill px-4 border-0 ${tab === "create" ? "text-white shadow-sm" : "text-muted"}`} 
                    style={tab === "create" ? { backgroundColor: colors.primary } : {}} onClick={() => setTab("create")}><Plus size={18} className="me-1"/> Create</button>
          </div>
          <button className="btn btn-white shadow-sm rounded-circle p-2 border" onClick={fetchPlans}><RefreshCw size={20} className="text-muted" /></button>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type} border-0 shadow-sm d-flex align-items-center gap-2 mb-4 animate__animated animate__fadeIn`} style={{ borderRadius: 12 }}>{msg.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}{msg.text}</div>}

      {/* --- LIST VIEW --- */}
      {tab === "list" && (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 20, overflow: "hidden" }}>
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="bg-light text-uppercase small fw-bold">
                <tr>
                  <th className="ps-4 py-3">Plan Info</th>
                  <th>Price</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Razorpay</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plansLoading ? <tr><td colSpan="6" className="text-center py-5"><div className="spinner-border text-primary" /></td></tr> : 
                  plans.map((p) => (
                    <tr key={p._id} className="hover-row">
                      <td className="ps-4">
                        <div className="fw-bold">{p.name} {p.isFeatured && <Star size={14} fill={colors.amber} color={colors.amber} />}</div>
                        <div className="small text-muted">Order: {p.sortOrder}</div>
                      </td>
                      <td><span className="fw-bold" style={{ color: colors.primary }}>{formatMoney(p)}</span> <span className="small text-muted text-capitalize">/ {p.billingCycle}</span></td>
                      <td className="small">{p.accessType === "all" ? "Full Access" : `${p.courseIds?.length} Courses`} <br/> <span className="text-muted">{p.trialDays}d Trial</span></td>
                      <td><span className={`badge rounded-pill px-3 ${p.isActive ? "bg-success-subtle text-success" : "bg-light text-muted"}`}>{p.isActive ? "Active" : "Inactive"}</span></td>
                      <td className="small">{p.providerPlanId ? <span className="text-info fw-bold">Linked</span> : <span className="text-muted">Not Linked</span>}</td>
                      <td className="pe-4 text-end">
                        <div className="dropdown">
                          <button className="btn btn-light btn-sm rounded-circle border" data-bs-toggle="dropdown"><Settings size={16} /></button>
                          <ul className="dropdown-menu dropdown-menu-end shadow border-0 p-2">
                            <li><button className="dropdown-item rounded-2" onClick={() => openEdit(p)}><Edit3 size={14} className="me-2"/> Edit Plan</button></li>
                            <li><button className="dropdown-item rounded-2" onClick={() => toggleActive(p._id)} disabled={actionLoading[p._id]?.toggle}><ToggleLeft size={14} className="me-2"/> Toggle Status</button></li>
                            <li><hr className="dropdown-divider"/></li>
                            <li><button className="dropdown-item rounded-2 text-primary" disabled={!!p.providerPlanId || actionLoading[p._id]?.razorpay} onClick={() => createRazorpayMapping(p._id)}><LinkIcon size={14} className="me-2"/> Link Razorpay</button></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CREATE VIEW --- */}
      {tab === "create" && (
        <form onSubmit={createPlan} className="card border-0 shadow-sm p-4 p-lg-5" style={{ borderRadius: 24 }}>
          <h5 className="fw-bold mb-4 d-flex align-items-center gap-2"><Layout className="text-primary" /> New Subscription Plan</h5>
          <div className="row g-4">
            <div className="col-md-6"><label className="form-label small fw-bold text-muted">PLAN NAME *</label><input className="form-control form-control-lg border-2" name="name" value={form.name} onChange={onChange} placeholder="e.g. Pro Monthly" required /></div>
            <div className="col-md-6"><label className="form-label small fw-bold text-muted">BILLING CYCLE *</label><select className="form-select form-select-lg border-2" name="billingCycle" value={form.billingCycle} onChange={onChange}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>
            <div className="col-12"><label className="form-label small fw-bold text-muted">DESCRIPTION</label><textarea className="form-control border-2" name="description" value={form.description} onChange={onChange} rows={2} placeholder="Short plan summary..." /></div>
            <div className="col-md-4"><label className="form-label small fw-bold text-muted">PRICE (INR) *</label><div className="input-group input-group-lg"><span className="input-group-text bg-light border-2"><DollarSign size={18}/></span><input className="form-control border-2" name="price" value={form.price} onChange={onChange} placeholder="0" /></div></div>
            <div className="col-md-4"><label className="form-label small fw-bold text-muted">CURRENCY</label><input className="form-control form-control-lg border-2 text-center" name="currency" value={form.currency} onChange={onChange} /></div>
            <div className="col-md-4"><label className="form-label small fw-bold text-muted">TRIAL DAYS</label><input type="number" className="form-control form-control-lg border-2" name="trialDays" value={form.trialDays} onChange={onChange} /></div>
            <div className="col-md-6"><label className="form-label small fw-bold text-muted">ACCESS TYPE</label><select className="form-select border-2" name="accessType" value={form.accessType} onChange={onChange}><option value="all">All Courses</option><option value="selected">Selected Courses</option></select></div>
            <div className="col-md-3"><label className="form-label small fw-bold text-muted">SORT ORDER</label><input type="number" className="form-control border-2" name="sortOrder" value={form.sortOrder} onChange={onChange} /></div>
            <div className="col-md-3 d-flex align-items-center gap-3 pt-4">
              <div className="form-check form-switch"><input className="form-check-input" type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={onChange} /><label className="form-check-label small fw-bold">FEATURED</label></div>
              <div className="form-check form-switch"><input className="form-check-input" type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} /><label className="form-check-label small fw-bold">ACTIVE</label></div>
            </div>

            {/* Course Selector for Create */}
            {form.accessType === "selected" && (
              <div className="col-12"><div className="p-4 bg-light rounded-4 border">
                <div className="d-flex justify-content-between mb-3"><h6 className="fw-bold mb-0">Select Courses *</h6><span className="badge rounded-pill px-3" style={{ backgroundColor: colors.primary }}>{form.courseIds.length} Selected</span></div>
                <div className="row g-2 mb-3">
                  <div className="col-md-4"><input className="form-control rounded-pill border-2" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                  <div className="col-md-4"><select className="form-select rounded-pill border-2" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}><option value="">All Categories</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                  <div className="col-md-4"><select className="form-select rounded-pill border-2" value={sortOption} onChange={e => setSortOption(e.target.value)}><option value="newest">Newest</option><option value="priceLow">Price: Low to High</option></select></div>
                </div>
                <div className="row g-2 overflow-auto shadow-inner bg-white p-2 rounded-3" style={{ maxHeight: 250 }}>
                  {courses.map(c => (
                    <div key={c._id} className="col-md-6">
                      <label className={`d-flex align-items-center gap-2 p-2 border rounded-3 transition-all ${form.courseIds.includes(String(c._id)) ? 'border-primary bg-primary-subtle' : ''}`} style={{ cursor: 'pointer' }}>
                        <input type="checkbox" className="form-check-input" checked={form.courseIds.includes(String(c._id))} onChange={() => toggleCourseInForm(c._id)} />
                        <span className="small fw-bold text-truncate">{c.title}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="d-flex justify-content-between mt-3 small text-muted">
                    <span>Page {coursePage} of {coursePages}</span>
                    <div className="btn-group">
                        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={coursePage === 1} onClick={() => setCoursePage(p => p - 1)}><ChevronLeft size={14}/></button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={coursePage === coursePages} onClick={() => setCoursePage(p => p + 1)}><ChevronRight size={14}/></button>
                    </div>
                </div>
              </div></div>
            )}
          </div>
          <div className="d-flex gap-2 mt-5">
            <button className="btn btn-lg text-white rounded-pill px-5 shadow" style={{ backgroundColor: colors.primary }} disabled={createLoading}>{createLoading ? "Saving..." : "Create Plan"}</button>
            <button type="button" className="btn btn-lg btn-light border rounded-pill px-4" onClick={() => setForm({ name: "", description: "", price: "", currency: "INR", billingCycle: "monthly", accessType: "all", courseIds: [], trialDays: 0, isActive: true, sortOrder: 0, isFeatured: false })}>Reset</button>
          </div>
        </form>
      )}

      {/* --- EDIT MODAL (Full Correction) --- */}
      {editOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: "rgba(15, 23, 42, 0.7)", zIndex: 9999, backdropFilter: "blur(6px)" }} onClick={closeEdit}>
          <div className="card border-0 shadow-lg w-100 p-4 p-lg-5 overflow-auto animate__animated animate__zoomIn animate__faster" style={{ maxWidth: 900, maxHeight: '95vh', borderRadius: 28 }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-content-between mb-4">
              <h4 className="fw-bold mb-0">Update Subscription Plan</h4>
              <button className="btn-close shadow-none" onClick={closeEdit}></button>
            </div>

            {editPlan?.providerPlanId && <div className="alert bg-warning-subtle border-0 rounded-4 small mb-4 d-flex align-items-center gap-2"><AlertCircle size={16} /> Pricing locked. Plan is already live on Razorpay.</div>}

            <div className="row g-3">
              <div className="col-md-6"><label className="small fw-bold text-muted">PLAN NAME</label><input className="form-control border-2" name="name" value={editPlan.name} onChange={onEditChange} /></div>
              <div className="col-md-3"><label className="small fw-bold text-muted">PRICE</label><input className="form-control border-2" type="number" name="price" value={editPlan.price} onChange={onEditChange} disabled={!!editPlan.providerPlanId} /></div>
              <div className="col-md-3"><label className="small fw-bold text-muted">CYCLE</label><select className="form-select border-2" name="billingCycle" value={editPlan.billingCycle} onChange={onEditChange} disabled={!!editPlan.providerPlanId}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>
              <div className="col-12"><label className="small fw-bold text-muted">DESCRIPTION</label><textarea className="form-control border-2" name="description" rows={2} value={editPlan.description} onChange={onEditChange} /></div>
              <div className="col-md-4"><label className="small fw-bold text-muted">CURRENCY</label><input className="form-control border-2" name="currency" value={editPlan.currency} onChange={onEditChange} /></div>
              <div className="col-md-4"><label className="small fw-bold text-muted">TRIAL DAYS</label><input className="form-control border-2" type="number" name="trialDays" value={editPlan.trialDays} onChange={onEditChange} /></div>
              <div className="col-md-4"><label className="small fw-bold text-muted">SORT ORDER</label><input className="form-control border-2" type="number" name="sortOrder" value={editPlan.sortOrder} onChange={onEditChange} /></div>
              <div className="col-md-6"><label className="small fw-bold text-muted">ACCESS TYPE</label><select className="form-select border-2" name="accessType" value={editPlan.accessType} onChange={onEditChange}><option value="all">Full Access</option><option value="selected">Selected Courses</option></select></div>
              <div className="col-md-6 d-flex align-items-end gap-3 pb-1">
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" name="isFeatured" checked={editPlan.isFeatured} onChange={onEditChange} /><label className="small fw-bold">FEATURED</label></div>
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" name="isActive" checked={editPlan.isActive} onChange={onEditChange} /><label className="small fw-bold">ACTIVE</label></div>
              </div>

              {/* RESTORED: Course Selector in Edit Modal */}
              {editPlan.accessType === "selected" && (
                <div className="col-12 mt-3"><div className="p-3 bg-light rounded-4 border">
                  <div className="d-flex justify-content-between mb-2"><span className="fw-bold small">Course Selection</span><span className="badge bg-primary rounded-pill">{(editPlan.courseIds || []).length} Selected</span></div>
                  <div className="row g-2 mb-2">
                    <div className="col-md-6"><input className="form-control form-control-sm rounded-pill" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <div className="col-md-6"><select className="form-select form-select-sm rounded-pill" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}><option value="">All Categories</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                  </div>
                  <div className="row g-2 overflow-auto bg-white p-2 rounded-3 border" style={{ maxHeight: 200 }}>
                    {courses.map(c => (
                      <div key={c._id} className="col-md-6">
                        <label className={`d-flex align-items-center gap-2 p-2 border rounded-3 transition-all ${editPlan.courseIds.includes(String(c._id)) ? 'border-primary bg-primary-subtle' : ''}`} style={{ cursor: 'pointer' }}>
                          <input type="checkbox" className="form-check-input" checked={editPlan.courseIds.includes(String(c._id))} onChange={() => toggleCourseInEdit(c._id)} />
                          <span className="small text-truncate">{c.title}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="d-flex justify-content-end gap-1 mt-2">
                      <button type="button" className="btn btn-xs btn-outline-secondary" disabled={coursePage === 1} onClick={() => setCoursePage(p => p - 1)}><ChevronLeft size={12}/></button>
                      <button type="button" className="btn btn-xs btn-outline-secondary" disabled={coursePage === coursePages} onClick={() => setCoursePage(p => p + 1)}><ChevronRight size={12}/></button>
                  </div>
                </div></div>
              )}
            </div>
            <div className="d-flex gap-2 mt-5">
              <button className="btn btn-lg text-white rounded-pill px-5 shadow" style={{ backgroundColor: colors.primary }} onClick={saveEdit} disabled={editSaving}>{editSaving ? "Saving..." : "Update Plan"}</button>
              <button className="btn btn-lg btn-light border rounded-pill px-4" onClick={closeEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- STYLES --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hover-row:hover { background-color: #f8fafc; transition: all 0.2s; }
        .bg-success-subtle { background-color: #dcfce7; color: #166534; }
        .bg-primary-subtle { background-color: #eef2ff; }
        .form-check-input:checked { background-color: ${colors.primary}; border-color: ${colors.primary}; }
        .dropdown-item:hover { background-color: #f1f5f9; cursor: pointer; }
        .btn-xs { padding: 0.1rem 0.4rem; font-size: 0.7rem; }
      `}} />
    </div>
  );
}