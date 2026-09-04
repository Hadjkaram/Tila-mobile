import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
  MessageSquare,
  Building2,
  User,
  ArrowRightLeft,
  Filter,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superviseurService, SuperviseurAlertItem } from '../../../services/superviseur';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../../context/ThemeContext';

const ALERT_TYPE_FILTERS = [
  { key: 'tous', label: 'Toutes' },
  { key: 'ideation_suicidaire', label: 'Idéation suicidaire' },
  { key: 'tspt_aigu', label: 'TSPT aigu' },
  { key: 'psychose', label: 'Psychose' },
  { key: 'sdq_anormal', label: 'SDQ Enfant' },
];

export default function SupervisorAlertsScreen() {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('tous');
  const [selectedAlert, setSelectedAlert] = useState<SuperviseurAlertItem | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [recommendationNote, setRecommendationNote] = useState('');
  const [actionStatus, setActionStatus] = useState<'EN_COURS' | 'TRAITE'>('EN_COURS');

  // Query supervisor critical alerts
  const {
    data: alertsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['supervisor-critical-alerts'],
    queryFn: () => superviseurService.getAlerts(),
  });

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: string; note: string }) =>
      superviseurService.takeAlertAction(id, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-critical-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-recent-alerts'] });
      setActionModalVisible(false);
      setRecommendationNote('');
      Alert.alert('Succès', 'Recommandation et statut de supervision enregistrés avec succès.');
    },
    onError: () => {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut de l’alerte.');
    },
  });

  const allAlerts = alertsData?.items || [];

  const filteredAlerts = allAlerts.filter((item) => {
    if (selectedType === 'tous') return true;
    return item.alertType === selectedType;
  });

  const handleOpenActionModal = (alertItem: SuperviseurAlertItem) => {
    setSelectedAlert(alertItem);
    setRecommendationNote(alertItem.supervisorNote || '');
    setActionStatus(alertItem.status === 'TRAITE' ? 'TRAITE' : 'EN_COURS');
    setActionModalVisible(true);
  };

  const handleSaveAction = () => {
    if (!selectedAlert) return;
    actionMutation.mutate({
      id: selectedAlert.id,
      status: actionStatus,
      note: recommendationNote,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      {/* 1. Filtres par Type d'Alerte */}
      <View style={[styles.filterSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {ALERT_TYPE_FILTERS.map((f) => {
            const isSelected = selectedType === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  isSelected && styles.filterPillSelected,
                ]}
                onPress={() => setSelectedType(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: colors.textSecondary },
                    isSelected && styles.filterPillTextSelected,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* En-tête statut */}
      <View style={styles.headerInfoRow}>
        <Text style={[styles.headerCountText, { color: colors.textSecondary }]}>
          {filteredAlerts.length} alerte(s) clinique(s) prioritaire(s)
        </Text>
      </View>

      {/* 2. Liste des Alertes */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement des alertes d'urgence...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#dc2626" />
          }
        >
          {filteredAlerts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <CheckCircle2 size={44} color="#00A651" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Toutes les alertes sont traitées</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Aucun cas critique en attente d'intervention sur ce filtre.
              </Text>
            </View>
          ) : (
            filteredAlerts.map((item) => {
              const isCrit = item.severity === 'CRITIQUE' || item.alertType === 'ideation_suicidaire';

              let formattedDate = item.createdAt;
              try {
                formattedDate = format(parseISO(item.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr });
              } catch {}

              return (
                <View
                  key={item.id}
                  style={[
                    styles.alertCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isCrit && (isDark ? styles.alertCardCriticalDark : styles.alertCardCritical),
                  ]}
                >
                  {/* Badge d'urgence & Date */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.severityBadge, isCrit ? styles.severityCritical : styles.severityHigh]}>
                      <AlertTriangle size={12} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.severityText}>
                        {isCrit ? 'URGENCE VITALE' : 'PRIORITÉ HAUTE'}
                      </Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{formattedDate}</Text>
                  </View>

                  {/* Titre de l'Alerte */}
                  <Text style={[styles.alertTitle, isDark && { color: '#f87171' }]}>{item.alertTitle}</Text>

                  {/* Patient & Centre */}
                  <View style={styles.patientInfoRow}>
                    <Text style={[styles.patientName, { color: colors.text }]}>{item.patientName}</Text>
                    <Text style={[styles.patientCode, { color: colors.textSecondary }]}>• Code {item.patientCode}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Building2 size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.siteName}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <User size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>Agent : {item.evaluatorName}</Text>
                    </View>
                  </View>

                  {/* Statut d'orientation */}
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        item.hasReferral
                          ? (isDark ? styles.statusBadgeDoneDark : styles.statusBadgeDone)
                          : (isDark ? styles.statusBadgeWarningDark : styles.statusBadgeWarning),
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          item.hasReferral ? styles.textSuccess : (isDark ? styles.textWarningDark : styles.textWarning),
                        ]}
                      >
                        {item.hasReferral ? '✓ Orientation psychiatrique émise' : '⚠️ Orientation immédiate recommandée'}
                      </Text>
                    </View>
                  </View>

                  {/* Bouton d'action de supervision */}
                  <TouchableOpacity
                    style={[styles.actionBtn, isDark && { backgroundColor: '#334155' }]}
                    onPress={() => handleOpenActionModal(item)}
                    activeOpacity={0.85}
                  >
                    <MessageSquare size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionBtnText}>Prendre en charge & Émettre recommandation</Text>
                    <ChevronRight size={16} color="#ffffff" style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 3. Modal d'Action et Recommandation Superviseur */}
      <Modal visible={actionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Supervision de l'alerte</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Consignes pour l'équipe terrain</Text>
              </View>
              <TouchableOpacity
                onPress={() => setActionModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedAlert && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.summaryCard, isDark && { backgroundColor: 'rgba(220, 38, 38, 0.15)', borderColor: '#7f1d1d' }]}>
                  <Text style={[styles.summaryTitle, isDark && { color: '#f87171' }]}>{selectedAlert.alertTitle}</Text>
                  <Text style={[styles.summarySubtitle, isDark && { color: '#fca5a5' }]}>
                    Patient : {selectedAlert.patientName} ({selectedAlert.patientCode})
                  </Text>
                  <Text style={[styles.summaryAgent, isDark && { color: '#f87171' }]}>
                    Site : {selectedAlert.siteName} • Agent référent : {selectedAlert.evaluatorName}
                  </Text>
                </View>

                {/* Choix du statut */}
                <Text style={[styles.inputSectionTitle, { color: colors.text }]}>Statut de l'intervention</Text>
                <View style={styles.statusButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusChoiceBtn,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                      actionStatus === 'EN_COURS' && styles.statusChoiceBtnActive,
                    ]}
                    onPress={() => setActionStatus('EN_COURS')}
                    activeOpacity={0.7}
                  >
                    <Clock size={16} color={actionStatus === 'EN_COURS' ? '#ffffff' : '#d97706'} style={{ marginRight: 6 }} />
                    <Text style={[styles.statusChoiceText, { color: colors.textSecondary }, actionStatus === 'EN_COURS' && styles.statusChoiceTextActive]}>
                      En cours de prise en charge
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusChoiceBtn,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                      actionStatus === 'TRAITE' && styles.statusChoiceBtnDone,
                    ]}
                    onPress={() => setActionStatus('TRAITE')}
                    activeOpacity={0.7}
                  >
                    <CheckCircle2 size={16} color={actionStatus === 'TRAITE' ? '#ffffff' : '#00A651'} style={{ marginRight: 6 }} />
                    <Text style={[styles.statusChoiceText, { color: colors.textSecondary }, actionStatus === 'TRAITE' && styles.statusChoiceTextActive]}>
                      Pris en charge & Clôturé
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Note de recommandation */}
                <Text style={[styles.inputSectionTitle, { color: colors.text }]}>Note clinique & Recommandations</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Ex : Convoquer le patient en urgence pour évaluation médicale, orienter vers l'hôpital de référence..."
                  placeholderTextColor={colors.textMuted}
                  value={recommendationNote}
                  onChangeText={setRecommendationNote}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Bouton de confirmation */}
                <TouchableOpacity
                  style={styles.submitActionBtn}
                  onPress={handleSaveAction}
                  disabled={actionMutation.isPending}
                  activeOpacity={0.85}
                >
                  {actionMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitActionBtnText}>Enregistrer la supervision</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
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
  filterSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillSelected: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  filterPillText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  filterPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  headerInfoRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerCountText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  alertCardCritical: {
    backgroundColor: '#fff5f5',
    borderColor: '#fca5a5',
  },
  alertCardCriticalDark: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderColor: '#7f1d1d',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityCritical: {
    backgroundColor: '#dc2626',
  },
  severityHigh: {
    backgroundColor: '#ea580c',
  },
  severityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Montserrat_400Regular',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  patientName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  patientCode: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  statusRow: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeDone: {
    backgroundColor: '#ecfdf5',
  },
  statusBadgeDoneDark: {
    backgroundColor: 'rgba(0, 166, 81, 0.15)',
  },
  statusBadgeWarning: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeWarningDark: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
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
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  textSuccess: {
    color: '#00A651',
  },
  textWarning: {
    color: '#d97706',
  },
  textWarningDark: {
    color: '#fbbf24',
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
    maxHeight: '85%',
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
  summaryCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  summarySubtitle: {
    fontSize: 12.5,
    color: '#7f1d1d',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  summaryAgent: {
    fontSize: 11.5,
    color: '#991b1b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  inputSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  statusChoiceBtnActive: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  statusChoiceBtnDone: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  statusChoiceText: {
    fontSize: 11.5,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  statusChoiceTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 100,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 20,
  },
  submitActionBtn: {
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
