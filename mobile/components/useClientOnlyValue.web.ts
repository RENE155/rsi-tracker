import React from 'react';

// `useEffect` nėra iškviečiamas serverio atvaizdavimo metu, vadinasi,
// galime tai naudoti nustatyti, ar esame serveryje, ar ne.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const [value, setValue] = React.useState<S | C>(server);
  React.useEffect(() => {
    setValue(client);
  }, [client]);

  return value;
}
