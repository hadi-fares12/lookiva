import 'package:share_plus/share_plus.dart';

const String _publicWebBase =
    String.fromEnvironment('LOOKIVA_PUBLIC_WEB_URL', defaultValue: '');

Future<void> shareLookiva({
  required String title,
  required String text,
  String? path,
}) async {
  final base = _publicWebBase.trim().replaceAll(RegExp(r'/$'), '');
  final suffix = path != null && path.trim().isNotEmpty && base.isNotEmpty
      ? '\n' + base + (path.startsWith('/') ? path : '/$path')
      : '';
  await SharePlus.instance.share(
    ShareParams(
      title: title,
      subject: title,
      text: text.trim() + suffix,
    ),
  );
}
