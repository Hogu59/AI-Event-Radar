import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Missing RESEND_API_KEY');
  _resend = new Resend(key);
  return _resend;
}

export interface DigestEvent {
  id: string;
  title: string;
  start_at: string;
  source: string;
  source_url: string;
  city: string | null;
  host_name: string | null;
  price: string | null;
}

export interface SendDigestParams {
  to: string;
  subscriptionName: string;
  events: DigestEvent[];
  appUrl: string;
  unsubscribeUrl?: string;
}

export async function sendDigestEmail(params: SendDigestParams): Promise<{ id: string }> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error('Missing RESEND_FROM_EMAIL');

  const html = renderDigestHtml(params);
  const subject = `[AIEventRadar] "${params.subscriptionName}" 매칭 행사 ${params.events.length}건`;

  const res = await getResend().emails.send({
    from,
    to: params.to,
    subject,
    html,
  });
  if (res.error) throw new Error(`Resend error: ${res.error.message}`);
  return { id: res.data?.id ?? 'unknown' };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderDigestHtml({
  subscriptionName,
  events,
  appUrl,
  unsubscribeUrl,
}: SendDigestParams): string {
  const rows = events
    .map((e) => {
      const date = new Date(e.start_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <a href="${escapeHtml(e.source_url)}"
               style="color:#0b66ff;text-decoration:none;font-weight:600;font-size:16px;">
              ${escapeHtml(e.title)}
            </a>
            <div style="color:#555;font-size:13px;margin-top:4px;">
              ${escapeHtml(date)} · ${escapeHtml(e.source)} ·
              ${e.city ? escapeHtml(e.city) : '장소 미정'}
              ${e.host_name ? ` · ${escapeHtml(e.host_name)}` : ''}
              ${e.price ? ` · ${escapeHtml(e.price)}` : ''}
            </div>
            <div style="margin-top:6px;">
              <a href="${escapeHtml(appUrl)}/events/${escapeHtml(e.id)}"
                 style="color:#0b66ff;font-size:13px;">자세히 보기 →</a>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#222;">
  <h1 style="font-size:22px;margin:0 0 8px 0;">AIEventRadar 다이제스트</h1>
  <p style="color:#666;margin:0 0 24px 0;">"${escapeHtml(subscriptionName)}" 구독 매칭 행사 ${events.length}건</p>
  <table cellpadding="0" cellspacing="0" border="0" width="100%">
    ${rows}
  </table>
  <p style="margin-top:32px;color:#999;font-size:12px;">
    이 이메일은 AIEventRadar 구독에 의해 발송되었습니다.
    ${unsubscribeUrl ? `<br/><a href="${escapeHtml(unsubscribeUrl)}" style="color:#999;">구독 해지</a>` : ''}
  </p>
</body></html>`;
}
