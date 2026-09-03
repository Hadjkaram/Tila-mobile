import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import {
  LayoutDashboard,
  Users,
  Calendar,
  PhoneCall,
  Menu,
  MessagesSquare,
  Inbox,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function ProLayout() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => (
        <CustomDrawerContent {...props} profileRoute="/(specialist)/profile" />
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
      {/* Écrans principaux avec Menu Burger */}
      <Drawer.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          drawerIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="calendar"
        options={{
          title: 'Mon Agenda',
          drawerIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="teleconsultation"
        options={{
          title: 'Téléconsultation',
          drawerIcon: ({ color, size }) => <PhoneCall size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="evaluations/index"
        options={{
          title: "Outils d'évaluation",
          drawerIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="referrals"
        options={{
          title: 'Cas Référés',
          drawerIcon: ({ color, size }) => <Inbox size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="patients"
        options={{
          title: 'Mes Patients',
          drawerIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="forum"
        options={{
          title: 'Forum',
          drawerIcon: ({ color, size }) => <MessagesSquare size={size} color={color} />,
        }}
      />

      {/* Sub-routes masquées du Drawer avec flèches de retour vers l'écran précédent */}
      <Drawer.Screen
        name="evaluations/new"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="evaluations/run"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="patients/[id]"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="referrals/agents"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Référés Agents',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
              activeOpacity={0.7}
            >
              <ArrowLeft color="#00A651" size={24} />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen
        name="referrals/centers"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Référés Centres',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
              activeOpacity={0.7}
            >
              <ArrowLeft color="#00A651" size={24} />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen
        name="forum/[groupId]"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Discussion',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
              activeOpacity={0.7}
            >
              <ArrowLeft color="#00A651" size={24} />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen
        name="teleconsultation/[id]"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Consultation',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
              activeOpacity={0.7}
            >
              <ArrowLeft color="#00A651" size={24} />
            </TouchableOpacity>
          ),
        }}
      />
    </Drawer>
  );
}
