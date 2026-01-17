const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const { getUserProfile, updateUserProfile, changeUserPassword } = require("../controller/profileController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/profilePics");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

router.get("/", authMiddleware, getUserProfile);
router.put("/", authMiddleware, upload.single("profilePic"), updateUserProfile);
router.put("/password", authMiddleware, changeUserPassword);

module.exports = router;
