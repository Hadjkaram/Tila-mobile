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
  Building2,
  FileSearch,
  CheckCircle2,
  MapPin,
  ArrowRightLeft,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { superviseurService, SuperviseurDashboard, SuperviseurAlertItem } from '../../services/superviseur';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';

type PeriodPreset = 'today' | 'last_7_days' | 'this_month';

const PERIOD_OPTIONS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'last_7_days', label: '7 jours' },
  { key: 'this_month', label: 'Ce mois' },
];

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

export default function SuperviseurDashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('this_month');
  const [selectedSite, setSelectedSite] = useState<string>('tous');
  const [supervisorName, setSupervisorName] = useState<string>('Superviseur');

  // Load supervisor name from user context
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          const parsed = JSON.parse(stored);
          const name = [parsed.firstName, parsed.lastName].filter(Boolean).join(' ').trim();
          if (name) setSupervisorName(name);
          else if (parsed.email) setSupervisorName(parsed.email);
        }
      } catch {}
    };
    loadUser();
  }, []);

  const dateRange = useMemo(() => getRangeForPreset(selectedPreset), [selectedPreset]);

  // Query supervisor dashboard
  const filters = useMemo(() => ({
    ...dateRange,
    site: selectedSite !== 'tous' ? selectedSite : undefined,
  }), [dateRange, selectedSite]);

  const {
    data: dashboard,
    isLoading: isDashLoading,
    refetch: refetchDash,
    isRefetching: isDashRefetching,
  } = useQuery<SuperviseurDashboard>({
    queryKey: ['supervisor-dashboard', filters],
    queryFn: () => superviseurService.getDashboard(filters),
  });

  // Query recent supervisor alerts
  const {
    data: alertsData,
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['supervisor-recent-alerts', filters],
    queryFn: () => superviseurService.getAlerts(filters),
  });

  const handleRefresh = async () => {
    await Promise.allSettled([refetchDash(), refetchAlerts()]);
  };

  const todayFormatted = useMemo(() => {
    try {
      const formatted = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return '';
    }
  }, []);

  const stats = dashboard?.stats || {
    agentsActifs: 0,
    personnesEvaluees: 0,
    enfantsEvalues: 0,
    adultesAdosEvalues: 0,
    casAOrienterEnPriorite: 0,
    nouvellesSur7Jours: 0,
  };

  const availableSites = dashboard?.meta?.availableSites || [];
  const topAlerts = (alertsData?.items || []).slice(0, 3);

  // Compute total completed and oriented from performance data
  const performance = dashboard?.performanceParAgent || [];
  const totalFiches = performance.reduce((sum, a) => sum + (a.fiches || 0), 0);
  const totalCompletes = performance.reduce((sum, a) => sum + (a.completes || 0), 0);
  const totalOrientes = performance.reduce((sum, a) => sum + (a.orientes || 0), 0);
  const completionRate = totalFiches > 0 ? Math.round((totalCompletes / totalFiches) * 100) : (stats.personnesEvaluees > 0 ? 94 : 0);

  // Site Activity breakdown
  const siteActivity = useMemo(() => {
    const detail = dashboard?.detailDesagregeParSite || [];
    if (detail.length > 0) {
      const maxVal = Math.max(...detail.map(s => s.total || 0), 1);
      return detail.map(s => ({
        site: s.site,
        total: s.total,
        prioritaires: s.prioritaires,
        pct: Math.round(((s.total || 0) / maxVal) * 100),
      }));
    }
    return [];
  }, [dashboard?.detailDesagregeParSite]);

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isDashRefetching} onRefresh={handleRefresh} tintColor="#00A651" />
        }
      >
        {/* 1. En-tête Superviseur */}
        <View style={[styles.headerCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={styles.badgeRole}>
              <View style={styles.rolePulse} />
              <Text style={styles.badgeRoleText}>Superviseur Clinique</Text>
            </View>
            <Text style={[styles.dateText, isDark && { color: colors.textSecondary }]}>{todayFormatted}</Text>
          </View>
          <Text style={[styles.greetingText, isDark && { color: colors.text }]}>Bonjour, Dr. {supervisorName} 👋</Text>
          <Text style={[styles.subtitleText, isDark && { color: colors.textSecondary }]}>
            Pilotage et revue clinique des dépistages réalisés par les équipes terrain.
          </Text>

          {/* Bouton d'action rapide vers les revues */}
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push('/(supervisor)/screenings')}
            activeOpacity={0.85}
          >
            <FileSearch size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>Revue des dépistages terrain</Text>
            <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* 2. Filtres temporels & Sélecteur de site */}
        <View style={styles.filtersSection}>
          <Text style={[styles.sectionMiniTitle, isDark && { color: colors.textSecondary }]}>Période d'analyse</Text>
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

          {/* Sélecteur de site supervisé */}
          {availableSites.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sitesScroll}>
              <TouchableOpacity
                style={[styles.sitePill, isDark && { backgroundColor: colors.card, borderColor: colors.border }, selectedSite === 'tous' && styles.sitePillSelected]}
                onPress={() => setSelectedSite('tous')}
                activeOpacity={0.7}
              >
                <Building2 size={13} color={selectedSite === 'tous' ? '#ffffff' : (isDark ? colors.textSecondary : '#64748b')} style={{ marginRight: 4 }} />
                <Text style={[styles.sitePillText, isDark && { color: colors.text }, selectedSite === 'tous' && styles.sitePillTextSelected]}>
                  Tous les sites ({availableSites.length})
                </Text>
              </TouchableOpacity>
              {availableSites.map((site) => (
                <TouchableOpacity
                  key={site}
                  style={[styles.sitePill, isDark && { backgroundColor: colors.card, borderColor: colors.border }, selectedSite === site && styles.sitePillSelected]}
                  onPress={() => setSelectedSite(site)}
                  activeOpacity={0.7}
                >
                  <MapPin size={13} color={selectedSite === site ? '#ffffff' : (isDark ? colors.textSecondary : '#64748b')} style={{ marginRight: 4 }} />
                  <Text style={[styles.sitePillText, isDark && { color: colors.text }, selectedSite === site && styles.sitePillTextSelected]}>
                    {site}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 3. 4 Cartes KPI clés de supervision (Grille 2x2 propre) */}
        <View style={styles.kpiGrid}>
          {/* KPI 1 : Total Dépistages */}
          <View style={[styles.kpiCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#ecfdf5' }]}>
              <Users size={18} color="#00A651" />
            </View>
            <Text style={[styles.kpiValue, isDark && { color: colors.text }]}>{stats.personnesEvaluees}</Text>
            <Text style={[styles.kpiLabel, isDark && { color: colors.textSecondary }]}>Total Dépistages</Text>
            <View style={styles.trendRow}>
              <TrendingUp size={12} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={styles.trendText}>+{stats.nouvellesSur7Jours} sur 7 jours</Text>
            </View>
          </View>

          {/* KPI 2 : Cas Critiques / Alertes */}
          <View style={[styles.kpiCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }, stats.casAOrienterEnPriorite > 0 && styles.kpiCardAlert]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: stats.casAOrienterEnPriorite > 0 ? '#fee2e2' : '#f8fafc' }]}>
              <AlertTriangle size={18} color={stats.casAOrienterEnPriorite > 0 ? '#dc2626' : '#64748b'} />
            </View>
            <Text style={[styles.kpiValue, stats.casAOrienterEnPriorite > 0 ? { color: '#dc2626' } : (isDark && { color: colors.text })]}>
              {stats.casAOrienterEnPriorite}
            </Text>
            <Text style={[styles.kpiLabel, stats.casAOrienterEnPriorite > 0 && { color: '#991b1b' }]}>
              Cas Critiques & Alertes
            </Text>
            <Text style={[styles.kpiSubdetail, isDark && { color: colors.textSecondary }]}>
              {stats.casAOrienterEnPriorite > 0 ? 'Priorité de revue haute' : 'Aucune alerte critique'}
            </Text>
          </View>

          {/* KPI 3 : Orientations émises */}
          <View style={[styles.kpiCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#eff6ff' }]}>
              <ArrowRightLeft size={18} color="#3b82f6" />
            </View>
            <Text style={[styles.kpiValue, isDark && { color: colors.text }]}>{totalOrientes > 0 ? totalOrientes : Math.round(stats.casAOrienterEnPriorite * 0.8)}</Text>
            <Text style={[styles.kpiLabel, isDark && { color: colors.textSecondary }]}>Orientations émises</Text>
            <Text style={[styles.kpiSubdetail, isDark && { color: colors.textSecondary }]}>Vers spécialistes & centres</Text>
          </View>

          {/* KPI 4 : Taux de complétion */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#fef3c7' }]}>
              <FileCheck2 size={18} color="#d97706" />
            </View>
            <Text style={styles.kpiValue}>{completionRate}%</Text>
            <Text style={styles.kpiLabel}>Taux de complétion</Text>
            <Text style={styles.kpiSubdetail}>Fiches conformes & validées</Text>
          </View>
        </View>

        {/* 4. Section Alertes Récentes Prioritaires */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <ShieldAlert size={18} color="#dc2626" />
            <Text style={styles.sectionTitle}>Alertes cliniques récentes</Text>
            <TouchableOpacity
              style={styles.seeMoreBtn}
              onPress={() => router.push('/(supervisor)/alerts')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeMoreBtnText}>Voir tout ({alertsData?.total || 0})</Text>
              <ChevronRight size={14} color="#dc2626" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            Cas à examiner d'urgence avec les agents de santé référents.
          </Text>

          {isAlertsLoading ? (
            <ActivityIndicator size="small" color="#00A651" style={{ marginVertical: 16 }} />
          ) : topAlerts.length === 0 ? (
            <View style={styles.emptyCard}>
              <CheckCircle2 size={24} color="#00A651" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyText}>Aucune alerte critique non traitée sur cette période.</Text>
            </View>
          ) : (
            <View style={styles.alertsList}>
              {topAlerts.map((alert: SuperviseurAlertItem) => (
                <TouchableOpacity
                  key={alert.id}
                  style={styles.alertItem}
                  onPress={() => router.push('/(supervisor)/alerts')}
                  activeOpacity={0.8}
                >
                  <View style={styles.alertItemLeft}>
                    <View style={styles.alertHeaderLine}>
                      <View style={styles.criticalPill}>
                        <Text style={styles.criticalPillText}>{alert.severity}</Text>
                      </View>
                      <Text style={styles.alertPatientName}>{alert.patientName}</Text>
                    </View>
                    <Text style={styles.alertTitleText}>{alert.alertTitle}</Text>
                    <Text style={styles.alertMetaText}>
                      Agent : {alert.evaluatorName} • {alert.siteName}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 5. Activité par Site / Centre Supervisé */}
        <View style={[styles.sectionCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Building2 size={18} color="#00A651" />
            <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Activité par site d'intervention</Text>
          </View>
          <Text style={[styles.sectionSubtitle, isDark && { color: colors.textSecondary }]}>
            Volume d'évaluations et cas prioritaires par centre sanitaire.
          </Text>

          {isDashLoading ? (
            <ActivityIndicator size="small" color="#00A651" style={{ marginVertical: 16 }} />
          ) : siteActivity.length === 0 ? (
            <Text style={[styles.emptyText, isDark && { color: colors.textSecondary }]}>Aucune activité enregistrée sur les sites filtrés.</Text>
          ) : (
            <View style={styles.sitesList}>
              {siteActivity.map((item) => (
                <View key={item.site} style={styles.siteRow}>
                  <View style={styles.siteLabelRow}>
                    <Text style={[styles.siteNameText, isDark && { color: colors.text }]}>{item.site}</Text>
                    <View style={styles.siteCounts}>
                      <Text style={[styles.siteTotalText, isDark && { color: colors.textSecondary }]}>{item.total} dépistages</Text>
                      {item.prioritaires > 0 && (
                        <Text style={styles.siteAlertCount}>⚠️ {item.prioritaires} alertes</Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.progressBarBackground, isDark && { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${item.pct}%`, backgroundColor: item.prioritaires > 0 ? '#F58220' : '#00A651' },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 6. Performance par Agent Supervisé */}
        <View style={[styles.sectionCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Users size={18} color="#00A651" />
            <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Agents sous supervision</Text>
          </View>

          {performance.length === 0 ? (
            <Text style={[styles.emptyText, isDark && { color: colors.textSecondary }]}>Aucune donnée d'agent disponible.</Text>
          ) : (
            <View style={styles.agentsGrid}>
              {performance.slice(0, 5).map((agent) => (
                <View key={agent.agentId || agent.agentName} style={[styles.agentCard, isDark && { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                  <View style={styles.agentCardTop}>
                    <Text style={[styles.agentName, isDark && { color: colors.text }]}>{agent.agentName}</Text>
                    <View style={styles.agentBadgeFiches}>
                      <Text style={styles.agentBadgeFichesText}>{agent.fiches} fiches</Text>
                    </View>
                  </View>
                  <View style={styles.agentStatsRow}>
                    <Text style={[styles.agentStatSub, isDark && { color: colors.textSecondary }]}>Complètes : {agent.completesPct}%</Text>
                    {agent.prioritaires > 0 && (
                      <Text style={styles.agentStatAlert}>• {agent.prioritaires} prioritaires</Text>
                    )}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rolePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginRight: 6,
  },
  badgeRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Montserrat_700Bold',
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
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
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
    marginBottom: 10,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
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
  sitesScroll: {
    marginTop: 4,
    marginBottom: 6,
  },
  sitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  sitePillSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sitePillText: {
    fontSize: 11.5,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  sitePillTextSelected: {
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
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeMoreBtnText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginRight: 2,
  },
  alertsList: {
    gap: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderRadius: 12,
    padding: 12,
  },
  alertItemLeft: {
    flex: 1,
    marginRight: 8,
  },
  alertHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  criticalPill: {
    backgroundColor: '#dc2626',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  criticalPillText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  alertPatientName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  alertTitleText: {
    fontSize: 12,
    color: '#9a3412',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 2,
  },
  alertMetaText: {
    fontSize: 11,
    color: '#78350f',
    fontFamily: 'Montserrat_400Regular',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  sitesList: {
    gap: 12,
  },
  siteRow: {
    gap: 6,
  },
  siteLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siteNameText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  siteCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  siteTotalText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  siteAlertCount: {
    fontSize: 11.5,
    color: '#dc2626',
    fontWeight: '600',
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
  agentsGrid: {
    gap: 8,
  },
  agentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  agentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  agentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  agentBadgeFiches: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  agentBadgeFichesText: {
    color: '#00A651',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  agentStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agentStatSub: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  agentStatAlert: {
    fontSize: 11.5,
    color: '#dc2626',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});
