import React, { useState, useEffect } from 'react';
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
  Home,
  AlertTriangle,
  CloudCheck,
  CloudOff,
  Plus,
  ChevronRight,
  Sparkles,
  Calendar,
  Building2,
  Phone,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { recensementService } from '../../services/recensement';
import { syncService, SyncStatus } from '../../services/syncService';

type PeriodPreset = 'today' | 'last_7_days' | 'this_month';

const PERIOD_OPTIONS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'last_7_days', label: '7 jours' },
  { key: 'this_month', label: 'Ce mois' },
];

export default function CensusAgentDashboard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodPreset>('this_month');
  const [agentName, setAgentName] = useState('Agent Sensibilisateur');
  const [ongName, setOngName] = useState('ONG Partenaire TILA');

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    queueCount: 0,
    lastSyncSuccess: null,
    lastSyncTime: null,
  });

  useEffect(() => {
    syncService.getStatus().then(setSyncStatus);
    const unsubscribe = syncService.subscribe((s) => setSyncStatus(s));

    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          const parsed = JSON.parse(stored);
          const fullName = [parsed.firstName, parsed.lastName].filter(Boolean).join(' ').trim();
          if (fullName) setAgentName(fullName);
          if (parsed.organisation?.name || parsed.ong?.name) {
            setOngName(parsed.organisation?.name || parsed.ong?.name);
          }
        }
      } catch {}
    };
    loadUser();

    return () => unsubscribe();
  }, []);

  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['census-agent-dashboard'],
    queryFn: () => recensementService.getDashboard(),
  });

  const formattedDate = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={['#00A651']}
            tintColor="#00A651"
          />
        }
      >
        {/* Header Carte Profil */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={[styles.agentGreeting, { color: colors.textSecondary }]}>Bienvenue,</Text>
              <Text style={[styles.agentName, { color: colors.text }]} numberOfLines={1}>
                {agentName}
              </Text>
            </View>
            <View style={styles.roleBadge}>
              <Sparkles size={13} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={styles.roleBadgeText}>AGENT SENSIBILISATEUR</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Building2 size={14} color={colors.textMuted} style={{ marginRight: 5 }} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {ongName}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textMuted} style={{ marginRight: 5 }} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {capitalizedDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Bouton d'action proéminent : Nouveau Recensement Terrain */}
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => router.push('/(census-agent)/form')}
          activeOpacity={0.85}
        >
          <View style={styles.primaryActionIconContainer}>
            <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <View style={styles.primaryActionTextContainer}>
            <Text style={styles.primaryActionTitle}>Nouveau Recensement Terrain</Text>
            <Text style={styles.primaryActionSubtitle}>
              Saisie rapide d’une personne ou d’un ménage (100% Hors-Ligne)
            </Text>
          </View>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Filtres de période rapides */}
        <View style={styles.periodFilterContainer}>
          {PERIOD_OPTIONS.map((period) => {
            const isSelected = selectedPeriod === period.key;
            return (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodTab,
                  {
                    backgroundColor: isSelected ? '#00A651' : colors.card,
                    borderColor: isSelected ? '#00A651' : colors.border,
                  },
                ]}
                onPress={() => setSelectedPeriod(period.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4 Cartes KPI Clés */}
        <View style={styles.kpiGrid}>
          {/* 1. Personnes recensées */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#e8f5e9' }]}>
              <Users size={22} color="#00A651" />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {dashboardData?.totalRecenses ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]} numberOfLines={2}>
              Personnes recensées
            </Text>
            <View style={styles.kpiBadgeGreen}>
              <Text style={styles.kpiBadgeGreenText}>
                +{dashboardData?.todayCount ?? 0} aujourd’hui
              </Text>
            </View>
          </View>

          {/* 2. Ménages touchés */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#eff6ff' }]}>
              <Home size={22} color="#2563eb" />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {dashboardData?.menagesTouches ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]} numberOfLines={2}>
              Ménages touchés
            </Text>
            <Text style={[styles.kpiSubValue, { color: colors.textMuted }]}>Sensibilisés</Text>
          </View>

          {/* 3. Vulnérabilités détectées */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: '#fef3c7' }]}>
              <AlertTriangle size={22} color="#d97706" />
            </View>
            <Text style={[styles.kpiValue, { color: '#d97706' }]}>
              {dashboardData?.vulnerabilitesDetectees ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]} numberOfLines={2}>
              Vulnérabilités
            </Text>
            <Text style={[styles.kpiSubValue, { color: colors.textMuted }]}>Cas priorisés</Text>
          </View>

          {/* 4. En attente de synchronisation */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View
              style={[
                styles.kpiIconWrapper,
                {
                  backgroundColor:
                    syncStatus.queueCount > 0 ? '#fff7ed' : '#ecfdf5',
                },
              ]}
            >
              {syncStatus.queueCount > 0 ? (
                <CloudOff size={22} color="#ea580c" />
              ) : (
                <CloudCheck size={22} color="#00A651" />
              )}
            </View>
            <Text
              style={[
                styles.kpiValue,
                { color: syncStatus.queueCount > 0 ? '#ea580c' : '#00A651' },
              ]}
            >
              {syncStatus.queueCount}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]} numberOfLines={2}>
              En attente synchro
            </Text>
            <View
              style={
                syncStatus.queueCount > 0
                  ? styles.syncBadgeOrange
                  : styles.syncBadgeGreen
              }
            >
              <Text
                style={
                  syncStatus.queueCount > 0
                    ? styles.syncBadgeOrangeText
                    : styles.syncBadgeGreenText
                }
              >
                {syncStatus.queueCount > 0 ? 'Hors-ligne' : 'À jour'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section Dernières fiches soumises */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Dernières fiches soumises
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(census-agent)/census-list')}
            activeOpacity={0.7}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAllText}>Voir tout</Text>
            <ChevronRight size={16} color="#00A651" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#00A651" />
          </View>
        ) : (dashboardData?.recentList && dashboardData.recentList.length > 0) ? (
          <View style={styles.listContainer}>
            {dashboardData.recentList.map((item) => (
              <View
                key={String(item.id)}
                style={[
                  styles.personCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.personHeaderRow}>
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
                      {item.prenom} {item.nom}
                    </Text>
                    <Text style={[styles.personMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.ville || 'Abidjan'} {item.quartier ? `• ${item.quartier}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.synced !== false
                        ? styles.statusPillSynced
                        : styles.statusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.synced !== false
                          ? styles.statusPillTextSynced
                          : styles.statusPillTextPending,
                      ]}
                    >
                      {item.synced !== false ? 'Synchronisé' : 'En attente'}
                    </Text>
                  </View>
                </View>

                <View style={styles.personFooterRow}>
                  <View style={styles.tagRow}>
                    <View style={[styles.genreTag, { backgroundColor: item.genre === 'Femme' ? '#fdf2f8' : '#eff6ff' }]}>
                      <Text style={[styles.genreTagText, { color: item.genre === 'Femme' ? '#db2777' : '#2563eb' }]}>
                        {item.genre}
                      </Text>
                    </View>
                    {item.refere && (
                      <View style={styles.refTag}>
                        <Text style={styles.refTagText}>Orienté</Text>
                      </View>
                    )}
                  </View>
                  {item.telephone ? (
                    <View style={styles.phoneGroup}>
                      <Phone size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.phoneText, { color: colors.textSecondary }]}>
                        {item.telephone}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun recensement pour le moment</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Appuyez sur le bouton vert ci-dessus pour enregistrer votre premier recensement terrain.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 8,
  },
  agentGreeting: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  agentName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  roleBadgeText: {
    color: '#00A651',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  primaryActionTextContainer: {
    flex: 1,
  },
  primaryActionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  primaryActionSubtitle: {
    color: '#E8F5E9',
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  periodFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  kpiLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 4,
    minHeight: 32,
  },
  kpiSubValue: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 4,
  },
  kpiBadgeGreen: {
    backgroundColor: '#ecfdf5',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  kpiBadgeGreenText: {
    color: '#00A651',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  syncBadgeOrange: {
    backgroundColor: '#fff7ed',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  syncBadgeOrangeText: {
    color: '#ea580c',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  syncBadgeGreen: {
    backgroundColor: '#ecfdf5',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  syncBadgeGreenText: {
    color: '#00A651',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#00A651',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginRight: 2,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  listContainer: {
    gap: 10,
  },
  personCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  personHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  personInfo: {
    flex: 1,
    marginRight: 8,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  personMeta: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillSynced: {
    backgroundColor: '#ecfdf5',
  },
  statusPillPending: {
    backgroundColor: '#fff7ed',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  statusPillTextSynced: {
    color: '#00A651',
  },
  statusPillTextPending: {
    color: '#ea580c',
  },
  personFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genreTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genreTagText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  refTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  refTagText: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  phoneGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
