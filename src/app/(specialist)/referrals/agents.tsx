import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, useColorScheme } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { User, Search, ChevronRight, Stethoscope } from 'lucide-react-native';
import { useGetAgents } from '../../../hooks/useProfessionalApi';


export default function AgentsList() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const { data: apiAgents, isLoading, isError } = useGetAgents();

  const displayAgents = apiAgents || [];

  const filteredAgents = displayAgents.filter((a: any) => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const theme = {
    bg: isDark ? '#0f172a' : '#f8fafc',
    card: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    iconBg: isDark ? '#334155' : '#f1f5f9',
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
      <Stack.Screen options={{ title: 'Agents de Santé', headerBackTitle: 'Retour' }} />
      
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.bg }]}>
          <Search color={theme.textSecondary} size={20} />
          <TextInput 
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un agent ou une spécialité..."
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
          data={filteredAgents}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Aucun agent trouvé.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                // Future implementation: Refer to this agent
                alert(`Référence au professionnel : ${item.name}`);
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
                <Stethoscope color="#3b82f6" size={24} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.role, { color: theme.textSecondary }]}>{item.role}</Text>
                
                <View style={styles.footerRow}>
                  <Text style={[styles.location, { color: theme.textSecondary }]}>{item.location}</Text>
                  <View style={[styles.availabilityBadge, item.availability === 'Disponible' ? styles.badgeAvailable : styles.badgeBusy]}>
                    <Text style={[styles.availabilityText, item.availability === 'Disponible' ? styles.textAvailable : styles.textBusy]}>
                      {item.availability}
                    </Text>
                  </View>
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
  role: {
    fontSize: 14,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  location: {
    fontSize: 12,
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeAvailable: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  textAvailable: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '500',
  },
  badgeBusy: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  textBusy: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '500',
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
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
  }
});
