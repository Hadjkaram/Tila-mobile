import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Search, 
  Plus, 
  ClipboardList, 
  User, 
  Calendar, 
  Building, 
  CheckCircle2, 
  Clock, 
  X, 
  Inbox
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { agentService, AgentSubmissionItem } from '../../../services/agent';
import { Skeleton } from '../../../components/ui/Skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';

export default function AssessmentsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['agent_submissions_list'],
    queryFn: () => agentService.getSubmissions({ limit: 50 }),
  });

  const submissions = data?.items || [];

  const filteredSubmissions = submissions.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchPatient = item.patientName?.toLowerCase().includes(q);
    const matchTitle = (item.questionnaireTitle || item.questionnaireKey)?.toLowerCase().includes(q);
    const matchCentre = item.centre?.toLowerCase().includes(q);
    return matchPatient || matchTitle || matchCentre;
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const handleStartNewAssessment = () => {
    router.push('/(health-agent)/assessments/new');
  };

  const renderItem = ({ item }: { item: AgentSubmissionItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
          <ClipboardList size={14} color="#00A651" style={{ marginRight: 4 }} />
          <Text style={styles.badgeText}>
            {item.questionnaireTitle || item.questionnaireKey || 'ODS'}
          </Text>
        </View>

        {item.completed ? (
          <View style={[styles.statusBadge, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
            <CheckCircle2 size={12} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: '#00A651' }]}>Terminé</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
            <Clock size={12} color="#f97316" style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: '#f97316' }]}>En cours</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <User size={16} color={colors.textSecondary} style={styles.rowIcon} />
          <Text style={[styles.patientName, { color: colors.text }]}>{item.patientName || 'Patient non renseigné'}</Text>
        </View>

        {!!item.centre && (
          <View style={styles.infoRow}>
            <Building size={16} color={colors.textMuted} style={styles.rowIcon} />
            <Text style={[styles.centreName, { color: colors.textSecondary }]}>{item.centre}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Calendar size={16} color={colors.textMuted} style={styles.rowIcon} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.card, { padding: 16, backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Skeleton height={22} width={120} borderRadius={6} />
            <Skeleton height={22} width={80} borderRadius={6} />
          </View>
          <Skeleton height={18} width={200} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton height={14} width={150} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton height={14} width={100} borderRadius={4} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dépistages ODS</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Historique et évaluations de terrain</Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher par patient, questionnaire..."
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

      {/* List */}
      {(isLoading && !data) ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={filteredSubmissions}
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
                {searchQuery ? "Aucun résultat" : "Aucun dépistage"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery 
                  ? `Aucun dépistage ne correspond à "${searchQuery}".`
                  : "Vous n'avez pas encore enregistré de dépistage sur le terrain."}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleStartNewAssessment}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#ffffff" />
        <Text style={styles.fabText}>Nouveau</Text>
      </TouchableOpacity>
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
    paddingBottom: 90, // extra space for FAB
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
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00A651',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
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
  centreName: {
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#00A651',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
