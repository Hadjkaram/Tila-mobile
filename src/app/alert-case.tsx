import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AlertTriangle,
  Phone,
  CheckCircle,
  Shield,
  User,
  Users,
  ArrowLeft,
  ChevronDown,
  MapPin,
} from 'lucide-react-native';
import { Text } from '../components/Text';
import { apiClient } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';

const REGIONS = [
  'Abidjan',
  'Yamoussoukro',
  'Bouaké',
  'San Pedro',
  'Daloa',
  'Korhogo',
  'Man',
  'Gagnoa',
  'Abengourou',
  'Divo',
  'Agboville',
  'Grand-Bassam',
  'Bondoukou',
  'Séguéla',
  'Odienné',
];

const URGENCY_LEVELS = [
  { value: 'critique', label: 'Critique', desc: 'Danger immédiat', color: '#dc2626' },
  { value: 'urgent', label: 'Urgent', desc: 'Intervention rapide', color: '#ea580c' },
  { value: 'modere', label: 'Modéré', desc: 'Préoccupant', color: '#d97706' },
  { value: 'information', label: 'Information', desc: 'Orientation', color: '#2563eb' },
];

const CASE_TYPES = [
  'Tentative de suicide',
  'Idées suicidaires',
  'Crise de panique / anxiété',
  'Épisode psychotique',
  'Dépression sévère',
  'Violence / Agression',
  'Addiction',
  'Maltraitance',
  'Autre détresse',
];

export default function AlertCaseScreen() {
  const { isDark, colors } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [reporterType, setReporterType] = useState<'temoin' | 'victime' | 'professionnel'>('temoin');
  const [urgency, setUrgency] = useState('');
  const [caseType, setCaseType] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');

  // Personne concernée (optionnel)
  const [personName, setPersonName] = useState('');
  const [personAge, setPersonAge] = useState('');
  const [personGender, setPersonGender] = useState<'homme' | 'femme' | 'autre' | ''>('');

  // Vos coordonnées (pour suivi)
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reference, setReference] = useState('');
  const [showRegionModal, setShowRegionModal] = useState(false);

  const handleCallEmergency = () => {
    Linking.openURL('tel:143').catch(() => {
      Alert.alert('Urgence 143', 'Veuillez composer le 143 sur votre téléphone.');
    });
  };

  const handleSubmit = async () => {
    if (!urgency) {
      Alert.alert('Champ requis', 'Veuillez sélectionner le niveau d’urgence.');
      return;
    }
    if (!caseType) {
      Alert.alert('Champ requis', 'Veuillez choisir le type de situation.');
      return;
    }
    if (!region) {
      Alert.alert('Champ requis', 'Veuillez choisir la région.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Champ requis', 'Veuillez indiquer la ville ou le quartier.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Description trop courte', 'Merci d’écrire au moins 10 caractères.');
      return;
    }
    if (!reporterName.trim()) {
      Alert.alert('Champ requis', 'Veuillez indiquer votre nom.');
      return;
    }
    if (!reporterPhone.trim()) {
      Alert.alert('Champ requis', 'Veuillez indiquer votre numéro de téléphone.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        reporterType,
        urgency,
        caseType,
        region,
        city: city.trim(),
        description: description.trim(),
        personName: personName.trim() || undefined,
        personAge: personAge.trim() || undefined,
        personGender: personGender || undefined,
        reporterName: reporterName.trim(),
        reporterPhone: reporterPhone.trim(),
        reporterEmail: reporterEmail.trim() || undefined,
      };

      const res = await apiClient.post<{ success: boolean; reference: string; message: string }>(
        '/api/public/mental-health-alerts',
        payload
      );

      setReference(res.reference || `ALT-${Date.now().toString().slice(-6)}`);
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Erreur signalement:', error);
      const status = error?.response?.status;
      if (status === 429) {
        Alert.alert('Attente requise', 'Veuillez patienter un instant avant de renvoyer.');
      } else {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Impossible d’enregistrer le signalement. Réessayez.';
        Alert.alert('Erreur', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setReporterType('temoin');
    setUrgency('');
    setCaseType('');
    setRegion('');
    setCity('');
    setDescription('');
    setPersonName('');
    setPersonAge('');
    setPersonGender('');
    setReporterName('');
    setReporterPhone('');
    setReporterEmail('');
    setReference('');
    setIsSuccess(false);
  };

  // ----------------------------------------------------
  // ÉCRAN DE SUCCÈS CONFIRMATION (CONCIS & DIRECT)
  // ----------------------------------------------------
  if (isSuccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[styles.successContent, isTablet && styles.cardTablet]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIconOuter}>
            <CheckCircle size={44} color="#00A651" />
          </View>

          <Text style={[styles.successTitle, { color: colors.text }]}>Signalement transmis</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Pris en charge par les équipes de régulation du PNSM.
          </Text>

          {reference ? (
            <View style={[styles.referenceBox, { backgroundColor: isDark ? colors.card : '#f8fafc', borderColor: colors.border }]}>
              <Text style={[styles.referenceLabel, { color: colors.textSecondary }]}>RÉFÉRENCE</Text>
              <Text style={[styles.referenceCode, { color: colors.primary }]}>{reference}</Text>
            </View>
          ) : null}

          {/* Appel d'urgence direct */}
          <TouchableOpacity
            style={styles.emergencyCallBanner}
            onPress={handleCallEmergency}
            activeOpacity={0.85}
          >
            <Phone size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.emergencyCallTitle}>Urgence vitale ? Appeler le 143 (24/7)</Text>
          </TouchableOpacity>

          <View style={styles.successActions}>
            <TouchableOpacity style={styles.btnNewReport} onPress={resetForm} activeOpacity={0.8}>
              <Text style={styles.btnNewReportText}>Nouveau signalement</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnHome, { borderColor: colors.border }]}
              onPress={() => router.replace('/welcome')}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnHomeText, { color: colors.text }]}>Retour à l’accueil</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // FORMULAIRE ÉPURÉ & ÉLÉGANT
  // ----------------------------------------------------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Header compact */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? colors.card : '#f1f5f9' }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={19} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Signaler un cas</Text>
        </View>

        <TouchableOpacity
          style={styles.quickCallChip}
          onPress={handleCallEmergency}
          activeOpacity={0.8}
        >
          <Phone size={13} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.quickCallText}>143</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isTablet && styles.cardTablet]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bandeau d'urgence compact */}
        <TouchableOpacity
          style={styles.vitalAlertBanner}
          onPress={handleCallEmergency}
          activeOpacity={0.9}
        >
          <View style={styles.vitalBannerLeft}>
            <AlertTriangle size={18} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={styles.vitalBannerTitle}>
              Danger immédiat ? Appelez le <Text style={{ fontWeight: '800' }}>143</Text> (gratuit, 24/7)
            </Text>
          </View>
          <View style={styles.vitalCallBtn}>
            <Phone size={12} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.vitalCallBtnText}>Appel</Text>
          </View>
        </TouchableOpacity>

        {/* 1. Déclarant */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Vous êtes</Text>
          <View style={styles.reporterTypeRow}>
            {[
              { id: 'temoin', label: 'Témoin / Proche', icon: Users },
              { id: 'victime', label: 'Concerné(e)', icon: User },
              { id: 'professionnel', label: 'Professionnel', icon: Shield },
            ].map((item) => {
              const isSelected = reporterType === item.id;
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.reporterTypeCard,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? '#064e3b'
                          : '#ecfdf5'
                        : isDark
                        ? colors.card
                        : '#ffffff',
                      borderColor: isSelected ? '#00A651' : colors.border,
                    },
                  ]}
                  onPress={() => setReporterType(item.id as any)}
                  activeOpacity={0.7}
                >
                  <IconComp
                    size={16}
                    color={isSelected ? '#00A651' : colors.textSecondary}
                    style={{ marginBottom: 3 }}
                  />
                  <Text
                    style={[
                      styles.reporterTypeLabel,
                      { color: isSelected ? '#00A651' : colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Urgence (Grille 2x2 épurée) */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            2. Niveau d'urgence <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.urgencyGrid}>
            {URGENCY_LEVELS.map((level) => {
              const isSelected = urgency === level.value;
              return (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.urgencyGridCard,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? '#1e293b'
                          : '#ffffff'
                        : isDark
                        ? colors.card
                        : '#ffffff',
                      borderColor: isSelected ? level.color : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setUrgency(level.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.urgencyDot, { backgroundColor: level.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.urgencyLabel, { color: isSelected ? level.color : colors.text }]}>
                      {level.label}
                    </Text>
                    <Text style={[styles.urgencyDesc, { color: colors.textSecondary }]}>
                      {level.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Situation */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            3. Type de situation <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.caseTypeWrap}>
            {CASE_TYPES.map((type) => {
              const isSelected = caseType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.caseTypeChip,
                    {
                      backgroundColor: isSelected
                        ? '#00A651'
                        : isDark
                        ? colors.card
                        : '#f8fafc',
                      borderColor: isSelected ? '#00A651' : colors.border,
                    },
                  ]}
                  onPress={() => setCaseType(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.caseTypeText,
                      { color: isSelected ? '#ffffff' : colors.text },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Localisation */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            4. Localisation <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.rowTwoInputs}>
            <TouchableOpacity
              style={[
                styles.dropdownSelector,
                { flex: 1, marginRight: 6, backgroundColor: isDark ? colors.card : '#ffffff', borderColor: colors.border },
              ]}
              onPress={() => setShowRegionModal(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MapPin size={15} color="#00A651" style={{ marginRight: 6 }} />
                <Text
                  numberOfLines={1}
                  style={{ color: region ? colors.text : colors.textMuted, fontSize: 13.5 }}
                >
                  {region || 'Région'}
                </Text>
              </View>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={[
                styles.input,
                {
                  flex: 1.2,
                  marginLeft: 6,
                  backgroundColor: isDark ? colors.card : '#ffffff',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Ville / Quartier"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={setCity}
            />
          </View>
        </View>

        {/* 5. Description */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            5. Description <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDark ? colors.card : '#ffffff',
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Décrivez brièvement les faits observés (min. 10 car.)..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            maxLength={10000}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        {/* 6. Personne concernée (Optionnel) */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            6. Personne concernée <Text style={styles.optionalText}>(optionnel)</Text>
          </Text>
          <View style={styles.rowTwoInputs}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1.3,
                  marginRight: 6,
                  backgroundColor: isDark ? colors.card : '#ffffff',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Nom (facultatif)"
              placeholderTextColor={colors.textMuted}
              value={personName}
              onChangeText={setPersonName}
            />

            <TextInput
              style={[
                styles.input,
                {
                  flex: 0.9,
                  marginLeft: 6,
                  backgroundColor: isDark ? colors.card : '#ffffff',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Âge"
              placeholderTextColor={colors.textMuted}
              value={personAge}
              onChangeText={setPersonAge}
            />
          </View>
        </View>

        {/* 7. Vos coordonnées */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            7. Vos coordonnées <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.rowTwoInputs}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  marginRight: 6,
                  backgroundColor: isDark ? colors.card : '#ffffff',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Votre nom"
              placeholderTextColor={colors.textMuted}
              value={reporterName}
              onChangeText={setReporterName}
            />
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  marginLeft: 6,
                  backgroundColor: isDark ? colors.card : '#ffffff',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Téléphone"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={reporterPhone}
              onChangeText={setReporterPhone}
            />
          </View>
        </View>

        {/* Badge Confidentialité épuré (1 ligne) */}
        <View style={[styles.confidentialityBadge, { backgroundColor: isDark ? colors.card : '#f0fdf4', borderColor: colors.border }]}>
          <Shield size={14} color="#00A651" style={{ marginRight: 6 }} />
          <Text style={[styles.confidentialityText, { color: colors.textSecondary }]}>
            Signalement strictement confidentiel et protégé.
          </Text>
        </View>

        {/* Bouton d'envoi rouge compact */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <AlertTriangle size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Envoyer le signalement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL SÉLECTEUR DE RÉGION */}
      <Modal
        visible={showRegionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRegionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? colors.card : '#ffffff' },
              isTablet && styles.modalSheetTablet,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choisir une région</Text>
              <TouchableOpacity onPress={() => setShowRegionModal(false)}>
                <Text style={{ color: '#00A651', fontWeight: 'bold' }}>Fermer</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={REGIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = region === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.regionItem,
                      isSelected && { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' },
                    ]}
                    onPress={() => {
                      setRegion(item);
                      setShowRegionModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.regionItemText,
                        { color: isSelected ? '#00A651' : colors.text },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && <CheckCircle size={17} color="#00A651" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  quickCallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
  },
  quickCallText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  cardTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  vitalAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
  },
  vitalBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vitalBannerTitle: {
    fontSize: 12.5,
    color: '#991b1b',
    fontFamily: 'Montserrat_500Medium',
  },
  vitalCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
  },
  vitalCallBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  optionalText: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontWeight: 'normal',
    fontFamily: 'Montserrat_400Regular',
  },
  reporterTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reporterTypeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  reporterTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
  },
  urgencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  urgencyGridCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  urgencyLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  urgencyDesc: {
    fontSize: 10.5,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 1,
  },
  caseTypeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  caseTypeChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  caseTypeText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Montserrat_500Medium',
  },
  rowTwoInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownSelector: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13.5,
    fontFamily: 'Montserrat_400Regular',
  },
  textArea: {
    minHeight: 85,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13.5,
    fontFamily: 'Montserrat_400Regular',
  },
  confidentialityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  confidentialityText: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_500Medium',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '70%',
  },
  modalSheetTablet: {
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 20,
    marginBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  regionItemText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },

  // Confirmation
  successContent: {
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
  },
  successIconOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  referenceBox: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  referenceLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  referenceCode: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.2,
  },
  emergencyCallBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  emergencyCallTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  successActions: {
    width: '100%',
    gap: 10,
  },
  btnNewReport: {
    backgroundColor: '#00A651',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNewReportText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  btnHome: {
    backgroundColor: 'transparent',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  btnHomeText: {
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
});
