const { default: mongoose } = require("mongoose");

const studentSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    education: String,
    interests: [String],
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "course"
    }]
}, { timestamps: true });

const studentModel = mongoose.model("student", studentSchema);
module.exports = studentModel;