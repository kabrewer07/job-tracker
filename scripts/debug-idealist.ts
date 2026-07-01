import { fetchIdealistJobs } from '../src/lib/monitor/idealist'

const url =
  process.argv[2] ??
  'https://www.idealist.org/en/jobs?functions=TECHNOLOGY_IT&locationType=REMOTE'

async function main() {
  const { jobs, extraction } = await fetchIdealistJobs(url)
  console.log('url:', url)
  console.log('extraction:', extraction)
  console.log('jobs:', jobs.length)
  jobs.forEach((j) => console.log(' -', j.title, '|', j.company, '|', j.location, '|', j.workType))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
