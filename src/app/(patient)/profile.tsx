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
  Copy,
  Eye,
  EyeOff,
  Globe2,
  Network,
  Plus,
  Save,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { patientService, PatientProfile } from '../../services/patient';
import {
  patientSpaceService,
  formatFr,
  type InsuranceType,
  type PatientInsurance,
} from '../../services/patientSpace';
import { useTheme } from '../../context/ThemeContext';

const INSURANCE_TYPES: InsuranceType[] = [
  'CMU',
  'Mutuelle',
  'Assurance privée',
  'Employeur',
  'Autre',
];

export default function PatientProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Profil général
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Formulaire Coordonnées
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [tilaCode, setTilaCode] = useState('');

  // Identifiants & CMU
  const [showCmu, setShowCmu] = useState(false);
  const [cmuSaved, setCmuSaved] = useState<string | null>(null);
  const [cmuInput, setCmuInput] = useState('');
  const [savingCmu, setSavingCmu] = useState(false);

  // Assurances
  const [insurances, setInsurances] = useState<PatientInsurance[]>([]);
  const [insuranceType, setInsuranceType] = useState<InsuranceType>('Mutuelle');
  const [insuranceOrg, setInsuranceOrg] = useState('');
  const [insuranceNum, setInsuranceNum] = useState('');
  const [insuranceCouv, setInsuranceCouv] = useState('');
  const [insuranceValidite, setInsuranceValidite] = useState('');
  const [savingInsurance, setSavingInsurance] = useState(false);

  // Mobilité transfrontalière
  const [pays, setPays] = useState<string[]>([]);
  const [paysDisponibles, setPaysDisponibles] = useState<string[]>([]);
  const [consentMobility, setConsentMobility] = useState(false);
  const [savingMobility, setSavingMobility] = useState(false);

  // Préférences & Cache
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // 1. Profil de base
      const meData = await patientService.me().catch(async () => {
        const stored = await AsyncStorage.getItem('tila_user_context');
        return stored ? JSON.parse(stored) : null;
      });

      if (meData) {
        setProfile(meData);
        setFirstName(meData.firstName || '');
        setLastName(meData.lastName || '');
        setEmail(meData.email || '');
        setPhone(meData.phoneNumber || meData.phone || '');
        setBirthdate(meData.birthdate || '');
        setGender(meData.gender || '');
        setHomeAddress(meData.homeAddress || '');
        setCity(meData.city || '');
        setCountry(meData.country || '');
        setTilaCode(meData.internalPatientCode || meData.code || '');
      }

      // 2. Identifiants TILA & CMU
      patientSpaceService.identifiers().then((ids) => {
        if (ids?.tila) setTilaCode(ids.tila);
        setCmuSaved(ids?.cmu || null);
        setCmuInput(ids?.cmu || '');
      }).catch(() => {});

      // 3. Assurances
      patientSpaceService.insurances().then((res) => {
        setInsurances(res?.items || []);
      }).catch(() => {});

      // 4. Mobilité
      patientSpaceService.mobility().then((mob) => {
        setPays(mob?.pays || []);
        setPaysDisponibles(mob?.paysDisponibles || ['Côte d’Ivoire', 'Burkina Faso', 'Mali', 'Guinée', 'Ghana']);
        setConsentMobility(Boolean(mob?.consent));
      }).catch(() => {
        setPaysDisponibles(['Côte d’Ivoire', 'Burkina Faso', 'Mali', 'Guinée', 'Ghana']);
      });

    } catch (e) {
      console.warn('[Profile] Erreur de chargement:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copié', `${label} copié dans le presse-papier.`);
    } catch {
      Alert.alert('Info', text);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await patientService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim(),
        email: email.trim(),
        birthdate: birthdate.trim(),
        gender: gender.trim(),
        homeAddress: homeAddress.trim(),
      });
      setProfile((prev) => ({ ...prev, ...updated }));
      await AsyncStorage.setItem('tila_user_context', JSON.stringify({ ...profile, ...updated }));
      Alert.alert('Succès', 'Vos coordonnées ont été enregistrées.');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCmu = async () => {
    setSavingCmu(true);
    try {
      const saved = await patientSpaceService.saveCmu(cmuInput.trim());
      setCmuSaved(saved.cmu);
      setCmuInput(saved.cmu || '');
      Alert.alert(
        'Succès',
        saved.cmu ? 'Numéro CMU enregistré avec succès.' : 'Numéro CMU retiré.'
      );
    } catch (e: any) {
      Alert.alert('Erreur', 'Impossible d’enregistrer le numéro CMU. Format attendu : CMU-XXXX-XXXX-XXXX.');
    } finally {
      setSavingCmu(false);
    }
  };

  const handleAddInsurance = async () => {
    if (!insuranceOrg.trim() || !insuranceNum.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner l’organisme et le numéro d’adhérent.');
      return;
    }
    setSavingInsurance(true);
    try {
      const newIns = await patientSpaceService.addInsurance({
        type: insuranceType,
        organisme: insuranceOrg.trim(),
        numero: insuranceNum.trim(),
        couverture: insuranceCouv.trim() || 'À préciser',
        validite: insuranceValidite.trim() || null,
      });
      setInsurances((prev) => [newIns, ...prev]);
      setInsuranceOrg('');
      setInsuranceNum('');
      setInsuranceCouv('');
      setInsuranceValidite('');
      Alert.alert('Succès', 'Assurance ajoutée à votre dossier.');
    } catch {
      Alert.alert('Erreur', 'Impossible d’ajouter l’assurance.');
    } finally {
      setSavingInsurance(false);
    }
  };

  const handleRemoveInsurance = (id: number) => {
    Alert.alert(
      'Supprimer l’assurance',
      'Êtes-vous sûr de vouloir retirer cette assurance de votre dossier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await patientSpaceService.removeInsurance(id);
              setInsurances((prev) => prev.filter((item) => item.id !== id));
            } catch {
              Alert.alert('Erreur', 'Impossible de retirer cette assurance.');
            }
          },
        },
      ]
    );
  };

  const handleTogglePays = async (countryName: string) => {
    const nextPays = pays.includes(countryName)
      ? pays.filter((p) => p !== countryName)
      : [...pays, countryName];
    const nextConsent = nextPays.length === 0 ? false : consentMobility;

    setPays(nextPays);
    setConsentMobility(nextConsent);
    setSavingMobility(true);
    try {
      await patientSpaceService.saveMobility({
        pays: nextPays,
        consent: nextConsent,
      });
    } catch {
      // rollback
    } finally {
      setSavingMobility(false);
    }
  };

  const handleToggleConsentMobility = async (val: boolean) => {
    if (val && pays.length === 0) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner au moins un pays autorisé avant d’activer la restriction.');
      return;
    }
    setConsentMobility(val);
    setSavingMobility(true);
    try {
      await patientSpaceService.saveMobility({
        pays,
        consent: val,
      });
    } catch {
      setConsentMobility(!val);
    } finally {
      setSavingMobility(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const nonAuthKeys = keys.filter(
        (k) => !k.includes('tila_jwt_token') && !k.includes('tila_refresh_token') && !k.includes('tila_active_context')
      );
      await AsyncStorage.multiRemove(nonAuthKeys);
      Alert.alert('Cache vidé', 'Le cache local a été nettoyé.');
      loadAllData();
    } catch {
      Alert.alert('Erreur', 'Impossible de vider le cache.');
    } finally {
      setIsClearingCache(false);
    }
  };

  const initials = `${(firstName || 'P').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  const cmuDisplay = cmuSaved
    ? showCmu
      ? cmuSaved
      : `•••• •••• ${cmuSaved.slice(-4)}`
    : 'Non renseigné';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }, styles.centered]}>
        <ActivityIndicator size="large" color="#00A651" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement de votre profil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mon Profil Patient</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Carte En-Tête Identité */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
            </View>
            <View style={styles.avatarMeta}>
              <Text style={[styles.userName, { color: colors.text }]}>{firstName} {lastName}</Text>
              <Text style={[styles.userSub, { color: colors.textSecondary }]}>
                {birthdate ? `Né(e) le ${formatFr(birthdate)}` : 'Date de naissance à renseigner'}
                {city ? ` · ${city}` : ''}
                {country ? `, ${country}` : ''}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.activeBadge}>
                  <CheckCircle2 size={11} color="#00A651" style={{ marginRight: 4 }} />
                  <Text style={styles.activeBadgeText}>
                    {phone ? 'Profil renseigné' : 'Profil actif TILA'}
                  </Text>
                </View>
                {tilaCode ? (
                  <View style={[styles.tilaCodeBadge, { borderColor: colors.border }]}>
                    <Text style={[styles.tilaCodeText, { color: colors.text }]}>{tilaCode}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* 2. Carte Mes Identifiants */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Network size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Mes identifiants</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowCmu((v) => !v)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              {showCmu ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
              <Text style={styles.eyeBtnText}>{showCmu ? 'Masquer' : 'Afficher'}</Text>
            </TouchableOpacity>
          </View>

          {/* Grille Identifiants */}
          <View style={styles.idsGrid}>
            {/* TILA */}
            <View style={[styles.idBox, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border }]}>
              <Text style={[styles.idLabel, { color: colors.textSecondary }]}>Identifiant TILA</Text>
              <View style={styles.idValRow}>
                <Text style={[styles.idVal, { color: colors.text }]}>{tilaCode || 'Non attribué'}</Text>
                {tilaCode ? (
                  <TouchableOpacity onPress={() => handleCopy(tilaCode, 'Identifiant TILA')}>
                    <Copy size={14} color="#64748b" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.idSystem}>Tila (interne PNSM)</Text>
            </View>

            {/* CMU */}
            <View style={[styles.idBox, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border }]}>
              <Text style={[styles.idLabel, { color: colors.textSecondary }]}>N° CMU</Text>
              <View style={styles.idValRow}>
                <Text style={[styles.idVal, { color: cmuSaved ? '#00A651' : colors.textMuted }]}>
                  {cmuDisplay}
                </Text>
                {cmuSaved && showCmu ? (
                  <TouchableOpacity onPress={() => handleCopy(cmuSaved, 'Numéro CMU')}>
                    <Copy size={14} color="#64748b" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.idSystem}>CNAM — Couverture Maladie</Text>
            </View>
          </View>

          {/* Saisie CMU */}
          <View style={styles.cmuInputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Modifier le Numéro CMU</Text>
            <View style={styles.cmuActionRow}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                value={cmuInput}
                onChangeText={setCmuInput}
                placeholder="CMU-0112-3456-7890"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.saveSmallBtn, savingCmu && { opacity: 0.6 }]}
                onPress={handleSaveCmu}
                disabled={savingCmu}
              >
                {savingCmu ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Save size={14} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.saveSmallBtnText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              Laissez vide et enregistrez pour retirer. Format : CMU-XXXX-XXXX-XXXX.
            </Text>
          </View>
        </View>

        {/* 3. Carte Assurances et Prises en Charge */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Shield size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Mes assurances & prises en charge</Text>
            </View>
          </View>

          {insurances.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune assurance ou mutuelle enregistrée pour l'instant.
            </Text>
          ) : (
            <View style={styles.insurancesList}>
              {insurances.map((item) => (
                <View
                  key={item.id}
                  style={[styles.insuranceItem, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.insOrg, { color: colors.text }]}>{item.organisme}</Text>
                      <View style={styles.insTypeBadge}>
                        <Text style={styles.insTypeBadgeText}>{item.type}</Text>
                      </View>
                    </View>
                    <Text style={[styles.insMeta, { color: colors.textSecondary }]}>
                      N° {item.numero} · {item.couverture}
                      {item.validite ? ` · Valide au ${formatFr(item.validite)}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveInsurance(item.id)}
                    style={styles.trashBtn}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Formulaire ajout assurance */}
          <View style={[styles.addInsBox, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Ajouter une assurance ou mutuelle</Text>
            
            {/* Sélecteur de type d'assurance */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {INSURANCE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setInsuranceType(t)}
                  style={[
                    styles.typeChip,
                    insuranceType === t && styles.typeChipActive,
                    { borderColor: insuranceType === t ? '#00A651' : colors.border }
                  ]}
                >
                  <Text style={[styles.typeChipText, insuranceType === t && styles.typeChipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
              value={insuranceOrg}
              onChangeText={setInsuranceOrg}
              placeholder="Organisme (ex: NSIA Santé, SAHAM, CNAM)"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
              value={insuranceNum}
              onChangeText={setInsuranceNum}
              placeholder="N° adhérent ou police"
              placeholderTextColor={colors.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                value={insuranceCouv}
                onChangeText={setInsuranceCouv}
                placeholder="Taux (ex: 80%)"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                value={insuranceValidite}
                onChangeText={setInsuranceValidite}
                placeholder="Valide au (AAAA-MM-JJ)"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.addBtn, savingInsurance && { opacity: 0.6 }]}
              onPress={handleAddInsurance}
              disabled={savingInsurance}
              activeOpacity={0.8}
            >
              {savingInsurance ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.addBtnText}>Ajouter l'assurance</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Carte Mobilité et Soins Transfrontaliers */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Globe2 size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Mobilité et soins transfrontaliers</Text>
            </View>
          </View>

          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Choisissez les pays partenaires dont les spécialistes de santé peuvent consulter votre dossier clinique.
          </Text>

          {/* Pays Chips */}
          <View style={styles.countriesWrap}>
            {paysDisponibles.map((countryName) => {
              const isSelected = pays.includes(countryName);
              return (
                <TouchableOpacity
                  key={countryName}
                  onPress={() => handleTogglePays(countryName)}
                  disabled={savingMobility}
                  style={[
                    styles.countryChip,
                    isSelected && styles.countryChipActive,
                    { borderColor: isSelected ? '#00A651' : colors.border }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.countryChipText, isSelected && styles.countryChipTextActive]}>
                    {countryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Switch Restriction */}
          <View style={[styles.switchBox, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>
                Limiter mon dossier aux pays sélectionnés
              </Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Activé, seuls ces pays voient vos soins. Désactivé, la limite ne s'applique pas.
              </Text>
            </View>
            <Switch
              value={consentMobility}
              onValueChange={handleToggleConsentMobility}
              trackColor={{ false: '#cbd5e1', true: '#86efac' }}
              thumbColor={consentMobility ? '#00A651' : '#f8fafc'}
              disabled={savingMobility}
            />
          </View>
        </View>

        {/* 5. Carte Coordonnées Personnelles */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Edit3 size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Mes coordonnées</Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Prénom</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Votre prénom"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Votre nom"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>E-mail</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="votre.email@exemple.com"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Téléphone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="01 02 03 04 05"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date de naissance</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sexe / Genre</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                value={gender}
                onChangeText={setGender}
                placeholder="Féminin / Masculin"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Adresse de résidence</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
              value={homeAddress}
              onChangeText={setHomeAddress}
              placeholder="Quartier, Commune, Ville"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.primarySaveBtn, savingProfile && { opacity: 0.6 }]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
            activeOpacity={0.85}
          >
            {savingProfile ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.primarySaveBtnText}>Enregistrer mes coordonnées</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 6. Confidentialité & Cache */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldCheck size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Sécurité & Données locales</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionRowBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/(patient)/autorisations')}
            activeOpacity={0.7}
          >
            <ShieldCheck size={18} color="#2563eb" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionRowTitle, { color: colors.text }]}>Mes Autorisations & Consentements</Text>
              <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Gérer les praticiens qui accèdent à mon dossier</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRowBtn, { borderColor: colors.border, marginTop: 8 }]}
            onPress={handleClearCache}
            disabled={isClearingCache}
            activeOpacity={0.7}
          >
            <HardDrive size={18} color="#d97706" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionRowTitle, { color: colors.text }]}>Nettoyer les données locales</Text>
              <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Vider le cache hors-ligne de l'appareil</Text>
            </View>
            {isClearingCache ? <ActivityIndicator size="small" color="#d97706" /> : null}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
  },
  avatarMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  userSub: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00A651',
  },
  tilaCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tilaCodeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '600',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  cardDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  eyeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  eyeBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  idsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  idBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  idLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  idValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idVal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  idSystem: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  cmuInputContainer: {
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  cmuActionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  saveSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveSmallBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  insurancesList: {
    gap: 8,
    marginBottom: 14,
  },
  insuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  insOrg: {
    fontSize: 14,
    fontWeight: '700',
  },
  insTypeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  insTypeBadgeText: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '600',
  },
  insMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  trashBtn: {
    padding: 6,
  },
  addInsBox: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 6,
    backgroundColor: 'transparent',
  },
  typeChipActive: {
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
  },
  typeChipText: {
    fontSize: 12,
    color: '#64748b',
  },
  typeChipTextActive: {
    color: '#00A651',
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 10,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
  },
  countriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  countryChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  countryChipActive: {
    backgroundColor: '#00A651',
  },
  countryChipText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
  },
  countryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  formGroup: {
    marginBottom: 10,
  },
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  primarySaveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  actionRowTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  actionRowSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
