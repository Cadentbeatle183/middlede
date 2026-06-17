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

export default function RenewalCalendar({ thisWeek, nextWeek, allRenewals }) {
  if (!allRenewals || allRenewals.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center text-gray-400">
        📅 갱신 예정 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📅</span>
        <h3 className="text-sm font-semibold text-gray-700">갱신 캘린더</h3>
      </div>

      {/* 이번 주 */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase mb-2">이번 주 갱신</p>
        {thisWeek && thisWeek.length > 0 ? (
          <div className="space-y-2">
            {thisWeek.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                  <span className="text-sm text-orange-800">{getLabel(item.categoryCode)}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-orange-600">
                    {Math.round(item.amount).toLocaleString()}원
                  </span>
                  <span className="text-xs text-orange-400 ml-2">
                    D-{item.renewal.daysUntil}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-2">이번 주 갱신 예정 없음</p>
        )}
      </div>

      {/* 다음 주 */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase mb-2">다음 주 갱신</p>
        {nextWeek && nextWeek.length > 0 ? (
          <div className="space-y-2">
            {nextWeek.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="text-sm text-gray-700">{getLabel(item.categoryCode)}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(item.amount).toLocaleString()}원
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    D-{item.renewal.daysUntil}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-2">다음 주 갱신 예정 없음</p>
        )}
      </div>
    </div>
  );
}