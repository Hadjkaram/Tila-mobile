import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Keyboard } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, User, ChevronRight, Inbox, X, Phone, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { professionalService } from '../../../services/professionals';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useTheme } from '../../../context/ThemeContext';

export default function PatientsListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Récupération de la liste complète des patients (avec persistance hors-ligne 7 jours)
  const { 
    data: allPatientsData, 
    isLoading, 
    isRefetching, 
    refetch 
  } = useQuery({
    queryKey: ['pro_patients_all'],
    queryFn: () => professionalService.listPatients({ limit: 300 }),
  });

  const allPatients = allPatientsData?.items || [];

  // 2. Recherche locale instantanée en mémoire (0ms, 100% hors-ligne)
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return allPatients;
    const query = searchQuery.trim().toLowerCase();

    return allPatients.filter((p: any) => {
      const fullName = (p.name || `${p.firstName || ''} ${p.lastName || ''}`).toLowerCase();
      const phone = (p.phone || p.phoneNumber || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const code = (p.internalPatientCode || '').toLowerCase();
      
      return (
        fullName.includes(query) ||
        phone.includes(query) ||
        email.includes(query) ||
        code.includes(query)
      );
    });
  }, [allPatients, searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const renderItem = ({ item }: { item: any }) => {
    const displayName = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Patient Inconnu';
    const contact = item.phone || item.phoneNumber || item.email || '';

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/(specialist)/patients/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]}>
            <User size={22} color="#00A651" />
          </View>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: colors.text }]}>{displayName}</Text>
            {!!contact && (
              <View style={styles.contactRow}>
                {item.phone || item.phoneNumber ? (
                  <Phone size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                ) : (
                  <Mail size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.contactInfo, { color: colors.textSecondary }]}>{contact}</Text>
              </View>
            )}
            {!!item.age && <Text style={[styles.metaInfo, { color: colors.textMuted }]}>{item.age} ans</Text>}
            {!!item.internalPatientCode && (
              <Text style={styles.codeBadge}>{item.internalPatientCode}</Text>
            )}
          </View>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderSkeleton = () => (
    <View style={{ padding: 24 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={[styles.card, { padding: 0, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderColor: colors.border }]}>
          <Skeleton height={50} borderRadius={8} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.headerText }]}>Mes Patients</Text>
          {allPatients.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' }]}>
              <Text style={styles.countText}>{filteredPatients.length} / {allPatients.length}</Text>
            </View>
          )}
        </View>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}>
          <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher par nom, téléphone, code..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearIcon}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {(isLoading && !allPatientsData) ? renderSkeleton() : (
        <FlatList
          data={filteredPatients}
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
              <Inbox size={48} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery ? "Aucun résultat" : "Aucun patient"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery 
                  ? `Aucun patient ne correspond à "${searchQuery}".`
                  : "Vous n'avez pas encore de patients dans votre répertoire."}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A651',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  clearIcon: {
    padding: 4,
  },
  listContent: {
    padding: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactInfo: {
    fontSize: 13,
    color: '#64748b',
  },
  metaInfo: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  codeBadge: {
    fontSize: 11,
    color: '#00A651',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
