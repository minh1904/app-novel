"""Tập hồi quy chọn trước khi chạy v4; chấm bản dịch cuối đã lưu, không chấm response hỏng."""
import json
import pathlib
import re
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
CASES = [
    (3, 'リオン様は、何処でそのような知識を', 'Milly→Rion', ['ngài', 'em']),
    (3, 'うぅ、もうちょっと見て回りたかった', 'Rion→Milly', ['mình', 'em', 'anh']),
    (3, '判ったよ。もうミリィに黙って', 'Rion→Milly', ['mình', 'em', 'anh']),
    (3, 'うん、約束する。その代わり', 'Rion→Milly', ['mình', 'em', 'anh']),
    (3, 'うん、判った', 'Rion→Milly', ['mình', 'em', 'anh']),
    (3, 'そっか。ごめんね、変なことを聞いて', 'Rion→Milly', ['em', 'anh']),
    (6, 'ごめん、ミリィ。その人と話してみたいんだ', 'Rion→Milly', ['em', 'anh']),
    (8, 'たまには感謝の気持ちを言葉にしておこう', 'Rion→Milly', ['em', 'anh']),
    (8, '酷いなぁ。これでも普段から感謝してる', 'Rion→Milly', ['em', 'anh']),
    (8, '私が以前言ったこと、忘れてしまわれた', 'Milly→Rion', ['ngài', 'em']),
    (8, 'リオン様こそなにを迷っていらっしゃる', 'Milly→Rion', ['ngài', 'em']),
    (8, 'リオン様、大丈夫ですよ。', 'Milly→Rion', ['ngài', 'em']),
    (8, '判っているはずですよ、リオン様。', 'Milly→Rion', ['ngài', 'em']),
    (8, 'だから、ミリィが大丈夫って言うなら', 'Rion→Milly', ['em', 'anh']),
    (8, 'その言葉だけで充分です。', 'Milly→Rion', ['ngài', 'em']),
    (8, 'ありがとう、ミリィ。それじゃ', 'Rion→Milly', ['em', 'anh']),
    (9, '言いましたよ。私はいつだってリオン様の味方だと', 'Milly→Rion', ['em']),
]
VARIANTS = ['v3-nothink', 'v3-nothink+t1', 'v3-nothink+t1-full', 'v4-nothink']
manifest = json.loads((ROOT / 'lab.json').read_text(encoding='utf-8'))
novel = manifest['novels']['n4696dd']
result = []
for variant in VARIANTS:
    path = pathlib.Path(manifest['dataDir']) / 'works' / (novel['copies'][variant] + '.mira')
    with sqlite3.connect(path.as_uri() + '?mode=ro', uri=True) as db:
        chapters = db.execute('select id from chapter order by position').fetchall()
        rows = []
        for chapter, fragment, pair, forbidden in CASES:
            texts = dict(db.execute('select side,content from chapter_text where chapter_id=?', chapters[chapter-1]))
            source = [s.strip() for s in texts['source'].splitlines() if s.strip()]
            target = [s.strip() for s in texts.get('target', '').splitlines() if s.strip()]
            matches = [i for i,s in enumerate(source) if fragment in s]
            assert len(matches) == 1, (chapter, fragment, matches)
            idx = matches[0]
            translated = target[idx] if len(target) == len(source) else None
            bad = [w for w in forbidden if translated and re.search(r'(?<!\w)' + w + r'(?!\w)', translated, re.I)]
            rows.append({'chapter':chapter,'paragraph':idx+1,'pair':pair,'source':source[idx], 'target':translated,'forbidden':forbidden,'bad':bad})
        result.append({'variant':variant,'checked':sum(r['target'] is not None for r in rows),'flagged':sum(bool(r['bad']) for r in rows),'rows':rows})
(HERE / 'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
for group in result:
    print(group['variant'],group['flagged'],'/',group['checked'])
    for row in group['rows']:
        print(f"  ch{row['chapter']} p{row['paragraph']} {row['pair']}: {row['target']} [{','.join(row['bad'])}]")
