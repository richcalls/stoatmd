import { Text, View, mount, signal } from "nsh";
import { Button } from "nsh/base";
import { ArticleInspector, type InspectorTab } from "./ArticleInspector";
import { articleModel } from "./articleModel";
import type { ViewMode } from "./Toolbar";

const LONG = `---
tags: [知识, 学习]
---

# 项目笔记

前言。

## 安装

正文。

## 使用

### 进阶

正文。
`;

const PLAIN = "只有正文。\n\n第二段。\n";

/** 文章检查栏的挂载入口：目录、信息、滚动高亮与跳转上报。 */
function Harness() {
  const tab = signal<InspectorTab>("outline");
  const mode = signal<ViewMode>("preview");
  const visible = signal(0);
  const open = signal(true);
  const note = signal<"long" | "plain">("long");
  const jumps = signal("");
  const model = () => articleModel(note() === "long" ? LONG : PLAIN);
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <If when={open()}>
        <View style={{ width: 222, height: 640 }}>
          <ArticleInspector
            tab={tab()}
            onTab={(value) => tab.set(value)}
            onClose={() => open.set(false)}
            mode={mode()}
            model={model()}
            createdMs={1700000000000}
            modifiedMs={1700003600000}
            path="notes/demo.md"
            visibleBlock={visible()}
            onJump={(heading) =>
              jumps.set(`${heading.id}:${heading.line}:${heading.blockIndex}`)
            }
          />
        </View>
      </If>
      <View style={{ width: 220, flexDirection: "column", gap: 8 }}>
        <Button testID="plain-note" onPress={() => note.set("plain")}>
          <Text>plain</Text>
        </Button>
        <Button testID="block-2" onPress={() => visible.set(2)}>
          <Text>block 2</Text>
        </Button>
        <Button testID="block-5" onPress={() => visible.set(5)}>
          <Text>block 5</Text>
        </Button>
        <Button testID="mode-edit" onPress={() => mode.set("edit")}>
          <Text>edit</Text>
        </Button>
        <Text testID="jumps">{jumps()}</Text>
        <Text testID="open">{String(open())}</Text>
        <Text testID="tab">{tab()}</Text>
      </View>
    </View>
  );
}

mount(Harness);
