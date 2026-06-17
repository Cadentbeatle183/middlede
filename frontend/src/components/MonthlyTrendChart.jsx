import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function MonthlyTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-80 flex items-center justify-center">
        <p className="text-gray-400">월별 데이터가 없습니다</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    month: d.month ? d.month.slice(5) : '',
    구독: Math.round(d.subscription),
    기타: Math.round(d.other),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">📈 월별 구독비 추이</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barGap={0} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip
            formatter={(value) => `${Math.round(value).toLocaleString()}원`}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="구독" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="기타" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}