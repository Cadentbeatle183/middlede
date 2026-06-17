export default function MetricCards({ summary, totalSavings }) {
  const cards = [
    {
      title: '월 구독비',
      value: `${Math.round(summary.totalMonthly).toLocaleString()}원`,
      icon: '💰',
      color: 'bg-blue-50 text-blue-600',
      subtitle: `${summary.subscriptionCount}개 구독`,
    },
    {
      title: '절감 가능',
      value: `${Math.round(totalSavings).toLocaleString()}원`,
      icon: '✂️',
      color: 'bg-green-50 text-green-600',
      subtitle: `${summary.duplicateCount}개 중복`,
    },
    {
      title: '중복 구독',
      value: `${summary.duplicateCount}건`,
      icon: '🔄',
      color: 'bg-orange-50 text-orange-600',
      subtitle: `월 ${Math.round(summary.totalSavings).toLocaleString()}원`,
    },
    {
      title: '미사용 구독',
      value: `${summary.unusedCount}건`,
      icon: '💤',
      color: 'bg-purple-50 text-purple-600',
      subtitle: '해지 대상',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{card.icon}</span>
          </div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
          <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}