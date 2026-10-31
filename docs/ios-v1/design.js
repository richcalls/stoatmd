/* StoatMD iOS design study. All files and cloud actions below are in-memory demos. */
"use strict";
const icon = (name, cls = "") => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const button = (action, name, label, cls = "") => `<button class="icon-button ${cls}" data-action="${action}" aria-label="${label}">${icon(name)}</button>`;
const initialText = `# 给想法一点留白

一些想法，值得慢慢写下来。

## 从一页空白开始

清晨，把手机调成静音，给自己留出一小段完整的时间。

写下此刻想到的，允许句子保持粗糙。文字会在一次次回看里，长出自己的形状。

> 让想法落下来，再慢慢生长。

## 让记录成为日常

- **随手记**：留住一闪而过的念头
- **慢慢写**：给重要的事一点时间
- **常回看**：从旧文字里找到新线索

## 把文件留给自己

普通的 Markdown 文件，可以陪你走很远。
`;
let notes, folderNames, instances, nextNoteId;
const phoneIds = ["library", "editor", "reader", "settings"];
const shell = () => `<div class="statusbar"><span>9:41</span><div class="island"></div><div class="status-icons"><svg viewBox="0 0 17 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx=".6"/><rect x="4.5" y="5.5" width="3" height="6.5" rx=".6"/><rect x="9" y="3" width="3" height="9" rx=".6"/><rect x="13.5" y=".5" width="3" height="11.5" rx=".6"/></svg><svg viewBox="0 0 18 14" aria-hidden="true"><path d="M1 4a12 12 0 0 1 16 0l-1.8 2a9 9 0 0 0-12.4 0zm3.3 4a7 7 0 0 1 9.4 0l-2 2a4 4 0 0 0-5.4 0zM7 12l2 2 2-2a3 3 0 0 0-4 0"/></svg><span class="battery"></span></div></div><div class="app"></div><div class="home"></div>`;

function reset() {
  notes = [
    {id:1,title:"给想法一点留白",excerpt:"一些想法，值得慢慢写下来。",folder:"随笔",time:"10:24",text:initialText},
    {id:2,title:"十月，散步的片刻",excerpt:"风把梧桐叶吹到脚边，秋天就有了声音。",folder:"随笔",time:"昨天",text:"# 十月，散步的片刻\n\n风把梧桐叶吹到脚边，秋天就有了声音。\n\n## 一条熟悉的路\n\n走得慢一点，路边的小事就清晰起来。"},
    {id:3,title:"一个轻盈的笔记本",excerpt:"让工具安静下来，让内容站到前面。",folder:"产品",time:"昨天",text:"# 一个轻盈的笔记本\n\n让工具安静下来，让内容站到前面。\n\n## 设计的尺度\n\n每个按钮都应该有清楚的用途。"},
    {id:4,title:"好好写一封信",excerpt:"给很久以后的自己，留一份今天的心情。",folder:"随笔",time:"10月28日",text:"# 好好写一封信\n\n给很久以后的自己，留一份今天的心情。"},
    {id:5,title:"StoatMD 的下一步",excerpt:"从桌面延伸到口袋，让记录随时发生。",folder:"产品",time:"10月27日",text:"# StoatMD 的下一步\n\n从桌面延伸到口袋，让记录随时发生。"},
    {id:6,title:"周末的阅读清单",excerpt:"建筑、植物，还有一本关于时间的小书。",folder:"",time:"10月26日",text:"# 周末的阅读清单\n\n- 建筑里的光\n- 身边的植物\n- 关于时间的小书"}
  ];
  nextNoteId = 7;
  folderNames = ["随笔", "产品"];
  instances = Object.fromEntries(phoneIds.map(id => [id, {screen:document.getElementById(id).dataset.start, noteId:1, folder:"",filter:"all",query:"", keyboard:id === "editor", night:id === "reader",provider:"Google Drive",synced:true,fontSize:15,sheet:null}]));
  document.body.classList.remove("board-night");
  document.getElementById("light-mode").classList.add("active");
  document.getElementById("light-mode").setAttribute("aria-pressed", "true");
  document.getElementById("dark-mode").classList.remove("active");
  document.getElementById("dark-mode").setAttribute("aria-pressed", "false");
  phoneIds.forEach(id => {document.getElementById(id).innerHTML = shell();render(id);});
}
function noteFor(s) { return notes.find(n => n.id === s.noteId) || notes[0]; }
function docNav(s) {
  return `<div class="toolbar doc-toolbar"><button class="back-button" data-action="library">${icon("back")}${escapeHtml(noteFor(s).folder || "笔记库")}</button><span class="nav-title">${escapeHtml(noteFor(s).title)}</span>${button("more","more","文稿操作")}</div><div class="document-top"><div class="segmented" role="group" aria-label="文稿模式"><button class="${s.screen === "editor" ? "on" : ""}" data-action="editor" aria-pressed="${s.screen === "editor"}">${icon("code")}编辑</button><button class="${s.screen === "reader" ? "on" : ""}" data-action="reader" aria-pressed="${s.screen === "reader"}">${icon("book")}阅读</button></div><span class="save-state" aria-live="polite">${icon("check")}已保存</span></div>`;
}
function libraryPage(s) {
  return `<div class="toolbar library-toolbar"><span class="wordmark"><img src="../../assets/app-logos/thread.png" alt="">StoatMD<span>随身的笔记本</span></span>${button("settings","settings","打开设置","circle-button")}</div><div class="page-header"><div class="title-row"><h2>${escapeHtml(s.folder || "笔记库")}</h2>${s.folder ? button("root","back","返回笔记库") : ""}</div><button class="vault-switch" data-action="storage">${icon(s.provider === "Dropbox" ? "dropbox" : "drive")}我的笔记${icon("down")}<span class="sync-dot"></span>${s.synced ? "已同步" : "等待同步"}</button></div><label class="search">${icon("search")}<input type="search" placeholder="搜索笔记" aria-label="搜索笔记" value="${escapeHtml(s.query)}"><kbd>⌕</kbd></label><div class="filters" role="group" aria-label="笔记筛选"><button data-filter="all" class="${s.filter === "all" ? "selected" : ""}" aria-pressed="${s.filter === "all"}">全部</button><button data-filter="recent" class="${s.filter === "recent" ? "selected" : ""}" aria-pressed="${s.filter === "recent"}">最近修改</button><button data-filter="folders" class="${s.filter === "folders" ? "selected" : ""}" aria-pressed="${s.filter === "folders"}">文件夹</button></div><div class="library-scroll">${libraryResults(s)}</div><div class="library-bottom">${button("new-folder","folderplus","新建文件夹")}<span class="library-count">${notes.length} 篇笔记 · ${folderNames.length} 个文件夹</span>${button("new-note","compose","新建笔记","compose")}</div>`;
}
function libraryResults(s) {
  const query = s.query.trim().toLocaleLowerCase();
  let shown = notes.filter(n => (!s.folder || n.folder === s.folder) && (!query || `${n.title} ${n.text}`.toLocaleLowerCase().includes(query)));
  if(s.filter === "recent") shown = shown.slice(0,3);
  const folders = !s.folder && !query && s.filter !== "recent" ? `<div class="folder-list">${folderNames.map(f => `<button class="folder-row" data-folder="${escapeHtml(f)}">${icon("folder")}<span>${escapeHtml(f)}</span><small>${String(notes.filter(n => n.folder === f).length).padStart(2,"0")}</small>${icon("chevron")}</button>`).join("")}</div>` : "";
  if(s.filter === "folders") return folders || `<div class="empty-state">${icon("folder")}<p>${s.folder ? "此文件夹中的笔记显示在「全部」中" : "搜索笔记时可切换到「全部」"}</p></div>`;
  return folders + `<div class="section-label">${query ? `搜索结果 · ${shown.length}` : s.folder ? "文件夹中的笔记" : "最近的文字"}<span>${query ? "SEARCH" : "OCTOBER"}</span></div>${shown.length ? shown.map(n => `<button class="note-item" data-note="${n.id}"><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.excerpt)}</p><div class="note-meta">${icon("folder")}<span>${escapeHtml(n.folder || "我的笔记")}</span><time>${n.time}</time></div></button>`).join("") : `<div class="empty-state">${icon("search")}<p>试试其他关键词</p></div>`}`;
}
function highlight(text) {
  return text.split("\n").map(line => /^#{1,6} /.test(line) ? `<span class="md-heading">${escapeHtml(line)}</span>` : line.startsWith("> ") ? `<span class="md-quote">${escapeHtml(line)}</span>` : escapeHtml(line).replace(/(\*\*.*?\*\*)/g,'<span class="md-mark">$1</span>')).join("\n") + "\n";
}
function keyboard() {
  return `<div class="keyboard" aria-label="模拟键盘"><div class="key-row">${"qwertyuiop".split("").map(k => `<button data-key="${k}" tabindex="-1">${k}</button>`).join("")}</div><div class="key-row">${"asdfghjkl".split("").map(k => `<button data-key="${k}" tabindex="-1">${k}</button>`).join("")}</div><div class="key-row"><button class="wide" data-action="shift" aria-label="切换大小写">⇧</button>${"zxcvbnm".split("").map(k => `<button data-key="${k}" tabindex="-1">${k}</button>`).join("")}<button class="wide" data-key="backspace" aria-label="删除一个字符">⌫</button></div><div class="key-row bottom"><button class="wide" data-action="symbols">123</button><button class="wide" data-key="，">，</button><button class="space" data-key=" ">空格</button><button class="wide" data-key="。">。</button><button class="wide" data-key="enter">换行</button></div><div class="keyboard-footer"><span aria-hidden="true">◎</span><span aria-hidden="true">♩</span></div></div>`;
}
function editorPage(s) {
  const text = noteFor(s).text;
  return docNav(s) + `<div class="source-wrap"><pre class="source-highlight" aria-hidden="true">${highlight(text)}</pre><textarea class="source" spellcheck="false" aria-label="Markdown 源码">${escapeHtml(text)}</textarea></div><div class="doc-info"><span>Markdown</span><span class="character-count">${Array.from(text).length} 字符</span></div><div class="format-bar" aria-label="Markdown 快捷工具"><button data-insert="# " aria-label="插入标题">H<span style="font-size:10px">₁</span></button><button data-insert="**文字**" aria-label="插入粗体"><b>B</b></button><button data-insert="- " aria-label="插入列表">${icon("list")}</button><button data-insert="> " aria-label="插入引用">❞</button><button data-insert="[文字](链接)" aria-label="插入链接">${icon("link")}</button><button data-insert="\u0060代码\u0060" aria-label="插入行内代码">${icon("code")}</button><button data-action="keyboard" aria-label="${s.keyboard ? "收起" : "展开"}模拟键盘">${icon("keyboard")}</button></div>${s.keyboard ? keyboard() : ""}`;
}
function inlineMarkdown(text) {return escapeHtml(text).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/`(.*?)`/g,"<code>$1</code>");}
function markdown(text) {
  let inList = false;
  let h = 0;
  const html = text.split(/\n\s*\n/).map(block => {
    const lines = block.split("\n");
    return lines.map(line => {
      let out = "";
      if(!line.startsWith("- ") && inList) {out += "</ul>";inList = false;}
      const heading = line.match(/^(#{1,6}) (.*)/);
      if(heading) {h++;return out + `<h${heading[1].length} id="section-${h}" data-heading="${h}">${inlineMarkdown(heading[2])}</h${heading[1].length}>`;}
      if(line.startsWith("- ")) {if(!inList) {out += "<ul>";inList = true;}return out + `<li>${inlineMarkdown(line.slice(2))}</li>`;}
      if(line.startsWith("> ")) return out + `<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`;
      return out + (line.trim() ? `<p>${inlineMarkdown(line)}</p>` : "");
    }).join("");
  }).join("");
  return html + (inList ? "</ul>" : "");
}
function readerPage(s) {
  return docNav(s) + `<div class="reader-body" style="font-size:${s.fontSize}px"><div class="reader-eyebrow">WORDS TO COME BACK TO</div>${markdown(noteFor(s).text)}</div><div class="reading-bottom"><button data-action="toc">${icon("list")}目录</button><span>${Array.from(noteFor(s).text).length} 字符 · 约 1 分钟</span><button data-action="font" aria-label="阅读字体">${icon("type")}</button></div>`;
}
function row(action, glyph, label, value = "", sub = "", extra = "") {
  return `<button class="setting-row" data-action="${action}">${icon(glyph,extra)}<span class="row-main">${label}${sub ? `<small>${sub}</small>` : ""}</span>${value ? `<span class="value">${value}</span>` : ""}${icon("chevron")}</button>`;
}
function themes(s) {
  return `<div class="theme-picker">${[{id:"paper",label:"Paper",color:"#fcfbf9",side:"#eeeee8",ink:"#2b5937"},{id:"nord",label:"Nord",color:"#2e3440",side:"#252c37",ink:"#a3be8c"},{id:"newsprint",label:"Newsprint",color:"#f4f4f1",side:"#e7e6e1",ink:"#2f5e89"}].map(t => `<button class="theme-swatch" data-theme="${t.id}" aria-pressed="${t.id === (s.theme || (s.night ? "nord" : "paper"))}"><div class="swatch-art" style="--swatch:${t.color};--swatch-side:${t.side};--swatch-ink:${t.ink}"><span class="swatch-lines">Aa</span></div><div class="swatch-label">${t.label}${t.id === (s.theme || (s.night ? "nord" : "paper")) ? icon("check") : ""}</div></button>`).join("")}</div>`;
}
function settingsPage(s) {
  return `<div class="toolbar"><button class="back-button" data-action="library">${icon("back")}笔记库</button><span></span>${button("about","more","关于 StoatMD")}</div><div class="settings-header"><h2>设置</h2><p>一个用起来顺手的写作空间。</p></div><div class="settings-scroll"><section class="settings-section"><h3>外观</h3><div class="settings-group">${row("appearance","sun","主题",s.theme === "newsprint" ? "Newsprint" : s.night ? "Nord" : "Paper")}${themes(s)}${row("language","book","语言","跟随系统")}</div></section><section class="settings-section"><h3>文字</h3><div class="settings-group">${row("font","type","字体与排版","Kami 默认")}</div></section><section class="settings-section"><h3>存储</h3><div class="settings-group">${row("storage",s.provider === "Dropbox" ? "dropbox" : "drive","存储位置",s.provider,"我的笔记 · /StoatMD","provider-icon")}</div><div class="sync-detail"><span>${s.synced ? "已同步 · 刚刚" : "有修改等待同步"}</span><button data-action="sync">${icon("sync")}立即同步</button></div></section><section class="settings-section"><h3>StoatMD</h3><div class="settings-group">${row("about","cloud","iOS 付费版","云盘同步已包含")}${row("about","note","关于","0.1.0")}</div></section><div class="settings-brand"><b>StoatMD</b>让文字，慢慢生长。</div></div>`;
}
function render(id) {
  const s = instances[id];
  const phone = document.getElementById(id);
  phone.classList.toggle("theme-night",s.night);
  phone.style.removeProperty("--accent");
  if(s.theme === "newsprint") phone.style.setProperty("--accent","#2f5e89");
  phone.querySelector(".app").inert = false;
  phone.querySelector(".app").innerHTML = s.screen === "library" ? libraryPage(s) : s.screen === "editor" ? editorPage(s) : s.screen === "reader" ? readerPage(s) : settingsPage(s);
  phone.querySelector(".scrim")?.remove();
  if(s.sheet) renderSheet(id,s.sheet);
}
function showSheet(id,type) {instances[id].sheet=type;renderSheet(id,type);}
function closeSheet(id) {instances[id].sheet=null;const phone=document.getElementById(id);phone.querySelector(".scrim")?.remove();phone.querySelector(".app").inert=false;}
function toast(id,message) {
  const phone = document.getElementById(id);
  phone.querySelector(".toast")?.remove();
  const el = document.createElement("div");el.className="toast";el.role="status";el.textContent=message;phone.append(el);
  setTimeout(() => el.remove(),2500);
}
function renderSheet(id,type) {
  const s = instances[id];
  const phone = document.getElementById(id);
  const previousActive = document.activeElement;
  phone.querySelector(".scrim")?.remove();
  const note = noteFor(s);
  let title,content;
  switch(type) {
    case "toc": {
      title="文章目录";
      const headings=[...note.text.matchAll(/^(#{1,6}) (.+)$/gm)];
      content=`<p class="sheet-note">${escapeHtml(note.title)}</p>${headings.map((m,i) => `<button class="toc-row" data-section="${i+1}" style="padding-left:${(m[1].length-1)*12}px"><small>${String(i+1).padStart(2,"0")}</small>${escapeHtml(m[2])}${icon("chevron")}</button>`).join("") || '<p>写下标题后，章节会出现在这里。</p>'}<div class="sheet-meta">${Array.from(note.text).length} 字符 · ${headings.length} 个标题<br>${escapeHtml(note.folder || "我的笔记")}/${escapeHtml(note.title)}.md</div>`;
      break;
    }
    case "more": title="文稿操作";content=row("toc","list","文章目录")+row("find","search","文内查找")+row("rename","compose","重命名")+row("duplicate","note","创建副本")+row("share","share","导出 Markdown");break;
    case "storage": title="存储位置";content=`<p>选择自己的云盘笔记库。首次同步后支持离线读写。</p>${["Google Drive","Dropbox"].map((p,i) => `<button class="setting-row" data-provider="${p}">${icon(["drive","dropbox"][i])}<span class="row-main">${p}<small>同步到自己的 ${p} 账号</small></span>${icon(s.provider === p ? "check" : "chevron")}</button>`).join("")}<p class="sheet-note">iOS 付费版已包含云盘同步</p>`;break;
    case "authorize": title=`连接 ${s.targetProvider}`;content=`<div class="pro-art">${icon(s.targetProvider === "Dropbox" ? "dropbox" : "drive")}</div><p>使用自己的账号，选择存放笔记的文件夹。</p><p class="sheet-note">正式 App 将打开系统登录页面。此处使用演示账号继续预览。</p><button class="primary-button" data-action="demo-authorize">使用演示账号继续</button>`;break;
    case "remote-folder":title="选择云盘文件夹";content=`<p>${escapeHtml(s.targetProvider)} · demo@example.com</p><button class="setting-row" data-action="choose-remote">${icon("folder")}<span class="row-main">StoatMD<small>我的文件 / StoatMD</small></span>${icon("chevron")}</button><p class="sheet-note">此处展示示例目录；继续后可检查迁移内容。</p>`;break;
    case "migration":title="切换存储位置";content=`<p>将笔记和附件复制到新位置，校验完成后切换。</p><div class="migration-card"><span>${escapeHtml(s.provider)}<small>我的笔记</small></span>${icon("arrow")}<span>${escapeHtml(s.targetProvider)}<small>/StoatMD</small></span></div><div class="sheet-meta">${notes.length} 篇笔记 · ${folderNames.length} 个文件夹 · 约 8 KB<br>此演示使用示例数据展示迁移结果。</div><label class="keep-original"><input type="checkbox" checked>保留原位置数据</label><button class="primary-button" data-action="migrate">复制并切换</button>`;break;
    case "appearance":title="外观";content=`<p>选择适合此刻的纸张和墨色。</p>${themes(s)}<p class="sheet-note">首版设计展示 3 套配色；正式版本沿用 Mac 的 25 套主题。</p>`;break;
    case "font":title="字体与排版";content=`<p>Kami 默认 · 系统衬线字体</p><div class="type-preview" style="font-size:${s.fontSize}px">让想法落下来，<br>再慢慢生长。</div><div class="font-control"><span>阅读字号</span><button data-font="-1" aria-label="减小字号">A−</button><span class="font-value">${s.fontSize}</span><button data-font="1" aria-label="增大字号">A+</button></div><button class="secondary-button" data-action="reset-font">恢复默认</button>`;break;
    case "language":title="语言";content=`<p>设计稿使用简体中文。正式 App 沿用已有 8 种界面语言，并默认跟随系统。</p>${["跟随系统","English","简体中文","繁體中文","日本語","한국어","Deutsch","Français","Español"].map((l,i)=>`<button class="setting-row" data-language="${l}"><span class="row-main">${l}</span>${i===0?icon("check"):""}</button>`).join("")}`;break;
    case "about":title="关于 StoatMD";content=`<div class="pro-art">${icon("note")}</div><p>一个随身的 Markdown 笔记本。<br>笔记保存在自己的云盘，离线也能读写。</p><div class="sheet-meta">iOS 界面设计 v0.1 · 2026.10.31<br>本页交互和账号均为演示数据。<br>公开署名：forecho</div>`;break;
    case "rename":title="重命名笔记";content=`<input class="sheet-field" aria-label="笔记名称" value="${escapeHtml(note.title)}"><button class="primary-button" data-action="confirm-rename">保存名称</button>`;break;
    case "new-folder":title="新建文件夹";content='<input class="sheet-field" aria-label="文件夹名称" placeholder="文件夹名称"><button class="primary-button" data-action="confirm-folder">创建文件夹</button>';break;
    case "find":title="文内查找";content='<input class="sheet-field" aria-label="文内查找关键词" placeholder="输入关键词"><button class="primary-button" data-action="confirm-find">查找</button><p class="find-result sheet-note" aria-live="polite"></p>';break;
    default:return;
  }
  const scrim=document.createElement("div");scrim.className="scrim";
  scrim.innerHTML=`<section class="sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="sheet-handle"></div><div class="sheet-heading"><h2>${title}</h2>${button("close","close","关闭弹出面板")}</div>${content}</section>`;
  phone.append(scrim);
  phone.querySelector(".app").inert = true;
  scrim.addEventListener("click",event=>{if(event.target===scrim)closeSheet(id);});
  scrim._restoreFocus = previousActive;
  scrim.querySelector("input,button")?.focus({preventScroll:true});
}
function saveText(id,text) {
  const s=instances[id],n=noteFor(s),phone=document.getElementById(id);
  n.text=text;n.title=(text.match(/^# (.+)/m)?.[1] || n.title);n.excerpt=text.split("\n").find(line=>line && !line.startsWith("#")) || "写下你的第一个想法。";
  n.time="刚刚";s.synced=false;
  const overlay=phone.querySelector(".source-highlight");if(overlay)overlay.innerHTML=highlight(text);
  const count=phone.querySelector(".character-count");if(count)count.textContent=`${Array.from(text).length} 字符`;
  const title=phone.querySelector(".nav-title");if(title)title.textContent=n.title;
  const status=phone.querySelector(".save-state");if(status)status.innerHTML=icon("check")+"已保存";
}
function insertText(id,text) {
  const field=document.getElementById(id).querySelector(".source");if(!field)return;
  let start=field.selectionStart,end=field.selectionEnd;
  if(text === "backspace") {if(start === end && start > 0) start--;text="";}
  if(text === "enter")text="\n";
  field.setRangeText(text,start,end,"end");saveText(id,field.value);field.focus({preventScroll:true});
}
function handleAction(id,action) {
  const s=instances[id],phone=document.getElementById(id);
  if(["library","settings","editor","reader"].includes(action)){closeSheet(id);s.screen=action;render(id);return;}
  switch(action) {
    case "root":s.folder="";s.filter="all";render(id);break;
    case "close":{const target=phone.querySelector(".scrim")?._restoreFocus;closeSheet(id);if(target?.isConnected)target.focus({preventScroll:true});break;}
    case "keyboard":s.keyboard=!s.keyboard;render(id);break;
    case "new-note":{const n={id:nextNoteId++,title:"未命名笔记",excerpt:"写下你的第一个想法。",folder:s.folder,time:"刚刚",text:"# 未命名笔记\n\n"};notes.unshift(n);s.noteId=n.id;s.screen="editor";s.keyboard=true;render(id);const field=phone.querySelector(".source");field.focus({preventScroll:true});field.setSelectionRange(field.value.length,field.value.length);break;}
    case "confirm-folder":{const name=phone.querySelector(".sheet-field").value.trim();if(!name){toast(id,"请输入文件夹名称");break;}if(folderNames.includes(name)){toast(id,"已有同名文件夹");break;}folderNames.push(name);s.folder="";s.filter="all";s.query="";s.sheet=null;render(id);toast(id,"文件夹已创建");break;}
    case "confirm-rename":{const name=phone.querySelector(".sheet-field").value.trim();if(!name){toast(id,"请输入笔记名称");break;}const n=noteFor(s);n.title=name;n.text=/^# .+/m.test(n.text)?n.text.replace(/^# .+/m,()=>`# ${name}`):`# ${name}\n\n${n.text}`;s.sheet=null;render(id);break;}
    case "duplicate":{const n=noteFor(s);notes.unshift({...n,id:nextNoteId++,title:n.title+" 副本",time:"刚刚"});closeSheet(id);toast(id,"已在原文件夹创建副本");break;}
    case "share":{const blob=new Blob([noteFor(s).text],{type:"text/markdown;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=noteFor(s).title+".md";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);closeSheet(id);toast(id,"已导出 Markdown 文件");break;}
    case "sync":s.synced=true;render(id);toast(id,"演示同步完成");break;
    case "demo-authorize":showSheet(id,"remote-folder");break;
    case "choose-remote":showSheet(id,"migration");break;
    case "migrate":{const keep=phone.querySelector(".keep-original input").checked;s.provider=s.targetProvider;s.targetProvider=null;s.synced=true;s.sheet=null;render(id);toast(id,keep?"演示迁移完成，原位置数据已保留":"演示迁移完成，已记录原位置清理选择");break;}
    case "reset-font":s.fontSize=15;render(id);break;
    case "confirm-find":{const query=phone.querySelector(".sheet-field").value.trim();const count=query?noteFor(s).text.split(query).length-1:0;phone.querySelector(".find-result").textContent=query?`找到 ${count} 处匹配` : "请输入关键词";break;}
    case "shift":phone.querySelectorAll(".key-row [data-key]").forEach(k=>{if(/^[a-z]$/i.test(k.dataset.key)){k.dataset.key=k.dataset.key===k.dataset.key.toLowerCase()?k.dataset.key.toUpperCase():k.dataset.key.toLowerCase();k.textContent=k.dataset.key;}});break;
    case "symbols":{const keys=phone.querySelectorAll(".key-row:first-child [data-key]");const symbols="1234567890";const abc="qwertyuiop";const useSymbols=keys[0].dataset.key==="q";keys.forEach((k,i)=>{k.dataset.key=(useSymbols?symbols:abc)[i];k.textContent=k.dataset.key;});break;}
    default:showSheet(id,action);
  }
}
phoneIds.forEach(id => {
  const phone=document.getElementById(id);
  phone.addEventListener("click",event=>{
    const target=event.target.closest("button");if(!target)return;
    const s=instances[id];
    if(target.dataset.action){handleAction(id,target.dataset.action);return;}
    if(target.dataset.note){s.noteId=Number(target.dataset.note);s.screen="editor";s.keyboard=false;render(id);return;}
    if(target.dataset.folder){s.folder=target.dataset.folder;s.filter="all";s.query="";render(id);return;}
    if(target.dataset.filter){s.filter=target.dataset.filter;render(id);return;}
    if(target.dataset.insert !== undefined){insertText(id,target.dataset.insert);return;}
    if(target.dataset.key !== undefined){insertText(id,target.dataset.key);return;}
    if(target.dataset.section){const n=target.dataset.section;s.screen="reader";s.sheet=null;render(id);phone.querySelector(`[data-heading="${n}"]`)?.scrollIntoView({block:"start",behavior:"instant"});return;}
    if(target.dataset.provider){if(target.dataset.provider===s.provider){closeSheet(id);return;}s.targetProvider=target.dataset.provider;showSheet(id,"authorize");return;}
    if(target.dataset.theme){s.theme=target.dataset.theme;s.night=s.theme==="nord";render(id);return;}
    if(target.dataset.font){s.fontSize=Math.min(24,Math.max(12,s.fontSize+Number(target.dataset.font)));render(id);return;}
    if(target.dataset.language){toast(id,`${target.dataset.language} · 正式 App 支持该语言`);return;}
  });
  phone.addEventListener("input",event=>{
    const s=instances[id];
    if(event.target.matches(".search input")){s.query=event.target.value;phone.querySelector(".library-scroll").innerHTML=libraryResults(s);}
    if(event.target.matches(".source"))saveText(id,event.target.value);
  });
  phone.addEventListener("scroll",event=>{
    if(event.target.matches?.(".source")){const pre=phone.querySelector(".source-highlight");pre.scrollTop=event.target.scrollTop;pre.scrollLeft=event.target.scrollLeft;}
  },true);
  phone.addEventListener("keydown",event=>{
    if(event.key==="Escape"){closeSheet(id);return;}
    const sheet=phone.querySelector(".sheet");
    if(event.key==="Tab" && sheet){const items=[...sheet.querySelectorAll("button,input")];const i=items.indexOf(document.activeElement);if(event.shiftKey && i===0){event.preventDefault();items.at(-1).focus();}else if(!event.shiftKey && i===items.length-1){event.preventDefault();items[0].focus();}}
  });
});
function boardTheme(night) {
  document.body.classList.toggle("board-night",night);
  document.getElementById("dark-mode").classList.toggle("active",night);
  document.getElementById("dark-mode").setAttribute("aria-pressed",String(night));
  document.getElementById("light-mode").classList.toggle("active",!night);
  document.getElementById("light-mode").setAttribute("aria-pressed",String(!night));
  phoneIds.forEach(id=>{instances[id].night=night;instances[id].theme=night?"nord":"paper";render(id);});
}
document.getElementById("light-mode").addEventListener("click",()=>boardTheme(false));
document.getElementById("dark-mode").addEventListener("click",()=>boardTheme(true));
document.getElementById("reset").addEventListener("click",reset);
reset();
