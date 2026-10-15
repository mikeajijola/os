# Contracts


Every `createAgent()` and `createEngine()` call requires a `contract`. The Zig loop checks the contract whenever the model tries
to end a normal reply. Pending obligations continue the same turn; all obligations
marked `met` permit `end_turn`; blocked obligations with no pending work return
`contract_blocked`. Missing contracts are rejected by both the SDK and Zig initialization handler.

The host provides `assess(request, context)`. Resolve evidence against your own
records; assistant text is a completion candidate, not proof of success. The
callback receives the fixed contract, `assistantText`, the model `step`, and
`{signal, sessionId, executionId}`. Keep assessment read-only and safe to repeat.
Steering stays available while assessment waits and while pending work continues.

For example, given an application-owned `reportStore` that verifies retained bytes
and returns a receipt for the current session:

```js
const agent = createAgent({
  model: "your-provider/model-id",
  tools: reportTools, // Your application's report creation and inspection tools.
  contract: {
    id: "save-report",
    version: 1,
    objective: "Save and verify the report",
    obligations: [{ id: "saved", description: "The report is retained and verified" }],
    async assess({ contract }, { signal, sessionId }) {
      const receipt = await reportStore.verify(sessionId, { signal });
      return {
        contractId: contract.id,
        version: contract.version,
        obligations: [{
          id: "saved",
          status: receipt ? "met" : "pending",
          evidence: receipt ? [receipt.id] : [],
          note: receipt ? "Verified retained report bytes" : "Save and verify the report",
        }],
      };
    },
  },
});
```

Every assessment must name the exact contract ID and version and report each
obligation exactly once. Each report needs a note; `met` additionally needs at
least one evidence reference. Zig validates this structure. The host remains
responsible for whether the references establish fulfilment. Use `blocked` with
a note describing the missing input when progress needs intervention. If another
obligation is pending, that independent work continues first.

Contracts have 1–100 obligations, unique obligation IDs, and a positive 32-bit
version. IDs are at most 128 UTF-8 bytes; objectives are at most 8 KiB; descriptions
and assessment notes are at most 4 KiB. Definitions and assessments are each
limited to 64 KiB. An obligation can cite at most 100 references of 512 bytes each.
Malformed assessments and callback failures fail the turn. They never establish
completion. Cancellation aborts the callback's signal and stops waiting even if
the callback does not settle. Provider errors and output limits remain separate
terminal outcomes. There is no implicit total-work retry or cost budget; use the
host's cancellation and usage controls.

The contract definition is fixed for the engine lifetime and applies to its
prompts. Create another engine for another contract. `createAgent()` passes the
same definition to the engines it creates, so use a distinct agent configuration
for a different objective. Supply the same definition and a current assessor
when restoring a checkpoint. Checkpoints record a digest of the definition and
reject a missing or changed contract; they do not contain the assessor or its
evidence store. Keep those records in host-owned durable storage.

Contract assessments use the existing cancellable host bridge, without adding a
model-callable tool. `__libfx_contract_assess` is reserved. A core that does not
advertise contract support is rejected before the first prompt.

