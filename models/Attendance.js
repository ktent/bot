const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['IN', 'OUT'], required: true }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
