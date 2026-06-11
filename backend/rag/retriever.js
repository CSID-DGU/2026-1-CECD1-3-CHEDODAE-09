const fs = require("fs");
const path = require("path");

const CORPUS_PATH = path.join(__dirname, "..", "data", "rag-documents.json");

const STOPWORDS = new Set([
  "그리고",
  "그래서",
  "하지만",
  "이번",
  "관련",
  "대한",
  "어떻게",
  "뭐가",
  "무엇",
  "해주세요",
  "해줘",
  "같아",
  "있어",
  "있나요",
  "합니다",
  "입니다",
  "맥스의",
]);

const EXPANSION_RULES = [
  {
    test: /(기침|호흡|숨|콧물|재채기|켁켁|가래)/i,
    terms: ["호흡기", "기침", "감염", "자극", "동물병원", "PHR"],
  },
  {
    test: /(설사|묽|변비|딱딱|단단|배변|구토|헛구역|소화|장|ibd)/i,
    terms: ["장질환", "소화", "묽은 변", "변비", "IBD", "NGS", "마이크로바이옴", "Lactobacillus", "Bifidobacterium"],
  },
  {
    test: /(피부|가려|긁|알러지|알레르기|아토피|모질)/i,
    terms: ["피부염", "피부질환", "알러지", "알레르기", "가려움", "PHR", "NGS"],
  },
  {
    test: /(비만|체중|살|대사|급여량)/i,
    terms: ["비만", "대사", "체중", "PHR", "식단"],
  },
  {
    test: /(식단|사료|생식|바프독|barf|캥거루|단백질|추천|급여|먹여|먹일|바꿔|바꾸)/i,
    terms: ["식이 솔루션", "바프독", "BARFDOG", "캥거루", "단일 단백질", "알러지 케어", "유익균 보강"],
  },
  {
    test: /(ngs|마이크로바이옴|장내|유익균|균|lacto|bifido|bacter|prevo|fuso)/i,
    terms: ["NGS", "마이크로바이옴", "장내 미생물", "유익균", "Lactobacillus", "Bifidobacterium"],
  },
  {
    test: /(phr|병력|건강검진|기록|리포트|증상)/i,
    terms: ["PHR", "병력", "건강 기록", "증상", "위험도"],
  },
];

let indexedCorpus;

function readCorpus() {
  if (indexedCorpus) {
    return indexedCorpus;
  }

  const raw = fs.readFileSync(CORPUS_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const documents = Array.isArray(parsed.documents) ? parsed.documents : [];
  indexedCorpus = {
    ...parsed,
    documents: documents.map((doc) => {
      const keywords = Array.isArray(doc.keywords) ? doc.keywords : [];
      const indexText = `${doc.title || ""} ${keywords.join(" ")} ${doc.text || ""}`;
      return {
        ...doc,
        _indexText: indexText.toLowerCase(),
        _tokens: tokenize(indexText),
      };
    }),
  };

  return indexedCorpus;
}

function tokenize(text) {
  const matches = String(text || "")
    .toLowerCase()
    .match(/[가-힣a-z0-9_.%+-]+/g);

  if (!matches) {
    return [];
  }

  return matches
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function expandQueryTokens(query) {
  const expanded = new Set(tokenize(query));
  const normalizedQuery = String(query || "").toLowerCase();

  EXPANSION_RULES.forEach((rule) => {
    if (!rule.test.test(normalizedQuery)) {
      return;
    }

    tokenize(rule.terms.join(" ")).forEach((token) => expanded.add(token));
  });

  return Array.from(expanded);
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function isDietRecommendationRequest(text) {
  return includesAny(text, [
    /식단/,
    /사료/,
    /생식/,
    /바프독/i,
    /barf/i,
    /캥거루/,
    /단백질/,
    /급여/,
    /추천/,
    /먹여/,
    /먹일/,
    /먹이면/,
    /먹여도/,
    /바꿔/,
    /바꾸/,
  ]);
}

function isNgsRelevant(structured) {
  const text = `${structured.symptoms.join(" ")} ${structured.diseaseTargets.join(" ")} ${structured.intent.join(" ")}`;
  return /NGS|마이크로바이옴|장내|유익균|장|소화|IBD|배변|피부|알러지|피부염/.test(text);
}

function hasActiveRespiratorySymptom(text) {
  if (!includesAny(text, [/기침/, /호흡/, /숨/, /콧물/, /재채기/, /켁켁/, /가래/])) {
    return false;
  }

  return !includesAny(text, [/기침.{0,8}(멈췄|멈추|없어|안\s*해|그쳤)/]);
}

function structureQuestion(message, options = {}) {
  const text = String(message || "");
  const symptoms = [];
  const diseaseTargets = [];
  const intent = [];

  if (hasActiveRespiratorySymptom(text)) {
    symptoms.push("호흡기 증상");
    diseaseTargets.push("호흡기/감염성 질환");
  }

  if (includesAny(text, [/설사/, /묽/, /변비/, /딱딱/, /단단/, /배변/, /구토/, /헛구역/, /소화/, /장/])) {
    symptoms.push("소화기/배변 이상");
    diseaseTargets.push("IBD/장 질환");
  }

  if (includesAny(text, [/피부/, /가려/, /긁/, /알러지/, /알레르기/, /아토피/, /모질/])) {
    symptoms.push("피부/알러지 의심 증상");
    diseaseTargets.push("피부염");
  }

  if (includesAny(text, [/비만/, /체중/, /살/, /대사/])) {
    symptoms.push("체중/대사 관리");
    diseaseTargets.push("비만");
  }

  if (includesAny(text, [/식욕/, /입맛/, /밥.*안\s*먹/, /밥.*못\s*먹/, /사료.*안\s*먹/, /먹지\s*않/])) {
    symptoms.push("식욕 저하");
  }

  if (isDietRecommendationRequest(text)) {
    intent.push("맞춤 식이 솔루션 요청");
  }

  if (includesAny(text, [/ngs/i, /마이크로바이옴/, /장내/, /유익균/, /균/])) {
    intent.push("NGS/마이크로바이옴 해석");
  }

  if (includesAny(text, [/phr/i, /건강검진/, /기록/, /리포트/, /병력/])) {
    intent.push("PHR/건강 기록 해석");
  }

  if (!intent.length) {
    intent.push(options.shouldRecommendDiet ? "맞춤 식이 솔루션 요청" : "건강 상담");
  }

  if (!diseaseTargets.length) {
    diseaseTargets.push("일반 건강 관리");
  }

  return {
    isPetHealthQuestion: Boolean(options.isPetHealthQuestion),
    shouldRecommendDiet: Boolean(options.shouldRecommendDiet),
    symptoms,
    intent,
    diseaseTargets: Array.from(new Set(diseaseTargets)),
  };
}

function estimateRisk(structured) {
  if (!structured.isPetHealthQuestion) {
    return [];
  }

  const targetText = `${structured.symptoms.join(" ")} ${structured.diseaseTargets.join(" ")} ${structured.intent.join(" ")}`;
  const risks = [];

  if (/호흡기|기침|감염성/.test(targetText)) {
    risks.push({
      target: "호흡기/감염성 증상",
      level: "주의",
      score: 70,
      basis: "기침, 콧물, 호흡 이상은 NGS보다 호흡기 자극이나 감염 여부 확인이 우선인 증상",
    });
  }

  if (/피부|알러지|피부염/.test(targetText)) {
    risks.push({
      target: "피부염/알러지",
      level: "높음",
      score: 78,
      basis: "맥스 PHR 데모 카드의 피부 알러지 위험 78%와 NGS 유익균 부족 근거",
    });
  }

  if (/장|소화|IBD|배변/.test(targetText)) {
    risks.push({
      target: "IBD/소화기 민감도",
      level: "높음",
      score: 85,
      basis: "맥스 바이오 리포트의 소화/장 위험도 85%와 묽은 변 PHR 증상",
    });
  }

  if (/비만|체중|대사/.test(targetText)) {
    risks.push({
      target: "비만/대사",
      level: "보통",
      score: 45,
      basis: "맥스 바이오 리포트의 비만/대사 위험도 45%",
    });
  }

  if (/식욕 저하/.test(targetText) && !risks.length) {
    risks.push({
      target: "전신 컨디션/식욕 저하",
      level: "주의",
      score: 65,
      basis: "식욕 저하는 통증, 소화기 불편, 호흡기 증상 등 여러 원인과 함께 평가해야 하는 PHR 신호",
    });
  }

  if (!risks.length) {
    risks.push({
      target: "통합 건강",
      level: "주의",
      score: 65,
      basis: "PHR/NGS 데모 프로필의 피부-장 건강 연계 관리 필요성",
    });
  }

  return risks;
}

function buildRagQuery(message, structured, risks) {
  const symptomText = structured.symptoms.length ? structured.symptoms.join(", ") : "명시 증상 없음";
  const riskText = risks
    .map((risk) => `${risk.target} ${risk.score}% ${risk.level}`)
    .join(", ");

  return [
    message,
    `증상: ${symptomText}`,
    `의도: ${structured.intent.join(", ")}`,
    `타겟 질환: ${structured.diseaseTargets.join(", ")}`,
    `예측 위험도: ${riskText}`,
    structured.shouldRecommendDiet ? "맞춤 식이 솔루션 바프독 캥거루 단일 단백질" : "",
    isNgsRelevant(structured) ? "PHR NGS RAG 마이크로바이옴 유익균 위험도" : "PHR 건강 기록 증상 위험도",
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreDocument(doc, queryTokens, structured) {
  let score = 0;
  const keywordText = Array.isArray(doc.keywords) ? doc.keywords.join(" ").toLowerCase() : "";
  const titleText = String(doc.title || "").toLowerCase();

  queryTokens.forEach((token) => {
    if (titleText.includes(token)) {
      score += 5;
    }
    if (keywordText.includes(token)) {
      score += 4;
    }
    if (doc._indexText.includes(token)) {
      score += 1;
    }
  });

  if (structured.isPetHealthQuestion && doc.id === "phr_max_demo_profile") {
    score += 9;
  }
  if (structured.isPetHealthQuestion && isNgsRelevant(structured) && doc.id === "ngs_max_demo_profile") {
    score += 8;
  }
  if (structured.shouldRecommendDiet && doc.type === "nutrition") {
    score += 12;
  }
  if (structured.intent.some((item) => item.includes("NGS")) && doc.type === "ngs_summary") {
    score += 8;
  }
  if (structured.diseaseTargets.some((item) => item.includes("피부")) && /피부|알러지|아토피/.test(doc._indexText)) {
    score += 5;
  }
  if (structured.diseaseTargets.some((item) => item.includes("장")) && /장 질환|설사|구토|변비|소화/.test(doc._indexText)) {
    score += 5;
  }

  return score;
}

function dedupeDocuments(documents) {
  const seen = new Set();
  return documents.filter((doc) => {
    if (seen.has(doc.id)) {
      return false;
    }
    seen.add(doc.id);
    return true;
  });
}

function ensureBaselineDocuments(documents, corpus, structured) {
  if (!structured.isPetHealthQuestion) {
    return documents;
  }

  const byId = new Map(corpus.documents.map((doc) => [doc.id, doc]));
  const requiredIds = ["project_method_rag_pipeline", "phr_max_demo_profile"];

  if (isNgsRelevant(structured)) {
    requiredIds.push("ngs_max_demo_profile");
  }

  if (structured.shouldRecommendDiet) {
    requiredIds.push("nutrition_barf_kangaroo");
  }

  const required = requiredIds.map((id) => byId.get(id)).filter(Boolean);
  return dedupeDocuments([...required, ...documents]);
}

function retrieveRagContext(message, options = {}) {
  const structured = structureQuestion(message, options);
  const ngsRelevant = isNgsRelevant(structured);

  if (!structured.isPetHealthQuestion) {
    return {
      enabled: false,
      structured,
      risks: [],
      query: "",
      documents: [],
      contextText: "",
    };
  }

  const corpus = readCorpus();
  const risks = estimateRisk(structured);
  const query = buildRagQuery(message, structured, risks);
  const queryTokens = expandQueryTokens(query);
  const ranked = corpus.documents
    .map((doc) => ({
      doc,
      score: scoreDocument(doc, queryTokens, structured),
    }))
    .filter((item) => {
      if (item.score <= 0) {
        return false;
      }

      if (!structured.shouldRecommendDiet && item.doc.type === "nutrition") {
        return false;
      }

      if (ngsRelevant) {
        return true;
      }

      return !["ngs", "ngs_summary", "ngs_record"].includes(item.doc.type);
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.doc);
  const documents = ensureBaselineDocuments(ranked, corpus, structured).slice(0, options.topK || 7);

  return {
    enabled: true,
    structured,
    risks,
    query,
    documents,
    contextText: documents
      .map((doc, index) => `[${index + 1}] ${doc.title}\n${doc.text}`)
      .join("\n\n"),
  };
}

function formatRiskEstimates(risks) {
  if (!risks.length) {
    return "예측 위험도 없음";
  }

  return risks
    .map((risk) => `- ${risk.target}: ${risk.score}% (${risk.level}) / 근거: ${risk.basis}`)
    .join("\n");
}

function buildRagPrompt(message, options = {}) {
  const rag = retrieveRagContext(message, options);

  if (!rag.enabled) {
    return { prompt: message, rag };
  }

  const symptomText = rag.structured.symptoms.length
    ? rag.structured.symptoms.join(", ")
    : "명시 증상 없음";

  const prompt = `${message}

[INFODOG RAG 입력]
아래 정보는 모델 파인튜닝 대신 PHR/NGS/내부 지식 문서를 검색해 붙인 근거입니다. 근거에 없는 수치나 세부 병력은 새로 만들지 마세요.

[구조화된 사용자 입력]
- 의도: ${rag.structured.intent.join(", ")}
- 증상: ${symptomText}
- 타겟 질환 후보: ${rag.structured.diseaseTargets.join(", ")}
- 식단 추천 요청 여부: ${rag.structured.shouldRecommendDiet ? "예" : "아니오"}

[질병 위험도 예측 결과]
${formatRiskEstimates(rag.risks)}

[RAG query]
${rag.query}

[검색된 PHR/NGS/영양 근거]
${rag.contextText}

[응답 생성 지침]
- 사용자의 질문에 직접 답하고, 2~4문장으로 간결하게 작성하세요.
- 확정 진단처럼 말하지 말고 가능성/관리 방향으로 표현하세요.
- PHR/NGS 근거가 관련될 때만 수치와 데이터명을 언급하세요.
- 사용자 화면에는 검색 문서 번호가 보이지 않으므로 [1], [2, 3] 같은 출처 번호를 답변에 쓰지 마세요.
- 마크다운 굵게 표시(**텍스트**)를 쓰지 말고 일반 문장으로 답하세요.
- 기침/호흡기 증상처럼 NGS와 직접 연결하기 어려운 질문에는 NGS, Lactobacillus, 피부/장 위험도 수치를 억지로 언급하지 마세요.
- 식단 추천 요청 여부가 "아니오"이면 BARFDOG 상품명이나 캥거루 단일 단백질 추천을 먼저 제안하지 마세요.
- 식단 질문이면 알러지원 회피, 단일 단백질, 유익균 보강 관점까지 연결하세요.
- 증상이 지속되거나 혈변, 반복 구토, 무기력 등 위험 신호가 있으면 동물병원 상담을 권하세요.`;

  return { prompt, rag };
}

module.exports = {
  buildRagPrompt,
  retrieveRagContext,
  structureQuestion,
  estimateRisk,
};
