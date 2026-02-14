require("dotenv").config();
const express = require("express");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/generate", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert content summarizer. Watch this YouTube video and create a structured infographic-style summary. Return the response in this exact JSON format:

{
  "title": "A short catchy title for the video",
  "summary": "A 2-3 sentence overview of the video",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "topics": ["topic1", "topic2", "topic3"],
  "takeaway": "The single most important takeaway from this video"
}

Only return valid JSON, nothing else.`;

    const result = await model.generateContent([
      {
        fileData: {
          fileUri: `https://www.youtube.com/watch?v=${videoId}`,
        },
      },
      { text: prompt },
    ]);

    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Failed to parse AI response." });
    }

    const summary = JSON.parse(jsonMatch[0]);
    res.json(summary);
  } catch (err) {
    console.error("Gemini error:", err.message);
    res.status(500).json({ error: "AI generation failed. Please try again." });
  }
});

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
