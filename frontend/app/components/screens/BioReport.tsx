import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { AlertTriangle } from "lucide-react";

export default function BioReport() {
  const donutData = [
    { name: "건강함", value: 82 },
    { name: "주의필요", value: 18 }
  ];
  const donutColors = ["#52B788", "#F8F9FA"];

  const microbiomeData = [
    { name: "Bifido", max: 15, baseline: 25 },
    { name: "Lacto", max: 8, baseline: 30 },
    { name: "Bacter", max: 45, baseline: 40 },
    { name: "Prevo", max: 32, baseline: 20 },
    { name: "Fuso", max: 0, baseline: 5 }, // 알림용 0 추가
  ];

  const radarData = [
    { subject: "피부/모질", A: 78, fullMark: 100 },
    { subject: "비만/대사", A: 45, fullMark: 100 },
    { subject: "면역력", A: 60, fullMark: 100 },
    { subject: "소화/장", A: 85, fullMark: 100 },
    { subject: "관절/뼈", A: 30, fullMark: 100 },
  ];

  return (
    <div className="bg-[#F8F9FA] h-full flex flex-col animate-in fade-in duration-300">
      <div className="p-5 pb-3 bg-white border-b border-gray-50 flex flex-col z-10 sticky top-0">
        <h2 className="text-2xl font-black text-[#1B4332] mb-1">바이오 리포트</h2>
        <p className="text-sm text-gray-500">NGS 및 PHR 융합 데이터 시각화</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* 요약 도넛 차트 추가 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex flex-row items-center">
            <div className="relative flex h-32 min-h-32 w-1/2 min-w-0 items-center justify-center overflow-hidden">
                <PieChart id="bio-pie-chart-mobile" width={160} height={128}>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={55}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-[#1B4332]">82</span>
                <span className="text-sm font-medium text-gray-500">스코어</span>
              </div>
            </div>
            <div className="w-1/2 pl-2">
              <h3 className="text-base font-bold text-gray-800 mb-1">장 상태: <span className="text-[#F77F00]">주의</span></h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-2 line-clamp-4">
                유익균(Lactobacillus) 군집이 기준치 이하로 떨어져 피부 알레르기 반응이 발현된 것으로 예측됩니다.
              </p>
              <div className="flex flex-col gap-1.5">
                <span className="px-2 py-1 bg-[#F77F00]/10 text-[#F77F00] text-sm font-bold rounded-md text-center">피부 질환 주의</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-sm font-bold rounded-md text-center">유익균 부족</span>
              </div>
            </div>
          </div>
        </div>

        {/* NGS 마이크로바이옴 분포 추가 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-800 text-lg mb-1">장내 미생물 (NGS) 분포</h4>
          <p className="text-sm text-gray-400 mb-4">동일 연령대 평균 대비 맥스의 비율 (%)</p>
          <div className="relative h-56 min-h-56 min-w-0 overflow-hidden">
              <BarChart id="bio-bar-chart-mobile" width={360} height={224} data={microbiomeData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} width={48} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', fontSize: '12px'}} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', bottom: -10 }} />
                <Bar dataKey="max" name="맥스" fill="#1B4332" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="baseline" name="평균" fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            {/* 비정형 알림 마커 추가 */}
            <div className="absolute bottom-10 right-4 bg-[#F77F00] text-white text-xs px-2 py-1 rounded flex items-center animate-pulse">
              <AlertTriangle size={10} className="mr-0.5" /> 0%
            </div>
          </div>
        </div>

        {/* 질병 예측 레이더 차트 추가 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <h4 className="font-bold text-gray-800 text-lg mb-1">융합 질병 위험도 예측</h4>
          <p className="text-sm text-gray-400 mb-2">데이터 기반 미래 발병 확률</p>
          <div className="h-56 min-h-56 min-w-0 overflow-hidden">
              <RadarChart id="bio-radar-chart-mobile" width={360} height={224} cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="위험도" dataKey="A" stroke="#F77F00" fill="#F77F00" fillOpacity={0.3} />
                <Tooltip />
              </RadarChart>
          </div>
          <div className="text-center text-sm text-gray-500 mt-1">
            위험도: <strong className="text-[#F77F00]">소화/장 (85%)</strong> · <strong className="text-[#F77F00]">피부/모질 (78%)</strong>
          </div>
        </div>

      </div>
    </div>
  );
}
