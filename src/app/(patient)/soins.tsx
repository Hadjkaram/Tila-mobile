import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HeartPulse,
  Activity,
  Droplet,
  Scale,
  Plus,
  Trash2,
  AlertTriangle,
  Shield,
  Calendar,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { patientSpaceService, formatFr, type PhysicalProfile, type CareItem } from '../../services/patientSpace';
import { useTheme } from '../../context/ThemeContext';

export default function PatientSoinsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<'physique' | 'soins'>('physique');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Santé physique
  const [physical, setPhysical] = useState<PhysicalProfile>({
    allergies: [],
    antecedents: [],
    mesures: [],
    handicap: '',
    groupeSanguin: '',
  });

  // Soins & Éléments
  const [careItems, setCareItems] = useState<CareItem[]>([]);

  // Formulaire nouvelle mesure
  const [tension, setTension] = useState('');
  const [poids, setPoids] = useState('');
  const [taille, setTaille] = useState('');
  const [glycemie, setGlycemie] = useState('');
  const [pouls, setPouls] = useState('');
  const [savingMeasure, setSavingMeasure] = useState(false);

  // Formulaire allergies / antécédents
  const [newAllergie, setNewAllergie] = useState('');
  const [newAntecedent, setNewAntecedent] = useState('');

  const loadData = async () => {
    try {
      const [physRes, caresRes] = await Promise.allSettled([
        patientSpaceService.physical().catch(() => null),
        patientSpaceService.careItems().catch(() => ({ items: [] as CareItem[] })),
      ]);

      if (physRes.status === 'fulfilled' && physRes.value) {
        setPhysical(physRes.value);
      }
      if (caresRes.status === 'fulfilled' && caresRes.value) {
        setCareItems(caresRes.value.items || []);
      }
    } catch (e) {
      console.warn('[Soins] Erreur:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddMeasure = async () => {
    if (!poids.trim() && !tension.trim() && !pouls.trim() && !glycemie.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir au moins une valeur de mesure.');
      return;
    }

    setSavingMeasure(true);
    try {
      const updated = await patientSpaceService.addMeasure({
        tension: tension.trim() || null,
        poids: poids.trim() ? parseFloat(poids) : null,
        taille: taille.trim() ? parseFloat(taille) : null,
        glycemie: glycemie.trim() ? parseFloat(glycemie) : null,
        pouls: pouls.trim() ? parseInt(pouls, 10) : null,
        source: 'Saisie patient mobile',
      });
      setPhysical(updated);
      setTension('');
      setPoids('');
      setTaille('');
      setGlycemie('');
      setPouls('');
      Alert.alert('Succès', 'Votre mesure a été enregistrée.');
    } catch {
      Alert.alert('Erreur', 'Impossible d’enregistrer la mesure.');
    } finally {
      setSavingMeasure(false);
    }
  };

  const handleAddAllergy = async () => {
    if (!newAllergie.trim()) return;
    const next = [...(physical.allergies || []), newAllergie.trim()];
    try {
      const updated = await patientSpaceService.savePhysical({
        ...physical,
        allergies: next,
      });
      setPhysical(updated);
      setNewAllergie('');
    } catch {
      Alert.alert('Erreur', 'Impossible d’ajouter l’allergie.');
    }
  };

  const handleAddAntecedent = async () => {
    if (!newAntecedent.trim()) return;
    const next = [...(physical.antecedents || []), newAntecedent.trim()];
    try {
      const updated = await patientSpaceService.savePhysical({
        ...physical,
        antecedents: next,
      });
      setPhysical(updated);
      setNewAntecedent('');
    } catch {
      Alert.alert('Erreur', 'Impossible d’ajouter l’antécédent.');
    }
  };

  const lastMesure = physical.mesures && physical.mesures.length > 0
    ? physical.mesures[physical.mesures.length - 1]
    : null;

  const imc = (() => {
    if (!lastMesure?.poids || !lastMesure?.taille || lastMesure.taille <= 0) return '—';
    const cm = lastMesure.taille <= 3 ? lastMesure.taille * 100 : lastMesure.taille;
    const val = lastMesure.poids / (cm / 100) ** 2;
    return val > 0 && val < 80 ? val.toFixed(1) : '—';
  })();

  const tiles = [
    { label: 'Tension', val: lastMesure?.tension || '—', unit: 'cmHg', icon: HeartPulse, color: '#ef4444' },
    { label: 'Poids', val: lastMesure?.poids != null ? `${lastMesure.poids}` : '—', unit: 'kg', icon: Scale, color: '#2563eb' },
    { label: 'IMC', val: imc, unit: '', icon: Activity, color: '#00A651' },
    { label: 'Glycémie', val: lastMesure?.glycemie != null ? `${lastMesure.glycemie}` : '—', unit: 'g/L', icon: Droplet, color: '#d97706' },
    { label: 'Pouls', val: lastMesure?.pouls != null ? `${lastMesure.pouls}` : '—', unit: 'bpm', icon: HeartPulse, color: '#ec4899' },
    { label: 'Groupe', val: physical.groupeSanguin || '—', unit: '', icon: Droplet, color: '#8b5cf6' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00A651" />}
      >
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: isDark ? colors.card : '#ecfdf5', borderColor: colors.border }]}>
          <View style={styles.badgeWrap}>
            <HeartPulse size={14} color="#00A651" style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>Dossier de Santé Intégré</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Mes Soins & Santé Physique</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Consultez vos constantes physiologiques, vos antécédents et les éléments de soins déclarés dans votre dossier.
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabsRow, { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9', borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'physique' && styles.tabBtnActive]}
            onPress={() => setTab('physique')}
            activeOpacity={0.8}
          >
            <Activity size={15} color={tab === 'physique' ? '#00A651' : colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.tabBtnText, { color: tab === 'physique' ? (isDark ? '#ffffff' : '#0f172a') : colors.textMuted }]}>
              Santé Physique
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'soins' && styles.tabBtnActive]}
            onPress={() => setTab('soins')}
            activeOpacity={0.8}
          >
            <Shield size={15} color={tab === 'soins' ? '#00A651' : colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.tabBtnText, { color: tab === 'soins' ? (isDark ? '#ffffff' : '#0f172a') : colors.textMuted }]}>
              Éléments de Soins
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#00A651" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement de vos données...</Text>
          </View>
        ) : tab === 'physique' ? (
          <>
            {/* Grille des Constantes */}
            <View style={styles.tilesGrid}>
              {tiles.map((t) => (
                <View
                  key={t.label}
                  style={[styles.tileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <t.icon size={18} color={t.color} />
                  <Text style={[styles.tileLabel, { color: colors.textSecondary }]}>{t.label}</Text>
                  <Text style={[styles.tileVal, { color: colors.text }]}>
                    {t.val} <Text style={styles.tileUnit}>{t.unit}</Text>
                  </Text>
                </View>
              ))}
            </View>

            {/* Formulaire Nouvelle Mesure */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Enregistrer une nouvelle mesure</Text>
              <View style={styles.formGrid}>
                <View style={styles.inputCol}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tension (cmHg)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                    value={tension}
                    onChangeText={setTension}
                    placeholder="ex: 12/8"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids (kg)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                    value={poids}
                    onChangeText={setPoids}
                    keyboardType="numeric"
                    placeholder="ex: 72"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.inputCol}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Pouls (bpm)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                    value={pouls}
                    onChangeText={setPouls}
                    keyboardType="numeric"
                    placeholder="ex: 75"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Glycémie (g/L)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                    value={glycemie}
                    onChangeText={setGlycemie}
                    keyboardType="numeric"
                    placeholder="ex: 0.95"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.addBtn, savingMeasure && { opacity: 0.6 }]}
                onPress={handleAddMeasure}
                disabled={savingMeasure}
                activeOpacity={0.85}
              >
                {savingMeasure ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.addBtnText}>Ajouter la mesure</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Allergies & Antécédents */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Allergies & Antécédents</Text>

              {/* Allergies */}
              <Text style={[styles.subTitle, { color: colors.textSecondary, marginTop: 8 }]}>Allergies déclarées :</Text>
              <View style={styles.chipsWrap}>
                {(physical.allergies || []).length === 0 ? (
                  <Text style={[styles.emptySmall, { color: colors.textSecondary }]}>Aucune allergie renseignée.</Text>
                ) : (
                  physical.allergies.map((al, idx) => (
                    <View key={idx} style={styles.chipWarning}>
                      <AlertTriangle size={12} color="#dc2626" style={{ marginRight: 4 }} />
                      <Text style={styles.chipWarningText}>{al}</Text>
                    </View>
                  ))
                )}
              </View>
              <View style={styles.inlineAddRow}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                  value={newAllergie}
                  onChangeText={setNewAllergie}
                  placeholder="Ajouter une allergie (ex: Pénicilline)"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity style={styles.smallAddBtn} onPress={handleAddAllergy}>
                  <Plus size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Antécédents */}
              <Text style={[styles.subTitle, { color: colors.textSecondary, marginTop: 14 }]}>Antécédents médicaux :</Text>
              <View style={styles.chipsWrap}>
                {(physical.antecedents || []).length === 0 ? (
                  <Text style={[styles.emptySmall, { color: colors.textSecondary }]}>Aucun antécédent renseigné.</Text>
                ) : (
                  physical.antecedents.map((an, idx) => (
                    <View key={idx} style={styles.chipNeutral}>
                      <Text style={styles.chipNeutralText}>{an}</Text>
                    </View>
                  ))
                )}
              </View>
              <View style={styles.inlineAddRow}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
                  value={newAntecedent}
                  onChangeText={setNewAntecedent}
                  placeholder="Ajouter un antécédent (ex: Asthme, HTA)"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity style={styles.smallAddBtn} onPress={handleAddAntecedent}>
                  <Plus size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          /* Onglet Éléments de soins */
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Éléments de soins déclarés</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Traitements et programmes de prise en charge rattachés à votre suivi médical.
            </Text>

            {careItems.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Shield size={32} color="#00A651" style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun soin spécifique enregistré</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Vos suivis psychologiques et médicaux apparaîtront automatiquement lors de l'établissement d'un protocole par votre praticien.
                </Text>
              </View>
            ) : (
              <View style={styles.caresList}>
                {careItems.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.careItemRow, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.careLibelle, { color: colors.text }]}>{item.libelle}</Text>
                      <Text style={[styles.careMeta, { color: colors.textSecondary }]}>
                        {item.domaine} {item.structure ? `· ${item.structure}` : ''} {item.date ? `· ${formatFr(item.date)}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
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
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tileCard: {
    width: '31%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  tileLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  tileVal: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  tileUnit: {
    fontSize: 10,
    fontWeight: '400',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 14,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11.5,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 6,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
  },
  chipWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipWarningText: {
    color: '#dc2626',
    fontSize: 11.5,
    fontWeight: '600',
  },
  chipNeutral: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipNeutralText: {
    color: '#334155',
    fontSize: 11.5,
  },
  emptySmall: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inlineAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  smallAddBtn: {
    backgroundColor: '#00A651',
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
  },
  caresList: {
    gap: 8,
  },
  careItemRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  careLibelle: {
    fontSize: 14,
    fontWeight: '700',
  },
  careMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
