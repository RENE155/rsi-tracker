import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform } from 'react-native';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      target="_blank"
      {...props}
      // @ts-expect-error: Išorinių URL tipai neaprašyti.
      href={props.href}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Neleidžia numatytojo elgesio – atidaryti nuorodą numatytojoje naršyklėje native aplinkoje.
          e.preventDefault();
          // Atidaro nuorodą programos viduje esančioje naršyklėje.
          WebBrowser.openBrowserAsync(props.href as string);
        }
      }}
    />
  );
}
