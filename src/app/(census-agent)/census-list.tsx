import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Users,
  Phone,
  Building2,
  AlertTriangle,
  Plus,
  CloudCheck,
  CloudOff,
  MapPin,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { recensementService, PersonneRecensee } from '../../services/recensement';

type FilterType = 'all' | 'vulnerable' | 'oriented';

export default function CensusListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const {
    data: recensementData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['census-list'],
    queryFn: () => recensementService.list(),
  });

  const filteredItems = useMemo(() => {
    let items = recensementData?.items || [];

    // Filter by type
    if (activeFilter === 'vulnerable') {
      items = items.filter(
        (i) => i.vulnerabilities && i.vulnerabilities.length > 0
      );
    } else if (activeFilter === 'oriented') {
      items = items.filter((i) => i.refere);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((i) => {
        const full = `${i.prenom} ${i.nom}`.toLowerCase();
        const tel = (i.telephone || '').toLowerCase();
        const quartier = (i.quartier || '').toLowerCase();
        const ville = (i.ville || '').toLowerCase();
        return (
          full.includes(q) ||
          tel.includes(q) ||
          quartier.includes(q) ||
          ville.includes(q)
        );
      });
    }

    return items;
  }, [recensementData, activeFilter, searchQuery]);

  const handleCall = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    if (cleaned) {
      Linking.openURL(`tel:${cleaned}`);
    }
  };

  const renderItem = ({ item }: { item: PersonneRecensee }) => {
    const formattedDate = item.dateRecensement
      ? format(new Date(item.dateRecensement), 'dd MMM yyyy à HH:mm', { locale: fr })
      : null;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameGroup}>
            <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
              {item.prenom} {item.nom}
            </Text>
            <Text style={[styles.personSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.genre} {item.age ? `• ${item.age} ans` : ''} {item.profession ? `• ${item.profession}` : ''}
            </Text>
          </View>

          <View
            style={[
              styles.syncPill,
              item.synced !== false
                ? styles.syncPillOnline
                : styles.syncPillOffline,
            ]}
          >
            {item.synced !== false ? (
              <CloudCheck size={12} color="#00A651" style={{ marginRight: 3 }} />
            ) : (
              <CloudOff size={12} color="#ea580c" style={{ marginRight: 3 }} />
            )}
            <Text
              style={[
                styles.syncPillText,
                item.synced !== false
                  ? styles.syncPillTextOnline
                  : styles.syncPillTextOffline,
              ]}
            >
              {item.synced !== false ? 'Synchro' : 'En attente'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.ville || 'Abidjan'} {item.quartier ? `(${item.quartier})` : ''}
            </Text>
          </View>
          {formattedDate && (
            <View style={styles.metaItem}>
              <Calendar size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formattedDate}
              </Text>
            </View>
          )}
        </View>

        {/* Badges d'état (Orientation, Vulnérabilités) */}
        <View style={styles.badgesRow}>
          {item.refere && (
            <View style={styles.badgeOriented}>
              <Building2 size={11} color="#2563eb" style={{ marginRight: 3 }} />
              <Text style={styles.badgeOrientedText} numberOfLines={1}>
                {item.centreNom ? `Orienté vers : ${item.centreNom}` : 'Orienté vers un centre'}
              </Text>
            </View>
          )}
          {item.vulnerabilities && item.vulnerabilities.length > 0 && (
            <View style={styles.badgeVulnerable}>
              <AlertTriangle size={11} color="#d97706" style={{ marginRight: 3 }} />
              <Text style={styles.badgeVulnerableText}>
                {item.vulnerabilities.length} vulnérabilité(s)
              </Text>
            </View>
          )}
        </View>

        {item.notes ? (
          <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
            « {item.notes} »
          </Text>
        ) : null}

        {/* Action Appel direct */}
        {item.telephone ? (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={[
                styles.callButton,
                { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border },
              ]}
              onPress={() => handleCall(item.telephone!)}
              activeOpacity={0.7}
            >
              <Phone size={14} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={[styles.callButtonText, { color: colors.text }]}>
                Appeler ({item.telephone})
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher par nom, prénom, quartier, tél..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres rapides */}
      <View style={styles.filterRow}>
        {(
          [
            { id: 'all', label: `Tous (${recensementData?.items?.length || 0})` },
            { id: 'vulnerable', label: 'Vulnérables' },
            { id: 'oriented', label: 'Orientés centre' },
          ] as const
        ).map((f) => {
          const isSelected = activeFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSelected ? '#00A651' : colors.card,
                  borderColor: isSelected ? '#00A651' : colors.border,
                },
              ]}
              onPress={() => setActiveFilter(f.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Liste des personnes */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A651" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={['#00A651']}
              tintColor="#00A651"
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Users size={36} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun résultat trouvé</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'Aucune personne ne correspond à vos critères de recherche.'
                  : 'Vous n’avez pas encore enregistré de personne dans cette catégorie.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Bouton d'action flottant (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(census-agent)/form')}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
    paddingBottom: 90,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameGroup: {
    flex: 1,
    marginRight: 8,
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  personSub: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  syncPillOnline: {
    backgroundColor: '#ecfdf5',
  },
  syncPillOffline: {
    backgroundColor: '#fff7ed',
  },
  syncPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  syncPillTextOnline: {
    color: '#00A651',
  },
  syncPillTextOffline: {
    color: '#ea580c',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badgeOriented: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOrientedText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  badgeVulnerable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeVulnerableText: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  notesText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    fontStyle: 'italic',
    marginTop: 8,
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  emptyContainer: {
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00A651',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
