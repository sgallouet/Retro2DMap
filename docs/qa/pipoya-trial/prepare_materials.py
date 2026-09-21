"""Slice the generated two-material sheet into the editor's existing 48px inputs."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
output = root.parents[2] / 'public/assets/terrain/pipoya-repaint-trial'
source = Image.open(root / 'material-tiles-generated-v2.png').convert('RGBA')
w, h = source.size
assert w == h * 2, 'Expected exactly two square tiles, grass left and path right'
output.mkdir(exist_ok=True)
for i, name in enumerate(('grass', 'path')):
    tile = source.crop((i*h, 0, (i+1)*h, h)).resize((48, 48), Image.Resampling.LANCZOS)
    assert tile.getextrema()[3] == (255, 255), 'Materials must be fully opaque'
    tile.save(output / f'{name}.png')
