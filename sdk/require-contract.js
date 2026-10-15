export function requireContract(options) {
  if (!options || typeof options !== "object" || !options.contract || typeof options.contract.assess !== "function") {
    throw new TypeError("os requires a work contract with assess()");
  }
  return options;
}
