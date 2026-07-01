import { readFileSync } from 'fs'
import { resolve } from 'path'
import { scrapeToMarkdown } from '../src/lib/monitor/firecrawl'
import { extractJobs } from '../src/lib/monitor/extract'
import { isUsEligibleLocation } from '../src/lib/monitor/us-filter'

for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const url =
  'https://www.remoterocketship.com/us/jobs/full-time/?jobsInput=full-time&page=1&sort=DateAdded&locations=United+States&employmentType=full-time&minSalary=90000&jobTitle=Frontend+Engineer%2CTechnical+Project+Manager%2CChief+of+Staff%2CFull-stack+Engineer'

async function main() {
  const md = await scrapeToMarkdown(url)
  const lower = md.toLowerCase()
  for (const term of ['clover', 'clickup', 'clover health']) {
    console.log(term + ':', lower.includes(term) ? 'YES' : 'NO')
  }
  console.log('markdown length:', md.length)

  const sections = md.split(/\n(?=### )/).filter((p) => {
    const t = p.trim()
    return t.startsWith('### ') && /\/jobs\/|\/job\/|\/careers\/|\/positions\//i.test(t)
  })
  console.log('listing sections:', sections.length)

  const cloverSection = sections.find((s) => /clover/i.test(s))
  const clickupSection = sections.find((s) => /clickup/i.test(s))
  if (cloverSection) console.log('\nClover section preview:\n', cloverSection.slice(0, 600))
  if (clickupSection) console.log('\nClickUp section preview:\n', clickupSection.slice(0, 600))

  const { jobs, extraction } = await extractJobs(md, url, { denseListing: true })
  console.log('\nextraction:', extraction)
  console.log('jobs extracted:', jobs.length)

  const targets = jobs.filter((j) => /clover|clickup/i.test(`${j.company || ''} ${j.title}`))
  console.log('\nclover/clickup extracted:', JSON.stringify(targets, null, 2))

  for (const j of targets) {
    console.log('US eligible', j.company, ':', isUsEligibleLocation(j.location), '| loc:', j.location)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
