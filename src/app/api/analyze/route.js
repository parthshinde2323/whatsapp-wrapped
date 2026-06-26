import Groq from "groq-sdk";

// Validate API key exists at startup
if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not set in environment variables");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT) return true;

  rateLimitMap.set(ip, { count: entry.count + 1, start: entry.start });
  return false;
}

export async function POST(request) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { prompt } = body;

    // Input validation
    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    // Size limit — prevents API credit abuse
    if (prompt.length > 5000) {
      return Response.json(
        { error: "Input too large" },
        { status: 413 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const text = completion.choices[0]?.message?.content || "";

    // Strip markdown fences if model wraps response in ```json
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return Response.json({ success: true, data: parsed });
  } catch (err) {
    console.error("Analyze API error:", err);
    return Response.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}