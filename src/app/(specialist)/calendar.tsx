import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Video, CheckCircle, Clock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { professionalService } from '../../services/professionals';
import { Skeleton } from '../../components/ui/Skeleton';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';

import { useRouter } from 'expo-router';

export default function ProCalendar() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  // Par défaut on charge la semaine en cours
  const [dateRange, setDateRange] = useState({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pro_appointments', format(dateRange.from, 'yyyy-MM-dd')],
    queryFn: () => professionalService.listAppointmentsRange({
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd'),
      limit: 100
    }),
  });

  const appointments = data?.items || [];

  const renderAppointment = ({ item }: { item: any }) => {
    const aptDate = parseISO(item.start);
    const isVideo = item.locationType === 'video' || item.type === 'video' || !!item.meetLink;
    const isConfirmed = item.status === 'confirmed' || item.status === 'confirmé';
    const statusDisplay = isConfirmed
      ? 'Confirmé'
      : item.status === 'pending' || item.status === 'en_attente'
      ? 'En attente'
      : item.status || 'Planifié';

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
        <View style={[styles.timeColumn, { borderRightColor: colors.border }]}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{format(aptDate, 'EEE dd', { locale: fr })}</Text>
          <Text style={[styles.timeText, { color: colors.text }]}>{item.time || format(aptDate, 'HH:mm')}</Text>
        </View>
        <View style={styles.detailsColumn}>
          <Text style={[styles.patientName, { color: colors.text }]}>{item.patientName || (typeof item.patient === 'object' ? item.patient?.name : item.patient) || 'Inconnu'}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.typeBadge}>
              {isVideo ? <Video size={14} color={colors.textSecondary} style={styles.metaIcon} /> : <CalendarIcon size={14} color={colors.textSecondary} style={styles.metaIcon} />}
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{isVideo ? 'Téléconsultation' : 'Présentiel'}</Text>
            </View>
            <View style={[styles.statusBadge, isConfirmed ? styles.statusConfirmed : styles.statusPending]}>
              <Text style={[styles.statusText, isConfirmed ? styles.statusTextConfirmed : styles.statusTextPending]}>
                {statusDisplay}
              </Text>
            </View>
          </View>
        </View>
        {isVideo && (
          <TouchableOpacity
            style={{
              backgroundColor: '#00A651',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
              alignSelf: 'center',
              marginLeft: 8,
            }}
            onPress={() => router.push(`/(specialist)/teleconsultation/${item.id}` as any)}
            activeOpacity={0.8}
          >
            <Video size={18} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Rendez-vous</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Du {format(dateRange.from, 'dd MMM', { locale: fr })} au {format(dateRange.to, 'dd MMM yyyy', { locale: fr })}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={80} borderRadius={16} style={{ marginBottom: 16 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderAppointment}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#00A651']} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun rendez-vous</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Vous n'avez pas de consultations prévues sur cette période.</Text>
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
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  timeColumn: {
    width: 70,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    paddingRight: 16,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  detailsColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(0, 166, 81, 0.1)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 130, 32, 0.1)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextConfirmed: {
    color: '#00A651',
  },
  statusTextPending: {
    color: '#F58220',
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
