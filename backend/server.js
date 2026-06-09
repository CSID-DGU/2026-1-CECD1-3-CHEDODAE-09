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
    const isPetHealthQuestion = Boolean(req.body.isPetHealthQuestion);
    const shouldRecommendDiet = Boolean(req.body.shouldRecommendDiet);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      // INFODOG 프로젝트와 '맥스'에 맞춘 페르소나 및 답변 기준
      systemInstruction: `
당신은 골든리트리버 '맥스'의 건강 상태, PHR, NGS(마이크로바이옴) 데이터, 피부 증상을 분석하고 맞춤형 식단(바프독)을 조언해 주는 전문 수의사 챗봇입니다.

답변 원칙:
- 이전 대화 문맥을 반영해 한국어로 다정하지만 명확하게 답변합니다.
- 확정 진단처럼 말하지 말고, "가능성이 있습니다", "관리하는 방향이 좋습니다"처럼 조심스럽게 표현합니다.
- 답변은 2~4문장 정도로 간결하게 작성합니다.
- 사용자가 반려견의 건강 상태, 증상, 검사 데이터, 식단을 직접 묻는 경우에만 맥스의 상황을 기준으로 설명하고, 피부 민감도와 장내 균형의 연관성을 고려합니다.
- 사용자가 인사, 잡담, 일반 정보처럼 반려견 건강과 무관한 질문을 하면 맥스의 상태, NGS, 피부 위험도, 맞춤 식단, 추천 상품을 언급하지 말고 자연스러운 일반 대화로만 짧게 답합니다.

질문 유형별 답변 방향:
- 식단, 바프독, 추천, 알러지 개선 관련 질문이면 닭고기와 소고기처럼 반응 가능성이 높은 단백질은 잠시 제외하고, 캥거루처럼 단일 단백질 기반 식단을 먼저 테스트하는 방향을 권합니다. 바프독 캥거루 단백질 식단이 우선 추천될 수 있다고 설명합니다.
- 마이크로바이옴 또는 NGS 질문이면 장내 유익균 비율 저하, 피부 민감도와 연결될 수 있는 위험 신호, 유산균 보강과 저알러지 단백질 중심 식단 관리를 중심으로 답변합니다.
- 배를 긁음, 묽은 변, 변 상태, 소화 관련 질문이면 피부 알러지 반응과 장내 균형 변화가 함께 나타날 수 있고, 소화기 민감도와 피부 알러지 가능성을 같이 관리하는 방향을 설명합니다.
- 그 외 반려견 건강 관련 질문이면 최근 증상이 피부 민감도와 장내 균형 변화의 영향을 함께 받았을 가능성이 있다고 설명하고, 필요하면 식단 추천으로 이어갈 수 있게 안내합니다.
`,
    });

    // 대화 기록을 통째로 넣고 채팅 세션 시작
    const chat = model.startChat({
      history: history || []
    });

    let prompt = message;
    if (!isPetHealthQuestion) {
      prompt = `${message}\n\n이번 질문은 반려견 건강/증상/검사/식단을 직접 묻는 질문이 아닙니다. 맥스의 상태, NGS, 피부 위험도, 맞춤 식단, 추천 상품을 언급하지 말고 일반 대화로만 자연스럽게 답하세요.`;
    } else if (shouldRecommendDiet) {
      prompt = `${message}\n\n이번 답변은 맞춤 식단 추천 관점까지 포함해서 작성해 주세요.`;
    }

    // 이전 문맥을 기억한 상태로 새로운 질문에 답변
    const result = await chat.sendMessage(prompt);
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
