import { createAgent, createEngine, memory, type Contract } from "@mikeajijola/os";
import { createEngine as browserEngine } from "@mikeajijola/os/browser";
const contract: Contract = {
  id: "report", version: 1, objective: "Save report",
  obligations: [{ id: "saved", description: "Report exists" }],
  assess({ contract }) { return { contractId: contract.id, version: contract.version, obligations: [{ id: "saved", status: "met", evidence: ["receipt:1"], note: "Verified" }] }; },
};
createEngine({ model: "fixture", apiKey: "fixture", contract });
createAgent({ model: "fixture", apiKey: "fixture", contract, durability: memory() });
browserEngine({ model: "fixture", apiKey: "fixture", contract });
// @ts-expect-error A contract is required.
createEngine({ model: "fixture", apiKey: "fixture" });
// @ts-expect-error A contract is required for durable agents too.
createAgent({ model: "fixture", apiKey: "fixture" });
// @ts-expect-error Browser engines enforce the same contract requirement.
browserEngine({ model: "fixture", apiKey: "fixture" });
