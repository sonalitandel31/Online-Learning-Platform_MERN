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
    answers: [{
        questionId: {
            type: String
        },
        selectedOption: {
            type: String
        }
    }],
    score: {
        type: Number,
        default: 0
    },
    attemptNumber: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

const resultModel = mongoose.model("result", resultSchema);
module.exports = resultModel;