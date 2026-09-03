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
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  X,
  BadgeCheck,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { ongService, SensibilisateurItem } from '../../services/ong';

export default function OngAgentsScreen() {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: agentsList,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['ong-sensibilisateurs'],
    queryFn: () => ongService.listSensibilisateurs(),
  });

  const filteredAgents = useMemo(() => {
    const list = agentsList || [];
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((a) => {
      const name = `${a.firstName} ${a.lastName}`.toLowerCase();
      const matricule = (a.matricule || '').toLowerCase();
      const ville = (a.ville?.name || '').toLowerCase();
      const centre = (a.centre?.name || '').toLowerCase();
      return name.includes(q) || matricule.includes(q) || ville.includes(q) || centre.includes(q);
    });
  }, [agentsList, searchQuery]);

  const handleCall = (phone: string) => {
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean) Linking.openURL(`tel:${clean}`);
  };

  const handleEmail = (email: string) => {
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const renderAgent = ({ item }: { item: SensibilisateurItem }) => {
    return (
      <View
        style={[
          styles.agentCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.agentName, { color: colors.text }]} numberOfLines={1}>
                {item.firstName} {item.lastName}
              </Text>
              <BadgeCheck size={16} color="#00A651" style={{ marginLeft: 6 }} />
            </View>
            <Text style={[styles.matriculeText, { color: colors.textSecondary }]}>
              Matricule : {item.matricule}
            </Text>
          </View>

          <View style={styles.scorePill}>
            <Text style={styles.scorePillValue}>{item.totalRecenses ?? 0}</Text>
            <Text style={styles.scorePillLabel}>recensés</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.ville?.name || 'Abidjan'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Building2 size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.centre?.name || 'CSCOM Abobo'}
            </Text>
          </View>
        </View>

        {/* Contact actions */}
        <View style={styles.actionRow}>
          {item.phone ? (
            <TouchableOpacity
              style={[
                styles.contactBtn,
                { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border },
              ]}
              onPress={() => handleCall(item.phone!)}
              activeOpacity={0.7}
            >
              <Phone size={13} color="#00A651" style={{ marginRight: 6 }} />
              <Text style={[styles.contactBtnText, { color: colors.text }]}>{item.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {item.email ? (
            <TouchableOpacity
              style={[
                styles.contactBtn,
                { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border },
              ]}
              onPress={() => handleEmail(item.email)}
              activeOpacity={0.7}
            >
              <Mail size={13} color="#2563eb" style={{ marginRight: 6 }} />
              <Text style={[styles.contactBtnText, { color: colors.text }]} numberOfLines={1}>
                Email
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
          placeholder="Rechercher par nom, matricule, ville..."
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

      <View style={styles.countBanner}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredAgents.length} agent(s) actif(s) sur le terrain
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A651" />
        </View>
      ) : (
        <FlatList
          data={filteredAgents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAgent}
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
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun agent trouvé</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'Aucun agent ne correspond à vos critères de recherche.'
                  : 'Aucun agent sensibilisateur validé pour cette organisation.'}
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
  countBanner: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  countText: {
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
  agentCard: {
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
  nameContainer: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  matriculeText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
  },
  scorePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  scorePillValue: {
    color: '#00A651',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  scorePillLabel: {
    color: '#00A651',
    fontSize: 9,
    fontFamily: 'Montserrat_500Medium',
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  contactBtnText: {
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
});
