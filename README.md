# voice-server

A WebSocket server library for building voice AI agents. It handles the full speech pipeline: receive audio from a client, transcribe it (STT), pass the text to your agent, synthesize the response (TTS), and stream the audio back.

## How it works

```
Client → [binary audio chunks] → WebSocket → STT → AgentHandler → TTS → [WAV audio] → Client
```

1. Client streams raw audio as binary WebSocket frames, then sends `{ type: "audio_end" }`.
2. Server transcribes the audio via a [Speaches](https://github.com/speaches-ai/speaches)-compatible STT API.
3. The transcript and conversation history are passed to your `AgentHandler`.
4. The agent's text response is synthesized to WAV audio via a Speaches TTS API.
5. Audio is sent back to the client as base64-encoded chunks.

## Installation

```bash
pnpm add voice-server
```

## Usage

```typescript
import { startServer } from "voice-server";
import type { AgentHandler } from "voice-server";

const handler: AgentHandler = async (transcript, history) => {
  // Call your LLM, use history for context, return a response
  const text = `You said: ${transcript}`;
  return { text, updatedHistory: history };
};

startServer(3000, handler);
```

## API

### `startServer(port, handler, options?)`

Starts a WebSocket server on the given port.

| Parameter | Type | Description |
|---|---|---|
| `port` | `number` | Port to listen on |
| `handler` | `AgentHandler` | Default handler called for each utterance |
| `options` | `ServerOptions` | Optional lifecycle hooks (see below) |

### `synthesize(text)`

Directly synthesize text to a WAV `Buffer` using the configured TTS service.

### `AgentHandler`

```typescript
type AgentHandler = (
  transcript: string,
  history: BaseMessage[],  // LangChain message history
) => Promise<{ text: string; updatedHistory: BaseMessage[] }>;
```

### `ServerOptions`

```typescript
interface ServerOptions {
  // Called on new connection. Return an AgentHandler to override the default for this session.
  onConnect?: (ws: WebSocket, session: Session) => Promise<AgentHandler | void>;
  // Called when a client disconnects.
  onDisconnect?: (session: Session) => Promise<void>;
}
```

## WebSocket Protocol

**Client → Server**

| Message | Description |
|---|---|
| Binary frame | Raw audio data (WAV) |
| `{ type: "audio_end" }` | Signals end of utterance, triggers processing |

**Server → Client**

| Message | Description |
|---|---|
| `{ type: "ready" }` | Server is ready to receive audio |
| `{ type: "processing" }` | Utterance received, transcription started |
| `{ type: "transcription", text }` | STT result |
| `{ type: "response_text", text }` | Agent text response |
| `{ type: "audio_start" }` | TTS audio stream begins |
| `{ type: "audio_chunk", data }` | Base64-encoded WAV chunk |
| `{ type: "audio_end" }` | TTS audio stream complete |
| `{ type: "error", message }` | Error during any stage |

## Configuration

All configuration is via environment variables.

| Variable | Default | Description |
|---|---|---|
| `SPEACHES_BASE_URL` | `http://speaches:8000` | Base URL for both STT and TTS services |
| `STT_MODEL` | `Systran/faster-whisper-base.en` | Whisper model for transcription |
| `TTS_MODEL` | `speaches-ai/Kokoro-82M-v1.0-ONNX-int8` | Kokoro TTS model |
| `TTS_VOICE` | `af_heart` | TTS voice ID |
| `TTS_SPEED` | `1.0` | TTS playback speed multiplier |

## Dependencies

- [`ws`](https://github.com/websockets/ws) — WebSocket server
- [`@langchain/core`](https://github.com/langchain-ai/langchainjs) — Message history types
