/**
 * SubZero 구독 감지 엔진
 * - 정기결제 패턴 탐지 (동일 금액 + 주기적 발생)
 * - 카테고리 자동 분류
 * - 중복 구독 탐지
 * - 미사용 구독 추정
 */

// 구독으로 분류할 카테고리 (정기결제 성격이 있는 것들)
const SUBSCRIPTION_CATEGORIES = [
  'ENT_OTT_STREAMING',
  'ENT_MUSIC',
  'TELECOM_MOBILE',
  'FIT_GYM',
  'FIT',
  'HOUSING_RENT',
  'UTILITY_GAS',
  'UTILITY',
  'FINANCE_SAVING',
  'ENT',
];

// 카테고리명 표시 매핑 (상위그룹 + 세부코드 모두 포함)
export const CATEGORY_LABELS = {
  // OTT / 스트리밍
  'ENT_OTT_STREAMING': '🎬 OTT/스트리밍',
  'ENT_OTT_STREAMING_001': '🎬 넷플릭스',
  'ENT_OTT_STREAMING_002': '🎬 유튜브 프리미엄',
  'ENT_OTT_STREAMING_003': '🎬 왓챠',
  // 음악
  'ENT_MUSIC': '🎵 음악',
  'ENT_MUSIC_001': '🎵 스포티파이',
  'ENT_MUSIC_002': '🎵 멜론',
  // 영화
  'ENT_CINEMA': '🎬 영화',
  'ENT_CINEMA_001': '🎬 CGV',
  // 통신
  'TELECOM_MOBILE': '📱 통신',
  'TELECOM_MOBILE_001': '📱 SKT 통신비',
  // 운동
  'FIT_GYM': '💪 운동',
  'FIT_GYM_001': '💪 스포애니 헬스장',
  // 주거
  'HOUSING_RENT': '🏠 주거',
  'HOUSING_RENT_001': '🏠 월세',
  // 공과금
  'UTILITY_GAS': '🔥 공과금',
  'UTILITY_GAS_001': '🔥 도시가스',
  // 배달
  'F&B_DELIVERY': '🍔 배달',
  'F&B_DELIVERY_001': '🍔 배달의민족',
  // 식사
  'F&B_KOREAN': '🍚 식사',
  'F&B_KOREAN_001': '🍚 김밥천국',
  // 카페
  'F&B_CAFE': '☕ 카페',
  'F&B_CAFE_001': '☕ 스타벅스',
  // 편의점
  'F_B_CONVENIENCE': '🏪 편의점',
  'F_B_CONVENIENCE_001': '🏪 CU 편의점',
  // 교통
  'TRANSPORT_CHARGE': '🚌 교통',
  'TRANSPORT_CHARGE_001': '🚌 교통카드',
  'TRANSPORT_TAXI': '🚕 택시',
  'TRANSPORT_TAXI_001': '🚕 카카오T 택시',
  // 쇼핑
  'SHOPPING_BEAUTY': '🛍️ 쇼핑',
  'SHOPPING_BEAUTY_001': '🛍️ 올리브영',
  // 저축
  'FINANCE_SAVING': '💰 저축',
  'FINANCE_SAVING_001': '💰 적금',
  // 모임
  'FINANCE_GROUP': '👥 모임',
  'FINANCE_GROUP_001': '👥 여행모임',
  'FINANCE_GROUP_002': '👥 동아리회비',
  // 송금
  'TRANSFER_FRIEND': '👤 송금',
  'TRANSFER_FRIEND_001': '👤 김철수',
  'TRANSFER_FRIEND_002': '👤 박지훈',
  // 가족
  'TRANSFER_FAMILY': '👨‍👩‍👧 가족',
  'TRANSFER_FAMILY_001': '👨‍👩‍👧 부모님',
  // 기타
  'ETC_KAKAO': '📱 기타',
  'ETC_KAKAO_001': '📱 카카오',
  // 기타 (기본)
  'UNCLASSIFIED': '📋 기타',
  'UNCLASSIFIED_OTHER': '📋 기타',
};

function getCategoryLabel(categoryCode) {
  if (!categoryCode) return '📋 기타';
  // 1. 전체 코드로 먼저 매칭
  if (CATEGORY_LABELS[categoryCode]) return CATEGORY_LABELS[categoryCode];
  // 2. 숫자 접미사 제거 후 상위 코드로 매칭
  const withoutSuffix = categoryCode.replace(/_\d{3}$/, '');
  if (CATEGORY_LABELS[withoutSuffix]) return CATEGORY_LABELS[withoutSuffix];
  // 3. 상위 그룹(앞 2부분)으로 매칭
  const group = categoryCode.split('_').slice(0, 2).join('_');
  if (CATEGORY_LABELS[group]) return CATEGORY_LABELS[group];
  // 4. 첫 부분만
  const first = categoryCode.split('_')[0];
  return `📋 ${first}`;
}

export const CATEGORY_COLORS = {
  'ENT_OTT_STREAMING': '#ef4444',
  'ENT_MUSIC': '#f97316',
  'TELECOM_MOBILE': '#3b82f6',
  'FIT_GYM': '#22c55e',
  'HOUSING_RENT': '#a855f7',
  'UTILITY_GAS': '#64748b',
  'F&B': '#eab308',
  'TRANSPORT': '#06b6d4',
  'SHOPPING': '#ec4899',
  'FINANCE': '#14b8a6',
  'TRANSFER': '#8b5cf6',
  'ETC': '#78716c',
};

function getCategoryGroup(categoryCode) {
  if (!categoryCode) return 'UNCLASSIFIED';
  return categoryCode.split('_').slice(0, 2).join('_');
}


function getCategoryColor(categoryCode) {
  if (!categoryCode) return '#78716c';
  // 전체 코드 → 상위 그룹 순 fallback
  const withoutSuffix = categoryCode.replace(/_\d{3}$/, '');
  const group = categoryCode.split('_').slice(0, 2).join('_');
  return CATEGORY_COLORS[withoutSuffix] || CATEGORY_COLORS[group] || '#78716c';
}

/**
 * 중복 출금 감지 (같은 금액 + 같은 거래처)
 * 정기결제 후보 탐지
 */
function detectRecurringPayments(transactions) {
  // 동일 categoryCode + 동일 금액 패턴 찾기
  const patternMap = {};

  for (const tx of transactions) {
    if (tx.type !== '출금') continue;
    if (tx.amount >= 0) continue; // 출금은 음수

    const key = `${tx.categoryCode}|${tx.amount}`;
    if (!patternMap[key]) {
      patternMap[key] = {
        categoryCode: tx.categoryCode,
        amount: Math.abs(tx.amount),
        transactions: [],
        months: new Set(),
        isSubscription: false,
      };
    }
    patternMap[key].transactions.push(tx);
    if (tx.yearMonth) {
      patternMap[key].months.add(tx.yearMonth);
    }
  }

  // 정기결제 판별: 동일 패턴이 2회 이상 발생
  const subscriptions = [];
  for (const key of Object.keys(patternMap)) {
    const pattern = patternMap[key];
    // 같은 달에 여러 번 발생해도 정기결제일 수 있음 (주 2회 등)
    // 2회 이상이면 구독 후보
    if (pattern.transactions.length >= 2) {
      pattern.isSubscription = true;
      subscriptions.push(pattern);
    }
  }

  return subscriptions;
}

/**
 * 중복 구독 탐지 (같은 상위 카테고리에 2개 이상)
 */
function detectDuplicateSubscriptions(subscriptions) {
  const groups = {};
  for (const sub of subscriptions) {
    const group = sub.categoryCode.split('_').slice(0, 2).join('_');
    if (!groups[group]) groups[group] = [];
    groups[group].push(sub);
  }

  const duplicates = [];
  for (const group of Object.keys(groups)) {
    if (groups[group].length >= 2) {
      duplicates.push({
        group,
        label: getCategoryLabel(group),
        subscriptions: groups[group],
        count: groups[group].length,
        totalMonthly: groups[group].reduce((sum, s) => sum + s.amount, 0),
        savingsRecommendation: calculateDuplicationSavings(groups[group]),
      });
    }
  }
  return duplicates.sort((a, b) => b.totalMonthly - a.totalMonthly);
}

/**
 * 중복 구독 절감액 계산 (가장 비싼 1개만 남기고 나머지 해지 시)
 */
function calculateDuplicationSavings(subscriptions) {
  const sorted = [...subscriptions].sort((a, b) => b.amount - a.amount);
  if (sorted.length <= 1) return 0;
  return sorted.slice(1).reduce((sum, s) => sum + s.amount, 0);
}

/**
 * 사용하지 않는 구독 추정 (최근 발생이 없는 패턴)
 */
function detectUnusedSubscriptions(subscriptions, currentMonth) {
  const unused = [];
  for (const sub of subscriptions) {
    // 가장 마지막 거래의 년월
    const lastTx = sub.transactions[sub.transactions.length - 1];
    if (lastTx && lastTx.yearMonth !== currentMonth) {
      unused.push({
        ...sub,
        lastActive: lastTx.yearMonth,
        monthsSinceInactive: currentMonth && lastTx.yearMonth
          ? monthDiff(lastTx.yearMonth, currentMonth)
          : 0,
      });
    }
  }
  return unused;
}

function monthDiff(m1, m2) {
  if (!m1 || !m2) return 0;
  const [y1, mth1] = m1.split('-').map(Number);
  const [y2, mth2] = m2.split('-').map(Number);
  return (y2 - y1) * 12 + (mth2 - mth1);
}

/**
 * 전체 분석 실행
 */
export function analyzeTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      subscriptions: [],
      duplicates: [],
      unused: [],
      summary: { totalMonthly: 0, totalSavings: 0, subscriptionCount: 0 },
      monthlyData: [],
      categoryData: [],
    };
  }

  const subscriptions = detectRecurringPayments(transactions);
  const duplicates = detectDuplicateSubscriptions(subscriptions);
  const currentMonth = transactions.length > 0 ? transactions[transactions.length - 1]?.yearMonth || '' : '';
  const unused = detectUnusedSubscriptions(subscriptions, currentMonth);

  // 월별 데이터 집계
  const monthlyMap = {};
  for (const tx of transactions) {
    if (tx.type !== '출금' || tx.amount >= 0) continue;
    const ym = tx.yearMonth;
    if (!ym) continue;
    if (!monthlyMap[ym]) monthlyMap[ym] = { month: ym, subscription: 0, other: 0, total: 0 };
    const isSub = subscriptions.some(s => s.transactions.includes(tx));
    const absAmt = Math.abs(tx.amount);
    monthlyMap[ym].total += absAmt;
    if (isSub) monthlyMap[ym].subscription += absAmt;
    else monthlyMap[ym].other += absAmt;
  }
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // 카테고리 데이터
  const categoryMap = {};
  for (const sub of subscriptions) {
    const label = getCategoryLabel(sub.categoryCode);
    if (!categoryMap[label]) categoryMap[label] = { name: label, value: 0, count: 0, color: getCategoryColor(sub.categoryCode) };
    categoryMap[label].value += sub.amount;
    categoryMap[label].count += 1;
  }
  const categoryData = Object.values(categoryMap).sort((a, b) => b.value - a.value);

  // 요약
  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  const totalSavings = duplicates.reduce((sum, d) => sum + d.savingsRecommendation, 0);

  return {
    subscriptions,
    duplicates,
    unused,
    summary: {
      totalMonthly: Math.round(totalMonthly),
      totalSavings: Math.round(totalSavings),
      subscriptionCount: subscriptions.length,
      duplicateCount: duplicates.length,
      unusedCount: unused.length,
    },
    monthlyData,
    categoryData,
  };
}