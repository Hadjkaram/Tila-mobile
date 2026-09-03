import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
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
  ShieldCheck,
  Brain,
  Smile,
  HeartHandshake,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService, AgentPatient, AgentCentre } from '../../../services/agent';
import { syncService } from '../../../services/syncService';
import { referentialCache } from '../../../services/referentialCache';
import { useTheme } from '../../../context/ThemeContext';
import { AssessmentLanguage } from '../../../constants/bilingualQuestionnaires';
import { AssessmentLanguageSelector } from '../../../components/AssessmentLanguageSelector';

export default function FieldAgentNewAssessmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ toolKey?: string }>();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const [selectedLang, setSelectedLang] = useState<AssessmentLanguage>('fr');

  // State
  const [selectedQuestionnaireKey, setSelectedQuestionnaireKey] = useState<string>(
    params.toolKey || 'pcl-5-terrain'
  );
  const [selectedPatient, setSelectedPatient] = useState<AgentPatient | null>(null);
  const [selectedCentre, setSelectedCentre] = useState<string>('');
  const [isCentreModalOpen, setIsCentreModalOpen] = useState(false);
  const [centreSearch, setCentreSearch] = useState('');

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

  // Load questionnaires
  const { data: questionnaires = [] } = useQuery({
    queryKey: ['agent_questionnaires'],
    queryFn: () => agentService.getQuestionnaires(),
  });

  // Load centres
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

  // Hybrid Patient Search Effect (branché à la base de données & au cache local)
  useEffect(() => {
    let isMounted = true;
    const performSearch = async () => {
      setIsSearchingPatients(true);
      try {
        const results = await referentialCache.searchPatientsUnified(debouncedPatientSearch);
        if (isMounted) {
          setHybridPatients(results);
        }
      } catch (e) {
        console.warn('[AssessmentsNew] Erreur recherche patient:', e);
      } finally {
        if (isMounted) {
          setIsSearchingPatients(false);
        }
      }
    };

    performSearch();
    return () => {
      isMounted = false;
    };
  }, [debouncedPatientSearch]);

  // Active Tool metadata
  const toolInfo = useMemo(() => {
    const key = selectedQuestionnaireKey.toLowerCase();
    if (key.includes('pcl') || key.includes('trauma')) {
      return {
        title: 'PCL-5 TERRAIN (Trauma & Migrants)',
        subtitle: 'Évaluation TSPT, PHQ-9 & Événements Stressants',
        icon: ShieldCheck,
        color: '#ea580c',
        bg: '#fff7ed',
        duration: '15 - 20 min',
      };
    }
    if (key.includes('sdq')) {
      return {
        title: 'SDQ (Forces et Difficultés)',
        subtitle: 'Évaluation Comportementale Enfants & Ados',
        icon: Smile,
        color: '#8b5cf6',
        bg: '#f5f3ff',
        duration: '8 - 12 min',
      };
    }
    if (key.includes('berger')) {
      return {
        title: 'Échelle de Berger (VIH)',
        subtitle: 'Stigmatisation liée au VIH',
        icon: HeartHandshake,
        color: '#0284c7',
        bg: '#f0f9ff',
        duration: '10 - 15 min',
      };
    }
    return {
      title: 'ODS / BMH-MWT',
      subtitle: 'Dépistage des Troubles Mentaux Courants',
      icon: Brain,
      color: '#00A651',
      bg: '#ecfdf5',
      duration: '5 - 10 min',
    };
  }, [selectedQuestionnaireKey]);

  // Filtered centres
  const filteredCentres = useMemo(() => {
    if (!centreSearch.trim()) return centres;
    const q = centreSearch.toLowerCase();
    return centres.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [centres, centreSearch]);

  // Insert patient into cache
  const insertPatientInLocalCache = async (patient: any) => {
    await referentialCache.appendLocalPatient(patient);
    queryClient.setQueryData(['offline_patients'], (old: any) => {
      if (!old) return [patient];
      return [patient, ...old];
    });
  };

  // Create Patient Mutation
  const createPatientMutation = useMutation({
    mutationFn: async (payload: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      birthdate?: string;
    }) => {
      const isOnline = await syncService.checkConnectivity();
      if (!isOnline) {
        const localPatient: AgentPatient = {
          id: -Date.now(),
          firstName: payload.firstName,
          lastName: payload.lastName,
          phoneNumber: payload.phoneNumber || null,
          email: null,
          birthdate: payload.birthdate || null,
        };
        await syncService.addToQueue({
          type: 'CREATE_PATIENT',
          payload,
        });
        return localPatient;
      }
      return agentService.createPatient(payload);
    },
    onSuccess: async (newPatient) => {
      const patientToSelect: AgentPatient =
        'existingPatient' in newPatient ? newPatient.existingPatient : newPatient;
      await insertPatientInLocalCache(patientToSelect);
      setSelectedPatient(patientToSelect);
      setIsModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
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
      birthdate: newBirthdate.trim() || undefined,
    });
  };

  const handleStart = () => {
    if (!selectedPatient) {
      Alert.alert('Attention', 'Veuillez sélectionner ou créer un patient pour démarrer.');
      return;
    }

    router.push({
      pathname: '/(field-agent)/assessments/run',
      params: {
        questionnaireKey: selectedQuestionnaireKey,
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        centre: selectedCentre,
        lang: selectedLang,
      },
    });
  };

  const IconComp = toolInfo.icon;

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={[styles.topBar, isDark && { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={isDark ? colors.text : '#0f172a'} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, isDark && { color: colors.text }]}>Nouvelle évaluation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Carte de l'Outil sélectionné */}
        <View style={styles.section}>
          <Text style={[styles.stepLabel, isDark && { color: colors.text }]}>Étape 1 : Outil d’évaluation sélectionné</Text>
          <View style={[styles.toolBanner, { backgroundColor: toolInfo.bg }]}>
            <View style={[styles.toolIconWrap, { backgroundColor: toolInfo.color }]}>
              <IconComp size={24} color="#ffffff" />
            </View>
            <View style={styles.toolBannerContent}>
              <Text style={styles.toolBannerTitle}>{toolInfo.title}</Text>
              <Text style={styles.toolBannerSub}>{toolInfo.subtitle}</Text>
              <Text style={styles.toolBannerDuration}>⏱️ {toolInfo.duration}</Text>
            </View>
          </View>

          {/* Choix de la langue FR / EN avant de démarrer */}
          <View style={{ marginTop: 12 }}>
            <AssessmentLanguageSelector
              language={selectedLang}
              onLanguageChange={setSelectedLang}
            />
          </View>
        </View>

        {/* Sélection du Patient */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>Étape 2 : Patient / Migrant évalué</Text>

          {selectedPatient ? (
            <View style={styles.selectedPatientCard}>
              <View style={styles.patientAvatar}>
                <User size={20} color="#00A651" />
              </View>
              <View style={styles.patientDetails}>
                <Text style={styles.patientName}>
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </Text>
                {!!selectedPatient.phoneNumber && (
                  <Text style={styles.patientSub}>📞 {selectedPatient.phoneNumber}</Text>
                )}
                {selectedPatient.id < 0 && (
                  <Text style={styles.offlineTag}>⚡ Créé hors-ligne (en attente de sync)</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPatient(null)}
                style={styles.changePatientBtn}
              >
                <Text style={styles.changePatientText}>Changer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchBlock}>
              {/* Barre de recherche */}
              <View style={styles.searchInputWrap}>
                <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher par nom, prénom, tél..."
                  value={patientSearch}
                  onChangeText={setPatientSearch}
                  autoCapitalize="none"
                />
                {patientSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPatientSearch('')}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Indicateur de recherche */}
              {isSearchingPatients && (
                <View style={styles.searchLoader}>
                  <ActivityIndicator size="small" color="#00A651" />
                  <Text style={styles.searchLoaderText}>Recherche...</Text>
                </View>
              )}

              {/* Résultats de recherche hybrides */}
              {debouncedPatientSearch.trim().length >= 2 && !isSearchingPatients && (
                <View style={styles.resultsContainer}>
                  {hybridPatients.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.resultItem}
                      onPress={() => {
                        setSelectedPatient(p);
                        setPatientSearch('');
                      }}
                    >
                      <View style={styles.resultIconWrap}>
                        <User size={16} color="#64748b" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>
                          {p.firstName} {p.lastName}
                        </Text>
                        {!!p.phoneNumber && (
                          <Text style={styles.resultSub}>{p.phoneNumber}</Text>
                        )}
                      </View>
                      <ChevronRight size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  ))}

                  {hybridPatients.length === 0 && (
                    <Text style={styles.noResultsText}>
                      Aucun patient trouvé pour "{debouncedPatientSearch}".
                    </Text>
                  )}
                </View>
              )}

              {/* Bouton Création Rapide */}
              <TouchableOpacity
                style={styles.quickCreateBtn}
                onPress={() => setIsModalOpen(true)}
                activeOpacity={0.8}
              >
                <UserPlus size={18} color="#00A651" style={{ marginRight: 8 }} />
                <Text style={styles.quickCreateBtnText}>Nouveau patient rapide</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sélection du Centre */}
        <View style={styles.section}>
          <Text style={styles.stepLabel}>Étape 3 : Centre / Site de rattachement</Text>
          <TouchableOpacity
            style={styles.centreSelectorCard}
            onPress={() => setIsCentreModalOpen(true)}
            activeOpacity={0.7}
          >
            <Building size={20} color="#00A651" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.centreSelectedName}>
                {selectedCentre || 'Sélectionner un centre...'}
              </Text>
              <Text style={styles.centreSelectedSub}>Appuyez pour changer de centre</Text>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Bouton Démarrer l'Évaluation */}
        <TouchableOpacity
          style={[styles.launchBtn, !selectedPatient && styles.launchBtnDisabled]}
          onPress={handleStart}
          disabled={!selectedPatient}
          activeOpacity={0.85}
        >
          <Sparkles size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.launchBtnText}>Démarrer le questionnaire</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Création Nouveau Patient */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Patient Rapide</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>Prénom *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ex : Moussa"
                value={newFirstName}
                onChangeText={setNewFirstName}
              />

              <Text style={styles.inputLabel}>Nom *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ex : Traoré"
                value={newLastName}
                onChangeText={setNewLastName}
              />

              <Text style={styles.inputLabel}>Numéro de téléphone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ex : 0708091011"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.inputLabel}>Date de naissance (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ex : 1995-04-12"
                value={newBirthdate}
                onChangeText={setNewBirthdate}
              />

              <TouchableOpacity
                style={styles.savePatientBtn}
                onPress={handleSaveNewPatient}
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.savePatientBtnText}>Enregistrer et continuer</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Sélection Centre */}
      <Modal visible={isCentreModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir le Centre</Text>
              <TouchableOpacity onPress={() => setIsCentreModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchInputWrap, { marginHorizontal: 16, marginBottom: 12 }]}>
              <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filtrer les centres..."
                value={centreSearch}
                onChangeText={setCentreSearch}
              />
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {filteredCentres.map((c) => {
                const isSelected = selectedCentre === c.name;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.centreOptionItem, isSelected && styles.centreOptionItemSelected]}
                    onPress={() => {
                      setSelectedCentre(c.name);
                      setIsCentreModalOpen(false);
                    }}
                  >
                    <Building
                      size={18}
                      color={isSelected ? '#00A651' : '#64748b'}
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.centreOptionName, isSelected && { color: '#00A651', fontWeight: '700' }]}
                      >
                        {c.name}
                      </Text>
                      {!!c.description && (
                        <Text style={styles.centreOptionDesc}>{c.description}</Text>
                      )}
                    </View>
                    {isSelected && <Check size={18} color="#00A651" />}
                  </TouchableOpacity>
                );
              })}
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
    padding: 4,
    marginRight: 12,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: 'Montserrat_600SemiBold',
  },
  toolBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toolBannerContent: {
    flex: 1,
  },
  toolBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  toolBannerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  toolBannerDuration: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
    fontFamily: 'Montserrat_500Medium',
  },
  selectedPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00A651',
  },
  patientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  patientSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  offlineTag: {
    fontSize: 10.5,
    color: '#ea580c',
    marginTop: 2,
    fontWeight: '600',
  },
  changePatientBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  changePatientText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  searchBlock: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Montserrat_500Medium',
  },
  searchLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  searchLoaderText: {
    fontSize: 12,
    color: '#64748b',
  },
  resultsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  resultIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  resultName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  resultSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  noResultsText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 10,
    textAlign: 'center',
  },
  quickCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  quickCreateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00A651',
    fontFamily: 'Montserrat_600SemiBold',
  },
  centreSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  centreSelectedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  centreSelectedSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  launchBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  launchBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  modalForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
    fontFamily: 'Montserrat_600SemiBold',
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Montserrat_500Medium',
  },
  savePatientBtn: {
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  savePatientBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  centreOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  centreOptionItemSelected: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  centreOptionName: {
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Montserrat_500Medium',
  },
  centreOptionDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
    fontFamily: 'Montserrat_400Regular',
  },
});
