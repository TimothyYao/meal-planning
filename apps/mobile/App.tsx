/**
 * NOTE: Using React Navigation 7.0.x with native@7.0.3 (override) for LinkingContext.
 * Root package.json overrides @react-navigation/native to 7.0.3 so bottom-tabs/elements
 * resolve to a single version and avoid "Couldn't find a LinkingContext context".
 *
 * React Navigation 7.1.27+ and 7.9.1+ have a known bug with React 19.1.0:
 * https://github.com/react-navigation/react-navigation/issues/12921
 * Error: "TypeError: expected dynamic type 'boolean', but had type 'string'"
 */

import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { colors } from '@meal-planning/shared';
import { AuthProvider } from './contexts/AuthContext';
import HomeScreen from './screens/HomeScreen';
import AddFoodScreen from './screens/AddFoodScreen';
import ProfileScreen from './screens/ProfileScreen';
import PhoneAuthScreen from './screens/PhoneAuthScreen';
import FoodDetailScreen from './screens/FoodDetailScreen';
import EditFoodScreen from './screens/EditFoodScreen';
import SearchFoodScreen from './screens/SearchFoodScreen';
import RecipeBuilderScreen from './screens/RecipeBuilderScreen';
import FloatingAddMenu from './components/FloatingAddMenu';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export const navigationRef = { current: null as NavigationContainerRef<any> | null };

// Global state for floating add menu
let setFloatingMenuVisible: ((visible: boolean) => void) | null = null;
export const showFloatingAddMenu = () => {
  if (setFloatingMenuVisible) {
    setFloatingMenuVisible(true);
  }
};
export const hideFloatingAddMenu = () => {
  if (setFloatingMenuVisible) {
    setFloatingMenuVisible(false);
  }
};

// Global refresh callback for HomeScreen
let refreshHomeScreen: (() => void) | null = null;
export const setRefreshHomeScreen = (callback: (() => void) | null) => {
  refreshHomeScreen = callback;
};
export const triggerHomeScreenRefresh = () => {
  if (refreshHomeScreen) {
    refreshHomeScreen();
  }
};

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FoodDetail"
        component={FoodDetailScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="EditFood"
        component={EditFoodScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipeBuilderScreen}
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => (
            <Ionicons name="restaurant" size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="AddFoodTab"
        component={HomeStack}
        options={{
          title: 'Add Food',
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle" size={24} color={color} />
          ),
          headerShown: false,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            showFloatingAddMenu();
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: [],
  config: {
    screens: {
      MainTabs: {
        path: '',
        screens: {
          Home: {
            path: 'home',
            screens: {
              HomeMain: '',
              FoodDetail: 'log-entry/:date/:mealId/:foodIndex',
              EditFood: {
                path: 'log-entry/:date/:mealId/:foodIndex/:foodId/edit',
                parse: {
                  date: (date: string) => date,
                  mealId: (mealId: string) => mealId,
                  foodIndex: (foodIndex: string) => parseInt(foodIndex, 10),
                  foodId: (foodId: string) => foodId,
                },
              },
            },
          },
          Recipes: 'recipes',
          AddFoodTab: 'add-food',
          Profile: 'profile',
        },
      },
      AddFood: 'add-food/custom',
      SearchFood: 'add-food/search',
      PhoneAuth: 'phone-auth',
    },
  },
};

export default function App() {
  const [floatingMenuVisible, setFloatingMenuVisibleState] = useState(false);
  
  // Set the global function to control menu visibility
  setFloatingMenuVisible = setFloatingMenuVisibleState;

  const handleCustomFood = () => {
    hideFloatingAddMenu();
    if (navigationRef.current) {
      navigationRef.current.navigate('AddFood' as never);
    }
  };

  const handleSearch = () => {
    hideFloatingAddMenu();
    if (navigationRef.current) {
      navigationRef.current.navigate('SearchFood' as never);
    }
  };

  const handleCreateRecipe = () => {
    hideFloatingAddMenu();
    if (navigationRef.current) {
      navigationRef.current.navigate('MainTabs' as never, { screen: 'Recipes' } as never);
    }
  };

  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer
            ref={(ref) => {
              navigationRef.current = ref;
            }}
            linking={linking}
          >
            <Stack.Navigator>
              <Stack.Screen
                name="MainTabs"
                component={TabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AddFood"
                component={AddFoodScreen}
                options={{
                  headerShown: false,
                  presentation: 'fullScreenModal',
                }}
              />
              <Stack.Screen
                name="SearchFood"
                component={SearchFoodScreen}
                options={{
                  headerShown: false,
                  presentation: 'fullScreenModal',
                }}
              />
              <Stack.Screen
                name="PhoneAuth"
                component={PhoneAuthScreen}
                options={{
                  title: 'Sign in with phone',
                  presentation: 'modal',
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <FloatingAddMenu
            visible={floatingMenuVisible}
            onClose={() => setFloatingMenuVisibleState(false)}
            onCustomFood={handleCustomFood}
            onSearch={handleSearch}
            onCreateRecipe={handleCreateRecipe}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
