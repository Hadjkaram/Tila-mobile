import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  FileText, 
  ArrowRightLeft, 
  UserCheck, 
  Plus, 
  Users, 
  ChevronRight, 
  ClipboardList,
  Calendar
} from 'lucide-react-native';
import { agentService } from '../../services/agent';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../../components/ui/Skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';

export default function HealthAgentDashboard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const { 
    data: submissionsData, 
    isLoading: isSubmissionsLoading,
    isRefetching: isSubmissionsRefetching,
    refetch: refetchSubmissions 
  } = useQuery({
    queryKey: ['agent_submissions'],
    queryFn: () => agentService.getSubmissions({ limit: 10 }),
  });

  const { 
    data: referralsData, 
    isLoading: isReferralsLoading,
    refetch: refetchReferrals 
  } = useQuery({
    queryKey: ['agent_referrals'],
    queryFn: () => agentService.getReferrals({ limit: 10 }),
  });

  const { 
    data: receivedData, 
    isLoading: isReceivedLoading,
    refetch: refetchReceived 
  } = useQuery({
    queryKey: ['agent_received_patients'],
    queryFn: async () => {
      try {
        const res = await agentService.getReceivedPatients({ limit: 10 });
        return { ...res, isForbidden: false };
      } catch (err: any) {
        const is403 = err?.response?.status === 403 || err?.status === 403 || String(err?.message).includes('403');
        if (is403) {
          return { items: [], total: 0, page: 1, limit: 10, stats: { total: 0, orientes: 0, referes: 0 }, isForbidden: true };
        }
        throw err;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403 || error?.status === 403) return false;
      return failureCount < 2;
    }
  });

  const isLoading = isSubmissionsLoading || isReferralsLoading || isReceivedLoading;
  const isRefetching = isSubmissionsRefetching;

  const hasAnyData = !!(submissionsData || referralsData || receivedData);
  const showSkeleton = isLoading && !hasAnyData;

  const handleRefresh = async () => {
    await Promise.all([
      refetchSubmissions(),
      refetchReferrals(),
      refetchReceived(),
    ]);
  };

  const submissions = submissionsData?.items || [];
  const referrals = referralsData?.items || [];
  const receivedPatients = receivedData?.items || [];
  const canAccessReceived = !receivedData?.isForbidden;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const renderSkeleton = () => (
    <View style={styles.scrollContent}>
      <Skeleton height={32} width={220} borderRadius={8} style={{ marginBottom: 8 }} />
      <Skeleton height={18} width={280} borderRadius={4} style={{ marginBottom: 24 }} />
      
      {/* Quick Actions Skeleton */}
      <View style={styles.quickActionsContainer}>
        <Skeleton height={100} borderRadius={16} style={{ marginBottom: 12 }} />
        <Skeleton height={80} borderRadius={16} style={{ marginBottom: 24 }} />
      </View>

      {/* Stats Skeleton */}
      <View style={styles.statsContainer}>
        <Skeleton height={90} width="31%" borderRadius={16} />
        <Skeleton height={90} width="31%" borderRadius={16} />
        <Skeleton height={90} width="31%" borderRadius={16} />
      </View>

      {/* Recent Activity Skeleton */}
      <Skeleton height={24} width={180} borderRadius={4} style={{ marginTop: 24, marginBottom: 16 }} />
      <Skeleton height={70} borderRadius={12} style={{ marginBottom: 10 }} />
      <Skeleton height={70} borderRadius={12} style={{ marginBottom: 10 }} />
      <Skeleton height={70} borderRadius={12} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top']}>
      {showSkeleton ? (
        renderSkeleton()
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={isRefetching} 
              onRefresh={handleRefresh} 
              colors={['#00A651']} 
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, isDark && { color: colors.text }]}>Espace Agent de Santé</Text>
            <Text style={[styles.subtitle, isDark && { color: colors.textSecondary }]}>Aperçu et actions rapides sur le terrain</Text>
          </View>

          {/* Actions Rapides */}
          <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Actions Rapides</Text>
          <View style={styles.quickActionsContainer}>
            {/* Nouveau dépistage Card */}
            <TouchableOpacity 
              style={styles.primaryActionCard}
              onPress={() => router.push('/(health-agent)/assessments')}
              activeOpacity={0.85}
            >
              <View style={styles.actionCardLeft}>
                <View style={styles.primaryIconContainer}>
                  <Plus size={28} color="#ffffff" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.primaryActionTitle}>Nouveau dépistage</Text>
                  <Text style={styles.primaryActionSubtitle}>Lancer un questionnaire ODS</Text>
                </View>
              </View>
              <ChevronRight size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* Patients en attente Card (Uniquement si autorisé) */}
            {canAccessReceived && (
              <TouchableOpacity 
                style={[styles.secondaryActionCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(health-agent)/received')}
                activeOpacity={0.85}
              >
                <View style={styles.actionCardLeft}>
                  <View style={styles.secondaryIconContainer}>
                    <Users size={24} color="#00A651" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.secondaryActionTitle, isDark && { color: colors.text }]}>Patients en attente</Text>
                    <Text style={[styles.secondaryActionSubtitle, isDark && { color: colors.textSecondary }]}>
                      {receivedPatients.length} patient{receivedPatients.length > 1 ? 's' : ''} reçu{receivedPatients.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={isDark ? colors.textSecondary : '#94a3b8'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Métriques / Résumé */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(0, 166, 81, 0.1)' }]}>
                <FileText size={18} color="#00A651" />
              </View>
              <Text style={[styles.statValue, isDark && { color: colors.text }]}>{submissionsData?.total ?? submissions.length}</Text>
              <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]}>Dépistages</Text>
            </View>
            
            <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 130, 32, 0.1)' }]}>
                <ArrowRightLeft size={18} color="#F58220" />
              </View>
              <Text style={[styles.statValue, isDark && { color: colors.text }]}>{referralsData?.total ?? referrals.length}</Text>
              <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]}>Orientations</Text>
            </View>

            {canAccessReceived && (
              <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <UserCheck size={18} color="#3b82f6" />
                </View>
                <Text style={[styles.statValue, isDark && { color: colors.text }]}>{receivedData?.total ?? receivedPatients.length}</Text>
                <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]}>Reçus</Text>
              </View>
            )}
          </View>

          {/* Activité Récente : Derniers Dépistages */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Derniers dépistages</Text>
              <TouchableOpacity onPress={() => router.push('/(health-agent)/assessments')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {submissions.slice(0, 3).map((sub) => (
              <TouchableOpacity 
                key={sub.id} 
                style={[styles.activityCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(health-agent)/assessments')}
                activeOpacity={0.7}
              >
                <View style={styles.activityIcon}>
                  <ClipboardList size={20} color="#00A651" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityTitle, isDark && { color: colors.text }]}>
                    {sub.questionnaireTitle || sub.questionnaireKey || 'Dépistage ODS'}
                  </Text>
                  <Text style={[styles.activityPatient, isDark && { color: colors.textSecondary }]}>
                    {sub.patientName ? `Patient: ${sub.patientName}` : 'Patient non renseigné'}
                  </Text>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                    <Text style={[styles.activityDate, isDark && { color: colors.textSecondary }]}>{formatDate(sub.createdAt)}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))}

            {submissions.length === 0 && (
              <View style={[styles.emptyState, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, isDark && { color: colors.textSecondary }]}>Aucun dépistage récent enregistré</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#00A651',
    fontWeight: '600',
  },
  quickActionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  primaryActionCard: {
    backgroundColor: '#00A651',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryActionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  primaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  secondaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextContainer: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  primaryActionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  secondaryActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  secondaryActionSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 3,
  },
  activityPatient: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
