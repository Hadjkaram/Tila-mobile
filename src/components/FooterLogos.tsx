import React from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';

export function FooterLogos() {
  const { width } = useWindowDimensions();
  const isSmall = width < 360;

  return (
    <View style={[styles.partnerLogosRow, isSmall && styles.partnerLogosRowSmall]}>
      <Image
        source={require('../../assets/images/ministere_sante.png')}
        style={styles.ministereLogo}
        resizeMode="contain"
      />
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.tilaLogo}
        resizeMode="contain"
      />
      <Image
        source={require('../../assets/images/pnsm.png')}
        style={styles.pnsmLogo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  partnerLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 16,
    marginTop: 'auto',
  },
  partnerLogosRowSmall: {
    gap: 8,
  },
  ministereLogo: {
    height: 40,
    width: 75,
  },
  tilaLogo: {
    height: 46,
    width: 90,
  },
  pnsmLogo: {
    height: 40,
    width: 75,
  },
});
