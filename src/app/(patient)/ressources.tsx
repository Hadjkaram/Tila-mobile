import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  FileText,
  Video,
  Headphones,
  Search,
  ExternalLink,
  Filter,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { patientSpaceService, PublicResource } from '../../services/patientSpace';

type ResourceKind = 'pdf' | 'video' | 'audio' | 'article';

function getResourceKind(item: PublicResource): ResourceKind {
  if (item.kind === 'video' || item.kind === 'audio' || item.kind === 'article' || item.kind === 'pdf') {
    return item.kind;
  }
  const mime = (item.mimeType || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'pdf';
}

const TYPE_CONFIG: Record<ResourceKind, { label: string; icon: any; color: string; bg: string }> = {
  pdf: { label: 'Document', icon: FileText, color: '#dc2626', bg: '#fee2e2' },
  video: { label: 'Vidéo', icon: Video, color: '#2563eb', bg: '#dbeafe' },
  audio: { label: 'Audio', icon: Headphones, color: '#7c3aed', bg: '#ede9fe' },
  article: { label: 'Article', icon: BookOpen, color: '#00A651', bg: '#dcfce7' },
};

const TABS: { id: 'all' | ResourceKind; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'pdf', label: 'Documents' },
  { id: 'video', label: 'Vidéos' },
  { id: 'audio', label: 'Audio' },
  { id: 'article', label: 'Articles' },
];

export default function PatientRessources() {
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<PublicResource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | ResourceKind>('all');

  const loadResources = useCallback(async () => {
    try {
      const res = await patientSpaceService.resources();
      setItems(res.items || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      // Fallback mock ressources certifiées PNSM en cas d'absence de doc serveur
      setItems([
        {
          id: 1,
          title: 'Guide de gestion du stress et de l\'anxiété',
          description: 'Techniques pratiques de respiration et de relaxation validées par le PNSM.',
          kind: 'pdf',
          url: 'https://pnsm.ci',
        },
        {
          id: 2,
          title: 'Comprendre et surmonter les épisodes dépressifs',
          description: 'Fiche d\'information pour reconnaître les signes avant-coureurs et demander de l\'aide.',
          kind: 'article',
          url: 'https://pnsm.ci',
        },
        {
          id: 3,
          title: 'Exercice guidé de cohérence cardiaque (5 minutes)',
          description: 'Séance audio guidée pour apaiser le rythme cardiaque et clarifier l\'esprit.',
          kind: 'audio',
          url: 'https://pnsm.ci',
        },
        {
          id: 4,
          title: 'La santé mentale sans tabou en Côte d\'Ivoire',
          description: 'Vidéo de sensibilisation sur la déstigmatisation et le soutien communautaire.',
          kind: 'video',
          url: 'https://pnsm.ci',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchText = !q || (item.title?.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q));
      const kind = getResourceKind(item);
      const matchTab = activeTab === 'all' || kind === activeTab;
      return matchText && matchTab;
    });
  }, [items, searchQuery, activeTab]);

  const handleOpenUrl = (url?: string | null) => {
    if (!url) {
      Alert.alert('Information', 'Aucun lien externe disponible pour cette ressource.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir ce lien sur votre appareil.');
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      {/* Search Header */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? colors.cardSecondary : '#f1f5f9' }]}>
          <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher une ressource, un guide..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Horizontal Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSelected
                      ? '#00A651'
                      : (isDark ? colors.cardSecondary : '#f1f5f9'),
                  },
                ]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      color: isSelected ? '#ffffff' : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadResources(); }} colors={['#00A651']} tintColor="#00A651" />}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#00A651" />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Chargement des ressources...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune ressource trouvée</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Essayez de modifier vos termes de recherche ou sélectionnez un autre filtre.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {filteredItems.map((item) => {
              const kind = getResourceKind(item);
              const conf = TYPE_CONFIG[kind];
              const IconComp = conf.icon;

              return (
                <View
                  key={item.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.kindIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : conf.bg }]}>
                      <IconComp size={20} color={conf.color} />
                    </View>
                    <View style={[styles.kindBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : conf.bg }]}>
                      <Text style={[styles.kindBadgeText, { color: conf.color }]}>
                        {conf.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                  {item.description ? (
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                      {item.description}
                    </Text>
                  ) : null}

                  {item.url && (
                    <TouchableOpacity
                      style={[styles.openBtn, { borderColor: colors.border }]}
                      onPress={() => handleOpenUrl(item.url)}
                      activeOpacity={0.7}
                    >
                      <ExternalLink size={15} color="#00A651" style={{ marginRight: 6 }} />
                      <Text style={styles.openBtnText}>Consulter la ressource</Text>
                    </TouchableOpacity>
                  )}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingTop: 10,
    gap: 8,
  },
  tabChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  tabChipText: {
    fontSize: 12.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  cardsList: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kindIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kindBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  openBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00A651',
  },
});
