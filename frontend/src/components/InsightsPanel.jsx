export default function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h3 className="text-sm font-semibold text-indigo-800">재무 인사이트</h3>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-indigo-700 bg-white bg-opacity-60 rounded-lg p-2.5">
            <span className="flex-shrink-0">{insight.icon}</span>
            <p>{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}