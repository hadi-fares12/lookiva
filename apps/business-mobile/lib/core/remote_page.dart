import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'lookiva_api.dart';
import 'l10n.dart';
import 'realtime.dart';

class BusinessRemotePage extends StatelessWidget {
  final String section;
  const BusinessRemotePage({super.key, required this.section});

  @override
  Widget build(BuildContext context) {
    final config = BusinessRemoteBody.configFor(section);
    return Scaffold(
      appBar: AppBar(title: Text(bt(context, config.titleKey))),
      body: BusinessRemoteBody(section: section),
    );
  }
}

class BusinessRemoteBody extends StatefulWidget {
  final String section;
  const BusinessRemoteBody({super.key, required this.section});

  static const config = <String, ({String titleKey, String path, IconData icon})>{
    'overview': (titleKey: 'overview', path: '/business-ops/{companyId}/overview', icon: Icons.dashboard_rounded),
    'calendar': (titleKey: 'appointments', path: '/business-ops/{companyId}/appointments', icon: Icons.calendar_month_rounded),
    'floor': (titleKey: 'liveFloor', path: '/business-ops/{companyId}/resources', icon: Icons.chair_rounded),
    'customers': (titleKey: 'customers', path: '/business-ops/{companyId}/customers', icon: Icons.people_alt_rounded),
    'professionals': (titleKey: 'professionals', path: '/business-ops/{companyId}/professionals', icon: Icons.badge_outlined),
    'services': (titleKey: 'services', path: '/business-ops/{companyId}/services', icon: Icons.design_services_rounded),
    'payments': (titleKey: 'payments', path: '/business-ops/{companyId}/payments', icon: Icons.payments_rounded),
    'payouts': (titleKey: 'payouts', path: '/finance-v2/companies/{companyId}/payouts', icon: Icons.account_balance_outlined),
    'notifications': (titleKey: 'notifications', path: '/notifications', icon: Icons.notifications_none_rounded),
    'inventory': (titleKey: 'inventory', path: '/business-ops/{companyId}/inventory', icon: Icons.inventory_2_outlined),
    'commissions': (titleKey: 'commissions', path: '/business-ops/{companyId}/commission-rules', icon: Icons.percent_rounded),
    'forms': (titleKey: 'forms', path: '/business-ops/{companyId}/consent-forms', icon: Icons.assignment_turned_in_outlined),
    'promotions': (titleKey: 'promotions', path: '/business-ops/{companyId}/promotions', icon: Icons.local_offer_rounded),
    'reviews': (titleKey: 'reviews', path: '/business-ops/{companyId}/reviews', icon: Icons.reviews_outlined),
    'staff': (titleKey: 'staff', path: '/business-ops/{companyId}/staff', icon: Icons.admin_panel_settings_outlined),
    'branches': (titleKey: 'branches', path: '/business-ops/{companyId}/branches', icon: Icons.storefront_rounded),
    'subscription': (titleKey: 'subscription', path: '/business-ops/{companyId}/subscriptions', icon: Icons.workspace_premium_outlined),
    'audit': (titleKey: 'audit', path: '/business-ops/{companyId}/audit', icon: Icons.fact_check_outlined),
    'finance': (titleKey: 'finance', path: '/finance-v2/companies/{companyId}/reconciliation', icon: Icons.account_balance_wallet_outlined),
    'analytics': (titleKey: 'analytics', path: '/analytics-v2/companies/{companyId}/dashboard', icon: Icons.analytics_outlined),
    'queue': (titleKey: 'queue', path: '/business-ops/{companyId}/queues', icon: Icons.groups_rounded),
  };

  static ({String titleKey, String path, IconData icon}) configFor(String section) =>
      config[section] ?? config['overview']!;

  @override
  State<BusinessRemoteBody> createState() => _BusinessRemoteBodyState();
}

class _BusinessRemoteBodyState extends State<BusinessRemoteBody> {
  late Future<dynamic> _future;
  StreamSubscription<LookivaBusinessRealtimeEvent>? _realtimeSub;
  bool _busy = false;
  String? _notice;
  String _calendarView = 'day';
  DateTime _calendarAnchor = DateTime.now();

  ({String titleKey, String path, IconData icon}) get config =>
      BusinessRemoteBody.configFor(widget.section);

  @override
  void initState() {
    super.initState();
    _reload();
    LookivaBusinessRealtime.instance.connect();
    _realtimeSub = LookivaBusinessRealtime.instance.events.listen((event) {
      if (!mounted) return;
      if (const {'booking:changed', 'queue:changed', 'floor:changed', 'business:changed'}.contains(event.name)) {
        setState(_reload);
      }
    });
  }

  @override
  void didUpdateWidget(covariant BusinessRemoteBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.section != widget.section) {
      _notice = null;
      _reload();
    }
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  void _reload() {
    _future = LookivaBusinessApi.instance.getScoped(
      config.path,
      query: widget.section == 'calendar' ? _calendarQuery() : null,
    );
  }

  Map<String, dynamic> _calendarQuery() {
    DateTime start;
    DateTime end;
    final anchor = DateTime(
      _calendarAnchor.year,
      _calendarAnchor.month,
      _calendarAnchor.day,
    );

    switch (_calendarView) {
      case 'three_days':
        start = anchor;
        end = anchor.add(const Duration(days: 3));
        break;
      case 'week':
        start = anchor.subtract(Duration(days: anchor.weekday - DateTime.monday));
        end = start.add(const Duration(days: 7));
        break;
      case 'month':
        start = DateTime(anchor.year, anchor.month, 1);
        end = DateTime(anchor.year, anchor.month + 1, 1);
        break;
      case 'agenda':
        start = anchor;
        end = anchor.add(const Duration(days: 30));
        break;
      case 'timeline':
        start = anchor.subtract(const Duration(days: 7));
        end = anchor.add(const Duration(days: 30));
        break;
      case 'day':
      default:
        start = anchor;
        end = anchor.add(const Duration(days: 1));
        break;
    }

    return {
      'from': start.toUtc().toIso8601String(),
      'to': end.subtract(const Duration(milliseconds: 1)).toUtc().toIso8601String(),
      'limit': 250,
    };
  }

  void _changeCalendarView(String view) {
    if (_calendarView == view) return;
    setState(() {
      _calendarView = view;
      _reload();
    });
  }

  void _moveCalendar(int direction) {
    setState(() {
      switch (_calendarView) {
        case 'three_days':
          _calendarAnchor = _calendarAnchor.add(Duration(days: 3 * direction));
          break;
        case 'week':
          _calendarAnchor = _calendarAnchor.add(Duration(days: 7 * direction));
          break;
        case 'month':
          _calendarAnchor = DateTime(
            _calendarAnchor.year,
            _calendarAnchor.month + direction,
            1,
          );
          break;
        case 'agenda':
        case 'timeline':
          _calendarAnchor = _calendarAnchor.add(Duration(days: 7 * direction));
          break;
        case 'day':
        default:
          _calendarAnchor = _calendarAnchor.add(Duration(days: direction));
          break;
      }
      _reload();
    });
  }

  String _calendarRangeLabel(BuildContext context) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final query = _calendarQuery();
    final start = DateTime.parse(query['from'] as String).toLocal();
    final end = DateTime.parse(query['to'] as String).toLocal();
    final day = DateFormat.yMMMd(locale);
    if (_calendarView == 'day') return day.format(start);
    return '${day.format(start)} — ${day.format(end)}';
  }

  Future<void> _refresh() async {
    setState(_reload);
    await _future;
  }

  Future<void> _mutate(Future<dynamic> Function() action, String success) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _notice = null;
    });
    try {
      await action();
      if (!mounted) return;
      setState(() {
        _notice = success;
        _reload();
      });
      await _future;
    } catch (error) {
      if (mounted) setState(() => _notice = LookivaBusinessApi.instance.friendlyError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<dynamic>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting && snapshot.data == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError && snapshot.data == null) {
          return _ErrorState(
            message: LookivaBusinessApi.instance.friendlyError(snapshot.error!),
            onRetry: _refresh,
          );
        }
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  CircleAvatar(child: Icon(config.icon)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      bt(context, config.titleKey),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
                    ),
                  ),
                  IconButton(
                    onPressed: _busy ? null : () => _refresh(),
                    icon: const Icon(Icons.refresh_rounded),
                  ),
                ],
              ),
              if (_notice != null) ...[
                const SizedBox(height: 10),
                Card(child: Padding(padding: const EdgeInsets.all(12), child: Text(_notice!))),
              ],
              if (const {'services', 'floor', 'promotions', 'queue', 'commissions', 'payouts'}.contains(widget.section)) ...[
                const SizedBox(height: 10),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: ElevatedButton.icon(
                    onPressed: _busy ? null : _createCurrent,
                    icon: const Icon(Icons.add_rounded),
                    label: Text(_createLabel()),
                  ),
                ),
              ],
              const SizedBox(height: 14),
              ..._buildSection(snapshot.data),
            ],
          ),
        );
      },
    );
  }

  String _createLabel() {
    if (widget.section == 'services') return 'Add service';
    if (widget.section == 'floor') return 'Add chair / resource';
    if (widget.section == 'promotions') return 'Add promotion';
    if (widget.section == 'queue') return 'Add queue';
    if (widget.section == 'commissions') return bt(context, 'addCommission');
    if (widget.section == 'payouts') return bt(context, 'createPayout');
    return 'Add';
  }

  Future<void> _createCurrent() async {
    if (widget.section == 'services') return _createService();
    if (widget.section == 'floor') return _createResource();
    if (widget.section == 'promotions') return _createPromotion();
    if (widget.section == 'queue') return _createQueue();
    if (widget.section == 'commissions') return _createCommissionRule();
    if (widget.section == 'payouts') return _createPayout();
  }

  Future<void> _createService() async {
    final raw = await LookivaBusinessApi.instance.getScoped('/business-ops/{companyId}/categories');
    final categories = (raw as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    if (!mounted) return;
    if (categories.isEmpty) {
      setState(() => _notice = 'Create a service category first.');
      return;
    }
    final name = TextEditingController();
    final duration = TextEditingController(text: '30');
    final price = TextEditingController(text: '0');
    String categoryId = categories.first['id'].toString();

    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setLocal) => AlertDialog(
          title: const Text('Add service'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Service name')),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: categoryId,
                decoration: const InputDecoration(labelText: 'Category'),
                items: categories.map((row) => DropdownMenuItem<String>(
                  value: row['id'].toString(),
                  child: Text(row['name']?.toString() ?? 'Category'),
                )).toList(),
                onChanged: (value) => setLocal(() => categoryId = value ?? categoryId),
              ),
              const SizedBox(height: 10),
              TextField(controller: duration, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Duration minutes')),
              const SizedBox(height: 10),
              TextField(controller: price, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Price USD')),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Create')),
          ],
        ),
      ),
    );
    if (ok != true || name.text.trim().isEmpty) return;
    await _mutate(
      () => LookivaBusinessApi.instance.postScoped('/business-ops/{companyId}/services', data: {
        'categoryId': categoryId,
        'name': name.text.trim(),
        'branchIds': <String>[],
        'professionalIds': <String>[],
        'resourceIds': <String>[],
        'durationMinutes': int.tryParse(duration.text) ?? 30,
        'basePrice': double.tryParse(price.text) ?? 0,
        'currencyCode': 'USD',
        'walkInsAllowed': true,
      }),
      'Service created.',
    );
  }

  Future<void> _createResource() async {
    final session = await LookivaBusinessApi.instance.restoreSession();
    if (!mounted || session == null) return;
    final name = TextEditingController();
    String type = 'barber_chair';
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setLocal) => AlertDialog(
          title: const Text('Add chair / resource'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: type,
              decoration: const InputDecoration(labelText: 'Type'),
              items: const [
                DropdownMenuItem(value: 'barber_chair', child: Text('Barber chair')),
                DropdownMenuItem(value: 'styling_chair', child: Text('Styling chair')),
                DropdownMenuItem(value: 'washing_station', child: Text('Washing station')),
                DropdownMenuItem(value: 'nail_table', child: Text('Nail table')),
                DropdownMenuItem(value: 'treatment_room', child: Text('Treatment room')),
                DropdownMenuItem(value: 'equipment', child: Text('Equipment')),
              ],
              onChanged: (value) => setLocal(() => type = value ?? type),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Create')),
          ],
        ),
      ),
    );
    if (ok != true || name.text.trim().isEmpty) return;
    await _mutate(
      () => LookivaBusinessApi.instance.postScoped('/business-ops/{companyId}/resources', data: {
        if (session.branchId != null) 'branchId': session.branchId,
        'name': name.text.trim(),
        'type': type,
        'quantity': 1,
        'capacityPerSlot': 1,
      }),
      'Resource created.',
    );
  }

  Future<void> _createPromotion() async {
    final name = TextEditingController();
    final amount = TextEditingController(text: '10');
    final ok = await _simpleDialog(
      title: 'Add promotion',
      fields: [
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
        TextField(controller: amount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Discount %')),
      ],
    );
    if (ok != true || name.text.trim().isEmpty) return;
    await _mutate(
      () => LookivaBusinessApi.instance.postScoped('/business-ops/{companyId}/promotions', data: {
        'name': name.text.trim(),
        'promotionType': 'percentage',
        'valuePercent': double.tryParse(amount.text) ?? 0,
        'startsAt': DateTime.now().toUtc().toIso8601String(),
      }),
      'Promotion created.',
    );
  }

  Future<void> _createQueue() async {
    final raw = await LookivaBusinessApi.instance.getScoped('/business-ops/{companyId}/branches');
    final branches = (raw as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    if (!mounted) return;
    if (branches.isEmpty) {
      setState(() => _notice = 'Create a branch first.');
      return;
    }
    final name = TextEditingController(text: 'Default');
    final wait = TextEditingController(text: '15');
    String branchId = branches.first['id'].toString();
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setLocal) => AlertDialog(
          title: const Text('Add walk-in queue'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField<String>(
              initialValue: branchId,
              decoration: const InputDecoration(labelText: 'Branch'),
              items: branches.map((row) => DropdownMenuItem<String>(
                value: row['id'].toString(),
                child: Text(row['name']?.toString() ?? 'Branch'),
              )).toList(),
              onChanged: (value) => setLocal(() => branchId = value ?? branchId),
            ),
            const SizedBox(height: 10),
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Queue name')),
            const SizedBox(height: 10),
            TextField(controller: wait, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Minutes per person')),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Create')),
          ],
        ),
      ),
    );
    if (ok != true) return;
    await _mutate(
      () => LookivaBusinessApi.instance.postScoped('/business-ops/{companyId}/queues', data: {
        'branchId': branchId,
        'name': name.text.trim().isEmpty ? 'Default' : name.text.trim(),
        'estimatedWaitPerPersonMinutes': int.tryParse(wait.text) ?? 15,
        'maxWaiting': 50,
      }),
      'Queue created.',
    );
  }

  Future<void> _createCommissionRule() async {
    final raw = await LookivaBusinessApi.instance.getScoped(
      '/business-ops/{companyId}/professionals',
    );
    final professionals = (raw as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .where((e) => e['is_active'] != false)
        .toList();
    if (!mounted) return;

    final name = TextEditingController(text: bt(context, 'standardCommission'));
    final value = TextEditingController(text: '10');
    String type = 'percentage';
    String? professionalId;

    final ok = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => StatefulBuilder(
            builder: (context, setLocal) => AlertDialog(
              title: Text(bt(context, 'addCommission')),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: name,
                      decoration: InputDecoration(
                        labelText: bt(context, 'ruleName'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String?>(
                      initialValue: professionalId,
                      decoration: InputDecoration(
                        labelText: bt(context, 'professional'),
                      ),
                      items: [
                        DropdownMenuItem<String?>(
                          value: null,
                          child: Text(bt(context, 'allProfessionals')),
                        ),
                        ...professionals.map(
                          (row) => DropdownMenuItem<String?>(
                            value: row['id']?.toString(),
                            child: Text(
                              row['display_name']?.toString() ??
                                  bt(context, 'professional'),
                            ),
                          ),
                        ),
                      ],
                      onChanged: (next) =>
                          setLocal(() => professionalId = next),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: type,
                      decoration: InputDecoration(
                        labelText: bt(context, 'commissionType'),
                      ),
                      items: [
                        DropdownMenuItem(
                          value: 'percentage',
                          child: Text(bt(context, 'percentage')),
                        ),
                        DropdownMenuItem(
                          value: 'fixed',
                          child: Text(bt(context, 'fixedAmount')),
                        ),
                      ],
                      onChanged: (next) =>
                          setLocal(() => type = next ?? type),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: value,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: bt(context, 'commissionValue'),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext, false),
                  child: Text(bt(context, 'cancel')),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(dialogContext, true),
                  child: Text(bt(context, 'save')),
                ),
              ],
            ),
          ),
        ) ??
        false;

    if (ok != true || name.text.trim().isEmpty) {
      name.dispose();
      value.dispose();
      return;
    }
    final numeric = double.tryParse(value.text) ?? 0;
    await _mutate(
      () => LookivaBusinessApi.instance.postScoped(
        '/business-ops/{companyId}/commission-rules',
        data: {
          'name': name.text.trim(),
          if (professionalId != null) 'professionalId': professionalId,
          'calculationType': type,
          if (type == 'percentage') 'percentRate': numeric,
          if (type == 'fixed') 'fixedAmount': numeric,
        },
      ),
      bt(context, 'commissionCreated'),
    );
    name.dispose();
    value.dispose();
  }

  Future<void> _createPayout() async {
    final session = await LookivaBusinessApi.instance.restoreSession();
    if (!mounted || session == null) return;
    final raw = await LookivaBusinessApi.instance.getScoped(
      '/business-ops/{companyId}/professionals',
    );
    final professionals = (raw as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .where((e) => e['is_active'] != false)
        .toList();
    if (!mounted) return;
    if (professionals.isEmpty) {
      setState(() => _notice = bt(context, 'noProfessionals'));
      return;
    }

    String professionalId = professionals.first['id'].toString();
    DateTime end = DateTime.now();
    DateTime start = end.subtract(const Duration(days: 7));
    bool markPaid = false;
    final reference = TextEditingController();

    final ok = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => StatefulBuilder(
            builder: (context, setLocal) => AlertDialog(
              title: Text(bt(context, 'createPayout')),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: professionalId,
                      decoration: InputDecoration(
                        labelText: bt(context, 'professional'),
                      ),
                      items: professionals
                          .map(
                            (row) => DropdownMenuItem<String>(
                              value: row['id'].toString(),
                              child: Text(
                                row['display_name']?.toString() ??
                                    bt(context, 'professional'),
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (next) => setLocal(
                        () => professionalId = next ?? professionalId,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(bt(context, 'periodStart')),
                      subtitle: Text(
                        DateFormat.yMMMd(
                          Localizations.localeOf(context).toLanguageTag(),
                        ).format(start),
                      ),
                      trailing: const Icon(Icons.date_range_outlined),
                      onTap: () async {
                        final chosen = await showDatePicker(
                          context: context,
                          initialDate: start,
                          firstDate: DateTime(2020),
                          lastDate: end,
                        );
                        if (chosen != null) setLocal(() => start = chosen);
                      },
                    ),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(bt(context, 'periodEnd')),
                      subtitle: Text(
                        DateFormat.yMMMd(
                          Localizations.localeOf(context).toLanguageTag(),
                        ).format(end),
                      ),
                      trailing: const Icon(Icons.date_range_outlined),
                      onTap: () async {
                        final chosen = await showDatePicker(
                          context: context,
                          initialDate: end,
                          firstDate: start,
                          lastDate: DateTime.now().add(
                            const Duration(days: 1),
                          ),
                        );
                        if (chosen != null) setLocal(() => end = chosen);
                      },
                    ),
                    TextField(
                      controller: reference,
                      decoration: InputDecoration(
                        labelText: bt(context, 'reference'),
                      ),
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(bt(context, 'markPaid')),
                      value: markPaid,
                      onChanged: (next) =>
                          setLocal(() => markPaid = next),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext, false),
                  child: Text(bt(context, 'cancel')),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(dialogContext, true),
                  child: Text(bt(context, 'createPayout')),
                ),
              ],
            ),
          ),
        ) ??
        false;

    if (ok != true) {
      reference.dispose();
      return;
    }

    final startUtc = DateTime(
      start.year,
      start.month,
      start.day,
    ).toUtc();
    final endExclusive = DateTime(
      end.year,
      end.month,
      end.day,
    ).add(const Duration(days: 1)).toUtc();

    await _mutate(
      () => LookivaBusinessApi.instance.postScoped(
        '/finance-v2/payouts',
        data: {
          'companyId': session.companyId,
          'professionalId': professionalId,
          'payoutPeriodStart': startUtc.toIso8601String(),
          'payoutPeriodEnd': endExclusive.toIso8601String(),
          'markPaid': markPaid,
          if (reference.text.trim().isNotEmpty)
            'referenceCode': reference.text.trim(),
          if (markPaid) 'paymentMethod': 'manual',
        },
      ),
      bt(context, 'payoutCreated'),
    );
    reference.dispose();
  }

  Future<bool?> _simpleDialog({required String title, required List<Widget> fields}) {
    return showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: fields.expand((field) => [field, const SizedBox(height: 10)]).toList(),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Save')),
        ],
      ),
    );
  }

  List<Widget> _buildSection(dynamic data) {
    if (widget.section == 'calendar') return _calendar(data);
    if (widget.section == 'floor') return _resources(data);
    if (widget.section == 'queue') return _queues(data);
    if (widget.section == 'services') return _services(data);
    if (widget.section == 'promotions') return _promotions(data);
    if (widget.section == 'customers') return _customers(data);
    if (widget.section == 'professionals') return _professionals(data);
    if (widget.section == 'commissions') return _commissionRules(data);
    if (widget.section == 'payouts') return _payouts(data);

    final rows = _rows(data);
    if (rows.isEmpty) return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    return rows.map((row) => Card(
      child: ListTile(
        leading: Icon(config.icon, color: Theme.of(context).colorScheme.primary),
        title: Text(row.$1, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: row.$2.isEmpty ? null : Text(row.$2, maxLines: 6, overflow: TextOverflow.ellipsis),
      ),
    )).toList();
  }

  List<Widget> _customers(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) {
      return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    }
    return rows.map((row) {
      final user = row['user'] is Map
          ? Map<String, dynamic>.from(row['user'] as Map)
          : <String, dynamic>{};
      final name = user['full_name']?.toString() ??
          row['display_name']?.toString() ??
          bt(context, 'customer');
      final contact = user['phone']?.toString() ??
          user['email']?.toString() ??
          '—';
      return Card(
        child: ListTile(
          leading: CircleAvatar(
            child: Text(
              name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase(),
            ),
          ),
          title: Text(
            name,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          subtitle: Text(contact),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => _showCustomerDetails(row['id']?.toString() ?? ''),
        ),
      );
    }).toList();
  }

  Future<void> _showCustomerDetails(String customerId) async {
    if (customerId.isEmpty || _busy) return;
    setState(() => _busy = true);
    try {
      final raw = await LookivaBusinessApi.instance.getScoped(
        '/business-ops/{companyId}/customers/' + customerId,
      );
      if (!mounted || raw is! Map) return;
      final customer = Map<String, dynamic>.from(raw);
      final user = customer['user'] is Map
          ? Map<String, dynamic>.from(customer['user'] as Map)
          : <String, dynamic>{};
      final appointments = (customer['appointments'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      final payments = (customer['payments'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();

      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (sheetContext) => FractionallySizedBox(
          heightFactor: .88,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
            children: [
              Text(
                user['full_name']?.toString() ?? bt(context, 'customer'),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                [
                  user['phone']?.toString(),
                  user['email']?.toString(),
                ].whereType<String>().where((e) => e.isNotEmpty).join(' • '),
              ),
              const SizedBox(height: 18),
              Text(
                bt(context, 'recentAppointments'),
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              if (appointments.isEmpty)
                Text(bt(context, 'noRecords'))
              else
                ...appointments.take(20).map(
                      (a) => Card(
                        child: ListTile(
                          title: Text(
                            (a['services'] as List? ?? const [])
                                    .whereType<Map>()
                                    .map((link) => link['service'])
                                    .whereType<Map>()
                                    .map((service) => service['name']?.toString())
                                    .whereType<String>()
                                    .join(', ')
                                    .trim()
                                    .isEmpty
                                ? bt(context, 'appointment')
                                : (a['services'] as List? ?? const [])
                                    .whereType<Map>()
                                    .map((link) => link['service'])
                                    .whereType<Map>()
                                    .map((service) => service['name']?.toString())
                                    .whereType<String>()
                                    .join(', '),
                          ),
                          subtitle: Text(
                            '${a['status'] ?? '—'} • ${a['starts_at'] ?? '—'}',
                          ),
                        ),
                      ),
                    ),
              const SizedBox(height: 16),
              Text(
                bt(context, 'recentPayments'),
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              if (payments.isEmpty)
                Text(bt(context, 'noRecords'))
              else
                ...payments.take(20).map(
                      (p) => Card(
                        child: ListTile(
                          leading: const Icon(Icons.payments_outlined),
                          title: Text(
                            '${p['amount'] ?? '—'} ${p['currency_code'] ?? ''}',
                          ),
                          subtitle: Text(
                            '${p['payment_method'] ?? ''} • ${p['status'] ?? ''}',
                          ),
                        ),
                      ),
                    ),
            ],
          ),
        ),
      );
    } catch (error) {
      if (mounted) {
        setState(
          () => _notice =
              LookivaBusinessApi.instance.friendlyError(error),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<Widget> _professionals(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) {
      return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    }
    return rows.map((row) {
      final branches = (row['branches'] as List? ?? const [])
          .whereType<Map>()
          .map((e) => e['branch'])
          .whereType<Map>()
          .map((e) => e['name']?.toString())
          .whereType<String>()
          .join(', ');
      return Card(
        child: ListTile(
          leading: CircleAvatar(
            child: const Icon(Icons.badge_outlined),
          ),
          title: Text(
            row['display_name']?.toString() ??
                bt(context, 'professional'),
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          subtitle: Text(
            branches.isEmpty
                ? (row['specialties'] as List? ?? const []).join(', ')
                : branches,
          ),
          trailing: const Icon(Icons.calendar_month_outlined),
          onTap: () => _editProfessionalSchedule(row),
        ),
      );
    }).toList();
  }

  Future<void> _editProfessionalSchedule(
    Map<String, dynamic> professional,
  ) async {
    final professionalId = professional['id']?.toString();
    if (professionalId == null || professionalId.isEmpty || _busy) return;

    setState(() => _busy = true);
    try {
      final session = await LookivaBusinessApi.instance.restoreSession();
      if (!mounted || session == null) return;
      final branchesRaw = await LookivaBusinessApi.instance.getScoped(
        '/business-ops/{companyId}/branches',
      );
      final scheduleRaw = await LookivaBusinessApi.instance.getScoped(
        '/business-ops/{companyId}/professionals/' +
            professionalId +
            '/schedules',
      );
      if (!mounted) return;
      final branches = (branchesRaw as List? ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      if (branches.isEmpty) {
        setState(() => _notice = bt(context, 'noBranches'));
        return;
      }
      final branchId = session.branchId != null &&
              branches.any((b) => b['id']?.toString() == session.branchId)
          ? session.branchId!
          : branches.first['id'].toString();
      final branchName = branches
              .firstWhere(
                (b) => b['id']?.toString() == branchId,
                orElse: () => branches.first,
              )['name']
              ?.toString() ??
          bt(context, 'branch');

      final existing = (scheduleRaw as List? ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .where((e) => e['branch_id']?.toString() == branchId)
          .toList();
      final off = List<bool>.filled(7, false);
      final starts = List.generate(7, (_) => TextEditingController(text: '09:00'));
      final ends = List.generate(7, (_) => TextEditingController(text: '18:00'));
      for (var day = 0; day < 7; day++) {
        final found = existing.where(
          (row) => int.tryParse(row['day_of_week']?.toString() ?? '') == day,
        );
        if (found.isNotEmpty) {
          final row = found.first;
          off[day] = row['is_off'] == true;
          starts[day].text = row['starts_at']?.toString() ?? '09:00';
          ends[day].text = row['ends_at']?.toString() ?? '18:00';
        } else {
          off[day] = day == 0;
        }
      }

      final ok = await showDialog<bool>(
            context: context,
            builder: (dialogContext) => StatefulBuilder(
              builder: (context, setLocal) => AlertDialog(
                title: Text(
                  '${bt(context, 'schedule')} • $branchName',
                ),
                content: SizedBox(
                  width: 520,
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: 7,
                    itemBuilder: (context, day) {
                      final label = DateFormat.EEEE(
                        Localizations.localeOf(context).toLanguageTag(),
                      ).format(DateTime(2023, 1, 1 + day));
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 92,
                              child: Text(
                                label,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            Switch(
                              value: !off[day],
                              onChanged: (working) =>
                                  setLocal(() => off[day] = !working),
                            ),
                            if (!off[day]) ...[
                              Expanded(
                                child: TextField(
                                  controller: starts[day],
                                  decoration: InputDecoration(
                                    labelText: bt(context, 'start'),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: ends[day],
                                  decoration: InputDecoration(
                                    labelText: bt(context, 'end'),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(dialogContext, false),
                    child: Text(bt(context, 'cancel')),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.pop(dialogContext, true),
                    child: Text(bt(context, 'save')),
                  ),
                ],
              ),
            ),
          ) ??
          false;

      if (ok == true) {
        await LookivaBusinessApi.instance.postScoped(
          '/business-ops/{companyId}/professionals/' +
              professionalId +
              '/schedules',
          data: {
            'branchId': branchId,
            'schedules': List.generate(
              7,
              (day) => {
                'dayOfWeek': day,
                'isOff': off[day],
                if (!off[day]) 'startsAt': starts[day].text.trim(),
                if (!off[day]) 'endsAt': ends[day].text.trim(),
              },
            ),
          },
        );
        if (mounted) {
          setState(() {
            _notice = bt(context, 'scheduleSaved');
            _reload();
          });
        }
      }

      for (final controller in [...starts, ...ends]) {
        controller.dispose();
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _notice =
              LookivaBusinessApi.instance.friendlyError(error),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<Widget> _commissionRules(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) {
      return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    }
    return rows.map((row) {
      final id = row['id']?.toString() ?? '';
      final active = row['is_active'] != false;
      final type = row['calculation_type']?.toString() ?? '';
      final amount = type == 'percentage'
          ? '${row['percent_rate'] ?? 0}%'
          : row['fixed_amount']?.toString() ?? '0';
      return Card(
        child: ListTile(
          leading: const Icon(Icons.percent_rounded),
          title: Text(
            row['name']?.toString() ?? bt(context, 'commission'),
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          subtitle: Text('$type • $amount'),
          trailing: Switch(
            value: active,
            onChanged: _busy || id.isEmpty
                ? null
                : (next) => _mutate(
                      () => LookivaBusinessApi.instance.patchScoped(
                        '/business-ops/{companyId}/commission-rules/' + id,
                        data: {'isActive': next},
                      ),
                      bt(context, 'commissionUpdated'),
                    ),
          ),
        ),
      );
    }).toList();
  }

  List<Widget> _payouts(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) {
      return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    }
    return rows.map((row) {
      final professional = row['professional'] is Map
          ? Map<String, dynamic>.from(row['professional'] as Map)
          : <String, dynamic>{};
      return Card(
        child: ListTile(
          leading: const Icon(Icons.account_balance_outlined),
          title: Text(
            professional['display_name']?.toString() ??
                bt(context, 'professional'),
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          subtitle: Text(
            '${row['net_amount'] ?? 0} ${row['currency_code'] ?? ''} • '
            '${row['status'] ?? ''}\n'
            '${row['payout_period_start'] ?? ''} → '
            '${row['payout_period_end'] ?? ''}',
          ),
          isThreeLine: true,
        ),
      );
    }).toList();
  }

  Widget _calendarControls() {
    final views = <(String, String)>[
      ('day', bt(context, 'calendarDay')),
      ('three_days', bt(context, 'calendarThreeDays')),
      ('week', bt(context, 'calendarWeek')),
      ('month', bt(context, 'calendarMonth')),
      ('agenda', bt(context, 'calendarAgenda')),
      ('timeline', bt(context, 'calendarTimeline')),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Wrap(
                spacing: 8,
                children: views
                    .map(
                      (view) => ChoiceChip(
                        label: Text(view.$2),
                        selected: _calendarView == view.$1,
                        onSelected: _busy
                            ? null
                            : (_) => _changeCalendarView(view.$1),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(
                  tooltip: bt(context, 'previous'),
                  onPressed: _busy ? null : () => _moveCalendar(-1),
                  icon: const Icon(Icons.chevron_left_rounded),
                ),
                Expanded(
                  child: Text(
                    _calendarRangeLabel(context),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                IconButton(
                  tooltip: bt(context, 'next'),
                  onPressed: _busy ? null : () => _moveCalendar(1),
                  icon: const Icon(Icons.chevron_right_rounded),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () {
                          setState(() {
                            _calendarAnchor = DateTime.now();
                            _reload();
                          });
                        },
                  child: Text(bt(context, 'today')),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _calendar(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) return [_calendarControls(), _EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    return [
      _calendarControls(),
      ...rows.map((a) {
      final id = a['id']?.toString() ?? '';
      final status = a['status']?.toString() ?? '';
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(_appointmentCustomer(a), style: const TextStyle(fontWeight: FontWeight.w900))),
              Chip(label: Text(status.replaceAll('_', ' '))),
            ]),
            Text(_appointmentServices(a)),
            if (a['starts_at'] != null) Text(a['starts_at'].toString(), style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (const {'pending', 'confirmed'}.contains(status))
                FilledButton.tonal(onPressed: _busy ? null : () => _appointmentAction(id, 'check-in'), child: const Text('Check in')),
              if (const {'pending', 'confirmed'}.contains(status))
                OutlinedButton(onPressed: _busy ? null : () => _appointmentAction(id, 'no-show'), child: const Text('No show')),
              if (const {'pending', 'confirmed', 'checked_in'}.contains(status))
                OutlinedButton(onPressed: _busy ? null : () => _cancelAppointment(id), child: const Text('Cancel')),
              if (status == 'checked_in')
                FilledButton(onPressed: _busy ? null : () => _appointmentAction(id, 'start'), child: const Text('Start')),
              if (status == 'in_progress')
                FilledButton(onPressed: _busy ? null : () => _appointmentAction(id, 'complete'), child: const Text('Complete')),
            ]),
          ]),
        ),
      );
      }).toList(),
    ];
  }

  String _appointmentCustomer(Map<String, dynamic> a) {
    final customer = a['customer'];
    if (customer is Map && customer['user'] is Map) {
      return customer['user']['full_name']?.toString() ?? 'Customer';
    }
    return 'Customer';
  }

  String _appointmentServices(Map<String, dynamic> a) {
    final names = (a['services'] as List? ?? const []).whereType<Map>().map((row) {
      final service = row['service'];
      return service is Map ? service['name']?.toString() : null;
    }).whereType<String>().toList();
    return names.isEmpty ? 'Service' : names.join(', ');
  }

  Future<void> _appointmentAction(String id, String action) {
    return _mutate(
      () => LookivaBusinessApi.instance.patchScoped(
        '/booking-v2/appointments/' + id + '/' + action,
        data: action == 'no-show' ? {'notes': 'Marked from Business Mobile'} : <String, dynamic>{},
      ),
      'Appointment updated.',
    );
  }

  Future<void> _cancelAppointment(String id) async {
    final reason = TextEditingController(text: 'Cancelled by business');
    final ok = await _simpleDialog(
      title: 'Cancel appointment',
      fields: [TextField(controller: reason, decoration: const InputDecoration(labelText: 'Reason'))],
    );
    if (ok != true) return;
    await _mutate(
      () => LookivaBusinessApi.instance.patchScoped(
        '/booking-v2/appointments/' + id + '/cancel',
        data: {'reason': reason.text.trim().isEmpty ? 'Cancelled by business' : reason.text.trim()},
      ),
      'Appointment cancelled.',
    );
  }

  List<Widget> _resources(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    return rows.map((row) {
      final id = row['id']?.toString() ?? '';
      final active = row['is_active'] != false;
      final occupied = (row['activeBookings'] as List? ?? const []).isNotEmpty;
      final subtitle = (row['type']?.toString() ?? 'resource') + ' • ' + (occupied ? 'Occupied' : 'Available');
      return Card(child: ListTile(
        leading: CircleAvatar(child: Icon(config.icon)),
        title: Text(row['name']?.toString() ?? 'Resource', style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Text(subtitle),
        trailing: Switch(
          value: active,
          onChanged: _busy ? null : (value) => _mutate(
            () => LookivaBusinessApi.instance.patchScoped('/business-ops/{companyId}/resources/' + id, data: {'isActive': value}),
            'Resource updated.',
          ),
        ),
      ));
    }).toList();
  }

  Future<void> _editService(Map<String, dynamic> row) async {
    final id = row['id']?.toString();
    if (id == null || id.isEmpty || _busy) return;
    final name = TextEditingController(text: row['name']?.toString() ?? '');
    final duration = TextEditingController(
      text: row['duration_minutes']?.toString() ?? '30',
    );
    final price = TextEditingController(
      text: row['base_price']?.toString() ?? '0',
    );
    final deposit = TextEditingController(
      text: row['deposit_percent']?.toString() ?? '',
    );
    final ok = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text(bt(context, 'editService')),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: name,
                    decoration: InputDecoration(
                      labelText: bt(context, 'serviceName'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: duration,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: bt(context, 'durationMinutes'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: price,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: bt(context, 'price'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: deposit,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: bt(context, 'depositPercent'),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: Text(bt(context, 'cancel')),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: Text(bt(context, 'save')),
              ),
            ],
          ),
        ) ??
        false;
    if (ok == true) {
      await _mutate(
        () => LookivaBusinessApi.instance.patchScoped(
          '/business-ops/{companyId}/services/' + id,
          data: {
            'name': name.text.trim(),
            'durationMinutes': int.tryParse(duration.text) ?? 30,
            'basePrice': double.tryParse(price.text) ?? 0,
            'depositPercent': deposit.text.trim().isEmpty
                ? null
                : double.tryParse(deposit.text),
          },
        ),
        bt(context, 'serviceUpdated'),
      );
    }
    name.dispose();
    duration.dispose();
    price.dispose();
    deposit.dispose();
  }

  List<Widget> _services(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    return rows.map((row) {
      final id = row['id']?.toString() ?? '';
      final active = row['is_active'] != false;
      final subtitle = (row['duration_minutes']?.toString() ?? '—') + ' min • ' +
          (row['base_price']?.toString() ?? '—') + ' ' + (row['currency_code']?.toString() ?? '');
      return Card(child: ListTile(
        leading: Icon(config.icon, color: Theme.of(context).colorScheme.primary),
        title: Text(row['name']?.toString() ?? 'Service', style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Text(subtitle),
        onTap: () => _editService(row),
        trailing: Switch(
          value: active,
          onChanged: _busy ? null : (value) => _mutate(
            () => LookivaBusinessApi.instance.patchScoped('/business-ops/{companyId}/services/' + id, data: {'isActive': value}),
            'Service updated.',
          ),
        ),
      ));
    }).toList();
  }

  List<Widget> _promotions(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    return rows.map((row) {
      final id = row['id']?.toString() ?? '';
      final active = row['is_active'] != false;
      return Card(child: ListTile(
        leading: Icon(config.icon, color: Theme.of(context).colorScheme.primary),
        title: Text(row['name']?.toString() ?? 'Promotion', style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Text((row['promotion_type']?.toString() ?? '') + ' • ' + (row['value_percent'] ?? row['value_fixed'] ?? '').toString()),
        trailing: Switch(
          value: active,
          onChanged: _busy ? null : (value) => _mutate(
            () => LookivaBusinessApi.instance.patchScoped('/business-ops/{companyId}/promotions/' + id, data: {'isActive': value}),
            'Promotion updated.',
          ),
        ),
      ));
    }).toList();
  }

  List<Widget> _queues(dynamic data) {
    final rows = _maps(data);
    if (rows.isEmpty) return [_EmptyState(icon: config.icon, label: bt(context, 'noRecords'))];
    return rows.map((queue) {
      final queueId = queue['id']?.toString() ?? '';
      final active = queue['is_active'] != false;
      final entries = (queue['entries'] as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      return Card(child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(queue['name']?.toString() ?? 'Queue', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17))),
            Switch(
              value: active,
              onChanged: _busy ? null : (value) => _mutate(
                () => LookivaBusinessApi.instance.patchScoped('/business-ops/{companyId}/queues/' + queueId, data: {'isActive': value}),
                'Queue updated.',
              ),
            ),
          ]),
          Text(entries.length.toString() + ' waiting'),
          ...entries.map((entry) {
            final id = entry['id']?.toString() ?? '';
            final status = entry['status']?.toString() ?? '';
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('#' + (entry['position']?.toString() ?? '—') + ' ' + (entry['customer_name']?.toString() ?? 'Customer')),
              subtitle: Text((entry['estimated_wait_minutes']?.toString() ?? '—') + ' min • ' + status),
              trailing: Wrap(spacing: 2, children: [
                if (status == 'waiting')
                  IconButton(onPressed: _busy ? null : () => _queueAction(id, 'call'), icon: const Icon(Icons.campaign_outlined)),
                if (const {'waiting', 'called'}.contains(status))
                  IconButton(onPressed: _busy ? null : () => _queueAction(id, 'serve'), icon: const Icon(Icons.check_circle_outline)),
              ]),
            );
          }),
        ]),
      ));
    }).toList();
  }

  Future<void> _queueAction(String id, String action) {
    return _mutate(
      () => LookivaBusinessApi.instance.patchScoped('/booking-v2/queue-entries/' + id + '/' + action, data: <String, dynamic>{}),
      'Queue updated.',
    );
  }

  List<Map<String, dynamic>> _maps(dynamic value) =>
      (value as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();

  List<(String, String)> _rows(dynamic value) {
    if (value is List) return value.map(_summarize).toList();
    if (value is Map) {
      final map = Map<String, dynamic>.from(value);
      return map.entries.map((entry) {
        if (entry.value is Map || entry.value is List) return (_label(entry.key), _compact(entry.value));
        return (_label(entry.key), entry.value?.toString() ?? '—');
      }).toList();
    }
    if (value == null) return const [];
    return [(bt(context, 'details'), value.toString())];
  }

  (String, String) _summarize(dynamic item) {
    if (item is! Map) return (bt(context, 'item'), item.toString());
    final map = Map<String, dynamic>.from(item);
    final title = _first(map, ['display_name', 'name', 'full_name', 'status', 'id'])?.toString() ?? bt(context, 'item');
    final details = <String>[];
    for (final key in ['status', 'starts_at', 'currency_code', 'amount', 'base_price', 'created_at']) {
      if (map[key] != null) details.add(_label(key) + ': ' + map[key].toString());
      if (details.length == 4) break;
    }
    return (title, details.join(' • '));
  }

  dynamic _first(Map<String, dynamic> map, List<String> keys) {
    for (final key in keys) {
      if (map[key] != null && map[key].toString().isNotEmpty) return map[key];
    }
    return null;
  }

  String _compact(dynamic value) {
    if (value is List) return value.length.toString() + ' ' + bt(context, 'items');
    if (value is Map) return value.entries.take(5).map((e) => _label(e.key.toString()) + ': ' + e.value.toString()).join(' • ');
    return value?.toString() ?? '—';
  }

  String _label(String value) => value
      .replaceAll('_', ' ')
      .split(' ')
      .map((word) => word.isEmpty ? word : word[0].toUpperCase() + word.substring(1))
      .join(' ');
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String label;
  const _EmptyState({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 80),
        child: Column(children: [
          Icon(icon, size: 56, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 14),
          Text(label, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900)),
        ]),
      );
}

class _ErrorState extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.cloud_off_rounded, size: 52, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => onRetry(),
              icon: const Icon(Icons.refresh_rounded),
              label: Text(bt(context, 'retry')),
            ),
          ]),
        ),
      );
}
