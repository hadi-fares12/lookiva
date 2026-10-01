import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lookiva_customer/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  Future<void> disposeSplash(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(milliseconds: 150));
  }

  Widget buildSplash() {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeNotifier(prefs)),
        ChangeNotifierProvider(create: (_) => LocaleNotifier(prefs)),
      ],
      child: MaterialApp.router(
        themeMode: ThemeMode.dark,
        darkTheme: ThemeData(useMaterial3: true, brightness: Brightness.dark),
        routerConfig: GoRouter(
          initialLocation: '/splash',
          routes: [
            GoRoute(
              path: '/splash',
              builder: (_, __) => const SplashScreen(),
            ),
            GoRoute(
              path: '/onboarding',
              builder: (_, __) => const Scaffold(body: Text('onboarding')),
            ),
            GoRoute(
              path: '/home',
              builder: (_, __) => const Scaffold(body: Text('home')),
            ),
            GoRoute(
              path: '/login',
              builder: (_, __) => const Scaffold(body: Text('login')),
            ),
          ],
        ),
      ),
    );
  }

  testWidgets('SplashScreen renders LOOKIVA brand title in gold color',
      (tester) async {
    await tester.pumpWidget(buildSplash());
    await tester.pump(const Duration(milliseconds: 50));
    final finder = find.text('LOOKIVA');
    expect(finder, findsOneWidget);
    final text = tester.widget<Text>(finder);
    expect(text.style?.color, const Color(0xFFD4AF37));
    expect(text.style?.fontWeight, FontWeight.w900);
    await disposeSplash(tester);
  });

  testWidgets('SplashScreen renders Premium Beauty & Wellness tagline',
      (tester) async {
    await tester.pumpWidget(buildSplash());
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Premium Beauty & Wellness'), findsOneWidget);
    await disposeSplash(tester);
  });

  testWidgets('SplashScreen shows gold CircularProgressIndicator',
      (tester) async {
    await tester.pumpWidget(buildSplash());
    await tester.pump(const Duration(milliseconds: 50));
    final indicator = find.byType(CircularProgressIndicator);
    expect(indicator, findsOneWidget);
    final progress = tester.widget<CircularProgressIndicator>(indicator);
    expect(
      progress.valueColor,
      const AlwaysStoppedAnimation<Color>(Color(0xFFD4AF37)),
    );
    await disposeSplash(tester);
  });
}
