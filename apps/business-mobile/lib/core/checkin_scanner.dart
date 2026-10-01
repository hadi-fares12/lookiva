import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'l10n.dart';
import 'lookiva_api.dart';

class BusinessCheckInScannerPage extends StatefulWidget {
  const BusinessCheckInScannerPage({super.key});

  @override
  State<BusinessCheckInScannerPage> createState() => _BusinessCheckInScannerPageState();
}

class _BusinessCheckInScannerPageState extends State<BusinessCheckInScannerPage> {
  final MobileScannerController _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool _busy = false;
  String? _message;
  bool _success = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String? _appointmentId(String raw) {
    final value = raw.trim();
    final uri = Uri.tryParse(value);
    if (uri != null && uri.scheme == 'lookiva' && uri.host == 'appointment' && uri.pathSegments.isNotEmpty) {
      return uri.pathSegments.first;
    }
    if (RegExp(r'^[A-Za-z0-9_-]{10,80}$').hasMatch(value)) return value;
    return null;
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_busy) return;
    final raw = capture.barcodes
        .map((barcode) => barcode.rawValue)
        .whereType<String>()
        .firstOrNull;
    if (raw == null) return;

    final appointmentId = _appointmentId(raw);
    if (appointmentId == null) {
      setState(() {
        _message = bt(context, 'invalidBookingQr');
        _success = false;
      });
      return;
    }

    setState(() {
      _busy = true;
      _message = bt(context, 'checkingIn');
      _success = false;
    });
    await _controller.stop();

    try {
      await LookivaBusinessApi.instance.patch(
        '/booking-v2/appointments/$appointmentId/check-in',
        data: const <String, dynamic>{},
      );
      if (!mounted) return;
      setState(() {
        _message = bt(context, 'checkInSuccess');
        _success = true;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _message = LookivaBusinessApi.instance.friendlyError(error);
        _success = false;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _scanAgain() async {
    setState(() {
      _message = null;
      _success = false;
      _busy = false;
    });
    await _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(bt(context, 'scanCheckIn'))),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
              child: MobileScanner(
                controller: _controller,
                onDetect: _onDetect,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Icon(
                  _success ? Icons.check_circle_rounded : Icons.qr_code_scanner_rounded,
                  size: 56,
                  color: _success
                      ? Colors.green
                      : Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 12),
                Text(
                  _message ?? bt(context, 'scanQrBody'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                ),
                const SizedBox(height: 18),
                if (_message != null)
                  FilledButton.icon(
                    onPressed: _busy ? null : _scanAgain,
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: Text(bt(context, 'scanAnother')),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}
