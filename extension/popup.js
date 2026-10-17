const apiBaseInput = document.getElementById("apiBase");
const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generateBtn");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

generateBtn?.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    statusEl.textContent = "Enter an idea or prompt first.";
    return;
  }
  statusEl.textContent = "Generating draft via ContentFlow API v1...";
  try {
    const res = await fetch(`${apiBaseInput.value.replace(/\/$/, "")}/api/v1/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, modality: "text", platforms: ["YouTube", "TikTok"] }),
    });
    const data = await res.json();
    if (res.ok && data.result) {
      promptInput.value = data.result;
      statusEl.textContent = `Generated (${data.remainingDailyGenerations} daily quota left).`;
    } else {
      statusEl.textContent = data.error || "Generation failed.";
    }
  } catch {
    statusEl.textContent = "Could not connect to ContentFlow server.";
  }
});

saveBtn?.addEventListener("click", async () => {
  const text = promptInput.value.trim();
  if (!text) {
    statusEl.textContent = "Nothing to save.";
    return;
  }
  statusEl.textContent = "Saving draft to workspace...";
  try {
    const res = await fetch(`${apiBaseInput.value.replace(/\/$/, "")}/api/v1/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: text.slice(0, 60),
        originalText: text,
        generatedScript: text,
        contentType: "text",
      }),
    });
    if (res.ok) {
      statusEl.textContent = "Draft saved to ContentFlow!";
    } else {
      const err = await res.json();
      statusEl.textContent = err.error || "Failed to save draft.";
    }
  } catch {
    statusEl.textContent = "Could not reach ContentFlow server.";
  }
});
