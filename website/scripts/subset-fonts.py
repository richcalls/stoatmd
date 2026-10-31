"""Refresh localized serif subsets: python3 -m pip install 'fonttools[woff]' first."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fontTools.ttLib import TTFont
from fontTools.subset import Options, Subsetter

root = Path(__file__).resolve().parents[1]
source = '\n'.join((root / f'src/i18n/{name}.ts').read_text()
                   for name in ['paper', 'details'])
text = ''.join(sorted({char for char in source if ord(char) > 0x2E7F}))
families = {'sc': 'Noto Serif SC', 'tc': 'Noto Serif TC',
            'jp': 'Noto Serif JP', 'kr': 'Noto Serif KR'}


def download(item):
    key, family = item
    url = 'https://fonts.googleapis.com/css2?' + urlencode({
        'family': family + ':wght@400', 'text': text, 'display': 'swap'})
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'})
    with urlopen(request, timeout=60) as response:
        css = response.read().decode()
    font_url = re.search(r'url\((https:[^)]+)\)', css).group(1)
    with urlopen(font_url, timeout=60) as response:
        font = TTFont(BytesIO(response.read()))
    # Large text queries may return a complete font. Enforce the subset locally.
    subsetter = Subsetter(options=Options())
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.flavor = 'woff2'
    destination = root / f'public/fonts/paper-{key}.woff2'
    font.save(destination)
    print(destination.name, destination.stat().st_size)


with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(download, families.items()))
