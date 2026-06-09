"use client";

import React, { useEffect, useState } from "react";
import { FileText, Home, LineChart, MessagesSquare, Package } from "lucide-react";
import DataHub from "./components/screens/DataHub";
import AIChat from "./components/screens/AIChat";
import BioReport from "./components/screens/BioReport";
import DietSolution from "./components/screens/DietSolution";
import HealthTrends from "./components/screens/HealthTrends";

export type ChatExchange = {
  id: number;
  question: string;
  answer: string;
  time: string;
  isPending?: boolean;
  hasDietRecommendation?: boolean;
  hasRiskAnalysis?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentMimeType?: string;
};

export type ChatAttachment = {
  name: string;
  url: string;
  mimeType?: string;
};

export type RecentReport = {
  id: number;
  title: string;
  summary: string;
  tag: string;
  tagClassName: string;
  time: string;
  targetTab: string;
  exchanges?: ChatExchange[];
};

const CHAT_REPORTS_STORAGE_KEY = "infradog-chat-reports";

const defaultReports: RecentReport[] = [
  {
    id: 1,
    title: "피부 알러지 및 장 건강 연계 분석",
    summary: "맥스의 NGS 데이터와 피부 증상을 대조한 결과입니다.",
    tag: "정밀 분석",
    tagClassName: "text-[#256C4F] bg-[#E8F5EE]",
    time: "어제",
    targetTab: "report",
  },
  {
    id: 2,
    title: "맞춤 식단 매칭 결과",
    summary: "단백질원 및 프리바이오틱스 처방 가이드",
    tag: "식이 추천",
    tagClassName: "text-[#C46D23] bg-[#FFF1DF]",
    time: "3일 전",
    targetTab: "diet",
  },
];

function formatReportTime() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function makeReportTitle(question: string) {
  return question.length > 24 ? `${question.slice(0, 24)}...` : question;
}

function makeChatSummary(count: number, isPending = false) {
  return isPending
    ? "답변 생성 중인 채팅 리포트입니다."
    : `${count}개의 질문/답변이 저장된 채팅 기록입니다.`;
}

function touchOtherReports(report: RecentReport) {
  return {
    ...report,
    time: report.time === "방금" ? "조금 전" : report.time,
  };
}

function makeExchangeId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function loadSavedReports() {
  // 채팅 백업 불러오기 추가
  if (typeof window === "undefined") {
    return defaultReports;
  }

  try {
    const savedReports = window.localStorage.getItem(CHAT_REPORTS_STORAGE_KEY);
    if (!savedReports) {
      return defaultReports;
    }

    const parsedReports = JSON.parse(savedReports);
    if (!Array.isArray(parsedReports)) {
      return defaultReports;
    }

    const validReports = parsedReports
      .filter((report) => report?.targetTab !== "chat" || report.exchanges?.length)
      .map((report) => {
        if (report?.targetTab !== "chat" || !Array.isArray(report.exchanges)) {
          return report;
        }

        const seenExchangeIds = new Set<number>();
        return {
          ...report,
          exchanges: report.exchanges.map((exchange: ChatExchange, index: number) => {
            const exchangeId =
              typeof exchange.id === "number" && !seenExchangeIds.has(exchange.id)
                ? exchange.id
                : report.id + index + 1;

            seenExchangeIds.add(exchangeId);
            return {
              ...exchange,
              id: exchangeId,
            };
          }),
        };
      });
    return validReports.length ? validReports : defaultReports;
  } catch {
    return defaultReports;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatAttachment, setChatAttachment] = useState<ChatAttachment | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showAiRecommendation, setShowAiRecommendation] = useState(false);
  const [recentReports, setRecentReports] = useState<RecentReport[]>(defaultReports);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  const tabs = [
    { id: "home", label: "홈", icon: Home },
    { id: "chat", label: "대화방", icon: MessagesSquare },
    { id: "report", label: "리포트", icon: FileText },
    { id: "diet", label: "솔루션", icon: Package },
    { id: "trends", label: "건강추이", icon: LineChart },
  ];

  useEffect(() => {
    // 채팅 백업 초기 복원 추가
    const timer = window.setTimeout(() => {
      setRecentReports(loadSavedReports());
      setIsStorageLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 채팅 백업 로컬 저장 추가
    if (!isStorageLoaded) return;
    window.localStorage.setItem(CHAT_REPORTS_STORAGE_KEY, JSON.stringify(recentReports));
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[INFODOG] saved chat reports",
        recentReports
          .filter((report) => report.targetTab === "chat")
          .map((report) => ({
            id: report.id,
            title: report.title,
            exchanges: report.exchanges?.length ?? 0,
            completed: report.exchanges?.filter((exchange) => exchange.answer).length ?? 0,
          })),
      );
    }
  }, [isStorageLoaded, recentReports]);

  const createChatReport = (question: string, attachment?: ChatAttachment) => {
    // 채팅 질문 즉시 리포트 백업 추가
    const conversationId = Date.now();
    const pendingExchange: ChatExchange = {
      id: conversationId,
      question,
      answer: "",
      time: formatReportTime(),
      isPending: true,
      attachmentName: attachment?.name,
      attachmentUrl: attachment?.url,
      attachmentMimeType: attachment?.mimeType,
    };

    setRecentReports((current) => [
      {
        id: conversationId,
        title: makeReportTitle(question),
        summary: makeChatSummary(0, true),
        tag: "AI 채팅",
        tagClassName: "text-[#256C4F] bg-[#E8F5EE]",
        time: "방금",
        targetTab: "chat",
        exchanges: [pendingExchange],
      },
      ...current.map(touchOtherReports),
    ].slice(0, 5));

    setActiveConversationId(conversationId);
    return conversationId;
  };

  const askInChat = (prompt: string, attachment?: ChatAttachment) => {
    const conversationId = createChatReport(prompt, attachment);
    setActiveConversationId(conversationId);
    setShowAiRecommendation(false);
    setChatPrompt(prompt);
    setChatAttachment(attachment ?? null);
    setActiveTab("chat");
  };

  const goToTab = (tab: string) => {
    if (tab === "diet") {
      setShowAiRecommendation(false);
    }
    if (tab === "chat") {
      setActiveConversationId(null);
      setChatPrompt("");
      setChatAttachment(null);
      setShowAiRecommendation(false);
    }
    setActiveTab(tab);
  };

  const openAiRecommendation = () => {
    setShowAiRecommendation(true);
    setActiveTab("diet");
  };

  const saveChatExchange = (
    conversationId: number,
    question: string,
    answer: string,
    hasDietRecommendation = false,
    hasRiskAnalysis = false,
    attachmentName?: string,
    attachmentUrl?: string,
    attachmentMimeType?: string,
  ) => {
    // 채팅 답변 완료 후 백업 갱신 추가
    setRecentReports((current) => {
      const existing = current.find((report) => report.id === conversationId);
      const completedExchange: ChatExchange = {
        id: makeExchangeId(),
        question,
        answer,
        time: formatReportTime(),
        hasDietRecommendation,
        attachmentName,
        attachmentUrl,
        attachmentMimeType,
      };

      if (!existing) {
        return [
          {
            id: conversationId,
            title: makeReportTitle(question),
            summary: makeChatSummary(1),
            tag: "AI 채팅",
            tagClassName: "text-[#256C4F] bg-[#E8F5EE]",
            time: "방금",
            targetTab: "chat",
            exchanges: [completedExchange],
          },
          ...current.map(touchOtherReports),
        ].slice(0, 5);
      }

      return current.map((report) => {
        if (report.id !== conversationId) {
          return touchOtherReports(report);
        }

        const exchanges = report.exchanges ?? [];
        const pendingIndex = exchanges.findIndex(
          (exchange) => exchange.isPending && exchange.question === question,
        );
        const nextExchanges =
          pendingIndex >= 0
            ? exchanges.map((exchange, index) =>
                index === pendingIndex ? completedExchange : exchange,
              )
            : [...exchanges, completedExchange];

        return {
          ...report,
          title: report.title || makeReportTitle(question),
          summary: makeChatSummary(nextExchanges.filter((exchange) => !exchange.isPending).length),
          tag: "AI 채팅",
          tagClassName: "text-[#256C4F] bg-[#E8F5EE]",
          time: "방금",
          targetTab: "chat",
          exchanges: nextExchanges,
        };
      });
    });
  };

  const openRecentReport = (report: RecentReport) => {
    if (report.targetTab === "chat") {
      setActiveConversationId(report.id);
      setChatPrompt("");
      setChatAttachment(null);
      setActiveTab("chat");
      return;
    }

    setActiveTab(report.targetTab);
  };

  const deleteRecentReport = (reportId: number) => {
    setRecentReports((current) => current.filter((report) => report.id !== reportId));
    if (activeConversationId === reportId) {
      setActiveConversationId(null);
      setChatPrompt("");
      setChatAttachment(null);
    }
  };

  const activeConversation =
    activeConversationId === null
      ? null
      : recentReports.find((report) => report.id === activeConversationId) ?? null;

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return (
          <DataHub
            onNavigate={goToTab}
            onAsk={askInChat}
            onOpenReport={openRecentReport}
            onDeleteReport={deleteRecentReport}
            recentReports={recentReports}
          />
        );
      case "chat":
        return (
          <AIChat
            conversationId={activeConversationId}
            initialPrompt={chatPrompt}
            initialAttachment={chatAttachment}
            savedConversation={activeConversation}
            onCreateReport={createChatReport}
            onPromptConsumed={() => {
              setChatPrompt("");
              setChatAttachment(null);
            }}
            onExchangeSaved={saveChatExchange}
            onOpenSolution={openAiRecommendation}
          />
        );
      case "report":
        return <BioReport />;
      case "diet":
        return <DietSolution isAiRecommendation={showAiRecommendation} />;
      case "trends":
        return <HealthTrends />;
      default:
        return (
          <DataHub
            onNavigate={goToTab}
            onAsk={askInChat}
            onOpenReport={openRecentReport}
            onDeleteReport={deleteRecentReport}
            recentReports={recentReports}
          />
        );
    }
  };

  return (
    <div
      id="infodog-app-shell"
      className="flex h-full w-full min-w-0 justify-center overflow-hidden bg-white font-sans text-[#2D2A26]"
      style={{ overflowX: "hidden" }}
    >
      <div
        className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#FFFAF3] shadow-2xl"
        style={{ overflowX: "hidden" }}
      >
        <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-[#EADFCF] bg-white px-5 py-4">
          <button onClick={() => setActiveTab("home")} className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#256C4F] text-white">
              <Home size={18} />
            </div>
            <h1 className="text-lg font-black tracking-tight text-[#2D2A26]">
              INFODOG
            </h1>
          </button>
          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-end">
              <span className="text-base font-bold text-[#2D2A26]">맥스 (Max)</span>
              <span className="text-sm text-[#8A7B6C]">골든리트리버</span>
            </div>
            <img
              src="https://images.unsplash.com/photo-1734966213753-1b361564bab4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200"
              alt="Max"
              className="h-10 w-10 rounded-full border border-[#EADFCF] object-cover shadow-sm"
            />
          </div>
        </header>

        <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto pb-[86px]">
          {isStorageLoaded ? (
            renderScreen()
          ) : (
            <div className="flex h-full items-center justify-center text-base font-bold text-[#8A7B6C]">
              채팅 백업 불러오는 중
            </div>
          )}
        </main>

        <nav className="absolute bottom-0 left-0 right-0 z-30 flex w-full items-center justify-between border-t border-[#EADFCF] bg-white pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => goToTab(tab.id)}
                className={`relative flex w-full flex-col items-center justify-center py-3 transition-colors ${
                  isActive ? "text-[#256C4F]" : "text-[#A89B8B] hover:text-[#6F6254]"
                }`}
              >
                <div
                  className={`mb-0.5 rounded-xl p-1.5 transition-all duration-200 ${
                    isActive ? "scale-110 bg-[#E8F5EE]" : "scale-100"
                  }`}
                >
                  <Icon size={22} />
                </div>
                <span className={`text-sm font-medium ${isActive ? "font-black" : ""}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 h-1 w-8 rounded-b-full bg-[#256C4F]" />
                )}
              </button>
            );
          })}
        </nav>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              .pb-safe {
                padding-bottom: env(safe-area-inset-bottom, 0px);
              }
            `,
          }}
        />
      </div>
    </div>
  );
}
