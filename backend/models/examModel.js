const { default: mongoose } = require("mongoose");

const examSchema = mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "course",
        required: true
    },
    title: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true // in minutes
    },
    settings: {
        passingScore: { type: Number, default: 60 },
        maxAttempts: { type: Number, default: 3 },
        negativeMarking: { type: Number, default: 0 }, // e.g., 0.25 for 1/4th negative marking
        shuffleQuestions: { type: Boolean, default: false },
        shuffleOptions: { type: Boolean, default: false }
    },
    proctoring: {
        tabSwitchLimit: { type: Number, default: 3 },
        fullscreenRequired: { type: Boolean, default: true },
        webcamRequired: { type: Boolean, default: false }
    },
    questions: [{
        questionText: {
            type: String,
            required: true
        },
        options: [String],
        correctAnswer: {
            type: String,
            required: true
        },
        marks: {
            type: Number,
            default: 1
        }
    }],
}, { timestamps: true });

const examModel = mongoose.model("exam", examSchema);
module.exports = examModel;