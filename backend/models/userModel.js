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
        // UPDATE 1: Added "hr_manager" and "corp_admin"
        enum: ["admin", "instructor", "student", "hr_manager"],
        required: true
    },
    // UPDATE 2: Multi-tenancy foreign key
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company", // Note: Ensure your new Company model is named "Company"
        default: null,
        index: true     // Added index because HR Dashboard will query this heavily
    },
    // UPDATE 3: Corporate employee tracking
    employeeId: {
        type: String,
        default: null
    },
    profilePic: {
        type: String,
        default: "/uploads/default.png"
    },
    isBlocked: {
        type: Boolean,
        default: false,
        index: true
    },
    blockedAt: {
        type: Date,
        default: null
    },
    blockReason: {
        type: String,
        default: ""
    },
    lastLoginAt: { 
        type: Date, 
        default: null, 
        index: true 
    },
    lastActiveAt: { 
        type: Date, 
        default: null, 
        index: true 
    },
}, { timestamps: true });

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;