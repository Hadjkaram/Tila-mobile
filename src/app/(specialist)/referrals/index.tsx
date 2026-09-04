import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, Platform } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserCheck, HeartHandshake, AlertTriangle, Inbox, ChevronRight, X } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { professionalService } from '../../../services/professionals';
import { Skeleton } from '../../../components/ui/Skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';

export default function ReferralsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  
  // Modal state
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);
  const [motif, setMotif] = useState('');

  // Data Queries
  const { 
    data: pendingData, 
    isLoading: isLoadingPending, 
    isRefetching: isRefetchingPending,
    refetch: refetchPending 
  } = useQuery({
    queryKey: ['pro_pending_referrals'],
    queryFn: () => professionalService.getPendingReferrals(),
    enabled: activeTab === 'pending',
  });

  const { 
    data: activeData, 
    isLoading: isLoadingActive, 
    isRefetching: isRefetchingActive,
    refetch: refetchActive 
  } = useQuery({
    queryKey: ['pro_active_episodes'],
    queryFn: () => professionalService.getActiveCareEpisodes(),
    enabled: activeTab === 'active',
  });

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: (referralId: number) => professionalService.receiveReferral(referralId),
    onSuccess: () => {
      Alert.alert('Succès', 'Le patient a été pris en charge avec succès.');
      refetchPending();
      // Optional: switch to active tab or pre-fetch active data
      queryClient.invalidateQueries({ queryKey: ['pro_active_episodes'] });
      queryClient.invalidateQueries({ queryKey: ['pro_dashboard_stats'] });
    },
    onError: () => {
      Alert.alert('Erreur', 'Impossible d\'accepter cette prise en charge.');
    }
  });

  const counterReferMutation = useMutation({
    mutationFn: ({ episodeId, motif }: { episodeId: number, motif: string }) => 
      professionalService.counterRefer(episodeId, { motif }),
    onSuccess: () => {
      Alert.alert('Succès', 'La contre-référence a été envoyée avec succès.');
      setModalVisible(false);
      setMotif('');
      refetchActive();
      queryClient.invalidateQueries({ queryKey: ['pro_dashboard_stats'] });
    },
    onError: () => {
      Alert.alert('Erreur', 'Impossible de contre-référer ce patient.');
    }
  });

  // Action Handlers
  const handleAccept = (referralId: number) => {
    Alert.alert(
      'Confirmation',
      'Acceptez-vous de prendre en charge ce patient ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'default', onPress: () => acceptMutation.mutate(referralId) }
      ]
    );
  };

  const handleOpenCounterRefer = (episodeId: number) => {
    setSelectedEpisodeId(episodeId);
    setMotif('');
    setModalVisible(true);
  };

  const submitCounterRefer = () => {
    if (!motif.trim()) {
      Alert.alert('Attention', 'Veuillez saisir un motif pour la contre-référence.');
      return;
    }
    if (selectedEpisodeId) {
      counterReferMutation.mutate({ episodeId: selectedEpisodeId, motif });
    }
  };

  const onRefresh = () => {
    if (activeTab === 'pending') {
      refetchPending();
    } else {
      refetchActive();
    }
  };

  // Renderers
  const renderPendingItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Text style={[styles.patientName, { color: colors.text }]}>{item.patientName || item.internalPatientCode || 'Patient Inconnu'}</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            Référé le : {item.createdAt ? format(parseISO(item.createdAt), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
          </Text>
        </View>
        {(item.niveauPriorite === 'Urgent' || item.priority === 'Urgent' || item.score > 20) && (
          <View style={styles.urgentBadge}>
            <AlertTriangle size={14} color="#ef4444" />
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        )}
      </View>
      
      <View style={[styles.motifContainer, { backgroundColor: colors.inputBg }]}>
        <UserCheck size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <Text style={[styles.motifText, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.motif || item.reason || 'Aucun motif renseigné'}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, acceptMutation.isPending && { opacity: 0.7 }]}
        onPress={() => handleAccept(item.id)}
        disabled={acceptMutation.isPending}
      >
        <Text style={styles.primaryButtonText}>
          {acceptMutation.isPending ? 'Chargement...' : 'Accepter la prise en charge'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Text style={[styles.patientName, { color: colors.text }]}>{item.patientName || item.patient?.name || 'Patient Inconnu'}</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            Suivi depuis : {item.startDate ? format(parseISO(item.startDate), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => handleOpenCounterRefer(item.id)}
        >
          <HeartHandshake size={18} color="#f59e0b" />
          <Text style={styles.secondaryButtonText}>Contre-référer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.outlineButton}
          onPress={() => router.push('/(specialist)/patients')}
        >
          <Text style={styles.outlineButtonText}>Voir dossier</Text>
          <ChevronRight size={16} color="#00A651" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSkeleton = () => (
    <View style={{ padding: 24 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.card, { padding: 0, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Skeleton height={140} borderRadius={16} />
        </View>
      ))}
    </View>
  );

  const pendingList = pendingData?.items || [];
  const activeList = activeData?.items || [];
  const isLoading = activeTab === 'pending' ? isLoadingPending : isLoadingActive;
  const isRefetching = activeTab === 'pending' ? isRefetchingPending : isRefetchingActive;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.headerText }]}>Cas Référés</Text>
        
        {/* Segmented Control */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.inputBg }]}>
          <TouchableOpacity 
            style={[styles.segmentButton, activeTab === 'pending' && [styles.segmentActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.segmentText, { color: colors.textSecondary }, activeTab === 'pending' && [styles.segmentTextActive, { color: colors.text }]]}>En attente</Text>
            {activeTab === 'pending' && pendingList.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingList.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentButton, activeTab === 'active' && [styles.segmentActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.segmentText, { color: colors.textSecondary }, activeTab === 'active' && [styles.segmentTextActive, { color: colors.text }]]}>Suivis en cours</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? renderSkeleton() : (
        <FlatList
          data={activeTab === 'pending' ? pendingList : activeList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={activeTab === 'pending' ? renderPendingItem : renderActiveItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#00A651']} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Inbox size={48} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeTab === 'pending' ? "Aucun cas en attente" : "Aucun suivi actif"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeTab === 'pending' 
                  ? "Vous n'avez actuellement aucun patient orienté vers vous en attente de prise en charge."
                  : "Vous n'avez pas de dossiers patients actifs en ce moment."}
              </Text>
            </View>
          }
        />
      )}

      {/* Counter Referral Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Contre-référer le patient</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Veuillez indiquer le motif ou les observations justifiant cette contre-référence.
            </Text>
            
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              multiline
              numberOfLines={4}
              placeholder="Ex: Fin de traitement, besoin d'un autre spécialiste..."
              placeholderTextColor={colors.textMuted}
              value={motif}
              onChangeText={setMotif}
              textAlignVertical="top"
            />
            
            <TouchableOpacity 
              style={[styles.primaryButton, counterReferMutation.isPending && { opacity: 0.7 }]}
              onPress={submitCounterRefer}
              disabled={counterReferMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {counterReferMutation.isPending ? 'Envoi en cours...' : 'Envoyer la contre-référence'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 24,
    paddingBottom: 40,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  dateText: {
    fontSize: 13,
    color: '#64748b',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  urgentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 4,
  },
  motifContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  motifText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#00A651',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  secondaryButtonText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  outlineButtonText: {
    color: '#00A651',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 120,
    marginBottom: 24,
  }
});
