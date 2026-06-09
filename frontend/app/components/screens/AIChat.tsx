"use client";

import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Camera, Info, Send } from "lucide-react";
import type { ChatAttachment, ChatExchange, RecentReport } from "../../App";

type ChatMessage =
  | {
      id: number;
      role: "user";
      text: string;
      time: string;
      attachmentName?: string;
      attachmentUrl?: string;
      attachmentMimeType?: string;
    }
  | {
      id: number;
      role: "assistant";
      text: string;
      time: string;
      isGenerating?: boolean;
      isTyping?: boolean;
      fullText?: string;
      showDietRecommendation?: boolean;
    };

type AIChatProps = {
  conversationId?: number | null;
  initialPrompt?: string;
  initialAttachment?: ChatAttachment | null;
  savedConversation?: RecentReport | null;
  onCreateReport?: (question: string, attachment?: ChatAttachment) => number;
  onPromptConsumed?: () => void;
  onExchangeSaved?: (
    conversationId: number,
    question: string,
    answer: string,
    hasDietRecommendation?: boolean,
    attachmentName?: string,
    attachmentUrl?: string,
    attachmentMimeType?: string,
  ) => void;
  onOpenSolution?: () => void;
};

const INITIAL_ASSISTANT_MESSAGE_ID = 1;
const AI_CHAT_API_URL =
  process.env.NEXT_PUBLIC_AI_CHAT_API_URL ?? "http://localhost:5000/api/chat";

function formatTime() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function createInitialMessages(): ChatMessage[] {
  return [
    {
      id: INITIAL_ASSISTANT_MESSAGE_ID,
      role: "assistant",
      time: formatTime(),
      text: "안녕하세요. 맥스의 PHR 및 NGS 데이터를 기반으로 건강 상태, 피부 증상, 식단 추천을 함께 분석해드릴게요.",
    },
  ];
}

const PET_HEALTH_KEYWORDS = [
  "맥스",
  "강아지",
  "반려견",
  "반려동물",
  "건강검진",
  "증상",
  "피부",
  "알러지",
  "알레르기",
  "가려움",
  "긁",
  "변",
  "묽",
  "설사",
  "소화",
  "장내",
  "유익균",
  "유산균",
  "마이크로바이옴",
  "NGS",
  "PHR",
  "사료",
  "생식",
  "식단",
  "바프독",
  "단백질",
  "캥거루",
  "리포트",
  "검사",
];

const DIET_RECOMMENDATION_KEYWORDS = [
  "식단",
  "바프독",
  "사료",
  "생식",
  "단백질",
  "캥거루",
  "추천",
  "먹",
  "급여",
];

function isPetHealthQuestion(question: string) {
  return PET_HEALTH_KEYWORDS.some((keyword) => question.includes(keyword));
}

function shouldShowDietRecommendation(question: string, answerIndex: number) {
  return (
    answerIndex === 2 ||
    (isPetHealthQuestion(question) &&
      DIET_RECOMMENDATION_KEYWORDS.some((keyword) => question.includes(keyword)))
  );
}

function createAnswer(question: string, shouldRecommendDiet: boolean) {
  if (shouldRecommendDiet) {
    return "맥스의 알러지 개선 목적이라면 닭고기와 소고기처럼 반응 가능성이 높은 단백질은 잠시 제외하고, 캥거루처럼 단일 단백질 기반 식단을 먼저 테스트하는 것이 좋습니다. 아래 맞춤 식단 추천을 통해 솔루션 화면에서 AI 추천 상품을 확인해보세요.";
  }

  if (question.includes("마이크로바이옴") || question.includes("NGS")) {
    return "최근 마이크로바이옴 검사 결과를 요약하면, 맥스의 장내 유익균 비율이 낮아지고 피부 민감도와 연결될 수 있는 위험 신호가 보입니다. 유산균 보강과 알러지 유발 가능성이 낮은 단백질 중심 식단 관리가 우선입니다.";
  }

  if (
    question.includes("긁") ||
    question.includes("묽") ||
    question.includes("변") ||
    question.includes("배")
  ) {
    return "배를 자주 긁고 변이 묽은 증상은 피부 알러지 반응과 장내 균형 변화가 같이 나타날 때 자주 보입니다. 최근 NGS 데이터와 연결하면 소화기 민감도와 피부 알러지 가능성을 함께 관리하는 방향이 좋습니다.";
  }

  return "입력하신 내용을 기준으로 보면, 맥스의 최근 증상은 피부 민감도와 장내 균형 변화가 함께 영향을 줄 가능성이 있습니다. 먼저 위험도 분석을 보고, 필요하면 다음 질문에서 식단 추천까지 이어서 확인할 수 있어요.";
}

function createGeminiHistory(messages: ChatMessage[]) {
  // Gemini 대화 기록 변환 추가
  return messages.flatMap((message) => {
    if (message.id === INITIAL_ASSISTANT_MESSAGE_ID) {
      return [];
    }

    if (message.role === "user") {
      return [{ role: "user", parts: [{ text: message.text }] }];
    }

    if (message.isGenerating || message.isTyping) {
      return [];
    }

    if (!message.text) {
      return [];
    }

    return [{ role: "model", parts: [{ text: message.text }] }];
  });
}

function readFileAsDataUrl(file: File) {
  // 이미지 첨부 data URL 변환 추가
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("이미지 파일을 읽지 못했습니다."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("이미지 파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

async function requestGeminiAnswer(
  message: string,
  history: ReturnType<typeof createGeminiHistory>,
  isHealthQuestion: boolean,
  shouldRecommendDiet: boolean,
  attachment?: ChatAttachment,
) {
  // Gemini API 채팅 요청 추가
  const response = await fetch(AI_CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history,
      isPetHealthQuestion: isHealthQuestion,
      shouldRecommendDiet,
      attachment: attachment
        ? {
            name: attachment.name,
            mimeType: attachment.mimeType,
            dataUrl: attachment.url,
          }
        : undefined,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? "AI 서버 응답에 문제가 발생했습니다.");
  }

  return data?.reply || "AI 답변을 받아오지 못했습니다.";
}

function exchangeToMessages(exchange: ChatExchange): ChatMessage[] {
  // 백업된 채팅을 화면 메시지로 복원 추가
  const userMessage: ChatMessage = {
    id: exchange.id * 10,
    role: "user",
    text: exchange.question,
    time: exchange.time,
    attachmentName: exchange.attachmentName,
    attachmentUrl: exchange.attachmentUrl,
    attachmentMimeType: exchange.attachmentMimeType,
  };

  if (!exchange.answer) {
    return [userMessage];
  }

  return [
    userMessage,
    {
      id: exchange.id * 10 + 1,
      role: "assistant",
      text: exchange.answer,
      time: exchange.time,
      showDietRecommendation: exchange.hasDietRecommendation,
    },
  ];
}

function conversationToMessages(conversation?: RecentReport | null) {
  if (!conversation?.exchanges?.length) {
    return createInitialMessages();
  }

  return [
    ...createInitialMessages(),
    ...conversation.exchanges.flatMap(exchangeToMessages),
  ];
}

function AssistantAvatar() {
  return (
    <div className="mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#256C4F] text-white shadow-sm">
      <Bot size={15} />
    </div>
  );
}

function RiskCard() {
  return (
    <div className="rounded-2xl border border-[#EADFCF] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-1.5">
        <AlertTriangle size={14} className="text-[#C46D23]" />
        <h4 className="text-base font-black text-[#2D2A26]">AI 위험도 분석</h4>
      </div>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-bold text-[#574D43]">피부 알러지 가능성</span>
            <span className="font-black text-[#C46D23]">78% 위험</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#F0E8DD]">
            <div className="h-1.5 rounded-full bg-[#C46D23]" style={{ width: "78%" }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-bold text-[#574D43]">소화기 민감도</span>
            <span className="font-black text-yellow-600">65% 주의</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#F0E8DD]">
            <div className="h-1.5 rounded-full bg-yellow-400" style={{ width: "65%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DietRecommendationCard({ onOpenSolution }: { onOpenSolution?: () => void }) {
  return (
    <button
      onClick={onOpenSolution}
      className="w-full rounded-2xl border border-[#D6E9DC] bg-[#FBFFFC] p-4 text-left shadow-sm active:scale-[0.99]"
    >
      <div className="mb-3 flex items-center gap-1.5">
        <Info size={14} className="text-[#256C4F]" />
        <h4 className="text-base font-black text-[#2D2A26]">맞춤 식단 추천</h4>
        <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-sm font-black text-[#256C4F]">
          98% 매칭
        </span>
      </div>
      <div className="flex gap-3">
        <img
          src="https://images.unsplash.com/photo-1745252798506-29500efc5b39?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200"
          alt="Kangaroo raw food"
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
        <div>
          <h5 className="text-base font-black text-[#256C4F]">바프독 캥거루 단백질 식단</h5>
          <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#74695C]">
            솔루션 화면에서 AI 추천 식단을 확인해보세요.
          </p>
        </div>
      </div>
    </button>
  );
}

export default function AIChat({
  conversationId,
  initialPrompt,
  initialAttachment,
  savedConversation,
  onCreateReport,
  onPromptConsumed,
  onExchangeSaved,
  onOpenSolution,
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialPrompt?.trim() ? createInitialMessages() : conversationToMessages(savedConversation),
  );
  const [input, setInput] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileUrl, setAttachedFileUrl] = useState("");
  const [attachedFileMimeType, setAttachedFileMimeType] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const analysisTitle =
    !initialPrompt?.trim() && savedConversation?.exchanges?.[0]?.question
      ? savedConversation.exchanges[0].question
      : "맞춤 건강 분석";
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consumedPromptRef = useRef("");
  const restoredConversationRef = useRef("");
  const liveConversationIdRef = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const typingMessage = messages.find(
      (message) => message.role === "assistant" && message.isTyping && message.fullText,
    );

    if (!typingMessage || typingMessage.role !== "assistant" || !typingMessage.fullText) {
      return;
    }

    if (typingMessage.text.length >= typingMessage.fullText.length) {
      const timer = window.setTimeout(() => {
        setMessages((current) =>
          current.map((message) =>
            message.id === typingMessage.id
              ? { ...message, text: typingMessage.fullText ?? message.text, isTyping: false }
              : message,
          ),
        );
        setIsGenerating(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setMessages((current) =>
        current.map((message) =>
          message.id === typingMessage.id && message.role === "assistant" && message.fullText
            ? {
                ...message,
                text: message.fullText.slice(0, message.text.length + 2),
              }
            : message,
        ),
      );
    }, 28);

    return () => window.clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    // 저장된 대화 화면 복원 추가
    if (initialPrompt?.trim()) return;
    if (isGenerating) return;
    if (liveConversationIdRef.current === savedConversation?.id) return;
    const timer = window.setTimeout(() => {
      if (!savedConversation) {
        restoredConversationRef.current = "";
        setMessages(createInitialMessages());
        return;
      }

      const snapshotKey = JSON.stringify(
        savedConversation.exchanges?.map((exchange) => ({
          id: exchange.id,
          question: exchange.question,
          answer: exchange.answer,
          isPending: exchange.isPending,
        })) ?? [],
      );
      if (restoredConversationRef.current === snapshotKey) return;

      restoredConversationRef.current = snapshotKey;
      setMessages(conversationToMessages(savedConversation));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialPrompt, isGenerating, savedConversation]);

  const sendQuestion = useCallback(async (question: string, attachmentOverride?: ChatAttachment | null) => {
    // 채팅 전송 및 답변 저장 로직 추가
    const text = question.trim();
    if (!text || isGenerating) return;
    const activeAttachmentName = attachmentOverride?.name ?? attachedFileName;
    const activeAttachmentUrl = attachmentOverride?.url ?? attachedFileUrl;
    const activeAttachmentMimeType = attachmentOverride?.mimeType ?? attachedFileMimeType;
    const activeAttachment =
      activeAttachmentName && activeAttachmentUrl
        ? {
            name: activeAttachmentName,
            url: activeAttachmentUrl,
            mimeType: activeAttachmentMimeType,
          }
        : undefined;
    const targetConversationId =
      conversationId ?? liveConversationIdRef.current ?? onCreateReport?.(text, activeAttachment);
    if (!targetConversationId) return;

    liveConversationIdRef.current = targetConversationId;

    const now = Date.now();
    const loadingId = now + 1;
    const completedAnswers =
      messages.filter((message) => message.role === "assistant" && !message.isGenerating).length -
      1;
    const answerIndex = completedAnswers + 1;
    const shouldRecommendDiet = shouldShowDietRecommendation(text, answerIndex);
    const isHealthQuestion = isPetHealthQuestion(text);
    const chatHistory = createGeminiHistory(messages);

    setMessages((current) => [
      ...current,
      {
        id: now,
        role: "user",
        text,
        time: formatTime(),
        attachmentName: activeAttachmentName,
        attachmentUrl: activeAttachmentUrl,
        attachmentMimeType: activeAttachmentMimeType,
      },
      {
        id: loadingId,
        role: "assistant",
        text: "답변을 생성하고 있어요",
        time: formatTime(),
        isGenerating: true,
      },
    ]);
    setInput("");
    const sentAttachmentName = activeAttachmentName;
    const sentAttachmentUrl = activeAttachmentUrl;
    const sentAttachmentMimeType = activeAttachmentMimeType;
    setAttachedFileName("");
    setAttachedFileUrl("");
    setAttachedFileMimeType("");
    setIsGenerating(true);

    try {
      const answer = await requestGeminiAnswer(
        text,
        chatHistory,
        isHealthQuestion,
        shouldRecommendDiet,
        activeAttachment,
      );
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingId
            ? {
                id: now + 2,
                role: "assistant",
                text: "",
                fullText: answer,
                time: formatTime(),
                isTyping: true,
                showDietRecommendation: shouldRecommendDiet,
              }
            : message,
        ),
      );
      onExchangeSaved?.(
        targetConversationId,
        text,
        answer,
        shouldRecommendDiet,
        sentAttachmentName || undefined,
        sentAttachmentUrl || undefined,
        sentAttachmentMimeType || undefined,
      );
    } catch (error) {
      console.error("AI API error:", error);
      const answer = createAnswer(text, shouldRecommendDiet);
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingId
            ? {
                id: now + 2,
                role: "assistant",
                text: "",
                fullText: answer,
                time: formatTime(),
                isTyping: true,
                showDietRecommendation: shouldRecommendDiet,
              }
            : message,
        ),
      );
      onExchangeSaved?.(
        targetConversationId,
        text,
        answer,
        shouldRecommendDiet,
        sentAttachmentName || undefined,
        sentAttachmentUrl || undefined,
        sentAttachmentMimeType || undefined,
      );
    }
  }, [
    attachedFileName,
    attachedFileUrl,
    attachedFileMimeType,
    conversationId,
    isGenerating,
    messages,
    onCreateReport,
    onExchangeSaved,
  ]);

  useEffect(() => {
    // 홈 화면 질문 자동 전송 추가
    const prompt = initialPrompt?.trim();
    const promptKey = `${conversationId ?? "new"}:${prompt}`;
    if (!prompt || consumedPromptRef.current === promptKey) return;

    consumedPromptRef.current = promptKey;
    sendQuestion(prompt, initialAttachment);
    onPromptConsumed?.();
  }, [conversationId, initialPrompt, initialAttachment, onPromptConsumed, sendQuestion]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="flex h-full flex-col bg-[#FFFAF3]">
      <div className="border-b border-[#EADFCF] bg-white px-5 py-4">
        <p className="text-sm font-black tracking-[0.16em] text-[#256C4F]">AI RECOMMEND</p>
        <h2 className="mt-1 text-2xl font-black text-[#2D2A26]">{analysisTitle}</h2>
        <p className="mt-1 text-base leading-7 text-[#8A7B6C]">
          입력하신 질문에 맞춰 답변하고, 필요한 추천 카드를 함께 보여드릴게요.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-28">
        <div className="space-y-6">
          {messages.map((message, messageIndex) =>
            message.role === "user" ? (
              <div key={`${message.role}-${message.id}-${messageIndex}`} className="flex justify-end">
                <div className="flex max-w-[85%] flex-col items-end">
                  <div className="rounded-2xl rounded-tr-sm bg-[#256C4F] px-4 py-3 text-white shadow-sm">
                    <p className="whitespace-pre-wrap text-base leading-relaxed">{message.text}</p>
                    {message.attachmentUrl && (
                      <img
                        src={message.attachmentUrl}
                        alt={message.attachmentName ?? "uploaded image"}
                        className="mt-3 max-h-64 w-full rounded-xl object-cover"
                      />
                    )}
                  </div>
                  <span className="mt-1.5 text-sm text-[#A89B8B]">{message.time}</span>
                </div>
              </div>
            ) : (
              <div key={`${message.role}-${message.id}-${messageIndex}`} className="flex justify-start">
                <AssistantAvatar />
                <div className="max-w-[85%] space-y-3">
                  <div className="rounded-2xl rounded-tl-sm border border-[#EADFCF] bg-white px-4 py-3 shadow-sm">
                    {message.isGenerating ? (
                      <div className="flex items-center gap-2 text-base text-[#574D43]">
                        <span>{message.text}</span>
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#256C4F]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#256C4F] [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#256C4F] [animation-delay:240ms]" />
                        </span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-[#2D2A26]">
                        {message.text}
                        {message.isTyping && <span className="ml-0.5 animate-pulse">|</span>}
                      </p>
                    )}
                  </div>
                  {!message.isGenerating &&
                    !message.isTyping &&
                    message.id !== INITIAL_ASSISTANT_MESSAGE_ID &&
                    (message.showDietRecommendation ? (
                      <DietRecommendationCard onOpenSolution={onOpenSolution} />
                    ) : (
                      <RiskCard />
                    ))}
                  <span className="ml-1 block text-sm text-[#A89B8B]">{message.time}</span>
                </div>
              </div>
            ),
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="absolute bottom-[69px] w-full bg-gradient-to-t from-[#FFFAF3] via-[#FFFAF3] to-transparent p-4">
        <form
          onSubmit={handleSubmit}
          className="flex items-center rounded-full border border-[#EADFCF] bg-white p-2 shadow-sm"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#8A7B6C]"
          >
            <Camera size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setAttachedFileName(file.name);
                setAttachedFileMimeType(file.type);
                readFileAsDataUrl(file)
                  .then(setAttachedFileUrl)
                  .catch((error) => {
                    console.error("Image read error:", error);
                    setAttachedFileName("");
                    setAttachedFileMimeType("");
                    setAttachedFileUrl("");
                  });
              }
            }}
          />
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isGenerating}
            placeholder={isGenerating ? "답변이 완료된 뒤 입력할 수 있어요" : "추가 질문을 입력하세요..."}
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-[#2D2A26] outline-none placeholder:text-[#A89B8B] disabled:cursor-not-allowed disabled:text-[#A89B8B]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#256C4F] text-white disabled:bg-[#D8D0C6]"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </form>
        {attachedFileName && (
          <div className="mx-3 mt-2 flex items-center gap-3 rounded-xl bg-[#FFF1DF] px-3 py-2 text-sm font-bold text-[#C46D23]">
            {attachedFileUrl && (
              <img
                src={attachedFileUrl}
                alt={attachedFileName}
                className="h-12 w-12 rounded-lg object-cover"
              />
            )}
            <span className="min-w-0 truncate">선택한 사진 {attachedFileName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
