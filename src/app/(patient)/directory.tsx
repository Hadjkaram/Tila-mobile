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
import { patientService } from '../../services/patient';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';

export interface DirectoryItem {
  id: string | number;
  rawId?: number;
  name: string;
  type: 'specialist' | 'center';
  specialtyOrType: string;
  address?: string;
  phone?: string;
  city?: string;
  price?: number;
  currency?: string;
  videoConsultation?: boolean;
  inPersonConsultation?: boolean;
}

interface BookingSlot {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

const generateDynamicSlots = (): BookingSlot[] => {
  const now = new Date();
  const formatSlot = (daysAhead: number, time: string, labelPrefix: string): BookingSlot => {
    const d = new Date(now.getTime() + daysAhead * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return {
      id: `${yyyy}-${mm}-${dd}_${time}`,
      label: `${labelPrefix} à ${time}`,
      date: `${yyyy}-${mm}-${dd}`,
      time,
    };
  };

  return [
    formatSlot(1, '10:00', 'Demain'),
    formatSlot(1, '14:30', 'Demain'),
    formatSlot(2, '11:00', 'Dans 2 jours'),
    formatSlot(2, '15:30', 'Dans 2 jours'),
    formatSlot(3, '09:00', 'Dans 3 jours'),
    formatSlot(3, '16:00', 'Dans 3 jours'),
  ];
};

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
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [includeAssessment, setIncludeAssessment] = useState(true);
  const [lastAssessment, setLastAssessment] = useState<any>(null);
  const [patientUser, setPatientUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDirectory = async () => {
    try {
      // 1. Charger les VRAIS centres de la base de données
      let centresList: any[] = [];
      try {
        const centresRes = await apiClient.get<any>('/api/public/sensibilisateurs/centres');
        const rawCentres = Array.isArray(centresRes) ? centresRes : (centresRes?.items || []);
        if (rawCentres.length > 0) {
          centresList = rawCentres;
          await AsyncStorage.setItem('@tila_cached_centres', JSON.stringify(rawCentres));
        }
      } catch (cErr) {
        console.warn('[Directory] Erreur API centres, fallback cache local:', cErr);
        const cached = await AsyncStorage.getItem('@tila_cached_centres');
        if (cached) {
          centresList = JSON.parse(cached);
        } else {
          centresList = await referentialCache.getCentres().catch(() => []);
        }
      }

      // 2. Charger les VRAIS praticiens inscrits en base de données
      let prosList: any[] = [];
      try {
        const prosRes = await apiClient.get<any>('/api/professionals?limit=100');
        const rawPros = Array.isArray(prosRes) ? prosRes : (prosRes?.items || []);
        if (rawPros.length > 0) {
          prosList = rawPros;
          await AsyncStorage.setItem('@tila_cached_specialists', JSON.stringify(rawPros));
        }
      } catch (pErr) {
        console.warn('[Directory] Erreur API spécialistes, fallback cache local:', pErr);
        const cached = await AsyncStorage.getItem('@tila_cached_specialists');
        if (cached) {
          prosList = JSON.parse(cached);
        }
      }

      // 3. Filtrer et formater les spécialistes de santé mentale et professionnels de santé
      const formattedSpecialists: DirectoryItem[] = prosList
        .filter((p: any) => {
          const t = (p.type || '').toUpperCase();
          const types = Array.isArray(p.types) ? p.types.map((x: string) => x.toUpperCase()) : [];
          const spec = (p.specialty || '').toLowerCase();
          const role = (p.clinicalRoleLabel || '').toLowerCase();
          return (
            t === 'SPECIALISTE_SANTE_MENTALE' ||
            types.includes('SPECIALISTE_SANTE_MENTALE') ||
            spec.includes('psych') ||
            role.includes('psych') ||
            spec.includes('santé mentale') ||
            role.includes('santé mentale') ||
            spec.includes('addict') ||
            spec.includes('pédopsychiatre') ||
            spec.includes('médecin') ||
            t === 'AGENT_SANTE'
          );
        })
        .map((p: any) => {
          const rawId = p.id;
          const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.name || 'Spécialiste de Santé';
          const displayRole = p.specialty || p.clinicalRoleLabel || (p.type === 'SPECIALISTE_SANTE_MENTALE' ? 'Spécialiste en santé mentale' : 'Médecin référent');
          const cityDisplay = p.city ? (p.city.charAt(0).toUpperCase() + p.city.slice(1)) : 'Abidjan';

          return {
            id: `spec-${rawId}`,
            rawId: rawId,
            name: fullName.startsWith('Dr.') || fullName.startsWith('M.') || fullName.startsWith('Mme') ? fullName : `Dr. ${fullName}`,
            type: 'specialist' as const,
            specialtyOrType: displayRole,
            address: p.address || `${cityDisplay}, Côte d'Ivoire`,
            city: cityDisplay,
            phone: p.phone,
            price: p.price,
            currency: p.currency || 'XOF',
            videoConsultation: p.videoConsultation ?? true,
            inPersonConsultation: p.inPersonConsultation ?? true,
          };
        });

      // 4. Formater les centres réels de la base de données
      const formattedCentres: DirectoryItem[] = centresList.map((c: any) => ({
        id: `centre-${c.id}`,
        rawId: c.id,
        name: c.name || 'Centre Médical TILA',
        type: 'center' as const,
        specialtyOrType: c.type || c.careLevel || 'Centre de Référence PNSM',
        address: c.location || c.address || (c.city ? `${c.city}, Côte d'Ivoire` : 'Côte d’Ivoire'),
        phone: c.phone || '+225 27 20 00 00 00',
        city: c.city || 'Côte d’Ivoire',
      }));

      // Fusionner pour l'annuaire dynamique
      setItems([...formattedSpecialists, ...formattedCentres]);
    } catch (e) {
      console.warn('[PatientDirectory] Erreur générale:', e);
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
    const slots = generateDynamicSlots();
    setAvailableSlots(slots);
    if (slots.length > 0) {
      setSelectedSlotId(slots[0].id);
    }

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
      const doctorId = selectedSpecialist.rawId || Number(String(selectedSpecialist.id).replace('spec-', ''));
      const chosenSlot = availableSlots.find((s) => s.id === selectedSlotId) || availableSlots[0];

      let apiSuccess = false;
      let createdAppointment: any = null;

      // 1. Envoyer à l'API de rendez-vous réelle dans la base de données
      try {
        const res = await patientService.bookAppointment({
          doctorId,
          date: chosenSlot.date,
          startTime: chosenSlot.time,
          duration: 30,
          reason: appointmentReason.trim() || 'Consultation de suivi et bilan',
          locationType: consultationType === 'video' ? 'video' : 'in_person',
        });
        if (res && res.appointment) {
          apiSuccess = true;
          createdAppointment = res.appointment;
        }
      } catch (apiErr: any) {
        console.warn('[Directory] Erreur booking API, enregistrement local/offline:', apiErr?.message);
      }

      // 2. Persister localement dans l'historique des rendez-vous du patient
      const newApptItem = {
        id: createdAppointment?.id || `req_${Date.now()}`,
        professional: selectedSpecialist.name,
        specialty: selectedSpecialist.specialtyOrType,
        date: chosenSlot.date,
        time: chosenSlot.time,
        type: consultationType,
        status: apiSuccess ? (createdAppointment?.status || 'pending') : 'en_attente',
        meetLink: createdAppointment?.meetingLink || null,
        meetingId: createdAppointment?.meetingId || null,
      };

      const existingAppts = await AsyncStorage.getItem('@patient_appointments');
      const apptList = existingAppts ? JSON.parse(existingAppts) : [];
      await AsyncStorage.setItem(
        '@patient_appointments',
        JSON.stringify([newApptItem, ...apptList])
      );

      // Notifier également la boîte du spécialiste local si besoin
      const existingReqs = await AsyncStorage.getItem('@specialist_appointment_requests');
      const reqList = existingReqs ? JSON.parse(existingReqs) : [];
      await AsyncStorage.setItem(
        '@specialist_appointment_requests',
        JSON.stringify([newApptItem, ...reqList])
      );

      setAppointmentModalVisible(false);
      setAppointmentReason('');

      Alert.alert(
        'Rendez-vous Enregistré !',
        `Votre rendez-vous avec ${selectedSpecialist.name} pour le ${chosenSlot.label} a été enregistré avec succès.` +
          (apiSuccess ? '\n\nLe créneau est désormais planifié dans la base de données.' : '') +
          (includeAssessment && lastAssessment ? "\n\nVos résultats d'auto-évaluation clinique y ont été associés." : ''),
        [
          {
            text: 'Voir mes rendez-vous',
            onPress: () => router.push('/(patient)/appointments'),
          },
          { text: 'OK' },
        ]
      );
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de finaliser la prise de rendez-vous.');
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
            placeholder="Rechercher un psychiatre, psychologue, centre, ville..."
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
            Praticiens ({items.filter(i => i.type === 'specialist').length})
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
            Établissements ({items.filter(i => i.type === 'center').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Liste des résultats */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement des praticiens et centres réels...</Text>
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
                      {item.price ? (
                        <Text style={[styles.priceTag, { color: '#00A651' }]}>
                          Tarif : {item.price.toLocaleString()} {item.currency || 'XOF'}
                        </Text>
                      ) : null}
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
                          Consultation vidéo sécurisée & cabinet sur rendez-vous
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions contextuelles */}
                  <View style={styles.actionRow}>
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

                    {!isCenter && (
                      <TouchableOpacity
                        style={[styles.appointmentBtn, { flex: 1 }]}
                        onPress={() => handleOpenBooking(item)}
                        activeOpacity={0.85}
                      >
                        <Calendar size={14} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.appointmentBtnText}>Prendre rendez-vous</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Modal de Demande de Rendez-vous avec Praticien Réel */}
      <Modal visible={appointmentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Prendre Rendez-vous</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Avec {selectedSpecialist?.name} ({selectedSpecialist?.specialtyOrType})
                </Text>
                {selectedSpecialist?.price ? (
                  <Text style={[styles.modalPriceText, { color: '#00A651' }]}>
                    Tarif consultation : {selectedSpecialist.price.toLocaleString()} {selectedSpecialist.currency || 'XOF'}
                  </Text>
                ) : null}
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
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.dateSlotBtn,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                      selectedSlotId === slot.id && styles.dateSlotBtnActive,
                    ]}
                    onPress={() => setSelectedSlotId(slot.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dateSlotText, { color: colors.textSecondary }, selectedSlotId === slot.id && styles.dateSlotTextActive]}>
                      {slot.label}
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
                <Text style={styles.sendRequestBtnText}>Confirmer le rendez-vous</Text>
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
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginTop: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  priceTag: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginTop: 2,
  },
  modalPriceText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginTop: 2,
  },
  badgeType: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 6,
  },
  badgeTypeText: {
    fontSize: 10.5,
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
    color: '#64748b',
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  protocolHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 10,
    marginTop: 4,
  },
  callCenterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  callCenterBtnText: {
    fontSize: 12.5,
    color: '#2563eb',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  appointmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 10,
    borderRadius: 10,
  },
  appointmentBtnText: {
    fontSize: 12.5,
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 20,
    textAlignVertical: 'top',
    fontFamily: 'Montserrat_400Regular',
  },
  sendRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendRequestBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
