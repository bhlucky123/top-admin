"""Reproducible geometric calculator icon; no external artwork."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
assets = root / 'assets/images'


def icon(size, transparent=False):
    image = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0) if transparent else '#073e42')
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((280, 212, 744, 812), radius=48, fill='#e4f7f3')
    draw.rounded_rectangle((318, 255, 706, 402), radius=20, fill='#125c60')
    draw.line((570, 295, 640, 295, 610, 367), fill='#75e2c7', width=16)
    for row in range(3):
        for col in range(3):
            x, y = 318 + col * 134, 445 + row * 110
            draw.rounded_rectangle((x, y, x + 120, y + 86), radius=14, fill='#1b7779' if col < 2 else '#c17b32')
    draw.line((614, 694, 674, 694), fill='white', width=9)
    draw.line((614, 721, 674, 721), fill='white', width=9)
    return image.resize((size, size), Image.Resampling.LANCZOS)


icon(1024).save(assets / 'calculator-teal.png')
icon(1024, True).save(assets / 'calculator-teal-foreground.png')
res = root / 'android/app/src/main/res'
for density, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    directory = res / f'mipmap-{density}'
    directory.mkdir(exist_ok=True)
    icon(size).save(directory / 'ic_launcher.webp')
    icon(size).save(directory / 'ic_launcher_round.webp')
    icon(round(size * 2.25), True).save(directory / 'ic_launcher_foreground.webp')
adaptive = res / 'mipmap-anydpi-v26'
adaptive.mkdir(exist_ok=True)
for name in ['ic_launcher', 'ic_launcher_round']:
    (adaptive / f'{name}.xml').write_text('<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/calculator_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n')
(res / 'values/calculator_colors.xml').write_text('<resources><color name="calculator_background">#073E42</color></resources>\n')
strings = res / 'values/strings.xml'
strings.write_text(strings.read_text().replace('>Top Admin<', '>calculator<'))
