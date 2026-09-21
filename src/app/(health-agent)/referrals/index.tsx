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
  Inbox,
  AlertTriangle,
  Plus,
  Stethoscope,
  Clock,
  CheckCircle2,
  FileText,
  ChevronRight,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { agentService, AgentReferralItem } from '../../../services/agent';
import { Skeleton } from '../../../components/ui/Skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../../context/ThemeContext';

export default function ReferralsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'ALL' | 'URGENTE' | 'HAUTE' | 'NORMALE'>('ALL');
  const [activeModalItem, setActiveModalItem] = useState<AgentReferralItem | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['agent_referrals_list'],
    queryFn: () => agentService.getReferrals({ limit: 100 }),
  });

  const referrals = data?.items || [];

  const counts = useMemo(() => {
    let urg = 0;
    let haut = 0;
    let norm = 0;
    referrals.forEach((r) => {
      const p = (r.niveauPriorite || '').toLowerCase();
      if (p.includes('urg')) urg++;
      else if (p.includes('haut')) haut++;
      else norm++;
    });
    return { all: referrals.length, urg, haut, norm };
  }, [referrals]);

  const filteredReferrals = useMemo(() => {
    return referrals.filter((item) => {
      // Priority filter
      if (selectedPriority !== 'ALL') {
        const itemP = (item.niveauPriorite || '').toUpperCase();
        if (selectedPriority === 'URGENTE' && !itemP.includes('URG')) return false;
        if (selectedPriority === 'HAUTE' && !itemP.includes('HAUT')) return false;
        if (selectedPriority === 'NORMALE' && (itemP.includes('URG') || itemP.includes('HAUT'))) return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchPatient = item.patientName?.toLowerCase().includes(q);
      const matchMotif = item.motif?.toLowerCase().includes(q);
      const matchSpecialiste = item.specialiste?.toLowerCase().includes(q);
      const matchCentre =
        item.referredToCentreName?.toLowerCase().includes(q) ||
        item.centre?.toLowerCase().includes(q);
      return matchPatient || matchMotif || matchSpecialiste || matchCentre;
    });
  }, [referrals, selectedPriority, searchQuery]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const getPriorityBadgeStyle = (priority: string | null | undefined) => {
    const p = (priority || '').toLowerCase();
    if (p.includes('urg') || p.includes('crit')) {
      return { bg: '#fee2e2', text: '#ef4444', darkBg: '#451a1a', label: 'Urgente' };
    }
    if (p.includes('haut') || p.includes('modér')) {
      return { bg: '#fffbeb', text: '#d97706', darkBg: '#451a03', label: 'Haute' };
    }
    return { bg: '#ecfdf5', text: '#059669', darkBg: '#064e3b', label: 'Normale' };
  };

  const renderItem = ({ item }: { item: AgentReferralItem }) => {
    const priorityStyle = getPriorityBadgeStyle(item.niveauPriorite);
    const destName = item.specialiste || item.referredToCentreName || item.centre;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setActiveModalItem(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
            <ArrowRightLeft size={13} color="#F58220" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>Orientation</Text>
          </View>

          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: isDark ? priorityStyle.darkBg : priorityStyle.bg },
            ]}
          >
            <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
              {priorityStyle.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <User size={16} color={colors.textSecondary} style={styles.rowIcon} />
            <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
              {item.patientName || 'Patient non renseigné'}
            </Text>
          </View>

          {!!item.motif && (
            <Text style={[styles.motifText, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.motif}
            </Text>
          )}

          {!!destName && (
            <View style={styles.infoRow}>
              {item.specialiste ? (
                <Stethoscope size={15} color="#00A651" style={styles.rowIcon} />
              ) : (
                <Building size={15} color="#00A651" style={styles.rowIcon} />
              )}
              <Text style={[styles.destText, { color: colors.textSecondary }]} numberOfLines={1}>
                Vers : {destName}
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.dateWrap}>
              <Calendar size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {formatDate(item.dateReference || item.dateDepistage)}
              </Text>
            </View>
            <View style={styles.moreWrap}>
              <Text style={styles.moreText}>Détails</Text>
              <ChevronRight size={14} color="#00A651" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[styles.card, { padding: 16, backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Skeleton height={22} width={100} borderRadius={6} />
            <Skeleton height={22} width={70} borderRadius={6} />
          </View>
          <Skeleton height={18} width={180} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton height={14} width={220} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton height={14} width={130} borderRadius={4} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      {/* Header with Title & Action */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Mes Orientations</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Suivi des cas orientés vers les centres et spécialistes
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push('/(health-agent)/referrals/new')}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.newButtonText}>Orienter</Text>
        </TouchableOpacity>
      </View>

      {/* Priority Filters */}
      <View style={styles.filterScroll}>
        {(
          [
            { key: 'ALL', label: 'Toutes', count: counts.all },
            { key: 'URGENTE', label: 'Urgente', count: counts.urg, color: '#ef4444' },
            { key: 'HAUTE', label: 'Haute', count: counts.haut, color: '#d97706' },
            { key: 'NORMALE', label: 'Normale', count: counts.norm, color: '#00A651' },
          ] as const
        ).map((f) => {
          const isSelected = selectedPriority === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                isSelected && {
                  backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
                  borderColor: '#00A651',
                },
              ]}
              onPress={() => setSelectedPriority(f.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isSelected ? '#00A651' : colors.textSecondary },
                  isSelected && { fontWeight: '700' },
                ]}
              >
                {f.label} ({f.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher par patient, motif, destinataire..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textMuted}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && !data ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={filteredReferrals}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#00A651']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Inbox size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery || selectedPriority !== 'ALL'
                  ? 'Aucun résultat'
                  : 'Aucune orientation'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery || selectedPriority !== 'ALL'
                  ? 'Aucune orientation ne correspond à ces critères.'
                  : 'Vous n’avez pas encore orienté de patient. Cliquez sur « Orienter » ci-dessus.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Referral Detail Modal */}
      <Modal visible={!!activeModalItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Détail de l’Orientation</Text>
              <TouchableOpacity onPress={() => setActiveModalItem(null)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {activeModalItem && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                {/* Patient Info */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
                    PATIENT
                  </Text>
                  <View style={styles.modalPatientRow}>
                    <View style={[styles.modalAvatar, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                      <User size={20} color="#00A651" />
                    </View>
                    <View>
                      <Text style={[styles.modalPatientName, { color: colors.text }]}>
                        {activeModalItem.patientName || 'Non renseigné'}
                      </Text>
                      {activeModalItem.internalPatientCode && (
                        <Text style={[styles.modalCode, { color: colors.textSecondary }]}>
                          Code : {activeModalItem.internalPatientCode}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Priority & Status */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
                    PRIORITÉ & STATUT
                  </Text>
                  <View style={styles.tagsRow}>
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor: isDark
                            ? getPriorityBadgeStyle(activeModalItem.niveauPriorite).darkBg
                            : getPriorityBadgeStyle(activeModalItem.niveauPriorite).bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityBadgeStyle(activeModalItem.niveauPriorite).text },
                        ]}
                      >
                        Priorité : {activeModalItem.niveauPriorite || 'Normale'}
                      </Text>
                    </View>

                    {activeModalItem.statut && (
                      <View style={[styles.statusBadge, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                        <Text style={[styles.statusText, { color: colors.text }]}>
                          Statut : {activeModalItem.statut}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Destination */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
                    DESTINATAIRE
                  </Text>
                  <View style={styles.destBox}>
                    {activeModalItem.specialiste ? (
                      <Stethoscope size={18} color="#00A651" style={{ marginRight: 8 }} />
                    ) : (
                      <Building size={18} color="#00A651" style={{ marginRight: 8 }} />
                    )}
                    <Text style={[styles.destNameText, { color: colors.text }]}>
                      {activeModalItem.specialiste ||
                        activeModalItem.referredToCentreName ||
                        activeModalItem.centre ||
                        'Centre de santé rattaché'}
                    </Text>
                  </View>
                </View>

                {/* Motif */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
                    MOTIF DE L’ORIENTATION
                  </Text>
                  <View style={[styles.notesBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                    <Text style={[styles.notesContent, { color: colors.text }]}>
                      {activeModalItem.motif || 'Aucun motif renseigné'}
                    </Text>
                  </View>
                </View>

                {/* Notes */}
                {!!activeModalItem.notes && (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
                      NOTES COMPLÉMENTAIRES
                    </Text>
                    <View style={[styles.notesBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                      <Text style={[styles.notesContent, { color: colors.text }]}>
                        {activeModalItem.notes}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Dates */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>
                    DATES DU DOSSIER
                  </Text>
                  <Text style={[styles.dateDetail, { color: colors.textSecondary }]}>
                    Date d’orientation : {formatDate(activeModalItem.dateReference)}
                  </Text>
                  {activeModalItem.dateDepistage && (
                    <Text style={[styles.dateDetail, { color: colors.textSecondary }]}>
                      Date de dépistage : {formatDate(activeModalItem.dateDepistage)}
                    </Text>
                  )}
                  {activeModalItem.submissionId && (
                    <Text style={[styles.dateDetail, { color: colors.textSecondary }]}>
                      Soumission associée : #{activeModalItem.submissionId}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setActiveModalItem(null)}
                >
                  <Text style={styles.closeBtnText}>Fermer</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearIcon: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F58220',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 8,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  motifText: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 2,
  },
  destText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
  },
  moreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreText: {
    fontSize: 12,
    color: '#00A651',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  modalSection: {
    gap: 6,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalPatientName: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCode: {
    fontSize: 12,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  destBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  destNameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesBox: {
    padding: 12,
    borderRadius: 10,
  },
  notesContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  dateDetail: {
    fontSize: 12,
  },
  closeBtn: {
    backgroundColor: '#00A651',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
