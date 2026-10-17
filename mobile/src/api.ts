export interface MobileApiEndpoints {
  me: string;
  generate: string;
  content: string;
  crossPost: string;
  jobs: string;
}

export function buildMobileApiEndpoints(baseUrl: string): MobileApiEndpoints {
  const clean = baseUrl.replace(/\/+$/, "");
  return {
    me: `${clean}/api/v1/auth/me`,
    generate: `${clean}/api/v1/generate`,
    content: `${clean}/api/v1/content`,
    crossPost: `${clean}/api/v1/cross-post`,
    jobs: `${clean}/api/v1/jobs`,
  };
}

export function createMobileApiClient(baseUrl: string) {
  const endpoints = buildMobileApiEndpoints(baseUrl);

  return {
    endpoints,
    async generateDraft(prompt: string, modality: "text" | "image" | "video" = "text") {
      const res = await fetch(endpoints.generate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modality, platforms: ["YouTube", "TikTok"] }),
      });
      return res.json();
    },
    async listJobs() {
      const res = await fetch(endpoints.jobs);
      return res.json();
    },
  };
}
