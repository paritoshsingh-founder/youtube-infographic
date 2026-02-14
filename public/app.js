const urlInput = document.getElementById("youtube-url");
const generateBtn = document.getElementById("generate-btn");
const statusEl = document.getElementById("status");
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

  showStatus("Analyzing video with AI...", "loading");
  infographicEl.classList.add("hidden");
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(data.error, "error");
      return;
    }

    renderInfographic(data);
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
