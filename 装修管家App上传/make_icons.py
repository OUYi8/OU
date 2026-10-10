# -*- coding: utf-8 -*-
"""生成装修管家 App 图标：暖橙渐变 + 房子轮廓 + 进度环"""
import os
from PIL import Image, ImageDraw

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets_icon")

# 尺寸：mdpi 48 / hdpi 72 / xhdpi 96 / xxhdpi 144 / xxxhdpi 192
DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# 启动画面用大图
SPLASH_SIZES = {
    "drawable-port-mdpi": 320, "drawable-port-hdpi": 480,
    "drawable-port-xhdpi": 720, "drawable-port-xxhdpi": 960,
    "drawable-port-xxxhdpi": 1280,
    "drawable-land-mdpi": 480, "drawable-land-hdpi": 720,
    "drawable-land-xhdpi": 960, "drawable-land-xxhdpi": 1280,
    "drawable-land-xxxhdpi": 1600,
}

C_TOP = (232, 158, 106)
C_BOT = (170, 84, 40)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def bg_gradient(size):
    """竖向渐变底"""
    w = h = size
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=lerp(C_TOP, C_BOT, y / max(1, h - 1)))
    return img


def draw_house(d, cx, cy, s, color):
    """房子：屋顶三角 + 墙体 + 门"""
    # 屋顶
    d.polygon([(cx, cy - s), (cx - s * 0.95, cy + s * 0.05), (cx + s * 0.95, cy + s * 0.05)], fill=color)
    # 墙体
    d.rectangle([cx - s * 0.62, cy + s * 0.05, cx + s * 0.62, cy + s * 0.95], fill=color)
    # 门（挖成背景色）
    d.rectangle([cx - s * 0.2, cy + s * 0.45, cx + s * 0.2, cy + s * 0.95],
                fill=C_BOT if color == (255, 255, 255) else color)


def make_icon(size):
    img = bg_gradient(size)
    d = ImageDraw.Draw(img)
    u = size / 192.0  # 以 192 为基准缩放

    # 房子（白色）
    draw_house(d, 96 * u, 82 * u, 44 * u, (255, 255, 255))

    # 进度环：底部弧线（表示"进度"）
    ring_r = 62 * u
    ring_w = max(2, int(11 * u))
    box = [96 * u - ring_r, 96 * u - ring_r, 96 * u + ring_r, 96 * u + ring_r]
    # 轨道
    d.arc(box, start=125, end=305, fill=(255, 255, 255, 60), width=ring_w)
    # 进度（约 72%，用亮色）
    d.arc(box, start=125, end=305, fill=(255, 255, 255), width=ring_w)

    return img


def make_splash(w, h):
    """启动图：深色底 + 中间图标"""
    img = Image.new("RGB", (w, h), (28, 31, 35))
    s = int(min(w, h) * 0.30)
    ic = make_icon(s)
    img.paste(ic, (int((w - s) / 2), int((h - s) / 2)))
    return img


def round_and_save(img, size, path, round_icon=False):
    if round_icon:
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
        img = img.convert("RGBA")
        img.putalpha(mask.resize((size, size), Image.LANCZOS))
        img.save(path, "PNG")
    else:
        img.convert("RGBA").save(path, "PNG")


def main():
    android_res = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "android", "app", "src", "main", "res"
    )
    # 1) mipmap 启动图标
    for folder, size in DENSITIES.items():
        out = os.path.join(android_res, folder)
        os.makedirs(out, exist_ok=True)
        icon = make_icon(size)
        round_and_save(icon, size, os.path.join(out, "ic_launcher.png"))
        round_and_save(icon, size, os.path.join(out, "ic_launcher_round.png"), round_icon=True)
        print("icon", folder, size)

    # 2) 启动画面
    for folder, w in SPLASH_SIZES.items():
        out = os.path.join(android_res, folder)
        os.makedirs(out, exist_ok=True)
        h = int(w * (9 / 16)) if "port" in folder else int(w * (16 / 9))
        make_splash(w, h).save(os.path.join(out, "splash.png"), "PNG")
        print("splash", folder, w, h)

    # 3) 留一份高清母版在 assets_icon
    os.makedirs(BASE, exist_ok=True)
    make_icon(512).save(os.path.join(BASE, "icon_512.png"), "PNG")
    print("master 512 saved ->", BASE)


if __name__ == "__main__":
    main()
