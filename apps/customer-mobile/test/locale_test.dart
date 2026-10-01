import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lookiva_customer/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  Widget buildAppWithLocale(Locale locale) {
    final localeNotifier = LocaleNotifier(prefs);
    final themeNotifier = ThemeNotifier(prefs);
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: themeNotifier),
        ChangeNotifierProvider.value(value: localeNotifier),
      ],
      child: Builder(
        builder: (context) {
          final notifier = context.read<LocaleNotifier>();
          WidgetsBinding.instance.addPostFrameCallback((_) {
            notifier.setLocale(locale);
          });
          return MaterialApp(
            theme: ThemeData(useMaterial3: true),
            locale: locale,
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: const [
              Locale('en'),
              Locale('ar'),
              Locale('fr'),
            ],
            home: const _LocaleCheckShell(),
          );
        },
      ),
    );
  }

  testWidgets('Arabic (ar) locale wraps Directionality with RTL',
      (tester) async {
    await tester.pumpWidget(buildAppWithLocale(const Locale('ar')));
    await tester.pumpAndSettle();
    final text = tester.widget<Text>(find.text('dir-check'));
    expect(text.data, 'dir-check');
    final dirFinder = find.byWidgetPredicate(
      (w) => w is Directionality && w.textDirection == TextDirection.rtl,
    );
    expect(dirFinder, findsWidgets);
  });

  testWidgets('English (en) locale keeps Directionality LTR',
      (tester) async {
    await tester.pumpWidget(buildAppWithLocale(const Locale('en')));
    await tester.pumpAndSettle();
    final dirFinder = find.byWidgetPredicate(
      (w) => w is Directionality && w.textDirection == TextDirection.ltr,
    );
    expect(dirFinder, findsWidgets);
  });

  testWidgets('French (fr) locale keeps Directionality LTR',
      (tester) async {
    await tester.pumpWidget(buildAppWithLocale(const Locale('fr')));
    await tester.pumpAndSettle();
    final dirFinder = find.byWidgetPredicate(
      (w) => w is Directionality && w.textDirection == TextDirection.ltr,
    );
    expect(dirFinder, findsWidgets);
  });

  testWidgets('LocaleNotifier defaults to English (en)', (tester) async {
    final notifier = LocaleNotifier(prefs);
    expect(notifier.locale, const Locale('en'));
  });

  testWidgets('LocaleNotifier persists ar to prefs and notifies',
      (tester) async {
    final notifier = LocaleNotifier(prefs);
    var called = 0;
    notifier.addListener(() => called++);
    await notifier.setLocale(const Locale('ar'));
    expect(notifier.locale, const Locale('ar'));
    expect(prefs.getString('cust_locale_code'), 'ar');
    expect(called, greaterThanOrEqualTo(1));
  });
}

class _LocaleCheckShell extends StatelessWidget {
  const _LocaleCheckShell();

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final isAr = locale.languageCode == 'ar';
    return Directionality(
      textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
      child: const Scaffold(body: Text('dir-check')),
    );
  }
}
