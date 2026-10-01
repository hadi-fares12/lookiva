import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BusinessSession {
  final Map<String, dynamic> user;
  final String companyId;
  final String? branchId;
  const BusinessSession({
    required this.user,
    required this.companyId,
    this.branchId,
  });
}

class LookivaBusinessApi {
  LookivaBusinessApi._() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: _accessKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final options = error.requestOptions;
          if (error.response?.statusCode == 401 &&
              options.extra['lookivaRetried'] != true) {
            try {
              if (await _refresh()) {
                options.extra['lookivaRetried'] = true;
                options.headers['Authorization'] =
                    'Bearer ${await _storage.read(key: _accessKey)}';
                handler.resolve(await _dio.fetch<dynamic>(options));
                return;
              }
            } catch (_) {
              await clearSession();
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  static final LookivaBusinessApi instance = LookivaBusinessApi._();
  static const _storage = FlutterSecureStorage();
  static const _accessKey = 'lookiva_business_access';
  static const _refreshKey = 'lookiva_business_refresh';
  static const _sessionKey = 'lookiva_business_scope';
  static const _prefApiUrl = 'biz_api_base_url';
  static const _allowedRoles = {
    'business_owner',
    'business_manager',
    'branch_manager',
    'professional',
    'staff',
    'super_admin',
    'platform_admin',
    'country_manager',
  };

  static String? _cachedBaseUrl;

  static Future<void> setApiBaseUrl(String url) async {
    const isRelease = bool.fromEnvironment('dart.vm.product');
    if (isRelease) {
      throw StateError('API URL overrides are disabled in release builds');
    }
    final prefs = await SharedPreferences.getInstance();
    final cleaned = url.replaceAll(RegExp(r'/$'), '');
    await prefs.setString(_prefApiUrl, cleaned);
    _cachedBaseUrl = cleaned;
    instance._dio.options.baseUrl = cleaned;
  }

  static Future<String?> getStoredApiBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefApiUrl);
  }

  static Future<void> clearStoredApiBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefApiUrl);
    _cachedBaseUrl = null;
  }

  static Future<String> _resolveBaseUrl() async {
    const configured = String.fromEnvironment('LOOKIVA_API_URL');
    const isRelease = bool.fromEnvironment('dart.vm.product');

    if (isRelease) {
      if (configured.isEmpty) {
        throw StateError(
          'LOOKIVA_API_URL must be supplied for production builds using --dart-define.',
        );
      }
      final clean = configured.replaceAll(RegExp(r'/$'), '');
      _cachedBaseUrl = clean;
      return clean;
    }

    if (_cachedBaseUrl != null && _cachedBaseUrl!.isNotEmpty) {
      return _cachedBaseUrl!;
    }
    final stored = await getStoredApiBaseUrl();
    if (stored != null && stored.isNotEmpty) {
      _cachedBaseUrl = stored;
      return stored;
    }
    if (configured.isNotEmpty) {
      final clean = configured.replaceAll(RegExp(r'/$'), '');
      _cachedBaseUrl = clean;
      return clean;
    }

    final fallback = Platform.isAndroid
        ? 'http://10.0.2.2:4000/api/v1'
        : 'http://localhost:4000/api/v1';
    _cachedBaseUrl = fallback;
    return fallback;
  }

  static Future<void> initializeBaseUrl() async {
    final resolved = await _resolveBaseUrl();
    instance._dio.options.baseUrl = resolved;
  }

  late final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: const {'Content-Type': 'application/json'},
    ),
  );

  dynamic _unwrap(dynamic body) {
    if (body is Map<String, dynamic> &&
        body.length == 1 &&
        body.containsKey('data')) {
      return body['data'];
    }
    return body;
  }

  String friendlyError(Object error) {
    if (error is DioException) {
      final body = _unwrap(error.response?.data);
      if (body is Map && body['message'] != null) {
        return body['message'].toString();
      }
      return 'Request failed (${error.response?.statusCode ?? 'network'}).';
    }
    return error.toString();
  }

  Future<BusinessSession> login(
    String identifier,
    String password, {
    bool rememberMe = true,
  }) async {
    final response = await _dio.post<dynamic>(
      '/auth/login',
      data: {
        'identifier': identifier.trim(),
        'password': password,
        'rememberMe': rememberMe,
        'deviceName': 'LOOKIVA Business Flutter',
      },
      options: Options(extra: {'lookivaRetried': true}),
    );
    final data = Map<String, dynamic>.from(_unwrap(response.data) as Map);
    final access = data['accessToken']?.toString();
    final refresh = data['refreshToken']?.toString();
    if (access == null || refresh == null) {
      throw StateError('Authentication tokens were not returned');
    }
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
    try {
      final user = await me();
      final session = _businessScope(user);
      await _storage.write(
        key: _sessionKey,
        value: jsonEncode({
          'user': user,
          'companyId': session.companyId,
          'branchId': session.branchId,
        }),
      );
      return session;
    } catch (_) {
      await clearSession();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> me() async {
    final response = await _dio.get<dynamic>('/auth/me');
    final data = Map<String, dynamic>.from(_unwrap(response.data) as Map);
    return Map<String, dynamic>.from((data['user'] ?? data) as Map);
  }

  BusinessSession _businessScope(Map<String, dynamic> user) {
    final scopes = (user['roleScopes'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final accepted = scopes
        .where((s) => _allowedRoles.contains(s['roleKey']?.toString()))
        .toList();
    if (accepted.isEmpty) {
      throw StateError('This account does not have business dashboard access');
    }
    Map<String, dynamic>? business;
    for (final scope in accepted) {
      if (scope['companyId'] != null) {
        business = scope;
        break;
      }
    }
    if (business == null) {
      throw StateError(
        'Select a company in the web dashboard before using a platform-level account on mobile',
      );
    }
    return BusinessSession(
      user: user,
      companyId: business['companyId'].toString(),
      branchId: business['branchId']?.toString(),
    );
  }

  Future<BusinessSession?> restoreSession() async {
    final access = await _storage.read(key: _accessKey);
    final refresh = await _storage.read(key: _refreshKey);
    if ((access == null || access.isEmpty) &&
        (refresh == null || refresh.isEmpty)) {
      return null;
    }
    try {
      final user = await me();
      final session = _businessScope(user);
      return session;
    } catch (error) {
      if (_isOffline(error)) {
        final cached = await _cachedSession();
        if (cached != null) return cached;
      }
      try {
        if (await _refresh()) return _businessScope(await me());
      } catch (refreshError) {
        if (_isOffline(refreshError)) {
          final cached = await _cachedSession();
          if (cached != null) return cached;
        }
      }
      await clearSession();
      return null;
    }
  }

  Future<BusinessSession?> _cachedSession() async {
    final raw = await _storage.read(key: _sessionKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final value = Map<String, dynamic>.from(jsonDecode(raw) as Map);
      return BusinessSession(
        user: Map<String, dynamic>.from(value['user'] as Map),
        companyId: value['companyId'].toString(),
        branchId: value['branchId']?.toString(),
      );
    } catch (_) {
      return null;
    }
  }

  bool _isOffline(Object error) {
    return error is DioException &&
        error.response == null &&
        (error.type == DioExceptionType.connectionError ||
            error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            error.type == DioExceptionType.sendTimeout);
  }

  Future<dynamic> getForCompany(
    String suffix, {
    Map<String, dynamic>? query,
  }) async {
    return getScoped('/business-ops/{companyId}/$suffix', query: query);
  }

  Future<dynamic> getScoped(
    String pathTemplate, {
    Map<String, dynamic>? query,
  }) async {
    final session = await restoreSession();
    if (session == null) throw StateError('Session expired');
    var path = pathTemplate.replaceAll('{companyId}', session.companyId);
    if (path.contains('{branchId}')) {
      final branchId = session.branchId;
      if (branchId == null || branchId.isEmpty) {
        throw StateError('Select or assign a branch before using this section');
      }
      path = path.replaceAll('{branchId}', branchId);
    }
    final response = await _dio.get<dynamic>(path, queryParameters: query);
    return _unwrap(response.data);
  }

  Future<void> logout() async {
    try {
      await _dio.post<dynamic>('/auth/logout');
    } catch (_) {}
    await clearSession();
  }

  Future<void> clearSession() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _sessionKey);
  }

  Future<bool> _refresh() async {
    final refreshToken = await _storage.read(key: _refreshKey);
    if (refreshToken == null || refreshToken.isEmpty) return false;
    final currentBase = _cachedBaseUrl ?? await _resolveBaseUrl();
    final plain = Dio(
      BaseOptions(
        baseUrl: currentBase,
        headers: const {'Content-Type': 'application/json'},
      ),
    );
    final response = await plain.post<dynamic>(
      '/auth/refresh',
      data: {
        'refreshToken': refreshToken,
        'deviceName': 'LOOKIVA Business Flutter',
      },
    );
    final data = Map<String, dynamic>.from(_unwrap(response.data) as Map);
    final access = data['accessToken']?.toString();
    final refresh = data['refreshToken']?.toString();
    if (access == null || refresh == null) return false;
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
    return true;
  }
}
