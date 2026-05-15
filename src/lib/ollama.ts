export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export async function generateOllamaDraft(prompt: string): Promise<string> {
  try {
    const response = await fetch("/api/ollama/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const msg = errorBody?.error || "Ollama request failed.";
      throw new Error(msg);
    }

    const data = await response.json();
    if (!data?.response || typeof data.response !== "string") {
      throw new Error("Invalid response from Ollama API.");
    }

    return data.response;
  } catch (error) {
    console.error("Ollama Error:", error);
    throw error;
  }
}
