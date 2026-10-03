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
  bool _working = false;
  bool _following = false;
  String? _actionMessage;

  @override
  void initState() {
    super.initState();
    _reload();
    if (widget.type == 'business') {
      _loadFollowing();
    }
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

  Future<bool> _requireAuth(String nextPath) async {
    if (await LookivaApi.instance.hasSession()) return true;
    if (!mounted) return false;
    context.push('/login?next=${Uri.encodeComponent(nextPath)}');
    return false;
  }

  Future<void> _loadFollowing() async {
    if (!await LookivaApi.instance.hasSession()) return;
    try {
      final raw = await LookivaApi.instance.get('/customer/following', query: {
        'targetType': 'business',
        'limit': 100,
      });
      final rows = (raw as List? ?? const []).whereType<Map>();
      final followed = rows.any((row) => row['target_id']?.toString() == widget.id);
      if (mounted) setState(() => _following = followed);
    } catch (_) {}
  }

  Future<void> _toggleFollow() async {
    if (!await _requireAuth('/entity/business/${widget.id}')) return;
    setState(() { _working = true; _actionMessage = null; });
    try {
      if (_following) {
        await LookivaApi.instance.delete('/customer/following/target/business/${widget.id}');
      } else {
        await LookivaApi.instance.post('/customer/following', data: {
          'targetType': 'business',
          'targetId': widget.id,
          'companyId': widget.id,
        });
      }
      if (mounted) setState(() => _following = !_following);
    } catch (error) {
      if (mounted) setState(() => _actionMessage = LookivaApi.instance.friendlyError(error));
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _messageBusiness() async {
    if (!await _requireAuth('/entity/business/${widget.id}')) return;
    setState(() { _working = true; _actionMessage = null; });
    try {
      final raw = await LookivaApi.instance.post('/customer-ops/conversations', data: {'companyId': widget.id});
      final map = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
      final id = map['id']?.toString();
      if (id == null || id.isEmpty) throw StateError('Conversation was not created');
      if (mounted) context.push('/messages/$id');
    } catch (error) {
      if (mounted) setState(() => _actionMessage = LookivaApi.instance.friendlyError(error));
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _bookService(String serviceId) async {
    final next = '/book/$serviceId';
    if (!await _requireAuth(next)) return;
    if (mounted) context.push(next);
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
                if (_actionMessage != null) ...[
                  Card(
                    color: Theme.of(context).colorScheme.errorContainer,
                    child: Padding(padding: const EdgeInsets.all(12), child: Text(_actionMessage!)),
                  ),
                  const SizedBox(height: 10),
                ],
                if (widget.type == 'service')
                  ElevatedButton.icon(
                    onPressed: _working ? null : () => _bookService(widget.id),
                    icon: const Icon(Icons.calendar_month_rounded),
                    label: Text(ct(context,'bookThisService')),
                  ),
                if (widget.type == 'business') ...[
                  Row(children: [
                    Expanded(child: ElevatedButton.icon(
                      onPressed: _working ? null : _toggleFollow,
                      icon: Icon(_following ? Icons.person_remove_alt_1_rounded : Icons.person_add_alt_1_rounded),
                      label: Text(_following ? 'Following' : 'Follow'),
                    )),
                    const SizedBox(width: 10),
                    Expanded(child: OutlinedButton.icon(
                      onPressed: _working ? null : _messageBusiness,
                      icon: const Icon(Icons.chat_bubble_outline_rounded),
                      label: const Text('Message'),
                    )),
                  ]),
                  _ListSection(
                    title: ct(context,'services'),
                    values: data['services'],
                    onTap: (item) {
                      final id = item['id']?.toString();
                      if (id != null && id.isNotEmpty) context.push('/entity/service/$id');
                    },
                  ),
                  _ListSection(
                    title: ct(context,'professionals'),
                    values: data['professionals'],
                    onTap: (item) {
                      final id = item['id']?.toString();
                      if (id != null && id.isNotEmpty) context.push('/entity/professional/$id');
                    },
                  ),
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
                  _ListSection(
                    title: ct(context,'professionals'),
                    values: data['professionals'],
                    onTap: (item) {
                      final id = item['id']?.toString();
                      if (id != null && id.isNotEmpty) context.push('/entity/professional/$id');
                    },
                  ),
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
    if (data['followers_count'] != null) lines.add('${data['followers_count']} followers');
    if (data['distance_meters'] != null) {
      final meters = num.tryParse(data['distance_meters'].toString());
      if (meters != null) {
        lines.add(meters < 1000 ? '${meters.round()} m' : '${(meters / 1000).toStringAsFixed(1)} km');
      }
    }
    final company = data['company'];
    if (company is Map && company['display_name'] != null) lines.add(company['display_name'].toString());
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: .14),
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
            if (item['address_line_1'] != null) item['address_line_1'].toString(),
            if (branch?['address_line_1'] != null) branch!['address_line_1'].toString(),
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
