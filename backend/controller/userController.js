const userModel = require("../models/userModel");
const instructorModel = require("../models/instructorModel");
const studentModel = require("../models/studentModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
    try {
        let profilePic = req.file
            ? `${req.protocol}://${req.get("host")}/${req.file.path.replace("\\", "/")}`
            : `${req.protocol}://${req.get("host")}/uploads/default.png`;

        let {
            name, email, password, role,
            education, interests, bio,
            expertise, qualifications, experience
        } = req.body;

        name = name?.trim();
        email = email?.trim();
        const normalizedRole = role?.trim().toLowerCase();

        const existingUser = await userModel.findOne({ email });
        if (existingUser) return res.status(409).json({ warning: "Email already registered.." });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const userData = { name, email, password: hashed, role: normalizedRole };
        if (profilePic) userData.profilePic = profilePic;

        const user = await userModel.create(userData);

        interests = interests ? interests.split(",").map(i => i.trim()) : [];
        expertise = expertise ? expertise.split(",").map(e => e.trim()) : [];
        qualifications = qualifications ? qualifications.split(",").map(q => q.trim()) : [];

        let extraData = null;
        if (normalizedRole === "student") {
            extraData = await studentModel.create({ user: user._id, education, interests });
        }
        if (normalizedRole === "instructor") {
            extraData = await instructorModel.create({ user: user._id, bio, expertise, qualifications, experience });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || "secretkey",
            { expiresIn: "1d" }
        );

        const userObj = user.toObject();
        delete userObj.password;

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: userObj,
            profile: extraData
        });

    } catch (err) {
        console.error("RegisterUser Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials." });

        const token = jwt.sign({ id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || "secretkey", { expiresIn: "1d" });

        const userObj = user.toObject();
        delete userObj.password;

        res.status(200).json({ success: true, message: "Login successful", token, user: userObj });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const addAdmin = async (req, res) => {
    try {
        const { name, email, password} = req.body;

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ warning: "Email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const user = await userModel.create({ name, email, password: hashed, role: "admin" });

        const userObj = user.toObject();
        delete userObj.password;

        res.status(201).json({ success: true, message: "Admin created successfully", user: userObj });
    } catch (err) {
        console.error("AddAdmin Error:", err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};

module.exports = { registerUser, loginUser, addAdmin };
