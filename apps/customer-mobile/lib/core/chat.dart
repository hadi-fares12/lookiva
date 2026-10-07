import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import 'lookiva_api.dart';
import 'l10n.dart';
import 'realtime.dart';

class CustomerConversationsPage extends StatefulWidget {
  const CustomerConversationsPage({super.key});

  @override
  State<CustomerConversationsPage> createState() =>
      _CustomerConversationsPageState();
}

class _CustomerConversationsPageState
    extends State<CustomerConversationsPage> {
  int _generation = 0;
  StreamSubscription<LookivaRealtimeEvent>? _realtimeSub;

  Future<dynamic> get _future => LookivaApi.instance.get(
        '/customer-ops/conversations?generation=$_generation',
      );

  void _reload() => setState(() => _generation++);

  @override
  void initState() {
    super.initState();
    LookivaRealtime.instance.connect();
    _realtimeSub = LookivaRealtime.instance.events.listen((event) {
      if (mounted &&
          (event.name == 'message:created' || event.name == 'message:read')) {
        _reload();
      }
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(ct(context, 'messages'))),
        body: FutureBuilder<dynamic>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _Error(
                message: LookivaApi.instance.friendlyError(snapshot.error!),
                onRetry: _reload,
              );
            }

            final rows = (snapshot.data as List? ?? const [])
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
            if (rows.isEmpty) {
              return Center(child: Text(ct(context, 'noConversations')));
            }

            return RefreshIndicator(
              onRefresh: () async {
                _reload();
                await _future;
              },
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final conversation = rows[index];
                  final members =
                      (conversation['members'] as List? ?? const [])
                          .whereType<Map>()
                          .map((e) => Map<String, dynamic>.from(e))
                          .toList();
                  final names = members
                      .map((member) {
                        final user = member['user'];
                        return user is Map
                            ? user['full_name']?.toString()
                            : null;
                      })
                      .whereType<String>()
                      .join(', ');
                  final messages =
                      (conversation['messages'] as List? ?? const [])
                          .whereType<Map>()
                          .toList();
                  final last =
                      messages.isNotEmpty ? messages.first : <String, dynamic>{};
                  final body = last is Map
                      ? last['body_plain']?.toString()
                      : null;
                  final attachmentCount = last is Map
                      ? (last['attachments'] as List? ?? const []).length
                      : 0;

                  return Card(
                    child: ListTile(
                      leading: const CircleAvatar(
                        child: Icon(Icons.chat_bubble_outline_rounded),
                      ),
                      title: Text(
                        names.isEmpty ? ct(context, 'conversation') : names,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        body?.trim().isNotEmpty == true
                            ? body!
                            : attachmentCount > 0
                                ? ct(context, 'mediaMessage')
                                : ct(context, 'message'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => context.push(
                        '/messages/${conversation['id']}',
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
      );
}

class CustomerConversationPage extends StatefulWidget {
  final String id;

  const CustomerConversationPage({
    super.key,
    required this.id,
  });

  @override
  State<CustomerConversationPage> createState() =>
      _CustomerConversationPageState();
}

class _CustomerConversationPageState
    extends State<CustomerConversationPage> {
  final _input = TextEditingController();
  final _picker = ImagePicker();
  final List<Map<String, dynamic>> _pendingAttachments = [];
  int _generation = 0;
  bool _sending = false;
  bool _uploading = false;
  String? _lastMarkedMessageId;
  StreamSubscription<LookivaRealtimeEvent>? _realtimeSub;

  Future<dynamic> get _future => LookivaApi.instance.get(
        '/customer-ops/conversations/${widget.id}/messages'
        '?limit=200&generation=$_generation',
      );

  void _reload() => setState(() => _generation++);

  @override
  void initState() {
    super.initState();
    LookivaRealtime.instance.connect().then((_) {
      LookivaRealtime.instance.joinConversation(widget.id);
    });
    _realtimeSub = LookivaRealtime.instance.events.listen((event) {
      if (!mounted ||
          (event.name != 'message:created' &&
              event.name != 'message:read')) {
        return;
      }
      final data = event.data;
      if (data is Map &&
          data['conversationId']?.toString() == widget.id) {
        _reload();
      }
    });
  }

  Future<void> _pickAttachment() async {
    if (_uploading || _sending) return;

    final kind = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.image_outlined),
              title: Text(ct(context, 'attachPhoto')),
              onTap: () => Navigator.pop(sheetContext, 'image'),
            ),
            ListTile(
              leading: const Icon(Icons.video_library_outlined),
              title: Text(ct(context, 'attachVideo')),
              onTap: () => Navigator.pop(sheetContext, 'video'),
            ),
          ],
        ),
      ),
    );
    if (kind == null || !mounted) return;

    final XFile? file = kind == 'image'
        ? await _picker.pickImage(
            source: ImageSource.gallery,
            imageQuality: 92,
          )
        : await _picker.pickVideo(
            source: ImageSource.gallery,
            maxDuration: const Duration(minutes: 2),
          );
    if (file == null || !mounted) return;

    setState(() => _uploading = true);
    try {
      final mimeType = _mimeFor(file.name, kind);
      final raw = await LookivaApi.instance.uploadMedia(
        filePath: file.path,
        fileName: file.name,
        mimeType: mimeType,
        isPublic: false,
      );
      if (!mounted || raw is! Map || raw['id'] == null) {
        throw StateError(ct(context, 'uploadFailed'));
      }
      final uploaded = Map<String, dynamic>.from(raw);
      setState(() {
        _pendingAttachments.add({
          'mediaId': uploaded['id'].toString(),
          'mediaType': uploaded['mime_category']?.toString() ?? kind,
          'fileName':
              uploaded['original_file_name']?.toString() ?? file.name,
          'sizeBytes': uploaded['size_bytes'],
        });
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(LookivaApi.instance.friendlyError(error)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  String _mimeFor(String fileName, String kind) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    return kind == 'video' ? 'video/mp4' : 'image/jpeg';
  }

  Future<void> _send() async {
    final body = _input.text.trim();
    if ((body.isEmpty && _pendingAttachments.isEmpty) ||
        _sending ||
        _uploading) {
      return;
    }
    final attachments = _pendingAttachments
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    setState(() => _sending = true);

    try {
      await LookivaApi.instance.post(
        '/customer-ops/conversations/${widget.id}/messages',
        data: {
          if (body.isNotEmpty) 'body': body,
          'messageType': attachments.isEmpty
              ? 'text'
              : attachments.length == 1
                  ? attachments.first['mediaType']
                  : 'media',
          if (attachments.isNotEmpty) 'attachments': attachments,
        },
      );
      _input.clear();
      setState(() {
        _pendingAttachments.clear();
        _generation++;
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(LookivaApi.instance.friendlyError(error)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _markRead(List<Map<String, dynamic>> rows) {
    if (rows.isEmpty) return;
    final messageId = rows.last['id']?.toString();
    if (messageId == null ||
        messageId.isEmpty ||
        messageId == _lastMarkedMessageId) {
      return;
    }
    _lastMarkedMessageId = messageId;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await LookivaApi.instance.patch(
          '/customer-ops/conversations/${widget.id}/read',
          data: {'messageId': messageId},
        );
      } catch (_) {
        if (_lastMarkedMessageId == messageId) {
          _lastMarkedMessageId = null;
        }
      }
    });
  }

  @override
  void dispose() {
    LookivaRealtime.instance.leaveConversation(widget.id);
    _realtimeSub?.cancel();
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(ct(context, 'conversation'))),
        body: Column(
          children: [
            Expanded(
              child: FutureBuilder<dynamic>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState ==
                      ConnectionState.waiting) {
                    return const Center(
                      child: CircularProgressIndicator(),
                    );
                  }
                  if (snapshot.hasError) {
                    return _Error(
                      message:
                          LookivaApi.instance.friendlyError(snapshot.error!),
                      onRetry: _reload,
                    );
                  }

                  final rows = (snapshot.data as List? ?? const [])
                      .whereType<Map>()
                      .map((e) => Map<String, dynamic>.from(e))
                      .toList();
                  _markRead(rows);

                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: rows.length,
                    itemBuilder: (context, index) {
                      final message = rows[index];
                      final sender = message['sender'] is Map
                          ? Map<String, dynamic>.from(
                              message['sender'] as Map,
                            )
                          : <String, dynamic>{};
                      final attachments =
                          (message['attachments'] as List? ?? const [])
                              .whereType<Map>()
                              .map((e) => Map<String, dynamic>.from(e))
                              .toList();
                      final readBy =
                          (message['readBy'] as List? ?? const [])
                              .whereType<Map>()
                              .map((e) => Map<String, dynamic>.from(e))
                              .toList();

                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                sender['full_name']?.toString() ??
                                    ct(context, 'message'),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if ((message['body_plain']
                                          ?.toString() ??
                                      '')
                                  .trim()
                                  .isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(message['body_plain'].toString()),
                              ],
                              if (attachments.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                ...attachments.map(
                                  (attachment) => Container(
                                    width: double.infinity,
                                    margin: const EdgeInsets.only(
                                      bottom: 6,
                                    ),
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .surfaceContainerHighest,
                                      borderRadius:
                                          BorderRadius.circular(10),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          attachment['media_type']
                                                      ?.toString() ==
                                                  'video'
                                              ? Icons
                                                  .video_library_outlined
                                              : Icons.image_outlined,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            attachment['file_name']
                                                    ?.toString() ??
                                                ct(
                                                  context,
                                                  'attachment',
                                                ),
                                            maxLines: 1,
                                            overflow:
                                                TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                              if (message['created_at'] != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  message['created_at'].toString(),
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall,
                                ),
                              ],
                              if (readBy.isNotEmpty) ...[
                                const SizedBox(height: 3),
                                Text(
                                  '${ct(context, 'seenBy')} '
                                  '${readBy.map((e) => e['full_name']?.toString()).whereType<String>().join(', ')}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall,
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            if (_pendingAttachments.isNotEmpty || _uploading)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    ..._pendingAttachments.asMap().entries.map(
                          (entry) => InputChip(
                            avatar: Icon(
                              entry.value['mediaType'] == 'video'
                                  ? Icons.video_library_outlined
                                  : Icons.image_outlined,
                              size: 18,
                            ),
                            label: Text(
                              entry.value['fileName']?.toString() ??
                                  ct(context, 'attachment'),
                              overflow: TextOverflow.ellipsis,
                            ),
                            onDeleted: _sending
                                ? null
                                : () => setState(
                                      () => _pendingAttachments
                                          .removeAt(entry.key),
                                    ),
                          ),
                        ),
                    if (_uploading)
                      Chip(
                        avatar: const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                          ),
                        ),
                        label: Text(ct(context, 'uploading')),
                      ),
                  ],
                ),
              ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: ct(context, 'attachMedia'),
                      onPressed:
                          _sending || _uploading ? null : _pickAttachment,
                      icon: const Icon(Icons.attach_file_rounded),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _input,
                        minLines: 1,
                        maxLines: 4,
                        decoration: InputDecoration(
                          hintText: ct(context, 'messageHint'),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed:
                          _sending || _uploading ? null : _send,
                      icon: _sending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.send_rounded),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
}

class _Error extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _Error({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: Text(ct(context, 'retry')),
              ),
            ],
          ),
        ),
      );
}
