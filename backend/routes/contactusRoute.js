const express = require("express");
const router = express.Router();
const multer = require("multer");
const { createMessage, getAllMessages, respondToMessage, deleteMessage, getUserHistory } = require("../controller/contactusController");

// Setup Multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure you create an 'uploads' folder in your backend root!
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Routes
router.post("/", upload.single('attachment'), createMessage); // Apply multer middleware
router.get("/", getAllMessages);
router.put("/:id/respond", respondToMessage); // New route for admin response
router.delete("/:id", deleteMessage);
router.get("/history/:email", getUserHistory);

module.exports = router;