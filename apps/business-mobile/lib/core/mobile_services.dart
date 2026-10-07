import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

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

class BusinessMobileServices {
  BusinessMobileServices._();
  static final BusinessMobileServices instance = BusinessMobileServices._();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  StreamSubscription<String>? _tokenSubscription;
  StreamSubscription<RemoteMessage>? _messageSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  bool _initialized = false;
  String? _registeredToken;
  void Function(String path)? _openDeepLink;

  Future<void> initialize({
    required void Function(String path) openDeepLink,
  }) async {
    _openDeepLink = openDeepLink;
    if (_initialized) {
      return;
    }
    _initialized = true;

    try { await _initializeLocalNotifications(); } catch (_) {}
    await _initializePush();
  }

  Future<void> onSignedIn() async {
    await _registerCurrentPushToken();
  }

  Future<void> onSignedOut() async {
    LookivaBusinessRealtime.instance.disconnect();
    final token = _registeredToken;
    _registeredToken = null;
    if (token != null) {
      try { await LookivaBusinessApi.instance.deleteScoped('/notifications/devices', data: {'token': token}); } catch (_) {}
    }
    if (lookivaFirebaseConfigured && Firebase.apps.isNotEmpty) {
      try { await FirebaseMessaging.instance.deleteToken(); } catch (_) {}
    }
  }

  Future<void> dispose() async {
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
    final access = await LookivaBusinessApi.instance.accessToken();
    if (access == null || access.isEmpty) return;
    try {
      await LookivaBusinessApi.instance.postScoped(
        '/notifications/devices',
        data: {
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
          'appType': 'business',
          'deviceName': Platform.isIOS ? 'LOOKIVA Business iOS' : 'LOOKIVA Business Android',
        },
      );
      _registeredToken = token;
    } catch (_) {}
  }

  Future<void> _showLocalNotification({
    required String title,
    required String body,
    required int id,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'lookiva_business',
      'LOOKIVA business alerts',
      channelDescription:
          'Booking, message and business notifications',
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
