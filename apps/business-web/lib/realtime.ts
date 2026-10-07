'use client';

import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE, getBusinessSession } from './api';

let socket: Socket | null = null;

function realtimeBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_REALTIME_URL || API_BASE;
  return configured.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

export function getBusinessRealtimeSocket(): Socket | null {
  const session = getBusinessSession();
  if (!session?.accessToken) return null;

  if (!socket) {
    socket = io(`${realtimeBaseUrl()}/realtime`, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: { token: session.accessToken },
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 8000,
    });
  } else {
    socket.auth = { token: session.accessToken };
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectBusinessRealtime() {
  socket?.disconnect();
  socket = null;
}

export function useBusinessRealtimeReload(
  events: string[],
  onEvent: () => void,
  branchId?: string,
) {
  const callbackRef = React.useRef(onEvent);
  callbackRef.current = onEvent;
  const eventKey = events.join('|');

  React.useEffect(() => {
    const current = getBusinessRealtimeSocket();
    if (!current) return;
    const handler = () => callbackRef.current();
    for (const event of events) current.on(event, handler);

    const join = () => {
      if (branchId) current.emit('branch:join', { branchId });
    };
    current.on('connect', join);
    join();

    return () => {
      for (const event of events) current.off(event, handler);
      current.off('connect', join);
    };
    // eventKey is the stable representation of the event list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey, branchId]);
}
