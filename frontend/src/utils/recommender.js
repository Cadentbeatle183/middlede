/**
 * SubZero AI 추천 엔진
 * - 구독 절감 추천 생성
 * - 소비 인사이트 생성
 * - 우선순위 기반 추천 정렬
 */

export function generateRecommendations(subscriptionData) {
  const recommendations = [];

  if (!subscriptionData) return recommendations;

  const { subscriptions, duplicates, unused } = subscriptionData;

  // 1. 중복 구독 통합 추천
  for (const dup of duplicates) {
    const sorted = [...dup.subscriptions].sort((a, b) => b.amount - a.amount);
    const keep = sorted[0];
    const drops = sorted.slice(1);

    recommendations.push({
      id: `dup-${dup.group}`,
      type: 'duplicate',
      priority: drops.length >= 2 ? 'high' : 'medium',
      icon: '🔄',
      title: `${dup.label} ${dup.count}개 중복!`,
      description: `${keep.categoryCode.includes('OTT') ? '넷플릭스' : keep.categoryCode.includes('MUSIC') ? '스포티파이' : '주'}만 남기고 ${drops.length}개 해지 시 `,
      savings: dup.savingsRecommendation,
      action: `${Math.round(dup.savingsRecommendation).toLocaleString()}원/월 절감`,
      details: drops.map(d => `${d.categoryCode.slice(-3)} (${Math.round(d.amount).toLocaleString()}원)`),
    });
  }

  // 2. 미사용 구독 해지 추천
  for (const us of unused) {
    recommendations.push({
      id: `unused-${us.categoryCode}`,
      type: 'unused',
      priority: us.monthsSinceInactive >= 2 ? 'high' : 'medium',
      icon: '💤',
      title: `사용하지 않는 구독이 있어요`,
      description: `${Math.round(us.amount).toLocaleString()}원짜리 구독을 ${us.monthsSinceInactive}개월째 사용하지 않았어요`,
      savings: us.amount,
      action: `${Math.round(us.amount).toLocaleString()}원/월 절감`,
      details: [`마지막 사용: ${us.lastActive}`],
    });
  }

  // 3. 고가 구독 플래그
  const HIGH_PRICE_THRESHOLD = 30000;
  for (const sub of subscriptions) {
    if (sub.amount >= HIGH_PRICE_THRESHOLD) {
      const isEssential = ['TELECOM', 'HOUSING', 'UTILITY'].some(c => sub.categoryCode.includes(c));
      if (!isEssential) {
        recommendations.push({
          id: `expensive-${sub.categoryCode}`,
          type: 'expensive',
          priority: 'low',
          icon: '💰',
          title: `비싼 구독이 있어요`,
          description: `월 ${Math.round(sub.amount).toLocaleString()}원 - 요금제 다운그레이드 고려`,
          savings: Math.round(sub.amount * 0.5),
          action: `최대 ${Math.round(sub.amount * 0.5).toLocaleString()}원/월 절감`,
          details: [`현재 요금: ${Math.round(sub.amount).toLocaleString()}원`],
        });
      }
    }
  }

  // 4. 절감 총액 인사이트
  const totalSavings = recommendations.reduce((sum, r) => sum + r.savings, 0);
  if (totalSavings > 0) {
    recommendations.push({
      id: 'total-insight',
      type: 'insight',
      priority: 'high',
      icon: '🎯',
      title: `이번 달 절감 가능 금액: ${Math.round(totalSavings).toLocaleString()}원`,
      description: `추천대로 진행 시 연간 ${Math.round(totalSavings * 12).toLocaleString()}원 절감!`,
      savings: totalSavings,
      action: '지금 시작하기',
      details: [],
    });
  }

  // 우선순위 정렬: high > medium > low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    if (a.type === 'insight') return -1; // 총액 인사이트는 항상 최상단
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return recommendations;
}

export function generateInsights(subscriptionData, monthlyData) {
  const insights = [];

  if (!subscriptionData || !monthlyData) return insights;

  const { summary } = subscriptionData;

  // 구독비 비중 인사이트
  if (monthlyData.length >= 2) {
    const recent = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    if (recent && prev && prev.total > 0) {
      const subRatio = recent.subscription / recent.total;
      const change = ((recent.subscription - prev.subscription) / prev.subscription) * 100;

      insights.push({
        icon: '📊',
        text: `구독비가 전체 지출의 ${Math.round(subRatio * 100)}%를 차지해요`,
      });

      if (Math.abs(change) > 10) {
        insights.push({
          icon: change > 0 ? '📈' : '📉',
          text: `구독비가 전월 대비 ${Math.abs(Math.round(change))}% ${change > 0 ? '증가' : '감소'}했어요`,
        });
      }
    }
  }

  // 카테고리 다양성 인사이트
  if (subscriptionData.categoryData) {
    const topCat = subscriptionData.categoryData[0];
    if (topCat && topCat.value > 0) {
      insights.push({
        icon: '🏆',
        text: `가장 많은 구독비를 쓰는 카테고리는 ${topCat.name} (${Math.round(topCat.value / summary.totalMonthly * 100)}%)`,
      });
    }
  }

  // 절감 기회 인사이트
  if (summary.duplicateCount > 0) {
    insights.push({
      icon: '✂️',
      text: `${summary.duplicateCount}개 카테고리에서 중복 구독이 발견되었어요`,
    });
  }

  if (summary.unusedCount > 0) {
    insights.push({
      icon: '💤',
      text: `${summary.unusedCount}개의 구독을 최근 사용하지 않았어요`,
    });
  }

  return insights;
}