import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sparkles,
  Smile,
  Meh,
  Frown,
  ArrowRight,
  ClipboardList,
  Heart,
  BookOpen,
  MessagesSquare,
  LifeBuoy,
  CheckCircle2,
  Calendar,
  Wind,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { patientService, AssessmentItem } from '../../services/patient';
import { patientSpaceService, formatFr } from '../../services/patientSpace';

const MOODS = [
  { level: 1, label: 'Très difficile', emoji: '😣', color: '#ef4444' },
  { level: 2, label: 'Difficile', emoji: '🙁', color: '#f97316' },
  { level: 3, label: 'Moyen / Neutre', emoji: '😐', color: '#eab308' },
  { level: 4, label: 'Bien', emoji: '🙂', color: '#3b82f6' },
  { level: 5, label: 'Très bien', emoji: '😊', color: '#00A651' },
];

export default function PatientBienEtre() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [latestAssessment, setLatestAssessment] = useState<AssessmentItem | null>(null);
  const [moodList, setMoodList] = useState<{ id: number; level: number; label: string; date: string }[]>([]);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [savingMood, setSavingMood] = useState(false);
  const [moodSavedToday, setMoodSavedToday] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [assessRes, moodRes] = await Promise.allSettled([
        patientService.recentAssessments(),
        patientSpaceService.moods(),
      ]);

      if (assessRes.status === 'fulfilled' && Array.isArray(assessRes.value) && assessRes.value.length > 0) {
        setLatestAssessment(assessRes.value[0]);
      } else {
        setLatestAssessment(null);
      }

      if (moodRes.status === 'fulfilled' && moodRes.value?.items) {
        setMoodList(moodRes.value.items);
        if (moodRes.value.items.length > 0) {
          const first = moodRes.value.items[0];
          const today = new Date().toISOString().slice(0, 10);
          if (first.date && first.date.slice(0, 10) === today) {
            setSelectedMood(first.level);
            setMoodSavedToday(true);
          }
        }
      }
    } catch (err) {
      console.error('Error loading wellness data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectMood = async (item: typeof MOODS[0]) => {
    setSelectedMood(item.level);
    setSavingMood(true);
    try {
      await patientSpaceService.saveMood(item.level, item.label);
      setMoodSavedToday(true);
      await loadData();
      Alert.alert('Humeur enregistrée', `Merci ! Votre humeur « ${item.label} » a bien été notée.`);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d\'enregistrer votre humeur.');
    } finally {
      setSavingMood(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#00A651']} tintColor="#00A651" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={[styles.headerIconCircle, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#dcfce7' }]}>
              <Sparkles size={24} color="#00A651" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Mon bien-être</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Prenez soin de vous au quotidien, suivez votre humeur et vos progrès.
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#00A651" />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Chargement de votre espace bien-être...</Text>
          </View>
        ) : (
          <>
            {/* 1. Suivi d'humeur du jour */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Heart size={20} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Comment vous sentez-vous aujourd'hui ?</Text>
              </View>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                Enregistrer régulièrement votre humeur aide vos professionnels à mieux vous accompagner.
              </Text>

              <View style={styles.moodGrid}>
                {MOODS.map((m) => {
                  const isSelected = selectedMood === m.level;
                  return (
                    <TouchableOpacity
                      key={m.level}
                      style={[
                        styles.moodBtn,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(0,166,81,0.2)' : '#dcfce7')
                            : (isDark ? colors.cardSecondary : '#f8fafc'),
                          borderColor: isSelected ? '#00A651' : colors.border,
                        },
                      ]}
                      onPress={() => handleSelectMood(m)}
                      disabled={savingMood}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.moodEmoji}>{m.emoji}</Text>
                      <Text
                        style={[
                          styles.moodLabel,
                          {
                            color: isSelected ? '#00A651' : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {moodSavedToday && (
                <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#f0fdf4' }]}>
                  <CheckCircle2 size={16} color="#00A651" style={{ marginRight: 6 }} />
                  <Text style={[styles.statusBadgeText, { color: '#00A651' }]}>
                    Humeur enregistrée pour aujourd'hui
                  </Text>
                </View>
              )}
            </View>

            {/* 2. Dernier résultat d'évaluation */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <ClipboardList size={20} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Dernière évaluation</Text>
              </View>

              {latestAssessment ? (
                <View style={styles.latestAssessmentContent}>
                  <View style={styles.assessmentInfoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.assessmentTitle, { color: colors.text }]}>
                        {latestAssessment.type || 'Auto-évaluation TILA'}
                      </Text>
                      <View style={styles.assessmentMetaRow}>
                        <Calendar size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.assessmentDate, { color: colors.textMuted }]}>
                          {formatFr(latestAssessment.date)}
                        </Text>
                      </View>
                    </View>
                    {latestAssessment.score !== undefined && (
                      <View style={[styles.scoreBadge, { backgroundColor: isDark ? 'rgba(0,166,81,0.2)' : '#ecfdf5' }]}>
                        <Text style={styles.scoreValue}>
                          {latestAssessment.score}%
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.assessmentActionRow}>
                    <TouchableOpacity
                      style={[styles.btnSecondary, { borderColor: colors.border }]}
                      onPress={() => router.push('/(patient)/evaluations')}
                    >
                      <Text style={[styles.btnSecondaryText, { color: colors.text }]}>Historique des scores</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnPrimary}
                      onPress={() => router.push('/(patient)/evaluations')}
                    >
                      <Text style={styles.btnPrimaryText}>Nouvelle évaluation</Text>
                      <ArrowRight size={15} color="#fff" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyAssessment}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Vous n'avez pas encore réalisé d'évaluation.
                  </Text>
                  <TouchableOpacity
                    style={[styles.btnPrimary, { marginTop: 12 }]}
                    onPress={() => router.push('/(patient)/evaluations')}
                  >
                    <Text style={styles.btnPrimaryText}>Faire ma première évaluation</Text>
                    <ArrowRight size={15} color="#fff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 3. Exercice de respiration / Détente */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Wind size={20} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Pause respiration & détente</Text>
              </View>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                La technique 4-7-8 aide à réduire l'anxiété instantanément : inspirez 4 sec, retenez 7 sec, expirez 8 sec.
              </Text>
              <View style={[styles.breathingCard, { backgroundColor: isDark ? colors.cardSecondary : '#f0fdf4' }]}>
                <Text style={styles.breathingSteps}>
                  1. Inspirez profondément par le nez (4s){'\n'}
                  2. Retenez votre souffle calmement (7s){'\n'}
                  3. Expirez doucement par la bouche (8s)
                </Text>
              </View>
            </View>

            {/* 4. Liens et raccourcis rapides */}
            <View style={styles.quickLinksGrid}>
              <TouchableOpacity
                style={[styles.quickLinkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(patient)/ressources' as any)}
                activeOpacity={0.7}
              >
                <BookOpen size={22} color="#00A651" style={{ marginBottom: 8 }} />
                <Text style={[styles.quickLinkTitle, { color: colors.text }]}>Ressources & Guides</Text>
                <Text style={[styles.quickLinkDesc, { color: colors.textSecondary }]}>Articles, audios et vidéos de bien-être</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickLinkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(patient)/forum')}
                activeOpacity={0.7}
              >
                <MessagesSquare size={22} color="#00A651" style={{ marginBottom: 8 }} />
                <Text style={[styles.quickLinkTitle, { color: colors.text }]}>Forum d'entraide</Text>
                <Text style={[styles.quickLinkDesc, { color: colors.textSecondary }]}>Échangez avec la communauté TILA</Text>
              </TouchableOpacity>
            </View>

            {/* 5. Bannière d'urgence 143 */}
            <TouchableOpacity
              style={[styles.emergencyBanner, { backgroundColor: isDark ? '#3f1212' : '#fef2f2', borderColor: '#fca5a5' }]}
              onPress={() => router.push('/(patient)/aide' as any)}
              activeOpacity={0.8}
            >
              <LifeBuoy size={24} color="#dc2626" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyTitle}>Besoin d'aide immédiate ?</Text>
                <Text style={styles.emergencySubtitle}>
                  Ligne d'écoute et d'urgence gratuite PNSM disponible 24/7 au 143.
                </Text>
              </View>
              <ArrowRight size={18} color="#dc2626" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10.5,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  latestAssessmentContent: {
    marginTop: 6,
  },
  assessmentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  assessmentTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  assessmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  assessmentDate: {
    fontSize: 12,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00A651',
  },
  assessmentActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#00A651',
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyAssessment: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  breathingCard: {
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  breathingSteps: {
    fontSize: 13,
    lineHeight: 22,
    color: '#15803d',
    fontWeight: '500',
  },
  quickLinksGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  quickLinkCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickLinkTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  quickLinkDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 2,
  },
  emergencySubtitle: {
    fontSize: 11.5,
    color: '#b91c1c',
    lineHeight: 16,
  },
});
