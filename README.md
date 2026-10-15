# os

os is a headless Zig agent engine whose completion depends on a host-verified
contract. It is extracted from the contract-enforcing libfx fork, with native
Node-API and WebAssembly builds from the same runtime.

Every engine requires a contract. When the model tries to finish, Zig asks the
host to assess every obligation:

- Pending obligations continue the same turn.
- All obligations marked `met`, with evidence references, permit `end_turn`.
- Blocked obligations with no pending work return `contract_blocked`.

The host verifies evidence against its own records. Zig validates the assessment
and controls continuation. A model's claim that it has finished is insufficient.

## Build and verify

Use Zig 0.17 and Node.js 24. From this repository:

```sh
npm ci
zig build test
npm run build:native
npm run build:wasm
npm test
node examples/contract.mjs
```

The native build needs Node's C headers. If your Node installation does not
include them, point Zig at a directory containing `node_api.h`:

```sh
zig build native -Dnode-include-dir=/path/to/node/include
node scripts/install-artifacts.mjs native
```

The example uses a deterministic model transport and the real Zig engine. Its
first model reply says it is done before saving anything. The engine continues,
executes the host tool once, and completes after verification. Expected counts:
three model requests, one write, and two assessments.

To exercise the same engine in a JSPI-capable browser, serve this directory and
open `examples/browser.html`:

```sh
python3 -m http.server 8080
```

Native output is `zig-out/lib/os.node`; WASM output is
`zig-out/bin/os-core.wasm`. The npm build scripts copy these into `sdk/` for the
default loaders. Generated binaries are not committed or published.

## Use the engine

The package exposes ESM entry points at `@mikeajijola/os`,
`@mikeajijola/os/node`, and `@mikeajijola/os/browser`. The root import selects
Node or browser behavior. Build the artifacts before installing this repository
as a local dependency with `npm install /path/to/os`.

```js
import { createEngine } from "@mikeajijola/os";

// reportTools and reportStore are supplied by your application.
const engine = await createEngine({
  model: "your-provider/model-id",
  apiKey: process.env.AI_GATEWAY_API_KEY,
  tools: reportTools,
  contract: {
    id: "save-report",
    version: 1,
    objective: "Save and verify the report",
    obligations: [{ id: "saved", description: "The report is retained" }],
    async assess({ contract }, { signal, sessionId }) {
      const receipt = await reportStore.verify(sessionId, { signal });
      return {
        contractId: contract.id,
        version: contract.version,
        obligations: [{
          id: "saved",
          status: receipt ? "met" : "pending",
          evidence: receipt ? [receipt.id] : [],
          note: receipt ? "Verified retained report" : "Save the report",
        }],
      };
    },
  },
});
try {
  const turn = engine.prompt("Prepare and save the report");
  for await (const event of turn) console.log(event);
  console.log(await turn.result);
} finally {
  await engine.close();
}
```

`createAgent(options)` runs managed sessions over the same engines. Its default
store is in-memory and does not survive process exit. Pass a `durability` adapter
for retained sessions; `@mikeajijola/os/durable-world` adapts a World supplied by
your application. `createEngine()` provides one session and explicit checkpoints.
The application owns the evidence store in either case.

See [contracts](docs/contracts.md) for assessment limits, cancellation, steering,
and checkpoint rules. Contracts are fixed for an engine's lifetime. Cancellation,
provider errors, and output limits can still terminate a turn without fulfilling
its contract; only ordinary successful completion is gated. There is no implicit
cost budget for pending work.

## Extraction boundary

The public surface is the engine and managed-session API. This repository does
not build the fx CLI or the interactive terminal WASM application. It contains
the shared Zig runtime, ACP bridge, provider adapters, and transitive supporting
modules needed by the native and WASM entry points. Some inherited application
and rendering modules remain internal dependencies of ACP initialization; this
is not a rewrite of the runtime into a smaller kernel.

Internal fx names in wire messages, checkpoint metadata, and shared source files
remain for compatibility. The public package and build artifacts are named os.
The original fx repository is unchanged by this extraction.

## Provenance and license

The extraction starts at contract-fork commit
`0ba49112c2d2a2e3aa78fb1046367f0ea7c0c860`, based on upstream fx commit
`2f391eaed8f384787078986d74c4f3f91ec25ac7`. Git history is retained. os adds its
own build, API, tests, and mandatory-contract initialization.

Licensed under [Apache-2.0](LICENSE). See [NOTICE](NOTICE) and
[third-party notices](THIRD_PARTY_NOTICES.md).
