import 'package:flutter/material.dart';
import 'lookiva_api.dart';
import 'l10n.dart';

class DiscoveryHome extends StatefulWidget {
  const DiscoveryHome({super.key});
  @override
  State<DiscoveryHome> createState() => _DiscoveryHomeState();
}

class _DiscoveryHomeState extends State<DiscoveryHome> {
  late Future<dynamic> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = LookivaApi.instance.get('/discovery/home', query: {'limit': 12});
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<dynamic>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return ListView(
            padding: const EdgeInsets.all(20),
            children: const [
              SizedBox(height: 16),
              LinearProgressIndicator(),
              SizedBox(height: 22),
              _HomeSkeleton(),
              _HomeSkeleton(),
              _HomeSkeleton(),
            ],
          );
        }

        if (snapshot.hasError) {
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 120),
              Icon(Icons.cloud_off_rounded, size: 56, color: Theme.of(context).colorScheme.error),
              const SizedBox(height: 16),
              Text(
                ct(context, 'discoveryUnavailable'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
              ),
              const SizedBox(height: 8),
              Text(LookivaApi.instance.friendlyError(snapshot.error!), textAlign: TextAlign.center),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: () => setState(_reload),
                icon: const Icon(Icons.refresh_rounded),
                label: Text(ct(context, 'retry')),
              ),
            ],
          );
        }

        final raw = snapshot.data;
        final envelope = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
        final sectionRaw = envelope['sections'];
        final sections = sectionRaw is List
            ? sectionRaw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
            : <Map<String, dynamic>>[];

        return RefreshIndicator(
          onRefresh: () async {
            setState(_reload);
            await _future;
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              TextField(
                readOnly: true,
                onTap: () {},
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search_rounded),
                  hintText: ct(context, 'searchHint'),
                ),
              ),
              const SizedBox(height: 20),
              if (sections.isEmpty) ...[
                const SizedBox(height: 80),
                const Icon(Icons.travel_explore_rounded, size: 52),
                const SizedBox(height: 12),
                Text(
                  ct(context, 'noDiscovery'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ] else
                ...sections
                    .where((s) => s['items'] is List && (s['items'] as List).isNotEmpty)
                    .map((section) => _Section(section: section)),
            ],
          ),
        );
      },
    );
  }
}

class _Section extends StatelessWidget {
  final Map<String, dynamic> section;
  const _Section({required this.section});

  @override
  Widget build(BuildContext context) {
    final items = (section['items'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            section['title']?.toString() ?? ct(context, 'discover'),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 142,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, index) {
                final item = items[index];
                return SizedBox(
                  width: 180,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: .15),
                            foregroundColor: Theme.of(context).colorScheme.primary,
                            child: const Icon(Icons.content_cut_rounded),
                          ),
                          const Spacer(),
                          Text(
                            item['companyName']?.toString() ?? item['name']?.toString() ?? 'LOOKIVA',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            _meta(context, item),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _meta(BuildContext context, Map<String, dynamic> item) {
    final parts = <String>[];
    if (item['avgRating'] != null) parts.add('★ ${item['avgRating']}');
    if (item['distanceMeters'] != null) {
      final meters = num.tryParse(item['distanceMeters'].toString());
      if (meters != null) {
        parts.add(meters < 1000 ? '${meters.round()} m' : '${(meters / 1000).toStringAsFixed(1)} km');
      }
    }
    if (item['tagline'] != null && item['tagline'].toString().isNotEmpty) {
      parts.add(item['tagline'].toString());
    }
    return parts.isEmpty ? ct(context, 'viewDetails') : parts.join(' • ');
  }
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Container(
          height: 120,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      );
}
