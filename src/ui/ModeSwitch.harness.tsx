import { Text, View, mount, signal } from "nsh";
import { ModeSwitch } from "./ModeSwitch";
import type { ViewMode } from "./Toolbar";

/** 供 ModeSwitch 组件测试挂载的最小入口。 */
function Harness() {
  const mode = signal<ViewMode>("split");
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <ModeSwitch mode={mode()} onMode={(m) => mode.set(m)} />
      <Text testID="mode-value">{mode()}</Text>
    </View>
  );
}

mount(Harness);
