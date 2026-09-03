import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import {
  LayoutDashboard,
  AlertTriangle,
  TrendingUp,
  Compass,
  BarChart3,
  User,
  Menu,
} from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function ProgramAgentLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} profileRoute="/(program-agent)/profile" />
      )}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.headerBg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={{ marginLeft: 16 }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu color="#00A651" size={24} />
          </TouchableOpacity>
        ),
        headerTintColor: '#00A651',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          fontFamily: 'Montserrat_700Bold',
          color: colors.headerText,
        },
        drawerActiveTintColor: '#00A651',
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
          marginLeft: -10,
          fontFamily: 'Montserrat_500Medium',
        },
        drawerStyle: {
          width: '82%',
          maxWidth: 320,
          backgroundColor: colors.card,
        },
        sceneContainerStyle: {
          backgroundColor: colors.bgSecondary,
        },
      })}
    >
      {/* 1. Vue Nationale Macro */}
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Vue Nationale',
          drawerIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />

      {/* 2. Alertes & Priorités */}
      <Drawer.Screen
        name="alerts"
        options={{
          title: 'Alertes & Priorités',
          drawerIcon: ({ color, size }) => <AlertTriangle size={size} color={color} />,
        }}
      />

      {/* 3. Performance des Centres */}
      <Drawer.Screen
        name="centers-perf"
        options={{
          title: 'Performance Centres',
          drawerIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      />

      {/* 4. Parcours Patient 360° */}
      <Drawer.Screen
        name="pathway-360"
        options={{
          title: 'Parcours Patient 360°',
          drawerIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />

      {/* 5. Résultats Cliniques */}
      <Drawer.Screen
        name="results"
        options={{
          title: 'Résultats Cliniques',
          drawerIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />

      {/* 6. Profil PNSM (masqué du drawer principal) */}
      <Drawer.Screen
        name="profile"
        options={{
          title: 'Mon Profil PNSM',
          drawerIcon: ({ color, size }) => <User size={size} color={color} />,
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}
