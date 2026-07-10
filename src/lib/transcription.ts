/**
 * Whisper transcription. Raw HTTP against the OpenAI API — this project has
 * no OpenAI SDK dependency and transcription is a single multipart call.
 */
export async function transcribeAudio(audio: Buffer, filename: string, contentType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: contentType }), filename);
  form.append("model", "whisper-1");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Whisper transcription failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
