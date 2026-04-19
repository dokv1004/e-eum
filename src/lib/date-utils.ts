import { format, getDay, addDays, subDays } from "date-fns";

/**
 * 주어진 날짜가 속한 주의 일요일 날짜를 YYYY-MM-DD로 반환.
 * - 일요일(0) → 오늘
 * - 월요일(1) → 6일 뒤
 * - 화요일(2) → 5일 뒤
 * - ...
 * - 토요일(6) → 1일 뒤
 */
export function getNextSundayId(date: Date = new Date()): string {
  const day = getDay(date); // 0=일, 1=월, ..., 6=토
  const sunday = day === 0 ? date : addDays(date, 7 - day);
  return format(sunday, "yyyy-MM-dd");
}

/**
 * 주어진 날짜 기준 직전 일요일 날짜를 YYYY-MM-DD로 반환.
 * - 일요일(0) → 7일 전 일요일
 * - 월요일(1) → 1일 전
 * - 화요일(2) → 2일 전
 * - ...
 * - 토요일(6) → 6일 전
 */
export function getPreviousSundayId(date: Date = new Date()): string {
  const day = getDay(date);
  const sunday = day === 0 ? subDays(date, 7) : subDays(date, day);
  return format(sunday, "yyyy-MM-dd");
}
