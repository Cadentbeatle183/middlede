import { useState } from 'react';

function getLabel(code) {
  if (!code) return '기타';
  return code;
}

export default function SubscriptionList({ subscriptions, allTransactions }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const displayList = subscriptions && subscriptions.length > 0 ? subscriptions : [];

  // 카테고리 그룹 필터
  const categories = ['all', ...new Set(displayList.map(s => s.categoryCode?.split('_').slice(0, 2).join('_') || '기타'))];

  const filtered = activeFilter === 'all'
    ? displayList
    : displayList.filter(s => s.categoryCode?.startsWith(activeFilter));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {/* 구독 목록 */}
      {displayList.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">구독 목록</h3>
            <span className="text-xs text-gray-400">{filtered.length}건</span>
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  activeFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? '전체' : getLabel(cat)}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            {filtered.map((sub, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-800">{getLabel(sub.categoryCode)}</div>
                  <div className="text-xs text-gray-500">{Math.abs(sub.amount || 0).toLocaleString()}원 (고정)</div>
                </div>
                <div className="text-xs text-gray-400">
                  {sub.transactions?.length || 0}회 발생
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!displayList.length && (
        <div className="text-center text-gray-400 py-4 mb-4">감지된 구독이 없습니다</div>
      )}

      {/* 전체 지출 내역 */}
      <div className="border-t border-gray-200 my-4"></div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <h4 className="text-xs font-semibold text-gray-600 mb-2">전체 지출 내역</h4>
        {allTransactions && allTransactions.map((tx, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <div className="flex-1 min-w-0 mr-2">
              <div className="text-xs font-medium text-gray-700 truncate">
                {tx.description || tx.counterparty?.name || tx.categoryCode || '기타'}
              </div>
              <div className="text-[10px] text-gray-400">
                {tx.yearMonth && `${tx.yearMonth} ${tx.dayOfMonth || ''}일 `}
                {tx.categoryCode && getLabel(tx.categoryCode)}
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="text-xs font-semibold text-gray-900">
                {Math.abs(tx.amount || 0).toLocaleString()}원
              </div>
              <div className="text-[10px] text-gray-400">
                {tx.type === '출금' ? '출금' : tx.type}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}