import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, History, ImageIcon, Loader2, MessageCircle, Search, X } from "lucide-react";
import type { ChatAttachment, RecentReport } from "../../App";

type DataHubProps = {
  onNavigate: (tab: string) => void;
  onAsk: (prompt: string, attachment?: ChatAttachment) => void;
  onOpenReport: (report: RecentReport) => void;
  onDeleteReport: (reportId: number) => void;
  recentReports: RecentReport[];
};

function readFileAsDataUrl(file: File) {
  // 홈 첨부 이미지 data URL 변환 추가
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

export default function DataHub({
  onNavigate,
  onAsk,
  onOpenReport,
  onDeleteReport,
  recentReports,
}: DataHubProps) {
  const [prompt, setPrompt] = useState("");
  const [isDataLinked, setIsDataLinked] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileUrl, setAttachedFileUrl] = useState("");
  const [attachedFileMimeType, setAttachedFileMimeType] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsDataLinked(true);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, []);

  const suggestedPrompts = [
    "최신 건강검진 검사 결과를 요약해줘",
    "최근 배를 자주 긁고 변이 묽은데 이유가 뭘까?",
    "알러지 개선을 위해 맞춤 식단을 추천해줘",
  ];

  const handleAsk = (value = prompt) => {
    // 홈 질문과 첨부를 채팅으로 전달 추가
    const nextPrompt = value.trim();
    if (!nextPrompt) {
      onNavigate("chat");
      return;
    }

    onAsk(
      nextPrompt,
      attachedFileName && attachedFileUrl
        ? { name: attachedFileName, url: attachedFileUrl, mimeType: attachedFileMimeType }
        : undefined,
    );
  };

  const visibleReports = showAllReports ? recentReports : recentReports.slice(0, 2);

  return (
    <div className="bg-[#FFFAF3]">
      <section className="relative overflow-hidden bg-[#F6EADC] px-5 py-7">
        <p className="mb-2 text-sm font-black tracking-[0.18em] text-[#256C4F]">
          INFODOG AI
        </p>
        <h2 className="text-[30px] font-black leading-tight text-[#2D2A26]">
          반려동물을 위한 AI 비서, INFODOG
        </h2>
        <p className="mt-3 text-base leading-7 text-[#6F6254]">
          맥스의 장내 균, 증상 데이터를 바탕으로 건강 분석을 도와드립니다.
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/90 p-4 shadow-sm">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              isDataLinked ? "bg-[#E8F5EE] text-[#256C4F]" : "bg-[#FFF1DF] text-[#C46D23]"
            }`}
          >
            {isDataLinked ? (
              <CheckCircle2 size={18} />
            ) : (
              <Loader2 size={18} className="animate-spin" />
            )}
          </span>
          <div>
            <p className="text-base font-black text-[#2D2A26]">
              {isDataLinked ? "맥스 건강 데이터 연동 완료" : "맥스 건강 데이터 연동 중"}
            </p>
            <p className="text-sm text-[#8A7B6C]">
              {isDataLinked
                ? "최근 증상 기록 분석 준비 완료"
                : "최근 증상 및 기록을 불러오는 중입니다..."}
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-5">
        <div className="rounded-3xl border border-[#EADFCF] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.16em] text-[#256C4F]">AI CHAT</p>
              <h3 className="mt-1 text-2xl font-black text-[#2D2A26]">무엇을 도와드릴까요?</h3>
            </div>
            <MessageCircle className="text-[#256C4F]" size={22} />
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="min-h-[116px] w-full resize-none rounded-2xl border border-[#EADFCF] bg-[#FFFAF3] p-4 text-base text-[#2D2A26] outline-none placeholder:text-[#A89B8B] focus:border-[#256C4F]"
            placeholder="맥스의 건강 상태나 증상, 궁금한 점을 입력해보세요."
          />

          <div className="mt-3 flex items-center justify-between border-t border-[#F0E7DB] pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4EEE6] text-[#8A7B6C]"
              >
                <ImageIcon size={15} />
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
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold ${
                  isDataLinked
                    ? "bg-[#E8F5EE] text-[#256C4F]"
                    : "bg-[#FFF1DF] text-[#C46D23]"
                }`}
              >
                {!isDataLinked && <Loader2 size={12} className="mr-1 animate-spin" />}
                {isDataLinked ? "데이터 연동 완료" : "데이터 연동 중"}
              </span>
            </div>
            <button
              onClick={() => handleAsk()}
              className={`inline-flex items-center rounded-full px-5 py-2.5 text-base font-black transition-colors ${
                prompt.length > 0
                  ? "bg-[#256C4F] text-white"
                  : "bg-[#EEE7DC] text-[#9B8D7E]"
              }`}
            >
              분석 시작 <ArrowRight size={15} className="ml-1.5" />
            </button>
          </div>
          {attachedFileName && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#FFF1DF] px-3 py-2 text-sm font-bold text-[#C46D23]">
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

        <div className="mt-6">
          <h3 className="mb-3 flex items-center text-lg font-black text-[#2D2A26]">
            <Search size={18} className="mr-1.5 text-[#256C4F]" /> 추천 질문
          </h3>
          <div className="space-y-2">
            {suggestedPrompts.map((text) => (
              <button
                key={text}
                onClick={() => handleAsk(text)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#EADFCF] bg-white p-4 text-left text-base font-bold text-[#574D43] shadow-sm"
              >
                <span className="truncate pr-4">{text}</span>
                <ArrowRight size={14} className="shrink-0 text-[#A89B8B]" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center text-lg font-black text-[#2D2A26]">
            <History size={18} className="mr-1.5 text-[#256C4F]" /> 최근 생성된 리포트
          </h3>
          <button
            type="button"
            onClick={() => setShowAllReports((current) => !current)}
            className="text-sm font-bold text-[#9B8D7E]"
          >
            {showAllReports ? "접기" : "전체보기"}
          </button>
        </div>
        <div className="space-y-3">
          {visibleReports.map((report) => (
            <div
              key={report.id}
              onClick={() => onOpenReport(report)}
              className="relative w-full cursor-pointer rounded-2xl border border-[#EADFCF] bg-white p-4 pr-12 text-left shadow-sm active:scale-[0.99]"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteReport(report.id);
                }}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#F4EEE6] text-[#8A7B6C] hover:bg-[#FFE6E0] hover:text-[#C46D23]"
                aria-label="리포트 삭제"
              >
                <X size={15} />
              </button>
              <div className="mb-2 flex items-start justify-between">
                <span
                  className={`rounded-full px-2.5 py-1 text-sm font-black ${report.tagClassName}`}
                >
                  {report.tag}
                </span>
                <span className="mr-7 text-sm text-[#A89B8B]">{report.time}</span>
              </div>
              <p className="line-clamp-1 text-base font-black text-[#2D2A26]">{report.title}</p>
              <p className="mt-1 line-clamp-1 text-base text-[#8A7B6C]">{report.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}