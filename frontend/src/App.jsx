import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import CategoryChart from './components/CategoryChart';
import MonthlyTrendChart from './components/MonthlyTrendChart';
import DuplicateAlert from './components/DuplicateAlert';
import AIRecommendations from './components/AIRecommendations';
import SubscriptionList from './components/SubscriptionList';
import InsightsPanel from './components/InsightsPanel';
import RenewalCalendar from './components/RenewalCalendar';
import { analyzeTransactions } from './utils/analyzer';
import { generateRecommendations, generateInsights } from './utils/recommender';
import { calculateAllRenewals, generateNotifications, getThisWeekRenewals, getNextWeekRenewals } from './utils/renewal';
import anonData from './data/anon_transactions.json';

function App() {
  const [userName, setUserName] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [insights, setInsights] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allRenewals, setAllRenewals] = useState([]);
  const [thisWeekRenewals, setThisWeekRenewals] = useState([]);
  const [nextWeekRenewals, setNextWeekRenewals] = useState([]);

  useEffect(() => {
    // 비식별화된 유저명 표시
    if (anonData?.accountHolderName) {
      setUserName(anonData.accountHolderName);
    }

    // 모든 거래 수집
    const allTransactions = [];
    if (anonData?.accounts) {
      for (const acc of anonData.accounts) {
        if (acc.transactions) {
          allTransactions.push(...acc.transactions);
        }
      }
    }

    if (allTransactions.length > 0) {
      // 1. 구독 감지 분석
      const result = analyzeTransactions(allTransactions);
      setAnalysis(result);

      // 2. AI 추천 생성
      const recs = generateRecommendations(result);
      setRecommendations(recs);

      // 3. 인사이트 생성
      const ins = generateInsights(result, result.monthlyData);
      setInsights(ins);

      // 4. 갱신일 계산
      if (result.subscriptions.length > 0) {
        const renewals = calculateAllRenewals(result.subscriptions);
        setAllRenewals(renewals);

        const notifs = generateNotifications(renewals);
        setNotifications(notifs);

        setThisWeekRenewals(getThisWeekRenewals(renewals));
        setNextWeekRenewals(getNextWeekRenewals(renewals));
      }
    }
  }, []);

  const totalSavings = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return 0;
    // 'insight' 타입 제외하고 실제 절감액만 집계
    return recommendations
      .filter(r => r.type !== 'insight')
      .reduce((sum, r) => sum + r.savings, 0);
  }, [recommendations]);

  const summary = analysis?.summary || { totalMonthly: 0, totalSavings: 0, subscriptionCount: 0, duplicateCount: 0, unusedCount: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header unreadCount={notifications.length} userName={userName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 메트릭 카드 */}
        <section className="mb-8">
          <MetricCards summary={summary} totalSavings={totalSavings} />
        </section>

        {/* 차트 영역 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CategoryChart data={analysis?.categoryData || []} />
          <MonthlyTrendChart data={analysis?.monthlyData || []} />
        </section>

        {/* AI 추천 + 중복 경고 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AIRecommendations recommendations={recommendations} />
          <DuplicateAlert duplicates={analysis?.duplicates || []} />
        </section>

        {/* 재무 인사이트 */}
        {insights.length > 0 && (
          <section className="mb-8">
            <InsightsPanel insights={insights} />
          </section>
        )}

        {/* 구독 목록 + 갱신 캘린더 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SubscriptionList subscriptions={analysis?.subscriptions || []} />
          <RenewalCalendar
            thisWeek={thisWeekRenewals}
            nextWeek={nextWeekRenewals}
            allRenewals={allRenewals}
          />
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
          🧊 SubZero — AI 기반 구독 서비스 통합 관리 플랫폼
          <br />
          비식별화 처리된 데이터 기반 (스케일링 계수: {anonData?.accounts?.[0]?.transactions?.[0]?.balanceAfter ? '적용됨' : '0.6115'})
        </div>
      </footer>
    </div>
  );
}

export default App;