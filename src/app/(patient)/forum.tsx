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
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { forumService, ForumGroup } from '../../services/forum';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../context/ThemeContext';

export default function PatientForumScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: groups = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['patient_forum_groups'],
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
      onPress={() => router.push(`/(patient)/forum/${item.id}`)}
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
                  Groupe d'échange
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
            {item.membersCount} participant{item.membersCount > 1 ? 's' : ''}
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
      {/* Bannière de sensibilisation / bienveillance */}
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
            Espace d'écoute et d'entraide sécurisé
          </Text>
        </View>
        <Text style={[styles.bannerDesc, { color: isDark ? '#cbd5e1' : '#1e3a29' }]}>
          Échangez avec d'autres bénéficiaires dans un cadre respectueux, bienveillant et modéré par des professionnels de santé TILA. Vous pouvez publier sous pseudonyme ou de façon confidentielle.
        </Text>
        <View style={styles.bannerFooter}>
          <ShieldCheck size={14} color="#00A651" style={{ marginRight: 6 }} />
          <Text style={styles.bannerFooterText}>
            Respect mutuel & confidentialité garantis
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
          Groupes de parole ({filteredGroups.length})
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
            <View style={styles.emptyState}>
              <MessageCircle
                size={48}
                color={isDark ? '#334155' : '#cbd5e1'}
                style={{ marginBottom: 12 }}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery ? 'Aucun groupe trouvé' : 'Aucun groupe disponible'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery
                  ? `Aucun groupe ne correspond à "${searchQuery}". Essayez un autre mot-clé.`
                  : "Les groupes d'échange seront disponibles dès leur ouverture par l'équipe TILA."}
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 8,
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  bannerDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 10,
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
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
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    marginRight: 8,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgePublic: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePublicText: {
    color: '#15803d',
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  badgePrivate: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '500',
    fontFamily: 'Montserrat_500Medium',
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
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  emptyState: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: 'Montserrat_400Regular',
  },
});
