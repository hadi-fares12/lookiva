import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'lookiva_api.dart';
import 'l10n.dart';

class BusinessCheckInScannerPage extends StatefulWidget {
  const BusinessCheckInScannerPage({super.key});

  @override
  State<BusinessCheckInScannerPage> createState() =>
      _BusinessCheckInScannerPageState();
}

class _BusinessCheckInScannerPageState
    extends State<BusinessCheckInScannerPage> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  bool _submitting = false;
  String? _message;
  bool _success = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleCapture(BarcodeCapture capture) async {
    if (_submitting || capture.barcodes.isEmpty) return;
    final raw = capture.barcodes.first.rawValue?.trim();
    if (raw == null || raw.isEmpty) return;

    setState(() {
      _submitting = true;
      _message = null;
      _success = false;
    });
    await _controller.stop();

    try {
      final result = await LookivaBusinessApi.instance.patchScoped(
        '/booking-v2/appointments/check-in-by-token',
        data: {'token': raw},
      );
      if (!mounted) return;
      final bookingId =
          result is Map ? result['id']?.toString() : null;
      setState(() {
        _success = true;
        _message = bookingId == null
            ? bt(context, 'checkInSuccess')
            : '${bt(context, 'checkInSuccess')} • $bookingId';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _success = false;
        _message = LookivaBusinessApi.instance.friendlyError(error);
      });
      await _controller.start();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _scanAnother() async {
    setState(() {
      _message = null;
      _success = false;
    });
    await _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(bt(context, 'scanCheckInQr')),
        actions: [
          IconButton(
            tooltip: bt(context, 'toggleTorch'),
            onPressed: () => _controller.toggleTorch(),
            icon: const Icon(Icons.flashlight_on_outlined),
          ),
          IconButton(
            tooltip: bt(context, 'switchCamera'),
            onPressed: () => _controller.switchCamera(),
            icon: const Icon(Icons.cameraswitch_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(
                    controller: _controller,
                    onDetect: _handleCapture,
                    errorBuilder: (context, error) => Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          error.errorDetails?.message ??
                              bt(context, 'cameraUnavailable'),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  ),
                  IgnorePointer(
                    child: Center(
                      child: Container(
                        width: 250,
                        height: 250,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: Theme.of(context).colorScheme.primary,
                            width: 3,
                          ),
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                    ),
                  ),
                  if (_submitting)
                    Container(
                      color: Colors.black45,
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                ],
              ),
            ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  Text(
                    bt(context, 'scanQrHint'),
                    textAlign: TextAlign.center,
                  ),
                  if (_message != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: (_success
                                ? Colors.green
                                : Theme.of(context).colorScheme.error)
                            .withValues(alpha: .10),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _message!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _success
                              ? Colors.green
                              : Theme.of(context).colorScheme.error,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                  if (_success) ...[
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _scanAnother,
                      icon: const Icon(Icons.qr_code_scanner_rounded),
                      label: Text(bt(context, 'scanAnother')),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
