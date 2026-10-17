import React, { useState } from "react";
import { createMobileApiClient } from "./src/api";

// Shared cross-platform mobile shell for Expo (Android / iOS)
export default function ContentFlowMobileApp() {
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const client = createMobileApiClient(
    process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"
  );

  async function onGenerate() {
    if (!prompt.trim()) return;
    const response = await client.generateDraft(prompt, "text");
    if (response?.result) {
      setDraft(response.result);
    }
  }

  return {
    prompt,
    setPrompt,
    draft,
    onGenerate,
  };
}
