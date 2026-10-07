import 'package:flutter/material.dart';

import 'lookiva_api.dart';
import 'l10n.dart';

class CustomerModerationPage extends StatefulWidget {
  const CustomerModerationPage({super.key});

  @override
  State<CustomerModerationPage> createState() => _CustomerModerationPageState();
}

class _CustomerModerationPageState extends State<CustomerModerationPage> {
  late Future<List<dynamic>> _future;
  bool _busy = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = Future.wait([
      LookivaApi.instance.get('/platform-ops-v2/moderation/strikes/mine'),
      LookivaApi.instance.get('/platform-ops-v2/moderation/appeals/mine'),
    ]);
  }

  Future<void> _appeal(Map<String, dynamic> strike) async {
    final reason = TextEditingController();
    final ok = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text(ct(context, 'appealModeration')),
            content: TextField(
              controller: reason,
              minLines: 4,
              maxLines: 7,
              decoration: InputDecoration(
                labelText: ct(context, 'appealReason'),
                hintText: ct(context, 'appealReasonHint'),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: Text(ct(context, 'keepAccount')),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(
                  dialogContext,
                  reason.text.trim().length >= 10,
                ),
                child: Text(ct(context, 'submitAppeal')),
              ),
            ],
          ),
        ) ??
        false;
    final text = reason.text.trim();
    reason.dispose();
    if (!ok || text.length < 10) return;

    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await LookivaApi.instance.post(
        '/platform-ops-v2/moderation/appeals',
        data: {
          'targetType': 'strike',
          'targetId': strike['id'],
          'strikeId': strike['id'],
          'reasonReversal': text,
        },
      );
      if (!mounted) return;
      setState(() {
        _message = ct(context, 'appealSubmitted');
        _reload();
      });
      await _future;
    } catch (error) {
      if (mounted) {
        setState(
          () => _message = LookivaApi.instance.friendlyError(error),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(ct(context, 'moderationAppeals'))),
      body: FutureBuilder<List<dynamic>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting &&
              snapshot.data == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError && snapshot.data == null) {
            return RefreshIndicator(
              onRefresh: () async {
                setState(_reload);
                await _future;
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(24),
                children: [
                  const SizedBox(height: 120),
                  Icon(
                    Icons.gavel_outlined,
                    size: 52,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    LookivaApi.instance.friendlyError(snapshot.error!),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          final result = snapshot.data ?? const <dynamic>[];
          final strikes = result.isNotEmpty
              ? (result[0] as List? ?? const [])
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList()
              : <Map<String, dynamic>>[];
          final appeals = result.length > 1
              ? (result[1] as List? ?? const [])
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList()
              : <Map<String, dynamic>>[];

          return RefreshIndicator(
            onRefresh: () async {
              setState(_reload);
              await _future;
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (_message != null) ...[
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Text(_message!),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
                _sectionTitle(
                  context,
                  ct(context, 'myStrikes'),
                  strikes.length,
                ),
                const SizedBox(height: 8),
                if (strikes.isEmpty)
                  _empty(context, ct(context, 'noStrikes'))
                else
                  ...strikes.map((strike) => _strikeCard(context, strike)),
                const SizedBox(height: 22),
                _sectionTitle(
                  context,
                  ct(context, 'myAppeals'),
                  appeals.length,
                ),
                const SizedBox(height: 8),
                if (appeals.isEmpty)
                  _empty(context, ct(context, 'noAppeals'))
                else
                  ...appeals.map((appeal) => _appealCard(context, appeal)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _sectionTitle(BuildContext context, String title, int count) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
        ),
        Chip(label: Text(count.toString())),
      ],
    );
  }

  Widget _empty(BuildContext context, String text) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
    );
  }

  Widget _strikeCard(
    BuildContext context,
    Map<String, dynamic> strike,
  ) {
    final active = strike['is_active'] != false;
    final severity = strike['severity']?.toString() ?? 'warning';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    (strike['reason_type']?.toString() ??
                            ct(context, 'moderationAction'))
                        .replaceAll('_', ' '),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                Chip(
                  label: Text(
                    active ? severity : ct(context, 'inactive'),
                  ),
                ),
              ],
            ),
            if (strike['reason_text'] != null) ...[
              const SizedBox(height: 8),
              Text(strike['reason_text'].toString()),
            ],
            const SizedBox(height: 8),
            Text(
              strike['created_at']?.toString() ?? '',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (active) ...[
              const SizedBox(height: 12),
              FilledButton.tonalIcon(
                onPressed: _busy ? null : () => _appeal(strike),
                icon: const Icon(Icons.gavel_outlined),
                label: Text(ct(context, 'appealModeration')),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _appealCard(
    BuildContext context,
    Map<String, dynamic> appeal,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    (appeal['target_type']?.toString() ?? 'moderation')
                        .replaceAll('_', ' '),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                Chip(
                  label: Text(
                    (appeal['status']?.toString() ?? 'pending')
                        .replaceAll('_', ' '),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(appeal['reason_reversal']?.toString() ?? ''),
            if (appeal['resolution'] != null) ...[
              const SizedBox(height: 10),
              Text(
                ct(context, 'appealResolution') +
                    ': ' +
                    appeal['resolution'].toString(),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ],
            if (appeal['resolution_notes'] != null) ...[
              const SizedBox(height: 6),
              Text(appeal['resolution_notes'].toString()),
            ],
          ],
        ),
      ),
    );
  }
}
