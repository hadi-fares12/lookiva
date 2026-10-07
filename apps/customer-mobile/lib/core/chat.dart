import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'lookiva_api.dart';
import 'l10n.dart';
import 'realtime.dart';

class CustomerConversationsPage extends StatefulWidget {
  const CustomerConversationsPage({super.key});
  @override State<CustomerConversationsPage> createState()=>_CustomerConversationsPageState();
}
class _CustomerConversationsPageState extends State<CustomerConversationsPage>{
  int _generation=0;
  StreamSubscription<LookivaRealtimeEvent>? _realtimeSub;
  Future<dynamic> get _future=>LookivaApi.instance.get('/customer-ops/conversations?generation=$_generation');
  void _reload()=>setState(()=>_generation++);
  @override void initState(){super.initState();LookivaRealtime.instance.connect();_realtimeSub=LookivaRealtime.instance.events.listen((event){if(mounted&&event.name=='message:created')_reload();});}
  @override void dispose(){_realtimeSub?.cancel();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:Text(ct(context,'messages'))),
    body:FutureBuilder<dynamic>(future:_future,builder:(context,snapshot){
      if(snapshot.connectionState==ConnectionState.waiting)return const Center(child:CircularProgressIndicator());
      if(snapshot.hasError)return _Error(message:LookivaApi.instance.friendlyError(snapshot.error!),onRetry:_reload);
      final rows=(snapshot.data as List? ?? const []).whereType<Map>().map((e)=>Map<String,dynamic>.from(e)).toList();
      if(rows.isEmpty)return Center(child:Text(ct(context,'noConversations')));
      return RefreshIndicator(onRefresh:()async{_reload();await _future;},child:ListView.separated(
        padding:const EdgeInsets.all(16),itemCount:rows.length,separatorBuilder:(_,__)=>const SizedBox(height:8),
        itemBuilder:(context,index){
          final c=rows[index];
          final members=(c['members'] as List? ?? const []).whereType<Map>().map((e)=>Map<String,dynamic>.from(e)).toList();
          final names=members.map((m){final u=m['user'];return u is Map?u['full_name']?.toString():null;}).whereType<String>().join(', ');
          final msgs=(c['messages'] as List? ?? const []).whereType<Map>().toList();
          final last=msgs.isNotEmpty?msgs.first['body_plain']?.toString():null;
          return Card(child:ListTile(
            leading:const CircleAvatar(child:Icon(Icons.chat_bubble_outline_rounded)),
            title:Text(names.isEmpty?ct(context,'conversation'):names,style:const TextStyle(fontWeight:FontWeight.w800)),
            subtitle:last==null?null:Text(last,maxLines:1,overflow:TextOverflow.ellipsis),
            trailing:const Icon(Icons.chevron_right_rounded),onTap:()=>context.push('/messages/${c['id']}')));
        }));
    }));
}

class CustomerConversationPage extends StatefulWidget{
  final String id; const CustomerConversationPage({super.key,required this.id});
  @override State<CustomerConversationPage> createState()=>_CustomerConversationPageState();
}
class _CustomerConversationPageState extends State<CustomerConversationPage>{
  final _input=TextEditingController();int _generation=0;bool _sending=false;StreamSubscription<LookivaRealtimeEvent>? _realtimeSub;
  Future<dynamic> get _future=>LookivaApi.instance.get('/customer-ops/conversations/${widget.id}/messages?limit=200&generation=$_generation');
  void _reload()=>setState(()=>_generation++);
  @override void initState(){super.initState();LookivaRealtime.instance.connect().then((_){LookivaRealtime.instance.joinConversation(widget.id);});_realtimeSub=LookivaRealtime.instance.events.listen((event){if(!mounted||event.name!='message:created')return;final data=event.data;if(data is Map&&data['conversationId']?.toString()==widget.id)_reload();});}
  Future<void> _send()async{final body=_input.text.trim();if(body.isEmpty)return;setState(()=>_sending=true);try{await LookivaApi.instance.post('/customer-ops/conversations/${widget.id}/messages',data:{'body':body,'messageType':'text'});_input.clear();_reload();}finally{if(mounted)setState(()=>_sending=false);}}
  @override void dispose(){LookivaRealtime.instance.leaveConversation(widget.id);_realtimeSub?.cancel();_input.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:Text(ct(context,'conversation'))),
    body:Column(children:[Expanded(child:FutureBuilder<dynamic>(future:_future,builder:(context,snapshot){
      if(snapshot.connectionState==ConnectionState.waiting)return const Center(child:CircularProgressIndicator());
      if(snapshot.hasError)return _Error(message:LookivaApi.instance.friendlyError(snapshot.error!),onRetry:_reload);
      final rows=(snapshot.data as List? ?? const []).whereType<Map>().map((e)=>Map<String,dynamic>.from(e)).toList();
      return ListView.builder(padding:const EdgeInsets.all(16),itemCount:rows.length,itemBuilder:(context,index){
        final m=rows[index];final sender=m['sender'] is Map?Map<String,dynamic>.from(m['sender'] as Map):<String,dynamic>{};
        return Card(child:Padding(padding:const EdgeInsets.all(12),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Text(sender['full_name']?.toString()??ct(context,'message'),style:const TextStyle(fontWeight:FontWeight.w800)),const SizedBox(height:4),Text(m['body_plain']?.toString()??''),if(m['created_at']!=null)...[const SizedBox(height:4),Text(m['created_at'].toString(),style:Theme.of(context).textTheme.bodySmall)]
        ])));});
    })),SafeArea(top:false,child:Padding(padding:const EdgeInsets.fromLTRB(12,8,12,12),child:Row(children:[Expanded(child:TextField(controller:_input,minLines:1,maxLines:4,decoration:InputDecoration(hintText:ct(context,'messageHint')))),const SizedBox(width:8),IconButton.filled(onPressed:_sending?null:_send,icon:_sending?const SizedBox(width:18,height:18,child:CircularProgressIndicator(strokeWidth:2)):const Icon(Icons.send_rounded))])))]));
}
class _Error extends StatelessWidget{final String message;final VoidCallback onRetry;const _Error({required this.message,required this.onRetry});@override Widget build(BuildContext context)=>Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[Text(message,textAlign:TextAlign.center),const SizedBox(height:16),ElevatedButton.icon(onPressed:onRetry,icon:const Icon(Icons.refresh_rounded),label:Text(ct(context,'retry')))])));}
