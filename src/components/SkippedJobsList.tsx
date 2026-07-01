import type { SkippedJob } from '@/lib/monitor/types'

export default function SkippedJobsList({ jobs }: { jobs: SkippedJob[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-slate-400">Nothing was skipped this run.</p>
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="data-table text-xs">
        <thead>
          <tr>
            <th>Role</th>
            <th className="hidden sm:table-cell">Company</th>
            <th className="hidden md:table-cell">Location</th>
            <th>Why</th>
            <th className="hidden sm:table-cell">Source</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, i) => (
            <tr key={`${job.title}-${job.detail}-${i}`}>
              <td className="align-top max-w-[12rem]">
                {job.job_url ? (
                  <a
                    href={job.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-teal-700 hover:underline"
                  >
                    {job.title}
                  </a>
                ) : (
                  <span className="font-medium text-slate-900">{job.title}</span>
                )}
              </td>
              <td className="text-slate-500 hidden sm:table-cell align-top">
                {job.company || '—'}
              </td>
              <td className="text-slate-500 hidden md:table-cell align-top max-w-[8rem] truncate">
                {job.location || '—'}
              </td>
              <td className="align-top whitespace-nowrap">
                <span
                  className={
                    job.reason === 'keyword'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }
                >
                  {job.reason === 'keyword' ? 'Keyword' : 'Location'}
                </span>
                <span className="text-slate-500"> · {job.detail}</span>
              </td>
              <td className="text-slate-500 hidden sm:table-cell align-top truncate max-w-[6rem]">
                {job.source_label}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
