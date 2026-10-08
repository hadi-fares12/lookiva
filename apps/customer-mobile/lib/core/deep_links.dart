/// Convert server/web links into supported native routes. Never accept external hosts.
String? customerNotificationRoute(String? value) {
  if (value == null || value.isEmpty) return null;
  final uri = Uri.tryParse(value);
  if (uri == null || uri.hasScheme || uri.hasAuthority || !value.startsWith('/')) return null;
  final parts = uri.pathSegments.where((s)=>s.isNotEmpty).toList();
  if (parts.isNotEmpty && const {'en','ar','fr'}.contains(parts.first)) parts.removeAt(0);
  if (parts.isEmpty) return '/home';
  if (parts.any((s)=>s=='.'||s=='..'||s.contains('/'))) return null;
  final root=parts.first;
  if (parts.length==2 && const {'businesses','professionals','services'}.contains(root)) {
    final type={'businesses':'business','professionals':'professional','services':'service'}[root];
    return '/entity/$type/${Uri.encodeComponent(parts[1])}';
  }
  if (root=='reels' && parts.length==1) return '/reels${uri.hasQuery?'?${uri.query}':''}';
  if (root=='chat') parts[0]='messages';
  if (parts.length<=2 && const {'bookings','messages'}.contains(parts.first)) return '/${parts.map(Uri.encodeComponent).join('/')}${uri.hasQuery?'?${uri.query}':''}';
  if (parts.length==3 && root=='entity' && const {'business','professional','service'}.contains(parts[1])) return '/${parts.map(Uri.encodeComponent).join('/')}';
  if (parts.length==2 && root=='account' && const {'notifications','preferences','nearby-settings','privacy','favorites','collections','security','following','retention','reviews'}.contains(parts[1])) return '/account/${parts[1]}';
  return null;
}
