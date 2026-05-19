import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const KST = 'Asia/Seoul';

export function kstNow(): Date {
  return toZonedTime(new Date(), KST);
}

export function formatKst(date: Date | string, fmt = 'yyyy-MM-dd HH:mm'): string {
  return formatInTimeZone(new Date(date), KST, fmt);
}

export function hoursUntil(target: Date | string, from: Date = new Date()): number {
  return (new Date(target).getTime() - from.getTime()) / 36e5;
}

export function isWithinHours(target: Date | string, hours: number, from: Date = new Date()): boolean {
  const h = hoursUntil(target, from);
  return h >= 0 && h <= hours;
}

/** True when current time (UTC) is within ±toleranceMinutes of `kstHour`:00 KST. */
export function isKstHour(kstHour: number, now: Date = new Date(), toleranceMinutes = 60): boolean {
  const kst = toZonedTime(now, KST);
  const hr = kst.getHours();
  const minutes = kst.getMinutes();
  if (hr !== kstHour) return false;
  return minutes <= toleranceMinutes;
}

/** True when current KST is Monday at the given hour (with tolerance). */
export function isKstMondayHour(kstHour: number, now: Date = new Date(), toleranceMinutes = 60): boolean {
  const kst = toZonedTime(now, KST);
  return kst.getDay() === 1 && isKstHour(kstHour, now, toleranceMinutes);
}
