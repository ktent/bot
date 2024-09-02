require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Attendance = require('./models/Attendance');

const app = express();
const port = process.env.PORT || 3000;

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

// 카카오 로그인 인증
app.get('/auth/kakao', (req, res) => {
  const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.KAKAO_REDIRECT_URI}&response_type=code`;
  res.redirect(authUrl);
});

app.get('/auth/kakao/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        client_secret: process.env.KAKAO_CLIENT_SECRET,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      params: {
        property_keys: JSON.stringify(['kakao_account.profile.nickname']),
        secure_resource: true
      }
    });

    const user = userResponse.data;
    res.json(user);
  } catch (error) {
    console.error('Error during Kakao authentication:', error.message);
    res.status(500).json({ error: 'Kakao authentication failed.' });
  }
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
    console.error('Error during check-in:', error.message);
    res.status(500).json({ error: 'Check-in failed.' });
  }
});

// 출근 취소 기록 추가
app.post('/checkout', async (req, res) => {
  try {
    const { userId } = req.body;
    const today = new Date();
    const startDate = new Date(today.setHours(0, 0, 0, 0));
    const endDate = new Date(today.setHours(23, 59, 59, 999));
    
    const checkInRecord = await Attendance.findOne({
      userId,
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
