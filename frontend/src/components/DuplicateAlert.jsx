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

export default function DuplicateAlert({ duplicates }) {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔄</span>
        <h3 className="text-sm font-semibold text-gray-700">중복 구독 경고</h3>
        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full ml-auto font-medium">
          {duplicates.length}건
        </span>
      </div>
      <div className="space-y-3">
        {duplicates.map((dup, i) => (
          <div key={i} className="border border-red-100 bg-red-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-800">
                {dup.label} {dup.count}개
              </span>
              <span className="text-sm font-bold text-red-600">
                {Math.round(dup.totalMonthly).toLocaleString()}원
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {dup.subscriptions.map((sub, j) => (
                <span key={j} className="text-xs bg-white px-2 py-1 rounded border border-red-200 text-gray-700">
                  {getLabel(sub.categoryCode)} {Math.round(sub.amount).toLocaleString()}원
                </span>
              ))}
            </div>
            <div className="text-xs text-red-600 font-medium">
              ✂️ 1개로 통합 시 월 {Math.round(dup.savingsRecommendation).toLocaleString()}원 절감
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}