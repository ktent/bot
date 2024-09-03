require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Attendance = require('./models/Attendance');

const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());
console.log("hello, enjoy fun today");

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected successfully.');
})
.catch((error) => {
  console.error('MongoDB connection error:', error.message);
});

// 출근 기록 추가
app.post('/checkin', async (req, res) => {
  try {
    const { botUserKey } = req.body.params || req.body.action?.params;
    if (!botUserKey) {
      return res.status(400).json({ message: 'botUserKey is required.' });
    }

    const attendance = new Attendance({
      userId: botUserKey,
      date: new Date(),
      status: 'IN'
    });
    await attendance.save();
    res.status(201).json({ message: 'Checked in successfully!' });
  } catch (error) {
    console.error('Error during check-in:', error.message);
    res.status(500).json({ error: 'Check-in failed.' });
  }
});

// 출근 취소 기록 추가
app.post('/checkout', async (req, res) => {
  try {
    const { botUserKey } = req.body.params || req.body.action?.params;
    if (!botUserKey) {
      return res.status(400).json({ message: 'botUserKey is required.' });
    }

    const today = new Date();
    const startDate = new Date(today.setHours(0, 0, 0, 0));
    const endDate = new Date(today.setHours(23, 59, 59, 999));

    const checkInRecord = await Attendance.findOne({
      userId: botUserKey,
      status: 'IN',
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (!checkInRecord) {
      return res.status(400).json({ message: 'No check-in record found for today.' });
    }

    checkInRecord.status = 'OUT';
    await checkInRecord.save();
    res.status(200).json({ message: 'Checked out successfully!' });
  } catch (error) {
    console.error('Error during check-out:', error.message);
    res.status(500).json({ error: 'Check-out failed.' });
  }
});

// 월 단위 출근 현황 조회
app.get('/attendance/:botUserKey/:month', async (req, res) => {
  try {
    const { botUserKey, month } = req.params;
    const [year, monthNumber] = month.split('-').map(Number);
    const startDate = new Date(year, monthNumber - 1, 1);
    const endDate = new Date(year, monthNumber, 0);

    const attendanceRecords = await Attendance.find({
      userId: botUserKey,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error.message);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
});

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
