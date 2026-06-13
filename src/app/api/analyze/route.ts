import OpenAI from 'openai'

const MAX_JOB_DESCRIPTION_LENGTH = 15_000

const SYSTEM_PROMPT = `You are a job search coach helping candidates understand job postings quickly and clearly.

Analyze the job description the user provides and respond in markdown with exactly these sections (use ## headings):

## Role Summary
Write a 2-3 sentence plain-English summary of what this role is and what the person would do day to day.

## Required vs. Nice-to-Have
This is the most important section. Split requirements into two subsections:
### Required
Bullet list of must-have qualifications, skills, and experience.
### Nice-to-Have
Bullet list of preferred or bonus qualifications. If the posting does not distinguish clearly, use your best judgment and note any ambiguity.

## Tech Stack
Bullet list of technologies, tools, languages, and platforms explicitly mentioned. If none are mentioned, say so briefly.

## Seniority Signals
Explain what level this role appears to be (e.g. junior, mid, senior, staff) and cite specific language from the posting that supports your read.

## Culture & Team Signals
Bullet list of what you can infer about culture, team structure, work style, or values from the posting's tone and wording.

## Application Tips
2-3 bullet points on what to emphasize in an application or interview based on this specific JD.

Be concise and practical. Do not invent requirements that are not supported by the text.`

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const jobDescription =
    typeof body === 'object' &&
    body !== null &&
    'jobDescription' in body &&
    typeof (body as { jobDescription: unknown }).jobDescription === 'string'
      ? (body as { jobDescription: string }).jobDescription.trim()
      : ''

  if (!jobDescription) {
    return Response.json(
      { error: 'Please paste a job description to analyze.' },
      { status: 400 }
    )
  }

  if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return Response.json(
      {
        error: `Job description is too long. Maximum ${MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()} characters.`,
      },
      { status: 400 }
    )
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OpenAI API key is not configured on the server.' },
      { status: 500 }
    )
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: jobDescription },
      ],
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to analyze job description.'
    return Response.json({ error: message }, { status: 500 })
  }
}
