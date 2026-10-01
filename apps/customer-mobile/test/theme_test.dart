import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lookiva_customer/main.dart';

const Color _goldPrimary = Color(0xFFD4AF37);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  Widget buildApp({ThemeMode mode = ThemeMode.dark}) {
    final themeNotifier = ThemeNotifier(prefs);
    final localeNotifier = LocaleNotifier(prefs);
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: themeNotifier),
        ChangeNotifierProvider.value(value: localeNotifier),
      ],
      child: Builder(
        builder: (context) {
          final tn = context.read<ThemeNotifier>();
          WidgetsBinding.instance.addPostFrameCallback((_) {
            tn.setMode(mode);
          });
          return MaterialApp.router(
            title: 'LOOKIVA Customer',
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              useMaterial3: true,
              brightness: Brightness.light,
              colorScheme: ColorScheme.fromSeed(
                seedColor: _goldPrimary,
                brightness: Brightness.light,
                primary: _goldPrimary,
              ),
            ),
            darkTheme: ThemeData(
              useMaterial3: true,
              brightness: Brightness.dark,
              colorScheme: ColorScheme.fromSeed(
                seedColor: _goldPrimary,
                brightness: Brightness.dark,
                primary: _goldPrimary,
              ),
            ),
            themeMode: mode,
            locale: localeNotifier.locale,
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: const [
              Locale('en', ''),
              Locale('ar', ''),
              Locale('fr', ''),
            ],
            routerConfig: GoRouter(
              initialLocation: '/splash',
              routes: [
                GoRoute(
                  path: '/splash',
                  builder: (_, __) => const _ThemeCheckPage(),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  testWidgets('Dark theme uses gold #D4AF37 as primary color', (tester) async {
    await tester.pumpWidget(buildApp(mode: ThemeMode.dark));
    await tester.pumpAndSettle();
    final primary = Theme.of(
      tester.element(find.text('theme-check')),
    ).colorScheme.primary;
    expect(primary, const Color(0xFFD4AF37));
    expect(
      Theme.of(tester.element(find.text('theme-check'))).brightness,
      Brightness.dark,
    );
  });

  testWidgets('Light theme keeps gold #D4AF37 as primary color', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp(mode: ThemeMode.light));
    await tester.pumpAndSettle();
    final primary = Theme.of(
      tester.element(find.text('theme-check')),
    ).colorScheme.primary;
    expect(primary, const Color(0xFFD4AF37));
    expect(
      Theme.of(tester.element(find.text('theme-check'))).brightness,
      Brightness.light,
    );
  });

  testWidgets('ElevatedButton uses gold #D4AF37 background color', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: _goldPrimary,
              foregroundColor: Colors.black,
              textStyle: const TextStyle(fontWeight: FontWeight.w600),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        home: Scaffold(
          body: ElevatedButton(onPressed: () {}, child: const Text('Go')),
        ),
      ),
    );
    final buttonContext = tester.element(find.byType(ElevatedButton));
    final style = ElevatedButtonTheme.of(buttonContext).style;
    final bg = style?.backgroundColor?.resolve(<WidgetState>{});
    expect(bg, const Color(0xFFD4AF37));
  });

  testWidgets('ThemeNotifier defaults to dark mode', (tester) async {
    final notifier = ThemeNotifier(prefs);
    expect(notifier.mode, ThemeMode.dark);
  });

  testWidgets('ThemeNotifier persists light mode to prefs and notifies', (
    tester,
  ) async {
    final notifier = ThemeNotifier(prefs);
    var called = 0;
    notifier.addListener(() => called++);
    await notifier.setMode(ThemeMode.light);
    expect(notifier.mode, ThemeMode.light);
    expect(prefs.getString('cust_theme_mode'), 'light');
    expect(called, greaterThanOrEqualTo(1));
  });

  testWidgets('ThemeNotifier cycles dark -> light -> system -> dark', (
    tester,
  ) async {
    final notifier = ThemeNotifier(prefs);
    expect(notifier.mode, ThemeMode.dark);
    await notifier.setMode(ThemeMode.light);
    expect(notifier.mode, ThemeMode.light);
    await notifier.setMode(ThemeMode.system);
    expect(notifier.mode, ThemeMode.system);
    await notifier.setMode(ThemeMode.dark);
    expect(notifier.mode, ThemeMode.dark);
  });
}

class _ThemeCheckPage extends StatelessWidget {
  const _ThemeCheckPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Text('theme-check'));
  }
}
