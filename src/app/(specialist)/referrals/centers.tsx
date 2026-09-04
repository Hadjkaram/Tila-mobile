import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, useColorScheme } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Search, ChevronRight, Phone } from 'lucide-react-native';
import { useGetCenters } from '../../../hooks/useProfessionalApi';
import { useTheme } from '../../../context/ThemeContext';

export default function CentersList() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const { data: apiCenters, isLoading, isError } = useGetCenters();

  const displayCenters = apiCenters || [];

  const filteredCenters = displayCenters.filter((c: any) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const theme = {
    bg: colors.bgSecondary,
    card: colors.card,
    text: colors.text,
    textSecondary: colors.textSecondary,
    border: colors.border,
    iconBg: colors.inputBg,
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.skeletonIcon, { backgroundColor: theme.iconBg }]} />
          <View style={styles.skeletonTextContainer}>
            <View style={[styles.skeletonTitle, { backgroundColor: theme.border }]} />
            <View style={[styles.skeletonDesc, { backgroundColor: theme.border }]} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ title: 'Centres de Santé', headerBackTitle: 'Retour' }} />
      
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.bg }]}>
          <Search color={theme.textSecondary} size={20} />
          <TextInput 
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un centre..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={filteredCenters}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Aucun centre trouvé.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                // Future implementation: Navigate to center details or confirm referral
                alert(`Référence au centre : ${item.name}`);
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
                <MapPin color="#00A651" size={24} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.address, { color: theme.textSecondary }]}>{item.address}</Text>
                
                <View style={styles.footerRow}>
                  <View style={styles.phoneContainer}>
                    <Phone color={theme.textSecondary} size={14} />
                    <Text style={[styles.phoneText, { color: theme.textSecondary }]}>{item.phone}</Text>
                  </View>
                  <Text style={styles.typeBadge}>{item.type}</Text>
                </View>
              </View>
              <ChevronRight color={theme.textSecondary} size={20} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 12,
  },
  typeBadge: {
    fontSize: 12,
    backgroundColor: '#00A65120',
    color: '#00A651',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '600',
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  skeletonTextContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  skeletonTitle: {
    width: '70%',
    height: 16,
    borderRadius: 4,
  },
  skeletonDesc: {
    width: '90%',
    height: 12,
    borderRadius: 4,
  }
});
