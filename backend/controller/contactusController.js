const ContactRequest = require("../models/contactusModel");

exports.createMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const newMessage = await ContactRequest.create({
      name,
      email,
      subject,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Your message has been submitted.",
      data: newMessage,
    });
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
