import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  Lock,
  LogOut,
  Edit3,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Database,
  CheckCircle2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useGetContext, useUpdateProfile } from '../../hooks/useProfessionalApi';
import { tokenService } from '../../services/apiClient';
import { syncService } from '../../services/syncService';
import { referentialCache } from '../../services/referentialCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

export default function FieldAgentProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { data: contextData, isLoading } = useGetContext();
  const updateProfileMutation = useUpdateProfile();

  const user = contextData?.user;
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : user?.name || 'Agent de Terrain';
  const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'AM';

  // Offline Sync State
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPhone, setEditPhone] = useState(user?.phoneNumber || '');
  const [editFirstName, setEditFirstName] = useState(firstName);
  const [editLastName, setEditLastName] = useState(lastName);

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load sync status
  useEffect(() => {
    const checkSync = async () => {
      const q = await syncService.getQueue();
      setQueueCount(q.length);
      const online = await syncService.checkConnectivity();
      setIsOnline(online);
    };

    checkSync();
    const interval = setInterval(checkSync, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncService.syncPendingData();
      await referentialCache.syncReferentials();
      const q = await syncService.getQueue();
      setQueueCount(q.length);

      const total = res.syncedCount + res.failedCount;
      if (total === 0) {
        Alert.alert('Synchronisation', 'Aucune action en attente. Vos données sont à jour.');
      } else {
        Alert.alert(
          'Synchronisation terminée',
          `${res.syncedCount} élément(s) synchronisé(s) avec succès.${res.failedCount > 0 ? ` (${res.failedCount} échecs)` : ''}`
        );
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Échec de la synchronisation.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Vider la file d’attente',
      'Voulez-vous réinitialiser les actions locales en attente ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            await syncService.clearQueue();
            setQueueCount(0);
            Alert.alert('Succès', 'La file d’attente locale a été vidée.');
          },
        },
      ]
    );
  };

  const handleOpenEdit = () => {
    setEditFirstName(user?.firstName || '');
    setEditLastName(user?.lastName || '');
    setEditPhone(user?.phoneNumber || '');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(
      {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phoneNumber: editPhone.trim(),
      },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          Alert.alert('Succès', 'Vos coordonnées ont été mises à jour.');
        },
        onError: (err: any) => {
          Alert.alert('Erreur', err?.message || 'Impossible de mettre à jour le profil.');
        },
      }
    );
  };

  const handleChangePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    Alert.alert('Changement de mot de passe', 'Votre mot de passe a été mis à jour.');
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await tokenService.clearTokens();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['bottom']}>
        <ActivityIndicator size="large" color="#00A651" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarLarge, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5', borderColor: isDark ? '#059669' : '#86efac' }]}>
            <Text style={styles.avatarInitialsLarge}>{initials}</Text>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{fullName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
            <ShieldCheck size={14} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>Agent de Terrain Migrant</Text>
          </View>
        </View>

        {/* Coordonnées & Mission */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Coordonnées & Mission</Text>
          <TouchableOpacity onPress={handleOpenEdit} style={styles.editBtn}>
            <Edit3 size={15} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Modifier</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
              <Mail size={18} color="#00A651" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email de contact</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
              <Phone size={18} color="#00A651" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Numéro de téléphone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.phoneNumber || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
              <Building size={18} color="#00A651" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Site / Centre de rattachement</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.professionalDefaultCentre?.name || 'Centre de santé & ONG partenaire'}
              </Text>
            </View>
          </View>
        </View>

        {/* Synchronisation & Mode Hors-Ligne */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mode Hors-Ligne & Synchronisation</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: isOnline ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#451a1a' : '#fee2e2') },
              ]}
            >
              {isOnline ? <Wifi size={18} color="#00A651" /> : <WifiOff size={18} color="#ef4444" />}
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Statut réseau actuel</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: isOnline ? '#00A651' : '#ef4444', fontWeight: '700' },
                ]}
              >
                {isOnline ? 'Connecté à Internet' : 'Mode Hors-Ligne actif'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
              <Database size={18} color="#F58220" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>File d’attente locale</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {queueCount > 0
                  ? `${queueCount} action(s) à synchroniser`
                  : 'Toutes les données sont synchronisées'}
              </Text>
            </View>
          </View>

          <View style={styles.syncActionsRow}>
            <TouchableOpacity
              style={[styles.syncBtn, isSyncing && { opacity: 0.6 }]}
              onPress={handleManualSync}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              ) : (
                <RefreshCw size={16} color="#ffffff" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.syncBtnText}>
                {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
              </Text>
            </TouchableOpacity>

            {queueCount > 0 && (
              <TouchableOpacity
                style={[styles.clearBtn, { backgroundColor: isDark ? '#451a1a' : '#fee2e2' }]}
                onPress={handleClearCache}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sécurité */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sécurité & Compte</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.securityRow}
            onPress={() => setIsPasswordModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIcon, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
              <Lock size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.securityLabel, { color: colors.text }]}>Changer de mot de passe</Text>
              <Text style={[styles.securitySub, { color: colors.textSecondary }]}>Mettre à jour le mot de passe de votre compte</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bouton de Déconnexion */}
        <TouchableOpacity 
          style={[styles.logoutFullButton, { backgroundColor: isDark ? '#451a1a' : '#fef2f2', borderColor: isDark ? '#7f1d1d' : '#fee2e2' }]} 
          onPress={handleLogout} 
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Déconnexion de l'application</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Modification Coordonnées */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Modifier mes coordonnées</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Prénom</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={editFirstName}
                onChangeText={setEditFirstName}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Nom</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={editLastName}
                onChangeText={setEditLastName}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Numéro de téléphone</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Changement Mot de Passe */}
      <Modal visible={isPasswordModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Changer le mot de passe</Text>
              <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Mot de passe actuel</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Votre mot de passe actuel"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Nouveau mot de passe</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Au moins 8 caractères"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirmer le nouveau mot de passe</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Répétez le mot de passe"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword}>
                <Text style={styles.saveBtnText}>Valider le changement</Text>
              </TouchableOpacity>
            </ScrollView>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#00A651',
  },
  avatarInitialsLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00A651',
    fontFamily: 'Montserrat_600SemiBold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 13,
    color: '#00A651',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
    fontFamily: 'Montserrat_600SemiBold',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  syncActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 10,
    paddingVertical: 10,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  securitySub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  logoutFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginTop: 12,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  modalForm: {
    padding: 16,
    paddingBottom: 32,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 10,
    fontFamily: 'Montserrat_600SemiBold',
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Montserrat_500Medium',
  },
  saveBtn: {
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});
