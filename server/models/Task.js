const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  task: String,
  time: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Task", taskSchema);
