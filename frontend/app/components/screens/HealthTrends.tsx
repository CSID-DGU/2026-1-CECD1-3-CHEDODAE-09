import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Calendar, MessageSquare, AlertCircle } from "lucide-react";

export default function HealthTrends() {
  const trendData = [
    { month: '10월', goodBacteria: 12, skinRisk: 85 },
    { month: '11월', goodBacteria: 15, skinRisk: 80 },
    { month: '12월', goodBacteria: 18, skinRisk: 75 },
    { month: '1월', goodBacteria: 24, skinRisk: 60 },
    { month: '2월', goodBacteria: 32, skinRisk: 45 },
    { month: '3월', goodBacteria: 38, skinRisk: 30 },
  ];

  const historyData = [
    { id: 1, date: "26.03.10", type: "통합 분석", status: "개선 중 (+15%)", statusColor: "text-[#52B788]", tagColor: "bg-[#52B788]/10 text-[#52B788]" },
    { id: 2, date: "26.02.15", type: "AI 피부 판독", status: "위험 (알러지 78%)", statusColor: "text-[#F77F00]", tagColor: "bg-[#F77F00]/10 text-[#F77F00]" },
    { id: 3, date: "26.01.20", type: "정기 리포트", status: "주의 (유익균 부족)", statusColor: "text-yellow-600", tagColor: "bg-yellow-100 text-yellow-700" },
    { id: 4, date: "25.10.05", type: "최초 등록", status: "프로필 생성됨", statusColor: "text-gray-500", tagColor: "bg-gray-100 text-gray-600" },
  ];

  return (
    <div className="bg-[#F8F9FA] h-full flex flex-col animate-in fade-in duration-300">
      <div className="p-5 pb-3 bg-white border-b border-gray-50 flex justify-between items-end z-10 sticky top-0">
        <div>
          <h2 className="text-2xl font-black text-[#1B4332] mb-1">건강 추이 & 히스토리</h2>
          <p className="text-sm text-gray-500 mb-2">장내 환경 개선 및 상호작용 기록</p>
        </div>
        <div className="bg-[#1B4332]/5 rounded-lg px-2.5 py-1.5 flex items-center mb-2">
          <Calendar className="text-[#1B4332] mr-1.5" size={16} />
          <div className="text-right">
            <p className="text-xs text-gray-500">다음 검사일</p>
            <p className="text-sm font-bold text-[#1B4332]">D-14</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* 듀얼 축 꺾은선 그래프 추가 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-gray-800 text-lg mb-2">최근 6개월 건강 개선 추이</h3>
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-[#52B788] mr-1.5"></span> 장내 유익균 비율 (%)</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-[#F77F00] mr-1.5"></span> 피부 질환 위험도 (%)</span>
            </div>
          </div>
          
          <div className="-ml-4 h-48 min-h-48 w-full min-w-0 overflow-hidden">
              <LineChart id="health-line-chart-mobile" width={360} height={192} data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} dy={5} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#52B788' }} axisLine={false} tickLine={false} width={34} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#F77F00' }} axisLine={false} tickLine={false} width={34} />
                
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '14px', padding: '8px' }}
                />
                
                <Line yAxisId="left" type="monotone" dataKey="goodBacteria" name="유익균" stroke="#52B788" strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} />
                <Line yAxisId="right" type="monotone" dataKey="skinRisk" name="위험도" stroke="#F77F00" strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} />
              </LineChart>
          </div>
          
          <div className="mt-3 p-4 bg-gray-50 rounded-xl flex items-start">
            <AlertCircle size={18} className="text-[#52B788] mt-0.5 mr-2 shrink-0" />
            <p className="text-base text-gray-600 leading-relaxed">
              1월 처방식 급여 이후 <strong>장내 유익균이 지속 증가</strong>하며, <strong>피부 알러지 위험도는 감소</strong>하는 상관관계가 뚜렷합니다.
            </p>
          </div>
        </div>

        {/* 리스트형 히스토리 추가 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="p-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-800 text-lg">상담 및 분석 기록</h3>
          </div>
          
          <div className="divide-y divide-gray-50">
            {historyData.map((row) => (
              <div key={row.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 active:bg-gray-100 transition-colors cursor-pointer">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className={`px-2.5 py-1 rounded text-sm font-bold ${row.tagColor}`}>
                      {row.type}
                    </span>
                    <span className="text-sm text-gray-400 font-mono">{row.date}</span>
                  </div>
                  <p className={`text-base font-bold ${row.statusColor}`}>
                    {row.status}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <MessageSquare size={14} />
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full p-3 text-sm text-gray-500 hover:text-[#1B4332] font-medium bg-gray-50/30">
            전체 기록 보기
          </button>
        </div>

      </div>
    </div>
  );
}
