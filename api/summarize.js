// NXN Labs team roster for matching action item owners to Slack IDs
const TEAM_ROSTER = [
  { english: 'Dokyun Lee', nickname: 'Jake', korean: '이도균', slack_id: 'U06JVRP030Q', role: 'Product Manager' },
  { english: 'Hobin Hwang', korean: '황호빈', slack_id: 'U0B2TAJL6LX', role: 'Business Intern' },
  { english: 'Hyeob Kim', korean: '김협', slack_id: 'U09RNJM42HM', role: 'BX Designer' },
  { english: 'Jaiwon Lee', nickname: 'Jen', korean: '이재원', slack_id: 'U06HFJ1KX5J', role: 'CEO' },
  { english: 'Rachel Jeon', korean: '전아영', slack_id: 'U0AMUFXU4MN', role: '' },
  { english: 'Yeojin Lim', korean: '임여진', slack_id: 'U0A9VUAN133', role: 'Business Intern' },
  { english: 'Yeonsoo Kim', nickname: 'Soo', korean: '김연수', slack_id: 'U0B5FUVTKGE', role: 'Intern' },
];

const rosterForPrompt = TEAM_ROSTER.map(p => {
  const aliases = [p.english, p.korean, p.nickname].filter(Boolean).join(' / ');
  return `- ${aliases} (${p.role}) — slack_id: ${p.slack_id}`;
}).join('\n');

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Missing transcript' });
    }

    const systemPrompt = `You are an expert meeting analyst for NXN Labs, an AI-powered fashion production company based in Korea. Your job is to analyze meeting transcripts and produce a structured JSON summary.

NXN LABS TEAM ROSTER (these are OUR team members):
${rosterForPrompt}

CRITICAL RULES:
1. LANGUAGE: Detect the dominant language of the transcript. If primarily Korean, write all summary fields in Korean. If primarily English, write in English. Match the language of the original meeting.

2. MEETING TYPE: Determine if this is an "internal" meeting (only NXN Labs team members) or a "client" meeting (NXN Labs meeting with an external company/client).
   - If CLIENT meeting: identify the client company name. Action items should ONLY be for the NXN Labs side. Do not include action items for the client side.
   - If INTERNAL meeting: include action items for any team member.

3. ACTION ITEMS: For each action item:
   - Match the assigned person to the NXN Labs roster above using ANY of their names (English, Korean, or nickname)
   - If matched, set "slack_id" to their Slack ID and "is_team_member" to true
   - If the action item is for the team in general (no specific person), set "person_display" to "Team" and "slack_id" to null
   - If the meeting is internal and no specific person is named, default to "Team"
   - Format deadlines naturally (e.g., "ASAP", "1주 내", "2026-04-15")

4. STRUCTURE: Use rich, descriptive bullet points with **bold topic headers** followed by detailed explanations (matching the style of professional meeting notes).

Return ONLY a valid JSON object with this exact schema:
{
  "language": "ko" or "en",
  "meeting_type": "internal" or "client",
  "client_company": "name of client company if client meeting, otherwise null",
  "participants": ["Name1", "Name2"],
  "brief_summary": "3-5 sentence concise summary for Slack",
  "summary_points": [
    {"topic": "Bold topic header", "description": "Detailed 1-2 sentence description"}
  ],
  "action_items": [
    {
      "person_display": "Display name (e.g., 'Dokyun (Jake)' or 'Team' or 'NXN Labs')",
      "slack_id": "U06JVRP030Q or null",
      "is_team_member": true or false,
      "task": "task description",
      "deadline": "deadline or null"
    }
  ],
  "key_decisions": [
    {"topic": "Bold topic header", "description": "Detailed description"}
  ],
  "open_questions": [
    {"topic": "Bold topic header", "description": "Detailed description"}
  ]
}`;

    const userPrompt = `Meeting Title: ${title || 'Meeting'}

Transcript:
${transcript}

Analyze the above meeting transcript and return the structured JSON summary.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Groq API error: ' + errText });
    }

    const data = await response.json();
    res.status(200).json({ result: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

