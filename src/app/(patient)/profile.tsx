import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  HardDrive,
  LogOut,
  ArrowLeft,
  Heart,
  Calendar,
  Building2,
  Trash2,
  Edit3,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { tokenService } from '../../services/apiClient';
import { patientService, PatientProfile } from '../../services/patient';
import { useUpdateProfile } from '../../hooks/useProfessionalApi';
import { useTheme } from '../../context/ThemeContext';

export default function PatientProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const updateProfileMutation = useUpdateProfile();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await patientService.me();
        setProfile(data);
      } catch {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          setProfile(JSON.parse(stored));
        }
      }
    };
    loadProfile();
  }, []);

  const handleOpenEdit = () => {
    setEditFirstName(profile?.firstName || '');
    setEditLastName(profile?.lastName || '');
    setEditPhone((profile as any)?.phoneNumber || (profile as any)?.phone || '');
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
          setProfile((prev: any) => ({
            ...prev,
            firstName: editFirstName.trim(),
            lastName: editLastName.trim(),
            phoneNumber: editPhone.trim(),
            phone: editPhone.trim(),
          }));
          setIsEditModalOpen(false);
          Alert.alert('Succès', 'Vos coordonnées ont été mises à jour.');
        },
        onError: (err: any) => {
          Alert.alert('Erreur', err?.message || 'Impossible de mettre à jour le profil.');
        },
      }
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Vider le cache',
      'Cette action va nettoyer les données temporaires mises en cache sur votre appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
              const keys = await AsyncStorage.getAllKeys();
              const offlineKeys = keys.filter(k => k.startsWith('@offline_'));
              await AsyncStorage.multiRemove(offlineKeys);
              Alert.alert('Succès', 'Le cache local a été vidé.');
            } catch {
              Alert.alert('Erreur', 'Impossible de vider le cache.');
            } finally {
              setIsClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter de votre espace patient ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await tokenService.clearTokens();
            await AsyncStorage.multiRemove([
              'tila_user_context',
              '@offline_centres',
              '@offline_all_patients',
            ]);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const firstName = profile?.firstName || '';
  const lastName = profile?.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || (profile as any)?.name || 'Bénéficiaire TILA';
  const email = profile?.email || 'Non renseigné';
  const phone = (profile as any)?.phoneNumber || (profile as any)?.phone || '+225 00 00 00 00 00';
  const initials = ((firstName[0] || '') + (lastName[0] || 'P')).toUpperCase() || 'PT';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      {/* Top Header avec flèche de retour */}
      <View style={[styles.topBar, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.headerText }]}>Mon Profil</Text>
        <TouchableOpacity onPress={handleOpenEdit} style={styles.editHeaderButton}>
          <Edit3 size={20} color="#00A651" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Carte Identité Patient */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarWrap, { backgroundColor: isDark ? 'rgba(0, 166, 81, 0.15)' : '#ecfdf5', borderColor: isDark ? '#00A651' : '#a7f3d0' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{fullName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isDark ? 'rgba(0, 166, 81, 0.15)' : '#ecfdf5' }]}>
            <Heart size={13} color="#00A651" style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>PATIENT / BÉNÉFICIAIRE</Text>
          </View>

          <TouchableOpacity
            style={[styles.editProfileBtn, { borderColor: colors.border }]}
            onPress={handleOpenEdit}
            activeOpacity={0.7}
          >
            <Edit3 size={15} color="#00A651" style={{ marginRight: 6 }} />
            <Text style={styles.editProfileBtnText}>Modifier mes coordonnées</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Coordonnées */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes Coordonnées</Text>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Mail size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Adresse email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{email}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
            <Phone size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Numéro de téléphone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* 3. Notifications & Rappels de RDV */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Bell size={16} color="#00A651" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Rappels & Notifications</Text>
          </View>

          <View style={[styles.prefRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.prefTitle, { color: colors.text }]}>Rappels de rendez-vous Push</Text>
              <Text style={[styles.prefSub, { color: colors.textSecondary }]}>Notification 1h avant vos consultations</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: '#00A651' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={[styles.prefRow, { borderBottomColor: 'transparent' }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.prefTitle, { color: colors.text }]}>Rappels SMS de consultation</Text>
              <Text style={[styles.prefSub, { color: colors.textSecondary }]}>Confirmation de vos prises de RDV par SMS</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: '#00A651' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* 4. Données locales & Cache */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <HardDrive size={16} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Stockage local</Text>
          </View>

          <TouchableOpacity
            style={[styles.clearCacheBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={handleClearCache}
            disabled={isClearingCache}
            activeOpacity={0.7}
          >
            {isClearingCache ? (
              <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginRight: 8 }} />
            ) : (
              <Trash2 size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.clearCacheBtnText, { color: colors.textSecondary }]}>Vider les données en cache</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Bouton Déconnexion */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5' }]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Modifier mes coordonnées</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Prénom</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.text }]}
                value={editFirstName}
                onChangeText={setEditFirstName}
                placeholder="Votre prénom"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.text }]}
                value={editLastName}
                onChangeText={setEditLastName}
                placeholder="Votre nom"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Téléphone</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.text }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Numéro de téléphone"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, updateProfileMutation.isPending && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              )}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  userName: {
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
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Montserrat_400Regular',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 1,
    fontFamily: 'Montserrat_600SemiBold',
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Montserrat_600SemiBold',
  },
  prefSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  clearCacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  clearCacheBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  editHeaderButton: {
    padding: 8,
    borderRadius: 8,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
    width: '100%',
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00A651',
    fontFamily: 'Montserrat_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_700Bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontFamily: 'Montserrat_500Medium',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
  },
  saveButton: {
    backgroundColor: '#00A651',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});
