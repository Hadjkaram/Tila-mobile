import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Video, ChevronRight, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { professionalService } from '../../../services/professionals';
import { Skeleton } from '../../../components/ui/Skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TeleconsultationList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['pro_teleconsultations_upcoming'],
    queryFn: () => professionalService.getUpcomingAppointments(50),
  });

  const appointments = data?.items || [];
  
  // Filter only video or both appointments, and apply search if any
  const filteredSessions = appointments.filter((appt) => {
    const isVideo = appt.locationType === 'video';
    if (!isVideo) return false;
    
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = appt.patient?.name?.toLowerCase().includes(q);
      return matchName;
    }
    return true;
  });

  const renderItem = ({ item }: { item: any }) => {
    const formattedDate = item.start ? format(parseISO(item.start), 'EEEE d MMMM à HH:mm', { locale: fr }) : '';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <User size={20} color="#64748b" />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patient?.name || 'Patient inconnu'}</Text>
            <Text style={styles.appointmentDate}>{formattedDate}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.joinButton}
          onPress={() => router.push(`/(specialist)/teleconsultation/${item.id}`)}
          activeOpacity={0.8}
        >
          <Video size={18} color="#ffffff" style={styles.joinIcon} />
          <Text style={styles.joinText}>Rejoindre</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.card, { padding: 0 }]}>
          <View style={{ padding: 16 }}>
             <Skeleton height={20} width={150} borderRadius={4} style={{ marginBottom: 12 }} />
             <Skeleton height={14} width={200} borderRadius={4} style={{ marginBottom: 16 }} />
             <Skeleton height={44} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Téléconsultation</Text>
        <Text style={styles.subtitle}>Gérez vos séances vidéo à distance</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une séance..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {isLoading ? renderSkeleton() : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#00A651']} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Video size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>Aucune séance vidéo</Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? "Aucune téléconsultation ne correspond à votre recherche."
                  : "Vous n'avez pas de téléconsultation programmée."}
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#00A651',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  joinButton: {
    backgroundColor: '#00A651',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  joinIcon: {
    marginRight: 8,
  },
  joinText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
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
  },
});
