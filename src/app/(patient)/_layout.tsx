import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import {
  Home,
  Calendar,
  PhoneCall,
  ClipboardList,
  FileText,
  FileCheck,
  Building2,
  Menu,
} from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function PatientLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} profileRoute="/(patient)/profile" />
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
          fontSize: 15,
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
      {/* 1. Accueil */}
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          drawerIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />

      {/* 2. Mes Rendez-vous */}
      <Drawer.Screen
        name="appointments"
        options={{
          title: 'Mes Rendez-vous',
          drawerIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />

      {/* 3. Téléconsultation */}
      <Drawer.Screen
        name="teleconsultation"
        options={{
          title: 'Téléconsultation',
          drawerIcon: ({ color, size }) => <PhoneCall size={size} color={color} />,
        }}
      />

      {/* 4. Mes Évaluations */}
      <Drawer.Screen
        name="evaluations"
        options={{
          title: 'Mes Évaluations',
          drawerIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />

      {/* 5. Mon Dossier Médical */}
      <Drawer.Screen
        name="dossier"
        options={{
          title: 'Mon Dossier Médical',
          drawerIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />

      {/* 6. Mes Ordonnances */}
      <Drawer.Screen
        name="prescriptions"
        options={{
          title: 'Mes Ordonnances',
          drawerIcon: ({ color, size }) => <FileCheck size={size} color={color} />,
        }}
      />

      {/* 7. Annuaire & Centres */}
      <Drawer.Screen
        name="directory"
        options={{
          title: 'Annuaire & Centres',
          drawerIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />

      {/* Profil masqué de la liste des items du Drawer (accessible via l'en-tête utilisateur du Drawer) */}
      <Drawer.Screen
        name="profile"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Drawer>
  );
}
