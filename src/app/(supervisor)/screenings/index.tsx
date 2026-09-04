import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  FileSearch,
  Filter,
  CheckCircle,
  Clock,
  ChevronRight,
  X,
  Building2,
  Calendar,
  AlertTriangle,
  User,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { superviseurService, SuperviseurScreeningItem } from '../../../services/superviseur';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../../context/ThemeContext';

const TOOL_FILTERS = [
  { key: 'tous', label: 'Tous' },
  { key: 'pcl-5-terrain', label: 'PCL-5 TERRAIN' },
  { key: 'sdq-terrain', label: 'SDQ TERRAIN' },
  { key: 'bmh-mwt-ods', label: 'ODS / BMH-MWT' },
  { key: 'berger-hiv-10', label: 'Berger (VIH)' },
];

export default function SupervisorScreeningsScreen() {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState('tous');
  const [selectedScreening, setSelectedScreening] = useState<SuperviseurScreeningItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);

  const {
    data: screeningsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['supervisor-screenings-list'],
    queryFn: () => superviseurService.getScreenings(),
  });

  const allItems = screeningsData?.items || [];

  // Filter items by search and tool
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allItems.filter((item) => {
      const matchTool = selectedTool === 'tous' || item.templateKey.toLowerCase().includes(selectedTool);
      if (!matchTool) return false;

      if (!q) return true;
      const patientMatch = (item.patientName || '').toLowerCase().includes(q);
      const codeMatch = (item.patientCode || '').toLowerCase().includes(q);
      const siteMatch = (item.siteName || '').toLowerCase().includes(q);
      const evalMatch = (item.evaluatorName || '').toLowerCase().includes(q);

      return patientMatch || codeMatch || siteMatch || evalMatch;
    });
  }, [allItems, searchQuery, selectedTool]);

  const handleOpenDetail = (item: SuperviseurScreeningItem) => {
    setSelectedScreening(item);
    setModalVisible(true);
  };

  const handleValidateReview = (id: number) => {
    setReviewedIds((prev) => [...prev, id]);
    setModalVisible(false);
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'severe':
        return {
          bg: isDark ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2',
          text: isDark ? '#f87171' : '#dc2626',
          border: isDark ? '#7f1d1d' : '#fca5a5',
          label: 'Sévère',
        };
      case 'modere':
        return {
          bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#fef3c7',
          text: isDark ? '#fbbf24' : '#d97706',
          border: isDark ? '#92400e' : '#fcd34d',
          label: 'Modéré',
        };
      default:
        return {
          bg: isDark ? 'rgba(0, 166, 81, 0.15)' : '#ecfdf5',
          text: '#00A651',
          border: isDark ? '#065f46' : '#a7f3d0',
          label: 'Faible',
        };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      {/* 1. Barre de Recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.cardSecondary }]}>
          <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher patient, code, centre, agent..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* 2. Filtres rapides par questionnaire */}
      <View style={[styles.filterSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsScroll}>
          {TOOL_FILTERS.map((tool) => {
            const isSelected = selectedTool === tool.key;
            return (
              <TouchableOpacity
                key={tool.key}
                style={[
                  styles.toolPill,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                  isSelected && styles.toolPillSelected,
                ]}
                onPress={() => setSelectedTool(tool.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.toolPillText,
                    { color: colors.textSecondary },
                    isSelected && styles.toolPillTextSelected,
                  ]}
                >
                  {tool.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Compteur de résultats */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredItems.length} dépistage(s) supervisé(s)
        </Text>
      </View>

      {/* 3. Liste des fiches de dépistage */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement des dépistages terrain...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00A651" />
          }
        >
          {filteredItems.length === 0 ? (
            <View style={styles.emptyWrap}>
              <FileSearch size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun dépistage trouvé</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Modifiez vos critères de recherche ou sélectionnez un autre outil.
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => {
              const sev = getSeverityStyle(item.severity);
              const isReviewed = item.reviewStatus === 'revu' || reviewedIds.includes(item.id);

              let formattedDate = item.createdAt;
              try {
                formattedDate = format(parseISO(item.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr });
              } catch {}

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleOpenDetail(item)}
                  activeOpacity={0.8}
                >
                  {/* Carte Top : Patient + Code + Statut Revue */}
                  <View style={styles.cardHeader}>
                    <View style={styles.patientInfoCol}>
                      <Text style={[styles.patientName, { color: colors.text }]}>{item.patientName}</Text>
                      <Text style={[styles.patientCode, { color: colors.textSecondary }]}>{item.patientCode}</Text>
                    </View>
                    <View
                      style={[
                        styles.reviewBadge,
                        isReviewed
                          ? (isDark ? styles.reviewBadgeDoneDark : styles.reviewBadgeDone)
                          : (isDark ? styles.reviewBadgePendingDark : styles.reviewBadgePending),
                      ]}
                    >
                      {isReviewed ? (
                        <CheckCircle size={12} color="#00A651" style={{ marginRight: 4 }} />
                      ) : (
                        <Clock size={12} color={isDark ? '#fbbf24' : '#d97706'} style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.reviewBadgeText,
                          isReviewed ? styles.textSuccess : (isDark ? styles.textWarningDark : styles.textWarning),
                        ]}
                      >
                        {isReviewed ? 'Revu & Validé' : 'À examiner'}
                      </Text>
                    </View>
                  </View>

                  {/* Outil & Date */}
                  <View style={styles.toolRow}>
                    <ClipboardList size={14} color="#00A651" style={{ marginRight: 6 }} />
                    <Text style={styles.toolTitle}>{item.templateTitle}</Text>
                  </View>

                  {/* Métadonnées : Centre + Agent */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Building2 size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>{item.siteName}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <User size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaItemText, { color: colors.textSecondary }]}>Agent : {item.evaluatorName}</Text>
                    </View>
                  </View>

                  {/* Score & Sévérité */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <View style={[styles.severityBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                      <Text style={[styles.severityBadgeText, { color: sev.text }]}>
                        Score {item.score} • {sev.label}
                      </Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{formattedDate}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 4. Modal Détail de la Revue Clinique */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Revue du Dépistage</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Détails cliniques pour supervision</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedScreening && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Bloc Patient */}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Patient & Identité</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Nom & Prénom</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedScreening.patientName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Code interne</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedScreening.patientCode}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Site de dépistage</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedScreening.siteName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Agent examinateur</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedScreening.evaluatorName}</Text>
                    </View>
                  </View>
                </View>

                {/* Bloc Score Clinique */}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Évaluation & Scores</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Questionnaire</Text>
                      <Text style={[styles.detailValue, { color: '#00A651', fontWeight: '700' }]}>
                        {selectedScreening.templateTitle}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Score total</Text>
                      <Text style={[styles.detailValue, { color: colors.text, fontSize: 16, fontWeight: '700' }]}>
                        {selectedScreening.score} pts
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Niveau de sévérité</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          {
                            color:
                              selectedScreening.severity === 'severe'
                                ? (isDark ? '#f87171' : '#dc2626')
                                : selectedScreening.severity === 'modere'
                                ? (isDark ? '#fbbf24' : '#d97706')
                                : '#00A651',
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {selectedScreening.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Bloc Alertes Cliniques */}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Alertes Détectées</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                    <View style={styles.alertCheckRow}>
                      <Text style={[styles.alertCheckLabel, { color: colors.text }]}>Idéation suicidaire</Text>
                      <Text style={selectedScreening.alerts.suicide ? styles.textDanger : styles.textSuccess}>
                        {selectedScreening.alerts.suicide ? '⚠️ OUI (Prioritaire)' : 'Non détectée'}
                      </Text>
                    </View>
                    <View style={styles.alertCheckRow}>
                      <Text style={[styles.alertCheckLabel, { color: colors.text }]}>Risque TSPT aigu</Text>
                      <Text style={selectedScreening.alerts.tspt ? (isDark ? styles.textWarningDark : styles.textWarning) : styles.textSuccess}>
                        {selectedScreening.alerts.tspt ? '⚠️ Positif (Score ≥ 32)' : 'Négatif'}
                      </Text>
                    </View>
                    <View style={styles.alertCheckRow}>
                      <Text style={[styles.alertCheckLabel, { color: colors.text }]}>Symptômes psychotiques</Text>
                      <Text style={selectedScreening.alerts.psychose ? (isDark ? styles.textWarningDark : styles.textWarning) : styles.textSuccess}>
                        {selectedScreening.alerts.psychose ? '⚠️ Présents' : 'Absents'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Bouton de Validation */}
                <TouchableOpacity
                  style={styles.validateBtn}
                  onPress={() => handleValidateReview(selectedScreening.id)}
                  activeOpacity={0.85}
                >
                  <ShieldCheck size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.validateBtnText}>Valider et clôturer la revue clinique</Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#ffffff',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    fontFamily: 'Montserrat_500Medium',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  toolsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  toolPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolPillSelected: {
    backgroundColor: '#00A651',
    borderColor: '#00A651',
  },
  toolPillText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  toolPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  countRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  patientInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  patientCode: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewBadgeDone: {
    backgroundColor: '#ecfdf5',
  },
  reviewBadgeDoneDark: {
    backgroundColor: 'rgba(0, 166, 81, 0.15)',
  },
  reviewBadgePending: {
    backgroundColor: '#fef3c7',
  },
  reviewBadgePendingDark: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolTitle: {
    fontSize: 12.5,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
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
  metaItemText: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Montserrat_400Regular',
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
  textDanger: {
    color: '#dc2626',
    fontWeight: '700',
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
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  detailCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  detailValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  alertCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertCheckLabel: {
    fontSize: 12.5,
    color: '#334155',
    fontFamily: 'Montserrat_500Medium',
  },
  validateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 24,
  },
  validateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
