import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LookivaApi {
  LookivaApi._() {
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
              final refreshed = await _refresh();
              if (refreshed) {
                options.extra['lookivaRetried'] = true;
                final token = await _storage.read(key: _accessKey);
                options.headers['Authorization'] = 'Bearer $token';
                final response = await _dio.fetch<dynamic>(options);
                handler.resolve(response);
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

  static final LookivaApi instance = LookivaApi._();
  static const _storage = FlutterSecureStorage();
  static const _accessKey = 'lookiva_customer_access';
  static const _refreshKey = 'lookiva_customer_refresh';
  static const _responseCacheKey = 'lookiva_customer_response_cache_v1';
  static const _prefApiUrl = 'cust_api_base_url';

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
      final body = error.response?.data;
      final unwrapped = _unwrap(body);
      if (unwrapped is Map && unwrapped['message'] != null) {
        return unwrapped['message'].toString();
      }
      if (body is Map && body['message'] != null) {
        return body['message'].toString();
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'Unable to reach LOOKIVA. Check your connection and server URL.';
      }
      return 'Request failed (${error.response?.statusCode ?? 'network'}).';
    }
    return error.toString();
  }

  Future<Map<String, dynamic>> login(
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
        'deviceName': 'LOOKIVA Customer Flutter',
      },
      options: Options(extra: {'lookivaRetried': true}),
    );
    final data = Map<String, dynamic>.from(_unwrap(response.data) as Map);
    final access = data['accessToken']?.toString();
    final refresh = data['refreshToken']?.toString();
    if (access == null || refresh == null) {
      throw StateError('Authentication tokens were not returned');
    }
    await _storage.delete(key: _responseCacheKey);
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
    try {
      return await me();
    } catch (_) {
      await clearSession();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> me() async {
    final response = await _dio.get<dynamic>('/auth/me');
    final data = _unwrap(response.data);
    final map = Map<String, dynamic>.from(data as Map);
    final user = map['user'] ?? map;
    return Map<String, dynamic>.from(user as Map);
  }

  Future<bool> restoreSession() async {
    final access = await _storage.read(key: _accessKey);
    final refresh = await _storage.read(key: _refreshKey);
    if ((access == null || access.isEmpty) &&
        (refresh == null || refresh.isEmpty)) {
      return false;
    }
    try {
      await me();
      return true;
    } catch (error) {
      if (_isOffline(error) && access != null && access.isNotEmpty) return true;
      try {
        if (await _refresh()) {
          await me();
          return true;
        }
      } catch (refreshError) {
        if (_isOffline(refreshError) && access != null && access.isNotEmpty) {
          return true;
        }
      }
      await clearSession();
      return false;
    }
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final fingerprint = _cacheFingerprint(path, query);
    try {
      final response = await _dio.get<dynamic>(path, queryParameters: query);
      final data = _unwrap(response.data);
      await _writeCachedResponse(fingerprint, data);
      return data;
    } catch (error) {
      if (_isOffline(error)) {
        final cached = await _readCachedResponse(fingerprint);
        if (cached != null) return cached;
      }
      rethrow;
    }
  }

  String _cacheFingerprint(String path, Map<String, dynamic>? query) {
    if (query == null || query.isEmpty) return path;
    final keys = query.keys.toList()..sort();
    final normalized = <String, dynamic>{
      for (final key in keys) key: query[key],
    };
    return '$path?${jsonEncode(normalized)}';
  }

  Future<Map<String, dynamic>> _readResponseCache() async {
    final raw = await _storage.read(key: _responseCacheKey);
    if (raw == null || raw.isEmpty) return <String, dynamic>{};
    try {
      return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  Future<dynamic> _readCachedResponse(String fingerprint) async {
    final cache = await _readResponseCache();
    final entry = cache[fingerprint];
    if (entry is! Map || !entry.containsKey('data')) return null;
    return entry['data'];
  }

  Future<void> _writeCachedResponse(String fingerprint, dynamic data) async {
    try {
      final cache = await _readResponseCache();
      cache[fingerprint] = {
        'at': DateTime.now().millisecondsSinceEpoch,
        'data': data,
      };

      if (cache.length > 30) {
        final entries = cache.entries.toList()
          ..sort((a, b) {
            final aAt = a.value is Map
                ? int.tryParse((a.value as Map)['at']?.toString() ?? '') ?? 0
                : 0;
            final bAt = b.value is Map
                ? int.tryParse((b.value as Map)['at']?.toString() ?? '') ?? 0
                : 0;
            return aAt.compareTo(bAt);
          });
        for (final entry in entries.take(cache.length - 30)) {
          cache.remove(entry.key);
        }
      }

      await _storage.write(key: _responseCacheKey, value: jsonEncode(cache));
    } catch (_) {
      // Offline cache is best-effort and must never break a successful request.
    }
  }

  Future<dynamic> uploadMedia({
    required String filePath,
    required String fileName,
    required String mimeType,
    bool isPublic = false,
  }) async {
    final contentType = MediaType.parse(mimeType);
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: fileName,
        contentType: contentType,
      ),
    });
    final response = await _dio.post<dynamic>(
      '/media/upload',
      queryParameters: {'isPublic': isPublic},
      data: form,
      options: Options(contentType: 'multipart/form-data'),
    );
    return _unwrap(response.data);
  }

  Future<dynamic> post(String path, {Object? data}) async {
    final response = await _dio.post<dynamic>(path, data: data);
    return _unwrap(response.data);
  }

  Future<dynamic> patch(String path, {Object? data}) async {
    final response = await _dio.patch<dynamic>(path, data: data);
    return _unwrap(response.data);
  }

  Future<dynamic> put(String path, {Object? data}) async {
    final response = await _dio.put<dynamic>(path, data: data);
    return _unwrap(response.data);
  }

  Future<dynamic> delete(String path, {Object? data}) async {
    final response = await _dio.delete<dynamic>(path, data: data);
    return _unwrap(response.data);
  }

  Future<String?> accessToken() => _storage.read(key: _accessKey);

  Future<String> realtimeBaseUrl() async {
    final apiBase = _dio.options.baseUrl.isNotEmpty
        ? _dio.options.baseUrl
        : await _resolveBaseUrl();
    var base = apiBase;
    if (base.endsWith('/api/v1')) {
      base = base.substring(0, base.length - '/api/v1'.length);
    }
    while (base.endsWith('/')) {
      base = base.substring(0, base.length - 1);
    }
    return base;
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
    await _storage.delete(key: _responseCacheKey);
  }

  bool _isOffline(Object error) {
    return error is DioException &&
        error.response == null &&
        (error.type == DioExceptionType.connectionError ||
            error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            error.type == DioExceptionType.sendTimeout);
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
        'deviceName': 'LOOKIVA Customer Flutter',
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
