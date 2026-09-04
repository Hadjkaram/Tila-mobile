import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Linking, 
  RefreshControl 
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MessageSquare, 
  Mail, 
  Calendar, 
  Hash, 
  Activity, 
  Building, 
  Briefcase, 
  MapPin, 
  Clock, 
  Video, 
  FolderOpen, 
  CheckCircle2, 
  ArrowRightLeft, 
  FileText,
  CalendarCheck,
  Inbox
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { professionalService, PatientTimelineEvent } from '../../../services/professionals';
import { format, differenceInYears, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useTheme } from '../../../context/ThemeContext';

type TabType = 'general' | 'appointments' | 'parcours';

export default function PatientDetailScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams();
  const patientId = Array.isArray(id) ? id[0] : id;

  const [activeTab, setActiveTab] = useState<TabType>('general');

  // 1. Patient General Info
  const { 
    data: patient, 
    isLoading: isLoadingPatient, 
    isRefetching: isRefetchingPatient,
    refetch: refetchPatient 
  } = useQuery({
    queryKey: ['pro_patient', patientId],
    queryFn: () => professionalService.getPatientById(patientId as string),
    enabled: !!patientId,
  });

  // 2. Patient Appointments
  const { 
    data: appointmentsData, 
    isLoading: isLoadingAppointments, 
    isRefetching: isRefetchingAppointments,
    refetch: refetchAppointments 
  } = useQuery({
    queryKey: ['pro_patient_appointments', patientId],
    queryFn: () => professionalService.getPatientAppointments(patientId as string, 1, 50),
    enabled: !!patientId,
  });

  // 3. Patient Timeline & Parcours
  const { 
    data: timelineData, 
    isLoading: isLoadingTimeline, 
    isRefetching: isRefetchingTimeline,
    refetch: refetchTimeline 
  } = useQuery({
    queryKey: ['pro_patient_timeline', patientId],
    queryFn: () => professionalService.getPatientTimeline(patientId as string, { limit: 50 }),
    enabled: !!patientId,
  });

  const isRefreshing = isRefetchingPatient || isRefetchingAppointments || isRefetchingTimeline;

  const handleRefresh = async () => {
    await Promise.all([
      refetchPatient(),
      refetchAppointments(),
      refetchTimeline(),
    ]);
  };

  const getAge = (dob: string | undefined) => {
    if (!dob) return null;
    try {
      const age = differenceInYears(new Date(), parseISO(dob));
      return `${age} ans`;
    } catch {
      return null;
    }
  };

  const formatDate = (dateStr: string | null | undefined, pattern = 'dd MMMM yyyy') => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), pattern, { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const openDialer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openSMS = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const openMail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const getStressBadge = (level?: string) => {
    if (!level) return null;
    const l = level.toLowerCase();
    if (l.includes('faible') || l.includes('low')) {
      return { bg: '#ecfdf5', text: '#059669', label: 'Stress Faible' };
    }
    if (l.includes('modéré') || l.includes('moderate') || l.includes('moyen')) {
      return { bg: '#eff6ff', text: '#2563eb', label: 'Stress Modéré' };
    }
    if (l.includes('élevé') || l.includes('high')) {
      return { bg: '#fffbeb', text: '#d97706', label: 'Stress Élevé' };
    }
    if (l.includes('critique') || l.includes('très') || l.includes('severe')) {
      return { bg: '#fef2f2', text: '#dc2626', label: 'Stress Très Élevé' };
    }
    return { bg: '#f1f5f9', text: '#475569', label: level };
  };

  const appointments = appointmentsData?.items || [];
  const timelineEvents: PatientTimelineEvent[] = timelineData?.items || [];

  if (isLoadingPatient && !patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Chargement...</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 24 }}>
          <Skeleton height={140} borderRadius={20} style={{ marginBottom: 20 }} />
          <Skeleton height={48} borderRadius={12} style={{ marginBottom: 20 }} />
          <Skeleton height={200} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (!patient) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Fiche Patient</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyStateContainer}>
          <Inbox size={48} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Patient introuvable</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Le dossier de ce patient n'a pas pu être chargé.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stressBadge = getStressBadge(patient.stressLevel);
  const calculatedAge = getAge(patient.birthdate);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]} numberOfLines={1}>
          {patient.name || `${patient.firstName} ${patient.lastName}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh} 
            colors={['#00A651']} 
          />
        }
      >
        {/* Profile Card Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileTopRow}>
            <View style={[styles.avatarLarge, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]}>
              <User size={38} color="#00A651" />
            </View>
            <View style={styles.profileHeaderInfo}>
              <Text style={[styles.patientName, { color: colors.text }]}>{patient.name || `${patient.firstName} ${patient.lastName}`}</Text>
              <Text style={[styles.patientSub, { color: colors.textSecondary }]}>
                {patient.profession?.name || 'Patient'} 
                {patient.organisation?.name ? ` • ${patient.organisation.name}` : ''}
              </Text>
              
              <View style={styles.badgeRow}>
                <View style={[
                  styles.statusBadge, 
                  patient.status === 'active' ? (isDark ? { backgroundColor: 'rgba(0,166,81,0.15)' } : styles.statusActive) : (isDark ? { backgroundColor: '#334155' } : styles.statusInactive)
                ]}>
                  <Text style={[
                    styles.statusBadgeText, 
                    patient.status === 'active' ? styles.statusActiveText : styles.statusInactiveText
                  ]}>
                    {patient.status === 'active' ? 'Dossier Actif' : 'Inactif'}
                  </Text>
                </View>

                {stressBadge && (
                  <View style={[styles.stressBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : stressBadge.bg }]}>
                    <Activity size={12} color={stressBadge.text} style={{ marginRight: 4 }} />
                    <Text style={[styles.stressBadgeText, { color: stressBadge.text }]}>
                      {stressBadge.label}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Actions (Call, SMS, Mail) */}
          <View style={[styles.quickActions, { borderTopColor: colors.border }]}>
            {patient.phoneNumber ? (
              <>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => openDialer(patient.phoneNumber as string)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]}>
                    <Phone size={18} color="#00A651" />
                  </View>
                  <Text style={styles.actionText}>Appeler</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => openSMS(patient.phoneNumber as string)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]}>
                    <MessageSquare size={18} color="#00A651" />
                  </View>
                  <Text style={styles.actionText}>Message</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {patient.email ? (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => openMail(patient.email as string)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]}>
                  <Mail size={18} color="#00A651" />
                </View>
                <Text style={styles.actionText}>Email</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 3 Tabs Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'general' && [styles.tabButtonActive, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]]}
            onPress={() => setActiveTab('general')}
            activeOpacity={0.7}
          >
            <User size={16} color={activeTab === 'general' ? '#00A651' : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabButtonText, { color: colors.textSecondary }, activeTab === 'general' && styles.tabButtonTextActive]}>
              Général
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'appointments' && [styles.tabButtonActive, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]]}
            onPress={() => setActiveTab('appointments')}
            activeOpacity={0.7}
          >
            <Calendar size={16} color={activeTab === 'appointments' ? '#00A651' : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabButtonText, { color: colors.textSecondary }, activeTab === 'appointments' && styles.tabButtonTextActive]}>
              Rendez-vous
            </Text>
            {appointments.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.cardSecondary }, activeTab === 'appointments' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, { color: colors.textSecondary }, activeTab === 'appointments' && styles.tabBadgeTextActive]}>
                  {appointments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'parcours' && [styles.tabButtonActive, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]]}
            onPress={() => setActiveTab('parcours')}
            activeOpacity={0.7}
          >
            <Clock size={16} color={activeTab === 'parcours' ? '#00A651' : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.tabButtonText, { color: colors.textSecondary }, activeTab === 'parcours' && styles.tabButtonTextActive]}>
              Parcours
            </Text>
            {timelineEvents.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.cardSecondary }, activeTab === 'parcours' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, { color: colors.textSecondary }, activeTab === 'parcours' && styles.tabBadgeTextActive]}>
                  {timelineEvents.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && (
          <View style={styles.tabContent}>
            {/* Identity & Codes */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Identifiants & Contact</Text>
              
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                  <Hash size={18} color="#00A651" />
                </View>
                <View style={styles.infoCol}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Code Patient Interne</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{patient.internalPatientCode || 'N/A'}</Text>
                </View>
              </View>

              {!!patient.externalPatientCode && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                      <Hash size={18} color={colors.textSecondary} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Code Externe</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{patient.externalPatientCode}</Text>
                    </View>
                  </View>
                </>
              )}

              {!!patient.phoneNumber && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                      <Phone size={18} color="#00A651" />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Téléphone</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{patient.phoneNumber}</Text>
                    </View>
                  </View>
                </>
              )}

              {!!patient.email && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                      <Mail size={18} color="#00A651" />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Adresse Email</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{patient.email}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Demographics & Profession */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Démographie & Emploi</Text>

              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                  <Calendar size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date de naissance & Âge</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(patient.birthdate)}
                    {calculatedAge ? ` (${calculatedAge})` : ''}
                  </Text>
                </View>
              </View>

              {!!patient.organisation?.name && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                      <Building size={18} color={colors.textSecondary} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Organisation / Entreprise</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{patient.organisation.name}</Text>
                    </View>
                  </View>
                </>
              )}

              {!!patient.profession?.name && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                      <Briefcase size={18} color={colors.textSecondary} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Profession</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{patient.profession.name}</Text>
                    </View>
                  </View>
                </>
              )}

              {!!patient.residenceLocation?.name && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                      <MapPin size={18} color={colors.textSecondary} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Localisation / Résidence</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{patient.residenceLocation.name}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Visits & Follow-up */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Suivi Clinique</Text>

              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                  <CalendarCheck size={18} color="#00A651" />
                </View>
                <View style={styles.infoCol}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Dernière consultation</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(patient.lastVisit)}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: colors.inputBg }]}>
                  <Clock size={18} color="#3b82f6" />
                </View>
                <View style={styles.infoCol}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Prochain Rendez-vous</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(patient.nextVisit)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <View style={styles.tabContent}>
            {isLoadingAppointments && !appointmentsData ? (
              <View>
                <Skeleton height={90} borderRadius={16} style={{ marginBottom: 12 }} />
                <Skeleton height={90} borderRadius={16} style={{ marginBottom: 12 }} />
              </View>
            ) : appointments.length === 0 ? (
              <View style={[styles.tabEmptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <CalendarCheck size={48} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun rendez-vous</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Ce patient n'a pas encore de rendez-vous programmé.</Text>
              </View>
            ) : (
              appointments.map((apt: any, idx: number) => {
                const isVideo = apt.type === 'video' || apt.locationType === 'video' || apt.locationType === 'both';
                const isConfirmed = apt.status === 'confirmé' || apt.status === 'confirmed';
                const isPending = apt.status === 'en attente' || apt.status === 'pending';

                return (
                  <View key={apt.id || idx} style={[styles.appointmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.aptTopRow}>
                      <View style={styles.aptDateTime}>
                        <Clock size={16} color="#00A651" style={{ marginRight: 6 }} />
                        <Text style={[styles.aptDateText, { color: colors.text }]}>
                          {formatDate(apt.start || apt.date, "dd MMMM yyyy à HH:mm")}
                        </Text>
                      </View>

                      <View style={[
                        styles.aptStatusBadge,
                        isConfirmed ? (isDark ? { backgroundColor: 'rgba(0,166,81,0.15)' } : styles.aptConfirmed) : isPending ? (isDark ? { backgroundColor: 'rgba(245,130,32,0.15)' } : styles.aptPending) : (isDark ? { backgroundColor: '#334155' } : styles.aptCancelled)
                      ]}>
                        <Text style={[
                          styles.aptStatusBadgeText,
                          isConfirmed ? styles.aptConfirmedText : isPending ? styles.aptPendingText : styles.aptCancelledText
                        ]}>
                          {apt.status || 'Programmé'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.aptDetailsRow}>
                      <View style={styles.aptTypeBadge}>
                        {isVideo ? (
                          <>
                            <Video size={14} color="#0284c7" style={{ marginRight: 4 }} />
                            <Text style={[styles.aptTypeText, { color: colors.textSecondary }]}>Téléconsultation</Text>
                          </>
                        ) : (
                          <>
                            <Building size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                            <Text style={[styles.aptTypeText, { color: colors.textSecondary }]}>Au cabinet</Text>
                          </>
                        )}
                      </View>

                      {isVideo && (
                        <TouchableOpacity 
                          style={styles.joinVisioButton}
                          onPress={() => router.push(`/(specialist)/teleconsultation/${apt.id}` as any)}
                          activeOpacity={0.8}
                        >
                          <Video size={14} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={styles.joinVisioText}>Rejoindre</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: PARCOURS & EVALUATIONS (TIMELINE) */}
        {activeTab === 'parcours' && (
          <View style={styles.tabContent}>
            {isLoadingTimeline && !timelineData ? (
              <View>
                <Skeleton height={110} borderRadius={16} style={{ marginBottom: 12 }} />
                <Skeleton height={110} borderRadius={16} style={{ marginBottom: 12 }} />
              </View>
            ) : timelineEvents.length === 0 ? (
              <View style={[styles.tabEmptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FolderOpen size={48} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Parcours vierge</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Aucun événement clinique (dépistage, consultation ou orientation) n'a encore été consigné.</Text>
              </View>
            ) : (
              <View style={styles.timelineContainer}>
                {timelineEvents.map((evt, idx) => {
                  const isEval = evt.type === 'evaluation';
                  const isRef = evt.type === 'referral';
                  const isConsult = evt.type === 'consultation';

                  return (
                    <View key={idx} style={styles.timelineItem}>
                      {/* Timeline Left Line & Bullet */}
                      <View style={styles.timelineLineContainer}>
                        <View style={[
                          styles.timelineBullet,
                          isEval ? styles.bulletEval : isRef ? styles.bulletRef : styles.bulletConsult
                        ]}>
                          {isEval ? (
                            <FileText size={12} color="#ffffff" />
                          ) : isRef ? (
                            <ArrowRightLeft size={12} color="#ffffff" />
                          ) : (
                            <CheckCircle2 size={12} color="#ffffff" />
                          )}
                        </View>
                        {idx < timelineEvents.length - 1 && <View style={[styles.timelineVerticalLine, { backgroundColor: colors.border }]} />}
                      </View>

                      {/* Timeline Card */}
                      <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.timelineCardHeader}>
                          <Text style={[styles.timelineAction, { color: colors.text }]}>{evt.action || 'Événement clinique'}</Text>
                          <Text style={[styles.timelineDate, { color: colors.textSecondary }]}>{formatDate(evt.date, 'dd MMM yyyy')}</Text>
                        </View>

                        {!!evt.acteur && (
                          <Text style={styles.timelineActor}>Par : {evt.acteur}</Text>
                        )}

                        {!!evt.details && (
                          <Text style={[styles.timelineDetails, { color: colors.textSecondary }]}>{evt.details}</Text>
                        )}

                        {!!evt.status && (
                          <View style={[styles.timelineStatusBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <Text style={[styles.timelineStatusText, { color: colors.textSecondary }]}>{evt.status}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#86efac',
  },
  profileHeaderInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  patientSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#ecfdf5',
  },
  statusInactive: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#059669',
  },
  statusInactiveText: {
    color: '#64748b',
  },
  stressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stressBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00A651',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#ecfdf5',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#00A651',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 4,
  },
  tabBadgeActive: {
    backgroundColor: '#86efac',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
  },
  tabBadgeTextActive: {
    color: '#065f46',
  },
  tabContent: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 10,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  aptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aptDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aptDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  aptStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aptConfirmed: {
    backgroundColor: '#ecfdf5',
  },
  aptConfirmedText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  aptPending: {
    backgroundColor: '#fffbeb',
  },
  aptPendingText: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '700',
  },
  aptCancelled: {
    backgroundColor: '#f1f5f9',
  },
  aptCancelledText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  aptStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aptDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aptTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aptTypeText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  joinVisioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinVisioText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLineContainer: {
    alignItems: 'center',
    width: 28,
    marginRight: 10,
  },
  timelineBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  bulletEval: {
    backgroundColor: '#00A651',
  },
  bulletRef: {
    backgroundColor: '#0284c7',
  },
  bulletConsult: {
    backgroundColor: '#8b5cf6',
  },
  timelineVerticalLine: {
    position: 'absolute',
    top: 24,
    bottom: -16,
    width: 2,
    backgroundColor: '#e2e8f0',
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineAction: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
  },
  timelineDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  timelineActor: {
    fontSize: 12,
    color: '#00A651',
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineDetails: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 2,
  },
  timelineStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timelineStatusText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  tabEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
