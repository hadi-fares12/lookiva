import 'package:flutter/material.dart';
import 'lookiva_api.dart';

/// Records money already received by staff; never initiates a terminal charge.
Future<bool> collectFloorPayment(BuildContext context, Map<String, dynamic> appointment) async {
  final api = LookivaBusinessApi.instance;
  final session = await api.restoreSession();
  if (session == null) throw StateError('Please sign in again.');
  final options = await api.getScoped('/finance-v2/appointments/${appointment['id']}/payment-options');
  final amount = double.tryParse('${options['remainingTotal']}');
  if (amount == null || !amount.isFinite) throw StateError('Unable to load the booking balance.');
  if (amount <= 0) {
    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('This booking is already paid.')));
    return false;
  }
  final customerId = appointment['customer']?['id']?.toString();
  if (customerId == null) throw StateError('This booking has no customer payment profile.');
  if (!context.mounted) return false;
  final messenger = ScaffoldMessenger.of(context);
  final reference = TextEditingController();
  var method = 'cash';
  var submitting = false;
  String? error;
  final result = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) => StatefulBuilder(builder: (context, setLocal) => PopScope(
      canPop: !submitting,
      child: AlertDialog(
        title: const Text('Record received payment'),
        content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Remaining balance: ${amount.toStringAsFixed(2)} ${options['currencyCode']}'),
          const SizedBox(height: 12),
          const Text('Confirm only after receiving cash or a successful payment on your card terminal.'),
          DropdownButtonFormField<String>(
            initialValue: method,
            items: const [DropdownMenuItem(value: 'cash', child: Text('Cash received')), DropdownMenuItem(value: 'card_terminal', child: Text('Card terminal payment received'))],
            onChanged: submitting ? null : (value) => setLocal(() => method = value!),
          ),
          if (method == 'card_terminal') TextField(controller: reference, enabled: !submitting, decoration: const InputDecoration(labelText: 'Terminal transaction reference (required)')),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
        ])),
        actions: [
          TextButton(onPressed: submitting ? null : () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          FilledButton(onPressed: submitting ? null : () async {
            if (method == 'card_terminal' && reference.text.trim().isEmpty) {
              setLocal(() => error = 'Enter the successful terminal transaction reference.');
              return;
            }
            setLocal(() { submitting = true; error = null; });
            try {
              await api.postScoped('/finance-v2/payments', data: {
                'companyId': session.companyId, 'appointmentId': appointment['id'], 'customerId': customerId,
                'paymentMethod': method, 'currencyCode': options['currencyCode'], 'amount': amount,
                if (method == 'card_terminal') 'referenceCode': reference.text.trim(),
              });
              if (dialogContext.mounted) Navigator.pop(dialogContext, true);
            } catch (failure) {
              // Close on an ambiguous result. A fresh attempt must reload the balance.
              if (dialogContext.mounted) Navigator.pop(dialogContext, false);
              if (messenger.mounted) messenger.showSnackBar(SnackBar(content: Text('${api.friendlyError(failure)} Refresh Payments before trying again.')));
            }
          }, child: Text(submitting ? 'Recording…' : 'Confirm received')),
        ],
      ),
    )),
  );
  // Dialog routes animate out before releasing their text fields.
  Future<void>.delayed(const Duration(milliseconds: 300), reference.dispose);
  return result == true;
}
