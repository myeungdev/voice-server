const TTS_BASE_URL = process.env.SPEACHES_BASE_URL ?? "http://speaches:8000";
const TTS_MODEL =
  process.env.TTS_MODEL ?? "speaches-ai/Kokoro-82M-v1.0-ONNX-int8";
const TTS_VOICE = process.env.TTS_VOICE ?? "af_heart";
const TTS_SPEED = parseFloat(process.env.TTS_SPEED ?? "1.0");
// mp3 is self-framing and streamable; wav requires total size upfront
const TTS_FORMAT = process.env.TTS_FORMAT ?? "mp3";

export async function* synthesizeStream(text: string): AsyncGenerator<Buffer> {
  const res = await fetch(`${TTS_BASE_URL}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: text,
      voice: TTS_VOICE,
      response_format: TTS_FORMAT,
      speed: TTS_SPEED,
    }),
  });

  if (!res.ok) {
    throw new Error(`TTS request failed: ${res.status} ${res.statusText}`);
  }
  if (!res.body) {
    throw new Error("TTS response has no body");
  }

  for await (const chunk of res.body) {
    yield Buffer.from(chunk);
  }
}
