import 'package:flutter_test/flutter_test.dart';
import 'package:lookiva_business/main.dart';

void main() {
  test('LOOKIVA business app root is constructible', () {
    const app = LookivaBusinessApp();
    expect(app, isA<LookivaBusinessApp>());
  });
}
