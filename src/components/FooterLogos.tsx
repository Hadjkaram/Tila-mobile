import React from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';

export function FooterLogos() {
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Logos institutionnels principaux */}
      <View style={[styles.partnerLogosRow, isSmall && styles.partnerLogosRowSmall]}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/ministere_sante.png')}
            style={styles.ministereLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.tilaLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/pnsm.png')}
            style={styles.pnsmLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Mention Avec l'appui de : et logos partenaires techniques */}
      <View style={styles.supportSection}>
        <Text style={[styles.supportText, isDark && { color: colors.textSecondary }]}>
          Avec l'appui de :
        </Text>
        <View style={[styles.supportLogosRow, isSmall && styles.supportLogosRowSmall]}>
          <View style={[styles.partnerBadge, isDark && styles.partnerBadgeDark]}>
            <Image
              source={require('../../assets/images/ue.jpeg')}
              style={styles.ueLogo}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.partnerBadge, isDark && styles.partnerBadgeDark]}>
            <Image
              source={require('../../assets/images/expertise_france.jpeg')}
              style={styles.expertiseLogo}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 'auto',
  },
  partnerLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 8,
    gap: 16,
  },
  partnerLogosRowSmall: {
    gap: 8,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ministereLogo: {
    height: 40,
    width: 74,
  },
  tilaLogo: {
    height: 46,
    width: 90,
  },
  pnsmLogo: {
    height: 40,
    width: 74,
  },
  supportSection: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  supportText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  supportLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  supportLogosRowSmall: {
    gap: 8,
  },
  partnerBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerBadgeDark: {
    backgroundColor: '#ffffff',
  },
  ueLogo: {
    height: 38,
    width: 70,
  },
  expertiseLogo: {
    height: 32,
    width: 96,
  },
});
