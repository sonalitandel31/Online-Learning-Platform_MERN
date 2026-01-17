const { default: mongoose } = require("mongoose");

const examSchema = mongoose.Schema({
    course:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "course",
        required: true
    },
    title:{
        type: String,
        required: true,
    },
    duration:{
        type: Number,
        required: true
    },
    questions:[{
        questionText:{
            type: String,
            required: true
        },
        options: [String],
        correctAnswer:{
            type: String,
            required: true
        },
        marks:{
            type: Number,
            default: 1
        }
    }],
}, {timestamps: true});

const examModel = mongoose.model("exam",examSchema);

module.exports = examModel;