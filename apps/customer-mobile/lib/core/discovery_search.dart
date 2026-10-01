import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'lookiva_api.dart';
import 'l10n.dart';

class CustomerDiscoverySearch extends StatefulWidget {
  final bool availableNow;
  const CustomerDiscoverySearch({super.key, this.availableNow = false});

  @override
  State<CustomerDiscoverySearch> createState() => _CustomerDiscoverySearchState();
}

class _CustomerDiscoverySearchState extends State<CustomerDiscoverySearch> {
  final _controller = TextEditingController();
  Future<dynamic>? _future;
  bool _verifiedOnly = false;
  bool _offersOnly = false;
  bool _openNow = false;

  @override
  void initState() {
    super.initState();
    _search();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _search() {
    final q = _controller.text.trim();
    final query = <String, dynamic>{
      'limit': 30,
      if (q.length >= 2) 'q': q,
      if (widget.availableNow) 'availableNow': true,
      if (_verifiedOnly) 'verified': true,
      if (_offersOnly) 'promotion': true,
      if (_openNow) 'openNow': true,
    };
    setState(() {
      _future = LookivaApi.instance.get('/discovery/search', query: query);
    });
  }

  @override
  Widget build(BuildContext context) {
    final future = _future;
    return RefreshIndicator(
      onRefresh: () async {
        _search();
        if (_future != null) await _future;
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _controller,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => _search(),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search_rounded),
              hintText: ct(context,'searchHint'),
              suffixIcon: IconButton(
                tooltip: ct(context,'discover'),
                icon: const Icon(Icons.arrow_forward_rounded),
                onPressed: _search,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilterChip(
                label: Text(ct(context,'openNow')),
                selected: _openNow,
                onSelected: (v) { setState(() => _openNow = v); _search(); },
              ),
              FilterChip(
                label: Text(ct(context,'verified')),
                selected: _verifiedOnly,
                onSelected: (v) { setState(() => _verifiedOnly = v); _search(); },
              ),
              FilterChip(
                label: Text(ct(context,'offers')),
                selected: _offersOnly,
                onSelected: (v) { setState(() => _offersOnly = v); _search(); },
              ),
              if (widget.availableNow)
                Chip(avatar: const Icon(Icons.bolt_rounded, size: 18), label: Text(ct(context,'availableNow'))),
            ],
          ),
          const SizedBox(height: 16),
          if (future == null)
            const _EmptySearch()
          else
            FutureBuilder<dynamic>(
              future: future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const _SearchLoading();
                }
                if (snapshot.hasError) {
                  return _SearchError(
                    message: LookivaApi.instance.friendlyError(snapshot.error!),
                    onRetry: _search,
                  );
                }
                final raw = snapshot.data;
                final payload = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
                final results = (payload['items'] as List? ?? const [])
                    .whereType<Map>()
                    .map((e) => Map<String, dynamic>.from(e))
                    .toList();
                if (results.isEmpty) return const _EmptySearch();
                return Column(
                  children: results.map((item) => _ResultCard(item: item)).toList(),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final Map<String, dynamic> item;
  const _ResultCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final name = item['companyName']?.toString() ?? item['name']?.toString() ?? ct(context,'professional');
    final subtitle = <String>[
      if (item['tagline'] != null) item['tagline'].toString(),
      if (item['avgRating'] != null) '★ ${item['avgRating']}',
      if (item['reviewCount'] != null) '${item['reviewCount']} reviews',
      if (item['distanceMeters'] != null) _distance(item['distanceMeters']),
      if (item['minPrice'] != null) 'From ${item['currencyCode'] ?? ''} ${item['minPrice']}',
    ].where((e) => e.trim().isNotEmpty).join(' • ');
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(.14),
          foregroundColor: Theme.of(context).colorScheme.primary,
          child: Icon(_icon(item['entityType']?.toString())),
        ),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: subtitle.isEmpty ? null : Text(subtitle, maxLines: 3, overflow: TextOverflow.ellipsis),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: () {
          final id = item['id']?.toString();
          final type = item['entityType']?.toString();
          if (id == null || id.isEmpty || type == null || !{'business', 'professional', 'service'}.contains(type)) return;
          context.push('/entity/$type/$id');
        },
      ),
    );
  }

  String _distance(dynamic value) {
    final meters = double.tryParse(value.toString());
    if (meters == null) return value.toString();
    if (meters < 1000) return '${meters.round()} m';
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  IconData _icon(String? type) {
    return switch (type) {
      'professional' => Icons.person_rounded,
      'service' => Icons.design_services_rounded,
      'category' => Icons.category_rounded,
      _ => Icons.storefront_rounded,
    };
  }
}

class _SearchLoading extends StatelessWidget {
  const _SearchLoading();
  @override
  Widget build(BuildContext context) => Column(
        children: List.generate(
          6,
          (_) => Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: const Padding(padding: EdgeInsets.all(24), child: LinearProgressIndicator()),
          ),
        ),
      );
}

class _EmptySearch extends StatelessWidget {
  const _EmptySearch();
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 80),
        child: Column(
          children: [
            const Icon(Icons.travel_explore_rounded, size: 52),
            const SizedBox(height: 12),
            Text(ct(context,'noProviders'), style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(ct(context,'tryFilters')),
          ],
        ),
      );
}

class _SearchError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _SearchError({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 70),
        child: Column(
          children: [
            Icon(Icons.cloud_off_rounded, size: 52, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: Text(ct(context,'retry'))),
          ],
        ),
      );
}
