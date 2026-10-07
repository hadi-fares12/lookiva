import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:go_router/go_router.dart';
import 'core/lookiva_api.dart';
import 'core/remote_page.dart';
import 'core/discovery_home.dart';
import 'core/discovery_search.dart';
import 'core/entity_detail.dart';
import 'core/booking_flow.dart';
import 'core/account_hub.dart';
import 'core/bookings.dart';
import 'core/chat.dart';
import 'core/l10n.dart';
import 'core/privacy.dart';
import 'core/mobile_services.dart';

const String _prefThemeMode = 'cust_theme_mode';
const String _prefLocale = 'cust_locale_code';

const Color _goldPrimary = Color(0xFFD4AF37);
const Color _goldVariant1 = Color(0xFFC9A227);
const Color _goldVariant2 = Color(0xFFE4C35A);
const Color _silverPrimary = Color(0xFFA7ABB2);

ThemeData _buildMidnightGold() {
  const surface0 = Color(0xFF080808);
  const surface1 = Color(0xFF101010);
  const surface2 = Color(0xFF151515);

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: _goldPrimary,
      brightness: Brightness.dark,
      primary: _goldPrimary,
      onPrimary: surface0,
      primaryContainer: _goldVariant1,
      onPrimaryContainer: surface0,
      secondary: _silverPrimary,
      onSecondary: Colors.white,
      surface: surface1,
      onSurface: Colors.white,
      surfaceContainerHighest: surface2,
      error: const Color(0xFFE5484D),
      onError: Colors.white,
    ),
    scaffoldBackgroundColor: surface0,
    appBarTheme: const AppBarTheme(
      backgroundColor: surface0,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardThemeData(
      color: surface1,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.06)),
      ),
    ),
    dividerColor: Colors.white.withValues(alpha: 0.08),
    fontFamily: 'Inter',
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w700,
        letterSpacing: 4,
      ),
      headlineLarge: TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.5,
      ),
      titleLarge: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
      bodyLarge: TextStyle(color: Color(0xFFE4E4E7)),
      bodyMedium: TextStyle(color: Color(0xFFA1A1AA)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _goldPrimary,
        foregroundColor: surface0,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _goldPrimary,
        side: BorderSide(color: _goldPrimary.withValues(alpha: 0.4)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface1,
      hintStyle: const TextStyle(color: Color(0xFF71717A)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _goldPrimary, width: 1.5),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: surface1,
      selectedItemColor: _goldPrimary,
      unselectedItemColor: Color(0xFF71717A),
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
  );
}

ThemeData _buildSilverLight() {
  const surface0 = Color(0xFFFFFFFF);
  const surface1 = Color(0xFFF7F7F8);
  const surface2 = Color(0xFFECEDEF);

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: _silverPrimary,
      brightness: Brightness.light,
      primary: _goldPrimary,
      onPrimary: surface0,
      primaryContainer: _goldVariant2.withValues(alpha: 0.15),
      onPrimaryContainer: const Color(0xFF242424),
      secondary: _silverPrimary,
      onSecondary: const Color(0xFF242424),
      surface: surface1,
      onSurface: const Color(0xFF111111),
      surfaceContainerHighest: surface2,
      error: const Color(0xFFD70015),
      onError: Colors.white,
    ),
    scaffoldBackgroundColor: surface0,
    appBarTheme: const AppBarTheme(
      backgroundColor: surface0,
      foregroundColor: Color(0xFF111111),
      elevation: 0,
      centerTitle: true,
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardThemeData(
      color: surface1,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.black.withValues(alpha: 0.05)),
      ),
    ),
    dividerColor: Colors.black.withValues(alpha: 0.08),
    fontFamily: 'Inter',
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        color: Color(0xFF111111),
        fontWeight: FontWeight.w700,
        letterSpacing: 4,
      ),
      headlineLarge: TextStyle(
        color: Color(0xFF111111),
        fontWeight: FontWeight.w700,
        letterSpacing: -0.5,
      ),
      titleLarge: TextStyle(
        color: Color(0xFF111111),
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: TextStyle(color: Color(0xFF242424)),
      bodyMedium: TextStyle(color: Color(0xFF52525B)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _goldPrimary,
        foregroundColor: const Color(0xFF111111),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _goldPrimary,
        side: BorderSide(color: _goldPrimary.withValues(alpha: 0.4)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface1,
      hintStyle: const TextStyle(color: Color(0xFFA1A1AA)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _goldPrimary, width: 1.5),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: surface1,
      selectedItemColor: _goldPrimary,
      unselectedItemColor: Color(0xFF71717A),
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
  );
}

class ThemeNotifier extends ChangeNotifier {
  final SharedPreferences _prefs;
  ThemeMode _mode = ThemeMode.dark;

  ThemeNotifier(this._prefs) {
    final stored = _prefs.getString(_prefThemeMode);
    switch (stored) {
      case 'light':
        _mode = ThemeMode.light;
        break;
      case 'system':
        _mode = ThemeMode.system;
        break;
      default:
        _mode = ThemeMode.dark;
    }
  }

  ThemeMode get mode => _mode;

  Future<void> setMode(ThemeMode mode) async {
    _mode = mode;
    notifyListeners();
    final value = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.system => 'system',
      _ => 'dark',
    };
    await _prefs.setString(_prefThemeMode, value);
  }
}

class LocaleNotifier extends ChangeNotifier {
  final SharedPreferences _prefs;
  Locale _locale = const Locale('en');

  LocaleNotifier(this._prefs) {
    final code = _prefs.getString(_prefLocale);
    if (code != null && ['en', 'ar', 'fr'].contains(code)) {
      _locale = Locale(code);
    }
  }

  Locale get locale => _locale;

  Future<void> setLocale(Locale locale) async {
    _locale = locale;
    notifyListeners();
    await _prefs.setString(_prefLocale, locale.languageCode);
  }
}

final GoRouter _router = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingPage(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const CustomerHomePage(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const CustomerLoginPage(),
    ),
    GoRoute(
      path: '/account/privacy',
      builder: (context, state) => const CustomerPrivacyPage(),
    ),
    GoRoute(
      path: '/account/:section',
      builder: (context, state) => CustomerRemotePage(
        section: state.pathParameters['section'] ?? 'account',
      ),
    ),
    GoRoute(
      path: '/entity/:type/:id',
      builder: (context, state) => CustomerEntityDetailPage(
        type: state.pathParameters['type'] ?? 'service',
        id: state.pathParameters['id'] ?? '',
      ),
    ),
    GoRoute(
      path: '/book/:serviceId',
      builder: (context, state) => CustomerBookingPage(
        serviceId: state.pathParameters['serviceId'] ?? '',
      ),
    ),
    GoRoute(
      path: '/bookings',
      builder: (context, state) =>
          const Scaffold(appBar: null, body: CustomerBookingsList()),
    ),
    GoRoute(
      path: '/bookings/:id',
      builder: (context, state) =>
          CustomerBookingDetailsPage(id: state.pathParameters['id'] ?? ''),
    ),
    GoRoute(
      path: '/messages',
      builder: (context, state) => const CustomerConversationsPage(),
    ),
    GoRoute(
      path: '/messages/:id',
      builder: (context, state) =>
          CustomerConversationPage(id: state.pathParameters['id'] ?? ''),
    ),
  ],
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  final prefs = await SharedPreferences.getInstance();
  await LookivaApi.initializeBaseUrl();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeNotifier(prefs)),
        ChangeNotifierProvider(create: (_) => LocaleNotifier(prefs)),
      ],
      child: const LookivaCustomerApp(),
    ),
  );
}

class LookivaCustomerApp extends StatelessWidget {
  const LookivaCustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeNotifier = context.watch<ThemeNotifier>();
    final localeNotifier = context.watch<LocaleNotifier>();
    final isAr = localeNotifier.locale.languageCode == 'ar';

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: themeNotifier.mode == ThemeMode.light
          ? const SystemUiOverlayStyle(
              statusBarColor: Colors.transparent,
              statusBarIconBrightness: Brightness.dark,
              statusBarBrightness: Brightness.light,
            )
          : const SystemUiOverlayStyle(
              statusBarColor: Color(0xFF080808),
              statusBarIconBrightness: Brightness.light,
              statusBarBrightness: Brightness.dark,
            ),
      child: MaterialApp.router(
        title: 'LOOKIVA Customer',
        debugShowCheckedModeBanner: false,
        theme: _buildSilverLight(),
        darkTheme: _buildMidnightGold(),
        themeMode: themeNotifier.mode,
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
        builder: (context, child) {
          return Directionality(
            textDirection: isAr ? TextDirection.rtl : TextDirection.ltr,
            child: child ?? const SizedBox.shrink(),
          );
        },
        routerConfig: _router,
      ),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startSplash();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _startSplash() async {
    await Future<void>.delayed(const Duration(milliseconds: 100));
    if (!mounted) return;
    final themeNotifier = context.read<ThemeNotifier>();
    final isDark =
        themeNotifier.mode == ThemeMode.dark ||
        (themeNotifier.mode == ThemeMode.system &&
            MediaQuery.of(context).platformBrightness == Brightness.dark);
    final surface = isDark ? const Color(0xFF080808) : Colors.white;
    final icons = isDark ? Brightness.light : Brightness.dark;
    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: surface,
        statusBarIconBrightness: icons,
      ),
    );
    _timer = Timer(const Duration(milliseconds: 1800), _navigateAway);
  }

  Future<void> _navigateAway() async {
    if (!mounted) return;
    final prefs = await SharedPreferences.getInstance();
    final onboardingSeen = prefs.getBool('cust_onboarding_seen') ?? false;
    final hasSession = await LookivaApi.instance.restoreSession();
    if (!mounted) return;
    if (!onboardingSeen) {
      context.go('/onboarding');
    } else if (hasSession) {
      await CustomerMobileServices.instance.initialize(
        openDeepLink: (path) => _router.go(path),
      );
      if (!mounted) return;
      context.go('/home');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final isDark = brightness == Brightness.dark;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [
                    Color(0xFF080808),
                    Color(0xFF101010),
                    Color(0xFF151515),
                  ]
                : const [
                    Color(0xFFFFFFFF),
                    Color(0xFFF7F7F8),
                    Color(0xFFECEDEF),
                  ],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'LOOKIVA',
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 8,
                  color: _goldPrimary,
                  shadows: [
                    Shadow(
                      color: _goldPrimary.withValues(alpha: 0.25),
                      blurRadius: 24,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                ct(context, 'splashTagline'),
                style: TextStyle(
                  fontSize: 14,
                  letterSpacing: 2,
                  color: isDark
                      ? const Color(0xFFA1A1AA)
                      : const Color(0xFF52525B),
                ),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: const AlwaysStoppedAnimation<Color>(_goldPrimary),
                  backgroundColor: (isDark
                      ? const Color(0xFF27272A)
                      : const Color(0xFFE4E4E7)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OnboardingPage extends StatelessWidget {
  const OnboardingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(ct(context, 'onboarding'))),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.travel_explore_rounded,
                size: 72,
                color: _goldPrimary,
              ),
              const SizedBox(height: 24),
              Text(
                ct(context, 'onboarding'),
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 12),
              Text(
                ct(context, 'onboardingBody'),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () async {
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.setBool('cust_onboarding_seen', true);
                  if (context.mounted) context.go('/login');
                },
                child: Text(ct(context, 'getStarted')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CustomerHomePage extends StatefulWidget {
  const CustomerHomePage({super.key});

  @override
  State<CustomerHomePage> createState() => _CustomerHomePageState();
}

class _CustomerHomePageState extends State<CustomerHomePage> {
  int _index = 0;

  List<NavigationDestination> _destinations(BuildContext context) => [
    NavigationDestination(
      icon: const Icon(Icons.home_outlined),
      selectedIcon: const Icon(Icons.home_rounded),
      label: ct(context, 'home'),
    ),
    NavigationDestination(
      icon: const Icon(Icons.search_rounded),
      selectedIcon: const Icon(Icons.travel_explore_rounded),
      label: ct(context, 'discover'),
    ),
    NavigationDestination(
      icon: const Icon(Icons.map_outlined),
      selectedIcon: const Icon(Icons.map_rounded),
      label: ct(context, 'map'),
    ),
    NavigationDestination(
      icon: const Icon(Icons.calendar_today_outlined),
      selectedIcon: const Icon(Icons.calendar_month_rounded),
      label: ct(context, 'bookings'),
    ),
    NavigationDestination(
      icon: const Icon(Icons.person_outline),
      selectedIcon: const Icon(Icons.person_rounded),
      label: ct(context, 'profile'),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('LOOKIVA'),
        actions: [
          IconButton(
            tooltip: ct(context, 'theme'),
            icon: Icon(
              Theme.of(context).brightness == Brightness.dark
                  ? Icons.light_mode_rounded
                  : Icons.dark_mode_rounded,
            ),
            onPressed: () {
              final notifier = context.read<ThemeNotifier>();
              final next = switch (notifier.mode) {
                ThemeMode.dark => ThemeMode.light,
                ThemeMode.light => ThemeMode.system,
                _ => ThemeMode.dark,
              };
              notifier.setMode(next);
            },
          ),
          IconButton(
            tooltip: ct(context, 'language'),
            icon: const Icon(Icons.language_rounded),
            onPressed: () async {
              final current = context.read<LocaleNotifier>().locale;
              final codes = ['en', 'ar', 'fr'];
              final next = codes[(codes.indexOf(current.languageCode) + 1) % 3];
              await context.read<LocaleNotifier>().setLocale(Locale(next));
            },
          ),
          IconButton(
            tooltip: ct(context, 'notifications'),
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () => context.push('/account/notifications'),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: const [
          DiscoveryHome(),
          CustomerDiscoverTab(),
          CustomerMapTab(),
          CustomerBookingsList(),
          CustomerAccountHub(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _destinations(context),
      ),
    );
  }
}

class CustomerDiscoverTab extends StatelessWidget {
  const CustomerDiscoverTab({super.key});

  @override
  Widget build(BuildContext context) => const CustomerDiscoverySearch();
}

class CustomerMapTab extends StatelessWidget {
  const CustomerMapTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const CustomerDiscoverySearch(availableNow: true);
  }
}

class CustomerLoginPage extends StatefulWidget {
  const CustomerLoginPage({super.key});

  @override
  State<CustomerLoginPage> createState() => _CustomerLoginPageState();
}

class _CustomerLoginPageState extends State<CustomerLoginPage> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _rememberMe = true;
  bool _obscure = true;
  bool _loading = false;
  String? _error;
  int _logoTapCount = 0;
  DateTime? _lastLogoTap;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _onLogoTapped() async {
    const isRelease = bool.fromEnvironment('dart.vm.product');
    if (isRelease) return;
    final now = DateTime.now();
    if (_lastLogoTap != null && now.difference(_lastLogoTap!).inSeconds > 2) {
      _logoTapCount = 0;
    }
    _lastLogoTap = now;
    _logoTapCount++;
    if (_logoTapCount >= 7) {
      _logoTapCount = 0;
      _openDevSettings();
    }
  }

  Future<void> _openDevSettings() async {
    final currentUrl = await LookivaApi.getStoredApiBaseUrl();
    final controller = TextEditingController(
      text: currentUrl ?? const String.fromEnvironment('LOOKIVA_API_URL'),
    );
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Developer Settings'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'API Base URL',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                hintText: 'http://192.168.1.50:4000/api/v1',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Example: http://192.168.1.50:4000/api/v1\n'
              'Android emulator default: http://10.0.2.2:4000/api/v1\n\n'
              'Tip: Tap the LOOKIVA logo 7 times on this screen to open.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await LookivaApi.clearStoredApiBaseUrl();
              await LookivaApi.initializeBaseUrl();
              if (ctx.mounted) Navigator.of(ctx).pop();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Reset to default / build-time URL'),
                  ),
                );
                setState(() {});
              }
            },
            child: const Text('Reset'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final url = controller.text.trim();
              if (url.isEmpty) return;
              await LookivaApi.setApiBaseUrl(url);
              if (ctx.mounted) Navigator.of(ctx).pop();
              if (mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text('API URL saved: $url')));
                setState(() {});
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (_identifier.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = ct(context, 'loginMissing'));
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await LookivaApi.instance.login(
        _identifier.text,
        _password.text,
        rememberMe: _rememberMe,
      );
      await CustomerMobileServices.instance.initialize(
        openDeepLink: (path) => _router.go(path),
      );
      await CustomerMobileServices.instance.onSignedIn();
      if (mounted) context.go('/home');
    } catch (error) {
      if (mounted) {
        setState(() => _error = LookivaApi.instance.friendlyError(error));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  Center(
                    child: GestureDetector(
                      onTap: _onLogoTapped,
                      child: const Text(
                        'LOOKIVA',
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 6,
                          color: _goldPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    ct(context, 'signIn'),
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    ct(context, 'signInBody'),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 28),
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.error.withValues(alpha: .10),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Theme.of(
                            context,
                          ).colorScheme.error.withValues(alpha: .35),
                        ),
                      ),
                      child: Text(
                        _error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  TextField(
                    controller: _identifier,
                    enabled: !_loading,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.username],
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.person_outline),
                      labelText: ct(context, 'emailPhone'),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _password,
                    enabled: !_loading,
                    obscureText: _obscure,
                    autofillHints: const [AutofillHints.password],
                    onSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.lock_outline),
                      labelText: ct(context, 'password'),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(
                          _obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _rememberMe,
                    onChanged: _loading
                        ? null
                        : (v) => setState(() => _rememberMe = v ?? true),
                    title: Text(ct(context, 'keepSignedIn')),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton.icon(
                    onPressed: _loading ? null : _submit,
                    icon: _loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login_rounded),
                    label: Text(
                      _loading
                          ? ct(context, 'signingIn')
                          : ct(context, 'signIn'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  FutureBuilder<String?>(
                    future: LookivaApi.getStoredApiBaseUrl(),
                    builder: (ctx, snap) {
                      final url = snap.data;
                      final label = url != null && url.isNotEmpty
                          ? 'API: $url'
                          : 'API: build-time default';
                      return Text(
                        label,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
