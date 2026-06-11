const { retrieveRagContext } = require("../rag/retriever");

const cliQuestion = process.argv.slice(2).join(" ").trim();
const sampleQuestions = cliQuestion ? [cliQuestion] : [
  "맥스가 배를 자주 긁고 변이 묽은데 NGS랑 관련이 있을까?",
  "알러지 개선을 위해 바프독 식단을 추천해줘",
  "NGS 결과에서 유익균이 부족하면 어떻게 관리해야 해?",
];

for (const question of sampleQuestions) {
  const rag = retrieveRagContext(question, {
    isPetHealthQuestion: true,
    shouldRecommendDiet: /식단|바프독|추천|먹|급여/.test(question),
    topK: 5,
  });

  console.log("\n============================================================");
  console.log(`질문: ${question}`);
  console.log(`RAG query: ${rag.query}`);
  console.log("위험도:");
  rag.risks.forEach((risk) => {
    console.log(`- ${risk.target}: ${risk.score}% (${risk.level})`);
  });
  console.log("검색 근거:");
  rag.documents.forEach((doc, index) => {
    console.log(`${index + 1}. [${doc.type}] ${doc.title}`);
  });
}

console.log("\nRAG preview complete");
