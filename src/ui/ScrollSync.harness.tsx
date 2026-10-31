import { Text, View, mount, signal } from "nsh";
import { EditorWorkspace } from "./EditorWorkspace";
import { scrollPreviewTo, scrollSyncSnapshot } from "./scrollSync";

const section = (i: number) =>
  `## 第 ${i + 1} 节\n\n这一节用来把预览撑高，正文混合中文与 english words，滚动同步时两侧比例应基本一致。\n\n- 第一点 ${i + 1}\n- 第二点 ${i + 1}\n- 第三点 ${i + 1}`;

const DOC = Array.from({ length: 60 }, (_, i) => section(i)).join("\n\n");
const docText = signal(DOC);

const dbg = signal("");
setInterval(() => {
  const s = scrollSyncSnapshot();
  dbg.set(
    `SYNC e=${Math.round(s.editorY)} p=${Math.round(s.previewY)} em=${Math.round(s.editorMax)} pm=${Math.round(s.previewMax)} ec=${Math.round(s.editorContentH)} pc=${Math.round(s.previewContentH)} polls=${s.polls} frames=${s.frames} driver=${s.driver} moveHz=${s.moveHz} drives=${s.drives} mv=${s.moves} evh=${Math.round(s.editorViewH)} pvh=${Math.round(s.previewViewH)}`,
  );
}, 100);

/** 供 EditorWorkspace 滚动同步测试挂载：长文档 + 同步快照。 */
function Harness() {
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <View style={{ flex: 1 }}>
        <EditorWorkspace
          source={DOC}
          preview={docText()}
          onChange={() => {}}
          mode="split"
          onRevealEditor={() => {}}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 12, height: 24 }}>
        <View testID="to-bottom" role="button" onPress={() => scrollPreviewTo(1e7)}>
          <Text>bottom</Text>
        </View>
        <View testID="to-top" role="button" onPress={() => scrollPreviewTo(0)}>
          <Text>top</Text>
        </View>
        <View
          testID="append"
          role="button"
          onPress={() => docText.set(docText() + "\n\n" + section(60))}
        >
          <Text>append</Text>
        </View>
      </View>
      <Text testID="sync">{dbg()}</Text>
    </View>
  );
}

mount(Harness);
