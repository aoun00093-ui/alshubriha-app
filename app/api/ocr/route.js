import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
    }

    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: image.type || 'image/jpeg',
                    data: base64Image,
                  },
                },
                {
                  text: 'Analyze this electricity meter image. Extract two things: 1. The main current reading (numbers only, ignore decimals). 2. The meter serial/ID number (found usually under "NO." or serial labels). Return the result strictly as a JSON object with keys: "reading" and "meterNumber". Example: {"reading": "01550", "meterNumber": "20487472"}',
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(data.error?.message || 'Failed to communicate with Gemini API');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response text generated from model');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse OCR response JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      reading: result.reading || '',
      meterNumber: result.meterNumber || '',
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}