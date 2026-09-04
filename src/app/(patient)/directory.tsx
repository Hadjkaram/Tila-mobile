import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2,
  Search,
  Phone,
  MapPin,
  Stethoscope,
  User,
  Calendar,
  Clock,
  Video,
  X,
  Send,
  CheckCircle2,
  Sparkles,
  ClipboardList,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { referentialCache } from '../../services/referentialCache';
import { useTheme } from '../../context/ThemeContext';

interface DirectoryItem {
  id: string | number;
  name: string;
  type: 'specialist' | 'center';
  specialtyOrType: string;
  address?: string;
  phone?: string;
  city?: string;
}

export default function PatientDirectory() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'specialist' | 'center'>('all');
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // État Prise de Rendez-vous
  const [selectedSpecialist, setSelectedSpecialist] = useState<DirectoryItem | null>(null);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [consultationType, setConsultationType] = useState<'video' | 'in-person'>('video');
  const [appointmentDate, setAppointmentDate] = useState('Demain à 10:00');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [includeAssessment, setIncludeAssessment] = useState(true);
  const [lastAssessment, setLastAssessment] = useState<any>(null);
  const [patientUser, setPatientUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDirectory = async () => {
    try {
      // Récupération des centres
      const centres = await referentialCache.getCentres();

      const directoryList: DirectoryItem[] = [
        // Spécialistes agréés TILA
        {
          id: 'spec-1',
          name: 'Dr. Marc Kouamé',
          type: 'specialist',
          specialtyOrType: 'Psychiatre Adulte',
          address: 'CHU de Cocody, Abidjan',
          city: 'Abidjan',
        },
        {
          id: 'spec-2',
          name: 'Mme Aminata Traoré',
          type: 'specialist',
          specialtyOrType: 'Psychologue Clinicienne',
          address: 'Centre Médical TILA Plateau',
          city: 'Abidjan',
        },
        {
          id: 'spec-3',
          name: 'Dr. Jean-Yves Yao',
          type: 'specialist',
          specialtyOrType: 'Pédopsychiatre',
          address: 'Hôpital Général de Bouaké',
          city: 'Bouaké',
        },
        {
          id: 'spec-4',
          name: 'Dr. Fatou Bamba',
          type: 'specialist',
          specialtyOrType: 'Médecin Généraliste Référent',
          address: 'Centre de Santé Urbain Treichville',
          city: 'Abidjan',
        },
        // Centres partenaires TILA
        ...centres.map((c: any) => ({
          id: c.id || c.code || Math.random(),
          name: c.name || 'Centre de Santé Partenaire',
          type: 'center' as const,
          specialtyOrType: c.type || 'Centre de Santé Urbain',
          address: c.location || c.address || 'Côte d’Ivoire',
          phone: c.phone || '+225 27 20 00 00 00',
          city: c.city || 'Abidjan',
        })),
      ];

      setItems(directoryList);
    } catch (e) {
      console.warn('[PatientDirectory] Erreur:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadContext = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('tila_user_context');
        if (storedUser) {
          setPatientUser(JSON.parse(storedUser));
        }

        const storedAssessment = await AsyncStorage.getItem('@patient_last_self_assessment');
        if (storedAssessment) {
          setLastAssessment(JSON.parse(storedAssessment));
        }
      } catch {}
    };

    loadContext();
    loadDirectory();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDirectory();
  };

  const handleCallCenter = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber.replace(/\s+/g, '')}`).catch(() => {
        Alert.alert('Erreur', 'Impossible de composer le numéro.');
      });
    }
  };

  const handleOpenBooking = async (item: DirectoryItem) => {
    setSelectedSpecialist(item);
    // Rafraîchir l'auto-évaluation la plus récente
    try {
      const storedAssessment = await AsyncStorage.getItem('@patient_last_self_assessment');
      if (storedAssessment) {
        setLastAssessment(JSON.parse(storedAssessment));
        setIncludeAssessment(true);
      }
    } catch {}
    setAppointmentModalVisible(true);
  };

  const handleSendAppointmentRequest = async () => {
    if (!selectedSpecialist) return;
    setIsSubmitting(true);

    try {
      const pName = [patientUser?.firstName, patientUser?.lastName].filter(Boolean).join(' ') ||
        patientUser?.name || 'Patient TILA';
      const pPhone = patientUser?.phoneNumber || '0101594153';

      const newRequest = {
        id: `req_${Date.now()}`,
        patientId: patientUser?.id || 'pat_me',
        patientName: pName,
        patientPhone: pPhone,
        practitionerId: selectedSpecialist.id,
        practitionerName: selectedSpecialist.name,
        specialty: selectedSpecialist.specialtyOrType,
        date: appointmentDate,
        time: appointmentDate.includes('à') ? appointmentDate.split('à')[1].trim() : '10:00',
        type: consultationType,
        reason: appointmentReason.trim() || 'Consultation de suivi et bilan',
        status: 'en_attente',
        createdAt: new Date().toISOString(),
        // DONNÉES D'ÉVALUATION FAITE PAR LE PATIENT LUI-MÊME
        selfAssessment: includeAssessment && lastAssessment ? {
          tool: lastAssessment.type,
          score: lastAssessment.score,
          level: lastAssessment.level,
          interpretation: lastAssessment.interpretation,
          date: lastAssessment.date,
        } : null,
      };

      // 1. Enregistrer dans la boîte de réception des spécialistes
      const existingReqs = await AsyncStorage.getItem('@specialist_appointment_requests');
      const reqList = existingReqs ? JSON.parse(existingReqs) : [];
      await AsyncStorage.setItem(
        '@specialist_appointment_requests',
        JSON.stringify([newRequest, ...reqList])
      );

      // 2. Enregistrer également dans les rendez-vous du patient
      const existingAppts = await AsyncStorage.getItem('@patient_appointments');
      const apptList = existingAppts ? JSON.parse(existingAppts) : [];
      await AsyncStorage.setItem(
        '@patient_appointments',
        JSON.stringify([
          {
            id: newRequest.id,
            professional: selectedSpecialist.name,
            specialty: selectedSpecialist.specialtyOrType,
            date: newRequest.date,
            time: newRequest.time,
            type: consultationType === 'video' ? 'video' : 'in-person',
            status: 'en_attente',
          },
          ...apptList,
        ])
      );

      setAppointmentModalVisible(false);
      setAppointmentReason('');

      Alert.alert(
        'Demande de Rendez-vous Envoyée !',
        `Votre demande a été transmise au ${selectedSpecialist.name}.\n\n` +
          (includeAssessment && lastAssessment
            ? `Vos résultats d'auto-évaluation (${lastAssessment.type} - Score: ${lastAssessment.score}) lui ont été attachés avec succès.`
            : '') +
          `\nLe praticien l'examinera dans son tableau de bord et vous confirmera le créneau.`,
        [
          {
            text: 'Voir mes rendez-vous',
            onPress: () => router.push('/(patient)/appointments'),
          },
          { text: 'OK' },
        ]
      );
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de transmettre la demande de rendez-vous.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter !== 'all' && item.type !== activeFilter) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSpec = item.specialtyOrType.toLowerCase().includes(q);
      const matchAddr = (item.address || '').toLowerCase().includes(q);
      return matchName || matchSpec || matchAddr;
    }
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      {/* 1. Barre de Recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}>
          <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher un médecin, centre, ville..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* 2. Filtres rapides */}
      <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
            activeFilter === 'all' && styles.filterBtnActive,
          ]}
          onPress={() => setActiveFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterBtnText, { color: colors.textSecondary }, activeFilter === 'all' && styles.filterBtnTextActive]}>
            Tous ({items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
            activeFilter === 'specialist' && styles.filterBtnActive,
          ]}
          onPress={() => setActiveFilter('specialist')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterBtnText, { color: colors.textSecondary }, activeFilter === 'specialist' && styles.filterBtnTextActive]}>
            Praticiens
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
            activeFilter === 'center' && styles.filterBtnActive,
          ]}
          onPress={() => setActiveFilter('center')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterBtnText, { color: colors.textSecondary }, activeFilter === 'center' && styles.filterBtnTextActive]}>
            Établissements
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Liste des résultats */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Recherche des praticiens et structures...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00A651" />
          }
        >
          {filteredItems.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Building2 size={44} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun résultat trouvé</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Essayez un autre mot-clé ou modifiez les filtres de recherche.
              </Text>
            </View>
          ) : (
            filteredItems.map((item, index) => {
              const isCenter = item.type === 'center';

              return (
                <View key={item.id || index} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: isCenter ? (isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff') : (isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5') },
                      ]}
                    >
                      {isCenter ? (
                        <Building2 size={20} color="#2563eb" />
                      ) : (
                        <Stethoscope size={20} color="#00A651" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.itemSpecialty, { color: colors.textSecondary }]}>{item.specialtyOrType}</Text>
                    </View>
                    <View
                      style={[
                        styles.badgeType,
                        { backgroundColor: isCenter ? (isDark ? colors.cardSecondary : '#f1f5f9') : (isDark ? 'rgba(0,166,81,0.2)' : '#dcfce7') },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeTypeText,
                          { color: isCenter ? (isDark ? colors.textSecondary : '#475569') : (isDark ? '#4ade80' : '#15803d') },
                        ]}
                      >
                        {isCenter ? 'Centre' : 'Praticien Agréé'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsBlock}>
                    {item.address ? (
                      <View style={styles.detailRow}>
                        <MapPin size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>{item.address}</Text>
                      </View>
                    ) : null}

                    {/* Le numéro de téléphone n'est affiché QUE pour les centres d'accueil publics, JAMAIS pour les praticiens en accès libre */}
                    {isCenter && item.phone ? (
                      <View style={styles.detailRow}>
                        <Phone size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>Accueil : {item.phone}</Text>
                      </View>
                    ) : null}

                    {!isCenter && (
                      <View style={styles.protocolHintRow}>
                        <CheckCircle2 size={13} color="#00A651" style={{ marginRight: 5 }} />
                        <Text style={[styles.protocolHintText, { color: isDark ? '#4ade80' : '#15803d' }]}>
                          Prise de rendez-vous obligatoire pour consultation & suivi
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions contextuelles */}
                  <View style={styles.actionRow}>
                    {/* Les centres ont le bouton d'appel d'accueil */}
                    {isCenter && item.phone && (
                      <TouchableOpacity
                        style={[styles.callCenterBtn, { backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff', borderColor: isDark ? '#2563eb' : '#bfdbfe' }]}
                        onPress={() => handleCallCenter(item.phone)}
                        activeOpacity={0.8}
                      >
                        <Phone size={14} color="#2563eb" style={{ marginRight: 6 }} />
                        <Text style={styles.callCenterBtnText}>Appeler l'accueil</Text>
                      </TouchableOpacity>
                    )}

                    {/* Les praticiens ont le bouton principal de prise de rendez-vous */}
                    <TouchableOpacity
                      style={[styles.appointmentBtn, !isCenter && { flex: 1 }]}
                      onPress={() => handleOpenBooking(item)}
                      activeOpacity={0.85}
                    >
                      <Calendar size={14} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.appointmentBtnText}>Prendre rendez-vous</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal de Demande de Rendez-vous avec Praticien */}
      <Modal visible={appointmentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Demande de Rendez-vous</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Avec {selectedSpecialist?.name} ({selectedSpecialist?.specialtyOrType})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAppointmentModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type de Consultation */}
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Type de consultation</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    consultationType === 'video' && (isDark ? { backgroundColor: 'rgba(0,166,81,0.2)', borderColor: '#00A651' } : styles.typeOptionActive),
                  ]}
                  onPress={() => setConsultationType('video')}
                  activeOpacity={0.8}
                >
                  <Video size={16} color={consultationType === 'video' ? '#00A651' : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.typeOptionText, { color: colors.textSecondary }, consultationType === 'video' && styles.typeOptionTextActive]}>
                    Téléconsultation
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                    consultationType === 'in-person' && (isDark ? { backgroundColor: 'rgba(0,166,81,0.2)', borderColor: '#00A651' } : styles.typeOptionActive),
                  ]}
                  onPress={() => setConsultationType('in-person')}
                  activeOpacity={0.8}
                >
                  <MapPin size={16} color={consultationType === 'in-person' ? '#00A651' : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[styles.typeOptionText, { color: colors.textSecondary }, consultationType === 'in-person' && styles.typeOptionTextActive]}>
                    En Présentiel
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Créneau suggéré */}
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Date et créneau souhaité</Text>
              <View style={styles.dateSelectorRow}>
                {['Demain à 10:00', 'Dans 2 jours à 14:30', 'Dans 3 jours à 16:00'].map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.dateSlotBtn,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                      appointmentDate === slot && styles.dateSlotBtnActive,
                    ]}
                    onPress={() => setAppointmentDate(slot)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dateSlotText, { color: colors.textSecondary }, appointmentDate === slot && styles.dateSlotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* DONNÉES D'AUTO-ÉVALUATION DU PATIENT */}
              {lastAssessment && (
                <View style={[styles.assessmentAttachCard, isDark && { backgroundColor: 'rgba(0,166,81,0.15)', borderColor: '#00A651' }]}>
                  <View style={styles.assessmentAttachHeader}>
                    <Sparkles size={16} color="#00A651" style={{ marginRight: 6 }} />
                    <Text style={styles.assessmentAttachTitle}>Auto-évaluation récente disponible</Text>
                  </View>
                  <Text style={[styles.assessmentAttachSub, isDark && { color: '#86efac' }]}>
                    Vous avez réalisé un test {lastAssessment.type} le {lastAssessment.date} avec un score de {lastAssessment.score} ({lastAssessment.level}).
                  </Text>

                  <TouchableOpacity
                    style={styles.toggleAttachRow}
                    onPress={() => setIncludeAssessment((p) => !p)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkboxSquare, includeAssessment && styles.checkboxSquareChecked]}>
                      {includeAssessment && <CheckCircle2 size={16} color="#ffffff" />}
                    </View>
                    <Text style={[styles.toggleAttachText, { color: colors.text }]}>
                      Transmettre ces résultats au praticien pour préparer la consultation
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Motif / Message */}
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Motif ou message pour le médecin (optionnel)</Text>
              <TextInput
                style={[styles.reasonInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Ex: Éprouve des troubles du sommeil et anxiété, suite à mon auto-évaluation..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={appointmentReason}
                onChangeText={setAppointmentReason}
              />

              {/* Bouton Envoyer la demande */}
              <TouchableOpacity
                style={styles.sendRequestBtn}
                onPress={handleSendAppointmentRequest}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                ) : (
                  <Send size={16} color="#ffffff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.sendRequestBtnText}>Envoyer la demande au praticien</Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    fontFamily: 'Montserrat_400Regular',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnActive: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
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
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  itemSpecialty: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  badgeType: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTypeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  detailsBlock: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Montserrat_400Regular',
  },
  protocolHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  protocolHintText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  callCenterBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Montserrat_700Bold',
  },
  appointmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  appointmentBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
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
  modalBody: {
    padding: 20,
    paddingBottom: 36,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  typeOptionActive: {
    borderColor: '#00A651',
    backgroundColor: '#ecfdf5',
  },
  typeOptionText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  typeOptionTextActive: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  dateSelectorRow: {
    gap: 8,
    marginBottom: 16,
  },
  dateSlotBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateSlotBtnActive: {
    borderColor: '#00A651',
    backgroundColor: '#f0fdf4',
  },
  dateSlotText: {
    fontSize: 12.5,
    color: '#334155',
    fontFamily: 'Montserrat_500Medium',
  },
  dateSlotTextActive: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  assessmentAttachCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  assessmentAttachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assessmentAttachTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803d',
    fontFamily: 'Montserrat_700Bold',
  },
  assessmentAttachSub: {
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
    marginBottom: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  toggleAttachRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxSquareChecked: {
    borderColor: '#00A651',
    backgroundColor: '#00A651',
  },
  toggleAttachText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  reasonInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 12.5,
    color: '#0f172a',
    textAlignVertical: 'top',
    height: 70,
    marginBottom: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  sendRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendRequestBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
});
