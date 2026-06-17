import { useState } from 'react';
import { CATEGORY_LABELS } from '../utils/analyzer';

function getLabel(code) {
  if (!code) return '📋 기타';
  if (CATEGORY_LABELS[code]) return CATEGORY_LABELS[code];
  const withoutSuffix = code.replace(/_\d{3}$/, '');
  if (CATEGORY_LABELS[withoutSuffix]) return CATEGORY_LABELS[withoutSuffix];
  const group = code.split('_').slice(0, 2).join('_');
  if (CATEGORY_LABELS[group]) return CATEGORY_LABELS[group];
  return `📋 ${code}`;
}

export default function SubscriptionList({ subscriptions, filters }) {
  const [activeFilter, setActiveFilter] = useState('all');

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center text-gray-400">
        📋 감지된 구독이 없습니다
      </div>
    );
  }

  // 카테고리 그룹 추출 (중복 제거)
  const categories = ['all', ...new Set(subscriptions.map(s => {
    const parts = s.categoryCode.split('_');
    return parts.slice(0, 2).join('_');
  }))];

  const categoryNames = {
    'all': '전체',
  };
  // 동적으로 카테고리별 표시명 생성
  for (const cat of categories) {
    if (cat !== 'all' && !categoryNames[cat]) {
      categoryNames[cat] = getLabel(cat);
    }
  }

  const filtered = activeFilter === 'all'
    ? subscriptions
    : subscriptions.filter(s => s.categoryCode.startsWith(activeFilter));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">📋 통합 구독 목록</h3>
        <span className="text-xs text-gray-400">{filtered.length}개</span>
      </div>

      {/* 카테고리 필터 - 가로 스크롤 처리 */}
      <div className="overflow-x-auto whitespace-nowrap pb-2 mb-4 scrollbar-thin">
        <div className="flex gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors flex-shrink-0 ${
                activeFilter === cat
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {categoryNames[cat] || cat.split('_').slice(1).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 구독 목록 */}
      <div className="space-y-2">
        {filtered.map((sub, i) => {
          const lastTx = sub.transactions[sub.transactions.length - 1];
          const label = getLabel(sub.categoryCode);
          return (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg flex-shrink-0">{label.split(' ')[0]}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {sub.transactions.length}회 결제 {lastTx?.yearMonth ? `· 마지막 ${lastTx.yearMonth}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-sm font-bold text-gray-900">
                  {Math.round(sub.amount).toLocaleString()}원
                </p>
                <p className="text-xs text-gray-400">/월</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}