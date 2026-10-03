import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'lookiva_api.dart';
import 'l10n.dart';

class CustomerBookingPage extends StatefulWidget {
  final String serviceId;
  const CustomerBookingPage({super.key, required this.serviceId});

  @override
  State<CustomerBookingPage> createState() => _CustomerBookingPageState();
}

class _CustomerBookingPageState extends State<CustomerBookingPage> {
  Map<String, dynamic>? _service;
  List<Map<String, dynamic>> _branches = const [];
  List<Map<String, dynamic>> _resources = const [];
  String? _branchId;
  String? _professionalId;
  String? _resourceId;
  DateTime _start = DateTime.now().add(const Duration(hours: 2));
  final _notes = TextEditingController();
  final _contactName = TextEditingController();
  final _contactPhone = TextEditingController();
  final _contactEmail = TextEditingController();
  bool _loading = true;
  bool _submitting = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _notes.dispose();
    _contactName.dispose();
    _contactPhone.dispose();
    _contactEmail.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _message = null; });
    try {
      final raw = await LookivaApi.instance.get('/services/${widget.serviceId}');
      if (!mounted) return;
      if (raw is! Map) throw StateError(ct(context,'serviceNotFound'));
      final service = Map<String, dynamic>.from(raw);
      final company = service['company'];
      final companyId = company is Map ? company['id']?.toString() : service['company_id']?.toString();
      if (companyId == null || companyId.isEmpty) throw StateError(ct(context,'serviceCompanyUnavailable'));
      final br = await LookivaApi.instance.get('/businesses/$companyId/branches');
      final branches = (br as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      _service = service;
      _branches = branches;
      _branchId = branches.isNotEmpty ? branches.first['id']?.toString() : null;
      if (_branchId != null) await _loadResources(_branchId!);
      if (await LookivaApi.instance.hasSession()) {
        try {
          final profileRaw = await LookivaApi.instance.get('/customer/profile');
          if (profileRaw is Map) {
            final profile = Map<String, dynamic>.from(profileRaw);
            _contactName.text = profile['full_name']?.toString() ?? '';
            _contactPhone.text = profile['phone']?.toString() ?? '';
            _contactEmail.text = profile['email']?.toString() ?? '';
          }
        } catch (_) {}
      }
    } catch (error) {
      _message = LookivaApi.instance.friendlyError(error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadResources(String branchId) async {
    try {
      final raw = await LookivaApi.instance.get('/branches/$branchId/resources');
      _resources = (raw as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (_) {
      _resources = const [];
    }
    _resourceId = null;
    if (mounted) setState(() {});
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _start,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_start));
    if (time == null || !mounted) return;
    setState(() => _start = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  Future<void> _confirm() async {
    final service = _service;
    final branchId = _branchId;
    if (service == null || branchId == null) return;
    final signedIn = await LookivaApi.instance.hasSession();
    if (!signedIn) {
      if (mounted) context.push('/login?next=${Uri.encodeComponent('/book/${widget.serviceId}')}');
      return;
    }
    setState(() { _submitting = true; _message = ct(context,'checking'); });
    try {
      final company = service['company'];
      final companyId = company is Map ? company['id']?.toString() : service['company_id']?.toString();
      if (companyId == null) throw StateError(ct(context,'companyUnavailable'));
      final duration = int.tryParse(service['duration_minutes']?.toString() ?? '') ?? 30;
      final end = _start.add(Duration(minutes: duration));
      final resourceIds = _resourceId == null ? <String>[] : <String>[_resourceId!];
      final availability = await LookivaApi.instance.get('/booking-v2/availability', query: {
        'branchId': branchId,
        'startsAt': _start.toUtc().toIso8601String(),
        'endsAt': end.toUtc().toIso8601String(),
        if (_professionalId != null) 'professionalId': _professionalId,
        if (_resourceId != null) 'resourceIds': _resourceId,
      });
      if (!mounted) return;
      if (availability is Map && availability['available'] == false) {
        throw StateError(ct(context,'unavailable'));
      }
      final common = <String, dynamic>{
        'companyId': companyId,
        'branchId': branchId,
        if (_professionalId != null) 'professionalId': _professionalId,
        'serviceIds': [widget.serviceId],
        'resourceIds': resourceIds,
        'startsAt': _start.toUtc().toIso8601String(),
        'endsAt': end.toUtc().toIso8601String(),
      };
      setState(() => _message = ct(context,'holding'));
      final hold = await LookivaApi.instance.post('/booking-v2/holds', data: common);
      if (!mounted) return;
      final holdMap = hold is Map ? Map<String, dynamic>.from(hold) : <String, dynamic>{};
      final holdToken = holdMap['hold_token']?.toString() ?? holdMap['holdToken']?.toString();
      if (holdToken == null || holdToken.isEmpty) throw StateError(ct(context,'holdFailed'));
      setState(() => _message = ct(context,'confirming'));
      final created = await LookivaApi.instance.post('/booking-v2/appointments', data: {
        ...common,
        'holdToken': holdToken,
        if (_contactName.text.trim().isNotEmpty) 'contactName': _contactName.text.trim(),
        if (_contactPhone.text.trim().isNotEmpty) 'contactPhone': _contactPhone.text.trim(),
        if (_contactEmail.text.trim().isNotEmpty) 'contactEmail': _contactEmail.text.trim(),
        if (_notes.text.trim().isNotEmpty) 'notesCustomer': _notes.text.trim(),
        'source': 'customer_flutter',
      });
      final appointment = created is Map ? Map<String, dynamic>.from(created) : <String, dynamic>{};
      final id = appointment['id']?.toString();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: Text(ct(context,'bookingConfirmed')),
          content: Text(id == null ? ct(context,'appointmentConfirmed') : '${ct(context,'bookingId')}: $id'),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text(ct(context,'done')))],
        ),
      );
      if (mounted) context.go('/home');
    } catch (error) {
      if (mounted) setState(() => _message = LookivaApi.instance.friendlyError(error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final service = _service;
    if (service == null) {
      return Scaffold(appBar: AppBar(title: Text(ct(context,'booking'))), body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_message ?? ct(context,'serviceNotFound')))));
    }
    final professionals = (service['professionals'] as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    return Scaffold(
      appBar: AppBar(title: Text(ct(context,'bookService'))),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Text(service['name']?.toString() ?? ct(context,'service'), style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text('${service['duration_minutes'] ?? 30} min • ${service['base_price'] ?? '—'} ${service['currency_code'] ?? ''}', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            initialValue: _branchId,
            decoration: InputDecoration(labelText: ct(context,'branch')),
            items: _branches.map((b) => DropdownMenuItem(value: b['id']?.toString(), child: Text(b['name']?.toString() ?? ct(context,'branch')))).toList(),
            onChanged: (v) async { setState(() => _branchId = v); if (v != null) await _loadResources(v); },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _professionalId,
            decoration: InputDecoration(labelText: ct(context,'professional')),
            items: [
              DropdownMenuItem<String>(value: null, child: Text(ct(context,'anyProfessional'))),
              ...professionals.map((p) => DropdownMenuItem(value: p['id']?.toString(), child: Text(p['display_name']?.toString() ?? p['user']?['full_name']?.toString() ?? ct(context,'professional')))),
            ],
            onChanged: (v) => setState(() => _professionalId = v),
          ),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(ct(context,'dateTime')),
            subtitle: Text('${MaterialLocalizations.of(context).formatFullDate(_start)} • ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(_start))}'),
            trailing: const Icon(Icons.edit_calendar_rounded),
            onTap: _pickDateTime,
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _resourceId,
            decoration: InputDecoration(labelText: ct(context,'chairResource')),
            items: [
              DropdownMenuItem<String>(value: null, child: Text(ct(context,'anyResource'))),
              ..._resources.map((r) => DropdownMenuItem(value: r['id']?.toString(), child: Text('${r['name'] ?? ct(context,'resource')}${r['status'] != null ? ' • ${r['status']}' : ''}'))),
            ],
            onChanged: (v) => setState(() => _resourceId = v),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Reservation contact', style: TextStyle(fontWeight: FontWeight.w900)),
                const SizedBox(height: 10),
                TextField(controller: _contactName, textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'Full name')),
                const SizedBox(height: 10),
                TextField(controller: _contactPhone, keyboardType: TextInputType.phone, textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'Phone')),
                const SizedBox(height: 10),
                TextField(controller: _contactEmail, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 8),
                Text('These details are saved with this reservation and may be edited without changing your profile.', style: Theme.of(context).textTheme.bodySmall),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          TextField(controller: _notes, maxLines: 4, decoration: InputDecoration(labelText: ct(context,'notes'), alignLabelWithHint: true)),
          if (_message != null) ...[
            const SizedBox(height: 14),
            Card(child: Padding(padding: const EdgeInsets.all(14), child: Text(_message!))),
          ],
          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: _submitting ? null : _confirm,
            icon: const Icon(Icons.lock_clock_rounded),
            label: Text(_submitting ? ct(context,'processing') : ct(context,'checkConfirm')),
          ),
        ],
      ),
    );
  }
}
