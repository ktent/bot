const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Attendance = require('./models/Attendance');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// MongoDB 연결
mongoose.connect('mongodb://localhost:27017/attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// 출근 기록 추가
app.post('/checkin', async (req, res) => {
  try {
    const { userId } = req.body;

    // 출근 기록 생성
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

    // 출근 기록 찾기
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

    // 출근 기록 업데이트
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

    // 월의 첫 날과 마지막 날을 계산
    const startDate = new Date(year, monthNumber - 1, 1);
    const endDate = new Date(year, monthNumber, 0);

    // 출근 현황 조회
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
