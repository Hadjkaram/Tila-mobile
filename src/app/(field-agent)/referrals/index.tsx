import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  ArrowRightLeft,
  Calendar,
  User,
  Building,
  X,
  AlertTriangle,
  ChevronRight,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  Phone,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { agentService, AgentReferralItem } from '../../../services/agent';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../../context/ThemeContext';

type FilterStatus = 'ALL' | 'PENDING' | 'RECEIVED' | 'URGENT';

export default function FieldAgentReferralsScreen() {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [selectedReferral, setSelectedReferral] = useState<AgentReferralItem | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['agent_referrals_list'],
    queryFn: () => agentService.getReferrals({ limit: 100 }),
  });

  const referrals = data?.items || [];

  const filteredReferrals = useMemo(() => {
    return referrals.filter((item) => {
      // Status filter
      if (activeFilter === 'PENDING') {
        const s = (item.statut || '').toLowerCase();
        if (s.includes('reçu') || s.includes('pris') || s.includes('accepted')) return false;
      } else if (activeFilter === 'RECEIVED') {
        const s = (item.statut || '').toLowerCase();
        if (!s.includes('reçu') && !s.includes('pris') && !s.includes('accepted')) return false;
      } else if (activeFilter === 'URGENT') {
        const p = (item.niveauPriorite || '').toLowerCase();
        if (!p.includes('haute') && !p.includes('urgent') && !p.includes('critique')) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchPatient = item.patientName?.toLowerCase().includes(q);
      const matchMotif = item.motif?.toLowerCase().includes(q);
      const matchSpecialiste = item.specialiste?.toLowerCase().includes(q);
      const matchCentre =
        item.referredToCentreName?.toLowerCase().includes(q) ||
        item.centre?.toLowerCase().includes(q);
      const matchCode = item.internalPatientCode?.toLowerCase().includes(q);

      return matchPatient || matchMotif || matchSpecialiste || matchCentre || matchCode;
    });
  }, [referrals, activeFilter, searchQuery]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const getPriorityStyle = (priority: string | null | undefined) => {
    const p = (priority || '').toLowerCase();
    if (p.includes('haute') || p.includes('urgent') || p.includes('critique')) {
      return { bg: '#fee2e2', text: '#ef4444', label: 'Urgent' };
    }
    if (p.includes('modéré') || p.includes('moyen')) {
      return { bg: '#fef3c7', text: '#d97706', label: 'Modéré' };
    }
    return { bg: '#f1f5f9', text: '#64748b', label: priority || 'Standard' };
  };

  const renderItem = ({ item }: { item: AgentReferralItem }) => {
    const pStyle = getPriorityStyle(item.niveauPriorite);
    const isUrgent =
      (item.niveauPriorite || '').toLowerCase().includes('urgent') ||
      (item.niveauPriorite || '').toLowerCase().includes('haute');

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          isUrgent && [styles.cardUrgent, { backgroundColor: isDark ? '#451a1a22' : '#fffbfa', borderColor: isDark ? '#7f1d1d' : '#fca5a5' }]
        ]}
        onPress={() => setSelectedReferral(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
            <ArrowRightLeft size={13} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>Orientation</Text>
          </View>

          <View style={[styles.priorityBadge, { backgroundColor: isDark ? '#451a1a' : pStyle.bg }]}>
            <Text style={[styles.priorityText, { color: pStyle.text }]}>{pStyle.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <User size={16} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.patientName, { color: colors.text }]}>{item.patientName || 'Migrant orienté'}</Text>
          </View>

          {!!item.motif && (
            <Text style={[styles.motifText, { color: colors.textSecondary }]} numberOfLines={2}>
              Motif : {item.motif}
            </Text>
          )}

          {!!(item.specialiste || item.referredToCentreName || item.centre) && (
            <View style={styles.rowSub}>
              <Building size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.destText, { color: colors.textSecondary }]} numberOfLines={1}>
                Vers : {item.specialiste || item.referredToCentreName || item.centre}
              </Text>
            </View>
          )}

          <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
            <View style={styles.rowSub}>
              <Calendar size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(item.dateReference || item.dateDepistage)}
              </Text>
            </View>

            <View style={styles.detailsTrigger}>
              <Text style={styles.detailsTriggerText}>Détails</Text>
              <ChevronRight size={14} color="#00A651" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      {/* Search Input */}
      <View style={[styles.searchSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher par nom, motif, centre..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[
              styles.filterPill, 
              { backgroundColor: colors.cardSecondary },
              activeFilter === 'ALL' && styles.filterPillActive
            ]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[
              styles.filterPillText, 
              { color: colors.textSecondary },
              activeFilter === 'ALL' && styles.filterPillTextActive
            ]}>
              Tous ({referrals.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill, 
              { backgroundColor: colors.cardSecondary },
              activeFilter === 'URGENT' && styles.filterPillActive
            ]}
            onPress={() => setActiveFilter('URGENT')}
          >
            <Text style={[
              styles.filterPillText, 
              { color: colors.textSecondary },
              activeFilter === 'URGENT' && styles.filterPillTextActive
            ]}>
              🚨 Urgents
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill, 
              { backgroundColor: colors.cardSecondary },
              activeFilter === 'PENDING' && styles.filterPillActive
            ]}
            onPress={() => setActiveFilter('PENDING')}
          >
            <Text style={[
              styles.filterPillText, 
              { color: colors.textSecondary },
              activeFilter === 'PENDING' && styles.filterPillTextActive
            ]}>
              En attente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill, 
              { backgroundColor: colors.cardSecondary },
              activeFilter === 'RECEIVED' && styles.filterPillActive
            ]}
            onPress={() => setActiveFilter('RECEIVED')}
          >
            <Text style={[
              styles.filterPillText, 
              { color: colors.textSecondary },
              activeFilter === 'RECEIVED' && styles.filterPillTextActive
            ]}>
              Reçus
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Referrals FlatList */}
      <FlatList
        data={filteredReferrals}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00A651" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ArrowRightLeft size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune orientation trouvée</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'Aucune fiche ne correspond à votre recherche.'
                : 'Les migrants orientés vers un centre partenaire apparaîtront ici.'}
            </Text>
          </View>
        }
      />

      {/* Modal Fiche d'Orientation Détaillée */}
      <Modal visible={!!selectedReferral} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Fiche d’Orientation Terrain</Text>
              <TouchableOpacity onPress={() => setSelectedReferral(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedReferral && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                {/* Patient Header */}
                <View style={[styles.detailCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Migrant / Patient</Text>
                  <Text style={[styles.detailValueName, { color: colors.text }]}>
                    {selectedReferral.patientName || 'Non renseigné'}
                  </Text>
                  {!!selectedReferral.internalPatientCode && (
                    <Text style={[styles.detailSubCode, { color: colors.textMuted }]}>
                      Matricule : {selectedReferral.internalPatientCode}
                    </Text>
                  )}
                </View>

                {/* Motif & Priorité */}
                <View style={[styles.detailCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Niveau d’urgence</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: isDark ? '#451a1a' : getPriorityStyle(selectedReferral.niveauPriorite).bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityStyle(selectedReferral.niveauPriorite).text },
                        ]}
                      >
                        {getPriorityStyle(selectedReferral.niveauPriorite).label}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.detailLabel, { color: colors.textSecondary, marginTop: 12 }]}>Motif d’orientation</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedReferral.motif || 'Non renseigné'}
                  </Text>
                </View>

                {/* Structure de destination */}
                <View style={[styles.detailCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Structure / Destinataire</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedReferral.specialiste ||
                      selectedReferral.referredToCentreName ||
                      selectedReferral.centre ||
                      'Centre partenaire'}
                  </Text>

                  <Text style={[styles.detailLabel, { color: colors.textSecondary, marginTop: 12 }]}>Date de référence</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedReferral.dateReference || selectedReferral.dateDepistage)}
                  </Text>
                </View>

                {/* Notes de terrain si présentes */}
                {!!selectedReferral.notes && (
                  <View style={[styles.detailCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes cliniques & terrain</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedReferral.notes}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.closeModalBtn, { backgroundColor: colors.cardSecondary }]}
                  onPress={() => setSelectedReferral(null)}
                >
                  <Text style={[styles.closeModalBtnText, { color: colors.text }]}>Fermer la fiche</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Montserrat_500Medium',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterPillActive: {
    backgroundColor: '#00A651',
  },
  filterPillText: {
    fontSize: 11.5,
    color: '#475569',
    fontFamily: 'Montserrat_500Medium',
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  listContent: {
    padding: 16,
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
  cardUrgent: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffbfa',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  cardBody: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  motifText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  rowSub: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Montserrat_400Regular',
  },
  detailsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsTriggerText: {
    fontSize: 12,
    color: '#00A651',
    fontWeight: '600',
    marginRight: 2,
    fontFamily: 'Montserrat_600SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
    fontFamily: 'Montserrat_400Regular',
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
  modalBody: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  detailCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Montserrat_600SemiBold',
  },
  detailValueName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  detailSubCode: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  detailValue: {
    fontSize: 13,
    color: '#1e293b',
    marginTop: 2,
    lineHeight: 18,
    fontFamily: 'Montserrat_500Medium',
  },
  closeModalBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeModalBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
