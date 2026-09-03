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
  TrendingUp,
  Building2,
  Search,
  MapPin,
  Users,
  Clock,
  Stethoscope,
  X,
  Sparkles,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { programAgentService, ProgramAgentCentreStat } from '../../services/programAgent';

export default function CentersPerfScreen() {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: centres,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['program-centres-perf'],
    queryFn: () => programAgentService.getCentresStatistics(),
  });

  const filteredCentres = useMemo(() => {
    const list = centres || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) => c.nom.toLowerCase().includes(q) || c.ville.toLowerCase().includes(q)
    );
  }, [centres, searchQuery]);

  const renderCentre = ({ item, index }: { item: ProgramAgentCentreStat; index: number }) => {
    return (
      <View
        style={[
          styles.centreCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.rankPill}>
            <Text style={styles.rankPillText}>#{index + 1}</Text>
          </View>
          <View style={styles.titleBox}>
            <Text style={[styles.centreName, { color: colors.text }]} numberOfLines={1}>
              {item.nom}
            </Text>
            <View style={styles.cityRow}>
              <MapPin size={11} color={colors.textMuted} style={{ marginRight: 3 }} />
              <Text style={[styles.cityName, { color: colors.textSecondary }]}>
                {item.ville}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {/* 1. Dépistages */}
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: colors.text }]}>{item.depistages}</Text>
            <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Dépistages</Text>
          </View>

          {/* 2. Taux Réf */}
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: '#00A651' }]}>{item.tauxRef}%</Text>
            <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Référés</Text>
          </View>

          {/* 3. Spécialistes */}
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: '#4f46e5' }]}>{item.specialistes}</Text>
            <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Spécialistes</Text>
          </View>

          {/* 4. Délai moyen */}
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: '#ea580c' }]}>
              {item.delaiPriseEnChargeJours}j
            </Text>
            <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Délai moyen</Text>
          </View>
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
          placeholder="Rechercher un centre ou une ville..."
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

      <View style={styles.topBanner}>
        <Text style={[styles.topBannerText, { color: colors.textSecondary }]}>
          Indicateurs de performance et délais de prise en charge
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
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
              colors={['#4f46e5']}
              tintColor="#4f46e5"
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Building2 size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun centre trouvé</Text>
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
  topBanner: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  topBannerText: {
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
    alignItems: 'center',
    marginBottom: 14,
  },
  rankPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankPillText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  titleBox: {
    flex: 1,
  },
  centreName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cityName: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  metricLbl: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
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
  },
});
