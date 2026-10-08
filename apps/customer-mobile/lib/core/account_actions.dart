import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'lookiva_api.dart';
import 'l10n.dart';
import 'mobile_services.dart';
import 'realtime.dart';
import 'deep_links.dart';

class CustomerAccountActions extends StatefulWidget {
  final String section;
  const CustomerAccountActions({super.key, required this.section});
  static const sections = {'favorites','following','notifications','security','nearby-settings','preferences','collections'};
  @override
  State<CustomerAccountActions> createState() => _CustomerAccountActionsState();
}

class _CustomerAccountActionsState extends State<CustomerAccountActions> {
  final api = LookivaApi.instance;
  List<Map<String,dynamic>> _rows = [];
  Map<String,dynamic> _preferences = {};
  bool _loading = true, _busy = false, _more = false;
  String? _error;
  String _tab = 'business';
  int _generation = 0;
  StreamSubscription<LookivaRealtimeEvent>? _events;
  static const endpoints = {'favorites':'/customer/favorites','following':'/customer/following','notifications':'/notifications','security':'/auth/sessions','nearby-settings':'/customer/preferences','preferences':'/customer/preferences','collections':'/social-v2/collections'};
  List<Map<String,dynamic>> _maps(dynamic raw) => (raw is List ? raw : const []).whereType<Map>().map((r)=>Map<String,dynamic>.from(r)).toList();
  Map<String,dynamic> _map(dynamic raw) => raw is Map ? Map<String,dynamic>.from(raw) : {};
  bool get _paged => const {'favorites','following','notifications'}.contains(widget.section);

  @override
  void initState() {
    super.initState(); _load();
    _events = LookivaRealtime.instance.events.listen((e) {
      if (widget.section=='notifications' && e.name=='notification:created' && !_busy) _load();
    });
    LookivaRealtime.instance.connect();
  }
  @override
  void didUpdateWidget(covariant CustomerAccountActions oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.section!=widget.section) { _tab='business'; _rows=[]; _load(); }
  }
  @override
  void dispose() { _generation++; _events?.cancel(); super.dispose(); }

  Future<void> _load({bool append=false}) async {
    final generation = ++_generation;
    if (mounted) setState(() { _loading=true; _error=null; });
    try {
      final raw = await api.get(endpoints[widget.section]!, query: {
        if (_paged) 'limit': 30, if (_paged) 'offset': append ? _rows.length : 0,
        if (widget.section=='favorites') 'tab':_tab,
        if (widget.section=='following') 'targetType':_tab,
      });
      if (!mounted || generation!=_generation) return;
      final envelope = _map(raw);
      final rows = _maps(raw is List ? raw : envelope['items'] ?? envelope['sessions']);
      setState(() { _preferences=envelope; _rows=append ? [..._rows,...rows] : rows; _more=_paged && (envelope['hasMore'] == true || (envelope['hasMore']==null && rows.length==30)); _loading=false; });
    } catch(e) { if (mounted && generation==_generation) setState(() { _error=api.friendlyError(e); _loading=false; }); }
  }

  Future<void> _run(Future<dynamic> Function() action) async {
    if (_busy) return;
    setState(() { _busy=true; _error=null; });
    try { await action(); if (mounted) await _load(); }
    catch(e) { if (mounted) setState(() => _error=api.friendlyError(e)); }
    finally { if (mounted) setState(() => _busy=false); }
  }
  Future<bool> _confirm(String title) async => await showDialog<bool>(context:context,builder:(ctx)=>AlertDialog(title:Text(title),actions:[TextButton(onPressed:()=>Navigator.pop(ctx,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(ctx,true),child:const Text('Confirm'))])) ?? false;

  Future<void> _preference(String group,String key,dynamic value) => _run(() async {
    await api.put('/customer/preferences',data:{group:{key:value}});
    if (group=='nearby_notification_preferences') await CustomerMobileServices.instance.refreshNearby();
  });

  Widget _toggle(String group,String key,String label,{bool fallback=false}) {
    final values=_map(_preferences[group]);
    return SwitchListTile(title:Text(label),value:values[key] is bool ? values[key] as bool : fallback,onChanged:_busy?null:(v)=>_preference(group,key,v));
  }

  List<Widget> _settings() {
    const group='nearby_notification_preferences';
    final nearby=_map(_preferences[group]);
    if(widget.section=='nearby-settings') return [
      _toggle(group,'enabled','Nearby salon alerts'),
      const Padding(padding:EdgeInsets.all(16),child:Text('Location is used only when nearby alerts are enabled. You can also change background location permission in your phone settings.')),
      ListTile(title:const Text('Search radius'),subtitle:Text('${nearby['distance_threshold_meters'] ?? 500} m')),
      Slider(value:(double.tryParse(nearby['distance_threshold_meters']?.toString()??'')??500).clamp(100,5000).toDouble(),min:100,max:5000,divisions:49,onChanged:_busy?null:(v)=>setState(()=>_preferences[group]={...nearby,'distance_threshold_meters':v.round()}),onChangeEnd:_busy?null:(v)=>_preference(group,'distance_threshold_meters',v.round())),
      ListTile(title:const Text('Daily notification limit'),trailing:DropdownButton<int>(value:(int.tryParse(nearby['daily_max_notifications']?.toString()??'')??2).clamp(0,10).toInt(),items:List.generate(11,(n)=>DropdownMenuItem(value:n,child:Text('$n'))),onChanged:_busy?null:(v)=>_preference(group,'daily_max_notifications',v))),
      ...['quiet_hours_start','quiet_hours_end'].map((key)=>ListTile(title:Text(key=='quiet_hours_start'?'Quiet hours start':'Quiet hours end'),subtitle:Text(nearby[key]?.toString()??'Not set'),onTap:_busy?null:()async{final time=await showTimePicker(context:context,initialTime:TimeOfDay.now());if(time!=null && mounted)await _preference(group,key,'${time.hour.toString().padLeft(2,'0')}:${time.minute.toString().padLeft(2,'0')}');})),
      TextButton(onPressed:_busy?null:()=>_run(()async{await api.put('/customer/preferences',data:{group:{'quiet_hours_start':null,'quiet_hours_end':null}});await CustomerMobileServices.instance.refreshNearby();}),child:const Text('Clear quiet hours')),
    ];
    return [
      ...<String,String>{'push_bookings':'Booking alerts','push_messages':'Message alerts','push_reviews':'Review alerts','push_marketing':'Marketing alerts','email_bookings':'Booking emails','email_marketing':'Marketing emails','sound_enabled':'Notification sound'}.entries.map((e)=>_toggle('notification_preferences',e.key,e.value,fallback:const {'push_bookings','push_messages','push_reviews','email_bookings','sound_enabled'}.contains(e.key))),
      _toggle('user_preferences','reduced_motion','Reduce animations'),
      _toggle('user_preferences','high_contrast','High contrast'),
    ];
  }

  Future<void> _createCollection() async {
    String name='';
    final accepted=await showDialog<bool>(context:context,builder:(ctx)=>AlertDialog(title:const Text('New collection'),content:TextField(autofocus:true,maxLength:100,decoration:const InputDecoration(labelText:'Name'),onChanged:(v)=>name=v.trim()),actions:[TextButton(onPressed:()=>Navigator.pop(ctx,false),child:const Text('Cancel')),FilledButton(onPressed:()=>Navigator.pop(ctx,true),child:const Text('Create'))]));
    if(accepted==true && name.isNotEmpty && mounted) await _run(()=>api.post('/social-v2/collections',data:{'name':name,'isPublic':false}));
  }

  Widget _row(Map<String,dynamic> row) {
    final id=row['id']?.toString()??'';
    if(widget.section=='notifications') return Card(child:ListTile(
      leading:Icon(row['read_at']==null?Icons.notifications_active:Icons.notifications_none),
      title:Text(row['title']?.toString()??'Notification',style:TextStyle(fontWeight:row['read_at']==null?FontWeight.bold:FontWeight.normal)),
      subtitle:Text(row['body']?.toString()??''),
      onTap:_busy?null:()async { await _run(()=>api.patch('/notifications/$id/read',data:{})); if(mounted){final route=customerNotificationRoute(row['deep_link']?.toString());if(route!=null)context.push(route);} },
    ));
    if(widget.section=='security') return Card(child:ListTile(
      leading:const Icon(Icons.devices),title:Text(row['deviceName']?.toString()??row['deviceType']?.toString()??'Session'),subtitle:Text('${row['ipAddress']??''}\nLast active: ${row['lastActiveAt']??'—'}'),
      trailing:row['revokedAt']!=null?const Text('Revoked'):TextButton(onPressed:_busy?null:()async{if(await _confirm('Revoke this session?') && mounted)await _run(()=>api.delete('/auth/sessions/$id'));},child:const Text('Revoke')),
    ));
    if(widget.section=='collections') return Card(child:ExpansionTile(title:Text(row['name']?.toString()??'Collection'),subtitle:Text('${_maps(row['items']).length} saved looks'),children:[
      ..._maps(row['items']).map((item)=>ListTile(title:Text(item['post']?['body_plain']?.toString()??'Saved look'),onTap:()=>context.push('/reels?postId=${Uri.encodeComponent(item['post_id'].toString())}'),trailing:IconButton(tooltip:'Remove from collection',icon:const Icon(Icons.bookmark_remove),onPressed:_busy?null:()=>_run(()=>api.delete('/social-v2/collections/$id/items/${item['post_id']}'))))),
      TextButton(onPressed:_busy?null:()async{if(await _confirm('Delete this collection?') && mounted)await _run(()=>api.delete('/social-v2/collections/$id'));},child:const Text('Delete collection')),
    ]));
    final entity=_map(row['entity']??row['target']);
    final target=(row['entity_id']??row['target_id'])?.toString();
    final route=_tab=='post'?'/reels?postId=${Uri.encodeComponent(target??'')}':'/entity/$_tab/${Uri.encodeComponent(target??'')}';
    return Card(child:ListTile(title:Text(entity['display_name']?.toString()??entity['name']?.toString()??entity['user']?['full_name']?.toString()??entity['body_plain']?.toString()??'Unavailable item'),
      onTap:target==null||entity.isEmpty?null:()=>context.push(route),
      trailing:IconButton(tooltip:widget.section=='favorites'?'Remove favorite':'Unfollow',icon:Icon(widget.section=='favorites'?Icons.favorite:Icons.person_remove),onPressed:_busy?null:()=>_run(()=>api.delete('/customer/${widget.section}/$id'))),
    ));
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(onRefresh:()=>_load(),child:ListView(physics:const AlwaysScrollableScrollPhysics(),padding:const EdgeInsets.all(16),children:[
    if(const {'favorites','following'}.contains(widget.section)) Wrap(spacing:8,children:(widget.section=='favorites'?['business','professional','service','post']:['business','professional']).map((tab)=>ChoiceChip(label:Text(tab),selected:_tab==tab,onSelected:_busy?null:(_){setState(()=>_tab=tab);_load();})).toList()),
    if(widget.section=='notifications') Row(children:[Expanded(child:TextButton(onPressed:_busy?null:()=>_run(()=>api.patch('/notifications/read-all',data:{})),child:const Text('Mark all read'))),TextButton(onPressed:()=>context.push('/account/preferences'),child:const Text('Preferences'))]),
    if(widget.section=='collections') FilledButton.icon(onPressed:_busy?null:_createCollection,icon:const Icon(Icons.add),label:const Text('New collection')),
    if(widget.section=='security') OutlinedButton(onPressed:_busy?null:()async{if(!await _confirm('Sign out on all devices?')||!mounted)return;await _run(()async{await api.post('/auth/logout-everywhere');await CustomerMobileServices.instance.onSignedOut();await api.clearSession();if(mounted)context.go('/login');});},child:const Text('Sign out everywhere')),
    if(_loading||_busy) const LinearProgressIndicator(),
    if(_error!=null) Padding(padding:const EdgeInsets.all(12),child:Text(_error!,style:TextStyle(color:Theme.of(context).colorScheme.error))),
    if(!_loading && const {'nearby-settings','preferences'}.contains(widget.section)) ..._settings()
    else ..._rows.map(_row),
    if(!_loading && _rows.isEmpty && !const {'nearby-settings','preferences'}.contains(widget.section)) Padding(padding:const EdgeInsets.all(24),child:Text(ct(context,'nothingHere'))),
    if(_more) TextButton(onPressed:_loading||_busy?null:()=>_load(append:true),child:const Text('Load more')),
    if(_error!=null) TextButton(onPressed:_loading?null:()=>_load(),child:Text(ct(context,'retry'))),
  ]));
}

Future<void> saveLookToCollection(BuildContext context, String postId) async {
  final api = LookivaApi.instance;
  try {
    final raw = await api.get('/social-v2/collections');
    if (!context.mounted) return;
    final rows = (raw is List ? raw : const []).whereType<Map>().toList();
    if (rows.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Create a collection in Account → Collections first.')));
      return;
    }
    final selected = await showDialog<String>(context:context,builder:(ctx)=>SimpleDialog(title:const Text('Save to collection'),children:rows.map((r)=>SimpleDialogOption(onPressed:()=>Navigator.pop(ctx,r['id'].toString()),child:Text(r['name'].toString()))).toList()));
    if (selected == null) return;
    await api.post('/social-v2/collections/$selected/items',data:{'postId':postId});
    if(context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Look saved to collection.')));
  } catch(e) { if(context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(api.friendlyError(e)))); }
}
