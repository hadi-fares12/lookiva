import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'lookiva_api.dart';

class LookivaBusinessRealtimeEvent {
  final String name;
  final dynamic data;
  const LookivaBusinessRealtimeEvent(this.name, this.data);
}

class LookivaBusinessRealtime {
  LookivaBusinessRealtime._();
  static final LookivaBusinessRealtime instance = LookivaBusinessRealtime._();

  io.Socket? _socket;
  final StreamController<LookivaBusinessRealtimeEvent> _events =
      StreamController<LookivaBusinessRealtimeEvent>.broadcast();

  Stream<LookivaBusinessRealtimeEvent> get events => _events.stream;
  bool get connected => _socket?.connected == true;

  Future<void> connect() async {
    final token = await LookivaBusinessApi.instance.accessToken();
    if (token == null || token.isEmpty) return;
    final base = await LookivaBusinessApi.instance.realtimeBaseUrl();

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
      socket.on(event, (data) => _events.add(LookivaBusinessRealtimeEvent(event, data)));
    }

    socket.onConnect((_) => _events.add(const LookivaBusinessRealtimeEvent('connected', null)));
    socket.onDisconnect((_) => _events.add(const LookivaBusinessRealtimeEvent('disconnected', null)));
    socket.connect();
    _socket = socket;
  }

  void joinBranch(String branchId) {
    _socket?.emit('branch:join', {'branchId': branchId});
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
