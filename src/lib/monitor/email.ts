import type { DiscoveredJob } from './types'
import { comparePostedDates, formatPostedDisplayForEmail } from './posted-sort'
import { formatSourceForEmail } from './job-sources'

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
  const sorted = [...jobs].sort((a, b) => comparePostedDates(a, b, 'desc'))

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html: buildHtml(sorted) }),
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

function jobMetaLine(j: DiscoveredJob): string | null {
  const parts = [j.salary, j.location, j.work_type].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

function buildJobEntry(j: DiscoveredJob, isFirst: boolean): string {
  const title = j.job_url
    ? `<a href="${esc(j.job_url)}" style="color:#0e7a8c;text-decoration:none;font-weight:600;font-size:16px;line-height:1.35;display:inline-block;">${esc(j.title)}</a>`
    : `<span style="font-weight:600;color:#0f172a;font-size:16px;line-height:1.35;display:inline-block;">${esc(j.title)}</span>`

  const meta = jobMetaLine(j)
  const posted = esc(formatPostedDisplayForEmail(j))
  const source = esc(formatSourceForEmail(j))

  const metaBlock = meta
    ? `<p class="email-meta" style="margin:4px 0 0;font-size:13px;line-height:1.4;color:#64748b;">${esc(meta)}</p>`
    : ''

  const summaryBlock = j.summary
    ? `<p class="email-summary" style="margin:10px 0 0;padding-top:10px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.5;color:#475569;">${esc(j.summary)}</p>`
    : ''

  const divider = isFirst ? '' : 'border-top:1px solid #e2e8f0;'

  return `<div class="email-job" style="padding:16px 0;${divider}">
    <div class="email-title">${title}</div>
    <p class="email-company" style="margin:2px 0 0;font-size:14px;line-height:1.35;color:#64748b;">${esc(j.company) || '—'}</p>
    ${metaBlock}
    <p class="email-meta-row" style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#64748b;">
      <span style="font-weight:600;color:#475569;">Posted</span> ${posted}
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <span style="font-weight:600;color:#475569;">Source</span> ${source}
    </p>
    ${summaryBlock}
  </div>`
}

function buildJobList(jobs: DiscoveredJob[]): string {
  return jobs.map((j, i) => buildJobEntry(j, i === 0)).join('')
}

function buildHtml(jobs: DiscoveredJob[]): string {
  const list = buildJobList(jobs)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>New job postings</title>
    <style type="text/css">
      body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; }
      table { border-collapse: collapse; }
      img { border: 0; outline: none; }
      a { color: #0e7a8c; }
      @media only screen and (max-width: 480px) {
        .email-shell { padding: 12px 0 !important; }
        .email-job { padding: 10px 0 !important; }
        .email-title a, .email-title span { font-size: 15px !important; }
        .email-company { font-size: 13px !important; }
        .email-meta, .email-meta-row { font-size: 12px !important; margin-top: 3px !important; }
        .email-summary { margin-top: 8px !important; padding-top: 8px !important; }
        .email-intro { margin-bottom: 14px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
      <tr>
        <td align="center" class="email-shell" style="padding:20px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:760px;">
            <tr>
              <td>
                <h1 style="margin:0 0 4px;font-size:20px;font-weight:600;color:#0f172a;line-height:1.3;">New job postings</h1>
                <p class="email-intro" style="margin:0 0 16px;font-size:14px;line-height:1.45;color:#64748b;">
                  ${jobs.length} new posting${jobs.length === 1 ? '' : 's'} from your monitored sites · ${formatToday()}
                </p>
                ${list}
                <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  Sent by Job Tracker · Manage sites and filters in your dashboard
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
