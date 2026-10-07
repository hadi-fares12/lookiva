import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'lookiva_api.dart';
import 'l10n.dart';
import 'share.dart';

class CustomerReelsPage extends StatelessWidget {
  const CustomerReelsPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(ct(context, 'reels'))),
        body: const CustomerReels(),
      );
}

class CustomerReels extends StatefulWidget {
  const CustomerReels({super.key});

  @override
  State<CustomerReels> createState() => _CustomerReelsState();
}

class _CustomerReelsState extends State<CustomerReels> {
  late Future<dynamic> _future;
  final Set<String> _saving = <String>{};

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = LookivaApi.instance.get(
      '/social-v2/feed',
      query: {'limit': 30},
    );
  }

  Future<void> _toggleSave(Map<String, dynamic> post) async {
    final id = post['id']?.toString();
    if (id == null || id.isEmpty || _saving.contains(id)) return;

    final wasSaved = post['savedByMe'] == true;
    final oldCount =
        int.tryParse(post['bookmark_count']?.toString() ?? '') ?? 0;

    setState(() {
      _saving.add(id);
      post['savedByMe'] = !wasSaved;
      post['bookmark_count'] = wasSaved
          ? (oldCount - 1).clamp(0, 1 << 31)
          : oldCount + 1;
    });

    try {
      if (wasSaved) {
        await LookivaApi.instance.delete('/social-v2/posts/' + id + '/save');
      } else {
        await LookivaApi.instance.post('/social-v2/posts/' + id + '/save');
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          post['savedByMe'] = wasSaved;
          post['bookmark_count'] = oldCount;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(LookivaApi.instance.friendlyError(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<dynamic>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 4,
            itemBuilder: (_, __) => const Card(
              child: SizedBox(
                height: 260,
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          );
        }
        if (snapshot.hasError) {
          return RefreshIndicator(
            onRefresh: () async {
              setState(_reload);
              await _future;
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 100),
                Icon(
                  Icons.cloud_off_rounded,
                  size: 54,
                  color: Theme.of(context).colorScheme.error,
                ),
                const SizedBox(height: 14),
                Text(
                  ct(context, 'reelsLoadError'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                Text(
                  LookivaApi.instance.friendlyError(snapshot.error!),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        final envelope = snapshot.data is Map
            ? Map<String, dynamic>.from(snapshot.data as Map)
            : <String, dynamic>{};
        final items = (envelope['items'] as List? ?? const [])
            .whereType<Map>()
            .map((row) => Map<String, dynamic>.from(row))
            .toList();

        if (items.isEmpty) {
          return RefreshIndicator(
            onRefresh: () async {
              setState(_reload);
              await _future;
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 120),
                const Icon(Icons.video_collection_outlined, size: 56),
                const SizedBox(height: 14),
                Text(
                  ct(context, 'reelsEmpty'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            setState(_reload);
            await _future;
          },
          child: PageView.builder(
            scrollDirection: Axis.vertical,
            itemCount: items.length,
            itemBuilder: (context, index) => _ReelCard(
              post: items[index],
              saving: _saving.contains(items[index]['id']?.toString()),
              onSave: () => _toggleSave(items[index]),
            ),
          ),
        );
      },
    );
  }
}

class _ReelCard extends StatelessWidget {
  final Map<String, dynamic> post;
  final bool saving;
  final VoidCallback onSave;

  const _ReelCard({
    required this.post,
    required this.saving,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    final professional = post['professional'] is Map
        ? Map<String, dynamic>.from(post['professional'] as Map)
        : <String, dynamic>{};
    final company = post['company'] is Map
        ? Map<String, dynamic>.from(post['company'] as Map)
        : <String, dynamic>{};
    final author = post['author'] is Map
        ? Map<String, dynamic>.from(post['author'] as Map)
        : <String, dynamic>{};
    final service = post['bookableService'] is Map
        ? Map<String, dynamic>.from(post['bookableService'] as Map)
        : <String, dynamic>{};
    final authorName = professional['display_name']?.toString() ??
        company['display_name']?.toString() ??
        author['full_name']?.toString() ??
        'LOOKIVA';

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
        child: Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              Expanded(
                child: _ReelMedia(post: post),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authorName,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (post['verifiedWork'] is Map) ...[
                      const SizedBox(height: 8),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .primaryContainer
                              .withValues(alpha: .45),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          child: Text(
                            '✓ ' +
                                ct(context, 'verifiedWork') +
                                ((post['verifiedWork'] as Map)['rating'] != null
                                    ? ' • ' +
                                        (double.tryParse(
                                                  (post['verifiedWork'] as Map)['rating']
                                                      .toString(),
                                                ) ??
                                                0)
                                            .toStringAsFixed(1) +
                                        '★'
                                    : ''),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      post['title']?.toString() ??
                          service['name']?.toString() ??
                          authorName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    if (post['body_plain'] != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        post['body_plain'].toString(),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (service.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          (service['name']?.toString() ?? ct(context, 'service')) +
                              ' • ' +
                              (service['duration_minutes']?.toString() ?? '—') +
                              ' min • ' +
                              (service['base_price']?.toString() ?? '—') +
                              ' ' +
                              (service['currency_code']?.toString() ?? ''),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        if (service['id'] != null)
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: () => context.push(
                                '/book/' + service['id'].toString() +
                                    '?postId=' +
                                    Uri.encodeQueryComponent(post['id'].toString()),
                              ),
                              icon: const Icon(Icons.calendar_month_rounded),
                              label: Text(ct(context, 'bookThisLook')),
                            ),
                          ),
                        if (service['id'] != null) const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: saving ? null : onSave,
                          icon: Icon(
                            post['savedByMe'] == true
                                ? Icons.bookmark_rounded
                                : Icons.bookmark_border_rounded,
                          ),
                          label: Text(
                            post['savedByMe'] == true
                                ? ct(context, 'saved')
                                : ct(context, 'save'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          tooltip: ct(context, 'share'),
                          onPressed: () => shareLookiva(
                            title: ct(context, 'shareReelTitle'),
                            text: [
                              professional['display_name']?.toString() ??
                                  company['display_name']?.toString() ??
                                  'LOOKIVA',
                              post['title']?.toString() ??
                                  service['name']?.toString() ??
                                  '',
                              service['name']?.toString() ?? '',
                            ].where((value) => value.trim().isNotEmpty).join('\n'),
                            path: '/reels?postId=' +
                                Uri.encodeQueryComponent(post['id'].toString()),
                          ),
                          icon: const Icon(Icons.share_outlined),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '♥ ' +
                          (post['like_count']?.toString() ?? '0') +
                          '  •  💬 ' +
                          (post['comment_count']?.toString() ?? '0') +
                          '  •  🔖 ' +
                          (post['bookmark_count']?.toString() ?? '0'),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


class _ReelMedia extends StatelessWidget {
  final Map<String, dynamic> post;

  const _ReelMedia({required this.post});

  @override
  Widget build(BuildContext context) {
    final mediaRows = (post['media_list'] as List? ?? const [])
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
    if (mediaRows.isEmpty) {
      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).colorScheme.surfaceContainerHighest,
              Theme.of(context).colorScheme.surface,
            ],
          ),
        ),
        child: const Center(
          child: Icon(Icons.auto_awesome_rounded, size: 72),
        ),
      );
    }

    final media = mediaRows.first;
    final mediaId = media['media_id']?.toString() ?? '';
    final mediaType = media['media_type']?.toString() ?? 'image';
    if (mediaId.isEmpty) {
      return const Center(child: Icon(Icons.broken_image_outlined, size: 56));
    }

    return FutureBuilder<List<String>>(
      future: Future.wait([
        LookivaApi.instance.publicMediaUrl(
          mediaId,
          variant: mediaType == 'video' ? 'thumb' : 'medium',
        ),
        if (mediaType == 'video')
          LookivaApi.instance.publicMediaUrl(mediaId, variant: 'medium')
        else
          LookivaApi.instance.publicMediaUrl(mediaId, variant: 'medium'),
      ]),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final previewUrl = snapshot.data![0];
        final assetUrl = snapshot.data![1];

        final preview = Image.network(
          previewUrl,
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Center(
            child: Icon(
              mediaType == 'video'
                  ? Icons.video_file_outlined
                  : Icons.broken_image_outlined,
              size: 64,
            ),
          ),
        );

        if (mediaType != 'video') return preview;

        return Stack(
          fit: StackFit.expand,
          children: [
            preview,
            Container(color: Colors.black.withValues(alpha: .18)),
            Center(
              child: FilledButton.icon(
                onPressed: () async {
                  final uri = Uri.tryParse(assetUrl);
                  if (uri == null ||
                      !await launchUrl(
                        uri,
                        mode: LaunchMode.externalApplication,
                      )) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(ct(context, 'videoOpenError'))),
                      );
                    }
                  }
                },
                icon: const Icon(Icons.play_arrow_rounded),
                label: Text(ct(context, 'watchVideo')),
              ),
            ),
          ],
        );
      },
    );
  }
}
