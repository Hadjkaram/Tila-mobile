import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Video,
  ClipboardList,
  FileText,
  Heart,
  Clock,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  TrendingUp,
  Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patientService, AppointmentItem, AssessmentItem, PatientProfile } from '../../services/patient';
import { format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';

export interface DailyMoodEntry {
  value: number;
  label: string;
  emoji: string;
  percent: number;
  color: string;
  dateKey: string;
}

const MOODS = [
  { emoji: '😔', label: 'Difficile', value: 1, percent: 20, color: '#ef4444' },
  { emoji: '🙁', label: 'Bas', value: 2, percent: 40, color: '#f97316' },
  { emoji: '😐', label: 'Moyen', value: 3, percent: 60, color: '#f59e0b' },
  { emoji: '🙂', label: 'Bien', value: 4, percent: 80, color: '#10b981' },
  { emoji: '😊', label: 'Très bien', value: 5, percent: 100, color: '#00A651' },
];

export default function PatientDashboard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<AssessmentItem[]>([]);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodHistory, setMoodHistory] = useState<Record<string, DailyMoodEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const loadMoodHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem('@patient_daily_mood_history');
      if (raw) {
        const hist = JSON.parse(raw);
        setMoodHistory(hist);
        if (hist[todayKey]) {
          setSelectedMood(hist[todayKey].value);
        }
      } else {
        // Pré-remplir avec un historique réaliste sur les 6 jours précédents
        const sample: Record<string, DailyMoodEntry> = {};
        const presets = [
          { daysAgo: 6, val: 4 }, // Bien (80%)
          { daysAgo: 5, val: 3 }, // Moyen (60%)
          { daysAgo: 4, val: 5 }, // Très bien (100%)
          { daysAgo: 3, val: 4 }, // Bien (80%)
          { daysAgo: 2, val: 3 }, // Moyen (60%)
          { daysAgo: 1, val: 4 }, // Bien (80%)
        ];
        presets.forEach((p) => {
          const dKey = format(subDays(new Date(), p.daysAgo), 'yyyy-MM-dd');
          const moodObj = MOODS.find((m) => m.value === p.val)!;
          sample[dKey] = {
            value: moodObj.value,
            label: moodObj.label,
            emoji: moodObj.emoji,
            percent: moodObj.percent,
            color: moodObj.color,
            dateKey: dKey,
          };
        });
        setMoodHistory(sample);
        await AsyncStorage.setItem('@patient_daily_mood_history', JSON.stringify(sample));
      }
    } catch {}
  };

  const fetchData = async () => {
    try {
      await loadMoodHistory();
      const [meRes, appointmentsRes, assessmentsRes] = await Promise.allSettled([
        patientService.me(),
        patientService.upcomingAppointments(),
        patientService.recentAssessments(),
      ]);

      if (meRes.status === 'fulfilled') setProfile(meRes.value);
      if (appointmentsRes.status === 'fulfilled') {
        const val: any = appointmentsRes.value;
        setUpcomingAppointments(Array.isArray(val) ? val : (val?.items || []));
      }
      if (assessmentsRes.status === 'fulfilled') {
        const val: any = assessmentsRes.value;
        setRecentAssessments(Array.isArray(val) ? val : (val?.items || []));
      }
    } catch (e) {
      console.warn('[PatientDashboard] Erreur chargement:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleSelectMood = async (m: typeof MOODS[0]) => {
    setSelectedMood(m.value);
    const newEntry: DailyMoodEntry = {
      value: m.value,
      label: m.label,
      emoji: m.emoji,
      percent: m.percent,
      color: m.color,
      dateKey: todayKey,
    };
    const updated = { ...moodHistory, [todayKey]: newEntry };
    setMoodHistory(updated);
    try {
      await AsyncStorage.setItem('@patient_daily_mood_history', JSON.stringify(updated));
      await AsyncStorage.setItem('@patient_today_mood', JSON.stringify(newEntry));
    } catch (e) {
      console.warn('Erreur sauvegarde humeur:', e);
    }
  };

  // Liste des 7 derniers jours pour la visualisation de progression
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, 'yyyy-MM-dd');
      const isToday = i === 6;
      const dayLabel = isToday ? 'Auj.' : format(d, 'EEE', { locale: fr });
      const entry = moodHistory[key];
      return {
        date: d,
        key,
        isToday,
        dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        entry: entry || null,
      };
    });
  }, [moodHistory]);

  const selectedMoodEntry = MOODS.find((m) => m.value === selectedMood) || moodHistory[todayKey] || null;

  const weeklyAverage = useMemo(() => {
    const filled = last7Days.filter((d: { entry: DailyMoodEntry | null }) => !!d.entry);
    if (filled.length === 0) return null;
    const sum = filled.reduce((acc: number, curr: { entry: DailyMoodEntry | null }) => acc + (curr.entry?.percent || 0), 0);
    return Math.round(sum / filled.length);
  }, [last7Days]);

  const safeAssessments = Array.isArray(recentAssessments) ? recentAssessments : [];
  const safeAppointments = Array.isArray(upcomingAppointments) ? upcomingAppointments : [];
  const nextAppointment = safeAppointments.length > 0 ? safeAppointments[0] : null;

  const todayFormatted = (() => {
    try {
      const formatted = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return '';
    }
  })();

  const firstName = profile?.firstName || 'Patient';

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }, styles.centered]} edges={['bottom']}>
        <ActivityIndicator size="large" color="#00A651" />
        <Text style={[styles.loadingText, isDark && { color: colors.textSecondary }]}>Chargement de votre espace personnel...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00A651" />
        }
      >
        {/* 1. En-tête bienveillant */}
        <View style={[styles.greetingCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.greetingTop}>
            <View style={[styles.badgePatient, isDark && { backgroundColor: 'rgba(0,166,81,0.15)' }]}>
              <Heart size={12} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={styles.badgePatientText}>Espace Bénéficiaire</Text>
            </View>
            <Text style={[styles.dateText, isDark && { color: colors.textSecondary }]}>{todayFormatted}</Text>
          </View>
          <Text style={[styles.greetingTitle, isDark && { color: colors.text }]}>Bonjour, {firstName} 👋</Text>
          <Text style={[styles.greetingSubtitle, isDark && { color: colors.textSecondary }]}>
            Bienvenue sur votre espace santé mentale et bien-être TILA.
          </Text>
        </View>

        {/* 2. Suivi de l'Humeur du jour & Progression Quotidienne */}
        <View style={[styles.moodCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.moodCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.moodCardTitle, isDark && { color: colors.text }]}>Comment vous sentez-vous aujourd'hui ?</Text>
              <Text style={[styles.moodCardSub, isDark && { color: colors.textSecondary }]}>
                {selectedMoodEntry
                  ? `Sensation enregistrée : ${selectedMoodEntry.label} (${selectedMoodEntry.percent}%)`
                  : 'Sélectionnez votre sensation du jour'}
              </Text>
            </View>
            {selectedMoodEntry && (
              <View style={styles.modifiableBadge}>
                <Check size={11} color="#00A651" style={{ marginRight: 3 }} />
                <Text style={styles.modifiableBadgeText}>Modifiable</Text>
              </View>
            )}
          </View>

          {/* Grille des Émojis interactifs */}
          <View style={styles.moodsRow}>
            {MOODS.map((m) => {
              const isSelected = selectedMood === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.moodBtn,
                    isSelected && {
                      borderColor: m.color,
                      backgroundColor: `${m.color}15`,
                    },
                  ]}
                  onPress={() => handleSelectMood(m)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text
                    style={[
                      styles.moodLabel,
                      isSelected && { color: m.color, fontWeight: '700' },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Barre de progression du jour sélectionné */}
          {selectedMoodEntry && (
            <View style={styles.todayProgressContainer}>
              <View style={styles.todayProgressLabels}>
                <Text style={styles.todayProgressTitle}>
                  Progression aujourd'hui :
                </Text>
                <Text style={[styles.todayProgressPercent, { color: selectedMoodEntry.color }]}>
                  {selectedMoodEntry.label} • {selectedMoodEntry.percent}%
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${selectedMoodEntry.percent}%`,
                      backgroundColor: selectedMoodEntry.color,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Timeline de progression par jour (7 derniers jours) */}
          <View style={[styles.timelineSection, isDark && { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View style={styles.timelineHeader}>
              <TrendingUp size={15} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={[styles.timelineTitle, isDark && { color: colors.text }]}>Progression par jour</Text>
              {weeklyAverage !== null && (
                <Text style={styles.weeklyAverageText}>
                  Moyenne : <Text style={{ fontWeight: '700', color: '#00A651' }}>{weeklyAverage}%</Text>
                </Text>
              )}
            </View>

            <View style={styles.timelineChartRow}>
              {last7Days.map((day: any) => {
                const hasEntry = !!day.entry;
                const fillPercent = day.entry?.percent || 0;
                const barColor = day.entry?.color || '#cbd5e1';

                return (
                  <View
                    key={day.key}
                    style={[
                      styles.timelineCol,
                      day.isToday && styles.timelineColToday,
                    ]}
                  >
                    {/* Émoji du jour */}
                    <Text style={styles.timelineEmoji}>
                      {day.entry?.emoji || '·'}
                    </Text>

                    {/* Barre verticale */}
                    <View style={styles.vBarTrack}>
                      {hasEntry ? (
                        <View
                          style={[
                            styles.vBarFill,
                            {
                              height: `${fillPercent}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      ) : (
                        <View style={styles.vBarEmpty} />
                      )}
                    </View>

                    {/* Pourcentage */}
                    <Text
                      style={[
                        styles.colPercentText,
                        day.isToday && { color: barColor, fontWeight: '700' },
                      ]}
                    >
                      {hasEntry ? `${fillPercent}%` : '-'}
                    </Text>

                    {/* Nom du jour */}
                    <Text
                      style={[
                        styles.timelineDayText,
                        isDark && { color: colors.textSecondary },
                        day.isToday && styles.timelineDayTextToday,
                      ]}
                    >
                      {day.dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* 3. Prochain Rendez-vous Médical */}
        <View style={styles.sectionHeaderRow}>
          <Calendar size={18} color="#00A651" />
          <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Prochain rendez-vous</Text>
          <TouchableOpacity
            onPress={() => router.push('/(patient)/appointments')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {nextAppointment ? (
          <View style={[styles.appointmentCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.appointmentHeader}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorInitials}>
                  {nextAppointment.professional?.substring(0, 2).toUpperCase() || 'DR'}
                </Text>
              </View>
              <View style={styles.doctorMeta}>
                <Text style={[styles.doctorName, isDark && { color: colors.text }]}>{nextAppointment.professional || 'Spécialiste de santé'}</Text>
                <Text style={[styles.doctorSpecialty, isDark && { color: colors.textSecondary }]}>{nextAppointment.specialty || 'Santé mentale'}</Text>
              </View>
              <View style={styles.badgeConfirmed}>
                <CheckCircle2 size={12} color="#00A651" style={{ marginRight: 4 }} />
                <Text style={styles.badgeConfirmedText}>Confirmé</Text>
              </View>
            </View>

            <View style={styles.appointmentDetailsRow}>
              <View style={styles.detailItem}>
                <Calendar size={14} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={[styles.detailText, isDark && { color: colors.textSecondary }]}>{nextAppointment.date || 'À déterminer'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={14} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={[styles.detailText, isDark && { color: colors.textSecondary }]}>{nextAppointment.time || '10:00'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Video size={14} color="#2563eb" style={{ marginRight: 4 }} />
                <Text style={[styles.detailText, { color: '#2563eb', fontWeight: '600' }]}>
                  {nextAppointment.type === 'in-person' ? 'Présentiel' : 'Téléconsultation'}
                </Text>
              </View>
            </View>

            {nextAppointment.type !== 'in-person' && (
              <TouchableOpacity
                style={styles.joinVideoBtn}
                onPress={() => router.push('/(patient)/teleconsultation')}
                activeOpacity={0.85}
              >
                <Video size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.joinVideoBtnText}>Accéder à la salle d'attente visio</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.noAppointmentCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.noAppTitle, isDark && { color: colors.text }]}>Aucun rendez-vous planifié</Text>
            <Text style={[styles.noAppSub, isDark && { color: colors.textSecondary }]}>
              Consultez les créneaux disponibles pour programmer un échange avec un praticien.
            </Text>
            <TouchableOpacity
              style={styles.bookAppointmentBtn}
              onPress={() => router.push('/(patient)/appointments')}
              activeOpacity={0.85}
            >
              <Calendar size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.bookAppointmentBtnText}>Prendre un rendez-vous</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Raccourcis Rapides (Grille 2x2 propre) */}
        <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 12 }]}>Mes Services de Santé</Text>
        <View style={styles.shortcutsGrid}>
          {/* Raccourci 1 : Téléconsultation */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(patient)/teleconsultation')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Video size={20} color="#2563eb" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Téléconsultation</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Séance vidéo confidentielle</Text>
          </TouchableOpacity>

          {/* Raccourci 2 : Évaluations */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(patient)/evaluations')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <ClipboardList size={20} color="#00A651" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Mes Évaluations</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Questionnaires & suivi bien-être</Text>
          </TouchableOpacity>

          {/* Raccourci 3 : Mon Dossier */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(patient)/dossier')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#fef3c7' }]}>
              <FileText size={20} color="#d97706" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Mon Dossier</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Historique & fiches médicales</Text>
          </TouchableOpacity>

          {/* Raccourci 4 : Annuaire Centres */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(patient)/directory')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#f3e8ff' }]}>
              <Building2 size={20} color="#7c3aed" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Centres & Soins</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Annuaire des structures TILA</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Évaluations & Dépistages récents */}
        <View style={[styles.sectionCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Sparkles size={18} color="#00A651" />
            <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Mes Dernières Évaluations</Text>
            <TouchableOpacity
              onPress={() => router.push('/(patient)/evaluations')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Historique</Text>
            </TouchableOpacity>
          </View>

          {safeAssessments.length === 0 ? (
            <Text style={[styles.emptyAssessmentsText, isDark && { color: colors.textSecondary }]}>
              Vous n'avez pas encore réalisé d'évaluation clinique.
            </Text>
          ) : (
            <View style={styles.assessmentsList}>
              {safeAssessments.slice(0, 3).map((assessment, i) => (
                <View key={assessment.id || i} style={[styles.assessmentItem, isDark && { borderBottomColor: colors.border }]}>
                  <View style={styles.assessmentLeft}>
                    <Text style={[styles.assessmentType, isDark && { color: colors.text }]}>
                      {assessment.type || assessment.questionnaireKey || 'Évaluation clinique'}
                    </Text>
                    <Text style={[styles.assessmentDate, isDark && { color: colors.textSecondary }]}>{assessment.date || 'Récemment'}</Text>
                  </View>
                  <View style={styles.assessmentRight}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>
                        {assessment.level || 'Modéré'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  greetingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  greetingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgePatient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePatientText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  greetingTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  greetingSubtitle: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  moodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  moodCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  moodCardSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  modifiableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modifiableBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  moodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10.5,
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
    textAlign: 'center',
  },
  todayProgressContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  todayProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  todayProgressTitle: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  todayProgressPercent: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  timelineSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    flex: 1,
  },
  weeklyAverageText: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  timelineChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    paddingTop: 8,
  },
  timelineCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  timelineColToday: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  timelineEmoji: {
    fontSize: 13,
    marginBottom: 4,
  },
  vBarTrack: {
    width: 8,
    height: 54,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 5,
  },
  vBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  vBarEmpty: {
    width: '100%',
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  colPercentText: {
    fontSize: 9.5,
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 2,
  },
  timelineDayText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  timelineDayTextToday: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    flex: 1,
  },
  seeAllText: {
    fontSize: 12.5,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  doctorInitials: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  doctorMeta: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  badgeConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeConfirmedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00A651',
    fontFamily: 'Montserrat_600SemiBold',
  },
  appointmentDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#334155',
    fontFamily: 'Montserrat_500Medium',
  },
  joinVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
  },
  joinVideoBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  noAppointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  noAppTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  noAppSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  bookAppointmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bookAppointmentBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  shortcutCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  shortcutTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  shortcutSub: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyAssessmentsText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  assessmentsList: {
    gap: 8,
    marginTop: 4,
  },
  assessmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  assessmentLeft: {
    flex: 1,
    marginRight: 8,
  },
  assessmentType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  assessmentDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  assessmentRight: {
    alignItems: 'flex-end',
  },
  levelBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    fontFamily: 'Montserrat_700Bold',
  },
});
