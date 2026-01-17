const express = require("express");
const router = express.Router();
const { createCategory, getApprovedCategories, suggestCategory, getPendingSuggestions, approveCategory, rejectCategory, getAllCategories, requestCategory, getMyRequests, checkCategoryExists, deleteCategory, updateCategory } = require("../controller/categoryController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/request", authMiddleware, requestCategory);
router.get("/my-requests", authMiddleware, getMyRequests);
router.get("/check", checkCategoryExists);

router.get("/", getAllCategories);
router.post("/create", authMiddleware, createCategory);
router.get("/pending", authMiddleware, getPendingSuggestions);
router.put("/approve/:id", authMiddleware, approveCategory);
router.put("/reject/:id", authMiddleware, rejectCategory);
router.post("/suggest", authMiddleware, suggestCategory);
router.get("/approved", getApprovedCategories);

router.put("/update/:id", authMiddleware, updateCategory);
router.delete("/:id", authMiddleware, deleteCategory);

module.exports = router;
