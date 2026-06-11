const assert = require("node:assert/strict");

const corpus = require("../data/rag-documents.json");
const { buildRagPrompt, retrieveRagContext } = require("../rag/retriever");

function sourceIds(result) {
  return result.documents.map((doc) => doc.id);
}

const records = corpus.documents.filter((doc) => doc.type === "ngs_record");

assert.equal(corpus.anonymization.sampleSize, 100);
assert.equal(records.length, 100);
assert.ok(records.every((doc) => doc.id.startsWith("ngs_sample_")));
assert.ok(records.every((doc) => doc.metadata?.anonymousId?.startsWith("ANON-DOG-")));
assert.ok(records.every((doc) => !("dogName" in doc.metadata)));
assert.ok(records.every((doc) => !("dogNo" in doc.metadata)));

const digestiveSkin = retrieveRagContext("맥스가 배를 자주 긁고 변이 묽은데 NGS랑 관련이 있을까?", {
  isPetHealthQuestion: true,
  shouldRecommendDiet: false,
});

assert.equal(digestiveSkin.enabled, true);
assert.ok(sourceIds(digestiveSkin).includes("phr_max_demo_profile"));
assert.ok(sourceIds(digestiveSkin).includes("ngs_max_demo_profile"));
assert.ok(digestiveSkin.risks.some((risk) => risk.target.includes("피부염")));
assert.ok(digestiveSkin.risks.some((risk) => risk.target.includes("IBD")));

const coughOnly = retrieveRagContext("맥스가 오늘 기침만 조금 해. NGS랑 관련이 있어?", {
  isPetHealthQuestion: true,
  shouldRecommendDiet: false,
});

assert.equal(coughOnly.enabled, true);
assert.ok(coughOnly.structured.symptoms.includes("호흡기 증상"));
assert.ok(coughOnly.risks.some((risk) => risk.target.includes("호흡기")));

const respiratoryOnly = retrieveRagContext("맥스가 오늘 기침만 조금 해", {
  isPetHealthQuestion: true,
  shouldRecommendDiet: false,
});

assert.equal(respiratoryOnly.enabled, true);
assert.ok(respiratoryOnly.structured.symptoms.includes("호흡기 증상"));
assert.ok(!sourceIds(respiratoryOnly).includes("ngs_max_demo_profile"));
assert.ok(!respiratoryOnly.documents.some((doc) => doc.type === "ngs_record"));

const constipationWithResolvedCough = retrieveRagContext("맥스가 오늘은 변이 너무 딱딱해. 기침은 멈췄는데 뭐가 문제지?", {
  isPetHealthQuestion: true,
  shouldRecommendDiet: false,
});

assert.equal(constipationWithResolvedCough.enabled, true);
assert.ok(constipationWithResolvedCough.structured.symptoms.includes("소화기/배변 이상"));
assert.ok(!constipationWithResolvedCough.structured.symptoms.includes("호흡기 증상"));

const appetiteSymptom = retrieveRagContext("맥스가 밥을 잘 안 먹고 기운이 없어", {
  isPetHealthQuestion: true,
  shouldRecommendDiet: false,
});

assert.equal(appetiteSymptom.enabled, true);
assert.ok(appetiteSymptom.structured.symptoms.includes("식욕 저하"));
assert.ok(!appetiteSymptom.structured.intent.includes("맞춤 식이 솔루션 요청"));
assert.ok(!sourceIds(appetiteSymptom).includes("nutrition_barf_kangaroo"));

const diet = retrieveRagContext("알러지 개선을 위해 바프독 식단을 추천해줘", {
  isPetHealthQuestion: true,
  shouldRecommendDiet: true,
});

assert.equal(diet.enabled, true);
assert.ok(sourceIds(diet).includes("nutrition_barf_kangaroo"));

const greeting = retrieveRagContext("안녕 오늘 기분 어때?", {
  isPetHealthQuestion: false,
  shouldRecommendDiet: false,
});

assert.equal(greeting.enabled, false);
assert.equal(greeting.documents.length, 0);

const { prompt } = buildRagPrompt("최신 건강검진 검사 결과를 요약해줘", {
  isPetHealthQuestion: true,
  shouldRecommendDiet: false,
});

assert.match(prompt, /\[INFODOG RAG 입력\]/);
assert.match(prompt, /검색된 PHR\/NGS\/영양 근거/);

console.log("RAG retriever tests passed");
