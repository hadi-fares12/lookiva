import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'lookiva_api.dart';
import 'realtime.dart';

const String _firebaseApiKey =
    String.fromEnvironment('FIREBASE_API_KEY', defaultValue: '');
const String _firebaseAppId =
    String.fromEnvironment('FIREBASE_APP_ID', defaultValue: '');
const String _firebaseSenderId =
    String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID', defaultValue: '');
const String _firebaseProjectId =
    String.fromEnvironment('FIREBASE_PROJECT_ID', defaultValue: '');
const String _firebaseStorageBucket =
    String.fromEnvironment('FIREBASE_STORAGE_BUCKET', defaultValue: '');

bool get lookivaFirebaseConfigured =>
    _firebaseApiKey.isNotEmpty &&
    _firebaseAppId.isNotEmpty &&
    _firebaseSenderId.isNotEmpty &&
    _firebaseProjectId.isNotEmpty;

FirebaseOptions get lookivaFirebaseOptions => FirebaseOptions(
      apiKey: _firebaseApiKey,
      appId: _firebaseAppId,
      messagingSenderId: _firebaseSenderId,
      projectId: _firebaseProjectId,
      storageBucket:
          _firebaseStorageBucket.isEmpty ? null : _firebaseStorageBucket,
    );

@pragma('vm:entry-point')
Future<void> lookivaFirebaseBackgroundHandler(RemoteMessage message) async {
  if (!lookivaFirebaseConfigured) return;
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: lookivaFirebaseOptions);
  }
}

class CustomerMobileServices {
  CustomerMobileServices._();
  static final CustomerMobileServices instance = CustomerMobileServices._();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<String>? _tokenSubscription;
  StreamSubscription<RemoteMessage>? _messageSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  bool _initialized = false;
  String? _registeredToken;
  DateTime? _lastNearbyCheck;
  void Function(String path)? _openDeepLink;

  Future<void> initialize({
    required void Function(String path) openDeepLink,
  }) async {
    _openDeepLink = openDeepLink;
    if (_initialized) {
      await _startNearbyIfEnabled();
      return;
    }
    _initialized = true;

    try { await _initializeLocalNotifications(); } catch (_) {}
    await _initializePush();
    await _startNearbyIfEnabled();
  }

  Future<void> onSignedIn() async {
    await _registerCurrentPushToken();
    await _startNearbyIfEnabled();
  }

  Future<void> onSignedOut() async {
    LookivaRealtime.instance.disconnect();
    final token = _registeredToken;
    _registeredToken = null;
    if (token != null) {
      try { await LookivaApi.instance.delete('/notifications/devices', data: {'token': token}); } catch (_) {}
    }
    if (lookivaFirebaseConfigured && Firebase.apps.isNotEmpty) {
      try { await FirebaseMessaging.instance.deleteToken(); } catch (_) {}
    }
    _lastNearbyCheck = null;
    await _positionSubscription?.cancel();
    _positionSubscription = null;
  }

  Future<void> dispose() async {
    await _positionSubscription?.cancel();
    await _tokenSubscription?.cancel();
    await _messageSubscription?.cancel();
    await _openedSubscription?.cancel();
  }

  Future<void> _initializeLocalNotifications() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwin = DarwinInitializationSettings();
    const settings = InitializationSettings(android: android, iOS: darwin);
    await _notifications.initialize(
      settings,
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          _openDeepLink?.call(payload);
        }
      },
    );

    if (Platform.isAndroid) {
      await _notifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    }
  }

  Future<void> _initializePush() async {
    if (!lookivaFirebaseConfigured) return;
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: lookivaFirebaseOptions);
      }
      FirebaseMessaging.onBackgroundMessage(
        lookivaFirebaseBackgroundHandler,
      );
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      _messageSubscription = FirebaseMessaging.onMessage.listen((message) {
        final title = message.notification?.title ??
            message.data['title']?.toString() ??
            'LOOKIVA';
        final body = message.notification?.body ??
            message.data['body']?.toString() ??
            '';
        final deepLink = message.data['deepLink']?.toString() ??
            message.data['deep_link']?.toString();
        _showLocalNotification(
          title: title,
          body: body,
          payload: deepLink,
          id: message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch,
        );
      });

      _openedSubscription =
          FirebaseMessaging.onMessageOpenedApp.listen((message) {
        final deepLink = message.data['deepLink']?.toString() ??
            message.data['deep_link']?.toString();
        if (deepLink != null && deepLink.isNotEmpty) {
          _openDeepLink?.call(deepLink);
        }
      });

      final initial = await messaging.getInitialMessage();
      final initialLink = initial?.data['deepLink']?.toString() ??
          initial?.data['deep_link']?.toString();
      if (initialLink != null && initialLink.isNotEmpty) {
        Future<void>.delayed(
          const Duration(milliseconds: 500),
          () => _openDeepLink?.call(initialLink),
        );
      }

      _tokenSubscription = messaging.onTokenRefresh.listen(
        (token) => _registerPushToken(token),
      );
      await _registerCurrentPushToken();
    } catch (_) {
      // Push is optional at runtime when Firebase credentials are not provisioned.
      // In-app notifications and realtime events remain available.
    }
  }

  Future<void> _registerCurrentPushToken() async {
    if (!lookivaFirebaseConfigured) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        await _registerPushToken(token);
      }
    } catch (_) {}
  }

  Future<void> _registerPushToken(String token) async {
    final access = await LookivaApi.instance.accessToken();
    if (access == null || access.isEmpty) return;
    try {
      await LookivaApi.instance.post(
        '/notifications/devices',
        data: {
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
          'appType': 'customer',
          'deviceName': Platform.isIOS ? 'LOOKIVA iOS' : 'LOOKIVA Android',
        },
      );
      _registeredToken = token;
    } catch (_) {}
  }

  Future<void> _startNearbyIfEnabled() async {
    final access = await LookivaApi.instance.accessToken();
    if (access == null || access.isEmpty) return;

    Map<String, dynamic> preferences;
    try {
      final raw = await LookivaApi.instance.get('/customer/preferences');
      preferences = raw is Map
          ? Map<String, dynamic>.from(raw)
          : <String, dynamic>{};
    } catch (_) {
      return;
    }

    final nearbyRaw = preferences['nearby_notification_preferences'];
    final nearby = nearbyRaw is Map
        ? Map<String, dynamic>.from(nearbyRaw)
        : <String, dynamic>{};
    if (nearby['enabled'] != true) {
      await _positionSubscription?.cancel();
      _positionSubscription = null;
      return;
    }

    if (!await Geolocator.isLocationServiceEnabled()) return;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return;
    }

    await _positionSubscription?.cancel();
    final LocationSettings settings = Platform.isAndroid
        ? AndroidSettings(
            accuracy: LocationAccuracy.high, distanceFilter: 150,
            intervalDuration: const Duration(minutes: 2),
            foregroundNotificationConfig: const ForegroundNotificationConfig(
              notificationTitle: 'LOOKIVA nearby alerts',
              notificationText: 'Nearby alerts are enabled. Disable them in Nearby settings to stop location tracking.',
              enableWakeLock: false,
            ),
          )
        : AppleSettings(
            accuracy: LocationAccuracy.high, distanceFilter: 150,
            pauseLocationUpdatesAutomatically: true,
            showBackgroundLocationIndicator: true,
            allowBackgroundLocationUpdates: permission == LocationPermission.always,
          );
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: settings,
    ).listen(
      (position) => _handlePosition(position, nearby),
      onError: (_) {},
    );

    try {
      final current = await Geolocator.getCurrentPosition(
        locationSettings: settings,
      );
      await _handlePosition(current, nearby);
    } catch (_) {}
  }

  Future<void> _handlePosition(
    Position position,
    Map<String, dynamic> nearby,
  ) async {
    final access = await LookivaApi.instance.accessToken();
    if (access == null || access.isEmpty) return;
    final now = DateTime.now();
    if (_lastNearbyCheck != null &&
        now.difference(_lastNearbyCheck!) < const Duration(minutes: 8)) {
      return;
    }
    _lastNearbyCheck = now;

    if (_insideQuietHours(now, nearby)) return;
    final prefs = await SharedPreferences.getInstance();
    final dayKey =
        'cust_nearby_daily_' + now.year.toString() + '-' + now.month.toString() + '-' + now.day.toString();
    final dailyCount = prefs.getInt(dayKey) ?? 0;
    final dailyMax =
        int.tryParse(nearby['daily_max_notifications']?.toString() ?? '') ?? 2;
    if (dailyCount >= dailyMax) return;

    final radius = int.tryParse(
          nearby['distance_threshold_meters']?.toString() ?? '',
        ) ??
        500;
    final minRating =
        double.tryParse(nearby['min_rating']?.toString() ?? '') ?? 0;

    try {
      final raw = await LookivaApi.instance.get(
        '/discovery/nearby',
        query: {
          'lat': position.latitude,
          'lon': position.longitude,
          'radiusMeters': radius,
          'limit': 5,
          'offset': 0,
        },
      );
      final envelope = raw is Map
          ? Map<String, dynamic>.from(raw)
          : <String, dynamic>{};
      final items = (envelope['items'] as List? ?? const [])
          .whereType<Map>()
          .map((row) => Map<String, dynamic>.from(row))
          .where((row) {
        final rating =
            double.tryParse(row['avgRating']?.toString() ?? row['avg_rating']?.toString() ?? '') ??
                0;
        return rating >= minRating;
      }).toList();
      if (items.isEmpty) return;

      final item = items.first;
      final companyId =
          item['companyId']?.toString() ?? item['id']?.toString() ?? '';
      if (companyId.isEmpty) return;

      final lastKey = 'cust_nearby_company_' + companyId;
      final lastEpoch = prefs.getInt(lastKey);
      if (lastEpoch != null) {
        final last = DateTime.fromMillisecondsSinceEpoch(lastEpoch);
        if (now.difference(last) < const Duration(hours: 6)) return;
      }

      final name =
          item['companyName']?.toString() ?? item['display_name']?.toString() ?? 'Salon';
      final distance =
          double.tryParse(item['distanceMeters']?.toString() ?? '')?.round();
      final body = distance == null
          ? name + ' is near you and available to explore.'
          : name + ' is about ' + distance.toString() + ' m from you.';

      await _showLocalNotification(
        title: 'Salon near you',
        body: body,
        payload: '/businesses/' + companyId,
        id: companyId.hashCode,
      );
      await prefs.setInt(lastKey, now.millisecondsSinceEpoch);
      await prefs.setInt(dayKey, dailyCount + 1);
    } catch (_) {}
  }

  bool _insideQuietHours(
    DateTime now,
    Map<String, dynamic> nearby,
  ) {
    final start = _minutes(nearby['quiet_hours_start']?.toString());
    final end = _minutes(nearby['quiet_hours_end']?.toString());
    if (start == null || end == null || start == end) return false;
    final current = now.hour * 60 + now.minute;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
  }

  int? _minutes(String? value) {
    if (value == null || value.isEmpty) return null;
    final parts = value.split(':');
    if (parts.length < 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    return hour * 60 + minute;
  }

  Future<void> _showLocalNotification({
    required String title,
    required String body,
    required int id,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'lookiva_customer',
      'LOOKIVA alerts',
      channelDescription:
          'Booking, message, account and nearby salon notifications',
      importance: Importance.high,
      priority: Priority.high,
    );
    const darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    await _notifications.show(
      id & 0x7fffffff,
      title,
      body,
      const NotificationDetails(
        android: androidDetails,
        iOS: darwinDetails,
      ),
      payload: payload,
    );
  }
}
