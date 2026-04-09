import type { BaseMessage } from "@langchain/core/messages";
import type { WebSocket } from "ws";

export type WsServerMessage =
  | { type: "ready" }
  | { type: "processing" }
  | { type: "transcription"; text: string }
  | { type: "response_text"; text: string }
  | { type: "audio_start" }
  | { type: "audio_chunk"; data: string }
  | { type: "audio_end" }
  | { type: "error"; message: string };

export type WsClientMessage = { type: "audio_end" };

export type AgentHandler = (
  transcript: string,
  history: BaseMessage[],
) => Promise<{
  textStream: AsyncIterable<string>;
  updatedHistory: Promise<BaseMessage[]>;
}>;

export interface Session {
  id: string;
  history: BaseMessage[];
  audioChunks: Buffer[];
  processing: boolean;
}

export interface ServerOptions {
  /** Called when a client connects. Return an AgentHandler to use a per-session handler. */
  onConnect?: (ws: WebSocket, session: Session) => Promise<AgentHandler | void>;
  /** Called when a client disconnects (after session ends). */
  onDisconnect?: (session: Session) => Promise<void>;
}
