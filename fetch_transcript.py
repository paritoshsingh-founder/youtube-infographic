import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

video_id = sys.argv[1]

try:
    api = YouTubeTranscriptApi()
    transcript = api.fetch(video_id)
    segments = []
    for snippet in transcript.snippets:
        segments.append({
            "text": snippet.text,
            "start": snippet.start,
            "duration": snippet.duration
        })
    full_text = " ".join(s["text"] for s in segments)
    print(json.dumps({"transcript": full_text, "segments": segments}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
