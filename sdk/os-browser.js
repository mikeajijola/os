import { createFxEngine } from "./fx-sdk.js";
import { createDurableAgentFactory, memory } from "./durable.js";
import { fxHarness } from "./fx-harness.js";
import { requireContract } from "./require-contract.js";

export { memory, wakeHandler } from "./durable.js";
export { createMemoryPersistence, supportsJspi, listModels, FxFencedError as FencedError, FxJournalVersionError as JournalVersionError } from "./fx-sdk.js";

export async function createEngine(options) {
  return createFxEngine({ ...requireContract(options), wasm: options.wasm ?? new URL("./os-core.wasm", import.meta.url).href });
}

const factory = createDurableAgentFactory({
  name: "createAgent",
  label: "os agent",
  defaultDurability: async () => memory(),
  harness: fxHarness({ createEngine }),
});

export function createAgent(options) {
  return factory(requireContract(options));
}
