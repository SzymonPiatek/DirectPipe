import { WS_URL } from './env';

export type PeerRole = 'initiator' | 'receiver';

export type ServerMessage =
  | { type: 'joined'; role: PeerRole }
  | { type: 'peer-joined' }
  | { type: 'peer-left' }
  | { type: 'room-full' }
  | { type: 'error'; message: string }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

type ClientMessage =
  | { type: 'join'; roomId: string }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

type MessageHandler = (msg: ServerMessage) => void;

/** WebSocket client for the signaling server. */
export class SignalingClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();

  connect(roomId: string): void {
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.ws!.send(JSON.stringify({ type: 'join', roomId }));
    };

    this.ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data as string) as ServerMessage;
        this.handlers.forEach((h) => h(msg));
      } catch {
        // ignore malformed frames
      }
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Registers a message handler. Returns an unsubscribe function. */
  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
  }
}
