import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Search,
  MapPin,
  Calendar,
  Building2,
  User,
  ArrowRight,
  Filter,
  X,
  Compass,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { programAgentService, ProgramAlertItem } from '../../services/programAgent';

type PriorityFilter = 'ALL' | 'Critique' | 'Haute' | 'Moyenne' | 'Basse';

export default function ProgramAlertsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PriorityFilter>('ALL');

  const {
    data: alertsList,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['program-alerts-list', selectedPriority],
    queryFn: () => programAgentService.getAlerts({ priorite: selectedPriority }),
  });

  const filteredAlerts = useMemo(() => {
    let list = alertsList || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.codePatient.toLowerCase().includes(q) ||
          a.ville.toLowerCase().includes(q) ||
          a.centre.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    return list;
  }, [alertsList, searchQuery]);

  const getPriorityStyle = (priorite: string) => {
    switch (priorite) {
      case 'Critique':
        return { bg: '#fef2f2', border: '#fecaca', text: '#ef4444' };
      case 'Haute':
        return { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c' };
      case 'Moyenne':
        return { bg: '#fefce8', border: '#fef08a', text: '#ca8a04' };
      default:
        return { bg: '#ecfdf5', border: '#a7f3d0', text: '#00A651' };
    }
  };

  const renderAlert = ({ item }: { item: ProgramAlertItem }) => {
    const pStyle = getPriorityStyle(item.priorite);
    const dateStr = item.date
      ? format(new Date(item.date), 'dd MMM yyyy à HH:mm', { locale: fr })
      : '';

    return (
      <View
        style={[
          styles.alertCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.codeGroup}>
            <Text style={[styles.codeText, { color: colors.text }]}>{item.codePatient}</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</Text>
          </View>
          <View style={[styles.priorityPill, { backgroundColor: pStyle.bg, borderColor: pStyle.border }]}>
            <AlertTriangle size={11} color={pStyle.text} style={{ marginRight: 4 }} />
            <Text style={[styles.priorityPillText, { color: pStyle.text }]}>{item.priorite}</Text>
          </View>
        </View>

        <Text style={[styles.descText, { color: colors.text }]}>{item.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.ville} ({item.centre})
            </Text>
          </View>
          {item.scoreODS ? (
            <View style={styles.metaItem}>
              <Text style={[styles.scoreBadge, { color: pStyle.text }]}>
                Score ODS : {item.scoreODS}/20
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.agentRefText, { color: colors.textSecondary }]} numberOfLines={1}>
            Référé par : {item.agentReferent || 'Agent communautaire'}
          </Text>

          <TouchableOpacity
            style={styles.pathwayLinkBtn}
            onPress={() => router.push('/(program-agent)/pathway-360')}
            activeOpacity={0.7}
          >
            <Compass size={13} color="#4f46e5" style={{ marginRight: 4 }} />
            <Text style={styles.pathwayLinkText}>Voir parcours 360°</Text>
            <ArrowRight size={12} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      {/* Barre de recherche */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher par code patient, ville ou mot-clé..."
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

      {/* Filtres de priorité */}
      <View style={styles.filtersRow}>
        {(['ALL', 'Critique', 'Haute', 'Moyenne', 'Basse'] as const).map((p) => {
          const isSelected = selectedPriority === p;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSelected ? '#4f46e5' : colors.card,
                  borderColor: isSelected ? '#4f46e5' : colors.border,
                },
              ]}
              onPress={() => setSelectedPriority(p)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {p === 'ALL' ? 'Toutes' : p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Liste des alertes */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAlert}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={['#4f46e5']}
              tintColor="#4f46e5"
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AlertTriangle size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune alerte</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Aucune alerte sanitaire correspondant à ces filtres.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  codeGroup: {
    flex: 1,
    marginRight: 8,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  descText: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  scoreBadge: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  agentRefText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    flex: 1,
    marginRight: 8,
  },
  pathwayLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pathwayLinkText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginRight: 4,
  },
  emptyCard: {
    marginTop: 40,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
