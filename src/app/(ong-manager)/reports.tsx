import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText,
  Share2,
  Download,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { ongService, OngReportItem } from '../../services/ong';

export default function OngReportsScreen() {
  const { colors, isDark } = useTheme();

  const {
    data: reportData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['ong-activity-report'],
    queryFn: () => ongService.getReport(),
  });

  const handleShare = async () => {
    if (!reportData) return;
    try {
      const summaryText = `Rapport d'activité TILA (${reportData.period})
Recensés : ${reportData.totals.recenses}
Sensibilisés : ${reportData.totals.sensibilises}
Orientés vers les centres : ${reportData.totals.orientes}
Pris en charge / Traités : ${reportData.totals.traites}
Dépistages cliniques : ${reportData.totals.depistages}
Téléconsultations : ${reportData.totals.teleconsultations}
Agents mobilisés : ${reportData.totals.agents}`;

      await Share.share({
        message: summaryText,
        title: `Rapport d'activité ${reportData.period}`,
      });
    } catch (e) {
      console.warn('Erreur lors du partage:', e);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={['#00A651']}
            tintColor="#00A651"
          />
        }
      >
        {/* Header Carte Rapport */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitles}>
              <Text style={[styles.headerPeriod, { color: colors.textSecondary }]}>
                Période d'activité
              </Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {reportData?.period || 'Ce trimestre (T3)'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Share2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.shareBtnText}>Partager</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.genText, { color: colors.textMuted }]}>
            Généré automatiquement par la plateforme TILA le {format(new Date(), 'dd/MM/yyyy à HH:mm')}
          </Text>
        </View>

        {/* Totaux Consolidation */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bilan Global Consolidé
        </Text>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.kpiNumber, { color: colors.text }]}>
              {reportData?.totals.recenses ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Personnes Recensées
            </Text>
          </View>

          <View style={[styles.kpiBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.kpiNumber, { color: '#00A651' }]}>
              {reportData?.totals.sensibilises ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Sensibilisées
            </Text>
          </View>

          <View style={[styles.kpiBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.kpiNumber, { color: '#2563eb' }]}>
              {reportData?.totals.orientes ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Orientées Centre
            </Text>
          </View>

          <View style={[styles.kpiBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.kpiNumber, { color: '#7c3aed' }]}>
              {reportData?.totals.teleconsultations ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              Téléconsultations
            </Text>
          </View>
        </View>

        {/* Ventilation par Centre Partenaire */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10 }]}>
          Détail par Centre Partenaire
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00A651" />
          </View>
        ) : (
          <View style={styles.rowsList}>
            {(reportData?.rows || []).map((row: OngReportItem, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.centerRowCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.rowHeader}>
                  <Building2 size={16} color="#00A651" style={{ marginRight: 6 }} />
                  <Text style={[styles.centerName, { color: colors.text }]} numberOfLines={1}>
                    {row.centreName}
                  </Text>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricVal, { color: colors.text }]}>{row.recenses}</Text>
                    <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Recensés</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricVal, { color: '#00A651' }]}>{row.sensibilises}</Text>
                    <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Sensibilisés</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricVal, { color: '#2563eb' }]}>{row.orientes}</Text>
                    <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Orientés</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricVal, { color: '#ea580c' }]}>{row.depistages}</Text>
                    <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Dépistages</Text>
                  </View>
                </View>
              </View>
            ))}
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
  headerCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitles: {
    flex: 1,
  },
  headerPeriod: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A651',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  genText: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiBox: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  rowsList: {
    gap: 10,
  },
  centerRowCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  centerName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  metricLbl: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
  },
});
