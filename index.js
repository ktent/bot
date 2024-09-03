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
  let botUserKey = null;  // 전역 변수로 botUserKey를 선언하여 다른 엔드포인트에서 접근 가능하게 함

  // '/leehoyoung' 경로로 들어오면 botUserKey를 '이호영'으로 설정
  app.post('/leehoyoung', (req, res) => {
      botUserKey = '이호영';
      res.status(200).json({
          version: "2.0",
          template: {
              outputs: [{
                  simpleText: {
                      text: '이호영님 안녕하세요, 휴무일에 휴무라고 적어주시면 기록이 됩니다.'
                  }
              }]
          }
      });
  });
  
  
// 출근 기록 추가
app.post('/checkin', async (req, res) => {
    try {
        let botUserKey = req.body.userRequest?.user?.id;

        if (!botUserKey) {
            return res.status(400).json({ message: 'botUserKey is required.' });
        }

        // botUserKey가 특정 값이면 사용자 이름으로 변경
        if (botUserKey === '특정_값') {
            botUserKey = '이호영';
        }

        // 서울 시간대 설정
        const koreaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" });
        const currentDate = new Date(koreaTime);

        // 오늘 날짜를 기준으로 체크인 기록 확인
        const startDate = new Date(currentDate.setHours(0, 0, 0, 0));
        const endDate = new Date(currentDate.setHours(23, 59, 59, 999));

        const existingRecord = await Attendance.findOne({
            userId: botUserKey,
            status: 'IN',
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        if (existingRecord) {
            return res.status(400).json({ message: 'You have already checked in today.' });
        }

        // 새로운 출근 기록 저장
        const attendance = new Attendance({
            userId: botUserKey,
            date: currentDate,
            status: 'IN'
        });
        await attendance.save();

        const formattedDate = `${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`;

        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    simpleText: {
                        text: `${formattedDate} 출근하셨습니다.`
                    }
                }]
            }
        });
    } catch (error) {
        console.error('Error during check-in:', error);
        res.status(500).json({ error: 'Check-in failed.' });
    }
});


  // 출근 취소 기록 추가
  app.post('/checkout', async (req, res) => {
    try {
        const botUserKey = req.body.action?.params?.botUserKey;

        if (!botUserKey) {
            return res.status(400).json({ message: 'botUserKey is required.' });
        }

        const today = new Date();
        const startDate = new Date(today.setHours(0, 0, 0, 0));
        const endDate = new Date(today.setHours(23, 59, 59, 999));

        // 오늘의 체크인 기록을 삭제합니다.
        const deleteResult = await Attendance.deleteOne({
            userId: botUserKey,
            status: 'IN',
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        if (deleteResult.deletedCount === 0) {
            return res.status(400).json({ message: 'No check-in record found for today.' });
        }

        // 날짜 형식을 "몇월 몇일"로 변환
        const checkoutDate = new Date();
        const formattedDate = `${checkoutDate.getMonth() + 1}월 ${checkoutDate.getDate()}일`;

        // 성공적으로 체크아웃되었음을 응답
        res.status(200).json({
            version: "2.0",
            template: {
                outputs: [{
                    simpleText: {
                        text: `${formattedDate} 휴무일 기록이 삭제되었습니다.`
                    }
                }]
            }
        });
    } catch (error) {
        console.error('Error during check-out:', error.message);
        res.status(500).json({ error: 'Check-out failed.' });
    }
});

// '/today' 경로로 오늘 날짜에 체크인 여부 확인
app.post('/today', async (req, res) => {
    try {
        const botUserKey = req.body.userRequest?.user?.id;

        if (!botUserKey) {
            return res.status(400).json({ message: 'botUserKey is required.' });
        }

        const today = new Date();
        const startDate = new Date(today.setHours(0, 0, 0, 0));
        const endDate = new Date(today.setHours(23, 59, 59, 999));

        const existingRecord = await Attendance.findOne({
            userId: botUserKey,
            status: 'IN',
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        let responseMessage = '';

        if (existingRecord) {
            responseMessage = '오늘은 휴무일입니다.';
        } else {
            responseMessage = '오늘은 출근하셨습니다.';
        }

        res.json({
            version: "2.0",
            template: {
                outputs: [{
                    simpleText: {
                        text: responseMessage
                    }
                }]
            }
        });

    } catch (error) {
        console.error('Error during today check:', error.message);
        res.status(500).json({ error: 'Failed to check today\'s attendance status.' });
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
