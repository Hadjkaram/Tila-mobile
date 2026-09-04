import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  ChevronRight,
  Clock,
  Sparkles,
  ShieldCheck,
  Heart,
  HelpCircle,
} from 'lucide-react-native';

export interface AssessmentMeta {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  questionsCount: number;
  badge: string;
  color: string;
  bgLight: string;
  isRecommended?: boolean;
}

export const OFFICIAL_ASSESSMENTS: AssessmentMeta[] = [
  {
    id: 'ods',
    title: 'ODS / BMH-MWT',
    subtitle: 'Dépistage des Troubles Mentaux Courants',
    description: 'Dépression, anxiété, consommation d’alcool, détresse émotionnelle et idées suicidaires.',
    duration: '5 à 10 min',
    questionsCount: 11,
    badge: 'Recommandé',
    color: '#00A651',
    bgLight: '#ecfdf5',
    isRecommended: true,
  },
  {
    id: 'berger',
    title: 'Échelle de Berger (VIH)',
    subtitle: 'Stigmatisation liée au VIH',
    description: 'Auto-image, attitudes perçues, isolement et gestion de la confidentialité du statut.',
    duration: '10 min',
    questionsCount: 12,
    badge: 'Stigmatisation',
    color: '#2563eb',
    bgLight: '#eff6ff',
  },
  {
    id: 'sdq',
    title: 'SDQ (Forces et Difficultés)',
    subtitle: 'Évaluation comportementale enfants & ados',
    description: 'Symptômes émotionnels, conduite, hyperactivité et relations avec les pairs (4-17 ans).',
    duration: '8 à 12 min',
    questionsCount: 25,
    badge: 'Enfants & Ados',
    color: '#F58220',
    bgLight: '#fff7ed',
  },
  {
    id: 'pcl5',
    title: 'PCL-5 TERRAIN',
    subtitle: 'Trauma, TSPT & Événements stressants',
    description: 'Dépistage des symptômes de stress post-traumatique (reviviscence, évitement, hyperréactivité).',
    duration: '15 min',
    questionsCount: 20,
    badge: 'Terrain & Migrants',
    color: '#8b5cf6',
    bgLight: '#f5f3ff',
  },
];

import { useTheme } from '../../context/ThemeContext';

export default function AssessmentsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      {/* Header avec bouton retour et titre centré */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.cardSecondary }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerMainTitle, { color: colors.text }]}>Mes Auto-Évaluations</Text>
          <Text style={[styles.headerSubTitle, { color: colors.textSecondary }]}>Outils Cliniques Certifiés TILA</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Bannière d'information & Confidentialité */}
        <View style={[styles.infoBanner, isDark && { backgroundColor: 'rgba(0,166,81,0.15)', borderColor: '#00A651' }]}>
          <View style={[styles.infoIconBox, isDark && { backgroundColor: colors.card }]}>
            <ShieldCheck size={20} color="#00A651" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>100% Confidentiel & Gratuit</Text>
            <Text style={[styles.infoText, { color: colors.text }]}>
              Ces questionnaires cliniques scientifiquement validés vous permettent de faire le point sur votre état émotionnel. Vos données restent strictement confidentielles.
            </Text>
          </View>
        </View>

        {/* Titre de section */}
        <View style={styles.sectionHeader}>
          <Sparkles size={16} color="#00A651" style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Catalogue des Outils Cliniques</Text>
        </View>

        {/* Liste des 4 Cartes Cliniques */}
        <View style={styles.listContainer}>
          {OFFICIAL_ASSESSMENTS.map((assessment) => (
            <TouchableOpacity
              key={assessment.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/public-assessments/${assessment.id}`)}
              activeOpacity={0.8}
            >
              {/* Entête de carte avec icône et badge */}
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : assessment.bgLight },
                  ]}
                >
                  <FileText size={22} color={assessment.color} />
                </View>

                <View style={styles.badgeRow}>
                  {assessment.isRecommended && (
                    <View style={styles.badgeRecommended}>
                      <Text style={styles.badgeRecommendedText}>Recommandé</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.badgeDomain,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : assessment.bgLight,
                        borderColor: assessment.color,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.badgeDomainText, { color: assessment.color }]}
                    >
                      {assessment.badge}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Titre et sous-titre */}
              <Text style={[styles.cardTitle, { color: colors.text }]}>{assessment.title}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{assessment.subtitle}</Text>
              <Text style={[styles.cardDescription, { color: colors.textMuted }]}>{assessment.description}</Text>

              {/* Pied de carte avec durée et CTA */}
              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View style={styles.metaRow}>
                  <Clock size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{assessment.duration}</Text>
                  <Text style={[styles.metaDot, { color: colors.border }]}>•</Text>
                  <HelpCircle size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {assessment.questionsCount} questions
                  </Text>
                </View>

                <View style={styles.startBtn}>
                  <Text style={[styles.startBtnText, { color: assessment.color }]}>
                    Commencer
                  </Text>
                  <ChevronRight size={16} color={assessment.color} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note de bas de page médicale */}
        <View style={[styles.medicalNotice, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
          <Text style={[styles.medicalNoticeText, { color: colors.textSecondary }]}>
            Ces auto-évaluations sont des outils d'orientation et de sensibilisation. Elles ne constituent pas un diagnostic médical formel. En cas d'urgence ou de détresse sévère, contactez immédiatement un professionnel de santé.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitles: {
    alignItems: 'center',
    flex: 1,
  },
  headerMainTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#00A651',
    marginBottom: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  infoText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  listContainer: {
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeRecommended: {
    backgroundColor: '#00A651',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeRecommendedText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  badgeDomain: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  badgeDomainText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  metaDot: {
    marginHorizontal: 6,
    color: '#cbd5e1',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  startBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  medicalNotice: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  medicalNoticeText: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
  },
});
