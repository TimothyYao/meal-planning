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
import { AuthProvider } from './contexts/AuthContext';
import HomeScreen from './screens/HomeScreen';
import AddFoodScreen from './screens/AddFoodScreen';
import ProfileScreen from './screens/ProfileScreen';
import PhoneAuthScreen from './screens/PhoneAuthScreen';
import FoodDetailScreen from './screens/FoodDetailScreen';
import EditFoodScreen from './screens/EditFoodScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
            const root = navigation.getParent();
            if (root) (root as any).navigate('AddFood');
            else if (navigationRef.current)
              navigationRef.current.navigate('AddFood' as never);
            else (navigation as any).navigate('AddFood');
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
              FoodDetail: 'food/:foodId',
              EditFood: 'food/:foodId/edit',
            },
          },
          AddFoodTab: 'add-food',
          Profile: 'profile',
        },
      },
      AddFood: 'add-food',
      PhoneAuth: 'phone-auth',
    },
  },
};

export default function App() {
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
                name="PhoneAuth"
                component={PhoneAuthScreen}
                options={{
                  title: 'Sign in with phone',
                  presentation: 'modal',
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
