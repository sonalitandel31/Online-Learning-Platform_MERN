const express = require("express");
const { registerUser, loginUser, addAdmin } = require("../controller/userController");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb){ 
        cb(null, "uploads/"); 
    },
    filename: function (req, file, cb){
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e7);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.post("/register",upload.single("profilePic"), registerUser);
router.post("/login", loginUser);
router.post("/addAdmin", addAdmin);

module.exports = router;