#!/usr/bin/env python3
from pathlib import Path

ROOT = Path('/workspace/stoatmd/ios-v1-polish')

SVG = r'''<svg class="svg-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></symbol>
  <symbol id="i-compose" viewBox="0 0 24 24"><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6M15.5 3.5l5 5M10 14l1-5L18.5 1.5a2.1 2.1 0 0 1 3 3L14 12z"/></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></symbol>
  <symbol id="i-folderplus" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM9 13h6m-3-3v6"/></symbol>
  <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.63.82 1.1 1.51 1.1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></symbol>
  <symbol id="i-sync" viewBox="0 0 24 24"><path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/></symbol>
  <symbol id="i-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></symbol>
  <symbol id="i-retry" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5l2 2m0-5v5h-5M20 12a8 8 0 0 1-14 5l-2-2m0 5v-5h5"/></symbol>
</defs></svg>'''

STATUS = '''<div class="statusbar"><span>9:41</span><div class="island"></div><div class="status-icons"><svg viewBox="0 0 17 12"><rect x="0" y="8" width="3" height="4" rx=".6"/><rect x="4.5" y="5.5" width="3" height="6.5" rx=".6"/><rect x="9" y="3" width="3" height="9" rx=".6"/><rect x="13.5" y=".5" width="3" height="11.5" rx=".6"/></svg><svg viewBox="0 0 18 14"><path d="M1 4a12 12 0 0 1 16 0l-1.8 2a9 9 0 0 0-12.4 0zm3.3 4a7 7 0 0 1 9.4 0l-2 2a4 4 0 0 0-5.4 0zM7 12l2 2 2-2a3 3 0 0 0-4 0"/></svg><span class="battery"></span></div></div>'''

LIST = '''
      <div class="filters"><span class="on">最近修改</span><span>全部</span><span>收藏夹</span></div>
      <div>
        <div class="sec-head"><span>最近的文字</span><span class="mono">OCTOBER</span></div>
        <div class="group">
          <div class="note-row"><h3>写作的框架</h3><p>好的文章不是灵感的堆砌，而是结构的展开。</p><div class="note-meta"><span>随笔</span><time>10:24</time></div></div>
          <div class="note-row"><h3>十月，散步的片刻</h3><p>风把梧桐叶吹到脚边，秋天就有了声音。</p><div class="note-meta"><span>随笔</span><time>昨天</time></div></div>
          <div class="note-row"><h3>一个轻盈的笔记本</h3><p>让工具安静下来，让内容站到前面。</p><div class="note-meta"><span>产品</span><time>昨天</time></div></div>
          <div class="note-row"><h3>同步不必挡住阅读</h3><p>进度可见，暂停与继续随时可点。</p><div class="note-meta"><span>产品</span><time>周一</time></div></div>
          <div class="note-row"><h3>纸感阅读与源码编辑</h3><p>同一份 Markdown，两种相处方式。</p><div class="note-meta"><span>研究</span><time>周日</time></div></div>
        </div>
      </div>
'''

BOTTOM = '\n    <div class="bottom-float">\n      <div class="bottom-bar">\n        <span class="bbtn" aria-label="新建文件夹"><svg class="icon" aria-hidden="true"><use href="#i-folderplus"/></svg></span>\n        <div class="bottom-search" aria-label="搜索"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="ph">搜索</span></div>\n        <span class="bbtn compose" aria-label="新建文件"><svg class="icon" aria-hidden="true"><use href="#i-compose"/></svg></span>\n      </div>\n    </div>\n'

SEARCH_RESULTS = '\n      <div class="search-meta">找到 <b>2</b> 篇 · 「框架」</div>\n      <div class="filters"><span class="on">最近修改</span><span>全部</span><span>收藏夹</span></div>\n      <div class="group">\n        <div class="note-row"><h3>写作的<span class="search-hit"><mark>框架</mark></span></h3><p>好的文章不是灵感的堆砌，而是结构的展开。</p><div class="note-meta"><span>随笔</span><time>10:24</time></div></div>\n        <div class="note-row"><h3>纸感阅读与源码编辑</h3><p>同一份 Markdown，两种相处方式 · 写作的<span class="search-hit"><mark>框架</mark></span>。</p><div class="note-meta"><span>研究</span><time>周日</time></div></div>\n      </div>\n'

BOTTOM_SEARCH = '\n    <div class="bottom-float with-kbd">\n      <div class="bottom-bar">\n        <span class="bbtn" aria-label="新建文件夹"><svg class="icon" aria-hidden="true"><use href="#i-folderplus"/></svg></span>\n        <div class="bottom-search active" aria-label="搜索"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="query">框架</span><span class="caret"></span></div>\n        <span class="bbtn compose" aria-label="新建文件"><svg class="icon" aria-hidden="true"><use href="#i-compose"/></svg></span>\n      </div>\n      <div class="search-kbd kbd">\n        <div class="kbd-row"><span>q</span><span>w</span><span>e</span><span>r</span><span>t</span><span>y</span><span>u</span><span>i</span><span>o</span><span>p</span></div>\n        <div class="kbd-row"><span>a</span><span>s</span><span>d</span><span>f</span><span>g</span><span>h</span><span>j</span><span>k</span><span>l</span></div>\n        <div class="kbd-row"><span class="wide">⇧</span><span>z</span><span>x</span><span>c</span><span>v</span><span>b</span><span>n</span><span>m</span><span class="wide">⌫</span></div>\n        <div class="kbd-row"><span class="wide">123</span><span class="wide">，</span><span class="space">空格</span><span class="wide">。</span><span class="wide">搜索</span></div>\n      </div>\n    </div>\n'

PTR = '\n      <div class="ptr" aria-hidden="true"><div class="ptr-spinner"></div><div class="ptr-track"><i></i></div></div>\n'


def accessory(kind):
    if kind == 'syncing':
        return (
            '\n      <div class="sync-accessory">'
            '\n        <div class="sync-row">'
            '\n          <div class="sync-label"><svg class="icon sm" aria-hidden="true"><use href="#i-sync"/></svg><span>正在同步</span><span class="muted">· 12 / 48</span></div>'
            '\n          <span class="sync-action" aria-label="暂停"><svg class="icon sm" aria-hidden="true"><use href="#i-pause"/></svg></span>'
            '\n        </div>'
            '\n        <div class="sync-progress"><i style="width:25%"></i></div>'
            '\n      </div>'
        )
    if kind == 'paused':
        return (
            '\n      <div class="sync-accessory paused">'
            '\n        <div class="sync-row">'
            '\n          <div class="sync-label"><svg class="icon sm" aria-hidden="true"><use href="#i-pause"/></svg><span class="warn">已暂停</span><span class="muted">· 网络不稳定</span></div>'
            '\n          <span class="sync-action primary" aria-label="继续"><svg class="icon sm" aria-hidden="true"><use href="#i-play"/></svg></span>'
            '\n        </div>'
            '\n        <div class="sync-progress paused"><i style="width:25%"></i></div>'
            '\n        <p class="sync-sub">库仍可浏览与编辑</p>'
            '\n      </div>'
        )
    if kind == 'error':
        return (
            '\n      <div class="sync-accessory error">'
            '\n        <div class="sync-row">'
            '\n          <div class="sync-label"><svg class="icon sm" aria-hidden="true"><use href="#i-retry"/></svg><span class="bad">同步超时</span><span class="muted">· 12 / 48</span></div>'
            '\n          <span class="sync-action danger" aria-label="重试"><svg class="icon sm" aria-hidden="true"><use href="#i-retry"/></svg></span>'
            '\n        </div>'
            '\n        <div class="sync-progress error"><i style="width:25%"></i></div>'
            '\n        <p class="sync-sub">离线可用 · Drive 连接中断</p>'
            '\n      </div>'
        )
    return ''


def page(title, kind, mode='idle', dark=False):
    classes = ['phone', 'bare']
    if dark:
        classes.append('dark')
    scroll_cls = ['scroll']
    if kind != 'idle' and mode == 'idle':
        scroll_cls.append('has-sync')
    if mode == 'ptr':
        # 浅度刷新：仅顶部刷新指示+进度，无文案、无完整同步 accessory
        scroll_cls.append('has-ptr')
        kind_for_acc = 'idle'
    elif mode == 'search':
        kind_for_acc = 'idle'
    else:
        kind_for_acc = kind
    # 右上同步按钮：完整同步进行中才转圈（点开同步后的 syncing/paused 仍转或停）
    spin = ' spin' if kind_for_acc == 'syncing' else ''
    head = (
        '\n    <div class="nav-float">\n'
        '      <div class="nav-row">\n'
        '        <h1 class="nav-title">笔记库</h1>\n'
        '        <div class="nav-actions">\n'
        f'          <span class="gbtn solo glass glass-capsule{spin}" aria-label="同步"><svg class="icon md" aria-hidden="true"><use href="#i-sync"/></svg></span>\n'
        '          <span class="gbtn solo glass glass-capsule" aria-label="设置"><svg class="icon md" aria-hidden="true"><use href="#i-settings"/></svg></span>\n'
        '        </div>\n'
        '      </div>\n'
        f'{accessory(kind_for_acc)}\n'
        '    </div>\n'
    )
    if mode == 'search':
        content, bottom = SEARCH_RESULTS, BOTTOM_SEARCH
    elif mode == 'ptr':
        content, bottom = PTR + LIST, BOTTOM
    else:
        content, bottom = LIST, BOTTOM
    return (
        '<!doctype html>\n<html lang="zh-Hans">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<title>{title}</title>\n'
        '<link rel="stylesheet" href="liquid.css">\n'
        '</head>\n<body>\n'
        f'{SVG}\n'
        '<div class="shot-page" id="page">\n'
        f'<div class="{" ".join(classes)}">{STATUS}<div class="app">\n'
        f'{head}'
        '    <div class="edge-top"></div>\n'
        f'    <div class="{" ".join(scroll_cls)}">\n'
        f'{content}\n'
        '    </div>\n'
        f'{bottom}\n'
        '</div><div class="home"></div></div>\n'
        '</div>\n</body>\n</html>\n'
    )


screens = [
    ('01-library-idle.html', '库页 · Idle · Liquid Glass', 'idle', 'idle', False),
    ('01b-library-search-pulled.html', '库页 · 下拉浅刷 · Liquid Glass', 'idle', 'ptr', False),
    ('01c-library-search-active.html', '库页 · 搜索激活 · Liquid Glass', 'idle', 'search', False),
    ('02-library-syncing.html', '库页 · Syncing · Liquid Glass', 'syncing', 'idle', False),
    ('03-library-paused.html', '库页 · Paused · Liquid Glass', 'paused', 'idle', False),
    ('03b-library-error.html', '库页 · Error · Liquid Glass', 'error', 'idle', False),
    ('01-library-idle-dark.html', '库页 · Idle Dark · Liquid Glass', 'idle', 'idle', True),
]

for name, title, kind, mode, dark in screens:
    (ROOT / name).write_text(page(title, kind, mode, dark), encoding='utf-8')
    print('wrote', name)

cells = [
    ('01', 'Idle', '01-library-idle.html'),
    ('01b', 'Pull light', '01b-library-search-pulled.html'),
    ('01c', 'Search', '01c-library-search-active.html'),
    ('02', 'Syncing', '02-library-syncing.html'),
    ('03', 'Paused', '03-library-paused.html'),
    ('03b', 'Error', '03b-library-error.html'),
]
board_cells = []
for code, label, href in cells:
    board_cells.append(
        '\n  <div class="cell">\n'
        f'    <div class="cell-label"><span><b>{label}</b></span><small>{code}</small></div>\n'
        f'    <iframe src="{href}" style="width:430px;height:900px;border:0;transform:scale(0.68);transform-origin:top left;pointer-events:none;background:#F7F3EB"></iframe>\n'
        '  </div>'
    )
board = (
    '<!doctype html>\n<html lang="zh-Hans">\n<head>\n<meta charset="utf-8">\n'
    '<title>StoatMD iOS · Liquid Glass library board</title>\n'
    '<link rel="stylesheet" href="liquid.css">\n<style>\n'
    '  body { background: #E8E2D6; }\n'
    '  .grid { display:grid; grid-template-columns: repeat(6, 240px); gap: 24px 16px; justify-content:start; }\n'
    '  .cell { width: 240px; height: 560px; overflow: hidden; }\n'
    '</style>\n</head>\n<body>\n<div class="board">\n'
    '  <div class="board-head">\n'
    '    <h1>StoatMD iOS <span>Cream×Glass · 库页</span></h1>\n'
    '    <div class="board-meta">2026-11-01 · 底栏搜索 · 下拉=同步</div>\n'
    '  </div>\n  <div class="grid">\n'
    + ''.join(board_cells) +
    '\n  </div>\n</div>\n</body>\n</html>\n'
)
(ROOT / '00-board-liquid.html').write_text(board, encoding='utf-8')
print('wrote 00-board-liquid.html')
