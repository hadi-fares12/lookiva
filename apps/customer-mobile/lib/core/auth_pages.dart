import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'l10n.dart';
import 'lookiva_api.dart';

class CustomerRegisterPage extends StatefulWidget {
  const CustomerRegisterPage({super.key});

  @override
  State<CustomerRegisterPage> createState() => _CustomerRegisterPageState();
}

class _CustomerRegisterPageState extends State<CustomerRegisterPage> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _acceptTerms = false;
  bool _obscure = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_firstName.text.trim().length < 2 ||
        _lastName.text.trim().length < 2 ||
        _password.text.length < 8 ||
        (_email.text.trim().isEmpty && _phone.text.trim().isEmpty)) {
      setState(() => _error = ct(context, 'registerMissing'));
      return;
    }
    if (!_acceptTerms) {
      setState(() => _error = ct(context, 'termsRequired'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await LookivaApi.instance.register(
        firstName: _firstName.text,
        lastName: _lastName.text,
        email: _email.text,
        phone: _phone.text,
        password: _password.text,
        locale: Localizations.localeOf(context).languageCode,
      );
      if (mounted) context.go('/home');
    } catch (error) {
      if (mounted) {
        setState(() => _error = LookivaApi.instance.friendlyError(error));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(ct(context, 'createAccount'))),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Text(
                ct(context, 'createAccount'),
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 8),
              Text(ct(context, 'registerBody')),
              const SizedBox(height: 24),
              if (_error != null) ...[
                _ErrorBox(message: _error!),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: _firstName,
                enabled: !_busy,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(labelText: ct(context, 'firstName')),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _lastName,
                enabled: !_busy,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(labelText: ct(context, 'lastName')),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _email,
                enabled: !_busy,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: ct(context, 'email'),
                  prefixIcon: const Icon(Icons.email_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phone,
                enabled: !_busy,
                keyboardType: TextInputType.phone,
                autofillHints: const [AutofillHints.telephoneNumber],
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: ct(context, 'phoneOptional'),
                  hintText: '+96170123456',
                  prefixIcon: const Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                enabled: !_busy,
                obscureText: _obscure,
                autofillHints: const [AutofillHints.newPassword],
                onSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: ct(context, 'password'),
                  prefixIcon: const Icon(Icons.lock_outline),
                  helperText: ct(context, 'passwordHint'),
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => _obscure = !_obscure),
                    icon: Icon(
                      _obscure
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              CheckboxListTile(
                value: _acceptTerms,
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                onChanged: _busy
                    ? null
                    : (value) => setState(() => _acceptTerms = value ?? false),
                title: Text(ct(context, 'acceptTerms')),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _busy ? null : _submit,
                icon: _busy
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.person_add_alt_1_rounded),
                label: Text(
                  _busy ? ct(context, 'registering') : ct(context, 'createAccount'),
                ),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: _busy ? null : () => context.go('/login'),
                child: Text(ct(context, 'alreadyAccount')),
              ),
            ],
          ),
        ),
      );
}

class CustomerForgotPasswordPage extends StatefulWidget {
  const CustomerForgotPasswordPage({super.key});

  @override
  State<CustomerForgotPasswordPage> createState() =>
      _CustomerForgotPasswordPageState();
}

class _CustomerForgotPasswordPageState
    extends State<CustomerForgotPasswordPage> {
  final _email = TextEditingController();
  bool _busy = false;
  String? _error;
  bool _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_email.text.contains('@')) {
      setState(() => _error = ct(context, 'validEmailRequired'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await LookivaApi.instance.forgotPassword(_email.text);
      if (mounted) setState(() => _sent = true);
    } catch (error) {
      if (mounted) {
        setState(() => _error = LookivaApi.instance.friendlyError(error));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(ct(context, 'forgotPassword'))),
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
                      _sent ? Icons.mark_email_read_rounded : Icons.lock_reset_rounded,
                      size: 64,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      _sent
                          ? ct(context, 'resetSentTitle')
                          : ct(context, 'forgotPassword'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _sent
                          ? ct(context, 'resetSentBody')
                          : ct(context, 'forgotPasswordBody'),
                      textAlign: TextAlign.center,
                    ),
                    if (!_sent) ...[
                      const SizedBox(height: 24),
                      if (_error != null) ...[
                        _ErrorBox(message: _error!),
                        const SizedBox(height: 12),
                      ],
                      TextField(
                        controller: _email,
                        enabled: !_busy,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        onSubmitted: (_) => _submit(),
                        decoration: InputDecoration(
                          labelText: ct(context, 'email'),
                          prefixIcon: const Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _busy ? null : _submit,
                        child: Text(
                          _busy ? ct(context, 'working') : ct(context, 'sendReset'),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: Text(ct(context, 'backToSignIn')),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

class CustomerResetPasswordPage extends StatefulWidget {
  final String initialToken;
  const CustomerResetPasswordPage({super.key, this.initialToken = ''});

  @override
  State<CustomerResetPasswordPage> createState() =>
      _CustomerResetPasswordPageState();
}

class _CustomerResetPasswordPageState extends State<CustomerResetPasswordPage> {
  late final TextEditingController _token =
      TextEditingController(text: widget.initialToken);
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_token.text.trim().isEmpty || _password.text.length < 8) {
      setState(() => _error = ct(context, 'resetMissing'));
      return;
    }
    if (_password.text != _confirm.text) {
      setState(() => _error = ct(context, 'passwordMismatch'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await LookivaApi.instance.resetPassword(_token.text, _password.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ct(context, 'passwordResetSuccess'))),
      );
      context.go('/login');
    } catch (error) {
      if (mounted) {
        setState(() => _error = LookivaApi.instance.friendlyError(error));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(ct(context, 'resetPassword'))),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              if (_error != null) ...[
                _ErrorBox(message: _error!),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: _token,
                enabled: !_busy,
                minLines: 1,
                maxLines: 3,
                decoration: InputDecoration(labelText: ct(context, 'resetToken')),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                enabled: !_busy,
                obscureText: _obscure,
                autofillHints: const [AutofillHints.newPassword],
                decoration: InputDecoration(
                  labelText: ct(context, 'newPassword'),
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => _obscure = !_obscure),
                    icon: Icon(
                      _obscure
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _confirm,
                enabled: !_busy,
                obscureText: _obscure,
                onSubmitted: (_) => _submit(),
                decoration:
                    InputDecoration(labelText: ct(context, 'confirmPassword')),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: Text(
                  _busy ? ct(context, 'working') : ct(context, 'resetPassword'),
                ),
              ),
            ],
          ),
        ),
      );
}

class _ErrorBox extends StatelessWidget {
  final String message;
  const _ErrorBox({required this.message});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.error.withValues(alpha: .10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Theme.of(context).colorScheme.error.withValues(alpha: .35),
          ),
        ),
        child: Text(
          message,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
      );
}
