import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { transcribe } from "./services/stt.js";
import { synthesizeStream } from "./services/tts.js";
import type { AgentHandler, WsServerMessage, WsClientMessage, Session, ServerOptions } from "./types.js";

export { synthesizeStream };

function send(ws: WebSocket, msg: WsServerMessage): void {
  ws.send(JSON.stringify(msg));
}

async function handleUtterance(
  ws: WebSocket,
  session: Session,
  handler: AgentHandler,
): Promise<void> {
  const buffer = Buffer.concat(session.audioChunks);
  session.audioChunks = [];

  send(ws, { type: "processing" });

  try {
    const transcript = await transcribe(buffer);
    send(ws, { type: "transcription", text: transcript });

    const { text, updatedHistory } = await handler(transcript, session.history);
    session.history = updatedHistory;

    send(ws, { type: "response_text", text });

    send(ws, { type: "audio_start" });
    for await (const chunk of synthesizeStream(text)) {
      send(ws, { type: "audio_chunk", data: chunk.toString("base64") });
    }
    send(ws, { type: "audio_end" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    send(ws, { type: "error", message });
  } finally {
    session.processing = false;
  }
}

export function startServer(port: number, handler: AgentHandler, options?: ServerOptions): void {
  const wss = new WebSocketServer({ port, maxPayload: 50 * 1024 * 1024 });

  wss.on("listening", () => {
    console.log(`WebSocket server listening on port ${port}`);
  });

  wss.on("connection", async (ws) => {
    const session: Session = {
      id: randomUUID(),
      history: [],
      audioChunks: [],
      processing: false,
    };

    console.log(`Client connected: ${session.id}`);

    let sessionHandler = handler;

    if (options?.onConnect) {
      try {
        const result = await options.onConnect(ws, session);
        if (result) sessionHandler = result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`onConnect error for session ${session.id}:`, message);
        send(ws, { type: "error", message });
      }
    }

    // Signal the client that the server is ready to receive audio.
    // Sent after onConnect (and any greeting) completes, or immediately if there is none.
    send(ws, { type: "ready" });

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        session.audioChunks.push(data as Buffer);
        return;
      }

      let msg: WsClientMessage;
      try {
        msg = JSON.parse(data.toString()) as WsClientMessage;
      } catch {
        send(ws, { type: "error", message: "Invalid JSON" });
        return;
      }

      if (msg.type === "audio_end") {
        if (session.processing) {
          send(ws, { type: "error", message: "Already processing an utterance" });
          return;
        }
        if (session.audioChunks.length === 0) {
          send(ws, { type: "error", message: "No audio received" });
          return;
        }
        session.processing = true;
        handleUtterance(ws, session, sessionHandler).catch(() => {
          session.processing = false;
        });
      }
    });

    ws.on("close", () => {
      console.log(`Client disconnected: ${session.id}`);
      if (options?.onDisconnect) {
        options.onDisconnect(session).catch((err) => {
          console.error(`onDisconnect error for session ${session.id}:`, err);
        });
      }
    });

    ws.on("error", (err) => {
      console.error(`WebSocket error for session ${session.id}:`, err.message);
    });
  });
}
