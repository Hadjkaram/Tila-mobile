import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LifeBuoy,
  Phone,
  PhoneCall,
  Clock,
  ShieldCheck,
  MessagesSquare,
  AlertTriangle,
  Send,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { patientSpaceService } from '../../services/patientSpace';
import { useTheme } from '../../context/ThemeContext';

export default function PatientAideScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [motif, setMotif] = useState('');
  const [telephone, setTelephone] = useState('');
  const [creneau, setCreneau] = useState('Immédiat');
  const [isUrgent, setIsUrgent] = useState(true);
  const [sendingCallback, setSendingCallback] = useState(false);

  const handleCall143 = () => {
    Linking.openURL('tel:143');
  };

  const handleRequestCallback = async () => {
    if (!telephone.trim()) {
      Alert.alert('Numéro requis', 'Veuillez renseigner votre numéro de téléphone pour être rappelé(e).');
      return;
    }
    setSendingCallback(true);
    try {
      await patientSpaceService.createCallback({
        motif: motif.trim() || 'Besoin d’écoute ou d’assistance',
        telephone: telephone.trim(),
        creneau,
        urgence: isUrgent,
      });
      setMotif('');
      setTelephone('');
      Alert.alert(
        'Demande envoyée',
        'Votre demande a été prise en compte. Un professionnel du PNSM ou un écoutant vous rappellera rapidement.'
      );
    } catch {
      Alert.alert('Erreur', 'Impossible d’enregistrer la demande de rappel.');
    } finally {
      setSendingCallback(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bannière d'urgence 143 */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={handleCall143}
          activeOpacity={0.9}
        >
          <View style={styles.emergencyIconWrap}>
            <Phone size={24} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Besoin d'aide maintenant ?</Text>
            <Text style={styles.emergencySub}>
              Appelez le 143 — Numéro vert national gratuit, anonyme & confidentiel 24h/24.
            </Text>
            <View style={styles.callBadge}>
              <PhoneCall size={14} color="#dc2626" style={{ marginRight: 6 }} />
              <Text style={styles.callBadgeText}>Appeler le 143 gratuitement</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quand appeler le 143 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <ShieldCheck size={18} color="#00A651" style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Quand contacter le 143 ?</Text>
          </View>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Si vous ou l'un de vos proches ressentez une détresse psychologique intense, de l'anxiété aiguë, des pensées sombres ou un besoin urgent d'écoute bienveillante, les équipes d'écoutants et spécialistes formés sont à votre disposition à tout moment.
          </Text>
        </View>

        {/* Formulaire de demande de rappel discret */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Clock size={18} color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Demander à être rappelé(e)</Text>
          </View>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Vous préférez qu'un professionnel de santé mentale vous appelle ? Laissez vos coordonnées ci-dessous.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Votre numéro de téléphone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text }]}
              value={telephone}
              onChangeText={setTelephone}
              placeholder="01 02 03 04 05"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Motif ou message (optionnel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.bgSecondary : '#f8fafc', borderColor: colors.border, color: colors.text, height: 70, textAlignVertical: 'top' }]}
              value={motif}
              onChangeText={setMotif}
              placeholder="Décrivez brièvement la situation..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.callbackBtn, sendingCallback && { opacity: 0.6 }]}
            onPress={handleRequestCallback}
            disabled={sendingCallback}
            activeOpacity={0.85}
          >
            {sendingCallback ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Send size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.callbackBtnText}>Envoyer la demande de rappel</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Raccourci Forum */}
        <TouchableOpacity
          style={[styles.forumShortcut, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(patient)/forum')}
          activeOpacity={0.8}
        >
          <View style={styles.forumIconWrap}>
            <MessagesSquare size={22} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.forumTitle, { color: colors.text }]}>Parler à la communauté</Text>
            <Text style={[styles.forumSub, { color: colors.textSecondary }]}>
              Échangez anonymement dans les groupes de parole modérés par des professionnels.
            </Text>
          </View>
        </TouchableOpacity>
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
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
  },
  emergencySub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 3,
  },
  callBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  callBadgeText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  formGroup: {
    marginTop: 10,
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
  callbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A651',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  callbackBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  forumShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  forumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forumTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  forumSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
