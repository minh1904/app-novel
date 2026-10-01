import type { SegmentLanguage } from './segmenter'

/**
 * Regression corpus: every row is a promise made in the segmentation spec. A change to the rules or
 * the abbreviation list must keep every row passing, or change a row with a reason.
 */
export const CORPUS: ReadonlyArray<[string, SegmentLanguage, string, string[]]> = [
  // --- English
  [
    'abbreviation titles',
    'en',
    'Mr. Smith went to Washington. Dr. Lee agreed.',
    ['Mr. Smith went to Washington.', 'Dr. Lee agreed.']
  ],
  [
    'decimal number',
    'en',
    'It cost $3.50 today. Then it rose.',
    ['It cost $3.50 today.', 'Then it rose.']
  ],
  [
    'abbreviation at line end',
    'en',
    'He lived in the U.S.\nThen he left.',
    ['He lived in the U.S.', 'Then he left.']
  ],
  [
    'U.S. before a capital still ends the sentence',
    'en',
    'He lived in the U.S. Then he left.',
    ['He lived in the U.S.', 'Then he left.']
  ],
  [
    'U.S. before lower case does not',
    'en',
    'He lived in the U.S. and loved it.',
    ['He lived in the U.S. and loved it.']
  ],
  [
    'ellipsis before lower case',
    'en',
    'Wait... what? Yes!! Really?! Fine.',
    ['Wait... what?', 'Yes!!', 'Really?!', 'Fine.']
  ],
  [
    'closing quote stays with its sentence',
    'en',
    'He said, "Hello." Dr. Lee agreed.',
    ['He said, "Hello."', 'Dr. Lee agreed.']
  ],
  [
    'markdown heading is its own segment',
    'en',
    '# Chapter 1\nHe left. She stayed.',
    ['# Chapter 1', 'He left.', 'She stayed.']
  ],
  [
    'several abbreviations in one sentence',
    'en',
    'Prof. Lee met St. Louis natives vs. outsiders.',
    ['Prof. Lee met St. Louis natives vs. outsiders.']
  ],
  [
    'paragraphs and a blank line',
    'en',
    'It rained. He stayed in.\n\nShe went out.',
    ['It rained.', 'He stayed in.', 'She went out.']
  ],
  // --- Vietnamese
  [
    'Vietnamese abbreviations',
    'vi',
    'TP. Hồ Chí Minh rất đông. Th.S. Nam nói: "Chào bạn." Anh ấy đi.',
    ['TP. Hồ Chí Minh rất đông.', 'Th.S. Nam nói: "Chào bạn."', 'Anh ấy đi.']
  ],
  [
    'Vietnamese ellipsis then lower case',
    'vi',
    'Anh ấy đi... rồi quay lại.',
    ['Anh ấy đi... rồi quay lại.']
  ],
  // --- Japanese
  [
    'dialogue with narration',
    'ja',
    '「おはよう。」と彼は言った。今日は晴れだ。「本当に？」彼女は笑った！',
    ['「おはよう。」', 'と彼は言った。', '今日は晴れだ。', '「本当に？」', '彼女は笑った！']
  ],
  [
    'two sentences inside one quote',
    'ja',
    '「行こう。もう遅い。」',
    ['「行こう。', 'もう遅い。」']
  ],
  ['ellipsis', 'ja', '彼は黙った……そして去った。', ['彼は黙った……そして去った。']],
  ['full-width indentation', 'ja', '　あ。\n\n　い。', ['あ。', 'い。']],
  ['chapter heading without a stop', 'ja', '第一章 山中薬舗', ['第一章 山中薬舗']],
  ['separator line', 'ja', 'あ。\n***\nい。', ['あ。', '***', 'い。']],
  [
    'characters outside the basic plane',
    'ja',
    '𠮷野家は旨い。😀そうだ。',
    ['𠮷野家は旨い。', '😀そうだ。']
  ],
  // --- Chinese
  [
    'simplified, quoted speech',
    'zh-Hans',
    '他说：“你好。”然后离开了。今天天气很好！你呢？',
    ['他说：“你好。”', '然后离开了。', '今天天气很好！', '你呢？']
  ],
  [
    'simplified, opening quote after a stop',
    'zh-Hans',
    '“走吧。”他说。“太晚了。”',
    ['“走吧。”', '他说。', '“太晚了。”']
  ],
  [
    'traditional, corner brackets',
    'zh-Hant',
    '他說：「你好。」然後離開了。',
    ['他說：「你好。」', '然後離開了。']
  ],
  // --- Edges for every language
  ['Windows line endings are just white space', 'zh-Hans', '甲。\r\n乙。', ['甲。', '乙。']],
  ['nothing but white space', 'en', ' \n\n \t \n', []],
  ['empty text', 'ja', '', []]
]
