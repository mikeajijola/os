import { copyFile } from "node:fs/promises";
const backend = process.argv[2];
if (backend === "native") await copyFile("zig-out/lib/os.node", `sdk/os.${process.platform}-${process.arch}.node`);
else if (backend === "wasm") await copyFile("zig-out/bin/os-core.wasm", "sdk/os-core.wasm");
else throw new Error("Expected native or wasm");
