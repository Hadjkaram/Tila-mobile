import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, MessageCircle, Hash } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { forumService, ForumGroup } from '../../../services/forum';
import { Skeleton } from '../../../components/ui/Skeleton';

export default function ForumGroupsScreen() {
  const router = useRouter();

  const { data: groups, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['forum_groups'],
    queryFn: () => forumService.listGroups(),
  });

  const renderGroup = ({ item }: { item: ForumGroup }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/(specialist)/forum/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Hash size={24} color="#00A651" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.groupName}>{item.name}</Text>
          {item.isPrivate && (
            <View style={styles.privateBadge}>
              <Text style={styles.privateText}>Privé</Text>
            </View>
          )}
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Users size={16} color="#64748b" />
          <Text style={styles.statText}>{item.membersCount} membres</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <MessageCircle size={16} color="#64748b" />
          <Text style={styles.statText}>{item.postsCount} messages</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSkeleton = () => (
    <View style={{ padding: 24 }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.card, { padding: 0 }]}>
          <Skeleton height={130} borderRadius={16} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Forum & Groupes</Text>
      </View>

      {isLoading ? renderSkeleton() : (
        <FlatList
          data={groups || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#00A651']} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MessageCircle size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>Aucun groupe</Text>
              <Text style={styles.emptyText}>
                Vous n'avez accès à aucun groupe de discussion pour le moment.
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  groupName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  privateBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  privateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 16,
  },
  statText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  }
});
