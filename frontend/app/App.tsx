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
  hasDietRecommendation?: boolean;
  hasRiskAnalysis?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
};

export type ChatAttachment = {
  name: string;
  url: string;
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
    title: "바프독 맞춤 생식 매칭 결과",
    summary: "단백질원 및 프리바이오틱스 처방 가이드",
    tag: "식이 추천",
    tagClassName: "text-[#C46D23] bg-[#FFF1DF]",
    time: "3일 전",
    targetTab: "diet",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatAttachment, setChatAttachment] = useState<ChatAttachment | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showAiRecommendation, setShowAiRecommendation] = useState(false);
  const [recentReports, setRecentReports] = useState<RecentReport[]>(defaultReports);

  const tabs = [
    { id: "home", label: "홈", icon: Home },
    { id: "chat", label: "대화방", icon: MessagesSquare },
    { id: "report", label: "리포트", icon: FileText },
    { id: "diet", label: "솔루션", icon: Package },
    { id: "trends", label: "건강추이", icon: LineChart },
  ];

  useEffect(() => {
    // (+) 프로토타입에서는 앱이 새로 켜질 때마다 이전 생성 리포트를 초기화
    // (+) api 연결 필요: GET /api/chat-reports 응답으로 recentReports 세팅
    window.localStorage.removeItem("infradog-chat-reports");
    window.sessionStorage.removeItem("infradog-chat-reports");
  }, []);

  useEffect(() => {
    // (+) api 연결 필요: 현재 세션에 임시 저장중, 나중엔 POST/PUT /api/chat-reports/{id}로 exchanges 전체를 저장
    window.sessionStorage.setItem("infradog-chat-reports", JSON.stringify(recentReports));
  }, [recentReports]);

  const askInChat = (prompt: string, attachment?: ChatAttachment) => {
    setActiveConversationId(null);
    setShowAiRecommendation(false);
    setChatPrompt(prompt);
    setChatAttachment(attachment ?? null);
    setActiveTab("chat");
  };

  const goToTab = (tab: string) => {
    if (tab === "diet") {
      setShowAiRecommendation(false);
    }
    setActiveTab(tab);
  };

  const openAiRecommendation = () => {
    setShowAiRecommendation(true);
    setActiveTab("diet");
  };

  const saveChatExchange = (
    question: string,
    answer: string,
    hasDietRecommendation = false,
    hasRiskAnalysis = false,
    attachmentName?: string,
    attachmentUrl?: string,
  ) => {
    const now = Date.now();
    const exchange: ChatExchange = {
      id: now,
      question,
      answer,
      time: new Intl.DateTimeFormat("ko-KR", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date()),
      hasDietRecommendation,
      hasRiskAnalysis,
      attachmentName,
      attachmentUrl,
    };

    setRecentReports((current) => {
      const conversationId = activeConversationId ?? now;
      const existing = current.find((report) => report.id === conversationId);

      if (existing) {
        return current.map((report) =>
          report.id === conversationId
            ? {
                ...report,
                title: report.title,
                summary: `${(report.exchanges?.length ?? 0) + 1}개의 질문/답변이 저장된 채팅 기록입니다.`,
                time: "방금",
                exchanges: [...(report.exchanges ?? []), exchange],
              }
            : {
                ...report,
                time: report.time === "방금" ? "조금 전" : report.time,
              },
        );
      }

      setActiveConversationId(conversationId);
      const title = question.length > 24 ? `${question.slice(0, 24)}...` : question;

      return [
        {
          id: conversationId,
          title,
          summary: "1개의 질문/답변이 저장된 채팅 기록입니다.",
          tag: "AI 채팅",
          tagClassName: "text-[#256C4F] bg-[#E8F5EE]",
          time: "방금",
          targetTab: "chat",
          exchanges: [exchange],
        },
        ...current.map((report) => ({
          ...report,
          time: report.time === "방금" ? "조금 전" : report.time,
        })),
      ].slice(0, 5);
    });
  };

  const openRecentReport = (report: RecentReport) => {
    if (report.targetTab === "chat" && report.exchanges?.length) {
      // (+) api 연결 필요: report.id로 대화 상세를 조회해서 exchanges를 채워야 함
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
            initialPrompt={chatPrompt}
            initialAttachment={chatAttachment}
            savedConversation={activeConversation}
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
          {renderScreen()}
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
