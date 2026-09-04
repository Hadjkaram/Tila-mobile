import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Stethoscope,
  Heart,
  Users,
  ArrowRight,
  LogIn,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterChoiceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      {/* Header avec retour */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Inscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Bandeau des 3 Logos Partenaires */}
        {/* Logos officiels partenaires libres (sans bloc / boîte) */}
        <View style={styles.partnerLogosRow}>
          <Image
            source={require('../../../assets/images/ministere.jpg')}
            style={styles.ministereLogo}
            resizeMode="contain"
          />
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.tilaLogo}
            resizeMode="contain"
          />
          <Image
            source={require('../../../assets/images/pnsm.png')}
            style={styles.pnsmLogo}
            resizeMode="contain"
          />
        </View>

        {/* Titre & Sous-titre officiels */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Comment souhaitez-vous vous inscrire ?</Text>
        </View>

        {/* Les 3 Cartes de Choix UX/UI Pro */}
        <View style={styles.cardsContainer}>
          {/* Carte 1 : Professionnel de santé */}
          <TouchableOpacity
            style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(auth)/register-pro')}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? colors.cardSecondary : '#ecfdf5' }]}>
                <Stethoscope size={26} color="#00A651" />
              </View>
              <View style={[styles.badgeRole, isDark && { backgroundColor: colors.cardSecondary }]}>
                <Text style={[styles.badgeRoleText, { color: '#00A651' }]}>
                  Professionnels
                </Text>
              </View>
            </View>

            <Text style={[styles.cardTitle, { color: colors.text }]}>Je suis un professionnel de santé</Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              Psychologues, psychiatres, travailleurs sociaux… Inscrivez-vous à l’annuaire pour être visible et recevoir des demandes de téléconsultation.
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Continuer</Text>
                <ArrowRight size={16} color="#00A651" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Carte 2 : Bénéficiaire / Patient (Je souhaite être accompagné) */}
          <TouchableOpacity
            style={[styles.choiceCard, styles.choiceCardPatient, isDark && { backgroundColor: colors.card, borderColor: '#00A651' }]}
            onPress={() => router.push('/(auth)/register-patient')}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? colors.cardSecondary : '#f0fdf4' }]}>
                <Heart size={26} color="#00A651" />
              </View>
              <View style={[styles.badgeRole, isDark ? { backgroundColor: colors.cardSecondary } : { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.badgeRoleText, { color: '#15803d' }]}>
                  Bénéficiaires & Patients
                </Text>
              </View>
            </View>

            <Text style={[styles.cardTitle, { color: colors.text }]}>Je souhaite être accompagné(e)</Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              Créez un compte pour accéder aux évaluations, prendre rendez-vous avec un praticien et suivre votre parcours de santé mentale.
            </Text>

            <View style={styles.cardFooter}>
              <View style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <Text style={styles.actionBtnPrimaryText}>Continuer</Text>
                <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Carte 3 : Agent Sensibilisateur */}
          <TouchableOpacity
            style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(auth)/register-agent')}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? colors.cardSecondary : '#f0f9ff' }]}>
                <Users size={26} color="#0284c7" />
              </View>
              <View style={[styles.badgeRole, isDark ? { backgroundColor: colors.cardSecondary } : { backgroundColor: '#e0f2fe' }]}>
                <Text style={[styles.badgeRoleText, { color: '#0369a1' }]}>
                  Sensibilisateurs
                </Text>
              </View>
            </View>

            <Text style={[styles.cardTitle, { color: colors.text }]}>Je suis un agent sensibilisateur</Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              Agents rattachés à une ONG partenaire. Compte soumis à validation administrative pour le suivi de cohortes et dépistages terrain.
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.actionBtn}>
                <Text style={[styles.actionBtnText, { color: '#0284c7' }]}>Continuer</Text>
                <ArrowRight size={16} color="#0284c7" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Pied de page : Déjà un compte ? Se connecter */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.loginLink, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <LogIn size={16} color="#00A651" style={{ marginRight: 6 }} />
            <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
              Déjà un compte ?{' '}
              <Text style={styles.loginLinkHighlight}>Se connecter</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 30,
  },
  partnerLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 20,
    gap: 12,
  },
  ministereLogo: {
    height: 44,
    width: 80,
  },
  tilaLogo: {
    height: 52,
    width: 100,
  },
  pnsmLogo: {
    height: 44,
    width: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14.5,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  choiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  choiceCardPatient: {
    borderColor: '#a7f3d0',
    backgroundColor: '#ffffff',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRole: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeRoleText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  actionBtnPrimary: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  loginLinkHighlight: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
