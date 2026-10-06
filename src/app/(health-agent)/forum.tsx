import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Text } from '../../components/Text';
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
  ClipboardList,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { forumService, ForumGroup } from '../../services/forum';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../context/ThemeContext';

export default function HealthAgentForumScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: groups = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['health_agent_forum_groups'],
    queryFn: () => forumService.listGroups(),
  });

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase().trim();
    return groups.filter(
      (g) =>
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q))
    );
  }, [groups, searchQuery]);

  const renderGroup = ({ item }: { item: ForumGroup }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
      onPress={() => router.push(`/(health-agent)/forum/${item.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDark
                ? 'rgba(0,166,81,0.15)'
                : '#ecfdf5',
            },
          ]}
        >
          <Hash size={22} color="#00A651" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.tagRow}>
            {item.isPrivate ? (
              <View
                style={[
                  styles.badgePrivate,
                  { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Communautaire & Pro
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.badgePublic,
                  { backgroundColor: isDark ? 'rgba(0,166,81,0.2)' : '#dcfce7' },
                ]}
              >
                <Text style={styles.badgePublicText}>Ouvert à tous</Text>
              </View>
            )}
          </View>
        </View>
        <ChevronRight size={18} color={isDark ? '#64748b' : '#94a3b8'} />
      </View>

      {!!item.description && (
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      )}

      <View style={[styles.statsRow, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
        <View style={styles.stat}>
          <Users size={14} color="#00A651" style={{ marginRight: 6 }} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.membersCount} acteur{item.membersCount > 1 ? 's' : ''} & membre{item.membersCount > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <MessageCircle size={14} color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.postsCount} message{item.postsCount > 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Bannière de soutien communautaire */}
      <View
        style={[
          styles.banner,
          {
            backgroundColor: isDark ? 'rgba(0,166,81,0.1)' : '#f0fdf4',
            borderColor: isDark ? 'rgba(0,166,81,0.3)' : '#bbf7d0',
          },
        ]}
      >
        <View style={styles.bannerTop}>
          <View style={styles.bannerIconWrap}>
            <Heart size={16} color="#00A651" />
          </View>
          <Text style={[styles.bannerTitle, { color: isDark ? '#4ade80' : '#166534' }]}>
            Forum d'Entraide Communautaire & Pratiques Terrain
          </Text>
        </View>
        <Text style={[styles.bannerDesc, { color: isDark ? '#cbd5e1' : '#1e3a29' }]}>
          Posez vos questions aux spécialistes de santé, échangez avec les autres agents communautaires sur vos retours d'expérience et trouvez des conseils d'orientation pour vos patients.
        </Text>
        <View style={styles.bannerFooter}>
          <ShieldCheck size={14} color="#00A651" style={{ marginRight: 6 }} />
          <Text style={styles.bannerFooterText}>
            Espace modéré et encadré par le PNSM
          </Text>
        </View>
      </View>

      {/* Barre de recherche */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Search size={18} color={isDark ? '#64748b' : '#94a3b8'} style={{ marginRight: 10 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher un groupe ou un sujet..."
          placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.sectionTitleRow}>
        <Sparkles size={16} color="#00A651" style={{ marginRight: 6 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Groupes communautaires ({filteredGroups.length})
        </Text>
      </View>
    </View>
  );

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      <Skeleton height={120} borderRadius={16} style={{ marginBottom: 16 }} />
      <Skeleton height={44} borderRadius={12} style={{ marginBottom: 20 }} />
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              padding: 0,
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              marginBottom: 12,
            },
          ]}
        >
          <Skeleton height={140} borderRadius={16} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgSecondary }]}
      edges={['bottom']}
    >
      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGroup}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#00A651"
              colors={['#00A651']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Info size={36} color="#94a3b8" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Aucun groupe trouvé
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? "Aucun résultat ne correspond à votre recherche."
                  : "Aucun groupe de discussion n'est disponible pour l'instant."}
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  headerSection: {
    marginBottom: 16,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerIconWrap: {
    backgroundColor: '#dcfce7',
    padding: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  bannerDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 12,
  },
  bannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerFooterText: {
    fontSize: 11.5,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: 'Montserrat_500Medium',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  groupName: {
    fontSize: 15.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgePrivate: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePublic: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
  },
  badgePublicText: {
    fontSize: 11,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 8,
  },
  statText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_500Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 18,
  },
});
