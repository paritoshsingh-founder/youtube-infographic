const express = require("express");
const path = require("path");
const { execFile } = require("child_process");
const app = express();
const PORT = 3000;

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

  execFile("python", [scriptPath, videoId], { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("Transcript error:", stderr || err.message);
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
