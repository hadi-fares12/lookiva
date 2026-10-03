import 'package:geolocator/geolocator.dart';

class DeviceLocation {
  const DeviceLocation._();

  static Future<Position> current() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw StateError('location_services_disabled');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw StateError('location_permission_denied');
    }
    if (permission == LocationPermission.deniedForever) {
      throw StateError('location_permission_denied_forever');
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
  }

  static String messageKey(Object error) {
    final text = error.toString();
    if (text.contains('location_services_disabled')) {
      return 'locationServicesDisabled';
    }
    if (text.contains('location_permission_denied_forever')) {
      return 'locationPermissionForever';
    }
    if (text.contains('location_permission_denied')) {
      return 'locationPermissionDenied';
    }
    return 'locationUnavailable';
  }
}
