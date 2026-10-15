// Deterministic model transport; the agent loop and host tool are real.
export async function runScenario(createEngine, options = {}) {
  let requests = 0, writes = 0, assessments = 0;
  const engine = await createEngine({
    ...options, model: "os/fixture", apiKey: "fixture",
    fetch(_url, init = {}) {
      if (init.method === "GET") return Response.json({ data: [{ id: "os/fixture", type: "language", tags: ["tool-use"] }] });
      requests++;
      const events = requests === 2
        ? [{ type: "tool-call", toolCallId: "save-1", toolName: "save_report", input: {} }, { type: "finish", finishReason: { unified: "tool-calls", raw: "tool-calls" } }]
        : [{ type: "text-delta", delta: "Done." }, { type: "finish", finishReason: { unified: "stop", raw: "stop" } }];
      return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
    },
    tools: [{ name: "save_report", description: "Save the report", inputSchema: { type: "object" }, execute() { writes++; return "receipt:1"; } }],
    contract: {
      id: "report", version: 1, objective: "Save and verify the report",
      obligations: [{ id: "saved", description: "The report is retained" }],
      assess({ contract }) {
        assessments++;
        return { contractId: contract.id, version: contract.version, obligations: [{
          id: "saved", status: writes ? "met" : "pending", evidence: writes ? ["receipt:1"] : [],
          note: writes ? "Verified report receipt" : "Save the report before completing",
        }] };
      },
    },
  });
  try {
    const turn = engine.prompt("Save the report");
    for await (const _ of turn) {}
    const { stopReason } = await turn.result;
    if (stopReason !== "end_turn" || requests !== 3 || writes !== 1 || assessments !== 2) throw new Error("Contract scenario failed");
    return { stopReason, requests, writes, assessments };
  } finally { await engine.close(); }
}
