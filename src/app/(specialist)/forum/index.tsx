import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  MessageCircle,
  Hash,
  Search,
  Heart,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Info,
  Stethoscope,
  Lock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { forumService, ForumGroup } from '../../../services/forum';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useTheme } from '../../../context/ThemeContext';

export default function SpecialistForumScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'clinical' | 'intervision'>('all');

  const {
    data: groups = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['specialist_forum_groups'],
    queryFn: () => forumService.listGroups(),
  });

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (activeCategory === 'clinical') {
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes('clinique') ||
          g.name.toLowerCase().includes('cas') ||
          g.name.toLowerCase().includes('médical') ||
          g.description?.toLowerCase().includes('clinique')
      );
    } else if (activeCategory === 'intervision') {
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes('intervision') ||
          g.name.toLowerCase().includes('supervision') ||
          g.name.toLowerCase().includes('éthique') ||
          g.name.toLowerCase().includes('confratern')
      );
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();
    return result.filter(
      (g) =>
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q))
    );
  }, [groups, searchQuery, activeCategory]);

  const renderGroup = ({ item }: { item: ForumGroup }) => (
    <TouchableOpacity
      style={[
        styles.card,
        isDark && { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => router.push(`/(specialist)/forum/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Hash size={20} color="#7c3aed" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.groupName, isDark && { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.badgeRow}>
            {item.isPrivate ? (
              <View style={styles.privateBadge}>
                <Lock size={10} color="#b45309" style={{ marginRight: 3 }} />
                <Text style={styles.privateText}>Confraternel</Text>
              </View>
            ) : (
              <View style={styles.publicBadge}>
                <Stethoscope size={10} color="#00A651" style={{ marginRight: 3 }} />
                <Text style={styles.publicText}>Réseau PNSM</Text>
              </View>
            )}
          </View>
        </View>
        <ChevronRight size={18} color={isDark ? colors.textSecondary : '#94a3b8'} />
      </View>

      {item.description ? (
        <Text style={[styles.description, isDark && { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={[styles.statsRow, isDark && { backgroundColor: colors.bgSecondary }]}>
        <View style={styles.stat}>
          <Users size={14} color="#64748b" />
          <Text style={[styles.statText, isDark && { color: colors.textSecondary }]}>
            {item.membersCount || 0} confrère{(item.membersCount || 0) > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <MessageCircle size={14} color="#64748b" />
          <Text style={[styles.statText, isDark && { color: colors.textSecondary }]}>
            {item.postsCount || 0} échange{(item.postsCount || 0) > 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Bannière de Collégialité Clinique */}
      <View style={[styles.banner, isDark && { backgroundColor: colors.card, borderColor: '#7c3aed40' }]}>
        <View style={styles.bannerHeader}>
          <View style={styles.bannerBadge}>
            <Stethoscope size={13} color="#7c3aed" style={{ marginRight: 4 }} />
            <Text style={styles.bannerBadgeText}>Collégialité Médicale & Échange entre pairs</Text>
          </View>
        </View>
        <Text style={[styles.bannerTitle, isDark && { color: colors.text }]}>
          Forum & Analyse de Cas Cliniques
        </Text>
        <Text style={[styles.bannerSub, isDark && { color: colors.textSecondary }]}>
          Espace sécurisé réservé aux psychiatres et psychologues agréés PNSM pour partager des retours d'expérience, discuter des prises en charge complexes et soutenir la communauté.
        </Text>
      </View>

      {/* Barre de Recherche */}
      <View style={[styles.searchBox, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color="#64748b" style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.searchInput, isDark && { color: colors.text }]}
          placeholder="Rechercher un groupe ou une thématique..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtres par thématiques */}
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, activeCategory === 'all' && styles.chipActive]}
          onPress={() => setActiveCategory('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, activeCategory === 'all' && styles.chipTextActive]}>
            Tous les groupes ({groups.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, activeCategory === 'clinical' && styles.chipActive]}
          onPress={() => setActiveCategory('clinical')}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, activeCategory === 'clinical' && styles.chipTextActive]}>
            Cas Cliniques
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, activeCategory === 'intervision' && styles.chipActive]}
          onPress={() => setActiveCategory('intervision')}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, activeCategory === 'intervision' && styles.chipTextActive]}>
            Intervision & Éthique
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ padding: 20 }}>
          <Skeleton height={110} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton height={110} borderRadius={16} style={{ marginBottom: 12 }} />
          <Skeleton height={110} borderRadius={16} />
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#7c3aed']} />
          }
          ListEmptyComponent={
            <View style={[styles.emptyState, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MessageCircle size={44} color="#94a3b8" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, isDark && { color: colors.text }]}>Aucun groupe trouvé</Text>
              <Text style={[styles.emptySub, isDark && { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'Aucun résultat ne correspond à votre recherche.'
                  : 'Aucun groupe de discussion disponible pour cette catégorie.'}
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
  banner: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bannerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    fontFamily: 'Montserrat_700Bold',
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#581c87',
    fontFamily: 'Montserrat_800ExtraBold',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: '#6b21a8',
    lineHeight: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    fontFamily: 'Montserrat_500Medium',
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  chipActive: {
    backgroundColor: '#7c3aed',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  privateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    fontFamily: 'Montserrat_700Bold',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  publicText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  description: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  statText: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
});
