import { createAgent, createEngine, memory, type Contract } from "@mikeajijola/om";
import { createEngine as browserEngine } from "@mikeajijola/om/browser";
const contract: Contract = {
  id: "report", version: 1, objective: "Save report",
  obligations: [{ id: "saved", description: "Report exists" }],
  assess({ contract }) { return { contractId: contract.id, version: contract.version, obligations: [{ id: "saved", status: "met", evidence: ["receipt:1"], note: "Verified" }] }; },
};
createEngine({ model: "fixture", apiKey: "fixture", contract });
createAgent({ model: "fixture", apiKey: "fixture", contract, durability: memory() });
browserEngine({ model: "fixture", apiKey: "fixture", contract });
// @ts-expect-error A contract is required.
createEngine({ model: "fixture" });
// @ts-expect-error A contract is required for durable agents too.
createAgent({ model: "fixture" });
// @ts-expect-error Browser engines enforce the same contract requirement.
browserEngine({ model: "fixture" });
