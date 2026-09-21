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
  'Suspicion de dépression',
  'Risque suicidaire suspecté',
  'Anxiété / Détresse psychologique',
  'Trouble de l’humeur',
  'Addiction / Consommation',
  'Suivi post-dépistage communautaire',
];

export default function NewReferralScreen() {
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
    queryKey: ['agent_recent_submissions_for_referral'],
    queryFn: () => agentService.getSubmissions({ limit: 30 }),
    enabled: selectedSubmissionId == null,
  });

  const recentSubmissions = recentSubmissionsData?.items || [];

  // Query professionals for specialist destination
  const { data: professionals = [], isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ['agent_professionals_list'],
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

  // Set default motif if severity indicates high risk
  useEffect(() => {
    if (params.severity) {
      const sev = params.severity.toLowerCase();
      if (sev.includes('sévère') || sev.includes('critique') || sev.includes('urgent')) {
        setPriority('URGENTE');
        if (!motif) setMotif('Score critique suite au dépistage — orientation prioritaire.');
      } else if (sev.includes('modér') || sev.includes('moyen')) {
        setPriority('HAUTE');
      }
    }
  }, [params.severity]);

  const handleSelectSubmission = (sub: AgentSubmissionItem) => {
    setSelectedSubmissionId(sub.id);
    setPatientName(sub.patientName || `Patient #${sub.patientId || '—'}`);
    setQuestionnaireName(sub.questionnaireTitle || sub.questionnaireKey || 'Dépistage');
  };

  const handleQuickMotif = (m: string) => {
    if (!motif.trim()) {
      setMotif(m);
    } else if (!motif.includes(m)) {
      setMotif(`${motif}. ${m}`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSubmissionId) {
      Alert.alert('Soumission requise', 'Veuillez sélectionner le dépistage à orienter.');
      return;
    }

    if (!motif.trim()) {
      Alert.alert('Motif requis', 'Veuillez indiquer la raison de l’orientation du patient.');
      return;
    }

    if (destinationType === 'centre' && !selectedCentre?.id) {
      Alert.alert('Centre requis', 'Veuillez sélectionner le centre de santé destinataire.');
      return;
    }

    if (destinationType === 'professional' && !selectedProfessional?.id) {
      Alert.alert('Spécialiste requis', 'Veuillez sélectionner le spécialiste destinataire.');
      return;
    }

    const payload: AgentCreateReferralPayload = {
      submissionId: selectedSubmissionId,
      motif: motif.trim(),
      niveauPriorite: priority,
      centreId: destinationType === 'centre' ? selectedCentre?.id : undefined,
      professionalId: destinationType === 'professional' ? selectedProfessional?.id : undefined,
      notes: notes.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const isOnline = await syncService.checkConnectivity();
      if (!isOnline) {
        // Save in offline queue
        await syncService.addToQueue({ type: 'SUBMIT_REFERRAL', payload });
        Alert.alert(
          'Mode Hors-Ligne',
          'L’orientation a été enregistrée sur votre appareil. Elle sera automatiquement transmise dès le rétablissement de la connexion.',
          [
            {
              text: 'OK',
              onPress: () => {
                queryClient.invalidateQueries({ queryKey: ['agent_referrals_list'] });
                router.replace('/(health-agent)/referrals');
              },
            },
          ]
        );
        return;
      }

      await agentService.createReferral(payload);

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['agent_referrals_list'] });
      queryClient.invalidateQueries({ queryKey: ['agent_submissions'] });
      queryClient.invalidateQueries({ queryKey: ['agent_received_patients'] });

      Alert.alert(
        'Orientation Réussie',
        `Le patient ${patientName || ''} a bien été orienté vers ${
          destinationType === 'centre' ? selectedCentre?.name : selectedProfessional?.name
        }.`,
        [
          {
            text: 'Voir les orientations',
            onPress: () => router.replace('/(health-agent)/referrals'),
          },
        ]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de créer l’orientation.';

      if (err?.response?.status === 409 || msg.includes('déjà')) {
        Alert.alert(
          'Déjà Orienté',
          'Une orientation ou référence a déjà été enregistrée pour ce dépistage.',
          [{ text: 'OK', onPress: () => router.replace('/(health-agent)/referrals') }]
        );
      } else {
        Alert.alert('Erreur', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Orienter le Patient</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Patient & Test Recap Banner */}
        {selectedSubmissionId ? (
          <View
            style={[
              styles.recapCard,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.recapHeader}>
              <View style={[styles.patientAvatar, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                <User size={22} color="#00A651" />
              </View>
              <View style={styles.recapPatientInfo}>
                <Text style={[styles.recapPatientName, { color: colors.text }]}>
                  {patientName || 'Patient dépisté'}
                </Text>
                <View style={styles.recapSubRow}>
                  <FileText size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.recapQuestionnaire, { color: colors.textSecondary }]}>
                    {questionnaireName || 'Dépistage standard'}
                  </Text>
                  {scoreText ? (
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>Score : {scoreText}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={[styles.recapFooter, { borderTopColor: isDark ? '#334155' : '#f1f5f9' }]}>
              <CheckCircle2 size={15} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={[styles.recapStatusText, { color: colors.textSecondary }]}>
                Dépistage complété • Soumission #{selectedSubmissionId}
              </Text>
              {!initialSubmissionId && (
                <TouchableOpacity onPress={() => setSelectedSubmissionId(null)} style={{ marginLeft: 'auto' }}>
                  <Text style={styles.changeLink}>Changer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* Pick from recent submissions if no submissionId passed */
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              1. Choisir le Dépistage à Orienter
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Sélectionnez un dépistage récent effectué auprès d’un patient :
            </Text>

            {isLoadingSubmissions ? (
              <ActivityIndicator size="small" color="#00A651" style={{ marginVertical: 20 }} />
            ) : recentSubmissions.length === 0 ? (
              <Text style={[styles.emptySubmissions, { color: colors.textSecondary }]}>
                Aucun dépistage récent trouvé. Effectuez d’abord un dépistage.
              </Text>
            ) : (
              <View style={styles.submissionsList}>
                {recentSubmissions.slice(0, 5).map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[
                      styles.submissionItem,
                      { borderBottomColor: isDark ? '#334155' : '#f1f5f9' },
                    ]}
                    onPress={() => handleSelectSubmission(sub)}
                  >
                    <User size={18} color="#00A651" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subItemName, { color: colors.text }]}>
                        {sub.patientName || `Patient #${sub.patientId || sub.id}`}
                      </Text>
                      <Text style={[styles.subItemDetails, { color: colors.textSecondary }]}>
                        {sub.questionnaireTitle || sub.questionnaireKey} • {sub.createdAt?.slice(0, 10)}
                      </Text>
                    </View>
                    <Text style={styles.selectBtnText}>Sélectionner</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Destination Type Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Type de Destination
          </Text>
          <View style={styles.typeToggleRow}>
            <TouchableOpacity
              style={[
                styles.typeToggleButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                destinationType === 'centre' && [
                  styles.typeToggleButtonActive,
                  { backgroundColor: isDark ? '#064e3b22' : '#f0fdf4', borderColor: '#00A651' },
                ],
              ]}
              onPress={() => setDestinationType('centre')}
              activeOpacity={0.8}
            >
              <Building
                size={18}
                color={destinationType === 'centre' ? '#00A651' : colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.typeToggleText,
                  { color: destinationType === 'centre' ? '#00A651' : colors.textSecondary },
                  destinationType === 'centre' && styles.typeToggleTextActive,
                ]}
              >
                Centre de Santé
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeToggleButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                destinationType === 'professional' && [
                  styles.typeToggleButtonActive,
                  { backgroundColor: isDark ? '#064e3b22' : '#f0fdf4', borderColor: '#00A651' },
                ],
              ]}
              onPress={() => setDestinationType('professional')}
              activeOpacity={0.8}
            >
              <Stethoscope
                size={18}
                color={destinationType === 'professional' ? '#00A651' : colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.typeToggleText,
                  { color: destinationType === 'professional' ? '#00A651' : colors.textSecondary },
                  destinationType === 'professional' && styles.typeToggleTextActive,
                ]}
              >
                Spécialiste
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Destination Selection (Centre or Specialist) */}
        {destinationType === 'centre' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Centre Destinataire *
            </Text>
            <CentreSelector
              selectedCentreId={selectedCentre?.id}
              selectedCentreName={selectedCentre?.name}
              onSelect={(c) => setSelectedCentre(c)}
              placeholder="Rechercher parmi tous les centres de santé..."
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Spécialiste Destinataire *
            </Text>
            {selectedProfessional ? (
              <View
                style={[
                  styles.selectedCard,
                  {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                  },
                ]}
              >
                <View style={styles.selectedLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                    <Stethoscope size={20} color="#00A651" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>
                      {selectedProfessional.name}
                    </Text>
                    <Text style={[styles.selectedSub, { color: colors.textSecondary }]}>
                      {selectedProfessional.speciality || 'Spécialiste santé mentale'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    {
                      backgroundColor: isDark ? '#334155' : '#f1f5f9',
                      borderColor: isDark ? '#475569' : '#cbd5e1',
                    },
                  ]}
                  onPress={() => setSelectedProfessional(null)}
                >
                  <Text style={[styles.editButtonText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                    Changer
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.searchCard,
                  {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                  },
                ]}
              >
                <View
                  style={[
                    styles.searchInputWrap,
                    {
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                    },
                  ]}
                >
                  <Search size={18} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Filtrer par nom ou spécialité..."
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    value={professionalSearch}
                    onChangeText={setProfessionalSearch}
                  />
                </View>

                <ScrollView style={{ maxHeight: 200, marginTop: 8 }} nestedScrollEnabled>
                  {isLoadingProfessionals ? (
                    <ActivityIndicator size="small" color="#00A651" style={{ padding: 16 }} />
                  ) : filteredProfessionals.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Aucun spécialiste trouvé.
                    </Text>
                  ) : (
                    filteredProfessionals.map((pro) => (
                      <TouchableOpacity
                        key={pro.id}
                        style={[
                          styles.proItemRow,
                          { borderBottomColor: isDark ? '#334155' : '#f1f5f9' },
                        ]}
                        onPress={() => setSelectedProfessional(pro)}
                      >
                        <Stethoscope size={16} color="#00A651" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.proName, { color: colors.text }]}>{pro.name}</Text>
                          <Text style={[styles.proSpec, { color: colors.textSecondary }]}>
                            {pro.speciality || 'Santé mentale'}
                          </Text>
                        </View>
                        <Check size={16} color="#cbd5e1" />
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Motif Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Motif de l’Orientation *</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Suggestions rapides :
          </Text>
          <View style={styles.chipsRow}>
            {QUICK_MOTIFS.map((qm, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.chip,
                  { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' },
                  motif.includes(qm) && { backgroundColor: isDark ? '#064e3b' : '#ecfdf5', borderColor: '#00A651' },
                ]}
                onPress={() => handleQuickMotif(qm)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isDark ? '#cbd5e1' : '#334155' },
                    motif.includes(qm) && { color: '#00A651', fontWeight: '700' },
                  ]}
                >
                  {qm}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#cbd5e1',
                color: colors.text,
              },
            ]}
            placeholder="Précisez le motif clinique ou social de l’orientation..."
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={motif}
            onChangeText={setMotif}
          />
        </View>

        {/* Niveau de Priorité */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ordre de Priorité</Text>
          <View style={styles.priorityRow}>
            {(
              [
                { key: 'NORMALE', label: 'Normale', color: '#00A651', bg: '#f0fdf4' },
                { key: 'HAUTE', label: 'Haute', color: '#d97706', bg: '#fffbeb' },
                { key: 'URGENTE', label: 'Urgente', color: '#ef4444', bg: '#fee2e2' },
              ] as const
            ).map((p) => {
              const isSelected = priority === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.priorityCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isSelected && {
                      borderColor: p.color,
                      backgroundColor: isDark ? `${p.color}22` : p.bg,
                    },
                  ]}
                  onPress={() => setPriority(p.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                  <Text
                    style={[
                      styles.priorityLabel,
                      { color: isSelected ? p.color : colors.text },
                      isSelected && { fontWeight: '700' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes Complémentaires (Optionnel) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Notes & Observations (Optionnel)
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#cbd5e1',
                color: colors.text,
              },
            ]}
            placeholder="Informations supplémentaires utiles pour le centre ou le spécialiste..."
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Check size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Confirmer l’Orientation</Text>
            </>
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  recapCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  recapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recapPatientInfo: {
    flex: 1,
  },
  recapPatientName: {
    fontSize: 16,
    fontWeight: '700',
  },
  recapSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  recapQuestionnaire: {
    fontSize: 12,
  },
  scoreBadge: {
    backgroundColor: '#00A651',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scoreBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  recapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
  },
  recapStatusText: {
    fontSize: 11,
  },
  changeLink: {
    fontSize: 12,
    color: '#00A651',
    fontWeight: '600',
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  submissionsList: {
    marginTop: 8,
  },
  submissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  subItemDetails: {
    fontSize: 11,
    marginTop: 2,
  },
  selectBtnText: {
    fontSize: 12,
    color: '#00A651',
    fontWeight: '700',
    marginLeft: 8,
  },
  emptySubmissions: {
    fontSize: 13,
    paddingVertical: 12,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  typeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeToggleButtonActive: {
    borderWidth: 2,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeToggleTextActive: {
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  priorityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityLabel: {
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
