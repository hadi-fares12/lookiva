import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'location_service.dart';
import 'lookiva_api.dart';
import 'l10n.dart';

class CustomerNearbyMap extends StatefulWidget {
  const CustomerNearbyMap({super.key});

  @override
  State<CustomerNearbyMap> createState() => _CustomerNearbyMapState();
}

class _CustomerNearbyMapState extends State<CustomerNearbyMap> {
  final MapController _controller = MapController();
  LatLng? _current;
  List<Map<String, dynamic>> _businesses = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final position = await LookivaLocationService.currentPosition();
      if (position == null) {
        throw StateError('Location permission is required to show businesses near you.');
      }
      final center = LatLng(position.latitude, position.longitude);
      final raw = await LookivaApi.instance.get('/discovery/nearby', query: {
        'lat': position.latitude,
        'lon': position.longitude,
        'radiusMeters': 10000,
        'limit': 100,
        'sort': 'nearest',
      });
      final envelope = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
      final rows = (envelope['items'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      if (!mounted) return;
      setState(() { _current = center; _businesses = rows; });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _controller.move(center, 14);
      });
    } catch (e) {
      if (mounted) setState(() => _error = LookivaApi.instance.friendlyError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_current == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.location_off_rounded, size: 56),
            const SizedBox(height: 12),
            Text(_error ?? 'Location unavailable', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(onPressed: _load, icon: const Icon(Icons.my_location_rounded), label: Text(ct(context,'retry'))),
          ]),
        ),
      );
    }

    final markers = <Marker>[
      Marker(
        point: _current!,
        width: 44,
        height: 44,
        child: const Icon(Icons.my_location_rounded, color: Colors.blue, size: 34),
      ),
      ..._businesses.where((b) => b['latitude'] != null && b['longitude'] != null).map((b) {
        final lat = double.tryParse(b['latitude'].toString());
        final lon = double.tryParse(b['longitude'].toString());
        if (lat == null || lon == null) return null;
        final id = b['id']?.toString() ?? '';
        return Marker(
          point: LatLng(lat, lon),
          width: 48,
          height: 48,
          child: GestureDetector(
            onTap: id.isEmpty ? null : () => context.push('/entity/business/$id'),
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                shape: BoxShape.circle,
                border: Border.all(color: Theme.of(context).colorScheme.primary, width: 2),
                boxShadow: const [BoxShadow(blurRadius: 8, color: Colors.black26)],
              ),
              child: Icon(Icons.content_cut_rounded, color: Theme.of(context).colorScheme.primary),
            ),
          ),
        );
      }).whereType<Marker>(),
    ];

    return Stack(
      children: [
        FlutterMap(
          mapController: _controller,
          options: MapOptions(initialCenter: _current!, initialZoom: 14),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.lookiva.customer',
            ),
            MarkerLayer(markers: markers),
            const RichAttributionWidget(
              attributions: [TextSourceAttribution('OpenStreetMap contributors')],
            ),
          ],
        ),
        Positioned(
          right: 16,
          bottom: 24,
          child: FloatingActionButton.small(
            heroTag: 'customer-map-location',
            onPressed: _load,
            child: const Icon(Icons.my_location_rounded),
          ),
        ),
      ],
    );
  }
}
