import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Video,
  Inbox,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  X,
  Phone,
  Clock,
  Sparkles,
  Stethoscope,
  AlertCircle,
  FileText,
  Users,
  Calendar,
  ShieldCheck,
  Building2,
  MessagesSquare,
  ArrowRight,
  LifeBuoy,
  HeartPulse,
  Heart,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { professionalService } from '../../services/professionals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../context/ThemeContext';
import { getUserDisplayName } from '../../utils/userUtils';
import { notificationService } from '../../services/notificationService';
import { FooterLogos } from '../../components/FooterLogos';

export default function SpecialistDashboard() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [userName, setUserName] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [patientRequests, setPatientRequests] = useState<any[]>([]);

  // Teleconsultation states
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [isSubmittingPec, setIsSubmittingPec] = useState(false);

  // PEC Modal form states
  const [isPecModalVisible, setIsPecModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [pecNotes, setPecNotes] = useState('');
  const [pecDecision, setPecDecision] = useState<'valide' | 'oriente' | 'refuse'>('valide');
  const [pecPrescription, setPecPrescription] = useState('');

  // État Réévaluation Clinique
  const [selectedRequestForReval, setSelectedRequestForReval] = useState<any>(null);
  const [revalModalVisible, setRevalModalVisible] = useState(false);
  const [clinicalScore, setClinicalScore] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [clinicalDecision, setClinicalDecision] = useState('Téléconsultation approfondie');

  const todayFormatted = useMemo(() => {
    try {
      const raw = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    } catch {
      return '';
    }
  }, []);

  const loadRequests = async () => {
    try {
      const raw = await AsyncStorage.getItem('@specialist_appointment_requests');
      if (raw) {
        setPatientRequests(JSON.parse(raw));
      } else {
        setPatientRequests([]);
      }
    } catch {}
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const contextStr = await AsyncStorage.getItem('tila_user_context');
        if (contextStr) {
          const userContext = JSON.parse(contextStr);
          setUserProfile(userContext);
          const name = getUserDisplayName(userContext, '');
          setUserName(name);
        }
      } catch (err) {}
    };
    fetchUser();
    loadRequests();
  }, []);

  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['pro_dashboard_stats'],
    queryFn: () => professionalService.getDashboardStats(),
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  
  const { data: appointmentsData, isLoading: isLoadingAppointments, refetch: refetchAppointments } = useQuery({
    queryKey: ['pro_appointments_week'],
    queryFn: () => professionalService.listAppointmentsRange({
      from: format(weekStart, 'yyyy-MM-dd'),
      to: format(weekEnd, 'yyyy-MM-dd'),
      limit: 50
    }),
  });

  const onRefresh = async () => {
    await Promise.allSettled([refetchStats(), refetchAppointments(), loadRequests()]);
    notificationService.notifyDataReceived({
      title: '🔔 Planning et dossiers actualisés',
      body: 'Vos rendez-vous et files actives ont été mis à jour.',
    });
  };

  const upcomingAppointments = appointmentsData?.items || [];
  
  const todayAppointments = useMemo(() => {
    return upcomingAppointments.filter(apt => {
      const aptDate = parseISO(apt.start);
      return isSameDay(aptDate, new Date());
    });
  }, [upcomingAppointments]);

  const pendingRequestsCount = patientRequests.filter((r) => r.status === 'en_attente').length;
  const pendingReferralsCount = stats?.pendingReferralsToMeCount || 0;
  const totalPending = pendingRequestsCount + pendingReferralsCount;

  const primaryAction = useMemo(() => {
    const hasVideoToday = todayAppointments.some(
      (a: any) => a.locationType === 'video' || a.type === 'video' || !!a.meetLink
    );
    if (hasVideoToday) {
      return {
        label: 'Rejoindre ma téléconsultation',
        action: () => router.push('/(specialist)/teleconsultation'),
        icon: Video,
        color: '#00A651',
      };
    }
    if (totalPending > 0) {
      return {
        label: `Traiter les demandes (${totalPending})`,
        action: () => router.push('/(specialist)/referrals'),
        icon: Inbox,
        color: '#2563eb',
      };
    }
    return {
      label: 'Consulter mon agenda du jour',
      action: () => router.push('/(specialist)/calendar'),
      icon: CalendarDays,
      color: '#00A651',
    };
  }, [todayAppointments, totalPending, router]);

  // Accepter une demande de rendez-vous
  const handleAcceptRequest = async (reqId: string) => {
    try {
      const updated = patientRequests.map((r) =>
        r.id === reqId ? { ...r, status: 'confirmé' } : r
      );
      setPatientRequests(updated);
      await AsyncStorage.setItem('@specialist_appointment_requests', JSON.stringify(updated));

      // Mettre à jour également côté patient
      const pRaw = await AsyncStorage.getItem('@patient_appointments');
      if (pRaw) {
        const pList = JSON.parse(pRaw).map((a: any) =>
          a.id === reqId ? { ...a, status: 'confirmé' } : a
        );
        await AsyncStorage.setItem('@patient_appointments', JSON.stringify(pList));
      }

      Alert.alert('Rendez-vous confirmé', 'Le rendez-vous a été validé et notifié au patient.');
    } catch {}
  };

  // Rejeter une demande
  const handleRejectRequest = async (reqId: string) => {
    try {
      const updated = patientRequests.map((r) =>
        r.id === reqId ? { ...r, status: 'rejeté' } : r
      );
      setPatientRequests(updated);
      await AsyncStorage.setItem('@specialist_appointment_requests', JSON.stringify(updated));

      const pRaw = await AsyncStorage.getItem('@patient_appointments');
      if (pRaw) {
        const pList = JSON.parse(pRaw).map((a: any) =>
          a.id === reqId ? { ...a, status: 'rejeté' } : a
        );
        await AsyncStorage.setItem('@patient_appointments', JSON.stringify(pList));
      }

      Alert.alert('Demande refusée', 'Le patient a été informé du créneau non disponible.');
    } catch {}
  };

  // Ouvrir le modal de réévaluation clinique
  const handleOpenReval = (req: any) => {
    setSelectedRequestForReval(req);
    setClinicalScore(req.selfAssessment ? String(req.selfAssessment.score) : '10');
    setClinicalNotes(req.specialistReevaluation?.notes || '');
    setClinicalDecision(req.specialistReevaluation?.decision || 'Téléconsultation approfondie');
    setRevalModalVisible(true);
  };

  // Enregistrer la réévaluation clinique dans le dashboard
  const handleSaveReval = async () => {
    if (!selectedRequestForReval) return;

    const revalData = {
      revaluatedAt: new Date().toISOString(),
      specialistName: userName,
      clinicalScore: Number(clinicalScore) || 0,
      initialPatientScore: selectedRequestForReval.selfAssessment?.score ?? null,
      patientTool: selectedRequestForReval.selfAssessment?.tool ?? 'ODS / Bilan Initial',
      notes: clinicalNotes.trim(),
      decision: clinicalDecision,
    };

    try {
      // 1. Mettre à jour la demande avec la réévaluation
      const updatedRequests = patientRequests.map((r) =>
        r.id === selectedRequestForReval.id
          ? { ...r, specialistReevaluation: revalData }
          : r
      );
      setPatientRequests(updatedRequests);
      await AsyncStorage.setItem('@specialist_appointment_requests', JSON.stringify(updatedRequests));

      // 2. Enregistrer dans l'historique des évaluations du spécialiste (@specialist_evaluations)
      const existingEvals = await AsyncStorage.getItem('@specialist_evaluations');
      const evalList = existingEvals ? JSON.parse(existingEvals) : [];
      const newEvalRecord = {
        id: `reval_${Date.now()}`,
        patientName: selectedRequestForReval.patientName,
        patientPhone: selectedRequestForReval.patientPhone,
        date: new Date().toLocaleDateString('fr-FR'),
        type: `Réévaluation • ${selectedRequestForReval.selfAssessment?.tool || 'Bilan clinique'}`,
        score: Number(clinicalScore) || 0,
        initialScore: selectedRequestForReval.selfAssessment?.score,
        notes: clinicalNotes,
        decision: clinicalDecision,
      };
      await AsyncStorage.setItem('@specialist_evaluations', JSON.stringify([newEvalRecord, ...evalList]));

      setRevalModalVisible(false);
      Alert.alert(
        'Réévaluation Enregistrée !',
        `La réévaluation clinique de ${selectedRequestForReval.patientName} a été enregistrée avec succès dans le dossier médical du spécialiste.`
      );
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la réévaluation.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} colors={['#00A651']} />}
      >
        {/* 1. En-tête bienveillant avec Action Intelligente */}
        <View style={[styles.greetingCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.greetingTop}>
            <View style={[styles.badgeSpecialist, isDark && { backgroundColor: 'rgba(0,166,81,0.15)' }]}>
              <Stethoscope size={12} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={styles.badgeSpecialistText}>Médecin Praticien PNSM</Text>
            </View>
            <Text style={[styles.dateText, isDark && { color: colors.textSecondary }]}>{todayFormatted}</Text>
          </View>
          <Text style={[styles.greetingTitle, isDark && { color: colors.text }]}>
            {userName ? `Bonjour, Dr. ${userName} 👋` : 'Bonjour, Docteur 👋'}
          </Text>
          <Text style={[styles.greetingSubtitle, isDark && { color: colors.textSecondary }]}>
            Bienvenue sur votre console clinique de télé-expertise et prise en charge.
          </Text>

          {/* Bouton d'action dynamique synchronisé avec le planning */}
          <TouchableOpacity
            style={[styles.smartCtaButton, { backgroundColor: primaryAction.color }]}
            onPress={primaryAction.action}
            activeOpacity={0.85}
          >
            <primaryAction.icon size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.smartCtaButtonText}>{primaryAction.label}</Text>
            <ChevronRight size={16} color="#ffffff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* 2. Fiche Identifiant Professionnel & Agrément PNSM */}
        <View style={[styles.identityCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.identityHeader}>
            <View style={styles.identityAvatar}>
              <Text style={styles.identityInitials}>
                {userName ? userName.substring(0, 2).toUpperCase() : 'DR'}
              </Text>
            </View>
            <View style={styles.identityMeta}>
              <Text style={[styles.identityName, isDark && { color: colors.text }]} numberOfLines={1}>
                {userName ? `Dr. ${userName}` : 'Praticien Spécialiste'}
              </Text>
              <View style={styles.profileBadge}>
                <CheckCircle2 size={11} color="#00A651" style={{ marginRight: 4 }} />
                <Text style={styles.profileBadgeText}>Praticien Agréé PNSM</Text>
              </View>
            </View>
          </View>
          <View style={[styles.identityDivider, isDark && { backgroundColor: colors.border }]} />
          <View style={styles.identityRow}>
            <Text style={[styles.identityLabel, isDark && { color: colors.textSecondary }]}>Matricule TILA-PRO</Text>
            <Text style={[styles.identityValue, isDark && { color: colors.text }]}>
              {userProfile?.code || `TILA-MED-${String(userProfile?.id || '4482').padStart(4, '0')}`}
            </Text>
          </View>
          <View style={styles.identityRow}>
            <Text style={[styles.identityLabel, isDark && { color: colors.textSecondary }]}>Structure / Pôle</Text>
            <Text style={[styles.identityValue, isDark && { color: colors.text }]} numberOfLines={1}>
              {userProfile?.structure || 'Pôle Psychiatrie & PNSM'}
            </Text>
          </View>
          <View style={styles.identityRow}>
            <Text style={[styles.identityLabel, isDark && { color: colors.textSecondary }]}>Déontologie</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldCheck size={13} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={styles.confidentialityText}>Secret Médical & Télé-expertise</Text>
            </View>
          </View>
        </View>

        {/* 3. Métriques d'activité clés */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(0, 166, 81, 0.1)' }]}>
              <Video size={18} color="#00A651" />
            </View>
            <Text style={[styles.statValue, isDark && { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {todayAppointments.length}
            </Text>
            <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
              Aujourd'hui
            </Text>
          </View>
          
          <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 130, 32, 0.1)' }]}>
              <Inbox size={18} color="#F58220" />
            </View>
            <Text style={[styles.statValue, isDark && { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {totalPending}
            </Text>
            <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
              En attente
            </Text>
          </View>

          <View style={[styles.statCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Users size={18} color="#3b82f6" />
            </View>
            <Text style={[styles.statValue, isDark && { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {stats?.activePatientsCount || 18}
            </Text>
            <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
              Patients suivis
            </Text>
          </View>
        </View>

        {/* 4. Grille de 6 Services Clés */}
        <Text style={[styles.sectionTitle, { marginTop: 8, marginBottom: 12 }, isDark && { color: colors.text }]}>Mes Outils & Pratique Clinique</Text>
        <View style={styles.shortcutsGrid}>
          {/* Raccourci 1 : Téléconsultation */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(specialist)/teleconsultation')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Video size={20} color="#2563eb" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Téléconsultation</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Visio & salle d'attente</Text>
          </TouchableOpacity>

          {/* Raccourci 2 : Évaluations */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(specialist)/evaluations')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <ClipboardList size={20} color="#00A651" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Outils Cliniques</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Tests psychométriques ODS</Text>
          </TouchableOpacity>

          {/* Raccourci 3 : Cas Référés */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(specialist)/referrals')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#fff7ed' }]}>
              <Inbox size={20} color="#ea580c" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Cas Référés</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Demandes de prise en charge</Text>
          </TouchableOpacity>

          {/* Raccourci 4 : Mes Patients */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(specialist)/patients')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#eef2ff' }]}>
              <Users size={20} color="#4f46e5" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Mes Patients</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Dossiers & suivi médical</Text>
          </TouchableOpacity>

          {/* Raccourci 5 : Mon Agenda */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(specialist)/calendar')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#fefce8' }]}>
              <CalendarDays size={20} color="#ca8a04" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Mon Agenda</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Plages horaires & créneaux</Text>
          </TouchableOpacity>

          {/* Raccourci 6 : Forum & Collégialité */}
          <TouchableOpacity
            style={[styles.shortcutCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(specialist)/forum')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#f3e8ff' }]}>
              <MessagesSquare size={20} color="#7c3aed" />
            </View>
            <Text style={[styles.shortcutTitle, isDark && { color: colors.text }]}>Forum & Échanges</Text>
            <Text style={[styles.shortcutSub, isDark && { color: colors.textSecondary }]}>Collégialité & avis confraternels</Text>
          </TouchableOpacity>
        </View>

        {/* 5. CARTE PLEIN FORMAT DU FORUM PRO */}
        <TouchableOpacity
          style={[styles.forumSpotlightCard, isDark && { backgroundColor: colors.card, borderColor: '#7c3aed40' }]}
          onPress={() => router.push('/(specialist)/forum')}
          activeOpacity={0.85}
        >
          <View style={styles.forumSpotlightTop}>
            <View style={styles.forumSpotlightBadge}>
              <MessagesSquare size={13} color="#7c3aed" style={{ marginRight: 6 }} />
              <Text style={styles.forumSpotlightBadgeText}>Espace Collégial Interprofessionnel</Text>
            </View>
            <ChevronRight size={18} color="#7c3aed" />
          </View>
          <Text style={[styles.forumSpotlightTitle, isDark && { color: colors.text }]}>
            Forum & Avis Confraternels
          </Text>
          <Text style={[styles.forumSpotlightSub, isDark && { color: colors.textSecondary }]}>
            Échangez entre psychiatres et psychologues sur des cas cliniques complexes, partagez des protocoles thérapeutiques et soutenez les acteurs communautaires du terrain.
          </Text>
          <View style={styles.forumSpotlightBtn}>
            <Text style={styles.forumSpotlightBtnText}>Rejoindre les discussions cliniques →</Text>
          </View>
        </TouchableOpacity>

        {/* NOUVELLE SECTION : Demandes de Rendez-vous & Auto-évaluations reçues */}
        {patientRequests.length > 0 && (
          <View style={[styles.requestsSection, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.requestsSectionHeader}>
              <View style={styles.requestsBadge}>
                <Sparkles size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.requestsBadgeText}>
                  {patientRequests.filter((r) => r.status === 'en_attente').length} Nouvelle(s) Demande(s)
                </Text>
              </View>
              <Text style={[styles.requestsSectionTitle, isDark && { color: colors.text }]}>Demandes de RDV & Auto-évaluations</Text>
            </View>

            {patientRequests.map((req) => {
              const hasAssessment = !!req.selfAssessment;
              const hasReval = !!req.specialistReevaluation;
              const isPending = req.status === 'en_attente';

              return (
                <View key={req.id} style={[styles.requestCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {/* Info Patient */}
                  <View style={styles.reqCardHeader}>
                    <View style={styles.reqAvatar}>
                      <Text style={styles.reqAvatarText}>
                        {req.patientName ? req.patientName.substring(0, 2).toUpperCase() : 'PT'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.reqPatientName, isDark && { color: colors.text }]} numberOfLines={1}>
                        {req.patientName}
                      </Text>
                      <View style={styles.reqMetaRow}>
                        <Phone size={12} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={[styles.reqMetaText, isDark && { color: colors.textSecondary }]}>{req.patientPhone}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.reqStatusBadge,
                        req.status === 'confirmé'
                          ? styles.statusConfirmed
                          : req.status === 'rejeté'
                          ? styles.statusRejected
                          : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reqStatusText,
                          req.status === 'confirmé'
                            ? styles.statusTextConfirmed
                            : req.status === 'rejeté'
                            ? styles.statusTextRejected
                            : styles.statusTextPending,
                        ]}
                      >
                        {req.status === 'en_attente' ? 'En attente' : req.status}
                      </Text>
                    </View>
                  </View>

                  {/* Créneau & Type */}
                  <View style={styles.reqDetailsRow}>
                    <View style={styles.reqDetailItem}>
                      <Clock size={13} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={[styles.reqDetailText, isDark && { color: colors.textSecondary }]}>{req.date}</Text>
                    </View>
                    <View style={styles.reqDetailItem}>
                      <Video size={13} color="#2563eb" style={{ marginRight: 4 }} />
                      <Text style={[styles.reqDetailText, { color: '#2563eb', fontWeight: '600' }]}>
                        {req.type === 'video' ? 'Téléconsultation' : 'Présentiel'}
                      </Text>
                    </View>
                  </View>

                  {req.reason ? (
                    <Text style={[styles.reqReasonText, isDark && { backgroundColor: colors.bg, color: colors.text }]}>
                      <Text style={{ fontWeight: '700' }}>Motif : </Text>
                      {req.reason}
                    </Text>
                  ) : null}

                  {/* BLOC AUTO-ÉVALUATION FAITE PAR LE PATIENT */}
                  {hasAssessment && (
                    <View style={styles.reqAssessmentBox}>
                      <View style={styles.reqAssessmentHeader}>
                        <Sparkles size={14} color="#00A651" style={{ marginRight: 6 }} />
                        <Text style={styles.reqAssessmentTitle}>
                          Auto-évaluation : {req.selfAssessment.tool}
                        </Text>
                      </View>
                      <View style={styles.reqScoreRow}>
                        <Text style={styles.reqScoreLabel}>Score auto-évalué :</Text>
                        <Text style={styles.reqScoreNumber}>{req.selfAssessment.score}</Text>
                        <View style={styles.reqSeverityBadge}>
                          <Text style={styles.reqSeverityText}>{req.selfAssessment.level}</Text>
                        </View>
                      </View>
                      {req.selfAssessment.interpretation ? (
                        <Text style={styles.reqAssessmentInterp} numberOfLines={2}>
                          {req.selfAssessment.interpretation}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* RÉSULTAT DE RÉÉVALUATION DU SPÉCIALISTE SI DÉJÀ EFFECTUÉE */}
                  {hasReval && (
                    <View style={styles.revalResultBox}>
                      <View style={styles.reqAssessmentHeader}>
                        <CheckCircle2 size={14} color="#2563eb" style={{ marginRight: 6 }} />
                        <Text style={[styles.reqAssessmentTitle, { color: '#1e40af' }]}>
                          Réévaluation médicale validée (Score : {req.specialistReevaluation.clinicalScore})
                        </Text>
                      </View>
                      <Text style={styles.revalResultNotes}>
                        Décision : {req.specialistReevaluation.decision}
                      </Text>
                      {req.specialistReevaluation.notes ? (
                        <Text style={styles.revalResultNotes}>
                          Notes : {req.specialistReevaluation.notes}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Actions Spécialiste */}
                  <View style={styles.reqActionsRow}>
                    {/* Bouton Réévaluer le patient */}
                    <TouchableOpacity
                      style={styles.revalBtn}
                      onPress={() => handleOpenReval(req)}
                      activeOpacity={0.8}
                    >
                      <Stethoscope size={14} color="#00A651" style={{ marginRight: 6 }} />
                      <Text style={styles.revalBtnText}>
                        {hasReval ? 'Modifier réévaluation' : 'Réévaluer le patient'}
                      </Text>
                    </TouchableOpacity>

                    {/* Actions de confirmation / refus si en attente */}
                    {isPending && (
                      <View style={styles.reqDecideGroup}>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => handleAcceptRequest(req.id)}
                          activeOpacity={0.8}
                        >
                          <CheckCircle2 size={14} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={styles.acceptBtnText}>Accepter</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => handleRejectRequest(req.id)}
                          activeOpacity={0.8}
                        >
                          <X size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Cas en attente */}
        <TouchableOpacity style={[styles.alertCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(specialist)/referrals')}>
          <View style={styles.alertContent}>
            <View style={styles.alertIconBox}>
              <Inbox size={24} color="#d97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.alertTitle, isDark && { color: colors.text }]}>Cas Référés en attente</Text>
              <Text style={[styles.alertSubtitle, isDark && { color: colors.textSecondary }]}>
                {isLoadingStats ? "..." : `${stats?.pendingReferralsToMeCount || 0} cas en attente de traitement`}
              </Text>
            </View>
          </View>
          <View style={styles.alertAction}>
            <Text style={styles.alertActionText}>Traiter</Text>
            <ChevronRight size={16} color="#d97706" />
          </View>
        </TouchableOpacity>

        {/* Appointments List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDark && { color: colors.text }]}>Rendez-vous du jour</Text>
            <TouchableOpacity onPress={() => router.push('/(specialist)/calendar')}>
              <Text style={styles.seeAllText}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          {(isLoadingAppointments && !appointmentsData) ? (
            <View>
              <Skeleton height={80} borderRadius={16} style={{ marginBottom: 12 }} />
              <Skeleton height={80} borderRadius={16} style={{ marginBottom: 12 }} />
            </View>
          ) : todayAppointments.length === 0 ? (
            <View style={[styles.emptyState, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CalendarDays size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyStateText, isDark && { color: colors.textSecondary }]}>Aucun rendez-vous prévu aujourd'hui</Text>
            </View>
          ) : (
            todayAppointments.map((apt: any) => {
              const isVideo = apt.locationType === 'video' || apt.type === 'video' || !!apt.meetLink;
              const isConfirmed = apt.status === 'confirmed' || apt.status === 'confirmé';
              const statusDisplay = isConfirmed
                ? 'Confirmé'
                : apt.status === 'pending' || apt.status === 'en_attente'
                ? 'En attente'
                : apt.status || 'Planifié';

              return (
                <View key={apt.id} style={[styles.appointmentCard, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.appointmentTimeContainer}>
                    <Text style={styles.appointmentTime}>{apt.time || format(parseISO(apt.start), 'HH:mm')}</Text>
                  </View>
                  
                  <View style={styles.appointmentDetails}>
                    <Text style={[styles.patientName, isDark && { color: colors.text }]}>{apt.patientName || (typeof apt.patient === 'object' ? apt.patient?.name : apt.patient) || 'Inconnu'}</Text>
                    <View style={styles.appointmentMeta}>
                      <Text style={[styles.appointmentType, isDark && { color: colors.textSecondary }]}>
                        {isVideo ? 'Téléconsultation' : 'Au cabinet'}
                      </Text>
                      <View style={[
                        styles.statusBadge, 
                        isConfirmed ? styles.statusConfirmed : styles.statusPending
                      ]}>
                        <Text style={[
                          styles.statusText,
                          isConfirmed ? styles.statusTextConfirmed : styles.statusTextPending
                        ]}>
                          {statusDisplay}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {isVideo && (
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => router.push(`/(specialist)/teleconsultation/${apt.id}` as any)}
                      activeOpacity={0.8}
                    >
                      <Video size={20} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Bannière Urgence & Permanence 143 PNSM */}
        <View style={[styles.emergencyDashCard, isDark && { backgroundColor: '#3f1212', borderColor: '#fca5a5' }]}>
          <View style={styles.emergencyIconWrapper}>
            <LifeBuoy size={24} color="#dc2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyDashTitle}>Permanence d'Urgence 143 PNSM</Text>
            <Text style={styles.emergencyDashSub}>
              Ligne nationale de crise psychiatrique et détresse psychologique. Coordination disponible 24h/7j pour orientation immédiate.
            </Text>
          </View>
        </View>

        {/* Logos Partenaires avec Appui UE & Expertise France */}
        <View style={{ marginTop: 16, marginBottom: 16 }}>
          <FooterLogos />
        </View>
      </ScrollView>

      {/* Modal Réévaluation Clinique du Patient par le Spécialiste */}
      <Modal visible={revalModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.revalModalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Réévaluation Clinique</Text>
                <Text style={styles.modalSubtitle}>
                  Patient : {selectedRequestForReval?.patientName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRevalModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.revalModalBody} showsVerticalScrollIndicator={false}>
              {/* Contexte de l'évaluation du patient */}
              {selectedRequestForReval?.selfAssessment && (
                <View style={styles.revalContextBox}>
                  <Text style={styles.revalContextTitle}>Données auto-évaluées par le patient :</Text>
                  <Text style={styles.revalContextSub}>
                    Outil : <Text style={{ fontWeight: '700' }}>{selectedRequestForReval.selfAssessment.tool}</Text> • Score initial : <Text style={{ fontWeight: '700', color: '#00A651' }}>{selectedRequestForReval.selfAssessment.score}</Text> ({selectedRequestForReval.selfAssessment.level})
                  </Text>
                </View>
              )}

              {/* Score Clinique Spécialiste */}
              <Text style={styles.inputLabel}>Score Clinique Expert (0 - 30)</Text>
              <TextInput
                style={styles.scoreInput}
                keyboardType="numeric"
                placeholder="Ex: 12"
                placeholderTextColor="#94a3b8"
                value={clinicalScore}
                onChangeText={setClinicalScore}
              />

              {/* Décision Médicale */}
              <Text style={styles.inputLabel}>Décision & Orientation Thérapeutique</Text>
              <View style={styles.decisionPillsRow}>
                {[
                  'Téléconsultation approfondie',
                  'Prescription & Traitement',
                  'Psychothérapie de soutien',
                  'Orientation CHU / Structure',
                ].map((dec) => (
                  <TouchableOpacity
                    key={dec}
                    style={[styles.decisionPill, clinicalDecision === dec && styles.decisionPillActive]}
                    onPress={() => setClinicalDecision(dec)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.decisionPillText,
                        clinicalDecision === dec && styles.decisionPillTextActive,
                      ]}
                    >
                      {dec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Observations cliniques */}
              <Text style={styles.inputLabel}>Observations Médicales & Diagnostic</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Indiquez vos conclusions cliniques, symptômes relevés et stratégie de prise en charge..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
              />

              {/* Bouton Enregistrer */}
              <TouchableOpacity
                style={styles.saveRevalBtn}
                onPress={handleSaveReval}
                activeOpacity={0.85}
              >
                <ClipboardList size={16} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.saveRevalBtnText}>Enregistrer la réévaluation dans le dossier</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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
  badgeSpecialist: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSpecialistText: {
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'Montserrat_800ExtraBold',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
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
  requestsSection: {
    marginBottom: 24,
  },
  requestsSectionHeader: {
    marginBottom: 12,
  },
  requestsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  requestsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
  requestsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reqCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reqAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reqAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  reqPatientName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  reqMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  reqMetaText: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  reqStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reqStatusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  reqDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  reqDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reqDetailText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  reqReasonText: {
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  reqAssessmentBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  reqAssessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reqAssessmentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    fontFamily: 'Montserrat_700Bold',
  },
  reqScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reqScoreLabel: {
    fontSize: 12,
    color: '#166534',
    fontFamily: 'Montserrat_500Medium',
  },
  reqScoreNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803d',
    fontFamily: 'Montserrat_700Bold',
  },
  reqSeverityBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reqSeverityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    fontFamily: 'Montserrat_700Bold',
  },
  reqAssessmentInterp: {
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 15,
    fontFamily: 'Montserrat_400Regular',
  },
  revalResultBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  revalResultNotes: {
    fontSize: 11.5,
    color: '#1e40af',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  reqActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  revalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  revalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  reqDecideGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
  rejectBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#b45309',
    fontFamily: 'Montserrat_700Bold',
  },
  alertSubtitle: {
    fontSize: 12.5,
    color: '#d97706',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
    marginRight: 4,
    fontFamily: 'Montserrat_600SemiBold',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: 'Montserrat_700Bold',
  },
  seeAllText: {
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appointmentTimeContainer: {
    width: 60,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    paddingRight: 12,
    marginRight: 12,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    fontFamily: 'Montserrat_700Bold',
  },
  appointmentDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentType: {
    fontSize: 12.5,
    color: '#64748b',
    marginRight: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(0, 166, 81, 0.1)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 130, 32, 0.1)',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  statusTextConfirmed: {
    color: '#00A651',
  },
  statusTextPending: {
    color: '#F58220',
  },
  statusTextRejected: {
    color: '#ef4444',
  },
  joinButton: {
    width: 40,
    height: 40,
    backgroundColor: '#00A651',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  revalModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  revalModalBody: {
    padding: 20,
    paddingBottom: 36,
  },
  revalContextBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  revalContextTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  revalContextSub: {
    fontSize: 12.5,
    color: '#166534',
    fontFamily: 'Montserrat_400Regular',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  scoreInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  decisionPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  decisionPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  decisionPillActive: {
    borderColor: '#00A651',
    backgroundColor: '#ecfdf5',
  },
  decisionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Montserrat_600SemiBold',
  },
  decisionPillTextActive: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    height: 85,
    marginBottom: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  saveRevalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveRevalBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
});
