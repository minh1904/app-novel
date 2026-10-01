"""Render an exploratory Mira work-detail mockup with the repository font."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).with_name("work-detail-light.png")
FONT = ROOT / "src/renderer/src/assets/GoogleSansFlex.ttf"
CJK_FONT = Path("C:/Windows/Fonts/msyh.ttc")
S = 2
W, H = 1440, 980

canvas = Image.new("RGB", (W * S, H * S), "#fcfcfd")
draw = ImageDraw.Draw(canvas)


def box(rect, fill, radius=0, outline=None, width=1):
    coords = tuple(int(v * S) for v in rect)
    if radius:
        draw.rounded_rectangle(coords, radius * S, fill=fill, outline=outline, width=width * S)
    else:
        draw.rectangle(coords, fill=fill, outline=outline, width=width * S)


def line(points, fill, width=1):
    draw.line([(int(x * S), int(y * S)) for x, y in points], fill=fill, width=width * S)


def circle(rect, fill, outline=None, width=1):
    draw.ellipse(tuple(int(v * S) for v in rect), fill=fill, outline=outline, width=width * S)


def font(size, weight="regular", face="ui"):
    path = CJK_FONT if face == "cjk" else FONT
    return ImageFont.truetype(str(path), size * S)


def txt(x, y, value, size=13, color="#0a0a0a", weight="regular", anchor=None, face="ui"):
    draw.text((x * S, y * S), value, font=font(size, weight, face), fill=color, anchor=anchor)


def icon_more(x, y, color="#737373"):
    for offset in (-6, 0, 6):
        circle((x + offset - 1.5, y - 1.5, x + offset + 1.5, y + 1.5), color)


def icon_chevron(x, y, color="#737373"):
    line([(x - 4, y - 2), (x, y + 2), (x + 4, y - 2)], color)


def icon_sidebar(x, y, color="#737373"):
    box((x, y, x + 15, y + 14), None, radius=2, outline=color)
    line([(x + 5, y), (x + 5, y + 14)], color)


def icon_sun(x, y, color="#737373"):
    circle((x + 4, y + 4, x + 12, y + 12), None, outline=color)
    for a, b, c, d in [(8, 0, 8, 2), (8, 14, 8, 16), (0, 8, 2, 8), (14, 8, 16, 8)]:
        line([(x + a, y + b), (x + c, y + d)], color)


def icon_grid(x, y, color="#737373"):
    for dx in (0, 9):
        for dy in (0, 9):
            box((x + dx, y + dy, x + dx + 5, y + dy + 5), None, radius=1, outline=color)


def icon_clock(x, y, color="#737373"):
    circle((x, y, x + 16, y + 16), None, outline=color)
    line([(x + 8, y + 3), (x + 8, y + 8), (x + 12, y + 10)], color)


def icon_archive(x, y, color="#737373"):
    box((x + 1, y + 3, x + 16, y + 15), None, radius=2, outline=color)
    line([(x, y + 2), (x + 17, y + 2)], color)
    line([(x + 6, y + 8), (x + 11, y + 8)], color)


def icon_search(x, y, color="#737373"):
    circle((x, y, x + 11, y + 11), None, outline=color)
    line([(x + 9, y + 9), (x + 16, y + 16)], color, 2)


def icon_plus(x, y, color="#fafafa"):
    line([(x + 7, y), (x + 7, y + 14)], color, 2)
    line([(x, y + 7), (x + 14, y + 7)], color, 2)


def nav_item(y, label, icon, selected=False):
    if selected:
        box((12, y - 7, 235, y + 29), "#dadada", radius=10)
    icon(27, y + 3, "#0a0a0a" if selected else "#737373")
    txt(55, y + 2, label, 13, "#0a0a0a" if selected else "#737373")


# App chrome and navigation.
box((0, 0, 248, H), "#f1f1f1")
line([(247, 0), (247, H)], "#dddddd")
box((248, 0, W, 52), "#f6f6f7")
line([(248, 51), (W, 51)], "#e7e7e7")
txt(22, 17, "Mira", 18, weight="semibold")
txt(21, 71, "THƯ VIỆN", 10, "#737373", "semibold")
nav_item(103, "Tất cả tác phẩm", icon_grid, selected=True)
nav_item(145, "Gần đây", icon_clock)
nav_item(187, "Lưu trữ", icon_archive)
line([(18, 238), (230, 238)], "#d8d8d8")
txt(22, 258, "TÁC PHẨM GẦN ĐÂY", 10, "#737373", "semibold")

for y, name, caption, mark, active in [
    (294, "Hiệu thuốc trên núi", "Đang dịch · 248 chương", "中", True),
    (351, "Mùa mưa ở Kyoto", "Tạm dừng · 16 chương", "日", False),
    (408, "The Last Orchard", "Chưa bắt đầu · 8 chương", "En", False),
]:
    if active:
        box((12, y - 8, 235, y + 43), "#e5e5e5", radius=10)
    box((22, y, 52, y + 38), "#283d49" if active else "#d9d9d9", radius=4)
    txt(37, y + 11, mark, 12, "#f8f8f6" if active else "#737373", anchor="mt", face="cjk" if mark != "En" else "ui")
    txt(61, y + 1, name, 12, "#0a0a0a", "semibold")
    txt(61, y + 21, caption, 10, "#737373")

line([(16, 926), (232, 926)], "#d8d8d8")
txt(22, 944, "Mira 0.1.0", 10, "#737373")

icon_sidebar(264, 19)
txt(295, 19, "Thư viện", 12, "#737373")
txt(350, 18, "›", 17, "#a0a0a0")
txt(368, 19, "Hiệu thuốc trên núi", 12, "#0a0a0a", "semibold")
icon_sun(1401, 18)

# Breadcrumb and work header.
txt(300, 80, "Thư viện", 12, "#737373")
txt(357, 78, "›", 18, "#a0a0a0")
txt(377, 80, "Hiệu thuốc trên núi", 12, "#0a0a0a")

# Book cover, deliberately editorial rather than a generic placeholder.
for yy in range(132, 360):
    t = (yy - 132) / 228
    r = int(18 + 15 * t)
    g = int(40 + 26 * t)
    b = int(53 + 28 * t)
    line([(300, yy), (458, yy)], (r, g, b))
box((300, 132, 458, 360), None, radius=8, outline="#1d3641")
line([(318, 148), (318, 343)], "#748e93")
circle((333, 168, 425, 260), "#b8b29a")
circle((343, 176, 415, 248), "#d5ccb1")
draw.polygon([(300*S, 319*S), (339*S, 272*S), (364*S, 289*S), (396*S, 249*S), (458*S, 310*S), (458*S, 359*S), (300*S, 359*S)], fill="#152e3b")
draw.polygon([(300*S, 340*S), (356*S, 306*S), (385*S, 326*S), (422*S, 288*S), (458*S, 320*S), (458*S, 359*S), (300*S, 359*S)], fill="#214252")
txt(335, 278, "山中药铺", 21, "#f8f4e9", "semibold", face="cjk")
txt(335, 310, "HIỆU THUỐC", 10, "#c4d0cf", "semibold")
txt(335, 325, "TRÊN NÚI", 10, "#c4d0cf", "semibold")

txt(486, 132, "TÁC PHẨM  /  TRUNG GIẢN THỂ → VIỆT", 10, "#737373", "semibold")
txt(486, 158, "Hiệu thuốc trên núi", 31, "#0a0a0a", "semibold")
txt(487, 205, "山中药铺", 15, "#737373", face="cjk")
txt(487, 238, "Lý Minh", 13, "#0a0a0a", "semibold")
txt(550, 238, "·", 13, "#a0a0a0")
txt(563, 238, "Tiên hiệp, cổ đại", 13, "#737373")
box((486, 270, 570, 297), "#e5effb", radius=13)
txt(528, 278, "Đang dịch", 11, "#275c9f", "semibold", anchor="mt")
txt(584, 277, "248 chương", 12, "#737373")
txt(670, 277, "·", 12, "#a0a0a0")
txt(684, 277, "Sửa hôm nay", 12, "#737373")
txt(486, 315, "Ở một ngôi làng ven núi, tiệm thuốc nhỏ của Lâm An giữ nhiều bí mật hơn", 12, "#565656")
txt(486, 335, "những gì người qua đường nhìn thấy.  Xem thêm", 12, "#565656")

line([(1100, 139), (1100, 350)], "#e9e9e9")
txt(1127, 143, "LÀM VIỆC GẦN NHẤT", 10, "#737373", "semibold")
txt(1127, 171, "Chương 118", 19, "#0a0a0a", "semibold")
txt(1127, 201, "Lời hẹn dưới mưa", 12, "#737373")
box((1127, 239, 1388, 277), "#171717", radius=10)
draw.polygon([(1147*S, 249*S), (1147*S, 263*S), (1157*S, 256*S)], fill="#fafafa")
txt(1167, 247, "Tiếp tục chương 118", 13, "#fafafa", "semibold")
box((1127, 287, 1388, 325), "#f4f4f4", radius=10, outline="#e6e6e6")
txt(1194, 295, "Sửa thông tin", 13, "#0a0a0a", "semibold")
icon_more(1375, 345)
line([(300, 394), (1388, 394)], "#e6e6e6")

# Work-level destinations. Only Chapters belongs to the current M0 change.
for x, label, selected in [
    (300, "Chương", True),
    (414, "Thuật ngữ", False),
    (550, "Xưng hô", False),
    (671, "Nguồn raw", False),
    (807, "Tác vụ dịch", False),
]:
    txt(x, 419, label, 13, "#0a0a0a" if selected else "#737373", "semibold" if selected else "regular")
line([(300, 458), (1388, 458)], "#e6e6e6")
line([(300, 458), (375, 458)], "#171717", 2)

# The chapter list is the main working surface.
txt(300, 482, "Danh sách chương", 23, "#0a0a0a", "semibold")
txt(520, 492, "248 chương", 12, "#737373")
box((1225, 477, 1388, 515), "#171717", radius=10)
icon_plus(1243, 489)
txt(1268, 486, "Thêm chương", 13, "#fafafa", "semibold")

box((300, 532, 672, 572), "#f4f4f4", radius=10, outline="#e4e4e4")
icon_search(316, 544)
txt(347, 542, "Tìm chương hoặc nhập số…", 12, "#858585")
txt(1171, 545, "Sắp xếp theo thứ tự", 12, "#737373")
icon_chevron(1374, 552)

line([(300, 593), (1388, 593)], "#dddddd")
txt(317, 604, "SỐ", 10, "#737373", "semibold")
txt(394, 604, "TÊN CHƯƠNG", 10, "#737373", "semibold")
txt(1205, 604, "CẬP NHẬT", 10, "#737373", "semibold")
line([(300, 632), (1388, 632)], "#e7e7e7")

rows = [
    (1, "Lời mở đầu", "Hôm nay"),
    (2, "Người khách lạ", "Hôm qua"),
    (3, "Đêm mưa", "29/09/2026"),
    (4, "Bí mật trong tiệm thuốc", "28/09/2026"),
    (5, "Bức thư chưa gửi", "27/09/2026"),
]
for idx, title, date in rows:
    top = 633 + (idx - 1) * 51
    bottom = top + 51
    if idx == 2:
        box((300, top, 1388, bottom), "#f9fafb")
    txt(315, top + 14, f"{idx:02d}", 18, "#a3a3a3", "semibold")
    txt(394, top + 15, title, 13, "#0a0a0a", "semibold")
    txt(1205, top + 16, date, 12, "#737373")
    icon_more(1366, top + 25)
    line([(300, bottom), (1388, bottom)], "#ececec")

# A fixed list footer conveys the paging model even while the list scrolls.
box((300, 903, 1388, 967), "#fcfcfd")
line([(300, 903), (1388, 903)], "#dddddd")
txt(300, 926, "1–50 trong 248 chương", 12, "#737373")
txt(884, 926, "50 chương / trang", 12, "#737373")
icon_chevron(1015, 933)
line([(1103, 929), (1099, 933), (1103, 937)], "#737373")
box((1122, 916, 1156, 950), "#171717", radius=8)
txt(1139, 923, "1", 12, "#fafafa", "semibold", anchor="mt")
txt(1180, 923, "2", 12, "#737373", anchor="mt")
txt(1220, 923, "3", 12, "#737373", anchor="mt")
icon_more(1261, 934)
txt(1303, 923, "5", 12, "#737373", anchor="mt")
line([(1342, 929), (1346, 933), (1342, 937)], "#737373")

canvas.resize((W, H), Image.Resampling.LANCZOS).save(OUT)
print(OUT)
