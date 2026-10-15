import type { FxAgent, FxAgentOptions, FxEngine, FxEngineOptions, FxWorkContract, FxNodeBackendOptions, FxBrowserBackendOptions } from "./libfx.cjs";
export type { FxWorkContract as Contract, FxWorkContractDefinition as ContractDefinition, FxContractAssessment as Assessment, FxEngine as Engine, FxAgent as Agent, Durability, FxToolContext as ToolContext } from "./libfx.cjs";
export { memory, wakeHandler, createMemoryPersistence, supportsJspi, listModels, FxFencedError as FencedError, FxJournalVersionError as JournalVersionError } from "./libfx.cjs";
export type EngineOptions = FxEngineOptions & FxNodeBackendOptions & { contract: FxWorkContract };
export type AgentOptions = FxAgentOptions & FxNodeBackendOptions & { contract: FxWorkContract };
export declare function createEngine(options: EngineOptions): Promise<FxEngine>;
export declare function createAgent(options: AgentOptions): FxAgent;
