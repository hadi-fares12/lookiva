import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'lookiva_api.dart';
import 'l10n.dart';
import 'mobile_services.dart';

class CustomerAccountHub extends StatefulWidget {
  const CustomerAccountHub({super.key});
  @override
  State<CustomerAccountHub> createState() => _CustomerAccountHubState();
}

class _CustomerAccountHubState extends State<CustomerAccountHub> {
  late Future<dynamic> _future;
  @override
  void initState() { super.initState(); _reload(); }
  void _reload() => _future = LookivaApi.instance.get('/customer-ops/dashboard');

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<dynamic>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _Error(message: LookivaApi.instance.friendlyError(snapshot.error!), onRetry: () => setState(_reload));
        }
        final data = snapshot.data is Map ? Map<String, dynamic>.from(snapshot.data as Map) : <String, dynamic>{};
        final customer = data['customer'] is Map ? Map<String, dynamic>.from(data['customer'] as Map) : <String, dynamic>{};
        return RefreshIndicator(
          onRefresh: () async { setState(_reload); await _future; },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              Card(child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(children: [
                  CircleAvatar(radius: 28, child: Text(_initials(customer['display_name']?.toString() ?? customer['full_name']?.toString()))),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(customer['display_name']?.toString() ?? customer['full_name']?.toString() ?? ct(context,'myAccount'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    Text(customer['phone']?.toString() ?? customer['email']?.toString() ?? ct(context,'accountFallback'), style: Theme.of(context).textTheme.bodyMedium),
                  ])),
                ]),
              )),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: MediaQuery.of(context).size.width > 700 ? 4 : 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.55,
                children: [
                  _Metric(label: ct(context,'upcoming'), value: '${data['upcoming'] ?? 0}', icon: Icons.calendar_month_rounded),
                  _Metric(label: ct(context,'completed'), value: '${data['completed'] ?? 0}', icon: Icons.task_alt_rounded),
                  _Metric(label: ct(context,'packages'), value: '${data['activePackages'] ?? 0}', icon: Icons.inventory_2_outlined),
                  _Metric(label: ct(context,'unread'), value: '${data['unreadNotifications'] ?? 0}', icon: Icons.notifications_active_outlined),
                ],
              ),
              const SizedBox(height: 16),
              ..._menu.map((item) => Card(child: ListTile(
                leading: Icon(item.$1, color: Theme.of(context).colorScheme.primary),
                title: Text(ct(context,item.$2), style: const TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text(ct(context,item.$3)),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => context.push(item.$4),
              ))),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () async { await CustomerMobileServices.instance.onSignedOut(); await LookivaApi.instance.logout(); if (context.mounted) context.go('/login'); },
                icon: const Icon(Icons.logout_rounded),
                label: Text(ct(context,'signOut')),
              ),
            ],
          ),
        );
      },
    );
  }

  static const _menu = <(IconData,String,String,String)>[
    (Icons.calendar_month_rounded, 'bookings', 'bookingsDesc', '/bookings'),
    (Icons.favorite_border_rounded, 'favorites', 'favoritesDesc', '/account/favorites'),
    (Icons.person_add_alt_1_rounded, 'following', 'followingDesc', '/account/following'),
    (Icons.chat_bubble_outline_rounded, 'messages', 'messagesDesc', '/messages'),
    (Icons.rate_review_outlined, 'myReviews', 'reviewsDesc', '/account/reviews'),
    (Icons.stars_rounded, 'walletLoyalty', 'walletDesc', '/account/retention'),
    (Icons.notifications_none_rounded, 'notifications', 'notificationsDesc', '/account/notifications'),
    (Icons.location_on_outlined, 'nearbyPrefs', 'nearbyPrefsDesc', '/account/nearby-settings'),
    (Icons.security_rounded, 'security', 'securityDesc', '/account/security'),
  ];

  String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return 'L';
    final parts=name.trim().split(RegExp(r'\s+'));
    return parts.take(2).map((e)=>e[0].toUpperCase()).join();
  }
}

class _Metric extends StatelessWidget {
  final String label, value; final IconData icon;
  const _Metric({required this.label, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children:[Icon(icon,color:Theme.of(context).colorScheme.primary),const SizedBox(height:8),Text(value,style:const TextStyle(fontSize:22,fontWeight:FontWeight.w900)),Text(label,style:Theme.of(context).textTheme.bodySmall)])));
}

class _Error extends StatelessWidget {
  final String message; final VoidCallback onRetry;
  const _Error({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context)=>Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[Icon(Icons.cloud_off_rounded,size:52,color:Theme.of(context).colorScheme.error),const SizedBox(height:12),Text(message,textAlign:TextAlign.center),const SizedBox(height:16),ElevatedButton.icon(onPressed:onRetry,icon:const Icon(Icons.refresh_rounded),label:Text(ct(context,'retry')))])));
}
