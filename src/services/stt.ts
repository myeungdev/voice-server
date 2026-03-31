const STT_BASE_URL = process.env.SPEACHES_BASE_URL ?? "http://speaches:8000";
const STT_MODEL = process.env.STT_MODEL ?? "Systran/faster-whisper-base.en";

export async function transcribe(audioBuffer: Buffer): Promise<string> {
  const form = new FormData();
  const ab = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength,
  ) as ArrayBuffer;
  form.append("file", new Blob([ab], { type: "audio/wav" }), "audio.wav");
  form.append("model", STT_MODEL);

  const res = await fetch(`${STT_BASE_URL}/v1/audio/transcriptions`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`STT request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { text: string };
  return json.text;
}
