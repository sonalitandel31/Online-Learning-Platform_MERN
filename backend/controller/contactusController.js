const ContactRequest = require("../models/contactusModel");

exports.createMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Check if a file was uploaded via multer
    const attachmentPath = req.file ? req.file.path : null;

    const newMessage = await ContactRequest.create({
      name,
      email,
      subject,
      message,
      attachment: attachmentPath, // Save the path
    });

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ContactRequest.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await ContactRequest.findByIdAndUpdate(
      id,
      { status: "Resolved" },
      { new: true }
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedMessage = await ContactRequest.findByIdAndDelete(id);
    if (!deletedMessage) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.status(200).json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.respondToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponse } = req.body;

    const updated = await ContactRequest.findByIdAndUpdate(
      id,
      { 
        adminResponse: adminResponse,
        status: "Resolved" // Automatically resolve when responded to
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserHistory = async (req, res) => {
  try {
    const { email } = req.params;
    const history = await ContactRequest.find({ email }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};