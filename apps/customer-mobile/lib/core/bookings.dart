import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'lookiva_api.dart';
import 'l10n.dart';
import 'booking_payment.dart';

class CustomerBookingsList extends StatefulWidget {
  const CustomerBookingsList({super.key});
  @override
  State<CustomerBookingsList> createState() => _CustomerBookingsListState();
}

class _CustomerBookingsListState extends State<CustomerBookingsList> {
  late Future<dynamic> _future;
  String? _status;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = LookivaApi.instance.get(
      '/customer-ops/bookings',
      query: {if (_status != null) 'status': _status, 'limit': 100},
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _chip(ct(context, 'all'), null),
                _chip(ct(context, 'upcoming'), 'confirmed'),
                _chip(ct(context, 'completed'), 'completed'),
                _chip(ct(context, 'cancelled'), 'cancelled'),
              ],
            ),
          ),
        ),
        Expanded(
          child: FutureBuilder<dynamic>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _Error(
                  message: LookivaApi.instance.friendlyError(snapshot.error!),
                  onRetry: () => setState(_reload),
                );
              }

              final rows = (snapshot.data as List? ?? const [])
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList();
              if (rows.isEmpty) return Center(child: Text(ct(context, 'noBookings')));

              return RefreshIndicator(
                onRefresh: () async {
                  setState(_reload);
                  await _future;
                },
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: rows.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final b = rows[index];
                    final company = b['company'] is Map
                        ? Map<String, dynamic>.from(b['company'] as Map)
                        : <String, dynamic>{};
                    final services = (b['services'] as List? ?? const [])
                        .whereType<Map>()
                        .map((x) => Map<String, dynamic>.from(x))
                        .toList();
                    final serviceNames = services
                        .map((x) {
                          final svc = x['service'];
                          return svc is Map ? svc['name']?.toString() : null;
                        })
                        .whereType<String>()
                        .join(', ');
                    final id = b['id']?.toString();
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(child: Icon(_statusIcon(b['status']?.toString()))),
                        title: Text(
                          company['display_name']?.toString() ?? ct(context, 'booking'),
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                        subtitle: Text([
                          if (serviceNames.isNotEmpty) serviceNames,
                          if (b['starts_at'] != null) _date(b['starts_at'].toString()),
                          if (b['status'] != null) b['status'].toString(),
                        ].join(' • ')),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: id == null ? null : () => context.push('/bookings/$id'),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _chip(String label, String? value) => Padding(
        padding: const EdgeInsetsDirectional.only(end: 8),
        child: ChoiceChip(
          label: Text(label),
          selected: _status == value,
          onSelected: (_) {
            setState(() => _status = value);
            _reload();
          },
        ),
      );

  String _date(String raw) {
    final d = DateTime.tryParse(raw)?.toLocal();
    return d == null ? raw : '${d.day}/${d.month}/${d.year} ${TimeOfDay.fromDateTime(d).format(context)}';
  }

  IconData _statusIcon(String? status) => switch (status) {
        'completed' => Icons.task_alt_rounded,
        'cancelled' => Icons.cancel_outlined,
        'no_show' => Icons.person_off_outlined,
        _ => Icons.event_available_rounded,
      };
}

class CustomerBookingDetailsPage extends StatefulWidget {
  final String id;
  const CustomerBookingDetailsPage({super.key, required this.id});
  @override
  State<CustomerBookingDetailsPage> createState() => _CustomerBookingDetailsPageState();
}

class _CustomerBookingDetailsPageState extends State<CustomerBookingDetailsPage> {
  late Future<dynamic> _future;
  bool _working = false;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = LookivaApi.instance.get('/customer-ops/bookings/${widget.id}');

  Future<void> _payDeposit(String companyId) async {
    if (_working) return;
    setState(() => _working = true);
    try {
      final paid = await showBookingPaymentFlow(
        context,
        appointmentId: widget.id,
        companyId: companyId,
      );
      if (!mounted) return;
      setState(_reload);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            paid ? ct(context, 'depositPaid') : ct(context, 'paymentPending'),
          ),
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(LookivaApi.instance.friendlyError(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _cancel() async {
    final reason = TextEditingController();
    final ok = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(ct(context, 'cancelBooking')),
            content: TextField(
              controller: reason,
              decoration: InputDecoration(labelText: ct(context, 'reason')),
              maxLines: 3,
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(ct(context, 'keepBooking')),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(ct(context, 'cancelBooking')),
              ),
            ],
          ),
        ) ??
        false;

    if (!ok) return;
    if (reason.text.trim().isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ct(context, 'cancelReason'))));
      }
      return;
    }

    setState(() => _working = true);
    try {
      await LookivaApi.instance.patch(
        '/booking-v2/appointments/${widget.id}/cancel',
        data: {'reason': reason.text.trim()},
      );
      if (mounted) {
        setState(_reload);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ct(context, 'bookingCancelled'))));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LookivaApi.instance.friendlyError(e))));
      }
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(ct(context, 'bookingDetails'))),
      body: FutureBuilder<dynamic>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _Error(
              message: LookivaApi.instance.friendlyError(snapshot.error!),
              onRetry: () => setState(_reload),
            );
          }
          if (snapshot.data is! Map) {
            return Center(child: Text(ct(context, 'bookingNotFound')));
          }

          final b = Map<String, dynamic>.from(snapshot.data as Map);
          final company = b['company'] is Map
              ? Map<String, dynamic>.from(b['company'] as Map)
              : <String, dynamic>{};
          final branch = b['branch'] is Map
              ? Map<String, dynamic>.from(b['branch'] as Map)
              : <String, dynamic>{};

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                company['display_name']?.toString() ?? ct(context, 'booking'),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text('${b['status'] ?? '—'} • ${b['starts_at'] ?? '—'}', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 16),
              _section(ct(context, 'branch'), [branch['name'], branch['address_line_1']]),
              _listSection(ct(context, 'services'), b['services'], 'service', 'name'),
              _listSection(ct(context, 'professionals'), b['participants'], 'professional', 'display_name'),
              _listSection(ct(context, 'resources'), b['resources'], 'resource', 'name'),
              if (b['financial_snapshot'] is Map)
                _financial(Map<String, dynamic>.from(b['financial_snapshot'] as Map)),
              if (b['status_history'] is List)
                _listSection(ct(context, 'timeline'), b['status_history'], null, 'new_status'),
              if (b['status'] == 'awaiting_payment' && company['id'] != null) ...[
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _working
                      ? null
                      : () => _payDeposit(company['id'].toString()),
                  icon: const Icon(Icons.payments_outlined),
                  label: Text(
                    _working ? ct(context, 'paying') : ct(context, 'payDeposit'),
                  ),
                ),
              ],
              if (['awaiting_payment', 'pending', 'confirmed', 'checked_in'].contains(b['status'])) ...[
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _working ? null : _cancel,
                  icon: const Icon(Icons.cancel_outlined),
                  label: Text(_working ? ct(context, 'working') : ct(context, 'cancelBooking')),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _section(String title, List<dynamic> values) {
    final clean = values
        .where((e) => e != null && e.toString().isNotEmpty)
        .map((e) => e.toString())
        .toList();
    if (clean.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            ...clean.map(Text.new),
          ],
        ),
      ),
    );
  }

  Widget _listSection(String title, dynamic value, String? nested, String label) {
    final items = (value as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    if (items.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            ...items.map((i) {
              Map<String, dynamic> target = i;
              if (nested != null && i[nested] is Map) {
                target = Map<String, dynamic>.from(i[nested] as Map);
              }
              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(target[label]?.toString() ?? target['status']?.toString() ?? '—'),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _financial(Map<String, dynamic> f) {
    final rows = ['subtotal', 'discount_total', 'tax_total', 'resource_surcharge', 'deposit_amount', 'grand_total', 'currency_code'];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ct(context, 'financial'), style: const TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            ...rows.where((k) => f[k] != null).map(
                  (k) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(k.replaceAll('_', ' ')),
                        Text(f[k].toString(), style: const TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _Error extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _Error({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: Text(ct(context, 'retry')),
              ),
            ],
          ),
        ),
      );
}
