import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  Circle,
  MapPin,
  User,
  Phone,
  HeartHandshake,
  AlertCircle,
  Building2,
  ShieldAlert,
  Check,
  ArrowLeft,
  Save,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { recensementService, RecensementPayload } from '../../services/recensement';

const VULNERABILITY_OPTIONS = [
  { id: 'deplace', label: 'Déplacé / Réfugié / Migrant' },
  { id: 'handicap', label: 'Personne en situation de handicap' },
  { id: 'chomage', label: 'Perte d’emploi / Précarité sévère' },
  { id: 'isolement', label: 'Isolement social / Perte de soutien' },
  { id: 'violences', label: 'Victime de violences ou abus' },
];

const THEMES_OPTIONS = [
  { id: 'depression', label: 'Signes et symptômes de la dépression' },
  { id: 'stress', label: 'Gestion du stress aigu et anxiété' },
  { id: 'soins_tila', label: 'Accès aux soins et téléconsultation TILA' },
  { id: 'stigmatisation', label: 'Lutte contre la stigmatisation communautaire' },
];

export default function CensusFormScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Form State
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [genre, setGenre] = useState<'Homme' | 'Femme'>('Femme');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [situationFamiliale, setSituationFamiliale] = useState('Célibataire');
  const [nombreEnfants, setNombreEnfants] = useState('');

  const [ville, setVille] = useState('Abidjan');
  const [quartier, setQuartier] = useState('');

  const [selectedVulnerabilities, setSelectedVulnerabilities] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([
    'depression',
    'stress',
    'soins_tila',
  ]);

  const [refere, setRefere] = useState(false);
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available centers for orientation
  const { data: centres } = useQuery({
    queryKey: ['recensement-centres'],
    queryFn: () => recensementService.listCentres(),
  });

  const toggleVulnerability = (id: string) => {
    setSelectedVulnerabilities((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleTheme = (id: string) => {
    setSelectedThemes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!nom.trim() || !prenom.trim()) {
      Alert.alert('Champs requis', 'Veuillez au moins renseigner le nom et le prénom de la personne recensée.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RecensementPayload = {
        nom: nom.trim(),
        prenom: prenom.trim(),
        telephone: telephone.trim() || null,
        genre,
        age: age ? parseInt(age, 10) : null,
        profession: profession.trim() || null,
        situationFamiliale,
        nombreEnfants: nombreEnfants ? parseInt(nombreEnfants, 10) : 0,
        ville: ville.trim() || 'Abidjan',
        quartier: quartier.trim() || null,
        sensibilise: true,
        refere,
        centreId: refere ? selectedCentreId : null,
        notes: notes.trim() || null,
        vulnerabilities: selectedVulnerabilities,
        themes: selectedThemes,
      };

      const result = await recensementService.create(payload);

      const statusMsg = result.synced
        ? 'La fiche a été transmise au serveur TILA avec succès.'
        : 'Vous êtes hors-ligne. La fiche a été sauvegardée sur votre téléphone et sera transmise automatiquement dès retour du réseau.';

      Alert.alert(
        result.synced ? 'Recensement Enregistré !' : 'Enregistré Hors-Ligne',
        statusMsg,
        [
          {
            text: 'Voir les personnes',
            onPress: () => router.replace('/(census-agent)/census-list'),
          },
          {
            text: 'Nouveau recensement',
            style: 'cancel',
            onPress: () => {
              // Reset form
              setNom('');
              setPrenom('');
              setTelephone('');
              setAge('');
              setProfession('');
              setQuartier('');
              setSelectedVulnerabilities([]);
              setNotes('');
              setRefere(false);
              setSelectedCentreId(null);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de l’enregistrement de la fiche.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Bannière explicative */}
          <View style={[styles.bannerCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <HeartHandshake size={20} color="#00A651" style={{ marginRight: 10 }} />
            <Text style={styles.bannerText}>
              Saisie terrain rapide. Les données sont sécurisées et synchronisées automatiquement dès que le réseau est disponible.
            </Text>
          </View>

          {/* Section 1 : Identité */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <User size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Identité du bénéficiaire</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Nom *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="ex: Kouamé"
                  placeholderTextColor={colors.textMuted}
                  value={nom}
                  onChangeText={setNom}
                />
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Prénom *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="ex: Awa"
                  placeholderTextColor={colors.textMuted}
                  value={prenom}
                  onChangeText={setPrenom}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Genre *</Text>
            <View style={styles.genderRow}>
              {(['Femme', 'Homme'] as const).map((g) => {
                const isSelected = genre === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      {
                        backgroundColor: isSelected ? '#00A651' : isDark ? colors.bg : '#F8FAFC',
                        borderColor: isSelected ? '#00A651' : colors.border,
                      },
                    ]}
                    onPress={() => setGenre(g)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.row, { marginTop: 12 }]}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Âge (ans)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="ex: 28"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                />
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Téléphone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="ex: 0701020304"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={telephone}
                  onChangeText={setTelephone}
                />
              </View>
            </View>

            <View style={[styles.row, { marginTop: 12 }]}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Profession</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="ex: Commerçante"
                  placeholderTextColor={colors.textMuted}
                  value={profession}
                  onChangeText={setProfession}
                />
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Enfants à charge</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="ex: 3"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={nombreEnfants}
                  onChangeText={setNombreEnfants}
                />
              </View>
            </View>
          </View>

          {/* Section 2 : Localisation */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <MapPin size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Localisation & Quartier</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Ville / Région</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="ex: Abidjan"
                  placeholderTextColor={colors.textMuted}
                  value={ville}
                  onChangeText={setVille}
                />
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Quartier / Campement</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="ex: Abobo PK18"
                  placeholderTextColor={colors.textMuted}
                  value={quartier}
                  onChangeText={setQuartier}
                />
              </View>
            </View>
          </View>

          {/* Section 3 : Vulnérabilités */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <ShieldAlert size={18} color="#d97706" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Facteurs de Vulnérabilité</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Cochez les situations particulières repérées lors de l'entretien :
            </Text>

            <View style={styles.checkboxList}>
              {VULNERABILITY_OPTIONS.map((opt) => {
                const checked = selectedVulnerabilities.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.checkboxItem,
                      {
                        backgroundColor: checked ? '#fffbeb' : isDark ? colors.bg : '#F8FAFC',
                        borderColor: checked ? '#f59e0b' : colors.border,
                      },
                    ]}
                    onPress={() => toggleVulnerability(opt.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkCircle, checked && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }]}>
                      {checked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 4 : Thématiques abordées */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <HeartHandshake size={18} color="#00A651" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Sensibilisation Communautaire</Text>
            </View>

            <View style={styles.checkboxList}>
              {THEMES_OPTIONS.map((opt) => {
                const checked = selectedThemes.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.checkboxItem,
                      {
                        backgroundColor: checked ? '#ecfdf5' : isDark ? colors.bg : '#F8FAFC',
                        borderColor: checked ? '#00A651' : colors.border,
                      },
                    ]}
                    onPress={() => toggleTheme(opt.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkCircle, checked && { backgroundColor: '#00A651', borderColor: '#00A651' }]}>
                      {checked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 5 : Orientation vers un centre / spécialiste */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Building2 size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Orientation & Référence</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkboxItem,
                {
                  backgroundColor: refere ? '#eff6ff' : isDark ? colors.bg : '#F8FAFC',
                  borderColor: refere ? '#2563eb' : colors.border,
                  marginBottom: 12,
                },
              ]}
              onPress={() => setRefere(!refere)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkCircle, refere && { backgroundColor: '#2563eb', borderColor: '#2563eb' }]}>
                {refere && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text, fontWeight: '600' }]}>
                Orienter la personne vers un centre de santé ou un psychologue TILA
              </Text>
            </TouchableOpacity>

            {refere && (
              <View style={styles.centresSelectBox}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Sélectionnez le centre de rattachement :</Text>
                {(centres || []).map((centre) => {
                  const isSelected = selectedCentreId === centre.id;
                  return (
                    <TouchableOpacity
                      key={centre.id}
                      style={[
                        styles.centreRadioItem,
                        {
                          backgroundColor: isSelected ? '#eff6ff' : isDark ? colors.bg : '#FFFFFF',
                          borderColor: isSelected ? '#2563eb' : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedCentreId(centre.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, isSelected && { borderColor: '#2563eb' }]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.centreRadioText, { color: colors.text }]}>{centre.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Observations terrain / Notes</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Précisez le contexte, l'état émotionnel, ou les demandes particulières..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Bouton de soumission */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Save size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer le recensement'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    color: '#00A651',
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    lineHeight: 17,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 10,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    minHeight: 70,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  checkboxList: {
    gap: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    lineHeight: 17,
  },
  centresSelectBox: {
    marginTop: 6,
    gap: 6,
  },
  centreRadioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  centreRadioText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
