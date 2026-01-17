const express = require("express");
const router = express.Router();
const {
  createMessage,
  getAllMessages,
  updateStatus,
} = require("../controller/contactusController");

router.post("/", createMessage);    
router.get("/", getAllMessages);    
router.put("/:id", updateStatus);   

module.exports = router;
