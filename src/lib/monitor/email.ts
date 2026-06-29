import type { DiscoveredJob } from './types'

// Resend REST (no SDK dependency). Free tier: 3,000 emails/month, 100/day — far
// more than a once-daily digest needs.
//
// FROM address: if you haven't verified a domain in Resend, set MONITOR_EMAIL_FROM
// to "onboarding@resend.dev" — but note that with the test sender Resend will only
// deliver to the email address you signed up with. To send from your own address
// (e.g. jobs@kbwebdev.com) to anywhere, verify a domain in Resend first.
const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export async function sendDigest(to: string, jobs: DiscoveredJob[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MONITOR_EMAIL_FROM
  if (!apiKey) throw new Error('Missing RESEND_API_KEY env var.')
  if (!from) throw new Error('Missing MONITOR_EMAIL_FROM env var.')

  const subject = `${jobs.length} new job${jobs.length === 1 ? '' : 's'} — ${formatToday()}`

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html: buildHtml(jobs) }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`)
  }
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function esc(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(jobs: DiscoveredJob[]): string {
  const rows = jobs
    .map((j) => {
      const titleCell = j.job_url
        ? `<a href="${esc(j.job_url)}" style="color:#0e7a8c;text-decoration:none;font-weight:600;">${esc(j.title)}</a>`
        : `<span style="font-weight:600;color:#0f172a;">${esc(j.title)}</span>`
      return `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
            ${titleCell}
            <div style="color:#64748b;font-size:13px;margin-top:3px;">${esc(j.company) || '—'}</div>
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#475569;font-size:13px;white-space:nowrap;">
            ${esc(j.posted_text) || '—'}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:#475569;font-size:13px;">
            ${esc(j.source_label) || '—'}
          </td>
        </tr>`
    })
    .join('')

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <h1 style="font-size:18px;color:#0f172a;margin:0 0 4px;">New job postings</h1>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px;">
        ${jobs.length} new posting${jobs.length === 1 ? '' : 's'} found across your monitored sites.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Role / Company</th>
            <th style="text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Posted</th>
            <th style="text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#94a3b8;border-bottom:1px solid #e2e8f0;">Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:12px;color:#94a3b8;margin:20px 0 0;">
        Sent by Job Tracker. Manage your monitored sites and excluded keywords in the dashboard.
      </p>
    </div>
  </body>
</html>`
}
