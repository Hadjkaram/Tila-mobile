import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserCheck, Calendar, AlertCircle, X, Inbox, ShieldAlert } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { agentService, AgentReceivedPatientItem } from '../../../services/agent';
import { Skeleton } from '../../../components/ui/Skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../../context/ThemeContext';

export default function ReceivedPatientsScreen() {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['agent_received_patients_list'],
    queryFn: async () => {
      try {
        const res = await agentService.getReceivedPatients({ limit: 50 });
        return { ...res, isForbidden: false };
      } catch (err: any) {
        const is403 = err?.response?.status === 403 || err?.status === 403 || String(err?.message).includes('403');
        if (is403) {
          return { items: [], total: 0, page: 1, limit: 50, stats: { total: 0, orientes: 0, referes: 0 }, isForbidden: true };
        }
        throw err;
      }
    },
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 403 || err?.status === 403) return false;
      return failureCount < 2;
    }
  });

  const isForbidden = data?.isForbidden;
  const patients = data?.items || [];

  const filteredPatients = patients.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
    const matchName = fullName.includes(q);
    const matchMotif = item.referral?.motif?.toLowerCase().includes(q);
    return matchName || matchMotif;
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }: { item: AgentReceivedPatientItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
          <UserCheck size={22} color="#00A651" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.patientName, { color: colors.text }]}>{item.firstName} {item.lastName}</Text>
          <View style={styles.dateRow}>
            <Calendar size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>Reçu le {formatDate(item.receivedAt)}</Text>
          </View>
        </View>
      </View>

      {item.referral && (
        <View style={[styles.referralBox, { backgroundColor: colors.cardSecondary }]}>
          <View style={styles.referralHeader}>
            <AlertCircle size={14} color="#f59e0b" style={{ marginRight: 4 }} />
            <Text style={[styles.referralTitle, { color: colors.text }]}>Orientation : {item.referral.type === 'centre' ? 'Centre de santé' : 'Spécialiste'}</Text>
          </View>
          {!!item.referral.motif && (
            <Text style={[styles.referralMotif, { color: colors.textSecondary }]}>Motif: {item.referral.motif}</Text>
          )}
          {!!item.referral.referredToName && (
            <Text style={[styles.referralTarget, { color: colors.textSecondary }]}>Vers: {item.referral.referredToName}</Text>
          )}
        </View>
      )}
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.card, { padding: 16, backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton height={44} width={44} borderRadius={22} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Skeleton height={18} width={160} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton height={14} width={120} borderRadius={4} />
            </View>
          </View>
          <Skeleton height={50} borderRadius={10} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Patients Reçus</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Liste des patients pris en charge sur le terrain</Text>
      </View>

      {isForbidden ? (
        <View style={styles.forbiddenContainer}>
          <View style={[styles.forbiddenIconContainer, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
            <ShieldAlert size={48} color="#f59e0b" />
          </View>
          <Text style={[styles.forbiddenTitle, { color: colors.text }]}>Accès Restreint</Text>
          <Text style={styles.forbiddenText}>
            Vous n'avez pas l'autorisation d'accéder à cette section.
          </Text>
          <Text style={[styles.forbiddenSubtext, { color: colors.textSecondary }]}>
            Cette fonctionnalité est réservée aux professionnels de santé habilités et n'est pas accessible aux acteurs communautaires.
          </Text>
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Rechercher par nom, motif..."
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

          {(isLoading && !data) ? (
            renderSkeleton()
          ) : (
            <FlatList
              data={filteredPatients}
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
                    {searchQuery ? "Aucun résultat" : "Aucun patient reçu"}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery 
                      ? `Aucun patient ne correspond à "${searchQuery}".`
                      : "Vous n'avez pas encore de patients enregistrés comme reçus."}
                  </Text>
                </View>
              }
            />
          )}
        </>
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
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  referralBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  referralTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  referralMotif: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 2,
  },
  referralTarget: {
    fontSize: 12,
    color: '#64748b',
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
  forbiddenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  forbiddenIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  forbiddenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  forbiddenText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d97706',
    textAlign: 'center',
    marginBottom: 8,
  },
  forbiddenSubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
