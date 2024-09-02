// dotenv 패키지를 로드하여 환경 변수를 사용 가능하게 합니다.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Attendance = require('./models/Attendance');

const app = express();
const port = process.env.PORT || 3000; // PORT 환경 변수를 사용하거나 기본값 3000을 사용합니다.

app.use(bodyParser.json());
console.log("안녕하세요 즐거운 시작입니다.")
// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI, { // MONGODB_URI 환경 변수를 사용합니다.
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('MongoDB connected successfully.');
  }).catch((error) => {
    console.error('MongoDB connection error:', error.message);
  });

// 출근 기록 추가
app.post('/checkin', async (req, res) => {
  try {
    const { userId } = req.body;
    const attendance = new Attendance({
      userId,
      date: new Date(),
      status: 'IN'
    });
    await attendance.save();
    res.status(201).json({ message: 'Checked in successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출근 취소 기록 추가
app.post('/checkout', async (req, res) => {
  try {
    const { userId } = req.body;
    const checkInRecord = await Attendance.findOne({
      userId,
      status: 'IN',
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date()
      }
    });
    if (!checkInRecord) {
      return res.status(400).json({ message: 'No check-in record found for today.' });
    }
    checkInRecord.status = 'OUT';
    await checkInRecord.save();
    res.status(200).json({ message: 'Checked out successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 월 단위 출근 현황 조회
app.get('/attendance/:userId/:month', async (req, res) => {
  try {
    const { userId, month } = req.params;
    const [year, monthNumber] = month.split('-').map(Number);
    const startDate = new Date(year, monthNumber - 1, 1);
    const endDate = new Date(year, monthNumber, 0);
    const attendanceRecords = await Attendance.find({
      userId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    res.status(200).json(attendanceRecords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
