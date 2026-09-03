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
  Building2,
  Search,
  Phone,
  MapPin,
  Stethoscope,
  ChevronRight,
  X,
  ShieldCheck,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { ongService, OngCentreItem } from '../../services/ong';

export default function OngCentersScreen() {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: centres,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['ong-centres-list'],
    queryFn: () => ongService.listCentres(),
  });

  const filteredCentres = useMemo(() => {
    const list = centres || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ville || '').toLowerCase().includes(q) ||
        (c.careLevel || '').toLowerCase().includes(q)
    );
  }, [centres, searchQuery]);

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean) Linking.openURL(`tel:${clean}`);
  };

  const renderCentre = ({ item }: { item: OngCentreItem }) => {
    return (
      <View
        style={[
          styles.centreCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleBox}>
            <Text style={[styles.centreName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.centreDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description || 'Centre de référence partenaire TILA'}
            </Text>
          </View>
          {item.careLevel && (
            <View style={styles.careBadge}>
              <Text style={styles.careBadgeText}>{item.careLevel}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.ville || 'Abidjan'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Stethoscope size={13} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.activeSpecialists ?? 3} praticiens actifs
            </Text>
          </View>
        </View>

        {item.phone && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={[
                styles.callBtn,
                { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border },
              ]}
              onPress={() => handleCall(item.phone)}
              activeOpacity={0.7}
            >
              <Phone size={13} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={[styles.callBtnText, { color: colors.text }]}>{item.phone}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      {/* Recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher un centre, une ville ou un niveau..."
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

      <View style={styles.topInfo}>
        <Text style={[styles.topInfoText, { color: colors.textSecondary }]}>
          {filteredCentres.length} centre(s) partenaire(s) sous convention
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A651" />
        </View>
      ) : (
        <FlatList
          data={filteredCentres}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCentre}
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
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Building2 size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun centre trouvé</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Aucun établissement de santé ne correspond à votre recherche.
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
  searchContainer: {
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
  topInfo: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  topInfoText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
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
  centreCard: {
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
  titleBox: {
    flex: 1,
    marginRight: 8,
  },
  centreName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  centreDesc: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  careBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  careBadgeText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
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
