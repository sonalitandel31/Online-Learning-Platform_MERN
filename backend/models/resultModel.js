const { default: mongoose } = require("mongoose");

const resultSchema = mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "exam",
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    answers: {
        type: Object, // Format: { "questionId": "selectedOption" }
        default: {}
    },
    // --- Naye Fields Jo Missing The ---
    totalQuestions: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    positiveMarks: { type: Number, default: 0 },
    negativeMarks: { type: Number, default: 0 },
    finalMarks: { type: Number, default: 0 },
    isPassed: { type: Boolean, default: false },
    // -----------------------------------
    score: {
        type: Number,
        default: 0
    },
    attemptNumber: {
        type: Number,
        default: 1
    },
    cheat: {
        tabSwitches: { type: Number, default: 0 },
        fullscreenViolations: { type: Number, default: 0 },
        autoSubmitted: { type: Boolean, default: false } 
    },
    status: {
        type: String,
        enum: ["in-progress", "completed", "disqualified"],
        default: "in-progress"
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    submittedAt: {
        type: Date
    }
}, { timestamps: true });

const resultModel = mongoose.model("result", resultSchema);
module.exports = resultModel;