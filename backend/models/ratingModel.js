const { default: mongoose } = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "course", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, default: "" },
  },
  { timestamps: true }
);

// One student can rate a course only once
ratingSchema.index({ course: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("rating", ratingSchema);