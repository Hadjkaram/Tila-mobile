import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  ClipboardList, 
  User, 
  Search, 
  UserPlus, 
  Check, 
  Building, 
  Sparkles, 
  X,
  ChevronRight,
  Calendar,
  Phone,
  Mail,
  ChevronDown,
  Brain,
  HeartHandshake,
  Smile
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService, AgentPatient, AgentCentre } from '../../../services/agent';
import { professionalService } from '../../../services/professionals';
import { syncService } from '../../../services/syncService';
import { referentialCache } from '../../../services/referentialCache';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useTheme } from '../../../context/ThemeContext';

export default function SpecialistNewEvaluationScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const initialKey = (Array.isArray(params.key) ? params.key[0] : params.key) || 'ods';

  const [selectedToolKey, setSelectedToolKey] = useState<string>(initialKey);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedCentre, setSelectedCentre] = useState<string>('');
  
  // Center Picker Modal
  const [isCentreModalOpen, setIsCentreModalOpen] = useState(false);
  const [centreSearch, setCentreSearch] = useState('');

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState('');

  // Local & Remote patient results
  const [hybridPatients, setHybridPatients] = useState<AgentPatient[]>([]);

  // New Patient modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newGender, setNewGender] = useState<'M' | 'F'>('M');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newBirthdate, setNewBirthdate] = useState('');

  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatientSearch(patientSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [patientSearch]);

  // 1. Load questionnaires
  const { data: questionnaires = [] } = useQuery({
    queryKey: ['agent_questionnaires'],
    queryFn: () => agentService.getQuestionnaires(),
  });

  // 2. Load centres (with guaranteed offline fallback via /api/me/centres)
  const { data: centres = [] } = useQuery({
    queryKey: ['agent_centres_list'],
    queryFn: () => referentialCache.getCentres(),
  });

  // Set default centre
  useEffect(() => {
    if (centres.length > 0 && !selectedCentre) {
      setSelectedCentre(centres[0].name);
    }
  }, [centres, selectedCentre]);

  // 3. Hybrid Patient Search (Specialist API + Offline Local Cache)
  useEffect(() => {
    let isMounted = true;
    const performSearch = async () => {
      try {
        const results = await referentialCache.searchPatientsUnified(debouncedPatientSearch);
        if (isMounted) {
          setHybridPatients(results);
        }
      } catch (e) {
        console.warn('[SpecialistEvaluationsNew] Erreur recherche patient:', e);
      }
    };

    performSearch();
    return () => { isMounted = false; };
  }, [debouncedPatientSearch]);

  // Get active tool info
  const toolInfo = useMemo(() => {
    const key = selectedToolKey.toLowerCase();
    if (key.includes('berger')) {
      return {
        title: 'Échelle de Berger (VIH)',
        subtitle: 'Évaluation de la stigmatisation liée au VIH',
        icon: HeartHandshake,
        color: '#0284c7',
        bg: '#f0f9ff',
      };
    }
    if (key.includes('sdq')) {
      return {
        title: 'SDQ (Forces et Difficultés)',
        subtitle: 'Évaluation Comportementale Enfants & Ados',
        icon: Smile,
        color: '#8b5cf6',
        bg: '#f5f3ff',
      };
    }
    if (key.includes('pcl')) {
      return {
        title: 'PCL-5 TERRAIN (Trauma & Migrants)',
        subtitle: 'Évaluation TSPT, Dépression & Psychose',
        icon: Brain,
        color: '#ea580c',
        bg: '#fff7ed',
      };
    }
    return {
      title: 'ODS / BMH-MWT',
      subtitle: 'Dépistage des Troubles Mentaux Courants',
      icon: Brain,
      color: '#00A651',
      bg: '#ecfdf5',
    };
  }, [selectedToolKey]);

  // Filtered centres in modal
  const filteredCentres = useMemo(() => {
    if (!centreSearch.trim()) return centres;
    const q = centreSearch.toLowerCase();
    return centres.filter(c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)));
  }, [centres, centreSearch]);

  // Insert patient in cache
  const insertPatientInLocalCache = async (patient: any) => {
    await referentialCache.appendLocalPatient(patient);
    queryClient.setQueryData(['pro_patients_all'], (old: any) => {
      if (!old) return { items: [patient], total: 1 };
      const currentItems = old.items || [];
      const exists = currentItems.some((p: any) => p.id === patient.id);
      if (exists) return old;
      return {
        ...old,
        items: [patient, ...currentItems],
        total: (old.total || currentItems.length) + 1,
      };
    });
  };

  // Create Patient Mutation using professionalService (POST /api/professionals/me/patients)
  const createPatientMutation = useMutation({
    mutationFn: async (payload: { firstName: string; lastName: string; phoneNumber?: string; email?: string; birthdate?: string; gender?: string }) => {
      const isOnline = await syncService.checkConnectivity();
      if (!isOnline) {
        const localPatient: AgentPatient = {
          id: -Date.now(),
          firstName: payload.firstName,
          lastName: payload.lastName,
          phoneNumber: payload.phoneNumber || null,
          email: payload.email || null,
          birthdate: payload.birthdate || null,
        };
        await syncService.addToQueue({
          type: 'CREATE_PATIENT',
          payload,
        });
        return localPatient;
      }
      const res = await professionalService.createPatient({
        firstName: payload.firstName,
        lastName: payload.lastName,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        birthdate: payload.birthdate,
      });
      const created = (res as any).patient || res;
      return {
        id: Number(created.id),
        firstName: created.firstName || payload.firstName,
        lastName: created.lastName || payload.lastName,
        phoneNumber: created.phoneNumber || payload.phoneNumber || null,
        email: created.email || payload.email || null,
        birthdate: created.birthdate || payload.birthdate || null,
        internalPatientCode: created.internalPatientCode || null,
        externalPatientCode: created.externalPatientCode || null,
      };
    },
    onSuccess: async (newPatient) => {
      await insertPatientInLocalCache(newPatient);
      setSelectedPatient(newPatient);
      setIsModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewEmail('');
      setNewBirthdate('');
      Alert.alert('Succès', 'Patient créé et sélectionné !');
    },
    onError: (error: any) => {
      Alert.alert('Erreur', error.message || 'Impossible de créer le patient.');
    },
  });

  const handleSaveNewPatient = () => {
    if (!newFirstName.trim() || !newLastName.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner au minimum le prénom et le nom du patient.');
      return;
    }

    createPatientMutation.mutate({
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      phoneNumber: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      birthdate: newBirthdate.trim() || undefined,
      gender: newGender,
    });
  };

  const handleStartAssessment = () => {
    if (!selectedPatient) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner ou créer un patient.');
      return;
    }

    const resolvedKey = selectedToolKey;

    router.push({
      pathname: '/(specialist)/evaluations/run',
      params: {
        key: resolvedKey,
        patientId: String(selectedPatient.id),
        patientName: selectedPatient.name || `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        centre: selectedCentre,
      },
    } as any);
  };

  const ToolIcon = toolInfo.icon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      {/* Top Header with Back Arrow */}
      <View style={[styles.topBar, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.inputBg }]}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.headerText }]}>Nouvelle évaluation</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Tool Summary Header */}
        <View style={[styles.toolHeaderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.toolIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : toolInfo.bg }]}>
            <ToolIcon size={28} color={toolInfo.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toolTitle, { color: colors.text }]}>{toolInfo.title}</Text>
            <Text style={[styles.toolSubtitle, { color: colors.textSecondary }]}>{toolInfo.subtitle}</Text>
          </View>
        </View>

        {/* 1. SELECTION DU CENTRE */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Building size={18} color="#00A651" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Centre de Santé / Prise en charge</Text>
          </View>

          <TouchableOpacity 
            style={[styles.centreSelectorButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setIsCentreModalOpen(true)}
            activeOpacity={0.7}
          >
            <Building size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <Text style={[styles.centreSelectorText, { color: colors.text }]} numberOfLines={1}>
              {selectedCentre || 'Sélectionner un centre...'}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 2. SELECTION DU PATIENT */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <User size={18} color="#00A651" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient à évaluer</Text>
          </View>

          {/* Selected Patient Card */}
          {selectedPatient ? (
            <View style={[styles.selectedPatientCard, { backgroundColor: isDark ? 'rgba(0, 166, 81, 0.15)' : '#ecfdf5', borderColor: isDark ? '#00A651' : '#86efac' }]}>
              <View style={[styles.selectedPatientAvatar, { backgroundColor: colors.card }]}>
                <User size={22} color="#00A651" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedPatientName, { color: isDark ? '#4ade80' : '#065f46' }]}>
                  {selectedPatient.name || `${selectedPatient.firstName} ${selectedPatient.lastName}`}
                </Text>
                <Text style={[styles.selectedPatientMeta, { color: isDark ? '#86efac' : '#047857' }]}>
                  {selectedPatient.phoneNumber || selectedPatient.email || selectedPatient.internalPatientCode || 'Patient sélectionné'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setSelectedPatient(null)}
                style={styles.removePatientButton}
                activeOpacity={0.7}
              >
                <X size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Search Bar */}
              <View style={[styles.searchBarContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Rechercher par nom, téléphone, code..."
                  placeholderTextColor={colors.textMuted}
                  value={patientSearch}
                  onChangeText={setPatientSearch}
                  autoCapitalize="none"
                />
                {!!patientSearch && (
                  <TouchableOpacity onPress={() => setPatientSearch('')}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Patient Results */}
              <View style={styles.patientResultsList}>
                {hybridPatients.length === 0 ? (
                  <View style={styles.emptyResultsBox}>
                    <Text style={[styles.emptyResultsText, { color: colors.textMuted }]}>
                      {patientSearch ? 'Aucun patient correspondant.' : 'Recherchez un patient existant.'}
                    </Text>
                  </View>
                ) : (
                  hybridPatients.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.patientItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedPatient(p);
                        setPatientSearch('');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.patientAvatarSmall, { backgroundColor: isDark ? 'rgba(0, 166, 81, 0.15)' : '#ecfdf5' }]}>
                        <User size={16} color="#00A651" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.patientItemName, { color: colors.text }]}>{p.firstName} {p.lastName}</Text>
                        <Text style={[styles.patientItemSub, { color: colors.textSecondary }]}>
                          {p.phoneNumber || p.internalPatientCode || p.email || 'Patient'}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* OU Bouton Nouveau Patient */}
              <TouchableOpacity 
                style={[styles.newPatientButton, { backgroundColor: isDark ? 'rgba(0, 166, 81, 0.15)' : '#ecfdf5', borderColor: isDark ? '#00A651' : '#86efac' }]}
                onPress={() => setIsModalOpen(true)}
                activeOpacity={0.8}
              >
                <UserPlus size={18} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={styles.newPatientButtonText}>+ Créer un nouveau patient rapide</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Bouton Démarrer l'Évaluation */}
        <TouchableOpacity
          style={[
            styles.startAssessmentButton,
            (!selectedPatient || !selectedCentre) && styles.buttonDisabled
          ]}
          onPress={handleStartAssessment}
          disabled={!selectedPatient || !selectedCentre}
          activeOpacity={0.8}
        >
          <Sparkles size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.startAssessmentButtonText}>Démarrer l'évaluation</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL 1 : SÉLECTION DU CENTRE */}
      <Modal visible={isCentreModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sélectionner un centre</Text>
              <TouchableOpacity onPress={() => setIsCentreModalOpen(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput 
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Filtrer les centres..."
                placeholderTextColor={colors.textMuted}
                value={centreSearch}
                onChangeText={setCentreSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {filteredCentres.map((c) => (
                <TouchableOpacity
                  key={c.id || c.name}
                  style={[
                    styles.centreItem,
                    { borderBottomColor: colors.border },
                    selectedCentre === c.name && [styles.centreItemSelected, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]
                  ]}
                  onPress={() => {
                    setSelectedCentre(c.name);
                    setIsCentreModalOpen(false);
                  }}
                >
                  <Building size={16} color={selectedCentre === c.name ? '#00A651' : colors.textSecondary} style={{ marginRight: 10 }} />
                  <Text style={[
                    styles.centreItemText,
                    { color: colors.text },
                    selectedCentre === c.name && styles.centreItemTextSelected
                  ]}>
                    {c.name} {c.careLevel ? `(${c.careLevel})` : ''}
                  </Text>
                  {selectedCentre === c.name && <Check size={18} color="#00A651" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2 : NOUVEAU PATIENT RAPIDE */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau Patient Rapide</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Prénom *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Ex: Moussa"
                placeholderTextColor={colors.textMuted}
                value={newFirstName}
                onChangeText={setNewFirstName}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Ex: Koné"
                placeholderTextColor={colors.textMuted}
                value={newLastName}
                onChangeText={setNewLastName}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sexe</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity 
                  style={[
                    styles.genderButton,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    newGender === 'M' && [styles.genderButtonActive, { backgroundColor: isDark ? 'rgba(0,166,81,0.2)' : '#ecfdf5' }]
                  ]}
                  onPress={() => setNewGender('M')}
                >
                  <Text style={[styles.genderText, { color: colors.textSecondary }, newGender === 'M' && styles.genderTextActive]}>Masculin</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.genderButton,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    newGender === 'F' && [styles.genderButtonActive, { backgroundColor: isDark ? 'rgba(0,166,81,0.2)' : '#ecfdf5' }]
                  ]}
                  onPress={() => setNewGender('F')}
                >
                  <Text style={[styles.genderText, { color: colors.textSecondary }, newGender === 'F' && styles.genderTextActive]}>Féminin</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Téléphone</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Ex: 0707070707"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Ex: patient@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date de naissance (AAAA-MM-JJ)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Ex: 1990-05-14"
                placeholderTextColor={colors.textMuted}
                value={newBirthdate}
                onChangeText={setNewBirthdate}
              />

              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleSaveNewPatient}
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveModalButtonText}>Enregistrer et continuer</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 6,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  toolHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  toolSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  centreSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  centreSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  selectedPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  selectedPatientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedPatientName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#065f46',
  },
  selectedPatientMeta: {
    fontSize: 12,
    color: '#047857',
  },
  removePatientButton: {
    padding: 6,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  patientResultsList: {
    maxHeight: 180,
    marginBottom: 12,
  },
  emptyResultsBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  patientAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  patientItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  patientItemSub: {
    fontSize: 12,
    color: '#64748b',
  },
  newPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  newPatientButtonText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#00A651',
  },
  startAssessmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  startAssessmentButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  centreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  centreItemSelected: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  centreItemText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  centreItemTextSelected: {
    fontWeight: 'bold',
    color: '#00A651',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#00A651',
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  genderTextActive: {
    color: '#00A651',
    fontWeight: 'bold',
  },
  saveModalButton: {
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveModalButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
