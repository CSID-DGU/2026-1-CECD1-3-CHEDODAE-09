require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// 프론트엔드(localhost:3000) 통신 허용
app.use(cors()); 
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
  try {
    const message = req.body.message;
    const history = req.body.history; // 프론트에서 보낸 대화 기록
    
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      // INFODOG 프로젝트와 '맥스'에 맞춘 페르소나 부여
      systemInstruction: "당신은 골든리트리버 '맥스'의 건강 상태, NGS(마이크로바이옴) 데이터, 피부 증상을 분석하고 맞춤형 식단(바프독)을 조언해 주는 전문 수의사 챗봇입니다. 이전 대화 문맥을 파악하고 다정하고 명확하게 답변해주세요.",
    });

    // 대화 기록을 통째로 넣고 채팅 세션 시작
    const chat = model.startChat({
      history: history || []
    });

    // 이전 문맥을 기억한 상태로 새로운 질문에 답변
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    res.json({ reply: responseText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 에러가 발생했습니다." });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});