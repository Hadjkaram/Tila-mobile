import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  User,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { patientService, AppointmentItem } from '../../services/patient';

export default function PatientAppointments() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [pastAppointments, setPastAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  const fetchAppointments = async () => {
    try {
      const [upRes, pastRes] = await Promise.allSettled([
        patientService.upcomingAppointments(),
        patientService.pastAppointments(1, 20),
      ]);

      if (upRes.status === 'fulfilled') {
        const upArr = Array.isArray(upRes.value) ? upRes.value : [];
        setUpcomingAppointments(upArr);
      }
      if (pastRes.status === 'fulfilled') {
        const pastArr = pastRes.value?.items || [];
        setPastAppointments(pastArr);
      }
    } catch (e) {
      console.warn('[PatientAppointments] Erreur:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAppointments();
  };

  const currentList = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'confirmed':
        return { bg: '#ecfdf5', text: '#00A651', label: 'Confirmé' };
      case 'pending':
        return { bg: '#fef3c7', text: '#d97706', label: 'En attente' };
      case 'completed':
        return { bg: '#f1f5f9', text: '#64748b', label: 'Terminé' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#dc2626', label: 'Annulé' };
      default:
        return { bg: '#ecfdf5', text: '#00A651', label: 'Confirmé' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 1. Onglets Segmentés (À venir / Historique) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabBtnText, activeTab === 'upcoming' && styles.tabBtnTextActive]}>
            À venir ({upcomingAppointments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'past' && styles.tabBtnActive]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabBtnText, activeTab === 'past' && styles.tabBtnTextActive]}>
            Historique ({pastAppointments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Liste des Rendez-vous */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={styles.loadingText}>Chargement de vos rendez-vous...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00A651" />
          }
        >
          {currentList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Calendar size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'upcoming'
                  ? 'Planifiez une consultation avec un spécialiste de santé mentale TILA.'
                  : 'Vos consultations précédentes apparaîtront ici.'}
              </Text>

              {activeTab === 'upcoming' && (
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => setBookingModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Calendar size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>Prendre un rendez-vous</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            currentList.map((item, index) => {
              const status = getStatusBadge(item.status);
              const isVideo = item.type !== 'in-person';

              return (
                <View key={item.id || index} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.doctorAvatar}>
                      <Text style={styles.doctorInitials}>
                        {item.professional ? item.professional.substring(0, 2).toUpperCase() : 'DR'}
                      </Text>
                    </View>
                    <View style={styles.doctorInfo}>
                      <Text style={styles.doctorName}>{item.professional || 'Praticien de santé'}</Text>
                      <Text style={styles.doctorSpecialty}>{item.specialty || 'Santé mentale'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDetailsRow}>
                    <View style={styles.detailItem}>
                      <Calendar size={14} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.detailText}>{item.date || 'Date non fixée'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Clock size={14} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.detailText}>{item.time || '10:00'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      {isVideo ? (
                        <Video size={14} color="#2563eb" style={{ marginRight: 4 }} />
                      ) : (
                        <MapPin size={14} color="#00A651" style={{ marginRight: 4 }} />
                      )}
                      <Text style={[styles.detailText, isVideo && { color: '#2563eb', fontWeight: '600' }]}>
                        {isVideo ? 'Téléconsultation' : 'Présentiel'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions contextuelles */}
                  {activeTab === 'upcoming' && isVideo && (
                    <TouchableOpacity
                      style={styles.joinVideoBtn}
                      onPress={() => router.push('/(patient)/teleconsultation')}
                      activeOpacity={0.85}
                    >
                      <Video size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.joinVideoBtnText}>Rejoindre la téléconsultation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal de Demande de Rendez-vous */}
      <Modal visible={bookingModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nouveau Rendez-vous</Text>
                <Text style={styles.modalSubtitle}>Choisissez un spécialiste disponible</Text>
              </View>
              <TouchableOpacity
                onPress={() => setBookingModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalInfoText}>
                Pour programmer votre consultation, vous pouvez contacter directement l'un des spécialistes du réseau TILA ou vous adresser à votre agent de santé référent.
              </Text>

              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => {
                  setBookingModalVisible(false);
                  router.push('/(patient)/directory');
                }}
                activeOpacity={0.85}
              >
                <User size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.modalActionBtnText}>Consulter l'annuaire des praticiens</Text>
              </TouchableOpacity>
            </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 12,
  },
  centered: {
    flex: 1,
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
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
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 10,
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
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  joinVideoBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  fabBtn: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#00A651',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    fontSize: 17,
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
  modalBody: {
    padding: 20,
  },
  modalInfoText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
