const urlInput = document.getElementById("youtube-url");
const generateBtn = document.getElementById("generate-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const transcriptText = document.getElementById("transcript-text");

generateBtn.addEventListener("click", fetchTranscript);
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchTranscript();
});

async function fetchTranscript() {
  const url = urlInput.value.trim();
  if (!url) {
    showStatus("Please paste a YouTube link.", "error");
    return;
  }

  showStatus("Fetching transcript...", "loading");
  resultEl.classList.add("hidden");
  generateBtn.disabled = true;
  generateBtn.textContent = "Loading...";

  try {
    const res = await fetch("/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(data.error, "error");
      return;
    }

    showStatus(`Transcript fetched (${data.segments.length} segments)`, "success");
    transcriptText.textContent = data.transcript;
    resultEl.classList.remove("hidden");
  } catch (err) {
    showStatus("Something went wrong. Please try again.", "error");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate";
  }
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status " + type;
}
