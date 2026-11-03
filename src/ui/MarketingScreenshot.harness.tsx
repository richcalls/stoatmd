import { View, host, mount } from "nsh";
import { EditorWorkspace } from "./EditorWorkspace";
import { WindowBar } from "./Toolbar";
import { ArticleInspector } from "./ArticleInspector";
import { articleModel } from "./articleModel";
import { restoreRenderMode } from "./documentAppearance";
import { setLocalePref } from "./i18n";
import { restoreTheme } from "./theme";
import { restoreTypography } from "./typography";
import { restoreReaderWidth } from "./readerWidth";

const NOTE = `# A Field Journal of the Coast

> Observations of tides, wind, and the small changes along the shore.

## The First North Wind of October

At six in the morning, the sea was still. The distant clouds held a pale gold edge, and the retreating tide had left fine sand between the rocks. East of the old lighthouse, wind moved softly through the reeds.

### Today's Observations

- Tide: low, water below the second reef line
- Wind: light, from the northeast
- Plants: the first red leaves on the sea-blite

Seasonal change begins in small details: a little coolness in the wind, then a shift in the color of leaves on the sand. Recording these moments makes the passing months easier to see.

## The Walk Back

Follow the shore south for about four hundred meters from the end of the boardwalk, then turn back at the white marker. Keep to the same path and leave the new growth undisturbed.

> Nothing was collected today. I brought back a few photographs and this page of notes.
`;

function Harness() {
  setLocalePref("en");
  const inspectorOpen = host.params.outline === true;
  return <View style={{ flex: 1, flexDirection: "column" }}>
    <WindowBar showSidebarToggle={false} sidebarOpen={false} onToggleSidebar={() => {}}
      vaultName="Coastal Field Notes" title="A Field Journal of the Coast" showModes={false} mode="preview" onMode={() => {}} />
    <View style={{ flex: 1, flexDirection: "row" }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <EditorWorkspace source={NOTE} preview={NOTE} onChange={() => {}} mode="preview"
          onRevealEditor={() => {}} documentId="A Field Journal of the Coast.md" />
      </View>
      {inspectorOpen ? <View style={{ width: 222, flexShrink: 0 }}>
        <ArticleInspector tab="outline" onTab={() => {}} onClose={() => {}} mode="preview"
          model={articleModel(NOTE)} createdMs={0} modifiedMs={0} path="A Field Journal of the Coast.md"
          visibleBlock={0} onJump={() => {}} />
      </View> : null}
    </View>
  </View>;
}

void Promise.all([restoreRenderMode(), restoreTheme(), restoreTypography(), restoreReaderWidth()])
  .then(() => mount(Harness));
