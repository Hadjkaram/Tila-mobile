import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, useWindowDimensions, ScrollView } from 'react-native';
import { Text } from '../components/Text';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ArrowRight, UserPlus, AlertTriangle } from 'lucide-react-native';
import { tokenService } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // Si l'utilisateur a une session active, rediriger directement vers son espace
    tokenService.getInitialAuthRoute().then((authRoute) => {
      if (authRoute) {
        router.replace(authRoute as any);
      }
    });
  }, []);

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logos officiels partenaires libres (sans bloc / boîte) */}
        <View style={styles.partnerLogosRow}>
          <Image
            source={require('../../assets/images/ministere.jpg')}
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

        {/* Corps central épuré */}
        <View style={styles.centerContent}>
          {/* Badge institutionnel */}
          <View style={styles.officialBadge}>
            <Sparkles size={13} color="#00A651" style={{ marginRight: 5 }} />
            <Text style={styles.officialBadgeText}>
              Plateforme Nationale de Santé Mentale
            </Text>
          </View>

          {/* Slogan officiel exact */}
          <Text style={[styles.slogan, isDark && { color: colors.text }]}>
            « La santé mentale, c'est l'affaire de tous »
          </Text>

          {/* Sous-titre d'accompagnement */}
          <Text style={[styles.subtitle, isDark && { color: colors.textSecondary }]}>
            Accédez gratuitement à des auto-évaluations cliniques certifiées,
            consultez des spécialistes qualifiés et suivez votre bien-être en toute confidentialité.
          </Text>
        </View>

        {/* Boutons d'action UX/UI Pro */}
        <View style={styles.bottomContainer}>
          {/* Bouton Urgence Rouge TILA : Signaler un cas maintenant */}
          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => router.push('/alert-case' as any)}
            activeOpacity={0.85}
          >
            <AlertTriangle size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.alertButtonText}>Signaler un cas maintenant</Text>
          </TouchableOpacity>

          {/* Bouton 1 (Orange TILA) */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/public-assessments')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>S'auto-évaluer gratuitement</Text>
            <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          {/* Bouton 2 (Vert TILA Outline) */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isDark && { backgroundColor: colors.card, borderColor: '#00A651' },
            ]}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Se connecter</Text>
          </TouchableOpacity>

          {/* Lien Inscription vers Choix du Type de Compte */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register-choice')}
            activeOpacity={0.7}
          >
            <UserPlus size={15} color="#00A651" style={{ marginRight: 6 }} />
            <Text style={[styles.registerLinkText, isDark && { color: colors.textSecondary }]}>
              Pas encore de compte ?{' '}
              <Text style={styles.registerLinkHighlight}>Créer un compte</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  scrollContentTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 40,
  },
  partnerLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
  },
  ministereLogo: {
    height: 48,
    width: 85,
  },
  tilaLogo: {
    height: 56,
    width: 105,
  },
  pnsmLogo: {
    height: 48,
    width: 85,
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
    marginVertical: 24,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 18,
  },
  officialBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  slogan: {
    fontSize: 21,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 14,
    fontFamily: 'Montserrat_700Bold',
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: 'Montserrat_400Regular',
    paddingHorizontal: 12,
  },
  bottomContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  alertButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  alertButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#F58220', // Orange TILA
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F58220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#00A651', // Vert TILA
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#00A651',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  registerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  registerLinkText: {
    fontSize: 13.5,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  registerLinkHighlight: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
