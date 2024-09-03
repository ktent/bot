const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },  // 필수 필드
  date: { type: Date, required: true },
  status: { type: String, enum: ['IN', 'OUT'], required: true }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
