import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText,
  Pill,
  Calendar,
  ClipboardList,
  Check,
  Eye,
  User,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { patientService, type PatientConsultationItem, type PrescriptionItem } from '../../services/patient';
import { patientSpaceService, formatFr, type ClinicalDocument } from '../../services/patientSpace';
import { useTheme } from '../../context/ThemeContext';

type DocumentRow =
  | { key: string; kind: 'document'; date?: string | null; doc: ClinicalDocument }
  | { key: string; kind: 'ordonnance'; date?: string | null; rx: PrescriptionItem }
  | { key: string; kind: 'consultation'; date?: string | null; item: PatientConsultationItem };

export default function PatientDocumentsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterKind, setFilterKind] = useState<'all' | 'document' | 'ordonnance' | 'consultation'>('all');

  const loadDocuments = async () => {
    try {
      const [docsRes, rxRes, consultsRes] = await Promise.allSettled([
        patientSpaceService.documents().catch(() => ({ items: [] as ClinicalDocument[] })),
        patientService.prescriptions().catch(() => ({ items: [] as PrescriptionItem[] })),
        patientService.consultations().catch(() => ({ consultations: [] as PatientConsultationItem[] })),
      ]);

      const docs = docsRes.status === 'fulfilled' ? docsRes.value.items || [] : [];
      const rxs = rxRes.status === 'fulfilled' ? rxRes.value.items || [] : [];
      const consults = consultsRes.status === 'fulfilled' ? consultsRes.value.consultations || [] : [];

      const combined: DocumentRow[] = [
        ...docs.map((doc) => ({ key: `d-${doc.id}`, kind: 'document' as const, date: doc.date, doc })),
        ...rxs.map((rx) => ({ key: `r-${rx.id}`, kind: 'ordonnance' as const, date: rx.issuedAt || rx.createdAt, rx })),
        ...consults.filter((c) => c.summary).map((c) => ({ key: `c-${c.id}`, kind: 'consultation' as const, date: c.date, item: c })),
      ];

      combined.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      setRows(combined);
    } catch (e) {
      console.warn('[Documents] Erreur:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const handleMarkAsRead = async (docId: number) => {
    try {
      await patientSpaceService.markDocumentRead(docId);
      setRows((prev) =>
        prev.map((r) =>
          r.kind === 'document' && r.doc.id === docId
            ? { ...r, doc: { ...r.doc, lu: true } }
            : r
        )
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de marquer le document comme lu.');
    }
  };

  const filteredRows = filterKind === 'all' ? rows : rows.filter((r) => r.kind === filterKind);

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
            <FileText size={14} color="#00A651" style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>Dossier Médical Centralisé</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Mes Documents Médicaux</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Retrouvez tous vos comptes rendus cliniques, ordonnances et certificats sécurisés au même endroit.
          </Text>
        </View>

        {/* Filtres par type */}
        <View style={styles.filtersRow}>
          {[
            { id: 'all', label: 'Tous' },
            { id: 'document', label: 'Documents' },
            { id: 'ordonnance', label: 'Ordonnances' },
            { id: 'consultation', label: 'Comptes rendus' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilterKind(f.id as any)}
              style={[
                styles.filterChip,
                filterKind === f.id && styles.filterChipActive,
                { borderColor: filterKind === f.id ? '#00A651' : colors.border },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterKind === f.id && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#00A651" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement de vos documents...</Text>
          </View>
        ) : filteredRows.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.emptyIconCircle}>
              <FileText size={28} color="#00A651" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun document disponible</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Vos ordonnances émises et comptes rendus de consultations apparaîtront automatiquement ici après chaque séance.
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredRows.map((row) => {
              const isDoc = row.kind === 'document';
              const isRx = row.kind === 'ordonnance';
              const isConsult = row.kind === 'consultation';

              const title = isDoc
                ? row.doc.titre
                : isRx
                  ? `Ordonnance médicale — ${row.rx.doctorName}`
                  : `Compte rendu — ${row.item.professionalName}`;

              const author = isDoc
                ? row.doc.auteur || 'Praticien TILA'
                : isRx
                  ? row.rx.doctorName
                  : row.item.professionalName;

              const isUnread = isDoc && !row.doc.lu;

              return (
                <View
                  key={row.key}
                  style={[
                    styles.docCard,
                    { backgroundColor: colors.card, borderColor: isUnread ? '#00A651' : colors.border },
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.iconBox, { backgroundColor: isRx ? '#fef3c7' : isConsult ? '#eff6ff' : '#ecfdf5' }]}>
                      {isRx ? (
                        <Pill size={18} color="#d97706" />
                      ) : isConsult ? (
                        <Calendar size={18} color="#2563eb" />
                      ) : (
                        <FileText size={18} color="#00A651" />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={2}>
                          {title}
                        </Text>
                        {isUnread && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>Nouveau</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
                        {author} · {formatFr(row.date)}
                      </Text>
                    </View>
                  </View>

                  {/* Aperçu du texte ou contenu */}
                  {isDoc && row.doc.texte ? (
                    <Text style={[styles.docSnippet, { color: colors.textSecondary }]} numberOfLines={3}>
                      {row.doc.texte}
                    </Text>
                  ) : null}

                  {isConsult && row.item.summary ? (
                    <Text style={[styles.docSnippet, { color: colors.textSecondary }]} numberOfLines={3}>
                      {row.item.summary}
                    </Text>
                  ) : null}

                  {/* Actions */}
                  <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                    {isUnread && (
                      <TouchableOpacity
                        style={styles.markReadBtn}
                        onPress={() => handleMarkAsRead(row.doc.id)}
                        activeOpacity={0.7}
                      >
                        <Check size={14} color="#00A651" style={{ marginRight: 4 }} />
                        <Text style={styles.markReadText}>Marquer comme lu</Text>
                      </TouchableOpacity>
                    )}
                    {isRx && (
                      <TouchableOpacity
                        style={styles.actionLinkBtn}
                        onPress={() => router.push('/(patient)/prescriptions')}
                        activeOpacity={0.7}
                      >
                        <Eye size={14} color="#2563eb" style={{ marginRight: 4 }} />
                        <Text style={styles.actionLinkText}>Voir l'ordonnance complète</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
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
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#00A651',
  },
  filterChipText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 166, 81, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  listWrap: {
    gap: 12,
  },
  docCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  unreadBadge: {
    backgroundColor: '#00A651',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  docMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  docSnippet: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
    gap: 10,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: 12,
    color: '#00A651',
    fontWeight: '600',
  },
  actionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionLinkText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
});
