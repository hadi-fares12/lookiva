import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'lookiva_api.dart';
import 'l10n.dart';

class CustomerEntityDetailPage extends StatefulWidget {
  final String type;
  final String id;
  const CustomerEntityDetailPage({super.key, required this.type, required this.id});

  @override
  State<CustomerEntityDetailPage> createState() => _CustomerEntityDetailPageState();
}

class _CustomerEntityDetailPageState extends State<CustomerEntityDetailPage> {
  late Future<dynamic> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final endpoint = switch (widget.type) {
      'business' => '/businesses/${widget.id}',
      'professional' => '/professionals/${widget.id}',
      'service' => '/services/${widget.id}',
      _ => '/services/${widget.id}',
    };
    _future = LookivaApi.instance.get(endpoint);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_title(context,widget.type))),
      body: FutureBuilder<dynamic>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _Failure(message: LookivaApi.instance.friendlyError(snapshot.error!), onRetry: () => setState(_reload));
          }
          if (snapshot.data is! Map) {
            return _Failure(message: ct(context,'itemUnavailable'), onRetry: () => setState(_reload));
          }
          final data = Map<String, dynamic>.from(snapshot.data as Map);
          return RefreshIndicator(
            onRefresh: () async { setState(_reload); await _future; },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(18),
              children: [
                _Hero(data: data, type: widget.type),
                const SizedBox(height: 16),
                if (widget.type == 'service')
                  ElevatedButton.icon(
                    onPressed: () => context.push('/book/${widget.id}'),
                    icon: const Icon(Icons.calendar_month_rounded),
                    label: Text(ct(context,'bookThisService')),
                  ),
                if (widget.type == 'business') ...[
                  _ListSection(title: ct(context,'services'), values: data['services']),
                  _ListSection(title: ct(context,'professionals'), values: data['professionals']),
                  _ListSection(title: ct(context,'branch'), values: data['branches']),
                ],
                if (widget.type == 'professional')
                  _ListSection(
                    title: ct(context,'services'),
                    values: data['services'],
                    onTap: (item) {
                      final id = item['id']?.toString();
                      if (id != null && id.isNotEmpty) context.push('/entity/service/$id');
                    },
                  ),
                if (widget.type == 'service') ...[
                  _ListSection(title: ct(context,'professionals'), values: data['professionals']),
                  _ListSection(title: ct(context,'relatedLooks'), values: data['related_looks']),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  String _title(BuildContext context,String type) => switch (type) { 'business' => ct(context,'salon'), 'professional' => ct(context,'professional'), 'service' => ct(context,'service'), _ => ct(context,'details') };
}

class _Hero extends StatelessWidget {
  final Map<String, dynamic> data;
  final String type;
  const _Hero({required this.data, required this.type});

  @override
  Widget build(BuildContext context) {
    final name = _first(data, ['display_name', 'name']) ?? 'LOOKIVA';
    final lines = <String>[];
    if (data['description_short'] != null) lines.add(data['description_short'].toString());
    if (data['bio'] != null) lines.add(data['bio'].toString());
    if (data['duration_minutes'] != null) lines.add('${data['duration_minutes']} min');
    if (data['base_price'] != null) lines.add('${data['base_price']} ${data['currency_code'] ?? ''}'.trim());
    if (data['aggregate_reviews'] is Map) {
      final r = Map<String, dynamic>.from(data['aggregate_reviews'] as Map);
      if (r['avg_rating'] != null) lines.add('★ ${r['avg_rating']} (${r['count'] ?? 0})');
    }
    final company = data['company'];
    if (company is Map && company['display_name'] != null) lines.add(company['display_name'].toString());
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(.14),
            foregroundColor: Theme.of(context).colorScheme.primary,
            child: Icon(type == 'professional' ? Icons.person_rounded : type == 'service' ? Icons.design_services_rounded : Icons.storefront_rounded, size: 30),
          ),
          const SizedBox(height: 14),
          Text(name.toString(), style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
          if (lines.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(lines.join(' • '), style: Theme.of(context).textTheme.bodyMedium),
          ],
        ]),
      ),
    );
  }

  dynamic _first(Map<String, dynamic> map, List<String> keys) {
    for (final key in keys) {
      final value = map[key];
      if (value != null && value.toString().trim().isNotEmpty) return value;
    }
    return null;
  }
}

class _ListSection extends StatelessWidget {
  final String title;
  final dynamic values;
  final void Function(Map<String, dynamic> item)? onTap;
  const _ListSection({required this.title, required this.values, this.onTap});

  @override
  Widget build(BuildContext context) {
    final items = (values as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        const SizedBox(height: 8),
        ...items.take(20).map((item) {
          final branch = item['branch'] is Map ? Map<String, dynamic>.from(item['branch'] as Map) : null;
          final name = item['display_name'] ?? item['name'] ?? branch?['name'] ?? item['title'] ?? item['id'] ?? 'Item';
          final subtitle = <String>[
            if (item['base_price'] != null) '${item['base_price']} ${item['currency_code'] ?? ''}'.trim(),
            if (item['duration_minutes'] != null) '${item['duration_minutes']} min',
            if (branch?['address_line1'] != null) branch!['address_line1'].toString(),
          ].join(' • ');
          return Card(
            child: ListTile(
              title: Text(name.toString(), style: const TextStyle(fontWeight: FontWeight.w800)),
              subtitle: subtitle.isEmpty ? null : Text(subtitle),
              trailing: onTap == null ? null : const Icon(Icons.chevron_right_rounded),
              onTap: onTap == null ? null : () => onTap!(item),
            ),
          );
        }),
      ]),
    );
  }
}

class _Failure extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _Failure({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.error_outline_rounded, size: 52, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: Text(ct(context,'retry'))),
          ]),
        ),
      );
}
