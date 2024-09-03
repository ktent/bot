require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Attendance = require('./models/Attendance');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const logFilePath = path.join(__dirname, 'server.log');

function logToFile(message) {
  fs.appendFile(logFilePath, message + '\n', (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
}

// 모든 콘솔 로그를 로그 파일에도 기록
console.log = (...args) => {
  process.stdout.write(args.join(' ') + '\n');
  logToFile(args.join(' '));
};
console.error = (...args) => {
  process.stderr.write(args.join(' ') + '\n');
  logToFile('ERROR: ' + args.join(' '));
};

// Unhandled Rejection 및 Exception 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());
console.log("hello, enjoy fun today");

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(error => {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);  // 연결 오류 시 프로세스 종료
  });

// 출근 기록 추가
app.post('/checkin', async (req, res) => {
    try {
      const botUserKey = req.body.action?.params?.botUserKey;
      // botUserKey 형식 검증 (예: UUID 형식)
      const botUserKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!botUserKey || !botUserKeyPattern.test(botUserKey)) {
        return res.status(400).json({ message: '유효한 botUserKey가 필요합니다.' });
      }
      const attendance = new Attendance({
        userId: botUserKey,
        date: new Date(),
        status: 'IN'
      });
      await attendance.save();
      res.status(201).json({ message: '출근 기록이 성공적으로 추가되었습니다!' });
    } catch (error) {
      console.error('출근 기록 추가 중 오류 발생:', error.message);
      res.status(500).json({ error: '출근 기록 추가에 실패했습니다.' });
    }
  });
  
  // 출근 취소 기록 추가
  app.post('/checkout', async (req, res) => {
    try {
      const botUserKey = req.body.action?.params?.botUserKey;
      // botUserKey 형식 검증
      const botUserKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!botUserKey || !botUserKeyPattern.test(botUserKey)) {
        return res.status(400).json({ message: '유효한 botUserKey가 필요합니다.' });
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
        return res.status(400).json({ message: '오늘의 출근 기록이 없습니다.' });
      }
      checkInRecord.status = 'OUT';
      await checkInRecord.save();
      res.status(200).json({ message: '출근 취소가 성공적으로 완료되었습니다!' });
    } catch (error) {
      console.error('출근 취소 중 오류 발생:', error.message);
      res.status(500).json({ error: '출근 취소에 실패했습니다.' });
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
  logToFile('Server error: ' + err.message);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
