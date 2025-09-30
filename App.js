import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';


import HomeScreen from './src/screens/Home';
import CompareScreen from './src/screens/Compare';
import UserScreen from './src/screens/User';
import AdminPanelScreen from './src/screens/AdminPanel';
import ProductDetailScreen from './src/screens/ProductDetail';


const Tab = createBottomTabNavigator();
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let name;
          if (route.name === 'หน้าแรก') {
            name = focused ? 'home' : 'home-outline';
          } else if (route.name === 'เปรียบเทียบ') {
            name = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
          } else if (route.name === 'ผู้ใช้') {
            name = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={name} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#111',
        tabBarInactiveTintColor: '#9ca3af',
      })}
    >
      <Tab.Screen name="หน้าแรก" component={HomeScreen} />
      <Tab.Screen name="เปรียบเทียบ" component={CompareScreen} />
      <Tab.Screen name="ผู้ใช้" component={UserScreen} />
    </Tab.Navigator>
  );
}


const Stack = createNativeStackNavigator();
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator>
          <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ title: 'Admin Panel' }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'รายละเอียดสินค้า' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider >
  );
}