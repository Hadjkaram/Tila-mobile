import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  User,
  Building2,
  Clock,
  History,
  Lock,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import {
  patientSpaceService,
  formatFr,
  ACCESS_LEVELS,
  type ConsentItem,
  type AccessLogItem,
} from '../../services/patientSpace';
import { useTheme } from '../../context/ThemeContext';

export default function PatientAutorisationsScreen() {
  const { colors, isDark } = useTheme();
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'consents' | 'logs'>('consents');

  const loadData = async () => {
    try {
      const res = await patientSpaceService.consents();
      setConsents(res?.items?.items || []);
      setLogs(res?.log?.items || []);
    } catch (e) {
      console.warn('[Autorisations] Erreur:', e);
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

  const handleToggleConsent = async (item: ConsentItem) => {
    const nextActive = !item.active;
    try {
      await patientSpaceService.saveConsent(item.professionalId, {
        niveaux: item.niveaux || [],
        active: nextActive,
      });
      setConsents((prev) =>
        prev.map((c) =>
          c.professionalId === item.professionalId ? { ...c, active: nextActive } : c
        )
      );
      Alert.alert(
        'Consentement mis à jour',
        nextActive
          ? `L'accès a été accordé au professionnel.`
          : `L'accès au dossier a été révoqué pour ce professionnel.`
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier le consentement.');
    }
  };

  const handleToggleNiveau = async (item: ConsentItem, niveauId: string) => {
    const cur = item.niveaux || [];
    const nextNiveaux = cur.includes(niveauId)
      ? cur.filter((n) => n !== niveauId)
      : [...cur, niveauId];

    try {
      await patientSpaceService.saveConsent(item.professionalId, {
        niveaux: nextNiveaux,
        active: item.active,
      });
      setConsents((prev) =>
        prev.map((c) =>
          c.professionalId === item.professionalId ? { ...c, niveaux: nextNiveaux } : c
        )
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour les niveaux d’accès.');
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
            <ShieldCheck size={14} color="#00A651" style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>Confidentialité & RGPD PNSM</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Mes Autorisations & Consentements</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Vous gardez le contrôle total sur votre dossier. Définissez précisément quels soignants peuvent accéder à vos données de santé.
          </Text>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabsRow, { backgroundColor: isDark ? colors.bgSecondary : '#f1f5f9', borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'consents' && styles.tabBtnActive]}
            onPress={() => setActiveTab('consents')}
            activeOpacity={0.8}
          >
            <ShieldCheck size={15} color={activeTab === 'consents' ? '#00A651' : colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'consents' ? (isDark ? '#ffffff' : '#0f172a') : colors.textMuted }]}>
              Praticiens autorisés ({consents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'logs' && styles.tabBtnActive]}
            onPress={() => setActiveTab('logs')}
            activeOpacity={0.8}
          >
            <History size={15} color={activeTab === 'logs' ? '#00A651' : colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.tabBtnText, { color: activeTab === 'logs' ? (isDark ? '#ffffff' : '#0f172a') : colors.textMuted }]}>
              Journal des accès ({logs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#00A651" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement des autorisations...</Text>
          </View>
        ) : activeTab === 'consents' ? (
          consents.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Lock size={32} color="#00A651" style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun praticien externe rattaché</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Dès que vous prenez rendez-vous ou consultez un praticien, celui-ci apparaîtra ici avec ses options de consentement.
              </Text>
            </View>
          ) : (
            <View style={styles.consentsList}>
              {consents.map((item) => (
                <View
                  key={item.professionalId}
                  style={[styles.consentCard, { backgroundColor: colors.card, borderColor: item.active ? '#00A651' : colors.border }]}
                >
                  <View style={styles.consentTopRow}>
                    <View style={styles.proAvatar}>
                      <User size={20} color="#00A651" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.proName, { color: colors.text }]}>{item.beneficiaire}</Text>
                      <Text style={[styles.proStructure, { color: colors.textSecondary }]}>
                        {item.structure || 'Centre de santé agréé'}
                      </Text>
                    </View>
                    <Switch
                      value={item.active}
                      onValueChange={() => handleToggleConsent(item)}
                      trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                      thumbColor={item.active ? '#00A651' : '#f8fafc'}
                    />
                  </View>

                  {/* Niveaux d'accès granulaires */}
                  {item.active && (
                    <View style={[styles.niveauxSection, { borderTopColor: colors.border }]}>
                      <Text style={[styles.niveauxTitle, { color: colors.textSecondary }]}>
                        Données partagées avec ce professionnel :
                      </Text>
                      <View style={styles.niveauxGrid}>
                        {ACCESS_LEVELS.map((level) => {
                          const isChecked = (item.niveaux || []).includes(level.id);
                          return (
                            <TouchableOpacity
                              key={level.id}
                              style={[
                                styles.niveauChip,
                                isChecked && styles.niveauChipActive,
                                { borderColor: isChecked ? '#00A651' : colors.border },
                              ]}
                              onPress={() => handleToggleNiveau(item, level.id)}
                              activeOpacity={0.7}
                            >
                              {isChecked ? (
                                <CheckCircle2 size={13} color="#00A651" style={{ marginRight: 4 }} />
                              ) : (
                                <XCircle size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                              )}
                              <Text style={[styles.niveauChipText, isChecked && styles.niveauChipTextActive]}>
                                {level.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )
        ) : (
          /* Journal des accès */
          logs.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <History size={32} color="#00A651" style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun événement d'accès enregistré</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Chaque consultation ou modification de votre dossier par un praticien est enregistrée de manière transparente et immuable dans ce journal.
              </Text>
            </View>
          ) : (
            <View style={styles.logsList}>
              {logs.map((log) => (
                <View
                  key={log.id}
                  style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logWho, { color: colors.text }]}>{log.who}</Text>
                    <Text style={[styles.logAction, { color: colors.textSecondary }]}>
                      {log.action} {log.structure ? `· ${log.structure}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.logDate, { color: colors.textSecondary }]}>
                    {formatFr(log.date)}
                  </Text>
                </View>
              ))}
            </View>
          )
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
    fontSize: 12.5,
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
  consentsList: {
    gap: 12,
  },
  consentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  consentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,166,81,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  proStructure: {
    fontSize: 12,
    marginTop: 1,
  },
  niveauxSection: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  niveauxTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  niveauxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  niveauChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  niveauChipActive: {
    backgroundColor: 'rgba(0,166,81,0.12)',
  },
  niveauChipText: {
    fontSize: 11.5,
    color: '#64748b',
  },
  niveauChipTextActive: {
    color: '#00A651',
    fontWeight: '600',
  },
  logsList: {
    gap: 10,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  logWho: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  logAction: {
    fontSize: 12,
    marginTop: 2,
  },
  logDate: {
    fontSize: 11,
    marginLeft: 8,
  },
});
