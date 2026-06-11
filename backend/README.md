# INFODOG 백엔드

Express 기반 Gemini API 서버입니다. `/api/chat` 요청을 받으면 기존 대화 이력과 이미지 첨부를 Gemini에 전달합니다.

## RAG 흐름

파인튜닝 비용을 줄이기 위해 `backend/data/rag-documents.json`에 정리된 PHR, NGS, 식이 솔루션 근거를 로컬 RAG 코퍼스로 사용합니다.
현재 포함된 코퍼스는 GitHub 공개용 익명 데이터셋입니다.

- 원본 NGS 100마리 전부 익명화
- 반려견 이름, 정확한 생년월일, 알러지원 원문, 자유서술 치료 내용, 원본 row 번호 제거
- 질환군, 나이대, 체중대, 알러지/치료 카테고리, NGS 다양성 지표, 주요 균 정보 유지

1. 사용자 질문을 증상, 의도, 타겟 질환 후보로 구조화합니다.
2. PHR/NGS 기반 휴리스틱 위험도 예측 결과를 만듭니다.
3. 구조화 입력과 위험도 결과로 RAG query를 구성합니다.
4. 로컬 문서에서 관련 PHR, NGS, 영양 근거를 검색합니다.
5. 검색 근거를 Gemini 프롬프트에 주입해 최종 답변을 생성합니다.

프론트엔드 API 계약은 기존과 동일하게 `reply`를 사용하면 됩니다. 응답에는 디버깅 및 근거 확인용으로 `rag.sources`가 함께 포함됩니다.

## 실행

`backend/.env` 파일에는 Gemini API 키 한 줄만 넣으면 됩니다.

```bash
npm install
cp .env.example .env
```

`.env` 예시:

```text
GEMINI_API_KEY=발급받은_Gemini_API_키
```

서버 실행:

```bash
npm run dev
```

기본 실행 주소는 `http://localhost:5001`입니다. Gemini 무료 사용량을 모두 소진해 새 키를 발급받은 경우에는 `.env`의 `GEMINI_API_KEY` 값만 교체한 뒤 백엔드를 다시 실행하면 됩니다.

## 테스트

```bash
npm test
```

Gemini API 키 없이 RAG 검색 결과만 확인:

```bash
npm run rag:preview
```

질문을 직접 지정해서 확인:

```bash
npm run rag:preview -- "알러지 개선을 위해 어떤 식단을 먼저 테스트하면 좋을까?"
```

프론트엔드까지 함께 볼 때:

```bash
npm run dev
```

프론트엔드에서는:

```bash
npm run dev
```

서버 실행 후 RAG preview API:

```bash
curl -X POST http://localhost:5001/api/rag/preview \
  -H "Content-Type: application/json" \
  -d '{"message":"알러지 개선을 위해 바프독 식단을 추천해줘","shouldRecommendDiet":true,"topK":5}'
```
