export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export async function generateOllamaDraft(prompt: string, localUrl: string = "http://localhost:11434/api/generate"): Promise<string> {
  try {
    const response = await fetch(localUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3", // Default model
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error("Ollama connection failed. Make sure your local server is running on port 11434.");
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error("Ollama Error:", error);
    throw error;
  }
}
