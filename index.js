require("dotenv").config();
const express = require("express");
const path = require("path");
const { execFile } = require("child_process");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/transcript", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  const scriptPath = path.join(__dirname, "fetch_transcript.py");

  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  execFile(pythonCmd, [scriptPath, videoId], { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("Transcript error:", err.message);
      console.error("stderr:", stderr);
      console.error("stdout:", stdout);
      return res.status(500).json({ error: "Could not fetch transcript. The video may not have captions." });
    }

    try {
      const data = JSON.parse(stdout);
      if (data.error) {
        return res.status(500).json({ error: data.error });
      }
      res.json({ videoId, transcript: data.transcript, segments: data.segments });
    } catch {
      res.status(500).json({ error: "Failed to parse transcript data." });
    }
  });
});

app.post("/api/summarize", async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert content summarizer. Given the following YouTube video transcript, create a structured infographic-style summary. Return the response in this exact JSON format:

{
  "title": "A short catchy title for the video",
  "summary": "A 2-3 sentence overview of the video",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "topics": ["topic1", "topic2", "topic3"],
  "takeaway": "The single most important takeaway from this video"
}

Only return valid JSON, nothing else.

Transcript:
${transcript}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse the JSON from Gemini's response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Failed to parse AI response." });
    }

    const summary = JSON.parse(jsonMatch[0]);
    res.json(summary);
  } catch (err) {
    console.error("Gemini error:", err.message);
    res.status(500).json({ error: "AI summarization failed. Please try again." });
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

app.get("/api/debug", (req, res) => {
  const { execSync } = require("child_process");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const results = {};
  try {
    results.pythonVersion = execSync(`${pythonCmd} --version 2>&1`).toString().trim();
  } catch (e) {
    results.pythonVersion = "NOT FOUND: " + e.message;
  }
  try {
    results.importTest = execSync(`${pythonCmd} -c "import sys; sys.path.insert(0,'python_libs'); from youtube_transcript_api import YouTubeTranscriptApi; print('OK')" 2>&1`).toString().trim();
  } catch (e) {
    results.importTest = "FAILED: " + e.message;
  }
  try {
    results.pythonLibsExists = require("fs").existsSync(path.join(__dirname, "python_libs"));
  } catch (e) {
    results.pythonLibsExists = false;
  }
  results.platform = process.platform;
  results.geminiKeySet = !!process.env.GEMINI_API_KEY;
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
