import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'l10n.dart';
import 'lookiva_api.dart';

class BusinessForgotPasswordPage extends StatefulWidget {
  const BusinessForgotPasswordPage({super.key});

  @override
  State<BusinessForgotPasswordPage> createState() =>
      _BusinessForgotPasswordPageState();
}

class _BusinessForgotPasswordPageState
    extends State<BusinessForgotPasswordPage> {
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_email.text.contains('@')) {
      setState(() => _error = bt(context, 'validEmailRequired'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await LookivaBusinessApi.instance.forgotPassword(_email.text);
      if (mounted) setState(() => _sent = true);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = LookivaBusinessApi.instance.friendlyError(error),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(bt(context, 'forgotPassword'))),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(
                      _sent
                          ? Icons.mark_email_read_rounded
                          : Icons.lock_reset_rounded,
                      size: 64,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      _sent
                          ? bt(context, 'resetSentTitle')
                          : bt(context, 'forgotPassword'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _sent
                          ? bt(context, 'resetSentBody')
                          : bt(context, 'forgotPasswordBody'),
                      textAlign: TextAlign.center,
                    ),
                    if (!_sent) ...[
                      const SizedBox(height: 24),
                      if (_error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .error
                                .withValues(alpha: .10),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Theme.of(context)
                                  .colorScheme
                                  .error
                                  .withValues(alpha: .35),
                            ),
                          ),
                          child: Text(
                            _error!,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextField(
                        controller: _email,
                        enabled: !_busy,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        onSubmitted: (_) => _submit(),
                        decoration: InputDecoration(
                          labelText: bt(context, 'email'),
                          prefixIcon: const Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _busy ? null : _submit,
                        child: Text(
                          _busy
                              ? bt(context, 'working')
                              : bt(context, 'sendReset'),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: Text(bt(context, 'backToSignIn')),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}
