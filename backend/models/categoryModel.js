const { default: mongoose } = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ["approved", "pending", "rejected"],
        default: "approved"
    },
    suggestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("category", categorySchema);
