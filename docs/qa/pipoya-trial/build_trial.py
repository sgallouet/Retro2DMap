"""Assemble unmodified Pipoya tile quadrants into an offline art trial."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source/Pipoya RPG Tileset 32x32/SampleMap'
atlas = Image.open(SOURCE / '[A]Grass_pipo.png').convert('RGBA')
base = Image.open(SOURCE / '[Base]BaseChip_pipo.png').convert('RGBA')
layout = [
    '............',
    '....##......',
    '....##......',
    '############',
    '############',
    '........##..',
    '........##..',
    '............',
]
result = Image.new('RGBA', (384, 256))
grass = base.crop((0, 0, 32, 32))
def road(x, y):
    return 0 <= y < len(layout) and 0 <= x < len(layout[0]) and layout[y][x] == '#'

for y, row in enumerate(layout):
    for x, cell in enumerate(row):
        result.paste(grass, (x * 32, y * 32))
        if cell != '#':
            continue
        for qy in range(2):
            for qx in range(2):
                dx, dy = (-1 if qx == 0 else 1), (-1 if qy == 0 else 1)
                horizontal, vertical = road(x + dx, y), road(x, y + dy)
                # Outer edges/corners come from the atlas's complete 3x3 block.
                tx = 6 if horizontal else (5 if qx == 0 else 7)
                ty = 1 if vertical else (0 if qy == 0 else 2)
                if horizontal and vertical and not road(x + dx, y + dy):
                    # Four concave grass intrusions around the small center hole.
                    tx, ty = (3 if qx == 0 else 2), (2 if qy == 0 else 1)
                sx, sy = tx * 32 + qx * 16, ty * 32 + qy * 16
                result.paste(atlas.crop((sx, sy, sx + 16, sy + 16)),
                             (x * 32 + qx * 16, y * 32 + qy * 16))
assert result.getextrema()[3] == (255, 255), 'Trial must be fully opaque'
result.save(ROOT / 'pipoya-patch-native.png')
result.resize((576, 384), Image.Resampling.NEAREST).save(ROOT / 'pipoya-patch-48.png')
result.resize((768, 512), Image.Resampling.NEAREST).save(ROOT / 'pipoya-patch-2x.png')
print('Built native, 48px-cell, and 2x previews; opaque coverage verified.')
