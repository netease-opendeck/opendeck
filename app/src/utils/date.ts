/** 今日 00:00:00（本地） */
export function getStartOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 本周一 00:00:00（本地），周日视为上周 */
export function getStartOfThisWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 根据任务更新时间归入时间分组（今天、昨天、本周、更早） */
export function getTimeGroupKey(
  updatedAt: Date | string,
): 'today' | 'yesterday' | 'thisWeek' | 'earlier' {
  const d = new Date(updatedAt);
  const t = d.getTime();
  const todayStart = getStartOfToday().getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = getStartOfThisWeek().getTime();
  if (t >= todayStart) return 'today';
  if (t >= yesterdayStart) return 'yesterday';
  if (t >= weekStart) return 'thisWeek';
  return 'earlier';
}

export const TIME_GROUP_LABELS: Record<
  'today' | 'yesterday' | 'thisWeek' | 'earlier',
  string
> = {
  today: '今天',
  yesterday: '昨天',
  thisWeek: '本周',
  earlier: '更早',
};
