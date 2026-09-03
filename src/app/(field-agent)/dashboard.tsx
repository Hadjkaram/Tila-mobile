import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  AlertTriangle,
  FileCheck2,
  Brain,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
  ShieldAlert,
  Sparkles,
  ClipboardList,
  WifiOff,
  CloudOff,
  Database,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { agentService, AgentMigrantsDashboard } from '../../services/agent';
import { syncService } from '../../services/syncService';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';

type PeriodPreset = 'today' | 'last_7_days' | 'this_month';

const PERIOD_OPTIONS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'last_7_days', label: '7 derniers jours' },
  { key: 'this_month', label: 'Ce mois' },
];

const AGE_BUCKET_ORDER = ['0_5', '6_11', '12_17', '18_35', '36_plus'];
const AGE_LABELS: Record<string, string> = {
  '0_5': '0 - 5 ans',
  '6_11': '6 - 11 ans',
  '12_17': '12 - 17 ans',
  '18_35': '18 - 35 ans',
  '36_plus': '36 ans et +',
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getRangeForPreset(preset: PeriodPreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const todayStr = toIsoDate(now);
  if (preset === 'today') {
    return { dateFrom: todayStr, dateTo: todayStr };
  }
  if (preset === 'last_7_days') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { dateFrom: toIsoDate(d), dateTo: todayStr };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: toIsoDate(first), dateTo: todayStr };
}

export default function FieldAgentDashboard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('today');
  const [agentName, setAgentName] = useState<string>('Agent');

  // Offline Persistence States
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineDashboard, setOfflineDashboard] = useState<AgentMigrantsDashboard | null>(null);
  const [offlineSubmissions, setOfflineSubmissions] = useState<any[]>([]);
  const [offlineQueueAssessments, setOfflineQueueAssessments] = useState<any[]>([]);

  // Load agent info
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          const parsed = JSON.parse(stored);
          const name = [parsed.firstName, parsed.lastName].filter(Boolean).join(' ').trim();
          if (name) setAgentName(name);
          else if (parsed.email) setAgentName(parsed.email);
        }
      } catch {}
    };
    loadUser();
  }, []);

  // Load offline dashboard & queue whenever preset changes or on mount
  useEffect(() => {
    let isMounted = true;
    const loadOffline = async () => {
      try {
        const online = await syncService.checkConnectivity();
        if (isMounted) setIsOnline(online);

        const cachedDashStr = await AsyncStorage.getItem(`@offline_migrant_dashboard_${selectedPreset}`);
        if (cachedDashStr && isMounted) {
          try {
            setOfflineDashboard(JSON.parse(cachedDashStr));
          } catch {}
        }

        const cachedSubsStr = await AsyncStorage.getItem('@offline_migrant_submissions');
        if (cachedSubsStr && isMounted) {
          try {
            setOfflineSubmissions(JSON.parse(cachedSubsStr));
          } catch {}
        }

        const queue = await syncService.getQueue();
        const pending = queue.filter((item) => item.type === 'SUBMIT_ASSESSMENT');
        if (isMounted) {
          setOfflineQueueAssessments(pending);
        }
      } catch (e) {
        console.warn('[Dashboard] Erreur chargement persistance offline:', e);
      }
    };

    loadOffline();
    const interval = setInterval(loadOffline, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedPreset]);

  const dateRange = useMemo(() => getRangeForPreset(selectedPreset), [selectedPreset]);

  // Query Dashboard Stats
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard,
    isRefetching: isDashboardRefetching,
  } = useQuery<AgentMigrantsDashboard>({
    queryKey: ['agent-terrain-migrant-dashboard', dateRange],
    queryFn: () => agentService.getMigrantsDashboard(dateRange),
  });

  // Save successful dashboard to persistent cache
  useEffect(() => {
    if (dashboard) {
      AsyncStorage.setItem(`@offline_migrant_dashboard_${selectedPreset}`, JSON.stringify(dashboard)).catch(() => {});
    }
  }, [dashboard, selectedPreset]);

  // Query Recent Submissions
  const {
    data: submissionsData,
    isLoading: isSubmissionsLoading,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: ['agent-terrain-migrant-submissions', 5],
    queryFn: () => agentService.getSubmissions({ limit: 5 }),
  });

  // Save successful submissions to persistent cache
  useEffect(() => {
    if (submissionsData?.items && Array.isArray(submissionsData.items)) {
      AsyncStorage.setItem('@offline_migrant_submissions', JSON.stringify(submissionsData.items)).catch(() => {});
    }
  }, [submissionsData]);

  const handleRefresh = async () => {
    const online = await syncService.checkConnectivity();
    setIsOnline(online);
    if (online) {
      await Promise.allSettled([refetchDashboard(), refetchSubmissions()]);
    }
  };

  const todayFormatted = useMemo(() => {
    try {
      const formatted = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return '';
    }
  }, []);

  // Effective dashboard data: server data or guaranteed offline persistent cache
  const effectiveDashboard = dashboard || offlineDashboard;

  // Integrate offline pending queue into stats
  const pendingOfflineCount = offlineQueueAssessments.length;

  const baseStats = effectiveDashboard?.stats || {
    personnesEvaluees: 0,
    enfantsEvalues: 0,
    adultesAdosEvalues: 0,
    fichesCompletes: 0,
    fichesCompletesPct: 0,
    casAOrienterEnPriorite: 0,
    trendVsHier: 0,
  };

  const stats = {
    ...baseStats,
    personnesEvaluees: baseStats.personnesEvaluees + pendingOfflineCount,
    fichesCompletes: baseStats.fichesCompletes + pendingOfflineCount,
  };

  const alertes = effectiveDashboard?.alertes || {
    tspt: 0,
    ideationSuicidaire: 0,
    symptomePsychotique: 0,
    sdqAnormal: 0,
    fichesIncompletes: 0,
  };

  // Sexe breakdown (Femmes, Hommes, Autre)
  const sexeStats = useMemo(() => {
    if (!effectiveDashboard?.repartitionSexe) return [];
    const raw = effectiveDashboard.repartitionSexe;
    const total = (raw.homme || 0) + (raw.femme || 0) + (raw.autre || 0);
    return [
      { key: 'femme', label: 'Femmes / Filles', count: raw.femme || 0, color: '#10b981', pct: total > 0 ? Math.round(((raw.femme || 0) / total) * 100) : 0 },
      { key: 'homme', label: 'Hommes / Garçons', count: raw.homme || 0, color: '#7c3aed', pct: total > 0 ? Math.round(((raw.homme || 0) / total) * 100) : 0 },
      { key: 'autre', label: 'Autre', count: raw.autre || 0, color: '#94a3b8', pct: total > 0 ? Math.round(((raw.autre || 0) / total) * 100) : 0 },
    ];
  }, [effectiveDashboard?.repartitionSexe]);

  // Age breakdown
  const ageStats = useMemo(() => {
    if (!effectiveDashboard?.repartitionAge) return [];
    const raw = effectiveDashboard.repartitionAge;
    const total = Object.values(raw).reduce((sum, n) => sum + (n || 0), 0);
    return AGE_BUCKET_ORDER.map((bucket) => {
      const count = raw[bucket] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { bucket, count, pct };
    });
  }, [effectiveDashboard?.repartitionAge]);

  // Merge pending offline queue with submissions
  const submissions = useMemo(() => {
    const pendingMapped = offlineQueueAssessments.map((item) => ({
      id: `offline_${item.id}`,
      patientName: item.payload?.patientName || 'Migrant évalué (local)',
      questionnaireTitle: item.payload?.questionnaireTitle || 'PCL-5 TERRAIN',
      questionnaireKey: item.payload?.questionnaireKey,
      centre: item.payload?.centre || 'Site d’intervention',
      createdAt: item.createdAt || new Date().toISOString(),
      completed: true,
      isOfflinePending: true,
    }));

    const serverList = submissionsData?.items || offlineSubmissions || [];
    return [...pendingMapped, ...serverList].slice(0, 5);
  }, [offlineQueueAssessments, submissionsData?.items, offlineSubmissions]);

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isDashboardRefetching} onRefresh={handleRefresh} tintColor="#00A651" />
        }
      >
        {/* 1. En-tête dynamique */}
        <View style={[styles.headerCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={styles.badgeRole}>
              <View style={styles.rolePulse} />
              <Text style={styles.badgeRoleText}>Agent de Terrain Migrant</Text>
            </View>
            <Text style={[styles.dateText, isDark && { color: colors.textSecondary }]}>{todayFormatted}</Text>
          </View>
          <Text style={[styles.greetingText, isDark && { color: colors.text }]}>Bonjour, {agentName} 👋</Text>
          <Text style={[styles.subtitleText, isDark && { color: colors.textSecondary }]}>
            Suivi des dépistages et orientations des populations migrantes et déplacées.
          </Text>

          {/* Action Rapide Principale */}
          <TouchableOpacity
            style={styles.primaryCtaBtn}
            onPress={() => router.push('/(field-agent)/assessments')}
            activeOpacity={0.85}
          >
            <Plus size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryCtaBtnText}>Nouvelle évaluation terrain</Text>
            <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Bannière Mode Hors-Ligne & Persistance Locale */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={16} color="#b45309" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineBannerTitle}>Mode Hors-Ligne Actif</Text>
              <Text style={styles.offlineBannerSub}>
                Toutes les métriques, alertes et graphiques ci-dessous proviennent du cache persistant local.
              </Text>
            </View>
            {pendingOfflineCount > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{pendingOfflineCount} en attente</Text>
              </View>
            )}
          </View>
        )}

        {/* 2. Filtres temporels rapides (Pills horizontaux) */}
        <View style={styles.filtersSection}>
          <Text style={[styles.sectionMiniTitle, isDark && { color: colors.textSecondary }]}>Période analysée</Text>
          <View style={styles.pillsRow}>
            {PERIOD_OPTIONS.map((opt) => {
              const isSelected = selectedPreset === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.pill, isDark && { backgroundColor: colors.card, borderColor: colors.border }, isSelected && styles.pillSelected]}
                  onPress={() => setSelectedPreset(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isDark && { color: colors.textSecondary }, isSelected && styles.pillTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. 4 Cartes KPI clés (Grille 2x2 propre sans débordement) */}
        <View style={styles.kpiGrid}>
          {/* KPI 1 : Personnes Évaluées */}
          <View style={[styles.kpiCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#ecfdf5' }]}>
              <Users size={18} color="#00A651" />
            </View>
            <Text style={[styles.kpiValue, isDark && { color: colors.text }]}>{stats.personnesEvaluees}</Text>
            <Text style={[styles.kpiLabel, isDark && { color: colors.textSecondary }]}>Personnes évaluées</Text>
            <View style={styles.trendRow}>
              <TrendingUp size={12} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={styles.trendText}>
                {stats.trendVsHier >= 0 ? `+${stats.trendVsHier}` : `${stats.trendVsHier}`} vs hier
              </Text>
            </View>
          </View>

          {/* KPI 2 : Enfants / Adultes-Ados */}
          <View style={[styles.kpiCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#eff6ff' }]}>
              <Brain size={18} color="#3b82f6" />
            </View>
            <Text style={[styles.kpiValue, isDark && { color: colors.text }]}>
              {stats.enfantsEvalues} / {stats.adultesAdosEvalues}
            </Text>
            <Text style={[styles.kpiLabel, isDark && { color: colors.textSecondary }]}>Enfants / Adultes</Text>
            <Text style={[styles.kpiSubdetail, isDark && { color: colors.textSecondary }]}>SDQ · PCL-5 · PHQ-9</Text>
          </View>

          {/* KPI 3 : Fiches Complètes */}
          <View style={[styles.kpiCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#fef3c7' }]}>
              <FileCheck2 size={18} color="#d97706" />
            </View>
            <Text style={[styles.kpiValue, isDark && { color: colors.text }]}>
              {stats.fichesCompletes} / {stats.personnesEvaluees}
            </Text>
            <Text style={[styles.kpiLabel, isDark && { color: colors.textSecondary }]}>Fiches complètes</Text>
            <Text style={[styles.kpiSubdetail, alertes.fichesIncompletes > 0 ? styles.textWarning : styles.textSuccess]}>
              {alertes.fichesIncompletes > 0
                ? `${alertes.fichesIncompletes} à compléter`
                : '100% complètes'}
            </Text>
          </View>

          {/* KPI 4 : Cas Prioritaires */}
          <View style={[styles.kpiCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }, styles.kpiCardAlert]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#fee2e2' }]}>
              <AlertTriangle size={18} color="#dc2626" />
            </View>
            <Text style={[styles.kpiValue, { color: '#dc2626' }]}>
              {stats.casAOrienterEnPriorite}
            </Text>
            <Text style={[styles.kpiLabel, { color: '#991b1b' }]}>Cas à orienter en priorité</Text>
            <Text style={styles.kpiAlertSub}>
              {alertes.ideationSuicidaire > 0
                ? `⚠️ ${alertes.ideationSuicidaire} idéation(s) suicidaire(s)`
                : 'Aucune idéation détectée'}
            </Text>
          </View>
        </View>

        {/* 4. Alertes Cliniques Prioritaires */}
        <View style={[styles.sectionCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <ShieldAlert size={18} color="#dc2626" />
            <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Alertes cliniques prioritaires</Text>
          </View>
          <Text style={[styles.sectionSubtitle, isDark && { color: colors.textSecondary }]}>
            Situations nécessitant une orientation médicale ou psychologique d'urgence.
          </Text>

          <View style={styles.alertsGrid}>
            <View style={[styles.alertBadge, alertes.ideationSuicidaire > 0 && styles.alertBadgeDanger]}>
              <Text style={[styles.alertCount, alertes.ideationSuicidaire > 0 && styles.textDanger]}>
                {alertes.ideationSuicidaire}
              </Text>
              <Text style={styles.alertLabel}>Idéation suicidaire</Text>
            </View>

            <View style={[styles.alertBadge, alertes.tspt > 0 && styles.alertBadgeWarning]}>
              <Text style={[styles.alertCount, alertes.tspt > 0 && styles.textWarning]}>
                {alertes.tspt}
              </Text>
              <Text style={styles.alertLabel}>Risque TSPT aigu</Text>
            </View>

            <View style={[styles.alertBadge, alertes.symptomePsychotique > 0 && styles.alertBadgeWarning]}>
              <Text style={[styles.alertCount, alertes.symptomePsychotique > 0 && styles.textWarning]}>
                {alertes.symptomePsychotique}
              </Text>
              <Text style={styles.alertLabel}>Symptômes psychotiques</Text>
            </View>

            <View style={[styles.alertBadge, alertes.sdqAnormal > 0 && styles.alertBadgeInfo]}>
              <Text style={[styles.alertCount, alertes.sdqAnormal > 0 && styles.textInfo]}>
                {alertes.sdqAnormal}
              </Text>
              <Text style={styles.alertLabel}>SDQ Enfant anormal</Text>
            </View>
          </View>
        </View>

        {/* 5. Répartitions Démographiques (Sexe & Tranches d'âge) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Sparkles size={18} color="#00A651" />
            <Text style={styles.sectionTitle}>Répartition de la population évaluée</Text>
          </View>

          {/* Répartition Sexe */}
          <Text style={styles.subCategoryTitle}>Par sexe</Text>
          {sexeStats.length === 0 ? (
            <Text style={styles.emptyText}>Aucune donnée démographique sur cette période.</Text>
          ) : (
            <View style={styles.progressBlock}>
              {sexeStats.map((item) => (
                <View key={item.key} style={styles.progressRow}>
                  <View style={styles.progressLabelCol}>
                    <Text style={styles.progressLabel}>{item.label}</Text>
                    <Text style={styles.progressCount}>{item.count} pers. ({item.pct}%)</Text>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${item.pct}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Répartition Âge */}
          <Text style={styles.subCategoryTitle}>Par tranches d'âge</Text>
          {ageStats.length === 0 ? (
            <Text style={styles.emptyText}>Aucune donnée d'âge sur cette période.</Text>
          ) : (
            <View style={styles.progressBlock}>
              {ageStats.map((item) => (
                <View key={item.bucket} style={styles.progressRow}>
                  <View style={styles.progressLabelCol}>
                    <Text style={styles.progressLabel}>{AGE_LABELS[item.bucket] || item.bucket}</Text>
                    <Text style={styles.progressCount}>{item.count} pers. ({item.pct}%)</Text>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${item.pct}%`, backgroundColor: '#00A651' },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 6. Section Évaluations Récentes */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Clock size={18} color="#00A651" />
            <Text style={styles.sectionTitle}>Dernières évaluations terrain</Text>
          </View>

          {isSubmissionsLoading && !effectiveDashboard ? (
            <ActivityIndicator size="small" color="#00A651" style={{ marginVertical: 20 }} />
          ) : submissions.length === 0 ? (
            <Text style={styles.emptyText}>Aucune évaluation enregistrée sur cette période.</Text>
          ) : (
            <View style={styles.submissionsList}>
              {submissions.map((sub: any) => {
                let formattedDate = sub.createdAt;
                try {
                  formattedDate = format(parseISO(sub.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr });
                } catch {}

                return (
                  <View key={sub.id} style={styles.submissionItem}>
                    <View style={styles.submissionLeft}>
                      <Text style={styles.subPatientName}>{sub.patientName || 'Migrant évalué'}</Text>
                      <Text style={styles.subToolTitle}>{sub.questionnaireTitle || sub.questionnaireKey}</Text>
                      <Text style={styles.subDateText}>{formattedDate}</Text>
                    </View>
                    <View style={styles.submissionRight}>
                      {sub.isOfflinePending ? (
                        <View style={[styles.statusPill, styles.statusPillOffline]}>
                          <Text style={styles.textOffline}>⚡ En attente</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusPill, sub.completed ? styles.statusPillDone : styles.statusPillPending]}>
                          <Text style={[styles.statusPillText, sub.completed ? styles.textSuccess : styles.textWarning]}>
                            {sub.completed ? 'Terminé' : 'En cours'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/(field-agent)/assessments')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllBtnText}>Voir toutes les évaluations</Text>
            <ChevronRight size={16} color="#00A651" />
          </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeRole: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rolePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00A651',
    marginRight: 6,
  },
  badgeRoleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00A651',
    fontFamily: 'Montserrat_600SemiBold',
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  subtitleText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryCtaBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  offlineBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    fontFamily: 'Montserrat_700Bold',
  },
  offlineBannerSub: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  queueBadge: {
    backgroundColor: '#ea580c',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  queueBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  filtersSection: {
    marginBottom: 14,
  },
  sectionMiniTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Montserrat_600SemiBold',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pillSelected: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  pillText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  pillTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiCardAlert: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  kpiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  trendText: {
    fontSize: 11,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  kpiSubdetail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    fontFamily: 'Montserrat_400Regular',
  },
  kpiAlertSub: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 6,
    fontFamily: 'Montserrat_600SemiBold',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  alertsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertBadge: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  alertBadgeDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  alertBadgeWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  alertBadgeInfo: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  alertCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  alertLabel: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  subCategoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
    fontFamily: 'Montserrat_600SemiBold',
  },
  progressBlock: {
    gap: 10,
  },
  progressRow: {
    gap: 4,
  },
  progressLabelCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: '#334155',
    fontFamily: 'Montserrat_500Medium',
  },
  progressCount: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  submissionsList: {
    gap: 2,
  },
  submissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  submissionLeft: {
    flex: 1,
    marginRight: 10,
  },
  subPatientName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  subToolTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  subDateText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  submissionRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillDone: {
    backgroundColor: '#ecfdf5',
  },
  statusPillPending: {
    backgroundColor: '#fef3c7',
  },
  statusPillOffline: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  seeAllBtnText: {
    fontSize: 13,
    color: '#00A651',
    fontWeight: '600',
    marginRight: 4,
    fontFamily: 'Montserrat_600SemiBold',
  },
  emptyText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  textSuccess: {
    color: '#00A651',
  },
  textWarning: {
    color: '#d97706',
  },
  textDanger: {
    color: '#dc2626',
  },
  textInfo: {
    color: '#2563eb',
  },
  textOffline: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
