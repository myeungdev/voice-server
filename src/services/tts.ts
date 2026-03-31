const TTS_BASE_URL = process.env.SPEACHES_BASE_URL ?? "http://speaches:8000";
const TTS_MODEL =
  process.env.TTS_MODEL ?? "speaches-ai/Kokoro-82M-v1.0-ONNX-int8";
const TTS_VOICE = process.env.TTS_VOICE ?? "af_heart";
const TTS_SPEED = parseFloat(process.env.TTS_SPEED ?? "1.0");

export async function synthesize(text: string): Promise<Buffer> {
  const res = await fetch(`${TTS_BASE_URL}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: text,
      voice: TTS_VOICE,
      response_format: "wav",
      speed: TTS_SPEED,
    }),
  });

  if (!res.ok) {
    throw new Error(`TTS request failed: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
