const urlInput = document.getElementById("youtube-url");
const generateBtn = document.getElementById("generate-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const transcriptText = document.getElementById("transcript-text");
const infographicEl = document.getElementById("infographic");

generateBtn.addEventListener("click", generate);
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate();
});

async function generate() {
  const url = urlInput.value.trim();
  if (!url) {
    showStatus("Please paste a YouTube link.", "error");
    return;
  }

  showStatus("Fetching transcript...", "loading");
  infographicEl.classList.add("hidden");
  resultEl.classList.add("hidden");
  generateBtn.disabled = true;
  generateBtn.textContent = "Loading...";

  try {
    // Step 1: Fetch transcript
    const transcriptRes = await fetch("/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const transcriptData = await transcriptRes.json();

    if (!transcriptRes.ok) {
      showStatus(transcriptData.error, "error");
      return;
    }

    // Show transcript
    transcriptText.textContent = transcriptData.transcript;
    resultEl.classList.remove("hidden");

    // Step 2: Summarize with Gemini
    showStatus("Generating infographic with AI...", "loading");

    const summaryRes = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: transcriptData.transcript }),
    });

    const summaryData = await summaryRes.json();

    if (!summaryRes.ok) {
      showStatus(summaryData.error, "error");
      return;
    }

    // Render infographic
    renderInfographic(summaryData);
    showStatus("Infographic generated!", "success");
  } catch (err) {
    showStatus("Something went wrong. Please try again.", "error");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate";
  }
}

function renderInfographic(data) {
  document.getElementById("info-title").textContent = data.title;
  document.getElementById("info-summary").textContent = data.summary;

  const keypointsList = document.getElementById("info-keypoints");
  keypointsList.innerHTML = "";
  data.keyPoints.forEach((point) => {
    const li = document.createElement("li");
    li.textContent = point;
    keypointsList.appendChild(li);
  });

  const topicsContainer = document.getElementById("info-topics");
  topicsContainer.innerHTML = "";
  data.topics.forEach((topic) => {
    const span = document.createElement("span");
    span.className = "topic-tag";
    span.textContent = topic;
    topicsContainer.appendChild(span);
  });

  document.getElementById("info-takeaway").textContent = data.takeaway;
  infographicEl.classList.remove("hidden");
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status " + type;
}
