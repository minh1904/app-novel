# Lịch sử đo của Mira Lab

> Tệp sinh tự động bởi `node scripts/lab/mira-lab.mjs history` lúc 2026-10-07T17:55:37.480Z; đừng sửa tay.
> Nguồn: `fixtures/private/lab/registry/`. Cách đọc ở [chạy thí nghiệm](running-experiments.md#sổ-đăng-ký-lần-chạy).

Commit có `+` là lúc chạy còn thay đổi chưa commit; `~` là commit đoán theo thời điểm cho lần chạy
nhập lại. Prompt `legacy` là thế hệ trước khi hợp nhất (v1–v4), không phân biệt được từ request.
Xưng hô lệch chỉ so được giữa các dòng chấm cùng nhãn người nói và cùng chương.
Nguồn glossary `claude-draft` là dữ liệu soạn tay ngoài sản phẩm: số đo đó không nói về luồng thật
của Mira, vì bỏ qua bước AI trích xuất glossary và xưng hô.

## 【12/8 書籍 最終巻 発売】ゴブリン令嬢と転生貴族が幸せになるまで　　婚約者の彼女のための前世知識の上手な使い方 (n0174gy)

| Biến thể | Model | Thinking | Prompt | Đầu ra | System | Commit | Nguồn glossary | Chương | Lệch đoạn | Đoạn thiếu | Lạ/lặp/hỏi lại | Glossary | Tên nhất quán | Xưng hô lệch | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v1 | gemini-2.5-flash | mặc định | legacy | text | 22 hash (system đổi theo lô) | bb81f34~ | claude-draft | 1–6 | 0 | 0 | – | 86% (246/286) | – | – | $0.130 |
| v2 | gemini-2.5-flash | mặc định | legacy | text | f5f85742 | bb81f34~ | claude-draft | 1–6 | 0 | 0 | – | 90.6% (259/286) | – | – | $0.134 |

Mọi lần đo, mới nhất trước:

| Lúc đo | Biến thể | Chương | Cơ sở | Chỉ số | Commit | Lần chạy |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-06 08:44 | v2 | 1–6 | theo chương | lệch 0, thiếu 0 đoạn; glossary 90.6% | 21e1286 | 1 |
| 2026-10-06 08:44 | v1 | 1–6 | theo chương | lệch 0, thiếu 0 đoạn; glossary 86% | 21e1286 | 1 |

## おひとり様には慣れましたので。 (n1354hz)

| Biến thể | Model | Thinking | Prompt | Đầu ra | System | Commit | Nguồn glossary | Chương | Lệch đoạn | Đoạn thiếu | Lạ/lặp/hỏi lại | Glossary | Tên nhất quán | Xưng hô lệch | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v1 | gemini-2.5-flash | mặc định | legacy | text | 14 hash (system đổi theo lô) | bb81f34~ | claude-draft | 1–21 | 0 | 0 | – | 99.5% (544/547) | – | – | $0.103 |
| v2 | gemini-2.5-flash | mặc định | legacy | text | f5f85742 | bb81f34~ | claude-draft | 1–21 | 0 | 0 | – | 100% (547/547) | – | – | $0.097 |

Mọi lần đo, mới nhất trước:

| Lúc đo | Biến thể | Chương | Cơ sở | Chỉ số | Commit | Lần chạy |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-06 08:44 | v2 | 1–21 | theo chương | lệch 0, thiếu 0 đoạn; glossary 100% | 21e1286 | 2 |
| 2026-10-06 08:44 | v1 | 1–21 | theo chương | lệch 0, thiếu 0 đoạn; glossary 99.5% | 21e1286 | 2 |

## 俺の異世界姉妹が自重しない！ (n4696dd)

| Biến thể | Model | Thinking | Prompt | Đầu ra | System | Commit | Nguồn glossary | Chương | Lệch đoạn | Đoạn thiếu | Lạ/lặp/hỏi lại | Glossary | Tên nhất quán | Xưng hô lệch | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| extract→n4696dd.ai | gemini-2.5-flash | off | glossary-extract-v1 | text | 14e89ae1, 187bbfac | 21e1286 | – | – | – | – | – | – | – | – | $0.065 |
| extract→n4696dd.lite35 | gemini-3.5-flash-lite | minimal | glossary-extract-v1 | text | 14e89ae1, 187bbfac | 4575814 | – | – | – | – | – | – | – | – | $0.047 |
| v2-nothink+moi | gemini-3.1-flash-lite | off | legacy | text | ef199c8c | bb81f34~, c2286c5~ | claude-draft | 1–30 | 0 | 0 | – | 99.7% (308/309) | – | 23.2% (33/142, nhãn v4-nothink) | $0.321 |
| v3-nothink | gemini-3.1-flash-lite | off | legacy | text | b4ffde11 | c2286c5~ | claude-draft | 1–10 | 0 | 0 | – | 96.8% (60/62) | – | 17.6% (25/142, nhãn v4-nothink) | $0.090 |
| v3-nothink+t1 | gemini-3.1-flash-lite | off | legacy | text | b4ffde11 | 5d27551~ | claude-draft | 1–10 | 0 | 0 | – | 96.8% (60/62) | – | 18.3% (26/142, nhãn v4-nothink) | $0.168 |
| v3-nothink+t1-full | gemini-3.1-flash-lite | off | legacy | text | b4ffde11 | 5d27551~ | claude-draft | 1–10 | 0 | 0 | – | 100% (62/62) | – | 31.7% (45/142, nhãn v4-nothink) | $0.103 |
| v4-nothink | gemini-3.1-flash-lite | off | legacy | text | 2e4f4a0d | 5d27551~ | claude-draft | 1–10 | 0 | 0 | – | 96.8% (60/62) | – | 13.4% (19/142, nhãn v4-nothink) | $0.121 |
| v5-minimal+lite35 | gemini-3.5-flash-lite | minimal | translate-v5 | text | 9f872613 | 2fc6091+, f9c101a+, 1d68eae+ | ai | 1–30 | 1 | 0 | – | 51.3% (157/306) | 90.4% (9 tên) | – | $1.085 |
| v5-minimal+lite35gloss | gemini-3.5-flash-lite | minimal | translate-v5 | text | 9f872613 | d5360e1+ | ai | 1–30 | 17 | 264 | – | 57% (57/100) | 69.6% (9 tên) | – | $0.857 |
| v5-nothink+aigloss | gemini-2.5-flash | off | translate-v5 | text | 9f872613 | 21e1286, 21e1286+ | ai | 1–30 | 0 | 0 | – | 48.2% (149/309) | 93.7% (9 tên) | – | $0.724 |
| v5-nothink+aigloss+polish | gemini-2.5-flash | off | polish-v1, polish-v2 | text | ba5f1a7b, c6ecfc48 | 21e1286+ | ai | – | – | – | – | – | – | – | $0.051 |
| v5-think+aigloss | gemini-2.5-flash | medium | translate-v5 | text | 9f872613 | 21e1286, 21e1286+ | ai | 1–30 | 0 | 0 | – | 48.9% (151/309) | 93.6% (9 tên) | – | $2.199 |
| v5-think+nogloss | gemini-2.5-flash | medium | translate-v5 | text | 9f872613 | 21e1286 | none | 1–30 | 0 | 0 | – | 42% (149/355) | 74.4% (17 tên) | – | $1.961 |

Mọi lần đo, mới nhất trước:

| Lúc đo | Biến thể | Chương | Cơ sở | Chỉ số | Commit | Lần chạy |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-07 17:55 | v5-nothink+aigloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 48.2%; tên nhất quán 93.7% | 1d68eae+ | 3 |
| 2026-10-07 17:55 | v5-minimal+lite35 | 1–30 | theo chương | lệch 1, thiếu 0 đoạn; glossary 51.3%; tên nhất quán 90.4% | 1d68eae+ | 3 |
| 2026-10-07 17:38 | v5-minimal+lite35gloss | 1–30 | theo chương | lệch 17, thiếu 264 đoạn; glossary 57%; tên nhất quán 69.6% | 0eeaa23+ | 2 |
| 2026-10-07 17:38 | v5-nothink+aigloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 48.2%; tên nhất quán 93.7% | 0eeaa23+ | 3 |
| 2026-10-07 17:38 | v5-minimal+lite35 | 1–30 | theo chương | lệch 10, thiếu 160 đoạn; glossary 51.5%; tên nhất quán 93.1% | 0eeaa23+ | 2 |
| 2026-10-07 17:12 | v5-nothink+aigloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 48.2%; tên nhất quán 93.7% | 2fc6091+ | 3 |
| 2026-10-07 17:12 | v5-minimal+lite35gloss | 1–30 | theo chương | lệch 17, thiếu 264 đoạn; glossary 57%; tên nhất quán 69.6% | 2fc6091+ | 2 |
| 2026-10-07 17:12 | v5-nothink+aigloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 48.2%; tên nhất quán 93.7% | 2fc6091+ | 3 |
| 2026-10-07 17:12 | v5-minimal+lite35gloss | 1–30 | theo chương | lệch 17, thiếu 264 đoạn; glossary 57%; tên nhất quán 69.6% | 2fc6091+ | 2 |
| 2026-10-07 16:34 | v5-think+aigloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 48.9%; tên nhất quán 93.6% | 4575814+ | 4 |
| 2026-10-07 16:34 | v5-nothink+aigloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 48.2%; tên nhất quán 93.7% | 4575814+ | 3 |
| 2026-10-07 16:34 | v5-minimal+lite35gloss | 1–30 | theo chương | lệch 13, thiếu 253 đoạn; glossary 71.9%; tên nhất quán 86.1% | 4575814+ | 1 |
| 2026-10-06 10:14 | v5-think+aigloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 93%; tên nhất quán 93.7% | 21e1286+ | 4 |
| 2026-10-06 10:14 | v5-think+nogloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 42%; tên nhất quán 74.4% | 21e1286+ | 2 |
| 2026-10-06 10:14 | v5-nothink+aigloss | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 94.1%; tên nhất quán 94.1% | 21e1286+ | 3 |
| 2026-10-06 08:45 | v4-nothink | 3–9 | theo chương | xưng hô lệch 19/142 (nhãn v4-nothink) | 21e1286 | 2 |
| 2026-10-06 08:45 | v3-nothink+t1-full | 3–9 | theo chương | xưng hô lệch 45/142 (nhãn v4-nothink) | 21e1286 | 2 |
| 2026-10-06 08:44 | v3-nothink+t1 | 3–9 | theo chương | xưng hô lệch 26/142 (nhãn v4-nothink) | 21e1286 | 2 |
| 2026-10-06 08:44 | v3-nothink | 3–9 | theo chương | xưng hô lệch 25/142 (nhãn v4-nothink) | 21e1286 | 1 |
| 2026-10-06 08:44 | v2-nothink+moi | 3–9 | theo chương | xưng hô lệch 33/142 (nhãn v4-nothink) | 21e1286 | 1 |
| 2026-10-06 08:44 | v4-nothink | 1–10 | theo chương | lệch 0, thiếu 0 đoạn; glossary 96.8% | 21e1286 | 2 |
| 2026-10-06 08:44 | v3-nothink+t1-full | 1–10 | theo chương | lệch 0, thiếu 0 đoạn; glossary 100% | 21e1286 | 3 |
| 2026-10-06 08:44 | v3-nothink+t1 | 1–10 | theo chương | lệch 0, thiếu 0 đoạn; glossary 96.8% | 21e1286 | 2 |
| 2026-10-06 08:44 | v3-nothink | 1–10 | theo chương | lệch 0, thiếu 0 đoạn; glossary 96.8% | 21e1286 | 1 |
| 2026-10-06 08:44 | v2-nothink+moi | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 99.7% | 21e1286 | 2 |

Lần chạy hỏng (không vào bảng so sánh chính):

| Lúc chạy | Biến thể | Model | Thinking | Lý do | USD |
| --- | --- | --- | --- | --- | --- |
| 2026-10-07 15:51 | v5-nothink+lite35 | gemini-3.5-flash-lite | off | mọi lời gọi lỗi HTTP (10/10) | $0.000 |

31 lần chạy không có kết cục từng đoạn (ghi trước schema 2): không tính được tỷ lệ hoàn thành của chúng.

## 乙女ゲームの破滅フラグしかない悪役令嬢に転生してしまった… (n5040ce)

| Biến thể | Model | Thinking | Prompt | Đầu ra | System | Commit | Nguồn glossary | Chương | Lệch đoạn | Đoạn thiếu | Lạ/lặp/hỏi lại | Glossary | Tên nhất quán | Xưng hô lệch | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v1 | gemini-2.5-flash | mặc định | legacy | text | 29 hash (system đổi theo lô) | bb81f34~ | claude-draft | 1–7 | 0 | 0 | – | 99.5% (388/390) | – | – | $0.127 |
| v2 | gemini-2.5-flash | mặc định | legacy | text | f5f85742 | bb81f34~ | claude-draft | 1–8 | 0 | 0 | – | 98.7% (459/465) | – | – | $0.149 |

Mọi lần đo, mới nhất trước:

| Lúc đo | Biến thể | Chương | Cơ sở | Chỉ số | Commit | Lần chạy |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-06 08:44 | v2 | 1–8 | theo chương | lệch 0, thiếu 0 đoạn; glossary 98.7% | 21e1286 | 1 |
| 2026-10-06 08:44 | v1 | 1–7 | theo chương | lệch 0, thiếu 0 đoạn; glossary 99.5% | 21e1286 | 1 |

## ヒモになりたい俺は、ヤンデレに飼われることにした (n5955en)

| Biến thể | Model | Thinking | Prompt | Đầu ra | System | Commit | Nguồn glossary | Chương | Lệch đoạn | Đoạn thiếu | Lạ/lặp/hỏi lại | Glossary | Tên nhất quán | Xưng hô lệch | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v1-nothink | gemini-3.1-flash-lite | off | legacy | text | 46 hash (system đổi theo lô) | bb81f34~ | claude-draft | 1–20 | 0 | 0 | – | 99.7% (590/592) | – | – | $0.094 |
| v1-think | gemini-3.1-flash-lite | medium | legacy | text | 46 hash (system đổi theo lô) | bb81f34~ | claude-draft | 1–20 | 0 | 0 | – | 99.7% (590/592) | – | – | $0.228 |
| v2-nothink | gemini-3.1-flash-lite | off | legacy | text | f5f85742 | bb81f34~ | claude-draft | 1–20 | 0 | 0 | – | 99.2% (587/592) | – | – | $0.092 |
| v2-nothink+ctx | gemini-3.1-flash-lite | off | legacy | text | 2ed8d772 | bb81f34~ | claude-draft | 1–20 | 1 | 0 | – | 89.3% (492/551) | – | – | $0.087 |
| v2-nothink+moi | gemini-3.1-flash-lite | off | legacy | text | 52efd427 | bb81f34~ | claude-draft | 1–30 | 0 | 0 | – | 93.3% (964/1033) | – | – | $0.144 |
| v2-nothink+preset | gemini-3.1-flash-lite | off | legacy | text | c85a0afb | bb81f34~ | claude-draft | 1–20 | 0 | 0 | – | 96.5% (571/592) | – | – | $0.090 |
| v2-think | gemini-3.1-flash-lite | medium | legacy | text | f5f85742 | bb81f34~ | claude-draft | 1–20 | 0 | 0 | – | 99.8% (591/592) | – | – | $0.195 |
| v3-nothink | gemini-3.1-flash-lite | off | legacy | text | 19a6401e | c2286c5~ | claude-draft | 1–20 | 0 | 0 | – | 98.3% (582/592) | – | – | $0.106 |

Mọi lần đo, mới nhất trước:

| Lúc đo | Biến thể | Chương | Cơ sở | Chỉ số | Commit | Lần chạy |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-06 08:44 | v3-nothink | 1–20 | theo chương | lệch 0, thiếu 0 đoạn; glossary 98.3% | 21e1286 | 1 |
| 2026-10-06 08:44 | v2-nothink+moi | 1–30 | theo chương | lệch 0, thiếu 0 đoạn; glossary 93.3% | 21e1286 | 1 |
| 2026-10-06 08:44 | v2-nothink+preset | 1–20 | theo chương | lệch 0, thiếu 0 đoạn; glossary 96.5% | 21e1286 | 1 |
| 2026-10-06 08:44 | v2-nothink+ctx | 1–20 | theo chương | lệch 1, thiếu 0 đoạn; glossary 89.3% | 21e1286 | 1 |
| 2026-10-06 08:44 | v2-think | 1–20 | theo chương | lệch 0, thiếu 0 đoạn; glossary 99.8% | 21e1286 | 1 |
| 2026-10-06 08:44 | v2-nothink | 1–20 | theo chương | lệch 0, thiếu 0 đoạn; glossary 99.2% | 21e1286 | 1 |
| 2026-10-06 08:44 | v1-think | 1–20 | theo chương | lệch 0, thiếu 0 đoạn; glossary 99.7% | 21e1286 | 1 |
| 2026-10-06 08:44 | v1-nothink | 1–20 | theo chương | lệch 0, thiếu 0 đoạn; glossary 99.7% | 21e1286 | 1 |

Lần chạy hỏng (không vào bảng so sánh chính):

| Lúc chạy | Biến thể | Model | Thinking | Lý do | USD |
| --- | --- | --- | --- | --- | --- |
| 2026-10-05 15:16 | v1-nothink | – | off | mọi lời gọi lỗi HTTP (7/7) | – |
| 2026-10-05 15:16 | v1-think | – | medium | mọi lời gọi lỗi HTTP (7/7) | – |
| 2026-10-05 15:16 | v2-nothink | – | off | mọi lời gọi lỗi HTTP (7/7) | – |
| 2026-10-05 15:16 | v2-think | – | medium | mọi lời gọi lỗi HTTP (7/7) | – |
