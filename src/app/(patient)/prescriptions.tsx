import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileCheck,
  Calendar,
  User,
  Pill,
  ChevronRight,
  X,
  ShieldCheck,
  Clock,
  Download,
  Share2,
  Building2,
  Stethoscope,
  CheckCircle2,
  Send,
} from 'lucide-react-native';
import { patientService, PrescriptionItem } from '../../services/patient';
import {
  generateAndSharePrescriptionPdf,
  PrescriptionShareRecord,
} from '../../services/prescriptionPdf';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECIPIENT_PRACTITIONERS = [
  { id: 'p1', name: 'Dr. Marc Kouamé', specialty: 'Psychiatre Adulte • CHU Cocody' },
  { id: 'p2', name: 'Mme Aminata Traoré', specialty: 'Psychologue Clinicienne • TILA' },
  { id: 'p3', name: 'Dr. Jean-Yves Yao', specialty: 'Pédopsychiatre • Hôpital Bouaké' },
  { id: 'p4', name: 'Dr. Fatou Bamba', specialty: 'Médecin Généraliste Référent' },
];

const RECIPIENT_CENTRES = [
  { id: 'c1', name: 'Centre Médical TILA Plateau', city: 'Abidjan' },
  { id: 'c2', name: 'CHU de Cocody (Service Psychiatrie)', city: 'Abidjan' },
  { id: 'c3', name: 'Centre de Santé Urbain Treichville', city: 'Abidjan' },
  { id: 'c4', name: 'Hôpital Général de Bouaké', city: 'Bouaké' },
];

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionItem | null>(null);
  const [patientName, setPatientName] = useState<string>('Patient');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // État pour le partage et l'historique
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingPrescription, setSharingPrescription] = useState<PrescriptionItem | null>(null);
  const [shareTab, setShareTab] = useState<'practitioner' | 'center' | 'external'>('practitioner');
  const [shareHistory, setShareHistory] = useState<PrescriptionShareRecord[]>([]);

  const fetchPrescriptions = async () => {
    try {
      const data = await patientService.prescriptions(1, 20);
      setPrescriptions(data?.items || []);
    } catch (e) {
      console.warn('[PatientPrescriptions] Erreur:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('tila_user_context');
        if (stored) {
          const user = JSON.parse(stored);
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name;
          if (name) setPatientName(name);
        }
      } catch {}
    };
    loadUser();
    fetchPrescriptions();
  }, []);

  // Charger l'historique des partages pour l'ordonnance sélectionnée
  const loadShareHistory = async (prescriptionId: number | string) => {
    try {
      const raw = await AsyncStorage.getItem(`@tila_shares_${prescriptionId}`);
      if (raw) {
        setShareHistory(JSON.parse(raw));
      } else {
        setShareHistory([]);
      }
    } catch {
      setShareHistory([]);
    }
  };

  const handleOpenPrescription = (p: PrescriptionItem) => {
    setSelectedPrescription(p);
    loadShareHistory(p.id);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPrescriptions();
  };

  const handleDownloadPdf = async (prescription: PrescriptionItem) => {
    setIsGeneratingPdf(true);
    try {
      await generateAndSharePrescriptionPdf(prescription, patientName);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenShareModal = (prescription: PrescriptionItem) => {
    setSharingPrescription(prescription);
    setShareModalVisible(true);
  };

  // Enregistrer le partage avec un destinataire
  const handleConfirmShare = async (recipientName: string, recipientType: 'praticien' | 'centre' | 'externe') => {
    if (!sharingPrescription) return;

    const newRecord: PrescriptionShareRecord = {
      id: Date.now().toString(),
      prescriptionId: sharingPrescription.id,
      recipientType,
      recipientName,
      sharedAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    try {
      const key = `@tila_shares_${sharingPrescription.id}`;
      const existing = await AsyncStorage.getItem(key);
      const list = existing ? JSON.parse(existing) : [];
      const updated = [newRecord, ...list];
      await AsyncStorage.setItem(key, JSON.stringify(updated));

      // Mettre à jour l'historique local
      setShareHistory(updated);
      setShareModalVisible(false);

      // Partager également le document en PDF
      await generateAndSharePrescriptionPdf(sharingPrescription, patientName);

      Alert.alert(
        'Partage Enregistré',
        `Votre ordonnance a été partagée avec succès avec "${recipientName}". Cette action a été archivée dans votre historique.`
      );
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d’enregistrer la trace du partage.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={styles.loadingText}>Chargement de vos ordonnances...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00A651" />
          }
        >
          {/* Info Banner */}
          <View style={styles.headerCard}>
            <View style={styles.iconCircle}>
              <FileCheck size={26} color="#00A651" />
            </View>
            <Text style={styles.headerTitle}>Mes Ordonnances Médicales</Text>
            <Text style={styles.headerSub}>
              Consultez vos prescriptions en cours, téléchargez-les en PDF officiel ou transmettez-les à vos praticiens.
            </Text>
          </View>

          {prescriptions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Pill size={44} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>Aucune ordonnance active</Text>
              <Text style={styles.emptySub}>
                Vos ordonnances médicales prescrites lors de vos consultations apparaîtront ici.
              </Text>
            </View>
          ) : (
            prescriptions.map((p, index) => (
              <TouchableOpacity
                key={p.id || index}
                style={styles.card}
                onPress={() => handleOpenPrescription(p)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.pillIconWrap}>
                    <Pill size={18} color="#00A651" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.doctorName}>Dr. {p.doctorName || 'Médecin Référent'}</Text>
                    <Text style={styles.dateText}>
                      Délivrée le {p.issuedAt || p.createdAt || 'N/A'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </View>

                {p.lines && p.lines.length > 0 && (
                  <View style={styles.medicationsList}>
                    {p.lines.slice(0, 2).map((line, idx) => (
                      <View key={idx} style={styles.medicationSnippet}>
                        <Text style={styles.medName}>• {line.medication}</Text>
                        <Text style={styles.medPosology}>{line.posologie}</Text>
                      </View>
                    ))}
                    {p.lines.length > 2 && (
                      <Text style={styles.moreMedsText}>+ {p.lines.length - 2} autre(s) médicament(s)</Text>
                    )}
                  </View>
                )}

                {/* Barre de boutons compacts sur la carte */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.actionsPillsRow}>
                    {/* Petit bouton Télécharger PDF */}
                    <TouchableOpacity
                      style={styles.smallPdfBtn}
                      onPress={() => handleDownloadPdf(p)}
                      activeOpacity={0.7}
                    >
                      <Download size={13} color="#00A651" style={{ marginRight: 4 }} />
                      <Text style={styles.smallPdfBtnText}>PDF</Text>
                    </TouchableOpacity>

                    {/* Petit bouton Partager */}
                    <TouchableOpacity
                      style={styles.smallShareBtn}
                      onPress={() => handleOpenShareModal(p)}
                      activeOpacity={0.7}
                    >
                      <Share2 size={13} color="#2563eb" style={{ marginRight: 4 }} />
                      <Text style={styles.smallShareBtnText}>Partager</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cardViewText}>Détails →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal Détail Ordonnance */}
      <Modal visible={!!selectedPrescription} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalTitle}>Ordonnance Médicale</Text>
                <Text style={styles.modalSubtitle}>
                  Prescrite par Dr. {selectedPrescription?.doctorName} pour {patientName}
                </Text>
              </View>

              {/* Boutons compacts d'action dans le Header du Modal */}
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  style={styles.modalHeaderIconBtn}
                  onPress={() => selectedPrescription && handleDownloadPdf(selectedPrescription)}
                  activeOpacity={0.7}
                >
                  <Download size={16} color="#00A651" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalHeaderIconBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
                  onPress={() => selectedPrescription && handleOpenShareModal(selectedPrescription)}
                  activeOpacity={0.7}
                >
                  <Share2 size={16} color="#2563eb" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedPrescription(null)}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedPrescription && (
                <>
                  <View style={styles.prescriptionMetaBox}>
                    <Text style={styles.metaLabel}>Date d'émission :</Text>
                    <Text style={styles.metaVal}>
                      {selectedPrescription.issuedAt || selectedPrescription.createdAt || 'Non spécifiée'}
                    </Text>
                    <Text style={[styles.metaLabel, { marginTop: 6 }]}>Patient bénéficiaire :</Text>
                    <Text style={styles.metaVal}>{patientName}</Text>
                    {selectedPrescription.doctorMatricule ? (
                      <>
                        <Text style={[styles.metaLabel, { marginTop: 6 }]}>Matricule prescripteur :</Text>
                        <Text style={styles.metaVal}>{selectedPrescription.doctorMatricule}</Text>
                      </>
                    ) : null}
                  </View>

                  <Text style={styles.linesSectionTitle}>Médicaments et Posologie</Text>
                  {selectedPrescription.lines && selectedPrescription.lines.length > 0 ? (
                    selectedPrescription.lines.map((l, i) => (
                      <View key={i} style={styles.lineItemCard}>
                        <Text style={styles.lineMedName}>{l.medication}</Text>
                        <Text style={styles.linePosology}>{l.posologie}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noLinesText}>Aucun médicament répertorié.</Text>
                  )}

                  {selectedPrescription.notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesTitle}>Instructions du médecin :</Text>
                      <Text style={styles.notesContent}>{selectedPrescription.notes}</Text>
                    </View>
                  ) : null}

                  {/* 3. Section HISTORIQUE DES PARTAGES (Traçabilité) */}
                  <View style={styles.sharesSection}>
                    <View style={styles.sharesHeader}>
                      <Share2 size={15} color="#00A651" style={{ marginRight: 6 }} />
                      <Text style={styles.sharesTitle}>Historique des partages & transmissions</Text>
                    </View>

                    {shareHistory.length === 0 ? (
                      <View style={styles.emptySharesBox}>
                        <Text style={styles.emptySharesText}>
                          Cette ordonnance n'a pas encore été transmise à un praticien ou un établissement.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.sharesList}>
                        {shareHistory.map((sh) => (
                          <View key={sh.id} style={styles.shareHistoryItem}>
                            <CheckCircle2 size={14} color="#00A651" style={{ marginRight: 8, marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.shareRecipientName}>{sh.recipientName}</Text>
                              <Text style={styles.shareDateText}>Transmise le {sh.sharedAt}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Deux boutons d'action au bas du modal */}
                  <View style={styles.modalBottomActions}>
                    <TouchableOpacity
                      style={styles.modalMainBtnPdf}
                      onPress={() => handleDownloadPdf(selectedPrescription)}
                      disabled={isGeneratingPdf}
                      activeOpacity={0.85}
                    >
                      {isGeneratingPdf ? (
                        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                      ) : (
                        <Download size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.modalMainBtnText}>Télécharger PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalMainBtnShare}
                      onPress={() => handleOpenShareModal(selectedPrescription)}
                      activeOpacity={0.85}
                    >
                      <Share2 size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.modalMainBtnText}>Partager...</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Sélecteur de Partage avec Praticien ou Centre */}
      <Modal visible={shareModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.shareModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Transmettre l'ordonnance</Text>
                <Text style={styles.modalSubtitle}>Sélectionnez le praticien ou la structure</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShareModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Onglets Destinataires */}
            <View style={styles.shareTabsRow}>
              <TouchableOpacity
                style={[styles.shareTabBtn, shareTab === 'practitioner' && styles.shareTabBtnActive]}
                onPress={() => setShareTab('practitioner')}
              >
                <Stethoscope size={13} color={shareTab === 'practitioner' ? '#00A651' : '#64748b'} style={{ marginRight: 4 }} />
                <Text style={[styles.shareTabText, shareTab === 'practitioner' && styles.shareTabTextActive]}>
                  Praticiens
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shareTabBtn, shareTab === 'center' && styles.shareTabBtnActive]}
                onPress={() => setShareTab('center')}
              >
                <Building2 size={13} color={shareTab === 'center' ? '#00A651' : '#64748b'} style={{ marginRight: 4 }} />
                <Text style={[styles.shareTabText, shareTab === 'center' && styles.shareTabTextActive]}>
                  Établissements
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shareTabBtn, shareTab === 'external' && styles.shareTabBtnActive]}
                onPress={() => setShareTab('external')}
              >
                <Send size={13} color={shareTab === 'external' ? '#00A651' : '#64748b'} style={{ marginRight: 4 }} />
                <Text style={[styles.shareTabText, shareTab === 'external' && styles.shareTabTextActive]}>
                  Externe
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.shareDestList} showsVerticalScrollIndicator={false}>
              {shareTab === 'practitioner' && (
                <>
                  <Text style={styles.shareListHint}>Sélectionnez un spécialiste du réseau TILA :</Text>
                  {RECIPIENT_PRACTITIONERS.map((prat) => (
                    <TouchableOpacity
                      key={prat.id}
                      style={styles.destCard}
                      onPress={() => handleConfirmShare(prat.name, 'praticien')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.destAvatar}>
                        <Stethoscope size={16} color="#00A651" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.destName}>{prat.name}</Text>
                        <Text style={styles.destSub}>{prat.specialty}</Text>
                      </View>
                      <Send size={14} color="#00A651" />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {shareTab === 'center' && (
                <>
                  <Text style={styles.shareListHint}>Sélectionnez une structure hospitalière ou un centre partenaire :</Text>
                  {RECIPIENT_CENTRES.map((centre) => (
                    <TouchableOpacity
                      key={centre.id}
                      style={styles.destCard}
                      onPress={() => handleConfirmShare(centre.name, 'centre')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.destAvatar, { backgroundColor: '#eff6ff' }]}>
                        <Building2 size={16} color="#2563eb" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.destName}>{centre.name}</Text>
                        <Text style={styles.destSub}>{centre.city} • Réseau National TILA</Text>
                      </View>
                      <Send size={14} color="#2563eb" />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {shareTab === 'external' && (
                <View style={{ paddingVertical: 10 }}>
                  <Text style={styles.shareListHint}>
                    Partager le document PDF via vos applications installées (WhatsApp, Messagerie, Impression, etc.) :
                  </Text>
                  <TouchableOpacity
                    style={styles.externalShareBtn}
                    onPress={() => handleConfirmShare('Partage Externe Direct', 'externe')}
                    activeOpacity={0.85}
                  >
                    <Share2 size={16} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.externalShareBtnText}>Ouvrir le menu de partage système</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pillIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  doctorName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  dateText: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  medicationsList: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  medicationSnippet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'Montserrat_600SemiBold',
  },
  medPosology: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  moreMedsText: {
    fontSize: 11.5,
    color: '#00A651',
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'Montserrat_600SemiBold',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionsPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  smallPdfBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  smallShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  smallShareBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Montserrat_700Bold',
  },
  cardViewText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: 'Montserrat_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  shareModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginLeft: 4,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 36,
  },
  prescriptionMetaBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 1,
    fontFamily: 'Montserrat_600SemiBold',
  },
  linesSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  lineItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  lineMedName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  linePosology: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontFamily: 'Montserrat_500Medium',
  },
  noLinesText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  notesBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  notesContent: {
    fontSize: 12.5,
    color: '#92400e',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  sharesSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sharesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sharesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  emptySharesBox: {
    paddingVertical: 6,
  },
  emptySharesText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  sharesList: {
    gap: 8,
  },
  shareHistoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shareRecipientName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  shareDateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  modalBottomActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  modalMainBtnPdf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    borderRadius: 12,
    paddingVertical: 13,
  },
  modalMainBtnShare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
  },
  modalMainBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
  shareTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  shareTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  shareTabBtnActive: {
    borderColor: '#00A651',
    backgroundColor: '#ecfdf5',
  },
  shareTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  shareTabTextActive: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  shareDestList: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  shareListHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    fontFamily: 'Montserrat_400Regular',
  },
  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  destAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  destName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  destSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  externalShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  externalShareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Montserrat_700Bold',
  },
});
