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

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import AddFoodScreen from './screens/AddFoodScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => (
                <Ionicons name="home" size={24} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="AddFood"
            component={AddFoodScreen}
            options={{
              title: 'Add Food',
              tabBarIcon: ({ color }) => (
                <Ionicons name="add-circle" size={24} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
