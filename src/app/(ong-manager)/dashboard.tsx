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
  UserCheck,
  Building2,
  FileText,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Calendar,
  Activity,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { ongService } from '../../services/ong';

export default function OngDashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [managerName, setManagerName] = useState('Responsable ONG');
  const [ongTitle, setOngTitle] = useState('ONG Partenaire TILA');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          const parsed = JSON.parse(stored);
          const name = [parsed.firstName, parsed.lastName].filter(Boolean).join(' ').trim();
          if (name) setManagerName(name);
          if (parsed.organisation?.name || parsed.ong?.name) {
            setOngTitle(parsed.organisation?.name || parsed.ong?.name);
          }
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
    queryKey: ['ong-dashboard'],
    queryFn: () => ongService.getDashboard(),
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
        {/* En-tête Organisation */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>Espace Supervision,</Text>
              <Text style={[styles.managerName, { color: colors.text }]} numberOfLines={1}>
                {managerName}
              </Text>
            </View>
            <View style={styles.ongBadge}>
              <Building2 size={12} color="#ea580c" style={{ marginRight: 4 }} />
              <Text style={styles.ongBadgeText}>RESPONSABLE ONG</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <ShieldCheck size={14} color="#00A651" style={{ marginRight: 5 }} />
              <Text style={[styles.metaText, { color: colors.text }]} numberOfLines={1}>
                {dashData?.ong?.name || ongTitle}
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

        {/* Alerte Validations d'agents en attente si > 0 */}
        {(dashData?.sensibilisateurs?.enAttente ?? 0) > 0 && (
          <TouchableOpacity
            style={styles.validationAlertBanner}
            onPress={() => router.push('/(ong-manager)/validation')}
            activeOpacity={0.85}
          >
            <View style={styles.alertIconCircle}>
              <UserCheck size={20} color="#ea580c" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {dashData?.sensibilisateurs?.enAttente} agent(s) en attente de validation
              </Text>
              <Text style={styles.alertSubtitle}>
                Vérifiez et activez leurs accès terrain pour le recensement
              </Text>
            </View>
            <ChevronRight size={20} color="#ea580c" />
          </TouchableOpacity>
        )}

        {/* 4 KPIs Stratégiques */}
        <View style={styles.kpiGrid}>
          {/* 1. Total Sensibilisés */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ecfdf5' }]}>
              <Users size={20} color="#00A651" />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {dashData?.kpis?.sensibilises ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Sensibilisés
            </Text>
            <View style={styles.pctBadgeGreen}>
              <Text style={styles.pctBadgeGreenText}>
                {dashData?.kpis?.sensibilisesPct ?? 89}% du total
              </Text>
            </View>
          </View>

          {/* 2. Agents Actifs */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#eff6ff' }]}>
              <Activity size={20} color="#2563eb" />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {dashData?.sensibilisateurs?.actifs ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Agents Actifs
            </Text>
            <Text style={[styles.kpiSubText, { color: colors.textMuted }]}>
              sur {dashData?.sensibilisateurs?.total ?? 0} enregistrés
            </Text>
          </View>

          {/* 3. Validations en attente */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#fff7ed' }]}>
              <UserCheck size={20} color="#ea580c" />
            </View>
            <Text style={[styles.kpiValue, { color: '#ea580c' }]}>
              {dashData?.sensibilisateurs?.enAttente ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              En attente
            </Text>
            <Text style={[styles.kpiSubText, { color: colors.textMuted }]}>
              Inscriptions agents
            </Text>
          </View>

          {/* 4. Centres / Zones couverts */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#f5f3ff' }]}>
              <Building2 size={20} color="#7c3aed" />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {dashData?.centresCount ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Centres Partenaires
            </Text>
            <Text style={[styles.kpiSubText, { color: colors.textMuted }]}>
              Zones sanitaires
            </Text>
          </View>
        </View>

        {/* Raccourcis Rapides */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(ong-manager)/agents')}
            activeOpacity={0.7}
          >
            <Users size={18} color="#00A651" style={{ marginRight: 8 }} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Annuaire Agents</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(ong-manager)/reports')}
            activeOpacity={0.7}
          >
            <FileText size={18} color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Rapports d'activité</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section Top Sensibilisateurs */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Top Agents Sensibilisateurs
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(ong-manager)/agents')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>Voir tous</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topAgentsList}>
          {(dashData?.topSensibilisateurs || []).map((agent, index) => (
            <View
              key={agent.id}
              style={[
                styles.agentRankCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.rankCircle}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.agentRankInfo}>
                <Text style={[styles.agentRankName, { color: colors.text }]} numberOfLines={1}>
                  {agent.firstName} {agent.lastName}
                </Text>
                <Text style={[styles.agentRankCity, { color: colors.textSecondary }]}>
                  {agent.ville || 'Zone Abidjan'}
                </Text>
              </View>
              <View style={styles.agentScoreBadge}>
                <Text style={styles.agentScoreText}>{agent.total} recensés</Text>
              </View>
            </View>
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
  greeting: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  managerName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginTop: 2,
  },
  ongBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  ongBadgeText: {
    color: '#ea580c',
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
  validationAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    marginBottom: 16,
  },
  alertIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
    marginRight: 8,
  },
  alertTitle: {
    color: '#9a3412',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  alertSubtitle: {
    color: '#c2410c',
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
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
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  kpiLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 4,
  },
  kpiSubText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 3,
  },
  pctBadgeGreen: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  pctBadgeGreenText: {
    color: '#00A651',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionText: {
    flex: 1,
    fontSize: 12,
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
  seeAllText: {
    color: '#00A651',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  topAgentsList: {
    gap: 10,
  },
  agentRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#00A651',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  agentRankInfo: {
    flex: 1,
    marginRight: 8,
  },
  agentRankName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  agentRankCity: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  agentScoreBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  agentScoreText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
