import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, PlusCircle, List, Bell, User as UserIcon, LogOut, MessageSquare, Leaf, Heart } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
  const { user, dbUser, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Feed', path: '/', icon: Home, public: true },
    { name: 'Wishlist', path: '/wishlist', icon: Heart, public: false },
    { name: 'Post', path: '/post', icon: PlusCircle, public: false },
    { name: 'My Listings', path: '/my-listings', icon: List, public: false },
    { name: 'Inbox', path: '/inbox', icon: MessageSquare, public: false },
    { name: 'Sustainability', path: '/impact', icon: Leaf, public: false },
    { name: 'Profile', path: '/profile', icon: UserIcon, public: false },
  ];

  const visibleNavItems = navItems.filter(item => item.public || user);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50 via-slate-50 to-white flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-orange-700 flex items-center gap-2">
            <span className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-1.5 rounded-lg shadow-md uppercase">CC</span>
            CC-CAMPUS CIRCLE
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            {visibleNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-all hover:text-orange-600 hover:scale-105",
                  location.pathname === item.path ? "text-orange-600" : "text-gray-600"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
            {user ? (
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 ml-4"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white/90 backdrop-blur-md border-t border-orange-100 fixed bottom-0 w-full z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {visibleNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                location.pathname === item.path ? "text-orange-600" : "text-gray-500 hover:text-orange-400"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          ))}
          {!user && (
            <Link
              to="/login"
              className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-500"
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px] font-medium">Login</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
