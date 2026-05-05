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
  // Tracks the in-flight createPeer() promise so that offer/ice handlers
  // can await peer initialization before attempting to use peerRef.current.
  const peerInitRef = useRef<Promise<Peer> | null>(null);

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
        if (msg.role === 'receiver') {
          peerInitRef.current = createPeer('receiver');
          await peerInitRef.current;
        }
      }

      if (msg.type === 'peer-joined') {
        peerInitRef.current = createPeer('initiator');
        const peer = await peerInitRef.current;
        await peer.start();
      }

      if (msg.type === 'offer') {
        // Wait for receiver's peer to finish initializing before handling the offer.
        if (peerInitRef.current) await peerInitRef.current;
        await peerRef.current?.handleOffer(msg.sdp);
      }

      if (msg.type === 'answer') {
        await peerRef.current?.handleAnswer(msg.sdp);
      }

      if (msg.type === 'ice') {
        // Wait for peer initialization — candidates may arrive before the peer is ready.
        if (peerInitRef.current) await peerInitRef.current;
        await peerRef.current?.handleIce(msg.candidate);
      }

      if (msg.type === 'peer-left') {
        peerRef.current?.close();
        peerRef.current = null;
        peerInitRef.current = null;
        setChannel(null);
        setStatus('waiting');
      }
    });

    signaling.connect(roomId);

    return () => {
      unsub();
      signaling.close();
      peerRef.current?.close();
      peerRef.current = null;
      peerInitRef.current = null;
    };
  }, [roomId]);

  return { status, role, channel };
}
