/**
 * Bộ mặc định xưng hô theo bối cảnh (register preset).
 *
 * Một bộ cho biết cặp xưng hô tiếng Việt **gợi ý** cho từng loại quan hệ trong một bối cảnh truyện:
 * học đường Nhật, quý tộc fantasy, cổ trang Trung… Bộ chỉ dùng khi một cặp nhân vật **chưa có** trong
 * ma trận xưng hô đã duyệt; cặp đã duyệt luôn thắng. Thứ quyết định cặp là quan hệ; đại từ của bản
 * gốc là tín hiệu giọng điệu (お前 so với 君, 你 so với 您), không phải bảng đổi từng đại từ.
 *
 * Phân loại theo **bối cảnh**, không theo thể loại: truyện tình cảm và trinh thám cùng đặt ở học đường
 * Nhật dùng chung một bộ.
 */

export const REGISTER_PRESET_IDS = [
  'ja-modern',
  'ja-fantasy',
  'ja-court',
  'zh-ancient',
  'zh-modern',
  'en-western'
] as const
export type RegisterPresetId = (typeof REGISTER_PRESET_IDS)[number]

export interface PresetRow {
  /** Loại quan hệ, viết theo chiều A → B. */
  relation: string
  /** Tín hiệu trong bản gốc nhận ra quan hệ hoặc mức thô. */
  signals?: string
  /** A tự xưng – A gọi B. */
  forward: string
  /** B tự xưng – B gọi A, khi khác chiều thuận. */
  backward?: string
  notes?: string
}

export interface RegisterPreset {
  id: RegisterPresetId
  label: string
  sourceLangs: Array<'ja' | 'zh-Hans' | 'zh-Hant' | 'en'>
  rows: PresetRow[]
  /** Cách người kể gọi nhân vật ở ngôi ba. */
  thirdPerson: string[]
}

/** Gọi tên và lược đại từ: đúng với mọi ngôn ngữ nguồn, nên vừa ở luật chung vừa đi vào chat. */
export const NAME_ADDRESSING_RULE =
  'Khi bản gốc gọi tên hoặc chức danh thì giữ cách gọi tương ứng theo quy ước tên; có thể lược đại từ nếu câu vẫn rõ và tự nhiên, không nhét đủ cặp xưng hô vào mọi câu.'

/** Quy tắc xưng hô chung cho mọi bộ bối cảnh. */
export const ADDRESSING_RULES = [
  'Cặp xưng hô đã duyệt trong <addressing> là bắt buộc, kể cả khi nhân vật nói gắt; bảng mặc định chỉ dùng cho cặp chưa có ở đó.',
  'Quan hệ giữa hai người quyết định cặp xưng hô; đại từ của bản gốc là tín hiệu về giọng, tính cách và mức thô hay lịch sự, không phải bảng quy đổi từng chữ.',
  'Khi bản gốc đổi cách xưng gọi giữa cảnh (giận, mỉa mai, chuyển sang kính ngữ), thể hiện thay đổi bằng giọng điệu, tên gọi hoặc kính ngữ trong phạm vi quy ước đã duyệt; không tự phá cặp đã chốt chỉ vì nhân vật giận.',
  'Chỉ đổi cặp theo mốc có trong truyện (tỏ tình, cưới, bái sư, lộ thân phận…), không đổi sớm hơn nguyên tác.',
  'Không dùng "tôi – bạn" trong lời thoại.',
  'Giọng vùng miền (tớ – cậu hay tui – ông/bà) theo tính cách nhân vật, không theo mặc định chung.',
  'Người kể gọi mỗi nhân vật bằng một đại từ ngôi ba cố định cho cả truyện; chỉ đổi khi thái độ của người kể đổi theo mốc truyện.',
  NAME_ADDRESSING_RULE
]

export const REGISTER_PRESETS: Record<RegisterPresetId, RegisterPreset> = {
  'ja-modern': {
    id: 'ja-modern',
    label: 'Nhật hiện đại, học đường',
    sourceLangs: ['ja'],
    rows: [
      {
        relation: 'Bạn nam cùng tuổi, chưa thân',
        signals: '俺/僕 + 苗字(くん)',
        forward: 'tôi – cậu'
      },
      {
        relation: 'Bạn nam thân nhau',
        signals: '俺 + お前, gọi trống tên',
        forward: 'tôi – cậu (nhân vật chính) hoặc tao – mày',
        notes:
          'tao – mày cho vai phụ ồn ào, côn đồ hoặc cặp thân lâu năm cùng nói thô; không tự gán cho nhân vật chính'
      },
      {
        relation: 'Bạn nữ – nữ, nam ↔ nữ là bạn',
        signals: 'あたし/私 + 名前, ちゃん, くん',
        forward: 'tớ / mình – cậu',
        notes: 'Nam chính đã xưng "tôi" trong lời kể thì giữ "tôi – cậu"'
      },
      {
        relation: 'Bạn lạnh nhạt, khó chịu',
        signals: 'あんた, quay lại gọi 苗字さん',
        forward: 'tôi – cậu'
      },
      {
        relation: 'Người yêu đã xác nhận',
        signals: 'đã tỏ tình và gọi trống tên',
        forward: 'anh – em',
        backward: 'em – anh',
        notes: 'Cần cả hai tín hiệu; chưa đủ thì giữ cặp bạn bè'
      },
      {
        relation: 'Đàn em → đàn anh, đàn chị',
        signals: '先輩 + kính ngữ',
        forward: 'em – anh / chị (hoặc giữ "senpai")',
        backward: 'anh / chị – em; nói thô: tao – mày'
      },
      {
        relation: 'Thầy cô → học trò, lịch sự',
        signals: '私/僕 + 君, 苗字',
        forward: 'cô / thầy – em',
        notes: 'Xa cách: cô / thầy – cậu; tôi – cậu khi quy ước nhân vật đã chốt như vậy'
      },
      {
        relation: 'Thầy cô → học trò, thô',
        signals: '私 + お前/テメェ',
        forward: 'cô / thầy – cậu',
        notes: 'Giữ cặp cả khi gắt; chuyển độ thô vào từ ngữ đúng mức bản gốc'
      },
      {
        relation: 'Học trò → thầy cô',
        signals: '先生 + kính ngữ',
        forward: 'em – cô / thầy',
        notes: 'Bùng nổ (あんた/テメェ): tôi – cô / thầy'
      },
      {
        relation: 'Cha mẹ → con',
        signals: 'お前, 名前',
        forward: 'bố / mẹ – con',
        backward: 'con – bố / mẹ'
      },
      {
        relation: 'Anh chị em ruột',
        signals: 'お兄ちゃん, 姉さん / 俺, 私 + お前',
        forward: 'em – anh / chị',
        backward: 'anh / chị – em; anh em trai cãi nhau: tao – mày'
      },
      {
        relation: 'Sếp ↔ nhân viên',
        signals: '君, 苗字くん / 敬語 + 役職',
        forward: 'tôi – cậu / cô',
        backward: 'tôi / em – anh / chị / sếp'
      },
      {
        relation: 'Người lạ',
        signals: 'あなた + 敬語',
        forward: 'tôi – anh / chị / cô / cậu theo tuổi',
        notes: 'Không dùng "bạn"'
      },
      { relation: 'Kẻ thù, côn đồ', signals: '俺 + てめぇ/貴様', forward: 'tao – mày' }
    ],
    thirdPerson: [
      'Lời kể ngôi một bằng 俺/僕/私 dịch là "tôi".',
      'Nhân vật nam: cậu ấy, anh ấy hoặc gọi tên; nữ: cô ấy, cô bé hoặc gọi tên. Không dùng "nàng", "hắn ta", "nàng ta" kiểu cổ văn.',
      'Phản diện hoặc người kể khinh: gã, hắn; trẻ con: nó, em.'
    ]
  },
  'ja-fantasy': {
    id: 'ja-fantasy',
    label: 'Fantasy quý tộc, isekai (nguồn Nhật)',
    sourceLangs: ['ja'],
    rows: [
      {
        relation: 'Hầu gái, quản gia → chủ',
        signals: 'お嬢様/坊ちゃま + kính ngữ, không đại từ',
        forward: 'tôi – tiểu thư / thiếu gia (kèm ạ, thưa)',
        backward: 'tôi – [tên] / chị / cô',
        notes:
          'Mặc định xưng "tôi"; thiếu nữ nhỏ tuổi gắn bó với chủ: em – tiểu thư / chủ nhân; chủ nhỏ tuổi: em – chị. Không dùng "nô tỳ"'
      },
      {
        relation: 'Vua, hoàng tử → thần dân, nghi lễ',
        signals: '余/我 + そなた/お前',
        forward: 'ta – ngươi',
        notes: 'Chỉ ở tầng nghi lễ: phong tước, tuyên bố hoàng gia'
      },
      {
        relation: 'Vua, hoàng tử → người dưới, thường ngày',
        signals: '私/僕 + 君/あなた',
        forward: 'ta – cậu / cô hoặc tôi – cậu'
      },
      {
        relation: 'Thần dân, quý tộc → hoàng tộc',
        signals: '殿下/陛下 + kính ngữ',
        forward: 'tôi – người / ngài, kèm "thưa Điện hạ / Bệ hạ"',
        notes:
          'Không dùng "thần" trong fantasy phương Tây; chỉ cận vệ, quan lại trực thuộc mới xưng "thần". Không trộn "thần" với "tôi" trong một cảnh'
      },
      {
        relation: 'Quý tộc ngang hàng, lịch sự',
        signals: '～様 + kính ngữ',
        forward: 'tôi – ngài / cô (hoặc tên kèm hậu tố theo chính sách kính ngữ)',
        notes:
          'Kính ngữ ở đây phần lớn là màu giai cấp; hai cô gái bạn bè: mình – cậu. Nếu Việt hóa kính ngữ: -sama → ngài / tiểu thư / công chúa, không ghép lai "công chúa-sama"'
      },
      {
        relation: 'Quý tộc ngang hàng, thân',
        signals: '俺/僕 + お前/君, nói trống',
        forward: 'tôi – cậu',
        notes: 'Nam rất thân, cả hai nói thô: tao – mày'
      },
      {
        relation: 'Hôn phu → hôn thê',
        signals: '僕/私 + 君 (± kính ngữ)',
        forward:
          'tôi – cô (hoặc ta – nàng nếu giọng trang trọng) khi chưa yêu; anh – em khi đã yêu',
        backward: 'em – ngài khi chưa yêu; em – anh khi đã yêu',
        notes: 'Chọn một cặp và khóa tới mốc truyện; không trộn "anh … nàng" trong cùng câu'
      },
      {
        relation: 'Hôn phu thô',
        signals: '俺 + お前',
        forward: 'ta – cô khi chưa thân; anh – em khi đã yêu'
      },
      {
        relation: 'Cha mẹ quý tộc ↔ con',
        signals: '父上/お父様, 私/儂 + お前/君',
        forward: 'cha / mẹ – con',
        backward: 'con – cha / mẹ (thưa)',
        notes: 'Không dùng "ta" cho cha mẹ với con'
      },
      {
        relation: 'Anh chị em quý tộc',
        signals: 'お兄様, 姉さん',
        forward: 'em – anh / chị',
        backward: 'anh / chị – em',
        notes: 'Giữ "Onii-sama" hay dịch theo chính sách kính ngữ của truyện'
      },
      {
        relation: 'Hiệp sĩ → chủ',
        signals: '私 + 殿下/お嬢様 + kính ngữ',
        forward: 'tôi – điện hạ / tiểu thư'
      },
      {
        relation: 'Giáo viên học viện ↔ học sinh',
        signals: '私 + 君/～さん / 先生 + kính ngữ',
        forward: 'thầy / cô – em',
        backward: 'em – thầy / cô'
      },
      {
        relation: 'Phản diện, kẻ thù',
        signals: '貴様/お前 + 俺/私',
        forward: 'ta – ngươi',
        notes:
          'Côn đồ, dân thường: tao – mày; bề trên giận với người dưới (貴様): ngươi hoặc cậu, giọng gằn'
      }
    ],
    thirdPerson: [
      'Lời kể ngôi một bằng 俺/私 dịch là "tôi"; nội tâm người chuyển sinh giữ giọng hiện đại, lệch với thoại quý tộc là chất hài.',
      'Nhân vật chính: anh ấy, cô ấy hoặc gọi tên; công chúa, tiểu thư có thể là "nàng" nếu giọng kể trang trọng.',
      'Phản diện: hắn, gã, lão; người già: ông lão, bà lão.'
    ]
  },
  'ja-court': {
    id: 'ja-court',
    label: 'Cung đình Á Đông (nguồn Nhật, ví dụ hậu cung kiểu Hoa)',
    sourceLangs: ['ja'],
    rows: [
      {
        relation: 'Quan lại, cận thần → vua, hoàng tộc',
        signals: '陛下/殿下/娘娘 + 敬語',
        forward: 'thần – bệ hạ / điện hạ / nương nương',
        notes: 'Chỉ trong bối cảnh cung đình kiểu Á Đông'
      },
      {
        relation: 'Cung nữ, nô tỳ → chủ',
        signals: '奴婢, 娘娘, 敬語',
        forward: 'nô tỳ – nương nương / chủ tử',
        backward: 'ta / bổn cung – ngươi'
      },
      {
        relation: 'Phi tần → vua',
        signals: '陛下 + 敬語',
        forward: 'thần thiếp – bệ hạ / hoàng thượng'
      },
      {
        relation: 'Vua → bề tôi, phi tần',
        signals: '朕/余, 我',
        forward: 'trẫm – khanh / ái phi; riêng tư: ta – nàng'
      },
      {
        relation: 'Quan lại ngang hàng',
        signals: '私 + 敬語',
        forward: 'tại hạ / tôi – đại nhân / ngài'
      },
      {
        relation: 'Bạn bè, đồng sự thân',
        signals: '俺 + お前, タメ口',
        forward: 'ta – ngươi hoặc tôi – cậu',
        notes: 'Chọn theo giọng nhân vật, giữ cố định'
      }
    ],
    thirdPerson: [
      'Vua, hoàng tộc khi người kể kính trọng: người, ngài; nữ trẻ: nàng hoặc cô (giữ một cách); người kể khinh: hắn, gã, ả.'
    ]
  },
  'zh-ancient': {
    id: 'zh-ancient',
    label: 'Cổ trang, tiên hiệp, kiếm hiệp, cung đấu',
    sourceLangs: ['zh-Hans', 'zh-Hant'],
    rows: [
      {
        relation: 'Sư phụ → đồ đệ',
        signals: '师父, 为师, 徒儿',
        forward: 'ta / vi sư – ngươi / đồ nhi / tên + "nhi"',
        backward: 'đệ tử, đồ nhi – sư phụ / sư tôn',
        notes: '"ngươi" của bậc trên vẫn có thể thân tình; không dùng "con"'
      },
      {
        relation: 'Đồng môn',
        signals: '师兄, 师姐, 师弟, 师妹',
        forward: 'đệ / muội – sư huynh / sư tỷ',
        backward: 'huynh / tỷ – sư đệ / sư muội',
        notes: 'Theo thứ tự nhập môn, không theo tuổi'
      },
      {
        relation: 'Người giang hồ ngang hàng, mới gặp',
        signals: '在下, 阁下, 兄台',
        forward: 'tại hạ – các hạ / huynh đài',
        notes: 'Đã quen: "X mỗ – X huynh", "tiểu đệ"'
      },
      {
        relation: 'Vãn bối → tiền bối',
        signals: '晚辈, 前辈, 老夫',
        forward: 'vãn bối – tiền bối',
        backward: 'lão phu / ta – ngươi / tiểu tử',
        notes: 'Tiên hiệp xét theo cảnh giới, không theo tuổi'
      },
      { relation: 'Tu sĩ ngang hàng', signals: '道友', forward: 'tại hạ / X mỗ – đạo hữu' },
      {
        relation: 'Kẻ thù',
        signals: '我/你 khi đối đầu, 老子',
        forward: 'ta – ngươi',
        notes: 'Thô tục: "lão tử – tên nhãi"; đổi giữa cảnh khi bản gốc đổi'
      },
      {
        relation: 'Vua → bề tôi',
        signals: '朕, 爱卿',
        forward: 'trẫm – khanh / ái khanh',
        backward: 'thần / vi thần – bệ hạ / hoàng thượng',
        notes: 'Lúc riêng tư, vua dùng 我 thì dịch "ta"'
      },
      {
        relation: 'Vua ↔ phi tần',
        signals: '朕, 臣妾',
        forward: 'trẫm (riêng tư: ta) – nàng / ái phi',
        backward: 'thần thiếp – hoàng thượng',
        notes: '臣妾 là "thần thiếp", không phải "nô tỳ"'
      },
      {
        relation: 'Chủ cung → cung nữ',
        signals: '本宫, 奴婢',
        forward: 'bổn cung – ngươi',
        backward: 'nô tỳ – nương nương'
      },
      {
        relation: 'Nam ↔ nữ chưa xác nhận tình cảm',
        signals: '公子, 姑娘',
        forward: 'tại hạ / ta – cô nương',
        backward: 'ta / tiểu nữ – công tử',
        notes: 'Chưa gọi "nàng" khi nói trực tiếp'
      },
      {
        relation: 'Phu thê, người yêu đã xác nhận',
        signals: '夫君, 相公, 娘子, 妾身',
        forward: 'ta – nàng',
        backward: 'ta – chàng; "thiếp" chỉ khi trang trọng hoặc trước người ngoài',
        notes:
          'Không dùng "thiếp – chàng" làm mặc định; nữ nhắc người yêu với người khác: "chàng" hoặc "huynh ấy"'
      },
      {
        relation: 'Bậc trên trong nhà → con cháu',
        signals: '爹, 娘, 孩儿',
        forward: 'ta / cha / mẹ – con / cháu',
        backward: 'con – cha / mẹ',
        notes: 'Không gọi con cháu là "các ngươi"'
      },
      {
        relation: 'Anh chị em ruột',
        signals: '哥, 姐, 弟, 妹',
        forward: 'huynh / tỷ – đệ / muội',
        notes:
          'Cổ trang dùng Hán Việt; nhân vật xuyên không kể chuyện vẫn xưng "tôi" và không xưng huynh, muội'
      }
    ],
    thirdPerson: [
      'Nam chính: "hắn"; nhân vật thanh nhã, trầm tĩnh: "y"; nữ trẻ: "nàng". "chàng" chỉ khi đoạn văn nhìn từ người yêu của nhân vật. Mỗi nhân vật một đại từ, không đổi qua lại.',
      'Phản diện: hắn, gã, y; người già: lão, ông ta; bậc tôn quý khi người kể kính trọng: người, ngài.',
      'Phụ nữ bị ghét: nàng ta, cô ta, ả; trẻ con: nó.'
    ]
  },
  'zh-modern': {
    id: 'zh-modern',
    label: 'Đô thị, hiện đại Trung Quốc',
    sourceLangs: ['zh-Hans', 'zh-Hant'],
    rows: [
      {
        relation: 'Bạn học cùng tuổi',
        signals: '同学, 你',
        forward: 'tớ / mình – cậu',
        notes: 'Nam thân nhau hoặc nói thô: tao – mày'
      },
      {
        relation: 'Khóa dưới → khóa trên',
        signals: '学长, 学姐',
        forward: 'em – anh / chị',
        backward: 'anh / chị – em',
        notes: '学长 không ngầm báo yêu đương'
      },
      {
        relation: 'Học sinh → thầy cô',
        signals: '老师',
        forward: 'em – thầy / cô',
        backward: 'thầy / cô – em'
      },
      {
        relation: 'Đồng nghiệp',
        signals: '你, 您',
        forward: 'tôi – anh / chị (theo tuổi)',
        notes: '您 → anh/chị kèm "ạ"; đồng nghiệp trẻ thân: chị – em'
      },
      {
        relation: 'Nhân viên → sếp, tổng tài',
        signals: '总裁, 老板, 您',
        forward: 'tôi – tổng giám đốc / sếp / Tổng + họ',
        backward: 'tôi – cô / cậu',
        notes: 'Trước người khác giữ danh xưng; lúc riêng chỉ đổi khi có mốc'
      },
      {
        relation: 'Người lạ',
        signals: '你',
        forward: 'tôi – anh / chị / cô / bác (theo tuổi, giới)'
      },
      {
        relation: 'Đối đầu',
        signals: '你 lạnh lùng hoặc chửi',
        forward: 'tôi – anh / cô (lạnh)',
        notes: 'Cãi gay gắt: tao – mày'
      },
      {
        relation: 'Người yêu đã xác nhận',
        signals: '宝贝, 亲爱的, 老公, 老婆',
        forward: 'anh – em',
        backward: 'em – anh',
        notes: '宝贝/亲爱的 có thể chỉ là cách gọi bạn bè, kiểm tra quan hệ trước'
      },
      {
        relation: 'Gia đình',
        signals: '爸, 妈, 哥, 姐',
        forward: 'bố / mẹ – con; anh / chị – em',
        notes: '哥/姐 không chứng minh là ruột thịt'
      },
      {
        relation: 'Giới giải trí',
        signals: 'X哥, X姐',
        forward: 'em – anh / chị + tên',
        notes: 'Gọi theo nghề'
      }
    ],
    thirdPerson: [
      'Nam chính: anh, anh ấy; nữ chính: cô, cô ấy. Không dùng cặp "hắn – nàng" cho truyện hiện đại.',
      'Phản diện, người bị ghét: anh ta, cô ta, gã, hắn; người lớn tuổi: ông ấy, bà ấy; trẻ con: nó, thằng bé, con bé.'
    ]
  },
  'en-western': {
    id: 'en-western',
    label: 'Phương Tây hiện đại và fantasy (nguồn Anh)',
    sourceLangs: ['en'],
    rows: [
      {
        relation: 'Bạn thân tuổi teen',
        signals: 'gọi tên, nói suồng sã',
        forward: 'tớ / mình – cậu'
      },
      { relation: 'Người lớn ngang hàng', signals: 'gọi tên', forward: 'tôi – anh / chị' },
      {
        relation: 'Thầy cô ấm áp → học trò',
        signals: 'sir, professor',
        forward: 'thầy / cô – con',
        backward: 'con – thầy / cô'
      },
      {
        relation: 'Thầy cô lạnh lùng → học trò',
        signals: 'Mr/Miss X',
        forward: 'ta – trò / gọi họ',
        backward: 'em / con – thầy / cô'
      },
      {
        relation: 'Nam ↔ nữ cùng tuổi chưa yêu',
        signals: 'gọi tên',
        forward: 'tôi – cậu',
        notes: 'Giữ tới khi nguyên tác xác nhận quan hệ'
      },
      {
        relation: 'Người yêu',
        signals: 'đã xác nhận yêu nhau; darling, honey giữa hai người',
        forward: 'anh – em',
        backward: 'em – anh',
        notes: '"love", "darling" kiểu Anh có thể chỉ là cách gọi thân, kể cả với người lạ'
      },
      {
        relation: 'Người hầu → chủ (fantasy)',
        signals: 'my lord, my lady, master',
        forward: 'tôi – ngài / tiểu thư / cậu chủ',
        backward: 'gọi tên / cô / cậu; ta – ngươi chỉ khi chủ cố ý kẻ cả'
      },
      {
        relation: 'Bề tôi, hiệp sĩ → vua',
        signals: 'Your Majesty, Sir X',
        forward: 'thần / tôi – bệ hạ',
        backward: 'ta – khanh / ngươi',
        notes: 'Không dùng "trẫm", "bổn cung"; "Sir X" là "ngài X"'
      },
      {
        relation: 'Kẻ thù',
        signals: 'you khinh miệt',
        forward: 'ta – ngươi (fantasy) / tao – mày (hiện đại)'
      }
    ],
    thirdPerson: [
      'Nhân vật chính: anh, cô, cậu hoặc gọi tên; truyện cổ điển có thể dùng chàng, nàng; trẻ con: nó.',
      'Giữ một cách gọi cho mỗi nhân vật trong chuỗi câu; người kể ghét ai thì mới hạ xuống gã, hắn, mụ.'
    ]
  }
}
