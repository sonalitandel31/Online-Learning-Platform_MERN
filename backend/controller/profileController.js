const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const studentModel = require("../models/studentModel");
const instructorModel = require("../models/instructorModel");

const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    let profile;

    if (user.role === "student") {
      profile = await studentModel
        .findOne({ user: user._id })
        .populate("enrolledCourses", "_id title");

      if (!profile) profile = await studentModel.create({ user: user._id });
    } else if (user.role === "instructor") {
      profile = await instructorModel
        .findOne({ user: user._id })
        .populate("coursesCreated", "_id title");

      if (!profile) profile = await instructorModel.create({ user: user._id });
    }
    if (!user.profilePic) {
      user.profilePic = "/uploads/default.png";
    }

    res.json({ user, profile });
  } catch (err) {
    console.error("FETCH PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, ...profileData } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;

    if (req.file) {
      user.profilePic = `/uploads/profilePics/${req.file.filename}`;
    } else if (!user.profilePic) {
      user.profilePic = "/uploads/default.png";
    }

    await user.save();

    ["_id", "user", "__v", "createdAt", "updatedAt"].forEach(
      (f) => delete profileData[f]
    );

    const sanitizeObjectIdArray = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((item) => (typeof item === "string" ? item : item._id));
    };

    if (user.role === "student" && profileData.enrolledCourses) {
      profileData.enrolledCourses = sanitizeObjectIdArray(
        profileData.enrolledCourses
      );
    }
    if (user.role === "instructor" && profileData.coursesCreated) {
      profileData.coursesCreated = sanitizeObjectIdArray(
        profileData.coursesCreated
      );
    }

    let profile;
    if (user.role === "student") {
      await studentModel.findOneAndUpdate(
        { user: user._id },
        { $set: profileData },
        { new: true, upsert: true }
      );
      profile = await studentModel
        .findOne({ user: user._id })
        .populate("enrolledCourses", "_id title");
    } else if (user.role === "instructor") {
      await instructorModel.findOneAndUpdate(
        { user: user._id },
        { $set: profileData },
        { new: true, upsert: true }
      );
      profile = await instructorModel
        .findOne({ user: user._id })
        .populate("coursesCreated", "_id title");
    }

    res.json({ user, profile });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const changeUserPassword = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "Please fill both fields" });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid)
      return res.status(400).json({ message: "Old password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
};
