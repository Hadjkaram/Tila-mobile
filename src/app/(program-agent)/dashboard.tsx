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
  ShieldCheck,
  AlertTriangle,
  Activity,
  Building2,
  TrendingUp,
  Compass,
  ArrowRight,
  ChevronRight,
  Sparkles,
  BarChart3,
  Calendar,
  AlertCircle,
  MapPin,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { programAgentService } from '../../services/programAgent';

export default function ProgramAgentDashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [agentName, setAgentName] = useState('Agent Programme National');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          const parsed = JSON.parse(stored);
          const name = [parsed.firstName, parsed.lastName].filter(Boolean).join(' ').trim();
          if (name) setAgentName(name);
        }
      } catch {}
    };
    loadUser();
  }, []);

  const {
    data: dashData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['program-agent-dashboard'],
    queryFn: () => programAgentService.getDashboard(),
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
        {/* Header Macro National */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitles}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>Programme National (PNSM)</Text>
              <Text style={[styles.agentName, { color: colors.text }]} numberOfLines={1}>
                {agentName}
              </Text>
            </View>
            <View style={styles.badgePnsm}>
              <ShieldCheck size={12} color="#4f46e5" style={{ marginRight: 4 }} />
              <Text style={styles.badgePnsmText}>AGENT PROGRAMME</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {capitalizedDate}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Activity size={13} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: '#00A651', fontWeight: '600' }]}>
                Plateforme TILA Nationale Active
              </Text>
            </View>
          </View>
        </View>

        {/* 4 KPIs Macro-Sanitaires */}
        <View style={styles.kpiGrid}>
          {/* 1. Dépistages Nationaux */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#eff6ff' }]}>
              <Activity size={20} color="#2563eb" />
            </View>
            <Text style={[styles.kpiVal, { color: colors.text }]}>
              {dashData?.stats?.totalDepistagesNationaux ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Dépistages Nationaux
            </Text>
            <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Évaluations cliniques</Text>
          </View>

          {/* 2. Cas Critiques */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#fef2f2' }]}>
              <AlertTriangle size={20} color="#ef4444" />
            </View>
            <Text style={[styles.kpiVal, { color: '#ef4444' }]}>
              {dashData?.stats?.casPrioritaires ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Cas Prioritaires
            </Text>
            <Text style={[styles.kpiSub, { color: '#ef4444' }]}>Urgences vitales</Text>
          </View>

          {/* 3. Taux Prise en Charge */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ecfdf5' }]}>
              <TrendingUp size={20} color="#00A651" />
            </View>
            <Text style={[styles.kpiVal, { color: '#00A651' }]}>
              {dashData?.stats?.tauxPriseEnCharge ?? 82}%
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Prise en Charge
            </Text>
            <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Effectivité du suivi</Text>
          </View>

          {/* 4. Centres Actifs */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#f5f3ff' }]}>
              <Building2 size={20} color="#7c3aed" />
            </View>
            <Text style={[styles.kpiVal, { color: colors.text }]}>
              {dashData?.stats?.centresActifs ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Centres Conventionnés
            </Text>
            <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Réseau national</Text>
          </View>
        </View>

        {/* Accès Rapide : Parcours Patient 360° */}
        <TouchableOpacity
          style={styles.pathwayBanner}
          onPress={() => router.push('/(program-agent)/pathway-360')}
          activeOpacity={0.85}
        >
          <View style={styles.pathwayIconCircle}>
            <Compass size={22} color="#FFFFFF" />
          </View>
          <View style={styles.pathwayTextContainer}>
            <Text style={styles.pathwayTitle}>Moteur Parcours Patient 360°</Text>
            <Text style={styles.pathwaySub}>
              Suivez la trajectoire clinique complète d'un bénéficiaire anonymisé
            </Text>
          </View>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Répartition par Troubles & Pathologies */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Épidémiologie des Troubles Détectés
          </Text>
        </View>

        <View style={[styles.troublesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(dashData?.troublesRepartition || []).map((trouble, idx) => (
            <View key={idx} style={styles.troubleItem}>
              <View style={styles.troubleItemTop}>
                <View style={styles.troubleLabelGroup}>
                  <View style={[styles.colorDot, { backgroundColor: trouble.color }]} />
                  <Text style={[styles.troubleLabel, { color: colors.text }]}>{trouble.label}</Text>
                </View>
                <Text style={[styles.troublePct, { color: colors.text }]}>{trouble.pct}%</Text>
              </View>

              <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.bg : '#F1F5F9' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: trouble.color, width: `${trouble.pct}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Dernières Alertes Critiques Nationales */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Alertes Critiques Récentes
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(program-agent)/alerts')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>Voir toutes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertsList}>
          {(dashData?.recentAlerts || []).map((alert) => (
            <TouchableOpacity
              key={String(alert.id)}
              style={[
                styles.alertCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push('/(program-agent)/alerts')}
              activeOpacity={0.7}
            >
              <View style={styles.alertCardHeader}>
                <View style={styles.alertCodeGroup}>
                  <Text style={[styles.alertPatientCode, { color: colors.text }]}>
                    {alert.codePatient}
                  </Text>
                  <Text style={[styles.alertLocation, { color: colors.textSecondary }]}>
                    {alert.ville} • {alert.centre}
                  </Text>
                </View>
                <View style={styles.critiqueBadge}>
                  <Text style={styles.critiqueBadgeText}>{alert.priorite}</Text>
                </View>
              </View>
              <Text style={[styles.alertDesc, { color: colors.text }]} numberOfLines={2}>
                {alert.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitles: {
    flex: 1,
    marginRight: 8,
  },
  greeting: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  agentName: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginTop: 2,
  },
  badgePnsm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  badgePnsmText: {
    color: '#4f46e5',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
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
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiVal: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  kpiLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 3,
  },
  pathwayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pathwayIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pathwayTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  pathwayTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  pathwaySub: {
    color: '#e0e7ff',
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
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
  seeAllText: {
    color: '#00A651',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  troublesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  troubleItem: {
    gap: 6,
  },
  troubleItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  troubleLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  troubleLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  troublePct: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  alertsList: {
    gap: 10,
  },
  alertCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertCodeGroup: {
    flex: 1,
    marginRight: 8,
  },
  alertPatientCode: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  alertLocation: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 1,
  },
  critiqueBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  critiqueBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  alertDesc: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    lineHeight: 17,
  },
});
