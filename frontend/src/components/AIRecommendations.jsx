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

export default function AIRecommendations({ recommendations }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center text-gray-400">
        🤖 추천할 항목이 없습니다
      </div>
    );
  }

  const priorityStyles = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    info: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
  };

  const typeLabels = {
    duplicate: '중복 통합',
    unused: '사용 안함',
    expensive: '고가 구독',
    insight: '💡 인사이트',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🤖</span>
        <h3 className="text-sm font-semibold text-gray-700">AI 절감 추천</h3>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, i) => {
          const style = priorityStyles[rec.priority] || priorityStyles.info;
          return (
            <div key={rec.id || i} className={`border ${style.border} ${style.bg} rounded-lg p-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{rec.icon || '💡'}</span>
                    <span className="text-xs font-medium text-gray-400 uppercase">
                      {typeLabels[rec.type] || rec.type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.description}</p>
                  {rec.details && rec.details.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rec.details.map((d, j) => (
                        <span key={j} className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-green-600">
                    -{Math.round(rec.savings).toLocaleString()}원
                  </p>
                  <span className="text-xs text-gray-400">/월</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}