require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
// CORS 허용 origin 환경변수 추가
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: process.env.JSON_LIMIT || "8mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const PORT = Number(process.env.PORT || 5000);
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  ...(process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean),
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter(Boolean);

const SYSTEM_INSTRUCTION = `
당신은 골든리트리버 '맥스'의 건강 상태, PHR, NGS(마이크로바이옴) 데이터, 피부 증상, 맞춤 식단을 분석하는 INFODOG AI 챗봇입니다.

답변 원칙:
- 이전 대화 맥락을 반영해 한국어로 자연스럽고 명확하게 답합니다.
- 확정 진단처럼 말하지 말고 "가능성이 있습니다", "관리하는 방향이 좋습니다"처럼 조심스럽게 표현합니다.
- 답변은 2~4문장 정도로 간결하게 작성합니다.
- 사용자가 반려견 건강, 증상, 검사 데이터, 식단을 직접 묻는 경우에만 맥스의 상태, NGS, 피부 위험도, 맞춤 식단을 언급합니다.
- 인사, 농담, 일반 질문처럼 반려견 건강과 무관한 질문에는 맥스의 상태나 추천 상품을 억지로 언급하지 않고 일반 대화로만 답합니다.

질문 유형별 답변 방향:
- 식단, 바프독 추천, 알러지 개선 관련 질문이면 닭고기와 소고기처럼 반응 가능성이 높은 단백질은 잠시 제외하고, 캥거루처럼 단일 단백질 기반 식단을 먼저 테스트하는 방향을 권합니다.
- 마이크로바이옴 또는 NGS 질문이면 장내 유익균 비율, 피부 민감도, 유산균 보강, 저알러지 단백질 중심 식단 관리를 중심으로 답합니다.
- 배 긁음, 묽은 변, 소화 관련 질문이면 피부 알러지 반응과 장내 균형 변화가 함께 나타날 수 있음을 설명합니다.
`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error) {
  return [429, 500, 502, 503, 504].includes(error?.status);
}

function dataUrlToInlineData(attachment) {
  // Gemini 이미지 첨부 변환 추가
  if (!attachment?.dataUrl || typeof attachment.dataUrl !== "string") {
    return null;
  }

  const match = attachment.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    inlineData: {
      mimeType: attachment.mimeType || match[1],
      data: match[2],
    },
  };
}

async function sendWithModel(modelName, history, prompt, attachment) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const chat = model.startChat({
    history: Array.isArray(history) ? history : [],
  });

  const inlineData = dataUrlToInlineData(attachment);
  const result = await chat.sendMessage(
    inlineData ? [{ text: prompt }, inlineData] : prompt,
  );
  return result.response.text();
}

async function generateWithFallbacks(history, prompt, attachment) {
  let lastError;

  for (const modelName of MODEL_CANDIDATES) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        console.log(`[Gemini] Trying ${modelName}, attempt ${attempt}`);
        const reply = await sendWithModel(modelName, history, prompt, attachment);
        console.log(`[Gemini] Success with ${modelName}`);
        return { reply, model: modelName };
      } catch (error) {
        lastError = error;
        console.error(`[Gemini] ${modelName} attempt ${attempt} failed`, {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
        });

        if (!isRetryableGeminiError(error)) {
          break;
        }

        await delay(700 * attempt);
      }
    }
  }

  throw lastError;
}

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY가 설정되어 있지 않습니다." });
    }

    const message = String(req.body.message || "").trim();
    const history = req.body.history || [];
    const isPetHealthQuestion = Boolean(req.body.isPetHealthQuestion);
    const shouldRecommendDiet = Boolean(req.body.shouldRecommendDiet);
    // 프론트 첨부 이미지 수신 추가
    const attachment = req.body.attachment || null;

    if (!message) {
      return res.status(400).json({ error: "message가 비어 있습니다." });
    }

    let prompt = message;
    if (!isPetHealthQuestion) {
      prompt = `${message}\n\n이번 질문은 반려견 건강/증상/검사/식단을 직접 묻는 질문이 아닙니다. 맥스의 상태, NGS, 피부 위험도, 맞춤 식단, 추천 상품을 언급하지 말고 일반 대화로만 자연스럽게 답하세요.`;
    } else if (shouldRecommendDiet) {
      prompt = `${message}\n\n이번 답변은 맞춤 식단 추천 관점까지 포함해서 작성해 주세요.`;
    }

    const { reply, model } = await generateWithFallbacks(history, prompt, attachment);
    return res.json({ reply, model });
  } catch (error) {
    console.error("[Gemini] Final failure", error);
    return res.status(500).json({
      error:
        error?.status === 503
          ? "Gemini 모델 수요가 높아 일시적으로 응답하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : "서버 에러가 발생했습니다.",
    });
  }
});

// 백엔드 서버 프로세스 유지 추가
const server = http.createServer(app);
globalThis.infodogBackendServer = server;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing backend server first.`);
    return;
  }

  console.error("[Server] Failed to start", error);
});

server.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
  console.log(`Gemini model candidates: ${MODEL_CANDIDATES.join(", ")}`);
});
