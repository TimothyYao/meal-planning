/**
 * NOTE: Using React Navigation 7.0.0 due to compatibility issues with React 19.
 * 
 * React Navigation 7.1.27+ and 7.9.1+ have a known bug with React 19.1.0:
 * https://github.com/react-navigation/react-navigation/issues/12921
 * 
 * Error: "TypeError: expected dynamic type 'boolean', but had type 'string'"
 * 
 * React Navigation 7.0.0 is being used as a workaround. If issues persist,
 * consider:
 * - Using React Navigation 8 alpha (requires dev build, not Expo Go)
 * - Waiting for React Navigation 8 stable release
 * - Using a custom tab navigation solution
 */

import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import AddFoodScreen from './screens/AddFoodScreen';
import ProfileScreen from './screens/ProfileScreen';
import FoodDetailScreen from './screens/FoodDetailScreen';
import EditFoodScreen from './screens/EditFoodScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Navigation ref to access root navigator
export const navigationRef = { current: null as NavigationContainerRef<any> | null };

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
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
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
            // Try multiple ways to navigate to AddFood modal
            const rootNavigation = navigation.getParent();
            if (rootNavigation) {
              (rootNavigation as any).navigate('AddFood');
            } else if (navigationRef.current) {
              navigationRef.current.navigate('AddFood' as never);
            } else {
              // Fallback: try navigating through the navigation state
              (navigation as any).navigate('AddFood');
            }
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

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={(ref) => {
            navigationRef.current = ref;
          }}
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
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
