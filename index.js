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
      const botUserKey = req.body.userRequest?.user?.id;
  
      if (!botUserKey) {
        return res.status(400).json({ message: 'botUserKey is required.' });
      }
  
      const attendance = new Attendance({
        userId: botUserKey,
        date: new Date(),
        status: 'IN'
      });
      await attendance.save();
  
      const checkinDate = new Date();
      const formattedDate = `${checkinDate.getMonth() + 1}월 ${checkinDate.getDate()}일`;
  
      res.json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: `${formattedDate} 휴무입니다.`
            }
          }]
        }
      });
    } catch (error) {
      console.error('Error during check-in:', error);
      res.status(500).json({ error: 'Check-in failed.' });
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
