import 'package:flutter_test/flutter_test.dart';
import 'package:lookiva_customer/core/deep_links.dart';

void main() {
  test('maps backend business links into the registered native route', () {
    expect(customerNotificationRoute('/businesses/salon-1'), '/entity/business/salon-1');
    expect(customerNotificationRoute('/en/services/service-1'), '/entity/service/service-1');
    expect(customerNotificationRoute('/chat/conversation-1'), '/messages/conversation-1');
  });
  test('preserves booking and shared look destinations', () {
    expect(customerNotificationRoute('/bookings/booking-1'), '/bookings/booking-1');
    expect(customerNotificationRoute('/reels?postId=look-1'), '/reels?postId=look-1');
  });
  test('rejects external links, unsupported screens and path traversal', () {
    for (final value in ['https://example.com/bookings/1','//example.com/bookings/1','/admin','/entity/business/a%2Fb','/unknown']) {
      expect(customerNotificationRoute(value), isNull);
    }
  });
}
