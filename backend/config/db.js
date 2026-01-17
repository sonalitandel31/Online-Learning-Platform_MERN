const mongoose = require("mongoose");

const conn = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); 
    console.log("MongoDB connected..!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};

module.exports = conn;
