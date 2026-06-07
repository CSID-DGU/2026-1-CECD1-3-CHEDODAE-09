import React from "react";
import { CheckCircle, Leaf, ShoppingBag } from "lucide-react";

type DietSolutionProps = {
  isAiRecommendation?: boolean;
};

export default function DietSolution({ isAiRecommendation = false }: DietSolutionProps) {
  const products = [
    {
      id: 1,
      name: "캥거루",
      image:
        "https://images.unsplash.com/photo-1745252798506-29500efc5b39?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
      price: "42,000원",
      tags: ["알러지 케어", "유익균 보강"],
      match: 98,
      recommended: true,
    },
    {
      id: 2,
      name: "오메가 연어 생식",
      image:
        "https://images.unsplash.com/photo-1596491123074-fd69f1b7c12d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
      price: "45,000원",
      tags: ["모질 개선", "관절 보호"],
      match: 82,
      recommended: false,
    },
    {
      id: 3,
      name: "비프&치킨",
      image:
        "https://images.unsplash.com/photo-1601758228006-964e41e5e8eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
      price: "38,000원",
      tags: ["단백질 보충", "근육 강화"],
      match: 65,
      recommended: false,
    },
  ];

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#FFFAF3] animate-in fade-in duration-300">
      <div className="sticky top-0 z-10 border-b border-[#EADFCF] bg-white p-5 pb-4">
        <h2 className="text-2xl font-black text-[#256C4F]">맞춤 식단 솔루션</h2>
        <p className="mt-1 text-base leading-7 text-[#8A7B6C]">
          {isAiRecommendation
            ? "생성된 리포트에서 추천된 식단을 추천합니다."
            : "원하는 상품을 장바구니에 담을 수 있습니다."}
        </p>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        {isAiRecommendation && (
          <div className="relative mb-5 overflow-hidden rounded-2xl bg-[#256C4F] p-5 text-white shadow-md">
            <div className="absolute -right-6 -top-6 text-white/10">
              <Leaf size={100} />
            </div>
            <div className="relative z-10">
              <h3 className="mb-3 flex items-center text-lg font-black">
                <CheckCircle className="mr-1.5 text-[#7BC8A4]" size={18} />
                AI 추천 식단
              </h3>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="mb-2 text-base leading-relaxed text-[#EAF6EF]">
                  맥스의 장내 미생물과 피부 증상 데이터를 분석한 결과, 알러지 부담이 낮은
                  단일 단백질 식단이 우선 추천됩니다.
                </p>
                <p className="text-base font-bold leading-relaxed text-[#7BC8A4]">
                  캥거루 단백질 기반 식단을 1순위로 추천합니다.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 pb-4">
          {products.map((product) => {
            const highlight = isAiRecommendation && product.recommended;

            return (
              <div
                key={product.id}
                className={`grid min-h-44 min-w-0 grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  highlight ? "border-[#7BC8A4]" : "border-[#EADFCF]"
                }`}
              >
                <div className="relative min-h-44 min-w-0 bg-[#F4EEE6]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  {highlight && (
                    <div className="absolute left-2 top-2 rounded bg-[#7BC8A4] px-2 py-1 text-sm font-black text-white shadow-md">
                      AI 추천
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col justify-between p-4">
                  <div className="min-w-0">
                    <div className="mb-1 flex min-w-0 items-center justify-between gap-3">
                      <h4 className="min-w-0 flex-1 truncate text-lg font-black text-[#2D2A26]">
                        {product.name}
                      </h4>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-black ${
                          highlight
                            ? "bg-[#E8F5EE] text-[#256C4F]"
                            : "bg-[#F4EEE6] text-[#8A7B6C]"
                        }`}
                      >
                        {product.match}%
                      </span>
                    </div>
                    <p className="mb-2 text-base font-bold text-[#256C4F]">{product.price}</p>
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-[#EADFCF] bg-[#FFFAF3] px-2 py-1 text-sm text-[#8A7B6C]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    className={`mt-3 inline-flex w-full items-center justify-center rounded-lg py-2.5 text-base font-black transition-colors ${
                      highlight ? "bg-[#256C4F] text-white" : "bg-[#F4EEE6] text-[#574D43]"
                    }`}
                  >
                    <ShoppingBag size={15} className="mr-1.5" />
                    {highlight ? "AI 추천 장바구니 담기" : "장바구니 담기"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
