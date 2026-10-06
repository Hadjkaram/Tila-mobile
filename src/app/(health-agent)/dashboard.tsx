import React, { useState, useEffect } from 'react';
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
  Calendar, 
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  LifeBuoy,
  ArrowRight,
  Clock,
  MessagesSquare,
  HeartPulse,
} from 'lucide-react-native';
import { agentService } from '../../services/agent';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../../components/ui/Skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserFirstName } from '../../utils/userUtils';
import { notificationService } from '../../services/notificationService';
import { FooterLogos } from '../../components/FooterLogos';

export default function HealthAgentDashboard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [agentName, setAgentName] = useState<string>('Agent');
  const [userProfile, setUserProfile] = useState<any>(null);

  const todayFormatted = React.useMemo(() => {
    try {
      const raw = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserProfile(parsed);
          setAgentName(getUserFirstName(parsed, 'Agent'));
        }
      } catch {}
    };
    loadUser();
  }, []);

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
    notificationService.notifyDataReceived({
      title: '🔔 Données actualisées',
      body: 'Vos dépistages et cas référés communautaires sont à jour.',
    });
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
          {/* 1. En-tête bienveillant avec Action Intelligente */}
          <View style={[styles.greetingCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.greetingTop}>
              <View style={[styles.badgeAgent, isDark && { backgroundColor: 'rgba(0,166,81,0.15)' }]}>
                <Sparkles size={12} color="#00A651" style={{ marginRight: 4 }} />
                <Text style={styles.badgeAgentText}>Acteur Communautaire PNSM</Text>
              </View>
              <Text style={[styles.dateText, isDark && { color: colors.textSecondary }]}>{todayFormatted}</Text>
            </View>
            <Text style={[styles.greetingTitle, isDark && { color: colors.text }]}>
              Bonjour, {agentName} 👋
            </Text>
            <Text style={[styles.greetingSubtitle, isDark && { color: colors.textSecondary }]}>
              Bienvenue sur votre espace de dépistage et d'orientation communautaire TILA.
            </Text>

            {/* Bouton d'action dynamique Smart CTA */}
            <TouchableOpacity
              style={styles.smartCtaButton}
              onPress={() => router.push('/(health-agent)/assessments')}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.smartCtaButtonText}>Lancer un nouveau dépistage ODS</Text>
              <ChevronRight size={16} color="#ffffff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* 2. Fiche Identifiant Acteur Communautaire & Agrément */}
          <View style={[styles.identityCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.identityHeader}>
              <View style={styles.identityAvatar}>
                <Text style={styles.identityInitials}>
                  {agentName ? agentName.substring(0, 2).toUpperCase() : 'AG'}
                </Text>
              </View>
              <View style={styles.identityMeta}>
                <Text style={[styles.identityName, isDark && { color: colors.text }]} numberOfLines={1}>
                  Agent {agentName}
                </Text>
                <View style={styles.profileBadge}>
                  <CheckCircle2 size={11} color="#00A651" style={{ marginRight: 4 }} />
                  <Text style={styles.profileBadgeText}>Acteur Certifié TILA</Text>
                </View>
              </View>
            </View>
            <View style={[styles.identityDivider, isDark && { backgroundColor: colors.border }]} />
            <View style={styles.identityRow}>
              <Text style={[styles.identityLabel, isDark && { color: colors.textSecondary }]}>Matricule Agent</Text>
              <Text style={[styles.identityValue, isDark && { color: colors.text }]}>
                {userProfile?.code || `TILA-AGT-${String(userProfile?.id || '2041').padStart(4, '0')}`}
              </Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={[styles.identityLabel, isDark && { color: colors.textSecondary }]}>Secteur d'Action</Text>
              <Text style={[styles.identityValue, isDark && { color: colors.text }]} numberOfLines={1}>
                {userProfile?.structure || 'District Sanitaire & Centre Communautaire'}
              </Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={[styles.identityLabel, isDark && { color: colors.textSecondary }]}>Déontologie</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldCheck size={13} color="#00A651" style={{ marginRight: 4 }} />
                <Text style={styles.confidentialityText}>Protocole PNSM & Secret Partagé</Text>
              </View>
            </View>
          </View>

          {/* 3. Métriques d'activité clés */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(0, 166, 81, 0.1)' }]}>
                <FileText size={18} color="#00A651" />
              </View>
              <Text style={[styles.statValue, isDark && { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {submissionsData?.total ?? submissions.length}
              </Text>
              <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                Dépistages
              </Text>
            </View>
            
            <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 130, 32, 0.1)' }]}>
                <ArrowRightLeft size={18} color="#F58220" />
              </View>
              <Text style={[styles.statValue, isDark && { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {referralsData?.total ?? referrals.length}
              </Text>
              <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                Orientations
              </Text>
            </View>

            {canAccessReceived && (
              <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <UserCheck size={18} color="#3b82f6" />
                </View>
                <Text style={[styles.statValue, isDark && { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {receivedData?.total ?? receivedPatients.length}
                </Text>
                <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                  Reçus
                </Text>
              </View>
            )}
          </View>

          {/* 4. Grille de 6 Services Clés */}
          <Text style={[styles.sectionTitle, { marginTop: 8, marginBottom: 12 }, isDark && { color: colors.text }]}>Mes Actions de Terrain</Text>
          <View style={styles.shortcutsGrid}>
            {/* Raccourci 1 : Nouveau Dépistage */}
            <TouchableOpacity
              style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(health-agent)/assessments')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: '#ecfdf5' }]}>
                <Plus size={20} color="#00A651" />
              </View>
              <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Dépistage ODS</Text>
              <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Passer un questionnaire terrain</Text>
            </TouchableOpacity>

            {/* Raccourci 2 : Orientations */}
            <TouchableOpacity
              style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(health-agent)/referrals')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: '#fff7ed' }]}>
                <ArrowRightLeft size={20} color="#ea580c" />
              </View>
              <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Orientations</Text>
              <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Référer vers un centre/pro</Text>
            </TouchableOpacity>

            {/* Raccourci 3 : Patients Reçus */}
            {canAccessReceived && (
              <TouchableOpacity
                style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(health-agent)/received')}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <UserCheck size={20} color="#2563eb" />
                </View>
                <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Patients Reçus</Text>
                <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>File active & confirmation</Text>
              </TouchableOpacity>
            )}

            {/* Raccourci 4 : Outils Cliniques ODS */}
            <TouchableOpacity
              style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(health-agent)/assessments')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: '#fef3c7' }]}>
                <ClipboardList size={20} color="#d97706" />
              </View>
              <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Outils ODS</Text>
              <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Population générale & travail</Text>
            </TouchableOpacity>

            {/* Raccourci 5 : Forum & Entraide Communautaire */}
            <TouchableOpacity
              style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(health-agent)/forum')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: '#f3e8ff' }]}>
                <MessagesSquare size={20} color="#7c3aed" />
              </View>
              <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Forum & Entraide</Text>
              <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Échanges entre pairs & retours</Text>
            </TouchableOpacity>

            {/* Raccourci 6 : Permanence 143 */}
            <TouchableOpacity
              style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(health-agent)/dashboard')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: '#fee2e2' }]}>
                <LifeBuoy size={20} color="#dc2626" />
              </View>
              <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Urgence 143</Text>
              <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Ligne nationale d'urgence PNSM</Text>
            </TouchableOpacity>
          </View>

          {/* 5. CARTE PLEIN FORMAT DU FORUM COMMUNAUTAIRE */}
          <TouchableOpacity
            style={[styles.forumSpotlightCard, isDark && { backgroundColor: colors.card, borderColor: '#7c3aed40' }]}
            onPress={() => router.push('/(health-agent)/forum')}
            activeOpacity={0.85}
          >
            <View style={styles.forumSpotlightTop}>
              <View style={styles.forumSpotlightBadge}>
                <MessagesSquare size={13} color="#7c3aed" style={{ marginRight: 6 }} />
                <Text style={styles.forumSpotlightBadgeText}>Réseau Terrain & Partage d'Expérience</Text>
              </View>
              <ChevronRight size={18} color="#7c3aed" />
            </View>
            <Text style={[styles.forumSpotlightTitle, isDark && { color: colors.text }]}>
              Forum & Entraide Communautaire
            </Text>
            <Text style={[styles.forumSpotlightSub, isDark && { color: colors.textSecondary }]}>
              Échangez avec les autres acteurs communautaires et spécialistes. Partagez vos retours du terrain, posez vos questions et découvrez les bonnes pratiques de sensibilisation.
            </Text>
            <View style={styles.forumSpotlightBtn}>
              <Text style={styles.forumSpotlightBtnText}>Participer aux échanges communautaires →</Text>
            </View>
          </TouchableOpacity>

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

          {/* Bannière Urgence & Assistance 143 PNSM */}
          <View style={[styles.emergencyDashCard, isDark && { backgroundColor: '#3f1212', borderColor: '#fca5a5' }]}>
            <View style={styles.emergencyIconWrapper}>
              <LifeBuoy size={24} color="#dc2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyDashTitle}>Ligne d'Urgence & Soutien 143</Text>
              <Text style={styles.emergencyDashSub}>
                Numéro vert national gratuit PNSM disponible 24h/7j pour orientation et régulation des crises de santé mentale sur le terrain.
              </Text>
            </View>
          </View>

          {/* Logos Partenaires avec Appui UE & Expertise France */}
          <View style={{ marginTop: 20, marginBottom: 16 }}>
            <FooterLogos />
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
  greetingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  greetingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeAgent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_800ExtraBold',
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 16,
  },
  smartCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  smartCtaButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  identityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  identityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  identityInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00A651',
    fontFamily: 'Montserrat_800ExtraBold',
  },
  identityMeta: {
    flex: 1,
  },
  identityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileBadgeText: {
    fontSize: 11,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  identityDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  identityLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
    flexShrink: 0,
  },
  identityValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
    flexShrink: 1,
    textAlign: 'right',
  },
  confidentialityText: {
    fontSize: 12,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  shortcutCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shortcutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  shortcutTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },
  shortcutSub: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  forumSpotlightCard: {
    backgroundColor: '#faf5ff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  forumSpotlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forumSpotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  forumSpotlightBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    fontFamily: 'Montserrat_700Bold',
  },
  forumSpotlightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#581c87',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  forumSpotlightSub: {
    fontSize: 12,
    color: '#6b21a8',
    lineHeight: 16,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 12,
  },
  forumSpotlightBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  forumSpotlightBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
  emergencyDashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
    marginBottom: 16,
    gap: 12,
  },
  emergencyIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyDashTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#991b1b',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },
  emergencyDashSub: {
    fontSize: 11.5,
    color: '#b91c1c',
    lineHeight: 15,
    fontFamily: 'Montserrat_400Regular',
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
