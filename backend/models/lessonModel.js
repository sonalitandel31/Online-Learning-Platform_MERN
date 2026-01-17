const { default: mongoose } = require("mongoose");

const lessonSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "course",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ["video", "pdf", "text"],
    required: true
  },
  fileUrl: {
    type: String
  },
  description: {
    type: String
  },
  isPreviewFree: {
    type: Boolean,
    default: false
  },
  // 🕒 Add duration field
  duration: {
    type: Number, // store in seconds
    default: 0
  }
}, { timestamps: true });

// 🧮 After lesson save/remove, recalc total course duration
lessonSchema.post(['save', 'remove'], async function () {
  const Course = require('./courseModel');
  const Lesson = mongoose.model("lesson");
  
  const courseId = this.course;
  const lessons = await Lesson.find({ course: courseId });
  
  const total = lessons.reduce((acc, l) => acc + (l.duration || 0), 0);
  await Course.findByIdAndUpdate(courseId, { totalDuration: total });
});

const lessonModel = mongoose.model("lesson", lessonSchema);
module.exports = lessonModel;
