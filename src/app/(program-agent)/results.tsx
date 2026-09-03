import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BarChart3,
  Search,
  Filter,
  Calendar,
  Building2,
  FileCheck2,
  X,
  Sparkles,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { programAgentService } from '../../services/programAgent';

type QuestionnaireFilter = 'ALL' | 'ODS' | 'PCL-5' | 'GAD-7' | 'PHQ-9' | 'SDQ';

export default function ClinicalResultsScreen() {
  const { colors, isDark } = useTheme();
  const [selectedTool, setSelectedTool] = useState<QuestionnaireFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: evaluations,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['program-evaluations-results', selectedTool],
    queryFn: () => programAgentService.getEvaluationsResults({ questionnaire: selectedTool }),
  });

  const filteredItems = useMemo(() => {
    let list = evaluations || [];
    if (selectedTool !== 'ALL') {
      list = list.filter((e) => e.questionnaire === selectedTool);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.patientCode.toLowerCase().includes(q) ||
          e.centre.toLowerCase().includes(q) ||
          e.severity.toLowerCase().includes(q)
      );
    }
    return list;
  }, [evaluations, selectedTool, searchQuery]);

  const getSeverityStyle = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes('sévère') || s.includes('positif') || s.includes('élevé')) {
      return { bg: '#fef2f2', text: '#ef4444' };
    }
    if (s.includes('modér') || s.includes('moyen')) {
      return { bg: '#fff7ed', text: '#ea580c' };
    }
    return { bg: '#ecfdf5', text: '#00A651' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const sStyle = getSeverityStyle(item.severity);

    return (
      <View
        style={[
          styles.evalCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.toolBadge}>
            <Text style={styles.toolBadgeText}>{item.questionnaire}</Text>
          </View>
          <Text style={[styles.patientCode, { color: colors.text }]}>{item.patientCode}</Text>
          <View style={[styles.severityPill, { backgroundColor: sStyle.bg }]}>
            <Text style={[styles.severityPillText, { color: sStyle.text }]}>
              {item.severity}
            </Text>
          </View>
        </View>

        <Text style={[styles.toolTitle, { color: colors.textSecondary }]}>
          {item.questionnaireTitle}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Building2 size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.centre}</Text>
          </View>
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.date}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.scoreText, { color: colors.text }]}>
            Score obtenu : <Text style={{ fontWeight: '700', color: sStyle.text }}>{item.score}</Text>
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{item.statut}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}>
      {/* Barre de recherche */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher par patient, centre, sévérité..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres par Questionnaire */}
      <View style={styles.filtersScroll}>
        {(['ALL', 'ODS', 'PCL-5', 'GAD-7', 'PHQ-9', 'SDQ'] as const).map((tool) => {
          const isSelected = selectedTool === tool;
          return (
            <TouchableOpacity
              key={tool}
              style={[
                styles.toolTab,
                {
                  backgroundColor: isSelected ? '#4f46e5' : colors.card,
                  borderColor: isSelected ? '#4f46e5' : colors.border,
                },
              ]}
              onPress={() => setSelectedTool(tool)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toolTabText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {tool === 'ALL' ? 'Tous' : tool}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Liste des résultats */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={['#4f46e5']}
              tintColor="#4f46e5"
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <BarChart3 size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun résultat</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  filtersScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toolTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  toolTabText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  toolBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toolBadgeText: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  patientCode: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    flex: 1,
    marginHorizontal: 8,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  toolTitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  scoreText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  statusPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
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
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
