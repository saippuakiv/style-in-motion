import { NextResponse } from 'next/server';
import { SKILL_PROMPT } from './skill';

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SKILL_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.log('Anthropic error:', errorBody);
    return NextResponse.json(
      { error: 'Token generation failed', detail: errorBody },
      { status: res.status },
    );
  }

  const data = await res.json();
  const raw = data.content.map((b: { text?: string }) => b.text || '').join('');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    console.log('No JSON object found in response:', raw);
    return NextResponse.json({ error: 'No JSON in response' }, { status: 500 });
  }
  const tokens = JSON.parse(raw.slice(start, end + 1));

  return NextResponse.json(tokens);
}
