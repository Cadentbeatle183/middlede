/**
 * SubZero 갱신일/알림 시스템
 * - 다음 결제일 예측
 * - D-30 / D-7 / D-1 알림
 * - 갱신 캘린더
 */

/**
 * 거래 dayOfMonth로부터 다음 결제일 예측
 */
export function predictNextRenewal(transactions, currentDate = new Date()) {
  if (!transactions || transactions.length === 0) return null;

  // 가장 최근 거래를 기준으로 갱신일 계산
  const sorted = [...transactions].sort((a, b) => {
    if (a.yearMonth !== b.yearMonth) return b.yearMonth?.localeCompare(a.yearMonth);
    return (b.dayOfMonth || 0) - (a.dayOfMonth || 0);
  });

  const latest = sorted[0];
  if (!latest || !latest.dayOfMonth) return null;

  const dayOfMonth = latest.dayOfMonth;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-based

  // 이번 달 갱신일
  let nextYear = currentYear;
  let nextMonth = currentMonth;

  // 이미 이번 달 갱신일이 지났으면 다음 달로
  if (dayOfMonth <= currentDate.getDate()) {
    nextMonth += 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
  }

  // 말일 처리 (2월 28/29, 30일 등)
  const lastDayOfMonth = new Date(nextYear, nextMonth, 0).getDate();
  const actualDay = Math.min(dayOfMonth, lastDayOfMonth);

  const renewalDate = new Date(nextYear, nextMonth - 1, actualDay);
  const diffDays = Math.ceil((renewalDate - currentDate) / (1000 * 60 * 60 * 24));

  return {
    date: renewalDate,
    dayOfMonth: actualDay,
    yearMonth: `${nextYear}-${String(nextMonth).padStart(2, '0')}`,
    daysUntil: diffDays,
    isOverdue: diffDays < 0,
    formattedDate: `${nextYear}년 ${nextMonth}월 ${actualDay}일`,
  };
}

/**
 * 모든 구독의 갱신 예정일 계산
 */
export function calculateAllRenewals(subscriptions) {
  const now = new Date();
  const renewals = [];

  for (const sub of subscriptions) {
    if (!sub.transactions || sub.transactions.length === 0) continue;

    const renewal = predictNextRenewal(sub.transactions, now);
    if (renewal) {
      renewals.push({
        categoryCode: sub.categoryCode,
        amount: sub.amount,
        renewal,
        transactions: sub.transactions,
      });
    }
  }

  // 갱신 임박순 정렬
  renewals.sort((a, b) => a.renewal.daysUntil - b.renewal.daysUntil);

  return renewals;
}

/**
 * 알림 생성 (D-30, D-7, D-1)
 */
export function generateNotifications(allRenewals) {
  const notifications = [];

  for (const item of allRenewals) {
    const daysUntil = item.renewal.daysUntil;

    if (daysUntil === 1 || daysUntil === 0) {
      notifications.push({
        id: `urgent-${item.categoryCode}`,
        type: 'urgent',
        priority: 'critical',
        icon: '🔴',
        title: '내일 결제 예정!',
        description: `${item.categoryCode} ${Math.round(item.amount).toLocaleString()}원`,
        daysUntil,
        category: item.categoryCode,
      });
    } else if (daysUntil <= 7 && daysUntil > 1) {
      notifications.push({
        id: `soon-${item.categoryCode}`,
        type: 'soon',
        priority: 'high',
        icon: '🟡',
        title: `${daysUntil}일 후 결제 예정`,
        description: `${item.categoryCode} ${Math.round(item.amount).toLocaleString()}원`,
        daysUntil,
        category: item.categoryCode,
      });
    } else if (daysUntil <= 30 && daysUntil > 7) {
      notifications.push({
        id: `upcoming-${item.categoryCode}`,
        type: 'upcoming',
        priority: 'info',
        icon: '🔵',
        title: `${daysUntil}일 후 결제 예정`,
        description: `${item.categoryCode} ${Math.round(item.amount).toLocaleString()}원`,
        daysUntil,
        category: item.categoryCode,
      });
    }
  }

  return notifications.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * 이번 주 갱신 목록
 */
export function getThisWeekRenewals(allRenewals) {
  return allRenewals.filter(r => r.renewal.daysUntil >= 0 && r.renewal.daysUntil <= 7);
}

/**
 * 다음 주 갱신 목록
 */
export function getNextWeekRenewals(allRenewals) {
  return allRenewals.filter(r => r.renewal.daysUntil > 7 && r.renewal.daysUntil <= 14);
}