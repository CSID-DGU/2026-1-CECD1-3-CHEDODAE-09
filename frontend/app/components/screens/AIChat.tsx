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
      showRiskAnalysis?: boolean;
    };

type AIChatProps = {
  initialPrompt?: string;
  initialAttachment?: ChatAttachment | null;
  savedConversation?: RecentReport | null;
  onPromptConsumed?: () => void;
  onExchangeSaved?: (
    question: string,
    answer: string,
    hasDietRecommendation?: boolean,
    hasRiskAnalysis?: boolean,
    attachmentName?: string,
    attachmentUrl?: string,
  ) => void;
  onOpenSolution?: () => void;
};

const INITIAL_ASSISTANT_MESSAGE_ID = 1;

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

function shouldShowDietRecommendation(question: string) {
  return (
    isPetHealthQuestion(question) &&
    DIET_RECOMMENDATION_KEYWORDS.some((keyword) => question.includes(keyword))
  );
}

function exchangeToMessages(exchange: ChatExchange): ChatMessage[] {
  return [
    {
      id: exchange.id * 10,
      role: "user",
      text: exchange.question,
      time: exchange.time,
      attachmentName: exchange.attachmentName,
      attachmentUrl: exchange.attachmentUrl,
    },
    {
      id: exchange.id * 10 + 1,
      role: "assistant",
      text: exchange.answer,
      time: exchange.time,
      showDietRecommendation: exchange.hasDietRecommendation,
      showRiskAnalysis: exchange.hasRiskAnalysis,
    },
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
            눌러서 솔루션 화면에서 AI 추천 식단을 확인하세요.
          </p>
        </div>
      </div>
    </button>
  );
}

export default function AIChat({
  initialPrompt,
  initialAttachment,
  savedConversation,
  onPromptConsumed,
  onExchangeSaved,
  onOpenSolution,
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => createInitialMessages());
  const [input, setInput] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileUrl, setAttachedFileUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consumedPromptRef = useRef("");
  const restoredConversationRef = useRef<number | null>(null);

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
    if (!savedConversation?.exchanges?.length) return;
    if (restoredConversationRef.current === savedConversation.id) return;
    if (messages.length > 1) return;

    const exchanges = savedConversation.exchanges;
    restoredConversationRef.current = savedConversation.id;
    const timer = window.setTimeout(() => {
      setMessages([...createInitialMessages(), ...exchanges.flatMap(exchangeToMessages)]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [savedConversation, messages.length]);

  const sendQuestion = useCallback(async (question: string, attachmentOverride?: ChatAttachment | null) => {
    const text = question.trim();
    if (!text || isGenerating) return;

    let activeAttachmentName = attachedFileName;
    if (attachmentOverride && attachmentOverride.name) {
      activeAttachmentName = attachmentOverride.name;
    }

    let activeAttachmentUrl = attachedFileUrl;
    if (attachmentOverride && attachmentOverride.url) {
      activeAttachmentUrl = attachmentOverride.url;
    }

    const now = Date.now();
    const loadingId = now + 1;
    
    const isHealthQuestion = isPetHealthQuestion(text);
    const shouldRecommendDiet = shouldShowDietRecommendation(text);
    const shouldShowRiskAnalysis = isHealthQuestion && !shouldRecommendDiet;

    // 1. 화면에 띄워져 있는 기존 메시지들을 제미나이 양식(history)으로 변환
    const chatHistory = [];
    for (const msg of messages) {
      if (msg.id === 1) {
        continue; // 첫 인사말은 제외
      }
      if (msg.role === "user") {
        chatHistory.push({
          role: "user",
          parts: [{ text: msg.text }]
        });
      }
      if (msg.role === "assistant" && msg.text !== "") {
        chatHistory.push({
          role: "model",
          parts: [{ text: msg.text }]
        });
      }
    }

    // 2. 사용자가 방금 입력한 질문과 로딩 상태를 화면에 먼저 추가
    setMessages((current) => {
      const newMessages = [...current];
      newMessages.push({
        id: now,
        role: "user",
        text,
        time: formatTime(),
        attachmentName: activeAttachmentName,
        attachmentUrl: activeAttachmentUrl,
      });
      newMessages.push({
        id: loadingId,
        role: "assistant",
        text: "답변을 생성하고 있어요",
        time: formatTime(),
        isGenerating: true,
      });
      return newMessages;
    });

    setInput("");
    const sentAttachmentName = activeAttachmentName;
    const sentAttachmentUrl = activeAttachmentUrl;
    setAttachedFileName("");
    setAttachedFileUrl("");
    setIsGenerating(true);

    try {
      // 3. 백엔드로 현재 질문(message)과 과거 대화 기록(history)을 함께 전송
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: text,
          history: chatHistory,
          isPetHealthQuestion: isHealthQuestion,
          shouldRecommendDiet,
        }),
      });

      let answer = "서버와 연결하는 중 문제가 발생했습니다.";
      if (response.ok) {
        const data = await response.json();
        answer = data.reply;
      } else {
        const data = await response.json().catch(() => null);
        answer = data?.error ?? answer;
      }

      // 4. 받아온 진짜 답변으로 로딩 메시지를 교체하고 타이핑 효과 시작
      setMessages((current) => {
        return current.map((message) => {
          if (message.id === loadingId) {
            return {
              id: now + 2,
              role: "assistant",
              text: "",
              fullText: answer,
              time: formatTime(),
              isTyping: true,
              showDietRecommendation: shouldRecommendDiet,
              showRiskAnalysis: shouldShowRiskAnalysis,
            };
          }
          return message;
        });
      });

      if (onExchangeSaved) {
        onExchangeSaved(
          text,
          answer,
          shouldRecommendDiet,
          shouldShowRiskAnalysis,
          sentAttachmentName || undefined,
          sentAttachmentUrl || undefined,
        );
      }
    } catch (error) {
      console.error("API 통신 에러:", error);
      const answer = "서버와 연결하는 중 문제가 발생했습니다. 백엔드 서버가 실행 중인지 확인해 주세요.";
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingId
            ? {
                id: now + 2,
                role: "assistant",
                text: answer,
                time: formatTime(),
                showDietRecommendation: false,
                showRiskAnalysis: false,
              }
            : message,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [attachedFileName, attachedFileUrl, isGenerating, messages, onExchangeSaved]);

  useEffect(() => {
    const prompt = initialPrompt?.trim();
    if (!prompt || consumedPromptRef.current === prompt) return;

    consumedPromptRef.current = prompt;
    sendQuestion(prompt, initialAttachment);
    onPromptConsumed?.();
  }, [initialPrompt, initialAttachment, onPromptConsumed, sendQuestion]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="flex h-full flex-col bg-[#FFFAF3]">
      <div className="border-b border-[#EADFCF] bg-white px-5 py-4">
        <p className="text-sm font-black tracking-[0.16em] text-[#256C4F]">AI RECOMMEND</p>
        <h2 className="mt-1 text-2xl font-black text-[#2D2A26]">맞춤 건강 분석</h2>
        <p className="mt-1 text-base leading-7 text-[#8A7B6C]">
          입력하신 질문에 맞춰 답변하고, 이에 맞는 추천 카드가 표시됩니다.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-28">
        <div className="space-y-6">
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
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
              <div key={message.id} className="flex justify-start">
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
                    ) : message.showRiskAnalysis ? (
                      <RiskCard />
                    ) : null)}
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
                // (+) api 연결 필요: 현재 브라우저 미리보기 URL만 제작, 실제 파일 업로드 API 응답 URL로 바꾸어야 함
                setAttachedFileName(file.name);
                setAttachedFileUrl(URL.createObjectURL(file));
              }
            }}
          />
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="추가 질문을 입력하세요..."
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-[#2D2A26] outline-none placeholder:text-[#A89B8B]"
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
            <span className="min-w-0 truncate">선택된 사진 {attachedFileName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
