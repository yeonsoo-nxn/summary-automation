export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioData, filename } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Missing audioData' });
    }

    const buffer = Buffer.from(audioData, 'base64');

    // Build multipart form-data manually for maximum compatibility
    const boundary = '----vercel-' + Date.now();
    const CRLF = '\r\n';
    const safeName = filename || 'audio.m4a';

    const filePart = Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; filename="${safeName}"${CRLF}` +
      `Content-Type: application/octet-stream${CRLF}${CRLF}`
    );

    const tailPart = Buffer.from(
      `${CRLF}--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="model"${CRLF}${CRLF}` +
      `whisper-large-v3${CRLF}` +
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="response_format"${CRLF}${CRLF}` +
      `text${CRLF}` +
      `--${boundary}--${CRLF}`
    );

    const body = Buffer.concat([filePart, buffer, tailPart]);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length.toString(),
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Groq API error: ' + errText });
    }

    const text = await response.text();
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
