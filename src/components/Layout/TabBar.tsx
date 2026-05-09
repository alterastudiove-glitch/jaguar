import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, ShoppingCart, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

const tabs = [
  { id: 'explore', icon: Home, label: 'Explorar', path: '/' },
  { id: 'orders', icon: ClipboardList, label: 'Pedidos', path: '/orders' },
  { id: 'cart', icon: ShoppingCart, label: 'Carrito', path: '/cart' },
  { id: 'profile', icon: User, label: 'Perfil', path: '/profile' },
];

export function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-3 pb-8 z-50">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {tabs.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all duration-300",
                isActive ? "text-indigo-600 scale-110" : "text-slate-400 opacity-60"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <tab.icon className="w-6 h-6" />
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
