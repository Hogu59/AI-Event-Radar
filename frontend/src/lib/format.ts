import { format, formatDistanceToNowStrict, isAfter, isBefore, isSameDay, differenceInCalendarDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ko } from 'date-fns/locale';
import type { Event, LocationType, SourceId } from './types';
import { LOCATION_TYPE_LABELS, SOURCE_LABELS } from './types';

const KST = 'Asia/Seoul';

export function toKst(input: string | Date): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  return toZonedTime(d, KST);
}

export function formatDate(input: string | Date, pattern = 'yyyy.MM.dd (EEE)'): string {
  return format(toKst(input), pattern, { locale: ko });
}

export function formatTime(input: string | Date): string {
  return format(toKst(input), 'HH:mm', { locale: ko });
}

export function formatDateTime(input: string | Date): string {
  return format(toKst(input), 'yyyy.MM.dd (EEE) HH:mm', { locale: ko });
}

export function formatDateRange(start: string | Date, end?: string | Date | null): string {
  const startD = toKst(start);
  if (!end) return formatDateTime(start);
  const endD = toKst(end);
  if (isSameDay(startD, endD)) {
    return `${formatDate(startD)} ${formatTime(startD)} – ${formatTime(endD)}`;
  }
  return `${formatDate(startD)} ${formatTime(startD)} – ${formatDate(endD)} ${formatTime(endD)}`;
}

/** Relative day label: 오늘 / 내일 / D-3 / D+2 / yyyy.MM.dd */
export function relativeDateLabel(input: string | Date, now: Date = new Date()): {
  label: string;
  tone: 'today' | 'tomorrow' | 'soon' | 'upcoming' | 'past';
} {
  const d = toKst(input);
  const n = toKst(now);
  if (isSameDay(d, n)) return { label: '오늘', tone: 'today' };
  const diff = differenceInCalendarDays(d, n);
  if (diff === 1) return { label: '내일', tone: 'tomorrow' };
  if (diff > 1 && diff <= 7) return { label: `D-${diff}`, tone: 'soon' };
  if (diff > 7) return { label: format(d, 'M.d (EEE)', { locale: ko }), tone: 'upcoming' };
  return { label: format(d, 'M.d (EEE)', { locale: ko }), tone: 'past' };
}

export function isUpcoming(input: string | Date, now: Date = new Date()): boolean {
  return isAfter(toKst(input), toKst(now));
}

export function isPast(input: string | Date, now: Date = new Date()): boolean {
  return isBefore(toKst(input), toKst(now));
}

export function timeAgo(input: string | Date): string {
  return formatDistanceToNowStrict(new Date(input), { locale: ko, addSuffix: true });
}

export function formatLocation(event: Pick<Event, 'location_type' | 'location_name' | 'city'>): string {
  const type = event.location_type;
  if (type === 'online') return '온라인';
  const parts: string[] = [];
  if (event.city) parts.push(event.city);
  if (event.location_name && event.location_name !== event.city) parts.push(event.location_name);
  if (parts.length === 0) return type ? LOCATION_TYPE_LABELS[type as LocationType] : '장소 미정';
  return parts.join(' · ');
}

export function sourceLabel(source: SourceId): string {
  return SOURCE_LABELS[source];
}

export function formatPrice(price?: string | null): string {
  if (!price || price.trim() === '') return '가격 정보 없음';
  const lower = price.toLowerCase();
  if (lower === 'free' || lower === '무료' || lower === '0') return '무료';
  return price;
}
