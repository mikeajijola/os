import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const addon = require("../zig-out/lib/os.node");
const core = addon.createCore({ apiKey: "fixture", model: "sdk/contract-test", home: "/tmp", workspaceRoot: "/tmp" });
let buffered = "";
async function request(id, params) {
  addon.writeCore(core, Buffer.from(JSON.stringify({ jsonrpc: "2.0", id, method: "initialize", params }) + "\n"));
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    buffered += addon.drainCore(core).toString("utf8");
    let end;
    while ((end = buffered.indexOf("\n")) >= 0) {
      const message = JSON.parse(buffered.slice(0, end));
      buffered = buffered.slice(end + 1);
      if (message.id === id) return message;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Kernel response timed out");
}
try {
  for (const [id, capabilities] of [[1, {}], [2, { libfx: {} }]]) {
    const response = await request(id, { protocolVersion: 1, clientCapabilities: capabilities });
    assert.equal(response.error?.code, -32602);
    assert.match(response.error.message, /requires a work contract/);
  }
  const accepted = await request(3, { protocolVersion: 1, clientCapabilities: { libfx: { contract: {
    id: "task", version: 1, objective: "Save report", obligations: [{ id: "saved", description: "Report exists" }],
  } } } });
  assert.ok(accepted.result, JSON.stringify(accepted));
} finally {
  addon.closeCore(core);
  addon.destroyCore(core);
}
console.log("Zig rejects contractless clients even without the JavaScript SDK");
