// Ši funkcija skirta tik žiniatinkliui, nes native aplinka šiuo metu nepalaiko serverio (arba kompiliavimo metu vykdomo) atvaizdavimo.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return client;
}
