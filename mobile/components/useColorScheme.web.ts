// PASTABA: Numatytasis React Native stilizavimas nepalaiko serverio atvaizdavimo.
// Serveryje atvaizduoti stiliai neturėtų keistis tarp pirmojo HTML atvaizdavimo
// ir pirmojo atvaizdavimo kliente. Paprastai žiniatinklio kūrėjai naudoja CSS media užklausas
// skirtingiems stiliams kliente ir serveryje atvaizduoti; React Native jos tiesiogiai nepalaikomos,
// bet tai galima pasiekti naudojant stilizavimo biblioteką, pvz., Nativewind.
export function useColorScheme() {
  return 'light';
}
