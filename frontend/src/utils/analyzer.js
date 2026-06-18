/**
 * SubZero 구독 감지 엔진
 * - 정기결제 패턴 탐지 (동일 금액 + 주기적 발생)
 * - 카테고리 자동 분류
 * - 중복 구독 탐지
 * - 미사용 구독 추정
 */

// 구독으로 분류할 카테고리 (진짜 구독만)
const SUBSCRIPTION_CATEGORIES = [
  'ENT_OTT_STREAMING',
  'ENT_MUSIC',
  'TELECOM_MOBILE',
  'FIT_GYM',
  'HOUSING_RENT',
  'UTILITY_GAS',
];

// 카테고리명 동적 캐시 (거래처명 저장용)
const CATEGORY_LABELS = {};

export function refreshLabels(transactions) {
  if (!transactions) return;
  for (const tx of transactions) {
    const name = tx?.counterparty?.name;
    const code = tx?.categoryCode;
    if (!name || !code) continue;
    if (!CATEGORY_LABELS[code]) {
      CATEGORY_LABELS[code] = name;
    }
  }
}

export function getCategoryLabel(categoryCode) {
  if (!categoryCode) return categoryCode || '📋 기타';
  return CATEGORY_LABELS[categoryCode] || categoryCode;
}

export { CATEGORY_LABELS };

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
  const withoutSuffix = categoryCode.replace(/_\d{3}$/, '');
  const group = categoryCode.split('_').slice(0, 2).join('_');
  return CATEGORY_COLORS[withoutSuffix] || CATEGORY_COLORS[group] || '#78716c';
}

function detectRecurringPayments(transactions) {
  const patternMap = {};

  for (const tx of transactions) {
    if (tx.type !== '출금') continue;
    if (tx.amount >= 0) continue;

    // 진짜 구독 카테고리만 탐지 (신한은행/카카오 등 제외)
    const catGroup = tx.categoryCode?.split('_').slice(0, 2).join('_');
    const isSubCategory = SUBSCRIPTION_CATEGORIES.some(
      c => catGroup === c || tx.categoryCode?.startsWith(c)
    );
    if (!isSubCategory) continue;

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

  const subscriptions = [];
  for (const key of Object.keys(patternMap)) {
    const pattern = patternMap[key];
    if (pattern.transactions.length >= 2) {
      pattern.isSubscription = true;
      subscriptions.push(pattern);
    }
  }

  return subscriptions;
}

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

function calculateDuplicationSavings(subscriptions) {
  const sorted = [...subscriptions].sort((a, b) => b.amount - a.amount);
  if (sorted.length <= 1) return 0;
  return sorted.slice(1).reduce((sum, s) => sum + s.amount, 0);
}

function detectUnusedSubscriptions(subscriptions, currentMonth) {
  const unused = [];
  for (const sub of subscriptions) {
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

  refreshLabels(transactions);

  const subscriptions = detectRecurringPayments(transactions);
  const duplicates = detectDuplicateSubscriptions(subscriptions);
  const currentMonth = transactions.length > 0 ? transactions[transactions.length - 1]?.yearMonth || '' : '';
  const unused = detectUnusedSubscriptions(subscriptions, currentMonth);

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

  const categoryMap = {};
  for (const sub of subscriptions) {
    const label = getCategoryLabel(sub.categoryCode);
    if (!categoryMap[label]) categoryMap[label] = { name: label, value: 0, count: 0, color: getCategoryColor(sub.categoryCode) };
    categoryMap[label].value += sub.amount;
    categoryMap[label].count += 1;
  }
  const categoryData = Object.values(categoryMap).sort((a, b) => b.value - a.value);

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
