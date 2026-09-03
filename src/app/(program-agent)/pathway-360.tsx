import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Compass,
  Search,
  CheckCircle2,
  Clock,
  Circle,
  User,
  Building2,
  Calendar,
  FileText,
  Activity,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { programAgentService, PatientParcours360Detail } from '../../services/programAgent';

export default function Pathway360Screen() {
  const { colors, isDark } = useTheme();
  const [searchInput, setSearchInput] = useState('PAT-CI-9042');
  const [activeCode, setActiveCode] = useState('PAT-CI-9042');

  const {
    data: patientData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['program-parcours-360', activeCode],
    queryFn: () => programAgentService.getParcours360(activeCode),
    enabled: !!activeCode,
  });

  const handleSearch = () => {
    if (searchInput.trim()) {
      setActiveCode(searchInput.trim());
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      {/* Barre de recherche patient */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Entrez un code patient (ex: PAT-CI-9042)..."
          placeholderTextColor={colors.textMuted}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearch}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={handleSearch}
          activeOpacity={0.8}
        >
          <Text style={styles.searchBtnText}>Rechercher</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : patientData ? (
          <>
            {/* Carte Récapitulative Patient Anonyme */}
            <View style={[styles.patientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.codeGroup}>
                  <Text style={[styles.patientCode, { color: colors.text }]}>{patientData.code}</Text>
                  <Text style={[styles.patientSub, { color: colors.textSecondary }]}>
                    {patientData.genre} • {patientData.age} ans • {patientData.ville}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>Actif</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.diagRow}>
                <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>Centre de suivi :</Text>
                <Text style={[styles.diagVal, { color: colors.text }]}>{patientData.centre}</Text>
              </View>

              {patientData.diagnosticPrincipal && (
                <View style={styles.diagRow}>
                  <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>Diagnostic :</Text>
                  <Text style={[styles.diagVal, { color: '#4f46e5', fontWeight: '700' }]}>
                    {patientData.diagnosticPrincipal}
                  </Text>
                </View>
              )}

              {patientData.scoreODS && (
                <View style={styles.odsBanner}>
                  <ShieldAlert size={14} color="#ea580c" style={{ marginRight: 6 }} />
                  <Text style={styles.odsText}>
                    Score ODS Initial : {patientData.scoreODS}/20 (Dépistage Positif)
                  </Text>
                </View>
              )}
            </View>

            {/* Frise Chronologique 360° */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Trajectoire & Historique Clinique 360°
            </Text>

            <View style={styles.timelineContainer}>
              {patientData.steps.map((step, index) => {
                const isDone = step.status === 'DONE';
                const isCurrent = step.status === 'CURRENT';
                const isLast = index === patientData.steps.length - 1;

                return (
                  <View key={index} style={styles.timelineStep}>
                    {/* Colonne visuelle gauche (Pastille + Ligne) */}
                    <View style={styles.timelineVisual}>
                      <View
                        style={[
                          styles.timelineCircle,
                          isDone && { backgroundColor: '#00A651' },
                          isCurrent && { backgroundColor: '#4f46e5' },
                          !isDone && !isCurrent && { backgroundColor: isDark ? colors.bg : '#E2E8F0', borderWidth: 2, borderColor: '#94a3b8' },
                        ]}
                      >
                        {isDone ? (
                          <CheckCircle2 size={14} color="#FFFFFF" />
                        ) : isCurrent ? (
                          <Clock size={14} color="#FFFFFF" />
                        ) : (
                          <Circle size={10} color="#94a3b8" />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: isDone ? '#00A651' : colors.border },
                          ]}
                        />
                      )}
                    </View>

                    {/* Contenu de l'étape */}
                    <View
                      style={[
                        styles.stepCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.stepHeader}>
                        <Text style={[styles.stepTitle, { color: colors.text }]} numberOfLines={1}>
                          {step.title}
                        </Text>
                        {step.date && (
                          <Text style={[styles.stepDate, { color: colors.textSecondary }]}>
                            {step.date}
                          </Text>
                        )}
                      </View>

                      <Text style={[styles.stepActor, { color: colors.textSecondary }]}>
                        Intervenant : {step.actor}
                      </Text>

                      <Text style={[styles.stepDetail, { color: colors.text }]}>
                        {step.detail}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Compass size={40} color={colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Recherche de Parcours 360°</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Entrez le code anonyme d'un patient pour retracer l'ensemble de son parcours de soins.
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  searchBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  patientCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codeGroup: {
    flex: 1,
    marginRight: 8,
  },
  patientCode: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  patientSub: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#00A651',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  diagRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  diagLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    width: 100,
  },
  diagVal: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    flex: 1,
  },
  odsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  odsText: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 16,
  },
  timelineContainer: {
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineVisual: {
    alignItems: 'center',
    width: 32,
    marginRight: 10,
  },
  timelineCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  stepCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    flex: 1,
    marginRight: 6,
  },
  stepDate: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
  },
  stepActor: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 6,
  },
  stepDetail: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 17,
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
