import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ArrowRightLeft, Calendar, User, Building, X, Inbox, AlertTriangle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { agentService, AgentReferralItem } from '../../../services/agent';
import { Skeleton } from '../../../components/ui/Skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ReferralsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['agent_referrals_list'],
    queryFn: () => agentService.getReferrals({ limit: 50 }),
  });

  const referrals = data?.items || [];

  const filteredReferrals = referrals.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchPatient = item.patientName?.toLowerCase().includes(q);
    const matchMotif = item.motif?.toLowerCase().includes(q);
    const matchSpecialiste = item.specialiste?.toLowerCase().includes(q);
    const matchCentre = item.referredToCentreName?.toLowerCase().includes(q) || item.centre?.toLowerCase().includes(q);
    return matchPatient || matchMotif || matchSpecialiste || matchCentre;
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const getPriorityBadgeStyle = (priority: string | null | undefined) => {
    switch (priority?.toLowerCase()) {
      case 'haute':
      case 'urgent':
      case 'critique':
        return { bg: '#fee2e2', text: '#ef4444' };
      case 'modéré':
      case 'moyen':
        return { bg: '#fef3c7', text: '#d97706' };
      default:
        return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const renderItem = ({ item }: { item: AgentReferralItem }) => {
    const priorityStyle = getPriorityBadgeStyle(item.niveauPriorite);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <ArrowRightLeft size={14} color="#F58220" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>Orientation</Text>
          </View>

          {!!item.niveauPriorite && (
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
                {item.niveauPriorite}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <User size={16} color="#64748b" style={styles.rowIcon} />
            <Text style={styles.patientName}>{item.patientName || 'Patient non renseigné'}</Text>
          </View>

          {!!item.motif && (
            <Text style={styles.motifText}>Motif: {item.motif}</Text>
          )}

          {!!(item.specialiste || item.referredToCentreName) && (
            <View style={styles.infoRow}>
              <Building size={16} color="#94a3b8" style={styles.rowIcon} />
              <Text style={styles.destText}>
                Orienté vers : {item.specialiste || item.referredToCentreName}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Calendar size={16} color="#94a3b8" style={styles.rowIcon} />
            <Text style={styles.dateText}>Date : {formatDate(item.dateReference || item.dateDepistage)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.card, { padding: 16 }]}>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Orientations</Text>
        <Text style={styles.subtitle}>Suivi des cas orientés vers des centres ou spécialistes</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par patient, motif, destinataire..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {(isLoading && !data) ? (
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
              <Inbox size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? "Aucun résultat" : "Aucune orientation"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? `Aucune orientation ne correspond à "${searchQuery}".`
                  : "Vous n'avez pas encore effectué d'orientation pour vos patients."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  clearIcon: {
    padding: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F58220',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  motifText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    marginVertical: 2,
  },
  destText: {
    fontSize: 13,
    color: '#64748b',
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});
