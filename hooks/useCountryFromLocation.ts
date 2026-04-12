import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { ISO_TO_TIPPING } from '../data/countryCodeMap';
import { ContinentKey } from '../data/tippingData';

export function useCountryFromLocation() {
  const [result, setResult] = useState<{ continent: ContinentKey; country: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [geo] = await Location.reverseGeocodeAsync(pos.coords);
      const match = ISO_TO_TIPPING[geo?.isoCountryCode ?? ''];
      if (match) setResult(match);
    })();
  }, []);

  return result;
}
