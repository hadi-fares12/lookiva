import 'package:flutter_test/flutter_test.dart';
import 'package:lookiva_customer/main.dart';

void main() {
  test('LOOKIVA customer app root is constructible', () {
    const app = LookivaCustomerApp();
    expect(app, isA<LookivaCustomerApp>());
  });
}
