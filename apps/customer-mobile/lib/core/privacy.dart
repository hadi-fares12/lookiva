import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import 'lookiva_api.dart';
import 'l10n.dart';
import 'mobile_services.dart';

class CustomerPrivacyPage extends StatefulWidget {
  const CustomerPrivacyPage({super.key});

  @override
  State<CustomerPrivacyPage> createState() => _CustomerPrivacyPageState();
}

class _CustomerPrivacyPageState extends State<CustomerPrivacyPage> {
  bool _busy = false;
  String? _message;

  Future<void> _copyExport() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final data = await LookivaApi.instance.get('/customer/privacy/export');
      final pretty = const JsonEncoder.withIndent('  ').convert(data);
      await Clipboard.setData(ClipboardData(text: pretty));
      if (mounted) {
        setState(() => _message = ct(context, 'privacyCopied'));
      }
    } catch (error) {
      if (mounted) {
        setState(() => _message = LookivaApi.instance.friendlyError(error));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteAccount() async {
    final controller = TextEditingController();
    final confirmed = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (dialogContext) => AlertDialog(
            title: Text(ct(context, 'deleteAccount')),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(ct(context, 'deleteAccountWarning')),
                const SizedBox(height: 14),
                Text(
                  ct(context, 'deletePhrase'),
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: controller,
                  decoration: const InputDecoration(
                    hintText: 'DELETE MY ACCOUNT',
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: Text(ct(context, 'keepAccount')),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(
                  dialogContext,
                  controller.text.trim() == 'DELETE MY ACCOUNT',
                ),
                child: Text(ct(context, 'deleteAccount')),
              ),
            ],
          ),
        ) ??
        false;
    controller.dispose();
    if (!confirmed || !mounted) return;

    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await LookivaApi.instance.post(
        '/customer/privacy/delete',
        data: {'confirmation': 'DELETE MY ACCOUNT'},
      );
      await CustomerMobileServices.instance.onSignedOut();
      await LookivaApi.instance.clearSession();
      if (mounted) context.go('/login');
    } catch (error) {
      if (mounted) {
        setState(() => _message = LookivaApi.instance.friendlyError(error));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(ct(context, 'privacyData'))),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ct(context, 'downloadMyData'),
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  Text(ct(context, 'privacyExportInfo')),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _busy ? null : _copyExport,
                    icon: const Icon(Icons.copy_all_rounded),
                    label: Text(ct(context, 'copyDataExport')),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ct(context, 'deleteAccount'),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Theme.of(context).colorScheme.error,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(ct(context, 'deleteAccountWarning')),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _deleteAccount,
                    icon: const Icon(Icons.delete_forever_outlined),
                    label: Text(ct(context, 'deleteAccount')),
                  ),
                ],
              ),
            ),
          ),
          if (_message != null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Text(_message!),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
