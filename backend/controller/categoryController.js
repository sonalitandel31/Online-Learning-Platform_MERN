const Category = require("../models/categoryModel");

exports.requestCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    //case-insensitive check
    const exists = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const pendingAlready = await Category.findOne({
      name,
      suggestedBy: userId,
      status: "pending"
    });

    if (pendingAlready) {
      return res.status(400).json({ message: "You already requested this category. Waiting for approval." });
    }

    const cat = await Category.create({
      name,
      status: "pending",
      suggestedBy: userId,
    });

    res.json({ message: "Category request submitted", category: cat });

  } catch (error) {
    console.error("Request category error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.checkCategoryExists = async (req, res) => {
  try {
    const { name } = req.query;

    const exists = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });

    res.json({ exists: !!exists });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const myCats = await Category.find({ suggestedBy: userId })
      .populate("suggestedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(myCats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const all = await Category.find()
      .populate("suggestedBy", "name email");

    res.json(all);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ message: "Category already exists" });

    const category = await Category.create({ name, status: "approved" });

    res.status(201).json({ message: "Category added", category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getApprovedCategories = async (req, res) => {
  try {
    const cats = await Category.find({ status: "approved" })
      .populate("suggestedBy", "name email");

    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.suggestCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user._id;   

    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ message: "Category already exists" });

    const suggestion = await Category.create({
      name,
      status: "pending",
      suggestedBy: userId,
    });

    res.status(201).json({ message: "Category suggestion submitted", suggestion });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPendingSuggestions = async (req, res) => {
  try {
    const suggestions = await Category.find({ status: "pending" }).populate("suggestedBy", "name email");
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    res.json({ message: "Category approved", category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rejectCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.json({ message: "Category rejected", category });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Category not found" });

    res.json({ message: "Category updated", category: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
