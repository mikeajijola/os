# os contributor guidance

os is the headless contract-enforcing engine extracted from fx. Keep the shared
Zig continuation gate authoritative on native and WASM. Host applications own
evidence verification and persistence. Do not add an outer JavaScript retry loop.

Every engine requires a contract. Preserve cancellation, steering, private bridge
isolation, and checkpoint contract matching. Keep the public API in sdk/os-node.js,
sdk/os-browser.js, and their declarations. Legacy fx protocol names are internal.

Use Zig 0.17 and Node.js 24. Run `zig build test`, build both native and WASM,
`npm test`, and the deterministic example. Exercise examples/browser.html when
browser behavior changes. Keep Linux, macOS, and WASM CI green before declaring
an extraction or runtime change ready. Do not commit generated binary artifacts.

Keep Apache-2.0 attribution and the extraction provenance in NOTICE. Document
observable behavior in README.md and docs/contracts.md.
