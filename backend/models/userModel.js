const { default: mongoose } = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["admin", "instructor", "student"],
        required: true
    },
    profilePic:{
        type: String,
        default: "/uploads/default.png"
    }
}, {timestamps: true});

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;