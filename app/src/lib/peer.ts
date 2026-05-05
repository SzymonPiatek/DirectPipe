import type { SignalingClient } from './signaling';

type ChannelHandler = (channel: RTCDataChannel) => void;
type StateHandler = (state: RTCPeerConnectionState) => void;

/**
 * Thin wrapper around RTCPeerConnection that handles offer/answer
 * negotiation and routes ICE candidates through the signaling channel.
 */
export class Peer {
  private pc: RTCPeerConnection;

  channel: RTCDataChannel | null = null;
  onChannelReady: ChannelHandler | null = null;
  onStateChange: StateHandler | null = null;

  constructor(
    iceServers: RTCIceServer[],
    private signaling: SignalingClient,
    private role: 'initiator' | 'receiver',
  ) {
    this.pc = new RTCPeerConnection({ iceServers });

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) signaling.send({ type: 'ice', candidate: candidate.toJSON() });
    };

    this.pc.onconnectionstatechange = () => {
      this.onStateChange?.(this.pc.connectionState);
    };

    if (role === 'receiver') {
      this.pc.ondatachannel = ({ channel }) => this.setupChannel(channel);
    }
  }

  /** Initiator only: opens the data channel and sends the SDP offer. */
  async start(): Promise<void> {
    this.setupChannel(this.pc.createDataChannel('files', { ordered: true }));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.signaling.send({ type: 'offer', sdp: offer });
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(sdp);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signaling.send({ type: 'answer', sdp: answer });
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(sdp);
  }

  async handleIce(candidate: RTCIceCandidateInit): Promise<void> {
    await this.pc.addIceCandidate(candidate);
  }

  /**
   * Inspects the nominated ICE candidate pair to determine if traffic
   * is flowing directly (p2p) or through a TURN relay.
   */
  async detectConnectionType(): Promise<'p2p' | 'relay'> {
    try {
      const stats = await this.pc.getStats();
      for (const [, report] of stats) {
        if (report.type !== 'candidate-pair') continue;
        const pair = report as RTCIceCandidatePairStats;
        if (!pair.nominated) continue;
        const local = stats.get(pair.localCandidateId) as Record<string, unknown> | undefined;
        if (local?.['candidateType'] === 'relay') return 'relay';
      }
    } catch {
      // getStats() unavailable in some environments
    }
    return 'p2p';
  }

  close(): void {
    this.pc.close();
  }

  private setupChannel(channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = 1 * 1024 * 1024;
    this.channel = channel;

    // ondatachannel on the receiver fires when the channel is already 'open',
    // so we must handle both states — otherwise onopen never fires for the receiver.
    if (channel.readyState === 'open') {
      this.onChannelReady?.(channel);
    } else {
      channel.onopen = () => this.onChannelReady?.(channel);
    }
  }
}
