import { copyFile } from "node:fs/promises";
const backend = process.argv[2];
if (backend === "native") await copyFile("zig-out/lib/om.node", `sdk/om.${process.platform}-${process.arch}.node`);
else if (backend === "wasm") await copyFile("zig-out/bin/om-core.wasm", "sdk/om-core.wasm");
else throw new Error("Expected native or wasm");
