const { default: mongoose } = require("mongoose");

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "category", required: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "lesson" }],
    exams: [{ type: mongoose.Schema.Types.ObjectId, ref: "exam" }],
    price: { type: Number, default: 0 },
    thumbnail: { type: String },
    status: {
        type: String,
        enum: ["draft", "pendingApproval", "approved", "rejected"],
        default: "draft"
    },
    totalDuration: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

courseSchema.virtual("formattedDuration").get(function () {
    const totalSeconds = this.totalDuration || 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h > 0 ? h + "h " : ""}${m}m`;
});

const courseModel = mongoose.model("course", courseSchema);
module.exports = courseModel;
