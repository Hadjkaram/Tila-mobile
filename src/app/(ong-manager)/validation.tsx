import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UserCheck,
  UserX,
  Building2,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { ongService, PendingSensibilisateur } from '../../services/ong';

export default function OngValidationScreen() {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [processingId, setProcessingId] = useState<number | null>(null);

  const {
    data: pendingAgents,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['ong-pending-agents'],
    queryFn: () => ongService.listAgentsForValidation(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => ongService.approveAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ong-pending-agents'] });
      queryClient.invalidateQueries({ queryKey: ['ong-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ong-sensibilisateurs'] });
      Alert.alert('Agent Validé !', 'Le compte de cet agent sensibilisateur est maintenant actif sur le terrain.');
    },
    onSettled: () => setProcessingId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      ongService.rejectAgent(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ong-pending-agents'] });
      queryClient.invalidateQueries({ queryKey: ['ong-dashboard'] });
      Alert.alert('Demande Refusée', 'La candidature a été rejetée.');
    },
    onSettled: () => setProcessingId(null),
  });

  const handleApprove = (agent: PendingSensibilisateur) => {
    Alert.alert(
      'Valider le compte',
      `Confirmez-vous la validation de ${agent.firstName} ${agent.lastName} en tant qu'agent sensibilisateur ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: () => {
            setProcessingId(agent.id);
            approveMutation.mutate(agent.id);
          },
        },
      ]
    );
  };

  const handleReject = (agent: PendingSensibilisateur) => {
    Alert.alert(
      'Refuser la demande',
      `Êtes-vous sûr de vouloir refuser l'inscription de ${agent.firstName} ${agent.lastName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: () => {
            setProcessingId(agent.id);
            rejectMutation.mutate({ id: agent.id, reason: 'Dossier incomplet ou hors zone' });
          },
        },
      ]
    );
  };

  const handleApproveAll = async () => {
    Alert.alert(
      'Tout valider',
      'Voulez-vous valider toutes les demandes en attente d’un seul coup ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout valider',
          onPress: async () => {
            await ongService.approveAllAgents();
            refetch();
            queryClient.invalidateQueries({ queryKey: ['ong-dashboard'] });
            Alert.alert('Succès', 'Toutes les candidatures ont été validées.');
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PendingSensibilisateur }) => {
    const isThisProcessing = processingId === item.id;
    const formattedDate = item.createdAt
      ? format(new Date(item.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })
      : 'Date non renseignée';

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameGroup}>
            <Text style={[styles.agentName, { color: colors.text }]} numberOfLines={1}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={[styles.matriculeText, { color: colors.textSecondary }]}>
              Réf : {item.matricule || `ID-${item.id}`}
            </Text>
          </View>
          <View style={styles.pendingBadge}>
            <Clock size={11} color="#ea580c" style={{ marginRight: 3 }} />
            <Text style={styles.pendingBadgeText}>En attente</Text>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Mail size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.email}
            </Text>
          </View>

          {item.phone && (
            <View style={styles.infoRow}>
              <Phone size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {item.phone}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <MapPin size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              Zone : {item.ville?.name || 'Abidjan'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Demande le {formattedDate}
            </Text>
          </View>
        </View>

        {/* Boutons d'actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.rejectBtn, isThisProcessing && { opacity: 0.5 }]}
            onPress={() => handleReject(item)}
            disabled={isThisProcessing}
            activeOpacity={0.7}
          >
            <UserX size={15} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.rejectBtnText}>Refuser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveBtn, isThisProcessing && { opacity: 0.5 }]}
            onPress={() => handleApprove(item)}
            disabled={isThisProcessing}
            activeOpacity={0.8}
          >
            {isThisProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <UserCheck size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.approveBtnText}>Valider le compte</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const agentsCount = pendingAgents?.length || 0;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      {/* Header statut */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.topTitle, { color: colors.text }]}>
            Demandes d'inscription
          </Text>
          <Text style={[styles.topSub, { color: colors.textSecondary }]}>
            {agentsCount} agent(s) en attente de vérification
          </Text>
        </View>
        {agentsCount > 1 && (
          <TouchableOpacity
            style={styles.approveAllBtn}
            onPress={handleApproveAll}
            activeOpacity={0.8}
          >
            <Sparkles size={14} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={styles.approveAllText}>Tout valider</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A651" />
        </View>
      ) : (
        <FlatList
          data={pendingAgents || []}
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
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CheckCircle2 size={42} color="#00A651" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Toutes les demandes sont traitées</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Aucun nouvel agent en attente de validation pour le moment.
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  topSub: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  approveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveAllText: {
    color: '#00A651',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
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
  card: {
    borderRadius: 16,
    padding: 16,
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
    marginRight: 10,
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
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: '#ea580c',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  infoBlock: {
    marginTop: 10,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
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
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
