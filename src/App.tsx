import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  Factory, 
  ClipboardList, 
  GanttChartSquare, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Plus,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  LogIn
} from 'lucide-react';
import { cn } from './lib/utils';
import { auth, signIn, signOut } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

import { Dashboard } from './components/Dashboard';
import { Resources } from './components/Resources';
import { Orders } from './components/Orders';
import { Gantt } from './components/Gantt';
import { Analytics } from './components/Analytics';
import { Clients } from './components/Clients';
import { Settings as SettingsView } from './components/Settings';
import { initializeData } from './services/initData';

// Auth Context
interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  role: string;
  setRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  role: 'admin',
  setRole: () => {} 
});

export const useAuth = () => useContext(AuthContext);

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen p-8 bg-red-50 text-red-900">
          <h2 className="text-2xl font-bold mb-4">Une erreur est survenue</h2>
          <pre className="bg-white p-4 rounded-xl border border-red-200 text-xs overflow-auto max-w-full">
            {(this.state as any).error?.message || String((this.state as any).error)}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState('admin');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        initializeData().catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  const roles = [
    { id: 'admin', label: 'Administrateur', color: 'bg-purple-500' },
    { id: 'logistique', label: 'Logistique', color: 'bg-blue-500' },
    { id: 'production', label: 'Production', color: 'bg-green-500' },
    { id: 'poseur', label: 'Poseur / Atelier', color: 'bg-orange-500' },
  ];

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'logistique', 'production'] },
    { id: 'resources', label: 'Machines / Ressources', icon: Factory, roles: ['admin', 'production'] },
    { id: 'orders', label: 'Lots de Production', icon: ClipboardList, roles: ['admin', 'logistique', 'production'] },
    { id: 'clients', label: 'Clients', icon: UserIcon, roles: ['admin', 'logistique'] },
    { id: 'gantt', label: 'Planification Gantt', icon: GanttChartSquare, roles: ['admin', 'logistique', 'production', 'poseur'] },
    { id: 'analytics', label: 'Suivi de Charge', icon: BarChart3, roles: ['admin', 'production'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(simulatedRole));

  // Ensure active tab is valid for current role
  useEffect(() => {
    if (!filteredNavItems.find(item => item.id === activeTab)) {
      setActiveTab(filteredNavItems[0]?.id || 'gantt');
    }
  }, [simulatedRole]);

  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-20 h-20 bg-[#FF4E00] rounded-3xl flex items-center justify-center font-bold text-4xl text-white mb-6 shadow-2xl shadow-[#FF4E00]/30">F</div>
          <h1 className="text-3xl font-bold text-[#141414] mb-2">Bienvenue sur FabrikFlow</h1>
          <p className="text-[#8E9299] mb-8 max-w-md">Connectez-vous pour accéder à votre outil de gestion de production et de charge machine.</p>
          <button 
            onClick={signIn}
            className="flex items-center gap-3 px-8 py-4 bg-[#151619] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl"
          >
            <LogIn className="w-5 h-5" /> Se connecter avec Google
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'resources': return <Resources />;
      case 'orders': return <Orders />;
      case 'clients': return <Clients />;
      case 'gantt': return <Gantt />;
      case 'analytics': return <Analytics />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F9FA]">
        <div className="w-12 h-12 border-4 border-[#FF4E00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, loading, role: simulatedRole, setRole: setSimulatedRole }}>
        <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
          {/* Sidebar */}
          {user && (
            <aside 
              className={cn(
                "bg-[#151619] text-white transition-all duration-300 flex flex-col",
                isSidebarOpen ? "w-64" : "w-20"
              )}
            >
              <div className="p-6 flex items-center gap-3 border-b border-white/10">
                <div className="w-8 h-8 bg-[#FF4E00] rounded-lg flex items-center justify-center font-bold text-xl">F</div>
                {isSidebarOpen && <span className="font-bold text-xl tracking-tight">FabrikFlow</span>}
              </div>

              <nav className="flex-1 py-6 px-3 space-y-2">
                {filteredNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                      activeTab === item.id 
                        ? "bg-[#FF4E00] text-white" 
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 shrink-0", activeTab === item.id ? "text-white" : "group-hover:text-white")} />
                    {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-white/10 space-y-2">
                {simulatedRole === 'admin' && (
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                      activeTab === 'settings' 
                        ? "bg-[#FF4E00] text-white" 
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Settings className="w-5 h-5" />
                    {isSidebarOpen && <span className="text-sm">Paramètres</span>}
                  </button>
                )}
                <button 
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  {isSidebarOpen && <span className="text-sm">Déconnexion</span>}
                </button>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            {user && (
              <header className="h-16 bg-white border-b border-[#E4E3E0] flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-[#F0F0F0] rounded-lg transition-colors"
                  >
                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                  <h2 className="text-lg font-semibold text-[#141414]">
                    {navItems.find(i => i.id === activeTab)?.label}
                  </h2>
                </div>

                <div className="flex items-center gap-6">
                  {/* Role Switcher for Demo */}
                  <div className="flex items-center gap-2 bg-[#F5F5F5] p-1 rounded-xl">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSimulatedRole(r.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                          simulatedRole === r.id 
                            ? cn(r.color, "text-white shadow-sm") 
                            : "text-[#8E9299] hover:text-[#141414]"
                        )}
                      >
                        {r.id}
                      </button>
                    ))}
                  </div>

                  <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" />
                    <input 
                      type="text" 
                      placeholder="Rechercher..." 
                      className="pl-10 pr-4 py-2 bg-[#F5F5F5] border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-[#FF4E00] transition-all"
                    />
                  </div>
                  <button className="relative p-2 hover:bg-[#F0F0F0] rounded-full transition-colors">
                    <Bell className="w-5 h-5 text-[#141414]" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF4E00] rounded-full border-2 border-white"></span>
                  </button>
                  <div className="flex items-center gap-3 pl-4 border-l border-[#E4E3E0]">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold text-[#141414]">{user.displayName}</p>
                      <p className="text-xs text-[#8E9299]">{user.email}</p>
                    </div>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-[#E4E3E0]" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 bg-[#E4E3E0] rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-[#8E9299]" />
                      </div>
                    )}
                  </div>
                </div>
              </header>
            )}

            {/* View Content */}
            <div className="flex-1 overflow-auto">
              {renderContent()}
            </div>
          </main>
        </div>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
