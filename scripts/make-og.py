#!/usr/bin/env python3
"""Compose ALIGN Open Graph share card 1200x630."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math

ROOT = Path("/home/user/align")
OUT = ROOT / "assets" / "og.png"
ICON = ROOT / "assets" / "icon-512.png"
SYNE = Path("/tmp/fonts/Syne-ExtraBold.ttf")
DM = Path("/tmp/fonts/DMSans.ttf")

W, H = 1200, 630
BG = (7, 8, 11)
GLOW = (214, 255, 63)
TEXT = (244, 241, 234)
MUTED = (154, 154, 168)
LINE = (40, 44, 54)


def font(path, size):
    return ImageFont.truetype(str(path), size=size)


def draw_text(draw, xy, text, fnt, fill, tracking=0, anchor="lt"):
    if tracking == 0:
        draw.text(xy, text, font=fnt, fill=fill, anchor=anchor)
        return
    # Manual tracking around a center or left anchor
    ax, ay = xy
    widths = []
    for ch in text:
        widths.append(draw.textlength(ch, font=fnt))
    total = sum(widths) + tracking * (len(text) - 1)
    if "m" in anchor:  # middle
        x = ax - total / 2
    elif "r" in anchor:
        x = ax - total
    else:
        x = ax
    y_anchor = "m" if "m" in anchor else ("b" if "b" in anchor else "t")
    for ch, cw in zip(text, widths):
        draw.text((x, ay), ch, font=fnt, fill=fill, anchor="l" + y_anchor)
        x += cw + tracking


def main():
    img = Image.new("RGB", (W, H), BG)
    px = img.load()
    # Radial wash
    cx, cy = W * 0.5, H * 0.38
    for y in range(H):
        for x in range(W):
            dx = (x - cx) / (W * 0.62)
            dy = (y - cy) / (H * 0.72)
            t = math.exp(-(dx * dx + dy * dy) * 1.6)
            r = int(BG[0] + (26 - BG[0]) * t)
            g = int(BG[1] + (30 - BG[1]) * t)
            b = int(BG[2] + (44 - BG[2]) * t)
            px[x, y] = (r, g, b)
    # Soft lime bloom behind mark
    bloom = Image.new("RGB", (W, H), (0, 0, 0))
    bdraw = ImageDraw.Draw(bloom)
    bdraw.ellipse((cx - 220, cy - 210, cx + 220, cy + 90), fill=(214, 255, 63))
    bloom = bloom.filter(ImageFilter.GaussianBlur(90))
    img = Image.blend(img, bloom, 0.07)

    # Grain
    import random
    random.seed(12)
    grain = img.copy()
    gpx = grain.load()
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            n = random.randint(-10, 10)
            r, g, b = gpx[x, y]
            gpx[x, y] = (
                max(0, min(255, r + n)),
                max(0, min(255, g + n)),
                max(0, min(255, b + n)),
            )
    img = Image.blend(img, grain, 0.04)

    draw = ImageDraw.Draw(img)

    # Mark
    mark = Image.open(ICON).convert("RGBA")
    mark = mark.resize((168, 168), Image.Resampling.LANCZOS)
    mx, my = int(cx - 84), 92
    # Rounded tile behind mark
    tile = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    pad = 18
    td.rounded_rectangle(
        (mx - pad, my - pad, mx + 168 + pad, my + 168 + pad),
        radius=36,
        fill=(20, 22, 30, 230),
        outline=(214, 255, 63, 70),
        width=2,
    )
    img = Image.alpha_composite(img.convert("RGBA"), tile)
    img.paste(mark, (mx, my), mark)
    draw = ImageDraw.Draw(img)

    syne = font(SYNE, 92)
    dm = font(DM, 28)
    dm_sm = font(DM, 20)

    draw_text(draw, (W / 2, 310), "ALIGN", syne, TEXT, tracking=18, anchor="mm")
    draw_text(
        draw,
        (W / 2, 382),
        "The morning operating system",
        dm,
        MUTED,
        tracking=0.6,
        anchor="mm",
    )

    # Lime rule
    draw.rectangle((W / 2 - 28, 424, W / 2 + 28, 428), fill=GLOW)

    path = "Wake   ·   Train   ·   Pray   ·   Word   ·   Plan   ·   Go"
    draw_text(draw, (W / 2, 470), path, dm_sm, (214, 255, 63), tracking=1.2, anchor="mm")

    # Outer hairline
    draw.rounded_rectangle((18, 18, W - 19, H - 19), radius=28, outline=LINE, width=1)

    rgb = img.convert("RGB")
    rgb.save(OUT, "PNG", optimize=True)
    print("wrote", OUT, OUT.stat().st_size, rgb.size)


if __name__ == "__main__":
    main()
