'use client';

import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './axios';

let socket: Socket | null = null;

function realtimeBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:4000/api/v1';
  return configured.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

export function getCustomerRealtimeSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (!socket) {
    socket = io(`${realtimeBaseUrl()}/realtime`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 8000,
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectCustomerRealtime() {
  socket?.disconnect();
  socket = null;
}

export function useCustomerRealtimeReload(
  events: string[],
  onEvent: () => void,
  rooms?: { conversationId?: string; appointmentId?: string },
) {
  const callbackRef = React.useRef(onEvent);
  callbackRef.current = onEvent;
  const eventKey = events.join('|');
  const conversationId = rooms?.conversationId;
  const appointmentId = rooms?.appointmentId;

  React.useEffect(() => {
    const current = getCustomerRealtimeSocket();
    if (!current) return;

    const handler = () => callbackRef.current();
    for (const event of events) current.on(event, handler);

    const joinRooms = () => {
      if (conversationId) current.emit('conversation:join', { conversationId });
      if (appointmentId) current.emit('appointment:join', { appointmentId });
    };
    current.on('connect', joinRooms);
    joinRooms();

    return () => {
      for (const event of events) current.off(event, handler);
      current.off('connect', joinRooms);
      if (conversationId) current.emit('conversation:leave', { conversationId });
    };
    // eventKey is the stable representation of the event list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey, conversationId, appointmentId]);
}
