import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  Building,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
  Search,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  agentService,
  AgentCentre,
  AgentProfessionalItem,
  AgentCreateReferralPayload,
  AgentSubmissionItem,
} from '../../../services/agent';
import { syncService } from '../../../services/syncService';
import { useTheme } from '../../../context/ThemeContext';
import { CentreSelector } from '../../../components/CentreSelector';

const QUICK_MOTIFS = [
  'Traumatisme psychologique de parcours (ESPT)',
  'Détresse psycho-sociale aiguë',
  'Isolement et anxiété sévère',
  'Symptômes dépressifs majeurs',
  'Trouble du comportement / sommeil',
  'Suspicion de risque suicidaire',
  'Orientation vers centre spécialisé / ONG',
];

export default function FieldAgentNewReferralScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();

  const params = useLocalSearchParams<{
    submissionId?: string;
    patientId?: string;
    patientName?: string;
    questionnaireName?: string;
    score?: string;
    severity?: string;
    centre?: string;
  }>();

  const initialSubmissionId = params.submissionId ? parseInt(params.submissionId, 10) : null;
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(initialSubmissionId);
  const [patientName, setPatientName] = useState<string>(params.patientName || '');
  const [questionnaireName, setQuestionnaireName] = useState<string>(params.questionnaireName || '');
  const [scoreText, setScoreText] = useState<string>(params.score || '');

  // Referral form state
  const [destinationType, setDestinationType] = useState<'centre' | 'professional'>('centre');
  const [selectedCentre, setSelectedCentre] = useState<AgentCentre | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<AgentProfessionalItem | null>(null);
  const [professionalSearch, setProfessionalSearch] = useState('');
  const [motif, setMotif] = useState('');
  const [priority, setPriority] = useState<'NORMALE' | 'HAUTE' | 'URGENTE'>('NORMALE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no initial submissionId, load recent submissions to allow picking
  const { data: recentSubmissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['field_agent_recent_submissions_for_referral'],
    queryFn: () => agentService.getSubmissions({ limit: 30 }),
    enabled: selectedSubmissionId == null,
  });

  const recentSubmissions = recentSubmissionsData?.items || [];

  // Query professionals for specialist destination
  const { data: professionals = [], isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ['field_agent_professionals_list'],
    queryFn: () => agentService.getProfessionals(undefined, 100),
    enabled: destinationType === 'professional',
  });

  const filteredProfessionals = useMemo(() => {
    const q = professionalSearch.toLowerCase().trim();
    if (!q) return professionals;
    return professionals.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.speciality && p.speciality.toLowerCase().includes(q))
    );
  }, [professionals, professionalSearch]);

  // Set default initial centre if provided in params
  useEffect(() => {
    if (params.centre && !selectedCentre) {
      setSelectedCentre({ id: 0, name: params.centre, careLevel: null });
    }
  }, [params.centre, selectedCentre]);

  // Handle selecting a submission from the list
  const handleSelectSubmission = (sub: AgentSubmissionItem) => {
    setSelectedSubmissionId(sub.id);
    setPatientName(sub.patientName || 'Migrant dépisté');
    setQuestionnaireName(sub.questionnaireTitle || sub.questionnaireKey || 'Dépistage');
    setScoreText('');
  };

  const handleCreateReferral = async () => {
    if (!selectedSubmissionId) {
      Alert.alert('Évaluation manquante', 'Veuillez sélectionner un dépistage à orienter.');
      return;
    }
    if (!motif.trim()) {
      Alert.alert('Motif requis', 'Veuillez renseigner le motif clinique de cette orientation.');
      return;
    }
    if (destinationType === 'centre' && !selectedCentre) {
      Alert.alert('Centre requis', 'Veuillez sélectionner un centre de santé d’orientation.');
      return;
    }
    if (destinationType === 'professional' && !selectedProfessional) {
      Alert.alert('Spécialiste requis', 'Veuillez choisir un professionnel de santé mentale.');
      return;
    }

    setIsSubmitting(true);
    const payload: AgentCreateReferralPayload = {
      submissionId: selectedSubmissionId,
      motif: motif.trim(),
      niveauPriorite: priority,
      centreId: destinationType === 'centre' && selectedCentre ? selectedCentre.id : undefined,
      professionalId: destinationType === 'professional' && selectedProfessional ? selectedProfessional.id : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await agentService.createReferral(payload);
      queryClient.invalidateQueries({ queryKey: ['agent_referrals_list'] });
      queryClient.invalidateQueries({ queryKey: ['agent_migrants_dashboard'] });
      Alert.alert('Orientation enregistrée', 'Le dossier du migrant a été transmis avec succès.', [
        {
          text: 'Consulter les orientations',
          onPress: () => router.replace('/(field-agent)/referrals'),
        },
      ]);
    } catch (err: any) {
      console.warn('[FieldAgentNewReferral] Network error, enqueuing offline:', err);
      await syncService.addToQueue({ type: 'SUBMIT_REFERRAL', payload });
      Alert.alert(
        'Enregistré hors-ligne',
        'L’orientation a été mise en file d’attente locale. Elle sera synchronisée dès la reconnexion au réseau.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(field-agent)/referrals'),
          },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Orienter un Migrant</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Prise en charge spécialisée et suivi terrain
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1 : Dossier & Test Associé */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <User size={18} color="#00A651" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Patient & Évaluation associée</Text>
          </View>

          {selectedSubmissionId ? (
            <View style={[styles.selectedSubmissionBox, { backgroundColor: isDark ? 'rgba(0,166,81,0.1)' : '#f0fdf4', borderColor: '#00A651' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.patientNameText, { color: colors.text }]}>{patientName || 'Migrant dépisté'}</Text>
                <Text style={[styles.testDetailText, { color: colors.textSecondary }]}>
                  {questionnaireName || 'Dépistage terrain'}
                  {scoreText ? ` • Résultat : ${scoreText}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setSelectedSubmissionId(null)}
              >
                <Text style={styles.changeButtonText}>Changer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Sélectionnez le dépistage récent du migrant à orienter :
              </Text>
              {isLoadingSubmissions ? (
                <ActivityIndicator size="small" color="#00A651" style={{ marginVertical: 12 }} />
              ) : recentSubmissions.length === 0 ? (
                <Text style={[styles.emptySubmissions, { color: colors.textMuted }]}>
                  Aucun dépistage récent trouvé. Vous pouvez d’abord lancer un dépistage.
                </Text>
              ) : (
                <View style={styles.submissionsList}>
                  {recentSubmissions.slice(0, 5).map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[styles.submissionPickItem, { borderColor: colors.border, backgroundColor: isDark ? colors.bg : '#f8fafc' }]}
                      onPress={() => handleSelectSubmission(sub)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subPickName, { color: colors.text }]}>{sub.patientName || 'Migrant'}</Text>
                        <Text style={[styles.subPickTool, { color: colors.textSecondary }]}>
                          {sub.questionnaireTitle || sub.questionnaireKey}
                        </Text>
                      </View>
                      <CheckCircle2 size={18} color="#00A651" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section 2 : Destination de l'orientation */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Building size={18} color="#00A651" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Destination de l’orientation</Text>
          </View>

          {/* Toggle Type de destination */}
          <View style={[styles.toggleContainer, { backgroundColor: isDark ? colors.bg : '#f1f5f9' }]}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                destinationType === 'centre' && [styles.toggleBtnActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => setDestinationType('centre')}
              activeOpacity={0.8}
            >
              <Building size={16} color={destinationType === 'centre' ? '#00A651' : colors.textSecondary} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.toggleBtnText,
                  { color: destinationType === 'centre' ? '#00A651' : colors.textSecondary },
                  destinationType === 'centre' && styles.toggleBtnTextActive,
                ]}
              >
                Centre de Santé
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                destinationType === 'professional' && [styles.toggleBtnActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => setDestinationType('professional')}
              activeOpacity={0.8}
            >
              <Stethoscope size={16} color={destinationType === 'professional' ? '#00A651' : colors.textSecondary} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.toggleBtnText,
                  { color: destinationType === 'professional' ? '#00A651' : colors.textSecondary },
                  destinationType === 'professional' && styles.toggleBtnTextActive,
                ]}
              >
                Spécialiste TILA
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sélecteur selon le type */}
          {destinationType === 'centre' ? (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Centre de santé / Site partenaire *</Text>
              <CentreSelector
                selectedCentreName={selectedCentre?.name || ''}
                onSelect={(c) => setSelectedCentre(c)}
              />
            </View>
          ) : (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Professionnel de santé mentale *</Text>
              {selectedProfessional ? (
                <View style={[styles.selectedCard, { backgroundColor: isDark ? 'rgba(0,166,81,0.1)' : '#f0fdf4', borderColor: '#00A651' }]}>
                  <View style={styles.selectedLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: '#00A651' }]}>
                      <Stethoscope size={20} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedName, { color: colors.text }]}>{selectedProfessional.name}</Text>
                      <Text style={[styles.selectedSub, { color: colors.textSecondary }]}>
                        {selectedProfessional.speciality || 'Spécialiste'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.editButton, { borderColor: '#00A651' }]}
                    onPress={() => setSelectedProfessional(null)}
                  >
                    <Text style={[styles.editButtonText, { color: '#00A651' }]}>Changer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.searchCard, { backgroundColor: isDark ? colors.bg : '#f8fafc', borderColor: colors.border }]}>
                  <View style={[styles.searchInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Rechercher psychiatre, psychologue..."
                      placeholderTextColor={colors.textMuted}
                      value={professionalSearch}
                      onChangeText={setProfessionalSearch}
                    />
                  </View>
                  {isLoadingProfessionals ? (
                    <ActivityIndicator size="small" color="#00A651" style={{ marginVertical: 10 }} />
                  ) : (
                    <ScrollView style={{ maxHeight: 200, marginTop: 8 }} nestedScrollEnabled>
                      {filteredProfessionals.slice(0, 15).map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.proItemRow, { borderBottomColor: colors.border }]}
                          onPress={() => setSelectedProfessional(p)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.proName, { color: colors.text }]}>{p.name}</Text>
                            <Text style={[styles.proSpec, { color: colors.textSecondary }]}>
                              {p.speciality || 'Spécialiste'}
                            </Text>
                          </View>
                          <CheckCircle2 size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      ))}
                      {filteredProfessionals.length === 0 && (
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun praticien trouvé.</Text>
                      )}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section 3 : Motif & Priorité */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <FileText size={18} color="#00A651" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Motif & Degré de priorité</Text>
          </View>

          {/* Motifs Rapides */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>Motifs suggérés :</Text>
          <View style={styles.chipsWrap}>
            {QUICK_MOTIFS.map((item) => {
              const isSelected = motif === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: isDark ? colors.bg : '#f8fafc' },
                    isSelected && { backgroundColor: isDark ? 'rgba(0,166,81,0.2)' : '#ecfdf5', borderColor: '#00A651' },
                  ]}
                  onPress={() => setMotif(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, isSelected && { color: '#00A651', fontWeight: '700' }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Champ Motif libre */}
          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Précision du motif clinique *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? colors.bg : '#f8fafc', borderColor: colors.border, color: colors.text }]}
            placeholder="Décrivez la raison principale de l’orientation..."
            placeholderTextColor={colors.textMuted}
            value={motif}
            onChangeText={setMotif}
          />

          {/* Priorité */}
          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Niveau d’urgence :</Text>
          <View style={styles.priorityRow}>
            {[
              { key: 'NORMALE', label: 'Normale', color: '#10b981', bg: '#ecfdf5' },
              { key: 'HAUTE', label: 'Haute', color: '#f59e0b', bg: '#fef3c7' },
              { key: 'URGENTE', label: 'Urgente', color: '#ef4444', bg: '#fee2e2' },
            ].map((p) => {
              const isSelected = priority === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.priorityBtn,
                    { borderColor: colors.border, backgroundColor: isDark ? colors.bg : '#f8fafc' },
                    isSelected && { borderColor: p.color, backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : p.bg },
                  ]}
                  onPress={() => setPriority(p.key as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.priorityIndicator, { backgroundColor: p.color }]} />
                  <Text
                    style={[
                      styles.priorityBtnText,
                      { color: colors.textSecondary },
                      isSelected && { color: p.color, fontWeight: '700' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Notes cliniques additionnelles */}
          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Notes confidentielles pour le centre (optionnel)</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: isDark ? colors.bg : '#f8fafc', borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Observations terrain, antécédents, situation de vulnérabilité..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Bouton de confirmation */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleCreateReferral}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          ) : (
            <CheckCircle2 size={20} color="#ffffff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Transmission du dossier...' : 'Transmettre l’Orientation'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  selectedSubmissionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '700',
  },
  testDetailText: {
    fontSize: 13,
    marginTop: 2,
  },
  changeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#00A651',
    borderRadius: 8,
  },
  changeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    marginBottom: 8,
  },
  emptySubmissions: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  submissionsList: {
    gap: 8,
  },
  submissionPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  subPickName: {
    fontSize: 14,
    fontWeight: '600',
  },
  subPickTool: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toggleBtnTextActive: {
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
  },
  selectedSub: {
    fontSize: 12,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  proItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  proName: {
    fontSize: 14,
    fontWeight: '600',
  },
  proSpec: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
