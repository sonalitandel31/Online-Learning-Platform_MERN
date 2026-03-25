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
    review: {
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
        reviewedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: null },
        reviewNote: { type: String, default: "" },
    },
    totalDuration: {
        type: Number,
        default: 0
    },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },

    skillsTaught: {
        type: [String],
        default: []
        // Example: ["React", "State Management", "Frontend"]
    },
    prerequisites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "course"
    }],

}, { timestamps: true });

courseSchema.virtual("formattedDuration").get(function () {
    const totalSeconds = this.totalDuration || 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h > 0 ? h + "h " : ""}${m}m`;
});

courseSchema.index({ status: 1 });
courseSchema.index({ title: "text" });
courseSchema.index({ category: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ createdAt: -1 });

const courseModel = mongoose.model("course", courseSchema);
module.exports = courseModel;
