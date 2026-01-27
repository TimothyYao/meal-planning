import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FoodItem, spacing, fontSize, fontColor, colors } from '@meal-planning/shared';
import { addFoodToDate, getRecentFoods } from '../storage';
import { safeGoBack } from '../utils/navigation';
import { searchUSDAFoods, convertUSDAToFoodItem, isUSDAAvailable } from '../utils/usdaApi';
import { getCachedSearch, cacheSearch } from '../utils/usdaCache';
import { searchAndConvertOFFProducts } from '../utils/offApi';
import { getCachedOFFSearch, cacheOFFSearch } from '../utils/offCache';

interface SearchSection {
  title: string;
  data: FoodItem[];
  type: 'history' | 'usda' | 'off';
}

export default function SearchFoodScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFoods, setHistoryFoods] = useState<FoodItem[]>([]);
  const [filteredHistoryFoods, setFilteredHistoryFoods] = useState<FoodItem[]>([]);
  const [usdaFoods, setUsdaFoods] = useState<FoodItem[]>([]);
  const [offFoods, setOffFoods] = useState<FoodItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingUSDA, setLoadingUSDA] = useState(false);
  const [loadingOFF, setLoadingOFF] = useState(false);
  const [usdaError, setUsdaError] = useState<string | null>(null);
  const [offError, setOffError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Autofocus the input when screen loads
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadHistoryFoods();
  }, []);

  const searchUSDA = useCallback(async () => {
    if (searchQuery.trim().length < 2) {
      setUsdaFoods([]);
      setLoadingUSDA(false);
      return;
    }

    try {
      setLoadingUSDA(true);
      setUsdaError(null);
      console.log('Searching USDA for:', searchQuery);
      
      // Check cache first
      const cachedResults = await getCachedSearch(searchQuery);
      
      if (cachedResults && cachedResults.length > 0) {
        console.log('Using cached USDA results:', cachedResults.length, 'foods');
        setUsdaFoods(cachedResults);
        setLoadingUSDA(false);
        return;
      }
      
      // If not in cache, fetch from API
      const response = await searchUSDAFoods(searchQuery, 1, 20);
      console.log('USDA search returned', response.foods?.length || 0, 'foods');
      
      // Convert foods asynchronously (some may need detailed fetch)
      const conversionPromises = response.foods.map(convertUSDAToFoodItem);
      const convertedFoods = await Promise.all(conversionPromises);
      const validFoods = convertedFoods.filter((food): food is FoodItem => food !== null);
      
      console.log('Successfully converted', validFoods.length, 'USDA foods');
      
      // Cache the results
      if (validFoods.length > 0) {
        await cacheSearch(searchQuery, validFoods, response.totalHits || validFoods.length);
      }
      
      setUsdaFoods(validFoods);
    } catch (error: any) {
      console.error('Error searching USDA:', error);
      const errorMessage = error.message || 'Failed to search USDA database';
      // Don't show error if API key is not configured (it's optional)
      if (errorMessage.includes('API key not configured')) {
        setUsdaFoods([]);
        setUsdaError(null);
      } else {
        console.error('USDA search error details:', errorMessage);
        setUsdaError(errorMessage);
        setUsdaFoods([]);
      }
    } finally {
      setLoadingUSDA(false);
    }
  }, [searchQuery]);

  const searchOFF = useCallback(async () => {
    if (searchQuery.trim().length < 2) {
      setOffFoods([]);
      setLoadingOFF(false);
      return;
    }

    try {
      setLoadingOFF(true);
      setOffError(null);
      console.log('Searching Open Food Facts for:', searchQuery);
      
      // Check cache first
      const cachedResults = await getCachedOFFSearch(searchQuery);
      
      if (cachedResults && cachedResults.length > 0) {
        console.log('Using cached Open Food Facts results:', cachedResults.length, 'foods');
        setOffFoods(cachedResults);
        setLoadingOFF(false);
        return;
      }
      
      // If not in cache, fetch from API
      const foods = await searchAndConvertOFFProducts(searchQuery, 1, 20);
      console.log('Open Food Facts search returned', foods.length, 'foods');
      
      // Cache the results
      if (foods.length > 0) {
        await cacheOFFSearch(searchQuery, foods, foods.length);
      }
      
      setOffFoods(foods);
    } catch (error: any) {
      console.error('Error searching Open Food Facts:', error);
      const errorMessage = error.message || 'Failed to search Open Food Facts database';
      setOffError(errorMessage);
      setOffFoods([]);
    } finally {
      setLoadingOFF(false);
    }
  }, [searchQuery]);

  // Debounced USDA search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim() === '') {
      setFilteredHistoryFoods(historyFoods);
      setUsdaFoods([]);
      setOffFoods([]);
      setUsdaError(null);
      setOffError(null);
      return;
    }

    // Filter history foods
    const query = searchQuery.toLowerCase();
    const filtered = historyFoods.filter(
      (food) =>
        food.name.toLowerCase().includes(query) ||
        (food.brand && food.brand.toLowerCase().includes(query))
    );
    setFilteredHistoryFoods(filtered);

    // Debounce searches (wait 500ms after user stops typing)
    // Search both USDA and Open Food Facts
    if (isUSDAAvailable()) {
      setLoadingUSDA(true);
      setUsdaError(null);
    }
    setLoadingOFF(true);
    setOffError(null);
    
    searchTimeoutRef.current = setTimeout(() => {
      if (isUSDAAvailable()) {
        searchUSDA();
      } else {
        setUsdaFoods([]);
        setUsdaError(null);
        setLoadingUSDA(false);
      }
      // Open Food Facts is always available (no API key needed)
      searchOFF();
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, historyFoods, searchUSDA, searchOFF]);

  const loadHistoryFoods = async () => {
    try {
      setLoadingHistory(true);
      // Get recent foods from log entries (no separate food database)
      const recentFoods = await getRecentFoods(50);
      const foods = recentFoods.map(rf => rf.food);
      setHistoryFoods(foods);
      setFilteredHistoryFoods(foods);
    } catch (error) {
      console.error('Error loading foods:', error);
    } finally {
      setLoadingHistory(false);
    }
  };


  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleFoodSelect = async (food: FoodItem) => {
    try {
      // Add directly to today's log (food data is embedded in the log entry)
      const today = new Date();
      const dateString = formatDateString(today);
      await addFoodToDate(food, 1, dateString);
      Alert.alert('Success', `Added ${food.name} to today's log`, [
        {
          text: 'OK',
          onPress: () => {
            safeGoBack(navigation);
          },
        },
      ]);
    } catch (error) {
      console.error('Error adding food:', error);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    }
  };

  const getSections = (): SearchSection[] => {
    const sections: SearchSection[] = [];
    
    if (filteredHistoryFoods.length > 0) {
      sections.push({
        title: 'History',
        data: filteredHistoryFoods,
        type: 'history',
      });
    }
    
    if (usdaFoods.length > 0) {
      sections.push({
        title: 'USDA Database',
        data: usdaFoods,
        type: 'usda',
      });
    }
    
    if (offFoods.length > 0) {
      sections.push({
        title: 'Open Food Facts',
        data: offFoods,
        type: 'off',
      });
    }
    
    return sections;
  };

  const renderFoodItem = ({ item, section }: { item: FoodItem; section: SearchSection }) => {
    return (
      <View style={styles.foodItem}>
        <TouchableOpacity
          style={styles.foodItemContent}
          onPress={() => handleFoodSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.foodContent}>
            <Text style={styles.foodName}>{item.name}</Text>
            {item.brand && <Text style={styles.foodBrand}>{item.brand}</Text>}
            <Text style={styles.foodMacros}>
              {item.macros.calories} cal • {item.macros.protein}g protein • {item.macros.carbs}g carbs • {item.macros.fat}g fat
            </Text>
            {section.type === 'usda' && (
              <Text style={styles.usdaLabel}>USDA • 100g serving</Text>
            )}
            {section.type === 'off' && (
              <Text style={styles.offLabel}>Open Food Facts • 100g serving</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.foodActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleFoodSelect(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: SearchSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.type === 'usda' && loadingUSDA && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.sectionLoader} />
      )}
      {section.type === 'off' && loadingOFF && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.sectionLoader} />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(navigation)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={fontColor.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Search Foods</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={fontColor.tertiary} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search foods..."
          placeholderTextColor={fontColor.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus={true}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={fontColor.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {loadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {getSections().length === 0 && !loadingUSDA ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={fontColor.tertiary} />
              <Text style={styles.emptyText}>
                {searchQuery.trim() === '' ? 'No foods found' : 'No results found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim() === ''
                  ? 'Start by creating a custom food or search the databases'
                  : (usdaError || offError)
                  ? (usdaError || offError)
                  : `Try searching for "${searchQuery}"`}
              </Text>
            </View>
          ) : (
            <SectionList
              sections={getSections()}
              renderItem={renderFoodItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              ListFooterComponent={
                (loadingUSDA || loadingOFF) ? (
                  <View style={styles.usdaLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.usdaLoadingText}>
                      {loadingUSDA && loadingOFF 
                        ? 'Searching databases...' 
                        : loadingUSDA 
                        ? 'Searching USDA database...' 
                        : 'Searching Open Food Facts...'}
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: fontColor.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: fontColor.primary,
    paddingVertical: spacing.md,
  },
  clearButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: fontColor.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.base,
    color: fontColor.tertiary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  foodItemContent: {
    flex: 1,
  },
  foodContent: {
    flex: 1,
  },
  foodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: 8,
  },
  foodName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: fontColor.primary,
    marginBottom: 2,
  },
  foodBrand: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    marginBottom: 4,
  },
  foodMacros: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
  },
  usdaLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  offLabel: {
    fontSize: fontSize.xs,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: fontColor.primary,
  },
  sectionLoader: {
    marginLeft: spacing.sm,
  },
  usdaLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  usdaLoadingText: {
    fontSize: fontSize.sm,
    color: fontColor.tertiary,
    marginLeft: spacing.sm,
  },
});
