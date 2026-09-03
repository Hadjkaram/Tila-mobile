import { Drawer } from 'expo-router/drawer';
import { TouchableOpacity } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { LayoutDashboard, ClipboardList, UserCheck, ArrowRightLeft, Menu, ArrowLeft } from 'lucide-react-native';
import { CustomDrawerContent } from '../../components/navigation/CustomDrawerContent';
import { useTheme } from '../../context/ThemeContext';

export default function HealthAgentLayout() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Drawer
      initialRouteName="dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} profileRoute="/(health-agent)/profile" />}
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
        name="assessments/index"
        options={{
          title: 'Dépistages ODS',
          drawerIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="received/index"
        options={{
          title: 'Patients Reçus',
          drawerIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="referrals/index"
        options={{
          title: 'Orientations',
          drawerIcon: ({ color, size }) => <ArrowRightLeft size={size} color={color} />,
        }}
      />

      {/* Sub-routes masquées du Drawer */}
      <Drawer.Screen
        name="assessments/new"
        options={{
          drawerItemStyle: { display: 'none' },
          title: 'Nouveau Dépistage',
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
        name="assessments/run"
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
    </Drawer>
  );
}
