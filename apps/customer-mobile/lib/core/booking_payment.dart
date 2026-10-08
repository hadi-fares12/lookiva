import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'lookiva_api.dart';
import 'l10n.dart';

Future<bool> showBookingPaymentFlow(
  BuildContext context, {
  required String appointmentId,
  required String companyId,
}) async {
  final raw = await LookivaApi.instance
      .get('/finance-v2/appointments/' + appointmentId + '/payment-options');
  if (!context.mounted) return false;

  final options = raw is Map
      ? Map<String, dynamic>.from(raw)
      : <String, dynamic>{};
  final remainingDeposit =
      double.tryParse(options['remainingDeposit']?.toString() ?? '') ?? 0;
  if (remainingDeposit <= 0) return true;

  final methods = (options['methods'] as List? ?? const [])
      .whereType<Map>()
      .map((row) => Map<String, dynamic>.from(row))
      .where((row) => row['available'] == true)
      .toList();

  if (methods.isEmpty) {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(ct(context, 'paymentRequired')),
        content: Text(ct(context, 'noPaymentMethods')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(ct(context, 'done')),
          ),
        ],
      ),
    );
    return false;
  }

  String method = methods.first['key'].toString();
  final giftCode = TextEditingController();
  bool submitting = false;
  String? error;

  final paid = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text(ct(context, 'paymentRequired')),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                ct(context, 'amountDueNow') +
                    ': ' +
                    remainingDeposit.toStringAsFixed(2) +
                    ' ' +
                    (options['currencyCode']?.toString() ?? ''),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: method,
                decoration: InputDecoration(
                  labelText: ct(context, 'paymentMethod'),
                ),
                items: methods
                    .map(
                      (row) => DropdownMenuItem<String>(
                        value: row['key'].toString(),
                        child: Text(
                          row['label']?.toString() ?? row['key'].toString(),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: submitting
                    ? null
                    : (value) => setLocal(() {
                          method = value ?? method;
                          error = null;
                        }),
              ),
              if (method == 'gift_card') ...[
                const SizedBox(height: 12),
                TextField(
                  controller: giftCode,
                  enabled: !submitting,
                  decoration: InputDecoration(
                    labelText: ct(context, 'giftCardCode'),
                  ),
                ),
              ],
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(
                  error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: submitting
                ? null
                : () => Navigator.pop(dialogContext, false),
            child: Text(ct(context, 'keepBooking')),
          ),
          FilledButton(
            onPressed: submitting
                ? null
                : () async {
                    if (method == 'gift_card' &&
                        giftCode.text.trim().isEmpty) {
                      setLocal(() => error = ct(context, 'giftCardCode'));
                      return;
                    }
                    setLocal(() {
                      submitting = true;
                      error = null;
                    });
                    try {
                      final paymentRaw = await LookivaApi.instance.post(
                        '/finance-v2/payments',
                        data: {
                          'companyId': companyId,
                          'appointmentId': appointmentId,
                          'paymentMethod': method,
                          'currencyCode': options['currencyCode'],
                          'amount': remainingDeposit,
                          'depositAmount': remainingDeposit,
                          if (method == 'gift_card')
                            'referenceCode':
                                giftCode.text.trim().toUpperCase(),
                          if (method == 'online_card')
                            'idempotencyKey': 'booking:' +
                                appointmentId +
                                ':deposit:' +
                                remainingDeposit.toStringAsFixed(2),
                          'notes': 'Required booking deposit',
                        },
                      );
                      final payment = paymentRaw is Map
                          ? Map<String, dynamic>.from(paymentRaw)
                          : <String, dynamic>{};
                      final gateway = payment['gateway_response'];
                      final checkoutUrl = gateway is Map
                          ? gateway['checkoutUrl']?.toString()
                          : null;
                      if (payment['status'] == 'pending' &&
                          checkoutUrl != null &&
                          checkoutUrl.isNotEmpty) {
                        final uri = Uri.tryParse(checkoutUrl);
                        if (uri != null) {
                          await launchUrl(
                            uri,
                            mode: LaunchMode.externalApplication,
                          );
                        }
                        if (dialogContext.mounted) {
                          Navigator.pop(dialogContext, false);
                        }
                        return;
                      }
                      if (payment['status'] == 'succeeded') {
                        if (dialogContext.mounted) {
                          Navigator.pop(dialogContext, true);
                        }
                        return;
                      }
                      setLocal(() {
                        submitting = false;
                        error = ct(context, 'paymentPending');
                      });
                    } catch (paymentError) {
                      setLocal(() {
                        submitting = false;
                        error =
                            LookivaApi.instance.friendlyError(paymentError);
                      });
                    }
                  },
            child: Text(
              submitting ? ct(context, 'paying') : ct(context, 'payDeposit'),
            ),
          ),
        ],
      ),
    ),
  );

  giftCode.dispose();
  return paid == true;
}
