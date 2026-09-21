import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from './Text';
import { Building, Search, X, Check, Edit3 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { AgentCentre } from '../services/agent';
import { referentialCache } from '../services/referentialCache';
import { useTheme } from '../context/ThemeContext';

export interface CentreSelectorProps {
  selectedCentreId?: number | null;
  selectedCentreName?: string | null;
  onSelect: (centre: AgentCentre) => void;
  label?: string;
  placeholder?: string;
  initialOpen?: boolean;
}

const CARE_LEVEL_CONFIG: Record<string, { bg: string; border: string; text: string; darkBg: string; darkText: string }> = {
  ESPC: { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', darkBg: '#064e3b', darkText: '#6ee7b7' },
  HG: { bg: '#f0f9ff', border: '#bae6fd', text: '#0284c7', darkBg: '#082f49', darkText: '#7dd3fc' },
  CHR: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', darkBg: '#451a03', darkText: '#fcd34d' },
  CHU: { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed', darkBg: '#2e1065', darkText: '#c4b5fd' },
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function CareLevelBadge({ careLevel }: { careLevel?: string | null }) {
  const { isDark } = useTheme();
  if (!careLevel) return null;
  const upper = careLevel.toUpperCase();
  const cfg = CARE_LEVEL_CONFIG[upper] || {
    bg: '#f1f5f9',
    border: '#cbd5e1',
    text: '#475569',
    darkBg: '#1e293b',
    darkText: '#94a3b8',
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isDark ? cfg.darkBg : cfg.bg,
          borderColor: isDark ? cfg.darkText : cfg.border,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: isDark ? cfg.darkText : cfg.text },
        ]}
      >
        {upper}
      </Text>
    </View>
  );
}

export function CentreSelector({
  selectedCentreId,
  selectedCentreName,
  onSelect,
  label = 'Centre de Rattachement',
  placeholder = 'Rechercher un centre (ex: Treichville, Cocody, CHU...)',
  initialOpen = false,
}: CentreSelectorProps) {
  const { colors, isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(initialOpen || (!selectedCentreId && !selectedCentreName));

  const { data: centres = [], isLoading } = useQuery<AgentCentre[]>({
    queryKey: ['agent_centres_list'],
    queryFn: () => referentialCache.getCentres(),
  });

  const selectedCentre = useMemo(() => {
    if (selectedCentreId) {
      const match = centres.find((c) => c.id === selectedCentreId);
      if (match) return match;
    }
    if (selectedCentreName) {
      const match = centres.find(
        (c) => c.name.toLowerCase().trim() === selectedCentreName.toLowerCase().trim()
      );
      if (match) return match;
    }
    return null;
  }, [centres, selectedCentreId, selectedCentreName]);

  const filteredCentres = useMemo(() => {
    const q = normalizeText(search.trim());
    if (!q) return centres;
    return centres.filter(
      (c) =>
        normalizeText(c.name).includes(q) ||
        (c.careLevel && normalizeText(c.careLevel).includes(q)) ||
        (c.description && normalizeText(c.description).includes(q))
    );
  }, [centres, search]);

  const handleSelect = (centre: AgentCentre) => {
    onSelect(centre);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.container}>
      {/* Selected Centre View (when closed) */}
      {!isOpen && (selectedCentre || selectedCentreName) ? (
        <View
          style={[
            styles.selectedCard,
            {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
            },
          ]}
        >
          <View style={styles.selectedLeft}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' },
              ]}
            >
              <Building size={20} color="#00A651" />
            </View>
            <View style={styles.selectedInfo}>
              <View style={styles.nameRow}>
                <Text
                  style={[
                    styles.selectedName,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {selectedCentre?.name || selectedCentreName}
                </Text>
                {selectedCentre?.careLevel && (
                  <CareLevelBadge careLevel={selectedCentre.careLevel} />
                )}
              </View>
              <Text
                style={[
                  styles.selectedSub,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {selectedCentre?.description || 'Centre de santé sélectionné'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.editButton,
              {
                backgroundColor: isDark ? '#334155' : '#f1f5f9',
                borderColor: isDark ? '#475569' : '#cbd5e1',
              },
            ]}
            onPress={() => setIsOpen(true)}
            activeOpacity={0.7}
          >
            <Edit3 size={14} color={isDark ? '#cbd5e1' : '#475569'} style={{ marginRight: 4 }} />
            <Text
              style={[
                styles.editButtonText,
                { color: isDark ? '#cbd5e1' : '#475569' },
              ]}
            >
              Modifier
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Search Box & List (when open or nothing selected) */
        <View
          style={[
            styles.searchCard,
            {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
            },
          ]}
        >
          <View
            style={[
              styles.searchInputWrap,
              {
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderColor: isDark ? '#334155' : '#cbd5e1',
              },
            ]}
          >
            <Search size={18} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={placeholder}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={search}
              onChangeText={setSearch}
              autoFocus={isOpen && !!(selectedCentre || selectedCentreName)}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results count & collapse button if a centre was already selected */}
          <View style={styles.listHeaderRow}>
            <Text style={[styles.listHeaderCount, { color: colors.textSecondary }]}>
              {filteredCentres.length} centre{filteredCentres.length > 1 ? 's' : ''} disponible{filteredCentres.length > 1 ? 's' : ''}
            </Text>
            {(selectedCentre || selectedCentreName) && (
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={styles.cancelText}>Fermer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Centres Scroll View */}
          <ScrollView
            style={styles.resultsScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#00A651" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Chargement des centres...
                </Text>
              </View>
            ) : filteredCentres.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun centre trouvé pour "{search}".
                </Text>
              </View>
            ) : (
              filteredCentres.map((c) => {
                const isSelected =
                  (selectedCentreId != null && c.id === selectedCentreId) ||
                  (selectedCentreName != null &&
                    c.name.toLowerCase().trim() === selectedCentreName.toLowerCase().trim());

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.centreRow,
                      { borderBottomColor: isDark ? '#334155' : '#f1f5f9' },
                      isSelected && {
                        backgroundColor: isDark ? '#064e3b33' : '#f0fdf4',
                      },
                    ]}
                    onPress={() => handleSelect(c)}
                    activeOpacity={0.7}
                  >
                    <Building
                      size={18}
                      color={isSelected ? '#00A651' : isDark ? '#64748b' : '#94a3b8'}
                      style={{ marginRight: 10 }}
                    />
                    <View style={styles.centreRowText}>
                      <View style={styles.centreRowHeader}>
                        <Text
                          style={[
                            styles.centreRowName,
                            { color: isSelected ? '#00A651' : colors.text },
                            isSelected && { fontWeight: '700' },
                          ]}
                          numberOfLines={1}
                        >
                          {c.name}
                        </Text>
                        {c.careLevel && <CareLevelBadge careLevel={c.careLevel} />}
                      </View>
                      {!!c.description && (
                        <Text
                          style={[styles.centreRowDesc, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {c.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={styles.checkWrap}>
                        <Check size={16} color="#00A651" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  selectedSub: {
    fontSize: 12,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  listHeaderCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelText: {
    fontSize: 12,
    color: '#00A651',
    fontWeight: '600',
  },
  resultsScroll: {
    maxHeight: 220,
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  centreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  centreRowText: {
    flex: 1,
  },
  centreRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centreRowName: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  centreRowDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  checkWrap: {
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
