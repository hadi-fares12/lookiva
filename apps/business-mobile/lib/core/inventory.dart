import 'dart:async';
import 'package:flutter/material.dart';
import 'lookiva_api.dart';
import 'realtime.dart';

class BusinessInventory extends StatefulWidget {
  const BusinessInventory({super.key});
  @override
  State<BusinessInventory> createState() => _BusinessInventoryState();
}

class _BusinessInventoryState extends State<BusinessInventory> {
  final api = LookivaBusinessApi.instance;
  List<Map<String, dynamic>> _products = [], _branches = [];
  String _search = '';
  String? _branch;
  String? _error;
  bool _loading = true, _busy = false, _lowOnly = false;
  StreamSubscription<LookivaBusinessRealtimeEvent>? _events;
  List<Map<String, dynamic>> _maps(dynamic value) =>
      (value is List ? value : const []).whereType<Map>().map((v) => Map<String, dynamic>.from(v)).toList();

  @override
  void initState() {
    super.initState();
    _load();
    _events = LookivaBusinessRealtime.instance.events.listen((e) {
      if (e.name == 'business:changed' && !_busy) _load();
    });
  }
  @override
  void dispose() { _events?.cancel(); super.dispose(); }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        api.getScoped('/business-ops/{companyId}/inventory', query: {if (_branch != null) 'branchId': _branch}),
        api.getScoped('/business-ops/{companyId}/branches'),
      ]);
      if (!mounted) return;
      setState(() { _products = _maps(results[0]); _branches = _maps(results[1]); _error = null; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = api.friendlyError(e); _loading = false; });
    }
  }

  Future<void> _product([Map<String, dynamic>? product]) async {
    final values = await _form(product == null ? 'New product' : 'Edit product', {
      'name': product?['name']?.toString() ?? '',
      'sku': product?['sku']?.toString() ?? '',
      'barcode': product?['barcode']?.toString() ?? '',
      'price': product?['price']?.toString() ?? '0',
      'cost': product?['cost']?.toString() ?? '0',
      'currencyCode': product?['currency_code']?.toString() ?? 'USD',
    }, (v) {
      if (v['name']!.isEmpty) return 'Enter a product name.';
      for (final key in ['price', 'cost']) {
        final n = double.tryParse(v[key]!);
        if (n == null || !n.isFinite || n < 0) return 'Enter a valid non-negative $key.';
      }
      if (!RegExp(r'^[A-Za-z]{3}$').hasMatch(v['currencyCode']!)) return 'Use a three-letter currency code.';
      return null;
    });
    if (values == null || !mounted) return;
    final data = <String, dynamic>{...values, 'price': double.parse(values['price']!), 'cost': double.parse(values['cost']!), 'currencyCode': values['currencyCode']!.toUpperCase()};
    await _run(() => product == null
        ? api.postScoped('/business-ops/{companyId}/products', data: data)
        : api.patchScoped('/business-ops/{companyId}/products/${product['id']}', data: data));
  }

  Future<void> _stock(Map<String, dynamic> product, int direction) async {
    if (_branch == null) {
      setState(() => _error = 'Select the branch before changing stock.');
      return;
    }
    final values = await _form(direction > 0 ? 'Receive stock' : 'Remove stock', {
      'quantity': '1', 'batchNumber': '', 'reason': '',
    }, (v) {
      final n = int.tryParse(v['quantity']!);
      if (n == null || n <= 0) return 'Enter a positive whole quantity.';
      if (v['reason']!.isEmpty) return 'Enter the reason for this stock movement.';
      return null;
    });
    if (values == null || !mounted) return;
    await _run(() => api.postScoped('/business-ops/{companyId}/products/${product['id']}/stock-movements', data: {
      'branchId': _branch, 'quantityChange': int.parse(values['quantity']!) * direction,
      'movementType': direction > 0 ? 'stock_in' : 'stock_out',
      'reason': values['reason'], if (values['batchNumber']!.isNotEmpty) 'batchNumber': values['batchNumber'],
    }));
  }

  Future<void> _run(Future<dynamic> Function() action) async {
    if (_busy) return;
    setState(() { _busy = true; _error = null; });
    try { await action(); await _load(); }
    catch (e) { if (mounted) setState(() => _error = api.friendlyError(e)); }
    finally { if (mounted) setState(() => _busy = false); }
  }

  Future<Map<String, String>?> _form(String title, Map<String, String> values, String? Function(Map<String, String>) validate) async {
    final fields = values.map((k, v) => MapEntry(k, TextEditingController(text: v)));
    String? error;
    final result = await showDialog<Map<String, String>>(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, update) => AlertDialog(
      title: Text(title),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        ...fields.entries.map((e) => Padding(padding: const EdgeInsets.only(bottom: 12), child: TextField(controller: e.value, decoration: InputDecoration(labelText: e.key)))),
        if (error != null) Text(error!, style: TextStyle(color: Theme.of(ctx).colorScheme.error)),
      ])),
      actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        FilledButton(onPressed: () { final data = fields.map((k,v) => MapEntry(k,v.text.trim())); final message = validate(data); if (message != null) { update(() => error = message); return; } Navigator.pop(ctx,data); }, child: const Text('Save'))],
    )));
    // Controllers must outlive the dialog's closing animation.
    await Future<void>.delayed(const Duration(milliseconds: 300));
    for (final c in fields.values) { c.dispose(); }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final rows = _products.where((p) => (!_lowOnly || p['lowStock'] == true) && '${p['name']} ${p['sku']} ${p['barcode']}'.toLowerCase().contains(_search.toLowerCase())).toList();
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(onRefresh: _load, child: ListView(padding: const EdgeInsets.all(16), physics: const AlwaysScrollableScrollPhysics(), children: [
      Row(children: [Expanded(child: Text('Inventory', style: Theme.of(context).textTheme.headlineSmall)), FilledButton.icon(onPressed: _busy ? null : () => _product(), icon: const Icon(Icons.add), label: const Text('Product'))]),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(initialValue: _branch, decoration: const InputDecoration(labelText: 'Branch'), items: [const DropdownMenuItem<String>(value: null, child: Text('All authorized branches')), ..._branches.map((b) => DropdownMenuItem(value: b['id'].toString(), child: Text(b['name'].toString())))], onChanged: _busy ? null : (v) { setState(() => _branch = v); _load(); }),
      TextField(decoration: const InputDecoration(labelText: 'Search name, SKU or barcode', prefixIcon: Icon(Icons.search)), onChanged: (v) => setState(() => _search = v)),
      SwitchListTile(title: const Text('Low stock only'), value: _lowOnly, onChanged: (v) => setState(() => _lowOnly = v)),
      if (_busy) const LinearProgressIndicator(),
      if (_error != null) Padding(padding: const EdgeInsets.all(12), child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
      if (rows.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('No matching products.')),
      ...rows.map((p) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(p['name'].toString(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text('${p['sku'] ?? ''} • ${p['price']} ${p['currency_code']}'),
        Text('On hand: ${p['onHand']} • Reserved: ${p['reserved']} • Available: ${p['available']}'),
        if (p['lowStock'] == true) Text('Low stock — restock required', style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ..._maps(p['inventory']).map((stock) => Text('${stock['branch']?['name'] ?? 'Company stock'} • Batch: ${stock['batch_number'] ?? '—'} • Qty: ${stock['quantity_on_hand']} • Reorder at: ${stock['reorder_level']}')),
        Wrap(spacing: 8, children: [TextButton(onPressed: _busy ? null : () => _product(p), child: const Text('Edit')), TextButton(onPressed: _busy ? null : () => _stock(p, 1), child: const Text('Stock in')), TextButton(onPressed: _busy ? null : () => _stock(p, -1), child: const Text('Stock out'))]),
      ])))),
    ]));
  }
}
