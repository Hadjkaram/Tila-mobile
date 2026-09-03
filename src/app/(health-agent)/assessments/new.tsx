import React, { useState, useEffect } from 'react';
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
  Phone
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService, AgentPatient, AgentQuestionnaireItem, AgentCentre } from '../../../services/agent';
import { syncService } from '../../../services/syncService';
import { referentialCache } from '../../../services/referentialCache';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function NewAssessmentScreen() {
  const router = useRouter();

  // State
  const [selectedQuestionnaireKey, setSelectedQuestionnaireKey] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<AgentPatient | null>(null);
  const [selectedCentre, setSelectedCentre] = useState<string>('');

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState('');
  const [hybridPatients, setHybridPatients] = useState<AgentPatient[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);

  // New Patient modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBirthdate, setNewBirthdate] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPatientSearch(patientSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [patientSearch]);

  // Queries
  const { data: questionnaires = [], isLoading: isLoadingQ } = useQuery({
    queryKey: ['agent_questionnaires'],
    queryFn: () => agentService.getQuestionnaires(),
  });

  // Centres with safe local fallback
  const { data: centres = [] } = useQuery({
    queryKey: ['agent_centres_list'],
    queryFn: () => referentialCache.getCentres(),
  });

  // Hybrid Patient Search Effect
  useEffect(() => {
    let isMounted = true;
    const performSearch = async () => {
      const q = debouncedPatientSearch.trim();
      const isOnline = await syncService.checkConnectivity();

      if (q.length >= 2) {
        setIsSearchingPatients(true);
        if (isOnline) {
          try {
            const apiResults = await agentService.searchPatients(q, 20);
            if (isMounted && apiResults && apiResults.length > 0) {
              await referentialCache.cacheAllPatients(apiResults);
              setHybridPatients(apiResults);
              setIsSearchingPatients(false);
              return;
            }
          } catch {}
        }
      }

      // Offline or fallback to local permanent cache
      const localResults = await referentialCache.searchLocalPatients(q);
      if (isMounted) {
        setHybridPatients(localResults);
        setIsSearchingPatients(false);
      }
    };

    performSearch();
    return () => { isMounted = false; };
  }, [debouncedPatientSearch]);

  // Preselect ODS or first questionnaire
  useEffect(() => {
    if (questionnaires.length > 0 && !selectedQuestionnaireKey) {
      const ods = questionnaires.find(q => q.key.toLowerCase().includes('bmh_mwt') || q.key.toLowerCase().includes('ods'));
      if (ods) {
        setSelectedQuestionnaireKey(ods.key);
      } else {
        setSelectedQuestionnaireKey(questionnaires[0].key);
      }
    }
  }, [questionnaires, selectedQuestionnaireKey]);

  // Preselect first centre
  useEffect(() => {
    if (centres.length > 0 && !selectedCentre) {
      setSelectedCentre(centres[0].name);
    }
  }, [centres, selectedCentre]);

  const queryClient = useQueryClient();

  const insertPatientInLocalCache = async (patient: AgentPatient) => {
    await referentialCache.appendLocalPatient(patient);
    // Insérer dans le cache pro_patients_all
    queryClient.setQueryData(['pro_patients_all'], (old: any) => {
      if (!old) return { items: [patient], total: 1, page: 1, limit: 300 };
      const items = old.items || [];
      const exists = items.some((p: any) => p.id === patient.id);
      if (exists) return old;
      const formatted = {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phoneNumber,
        phoneNumber: patient.phoneNumber,
        email: patient.email,
        birthdate: patient.birthdate,
        internalPatientCode: patient.internalPatientCode,
      };
      return {
        ...old,
        items: [formatted, ...items],
        total: (old.total || items.length) + 1,
      };
    });
  };

  // Create Patient Mutation
  const createPatientMutation = useMutation({
    mutationFn: (payload: { firstName: string; lastName: string; phoneNumber?: string; birthdate?: string }) =>
      agentService.createPatient(payload),
    onSuccess: async (data: any) => {
      const created = data.existingPatient || data;
      const newPatient: AgentPatient = {
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        phoneNumber: created.phoneNumber ?? null,
        email: created.email ?? null,
        birthdate: created.birthdate ?? null,
        internalPatientCode: created.internalPatientCode ?? null,
      };
      await insertPatientInLocalCache(newPatient);
      setSelectedPatient(newPatient);
      setIsModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewBirthdate('');
      Alert.alert('Succès', `Patient ${created.firstName} ${created.lastName} sélectionné.`);
    },
    onError: async (err: any, variables) => {
      const isNetworkError = !err?.response || err?.code === 'ECONNABORTED' || err?.message?.includes('Network');
      if (isNetworkError) {
        const tempId = -Date.now();
        const offlinePatient: AgentPatient = {
          id: tempId,
          firstName: variables.firstName,
          lastName: variables.lastName,
          phoneNumber: variables.phoneNumber || null,
          email: null,
          birthdate: variables.birthdate || null,
          internalPatientCode: `TEMP-${Date.now().toString().slice(-4)}`,
        };
        await syncService.addToQueue({
          type: 'CREATE_PATIENT',
          payload: variables,
        });
        await insertPatientInLocalCache(offlinePatient);
        setSelectedPatient(offlinePatient);
        setIsModalOpen(false);
        setNewFirstName('');
        setNewLastName('');
        setNewPhone('');
        setNewBirthdate('');
        Alert.alert(
          'Patient enregistré hors-ligne 📶', 
          `Le patient ${variables.firstName} ${variables.lastName} a été créé localement et sera synchronisé au retour du réseau.`
        );
        return;
      }
      Alert.alert('Erreur', err?.message || 'Impossible de créer le patient.');
    }
  });

  const handleCreatePatientSubmit = () => {
    if (!newFirstName.trim() || !newLastName.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner le prénom et le nom du patient.');
      return;
    }
    createPatientMutation.mutate({
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      phoneNumber: newPhone.trim() || undefined,
      birthdate: newBirthdate.trim() || undefined,
    });
  };

  const handleStart = () => {
    if (!selectedQuestionnaireKey) {
      Alert.alert('Questionnaire requis', 'Veuillez sélectionner un outil de dépistage.');
      return;
    }
    if (!selectedPatient) {
      Alert.alert('Patient requis', 'Veuillez rechercher ou créer un patient pour ce dépistage.');
      return;
    }

    const patientFullName = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
    router.push({
      pathname: '/(health-agent)/assessments/run',
      params: {
        key: selectedQuestionnaireKey,
        patientId: String(selectedPatient.id),
        patientName: patientFullName,
        centre: selectedCentre,
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau Dépistage</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Étape 1 : Choix de l'Outil de Dépistage */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionNumber}>1</Text>
            <Text style={styles.sectionTitle}>Choisir le Questionnaire</Text>
          </View>

          {isLoadingQ ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={60} borderRadius={12} />
              <Skeleton height={60} borderRadius={12} />
            </View>
          ) : (
            <View style={styles.questionnairesList}>
              {questionnaires.map((q) => {
                const isSelected = selectedQuestionnaireKey === q.key;
                const isOds = q.key.toLowerCase().includes('bmh_mwt') || q.key.toLowerCase().includes('ods');

                return (
                  <TouchableOpacity
                    key={q.key}
                    style={[
                      styles.qCard,
                      isSelected && styles.qCardSelected,
                      isOds && styles.qCardOdsHighlight
                    ]}
                    onPress={() => setSelectedQuestionnaireKey(q.key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.qCardLeft}>
                      <View style={[styles.qIconContainer, isSelected && styles.qIconContainerSelected]}>
                        <ClipboardList size={20} color={isSelected ? '#ffffff' : '#00A651'} />
                      </View>
                      <View style={styles.qTextContainer}>
                        <View style={styles.qTitleRow}>
                          <Text style={[styles.qTitle, isSelected && styles.qTitleSelected]}>
                            {q.name || q.title || q.key}
                          </Text>
                          {isOds && (
                            <View style={styles.odsBadge}>
                              <Sparkles size={10} color="#00A651" style={{ marginRight: 3 }} />
                              <Text style={styles.odsBadgeText}>ODS Recommandé</Text>
                            </View>
                          )}
                        </View>
                        {!!q.description && (
                          <Text style={styles.qDescription} numberOfLines={2}>
                            {q.description}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Étape 2 : Sélection ou Création du Patient */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionNumber}>2</Text>
            <Text style={styles.sectionTitle}>Sélectionner le Patient</Text>
          </View>

          {selectedPatient ? (
            <View style={styles.selectedPatientCard}>
              <View style={styles.selectedPatientLeft}>
                <View style={styles.patientAvatar}>
                  <User size={22} color="#00A651" />
                </View>
                <View>
                  <Text style={styles.selectedPatientName}>
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </Text>
                  {!!selectedPatient.phoneNumber && (
                    <Text style={styles.selectedPatientSub}>{selectedPatient.phoneNumber}</Text>
                  )}
                  {!!selectedPatient.internalPatientCode && (
                    <Text style={styles.selectedPatientCode}>Code: {selectedPatient.internalPatientCode}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedPatient(null)} style={styles.removePatientButton}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher par nom ou prénom..."
                  value={patientSearch}
                  onChangeText={setPatientSearch}
                  placeholderTextColor="#94a3b8"
                />
                {patientSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPatientSearch('')}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results */}
              {isSearchingPatients && (
                <View style={styles.loadingSearch}>
                  <ActivityIndicator size="small" color="#00A651" />
                  <Text style={styles.loadingSearchText}>Recherche en cours...</Text>
                </View>
              )}

              {debouncedPatientSearch.trim().length > 1 && !isSearchingPatients && (
                <View style={styles.searchResultsContainer}>
                  {hybridPatients.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setSelectedPatient(p);
                        setPatientSearch('');
                      }}
                    >
                      <User size={18} color="#64748b" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultItemName}>{p.firstName} {p.lastName}</Text>
                        {!!p.phoneNumber && <Text style={styles.resultItemSub}>{p.phoneNumber}</Text>}
                      </View>
                      <ChevronRight size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  ))}

                  {hybridPatients.length === 0 && (
                    <Text style={styles.noResultsText}>Aucun patient trouvé pour "{debouncedPatientSearch}".</Text>
                  )}
                </View>
              )}

              {/* Quick Create Patient Button */}
              <TouchableOpacity
                style={styles.newPatientButton}
                onPress={() => setIsModalOpen(true)}
                activeOpacity={0.8}
              >
                <UserPlus size={18} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={styles.newPatientButtonText}>Créer un nouveau patient rapide</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Étape 3 : Centre de santé (Optionnel) */}
        {centres.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionNumber}>3</Text>
              <Text style={styles.sectionTitle}>Centre de Rattachement</Text>
            </View>
            <View style={styles.centresRow}>
              {centres.slice(0, 3).map((c) => {
                const isSelected = selectedCentre === c.name;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.centreChip, isSelected && styles.centreChipSelected]}
                    onPress={() => setSelectedCentre(c.name)}
                  >
                    <Building size={14} color={isSelected ? '#00A651' : '#64748b'} style={{ marginRight: 6 }} />
                    <Text style={[styles.centreChipText, isSelected && styles.centreChipTextSelected]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Démarrer Button */}
        <TouchableOpacity
          style={[
            styles.startButton,
            (!selectedQuestionnaireKey || !selectedPatient) && styles.startButtonDisabled
          ]}
          onPress={handleStart}
          disabled={!selectedQuestionnaireKey || !selectedPatient}
          activeOpacity={0.85}
        >
          <Text style={styles.startButtonText}>Démarrer le Dépistage</Text>
          <ChevronRight size={20} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

      </ScrollView>

      {/* Modal Création Nouveau Patient Rapide */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Patient</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Prénom *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Jean"
                value={newFirstName}
                onChangeText={setNewFirstName}
              />

              <Text style={styles.inputLabel}>Nom *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Kouassi"
                value={newLastName}
                onChangeText={setNewLastName}
              />

              <Text style={styles.inputLabel}>Téléphone (optionnel)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: +225 0700000000"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.inputLabel}>Date de naissance (optionnel - AAAA-MM-JJ)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: 1995-05-12"
                value={newBirthdate}
                onChangeText={setNewBirthdate}
              />

              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleCreatePatientSubmit}
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Enregistrer et Sélectionner</Text>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00A651',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  questionnairesList: {
    gap: 10,
  },
  qCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  qCardSelected: {
    borderColor: '#00A651',
    backgroundColor: '#f0fdf4',
  },
  qCardOdsHighlight: {
    borderColor: '#86efac',
  },
  qCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  qIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qIconContainerSelected: {
    backgroundColor: '#00A651',
  },
  qTextContainer: {
    flex: 1,
  },
  qTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  qTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  qTitleSelected: {
    color: '#00A651',
  },
  odsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  odsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00A651',
  },
  qDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#00A651',
    backgroundColor: '#00A651',
  },
  selectedPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#00A651',
  },
  selectedPatientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  selectedPatientSub: {
    fontSize: 13,
    color: '#64748b',
  },
  selectedPatientCode: {
    fontSize: 11,
    color: '#94a3b8',
  },
  removePatientButton: {
    padding: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  loadingSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingSearchText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
  },
  searchResultsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  resultItemSub: {
    fontSize: 12,
    color: '#64748b',
  },
  noResultsText: {
    padding: 14,
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  newPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  newPatientButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00A651',
  },
  centresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  centreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  centreChipSelected: {
    borderColor: '#00A651',
    backgroundColor: '#f0fdf4',
  },
  centreChipText: {
    fontSize: 13,
    color: '#64748b',
  },
  centreChipTextSelected: {
    color: '#00A651',
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  modalSubmitButton: {
    backgroundColor: '#00A651',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
