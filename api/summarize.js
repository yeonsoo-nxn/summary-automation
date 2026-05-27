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
  return `- ${aliases} (${p.role}) -> slack_id: ${p.slack_id}`;
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

    const systemPrompt = `You are an expert meeting analyst for NXN Labs, an AI-powered fashion production company based in Korea. Analyze meeting transcripts and produce structured JSON.

NXN LABS TEAM ROSTER (these are OUR team members):
${rosterForPrompt}

RULES:
1. LANGUAGE: Detect the dominant language of the transcript. If primarily Korean, write all string values in Korean. If primarily English, write in English. Match the language of the meeting.

2. MEETING TYPE: Determine if this is "internal" (only NXN Labs team) or "client" (NXN Labs meeting with external company).
   - For CLIENT meetings: identify the client company name. Action items should ONLY be for the NXN Labs side, not for the client side.
   - For INTERNAL meetings: include action items for any team member mentioned.

3. ACTION ITEMS: For each action item:
   - Match the assigned person to the team roster above using any of their names (English, Korean, or nickname)
   - If matched: set "slack_id" to their Slack ID and "is_team_member" to true
   - If no specific person is named or it's a general team task: set "person_display" to "Team" or "NXN Labs", "slack_id" to null, "is_team_member" to false

4. CRITICAL JSON FORMATTING RULES:
   - All string values MUST be valid JSON strings wrapped in double quotes
   - DO NOT use markdown formatting like **bold** or *italic* inside string values
   - Write topic and description as plain text only, no asterisks, no special formatting
   - Example of CORRECT: "topic": "Introduction to the company"
   - Example of WRONG: "topic": **Introduction** (this is invalid JSON)
   - Example of WRONG: "topic": "**Introduction**" (no asterisks in content)

Return ONLY valid JSON matching this exact schema:
{
  "language": "ko" or "en",
  "meeting_type": "internal" or "client",
  "client_company": "name of client if client meeting, otherwise null",
  "participants": ["Name1", "Name2"],
  "brief_summary": "3-5 sentence concise summary",
  "summary_points": [
    {"topic": "Plain text topic header", "description": "Detailed 1-2 sentence description"}
  ],
  "action_items": [
    {
      "person_display": "Display name or Team or NXN Labs",
      "slack_id": "U06JVRP030Q or null",
      "is_team_member": true or false,
      "task": "task description",
      "deadline": "deadline or null"
    }
  ],
  "key_decisions": [
    {"topic": "Plain text topic header", "description": "Detailed description"}
  ],
  "open_questions": [
    {"topic": "Plain text topic header", "description": "Detailed description"}
  ]
}

All topic and description values must be plain strings without any markdown syntax.`;

    const userPrompt = `Meeting Title: ${title || 'Meeting'}

Transcript:
${transcript}

Analyze and return the structured JSON summary. Remember: NO markdown formatting like ** in any string value.`;

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
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Groq API error: ' + errText });
    }

    const data = await response.json();
    let result = data.choices[0].message.content;

    // Defensive cleanup: strip any stray markdown asterisks that might break JSON
    // This handles cases where the model still slips in **text** patterns
    try {
      JSON.parse(result);
    } catch (e) {
      // Try to fix common issues: unquoted **bold** in values
      result = result.replace(/:\s*\*\*([^*]+)\*\*/g, ': "$1"');
      // Remove stray ** inside already-quoted strings
      result = result.replace(/"([^"]*?)\*\*([^"]*?)\*\*([^"]*?)"/g, '"$1$2$3"');
    }

    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
