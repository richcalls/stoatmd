import { Text, View, mount, signal } from "nsh";
import { librarySearch } from "./librarySearch";

function Harness() {
  const query = signal("");
  const revision = signal(0);
  const switched = signal(false);
  const requests: { resolve: (paths: string[]) => void; reject: (err: Error) => void }[] = [];
  const count = signal(0);
  const request = () => new Promise<string[]>((resolve, reject) => {
    requests.push({ resolve, reject });
    count.set(requests.length);
  });
  const first = { searchContent: request };
  const second = { searchContent: request };
  const search = librarySearch(() => switched() ? second : first, query, revision);
  return (
    <View>
      <View testID="query-first" onPress={() => query.set("first")}><Text>first</Text></View>
      <View testID="query-second" onPress={() => query.set("second")}><Text>second</Text></View>
      <View testID="query-clear" onPress={() => query.set("")}><Text>clear</Text></View>
      <View testID="revision" onPress={() => revision.update((n) => n + 1)}><Text>revision</Text></View>
      <View testID="switch-vault" onPress={() => switched.set(true)}><Text>switch</Text></View>
      <View testID="resolve-first" onPress={() => requests[0]?.resolve(["old.md"])}><Text>resolve first</Text></View>
      <View testID="resolve-latest" onPress={() => requests[requests.length - 1]?.resolve(["new.md"])}><Text>resolve latest</Text></View>
      <View testID="reject-latest" onPress={() => requests[requests.length - 1]?.reject(new Error("read failed"))}><Text>reject</Text></View>
      <Text>{`requests:${count()}`}</Text>
      <Text>{`pending:${search.pending()}`}</Text>
      <Text>{`hits:${search.matches().join(",")}`}</Text>
      <Text>{`error:${search.error()}`}</Text>
    </View>
  );
}

mount(Harness);
