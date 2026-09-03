import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Video,
  Calendar,
  Clock,
  ShieldCheck,
  Headphones,
  Wifi,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  PhoneCall,
} from 'lucide-react-native';
import { patientService, TeleconsultationItem, AppointmentItem } from '../../services/patient';

export default function PatientTeleconsultation() {
  const [nextTeleconsultation, setNextTeleconsultation] = useState<TeleconsultationItem | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeleconsultation = async () => {
      try {
        const [nextRes, upRes] = await Promise.allSettled([
          patientService.nextTeleconsultation(),
          patientService.upcomingAppointments(),
        ]);

        if (nextRes.status === 'fulfilled') setNextTeleconsultation(nextRes.value);
        if (upRes.status === 'fulfilled') {
          const videoAppts = (upRes.value || []).filter(a => a.type !== 'in-person');
          setUpcomingAppointments(videoAppts);
        }
      } catch (e) {
        console.warn('[PatientTeleconsultation] Erreur:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadTeleconsultation();
  }, []);

  const handleJoinCall = (meetLink?: string | null) => {
    if (meetLink) {
      Linking.openURL(meetLink).catch(() => {
        Alert.alert('Erreur', 'Impossible d’ouvrir le lien vidéo.');
      });
    } else {
      Alert.alert(
        'Salle d’attente',
        'Votre praticien n’a pas encore démarré la session. Vous serez notifié dès qu’il sera connecté.'
      );
    }
  };

  const activeMeeting = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Carte Salle de Téléconsultation */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Video size={28} color="#2563eb" />
          </View>
          <Text style={styles.mainTitle}>Salle de Consultation Virtuelle</Text>
          <Text style={styles.mainSubtitle}>
            Échangez en direct et en toute confidentialité avec votre médecin ou psychologue.
          </Text>

          {activeMeeting ? (
            <View style={styles.meetingCard}>
              <View style={styles.meetingHeader}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Séance programmée</Text>
                </View>
                <Text style={styles.meetingDate}>{activeMeeting.date || "Aujourd'hui"}</Text>
              </View>

              <Text style={styles.doctorName}>{activeMeeting.professional || 'Médecin Référent'}</Text>
              <Text style={styles.doctorSpecialty}>{activeMeeting.specialty || 'Santé mentale'}</Text>

              <View style={styles.timeRow}>
                <Clock size={15} color="#2563eb" style={{ marginRight: 6 }} />
                <Text style={styles.timeText}>Horaire : {activeMeeting.time || '10:00'} (45 min)</Text>
              </View>

              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => handleJoinCall(activeMeeting.meetLink)}
                activeOpacity={0.85}
              >
                <Video size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.startBtnText}>Entrer dans la consultation</Text>
                <ExternalLink size={16} color="#ffffff" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noMeetingBox}>
              <CheckCircle2 size={32} color="#00A651" style={{ marginBottom: 8 }} />
              <Text style={styles.noMeetingTitle}>Aucune séance immédiate</Text>
              <Text style={styles.noMeetingSub}>
                Votre prochain créneau de téléconsultation s'affichera ici dès validation par votre praticien.
              </Text>
            </View>
          )}
        </View>

        {/* 2. Conseils pour une consultation réussie */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Sparkles size={18} color="#00A651" />
            <Text style={styles.sectionTitle}>Recommandations pour la séance</Text>
          </View>

          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Headphones size={18} color="#2563eb" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Lieu calme & écouteurs</Text>
              <Text style={styles.tipSub}>
                Installez-vous dans un endroit discret où vous êtes libre de vous exprimer sereinement.
              </Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Wifi size={18} color="#00A651" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Connexion Internet stable</Text>
              <Text style={styles.tipSub}>
                Privilégiez une connexion Wi-Fi ou une couverture 4G/5G pour une bonne fluidité audio et vidéo.
              </Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <ShieldCheck size={18} color="#7c3aed" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Confidentialité médicale garantie</Text>
              <Text style={styles.tipSub}>
                Toutes les téléconsultations sont chiffrées de bout en bout et conformes au secret médical.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  meetingCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Montserrat_700Bold',
  },
  meetingDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeText: {
    fontSize: 12.5,
    color: '#2563eb',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  noMeetingBox: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  noMeetingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  noMeetingSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  tipSub: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
    fontFamily: 'Montserrat_400Regular',
  },
});
