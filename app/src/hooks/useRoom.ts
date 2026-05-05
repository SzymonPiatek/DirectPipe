'use client';

import { useEffect, useRef, useState } from 'react';
import { SignalingClient, type PeerRole, type ServerMessage } from '@/lib/signaling';
import { Peer } from '@/lib/peer';
import { getIceServers } from '@/lib/ice';

export type ConnectionStatus = 'connecting' | 'waiting' | 'p2p' | 'relay' | 'failed';

export interface RoomState {
  status: ConnectionStatus;
  role: PeerRole | null;
  channel: RTCDataChannel | null;
}

/** Manages WebSocket signaling and WebRTC peer lifecycle for a room. */
export function useRoom(roomId: string): RoomState {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [role, setRole] = useState<PeerRole | null>(null);
  const [channel, setChannel] = useState<RTCDataChannel | null>(null);

  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    const signaling = new SignalingClient();
    signalingRef.current = signaling;

    async function createPeer(assignedRole: PeerRole): Promise<Peer> {
      const iceServers = await getIceServers();
      const peer = new Peer(iceServers, signaling, assignedRole);
      peerRef.current = peer;

      peer.onChannelReady = (ch) => {
        setChannel(ch);
        setStatus('p2p');
      };

      peer.onStateChange = (state) => {
        if (state === 'failed') setStatus('failed');
      };

      return peer;
    }

    const unsub = signaling.onMessage(async (msg: ServerMessage) => {
      if (msg.type === 'joined') {
        setRole(msg.role);
        setStatus('waiting');
        if (msg.role === 'receiver') await createPeer('receiver');
      }

      if (msg.type === 'peer-joined') {
        const peer = await createPeer('initiator');
        await peer.start();
      }

      if (msg.type === 'offer') {
        await peerRef.current?.handleOffer(msg.sdp);
      }

      if (msg.type === 'answer') {
        await peerRef.current?.handleAnswer(msg.sdp);
      }

      if (msg.type === 'ice') {
        await peerRef.current?.handleIce(msg.candidate);
      }

      if (msg.type === 'peer-left') {
        peerRef.current?.close();
        peerRef.current = null;
        setChannel(null);
        setStatus('waiting');
      }
    });

    signaling.connect(roomId);

    return () => {
      unsub();
      signaling.close();
      peerRef.current?.close();
    };
  }, [roomId]);

  return { status, role, channel };
}
