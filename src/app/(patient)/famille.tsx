import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Calendar,
  Phone,
  CheckCircle2,
  X,
  Plus,
} from 'lucide-react-native';
import {
  patientSpaceService,
  formatFr,
  FAMILY_PERMS,
  type FamilyMember,
} from '../../services/patientSpace';
import { useTheme } from '../../context/ThemeContext';

export default function PatientFamilleScreen() {
  const { colors, isDark } = useTheme();
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Ajout Proche
  const [modalOpen, setModalOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [lien, setLien] = useState('Parent');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState('proche');
  const [expire, setExpire] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFamily = async () => {
    try {
      const res = await patientSpaceService.family();
      setFamily(res?.items || []);
    } catch (e) {
      console.warn('[Famille] Erreur:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFamily();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadFamily();
  };

  const handleTogglePerm = async (member: FamilyMember, permId: string) => {
    if (permId === 'sante_mentale' && !member.perms.includes(permId)) {
      Alert.alert(
        'Accès renforcé',
        'Êtes-vous sûr(e) de vouloir partager vos bilans cliniques et évaluations de santé mentale avec ce proche ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            onPress: () => applyPermChange(member, permId),
          },
        ]
      );
      return;
    }
    applyPermChange(member, permId);
  };

  const applyPermChange = async (member: FamilyMember, permId: string) => {
    const cur = member.perms || [];
    const nextPerms = cur.includes(permId)
      ? cur.filter((p) => p !== permId)
      : [...cur, permId];

    try {
      await patientSpaceService.updateFamily(member.id, { perms: nextPerms });
      setFamily((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, perms: nextPerms } : m))
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour les permissions du proche.');
    }
  };

  const handleRevoke = (id: number) => {
    Alert.alert(
      'Retirer le proche',
      'Ce proche ne pourra plus accéder aux éléments de votre dossier. Confirmer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await patientSpaceService.updateFamily(id, { status: 'revoque' });
              setFamily((prev) =>
                prev.map((m) => (m.id === id ? { ...m, status: 'revoque' } : m))
              );
            } catch {
              Alert.alert('Erreur', 'Impossible de retirer le proche.');
            }
          },
        },
      ]
    );
  };

  const handleAddMember = async () => {
    if (!nom.trim() || !telephone.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner le nom et le numéro de téléphone.');
      return;
    }
    if (!consent) {
      Alert.alert('Consentement requis', 'Veuillez cocher la case d’accord pour autoriser le partage.');
      return;
    }

    setSaving(true);
    try {
      const added = await patientSpaceService.inviteFamily({
        nom: nom.trim(),
        lien: lien.trim(),
        telephone: telephone.trim(),
        role: role.trim() || 'proche',
        expire: expire.trim() || null,
        perms: ['rendez_vous'],
      });
      setFamily((prev) => [added, ...prev]);
      setModalOpen(false);
      setNom('');
      setTelephone('');
      setExpire('');
      setConsent(false);
      Alert.alert('Succès', 'Votre proche a été invité avec succès.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d’ajouter le proche.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00A651" />}
      >
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: isDark ? colors.card : '#ecfdf5', borderColor: colors.border }]}>
          <View style={styles.badgeWrap}>
            <Users size={14} color="#00A651" style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>Aidants & Entourage</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Ma Famille & Proches Aidants</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Partagez de manière sécurisée les étapes de vos soins avec vos proches de confiance pour vous soutenir au quotidien.
          </Text>
          <TouchableOpacity
            style={styles.addMainBtn}
            onPress={() => setModalOpen(true)}
            activeOpacity={0.85}
          >
            <UserPlus size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.addMainBtnText}>Ajouter un proche</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#00A651" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement de vos proches...</Text>
          </View>
        ) : family.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Users size={32} color="#00A651" style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun proche aidant rattaché</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Vous pouvez inviter un proche (parent, conjoint, tuteur) et choisir précisément ce qu'il a le droit de consulter.
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {family.map((m) => {
              const isRevoked = m.status === 'revoque';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.memberCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isRevoked && { opacity: 0.6 },
                  ]}
                >
                  <View style={styles.memberTopRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.memberName, { color: colors.text }]}>{m.nom}</Text>
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>{m.lien || m.role}</Text>
                        </View>
                      </View>
                      <Text style={[styles.memberMeta, { color: colors.textSecondary }]}>
                        {m.telephone} {m.depuis ? `· Depuis le ${formatFr(m.depuis)}` : ''}
                      </Text>
                    </View>

                    {!isRevoked && (
                      <TouchableOpacity
                        style={styles.revokeBtn}
                        onPress={() => handleRevoke(m.id)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Permissions Switch */}
                  <View style={[styles.permsSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.permsTitle, { color: colors.textSecondary }]}>
                      Données accessibles par {m.nom} :
                    </Text>
                    <View style={styles.permsList}>
                      {FAMILY_PERMS.map((p) => {
                        const isGranted = (m.perms || []).includes(p.id);
                        return (
                          <View
                            key={p.id}
                            style={[styles.permRow, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border }]}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={[styles.permLabel, { color: colors.text }]}>{p.label}</Text>
                              <Text style={[styles.permHint, { color: colors.textSecondary }]}>{p.hint}</Text>
                            </View>
                            <Switch
                              value={isGranted}
                              onValueChange={() => handleTogglePerm(m, p.id)}
                              disabled={isRevoked}
                              trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                              thumbColor={isGranted ? '#00A651' : '#f8fafc'}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Modal Ajout Proche */}
        <Modal visible={modalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Ajouter un proche aidant</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom et Prénom</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                    value={nom}
                    onChangeText={setNom}
                    placeholder="Nom du proche"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Lien de parenté</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                      value={lien}
                      onChangeText={setLien}
                      placeholder="Conjoint, Parent, Enfant..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rôle</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                      value={role}
                      onChangeText={setRole}
                      placeholder="aidant, tuteur, proche"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Numéro de téléphone</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                    value={telephone}
                    onChangeText={setTelephone}
                    keyboardType="phone-pad"
                    placeholder="01 02 03 04 05"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Accès valide jusqu'au (optionnel)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                    value={expire}
                    onChangeText={setExpire}
                    placeholder="AAAA-MM-JJ"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={styles.consentCheckRow}
                  onPress={() => setConsent(!consent)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, consent && styles.checkboxActive]}>
                    {consent && <CheckCircle2 size={16} color="#00A651" />}
                  </View>
                  <Text style={[styles.consentCheckText, { color: colors.textSecondary }]}>
                    J'autorise ce proche à accéder aux sections de mon dossier sélectionnées. Je peux révoquer cet accord à tout moment.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveModalBtn, saving && { opacity: 0.6 }]}
                  onPress={handleAddMember}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.saveModalBtnText}>Enregistrer le proche</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00A651',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  addMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#00A651',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addMainBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
  },
  listWrap: {
    gap: 14,
  },
  memberCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  roleBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  roleBadgeText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '600',
  },
  memberMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  revokeBtn: {
    padding: 6,
  },
  permsSection: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  permsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  permsList: {
    gap: 6,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  permLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  permHint: {
    fontSize: 11,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  consentCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    borderColor: '#00A651',
  },
  consentCheckText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  saveModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveModalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
