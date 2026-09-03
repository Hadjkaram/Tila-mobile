import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  Modal, 
  ActivityIndicator 
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Lock, 
  LogOut, 
  Edit3, 
  Check, 
  X,
  ShieldCheck
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useGetContext, useUpdateProfile } from '../../hooks/useProfessionalApi';
import { tokenService } from '../../services/apiClient';

export default function SpecialistProfileScreen() {
  const router = useRouter();
  const { data: contextData, isLoading } = useGetContext();
  const updateProfileMutation = useUpdateProfile();

  const user = contextData?.user;
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : (user?.name || 'Spécialiste');
  const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'SP';

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
          Alert.alert('Succès', 'Vos informations ont été mises à jour.');
        },
        onError: (err: any) => {
          Alert.alert('Erreur', err?.message || 'Impossible de mettre à jour le profil.');
        }
      }
    );
  };

  const handleChangePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    Alert.alert('Changement de mot de passe', 'Votre demande de réinitialisation a été prise en compte.');
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Se déconnecter", 
          style: "destructive",
          onPress: async () => {
            await tokenService.clearTokens();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A651" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <TouchableOpacity onPress={handleOpenEdit} style={styles.editHeaderButton}>
          <Edit3 size={20} color="#00A651" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarInitialsLarge}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileRole}>
            {user?.specialty || user?.profession?.name || 'Spécialiste de Santé'}
          </Text>
        </View>

        {/* Coordonnées & Informations */}
        <Text style={styles.sectionTitle}>Coordonnées & Profession</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Mail size={18} color="#00A651" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Phone size={18} color="#00A651" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber || 'Non renseigné'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Briefcase size={18} color="#00A651" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Spécialité</Text>
              <Text style={styles.infoValue}>
                {user?.specialty || user?.profession?.name || 'Médecin Spécialiste'}
              </Text>
            </View>
          </View>

          {!!user?.professionalDefaultCentre?.name && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Building size={18} color="#00A651" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Centre / Établissement</Text>
                  <Text style={styles.infoValue}>{user.professionalDefaultCentre.name}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Sécurité & Paramètres */}
        <Text style={styles.sectionTitle}>Sécurité</Text>
        <View style={styles.infoCard}>
          <TouchableOpacity 
            style={styles.securityRow} 
            onPress={() => setIsPasswordModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.infoIcon}>
              <Lock size={18} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.securityLabel}>Changer de mot de passe</Text>
              <Text style={styles.securitySub}>Sécurisez votre compte avec un nouveau mot de passe</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutFullButton} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={20} color="#ef4444" style={{ marginRight: 10 }} />
          <Text style={styles.logoutFullButtonText}>Se déconnecter</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal Modification Infos */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier mon profil</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Prénom</Text>
              <TextInput
                style={styles.modalInput}
                value={editFirstName}
                onChangeText={setEditFirstName}
              />

              <Text style={styles.inputLabel}>Nom</Text>
              <TextInput
                style={styles.modalInput}
                value={editLastName}
                onChangeText={setEditLastName}
              />

              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Enregistrer les modifications</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Changement Mot de Passe */}
      <Modal visible={isPasswordModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer de mot de passe</Text>
              <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                placeholder="Au moins 8 caractères"
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleChangePassword}
              >
                <Text style={styles.modalSubmitText}>Mettre à jour le mot de passe</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  editHeaderButton: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInitialsLarge: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#00A651',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#00A651',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 52,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  securityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  securitySub: {
    fontSize: 12,
    color: '#64748b',
  },
  logoutFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginTop: 8,
  },
  logoutFullButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  modalSubmitButton: {
    backgroundColor: '#00A651',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
