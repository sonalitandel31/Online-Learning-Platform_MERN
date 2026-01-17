const { default: mongoose } = require("mongoose");

const instructorSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    bio: String,
    expertise: [String],
    qualifications: [String],
    experience: Number,
    coursesCreated:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"course"
    }]
}, { timestamps: true });

const instructorModel = mongoose.model("instructor", instructorSchema);
module.exports = instructorModel;