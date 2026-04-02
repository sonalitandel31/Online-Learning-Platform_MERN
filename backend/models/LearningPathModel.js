const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema({
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true 
    },
    title: { type: String, required: true },
    description: { type: String },
    // Array of Course IDs in a specific order
    courses: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'course' 
    }],
    // Employees to whom this path is assigned
    assignedTo: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user' 
    }],
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user' 
    }
}, { timestamps: true });

module.exports = mongoose.model('LearningPath', learningPathSchema);