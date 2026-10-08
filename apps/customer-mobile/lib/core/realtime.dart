import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'lookiva_api.dart';

class LookivaRealtimeEvent {
  final String name;
  final dynamic data;
  const LookivaRealtimeEvent(this.name, this.data);
}

class LookivaRealtime {
  LookivaRealtime._();
  static final LookivaRealtime instance = LookivaRealtime._();

  io.Socket? _socket;
  final StreamController<LookivaRealtimeEvent> _events =
      StreamController<LookivaRealtimeEvent>.broadcast();

  Stream<LookivaRealtimeEvent> get events => _events.stream;
  bool get connected => _socket?.connected == true;

  Future<void> connect() async {
    final token = await LookivaApi.instance.accessToken();
    if (token == null || token.isEmpty) return;
    final base = await LookivaApi.instance.realtimeBaseUrl();

    if (_socket != null) {
      _socket!.auth = {'token': token};
      if (!_socket!.connected) _socket!.connect();
      return;
    }

    final socket = io.io(
      '$base/realtime',
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .enableReconnection()
          .setReconnectionDelay(800)
          .setReconnectionDelayMax(8000)
          .build(),
    );

    for (final event in const [
      'realtime:ready',
      'realtime:error',
      'booking:changed',
      'queue:changed',
      'notification:created',
      'message:created',
      'business:changed',
      'floor:changed',
    ]) {
      socket.on(event, (data) => _events.add(LookivaRealtimeEvent(event, data)));
    }

    socket.onConnect((_) => _events.add(const LookivaRealtimeEvent('connected', null)));
    socket.onDisconnect((_) => _events.add(const LookivaRealtimeEvent('disconnected', null)));
    socket.connect();
    _socket = socket;
  }

  void joinConversation(String conversationId) {
    _socket?.emit('conversation:join', {'conversationId': conversationId});
  }

  void leaveConversation(String conversationId) {
    _socket?.emit('conversation:leave', {'conversationId': conversationId});
  }

  void joinAppointment(String appointmentId) {
    _socket?.emit('appointment:join', {'appointmentId': appointmentId});
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
