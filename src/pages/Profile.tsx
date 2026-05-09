import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Settings, MessageCircle, Heart, LayoutDashboard, ShieldCheck, Instagram, Facebook, Smartphone, MapPin, User as UserIcon, CreditCard as IdIcon, Save, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

const SECTIONS = [
  { id: 'edit', label: 'Datos de Registro', icon: UserIcon, highlight: true },
  { id: 'orders', label: 'Pedidos Realizados', icon: IdIcon },
  { id: 'favs', label: 'Mis Favoritos', icon: Heart },
  { id: 'support', label: 'Soporte Directo', icon: MessageCircle },
];

const AVATARS = Array.from({ length: 20 }, (_, i) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 100}`);

const SOCIALS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, url: 'https://instagram.com', color: 'hover:text-pink-500' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, url: 'https://facebook.com', color: 'hover:text-blue-600' },
  { id: 'tiktok', label: 'TikTok', icon: Smartphone, url: 'https://tiktok.com', color: 'hover:text-slate-900' },
];

export function Profile() {
  const navigate = useNavigate();
  const { profile, login, logout, user } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    cedula: profile?.cedula || '',
  });

  const isAdmin = profile?.role === 'admin' || profile?.email === 'alterastudiove@gmail.com';

  const menuSections = isAdmin 
    ? [{ id: 'admin', label: 'Consola Master', icon: LayoutDashboard, highlight: true }, ...SECTIONS]
    : SECTIONS;

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phone: profile.phone || '',
        location: profile.location || '',
        cedula: profile.cedula || '',
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const seedProducts = async () => {
    setSeeding(true);
    const mockProducts = [
      {
        name: "Franela Urbana OverSize",
        description: "Algodón 100% premium de 200gr, corte relajado y duradero. El fit oversize definitivo para un look streetwear auténtico.",
        basePrice: 18,
        wholesalePrice: 14,
        wholesaleThreshold: 12,
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800",
        category: "Tshirt Over Size",
        type: "standard",
        colors: ["#FFFFFF", "#000000", "#1E40AF", "#991B1B", "#10B981"],
        sizes: ["S", "M", "L", "XL", "XXL"],
        techniques: ["DTF", "Vinil", "Transfer"],
        specs: { material: "100% Algodón", weight: "200 GSM", fit: "Oversized", gender: "Unisex" }
      },
      {
        name: "Combo Escolar Premium",
        description: "Paquete completo para el regreso a clases. Incluye franela, bolso y personalización de nombre.",
        basePrice: 45,
        wholesalePrice: 38,
        wholesaleThreshold: 10,
        imageUrl: "https://images.unsplash.com/photo-1576708444735-3f3630f57657?auto=format&fit=crop&q=80&w=800",
        category: "Combos",
        type: "package",
        colors: ["#FFFFFF", "#1E40AF", "#991B1B"],
        sizes: ["6", "8", "10", "12", "14"],
        techniques: ["Sublimación", "DTF"],
        specs: { 
          material: "Atlético Ultra-Resistente", 
          packageDetails: [
            { label: "Franela Escolar", price: 0 },
            { label: "Mono Deportivo", price: 15 },
            { label: "Chaqueta del Combo", price: 25 },
            { label: "Gorra Escolar Personalizada", price: 8 },
            { label: "Bolso/Morral Estampado", price: 12 },
            { label: "Botella de Agua (Termo)", price: 6 },
            { label: "Etiquetas Térmicas para Ropa", price: 4 }
          ]
        }
      },
      {
        name: "Banner Publicitario 13oz",
        description: "Impresión de alta resolución en lona banner de 13oz. Resistente a exteriores y rayos UV.",
        basePrice: 15,
        wholesalePrice: 12,
        wholesaleThreshold: 20,
        imageUrl: "https://images.unsplash.com/photo-1533418264835-9871c7c2dbf0?auto=format&fit=crop&q=80&w=800",
        category: "Impresión",
        type: "print",
        colors: ["#FFFFFF"],
        sizes: ["1m x 1m"],
        techniques: ["Eco-Solvente"],
        specs: { material: "Lona Banner 13oz", weight: "Medio", use: "Exterior/Interior" }
      },
      {
         name: "Servicio de Diseño Logo",
         description: "Creación de logotipo desde cero. Incluye 3 propuestas manuales y archivos finales vectorizados.",
         basePrice: 50,
         wholesalePrice: 50,
         wholesaleThreshold: 1,
         imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800",
         category: "Servicios",
         type: "service",
         colors: ["#6366F1"],
         sizes: ["Digital"],
         techniques: ["Vectorial"],
         specs: { format: "AI, EPS, PDF, PNG", delivery: "48-72 Horas" }
      },
      {
        name: "Hoodie Elite Streetwear",
        description: "Tela polar perchada de alta densidad, capucha forrada con cordones metálicos y bolsillo frontal reforzado.",
        basePrice: 35,
        wholesalePrice: 28,
        wholesaleThreshold: 10,
        imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800",
        category: "Hoodies",
        type: "standard",
        colors: ["#1F2937", "#4B5563", "#000000", "#D1D5DB"],
        sizes: ["S", "M", "L", "XL"],
        techniques: ["DTF", "Bordado", "Vinil"],
        specs: { material: "80% Algodón / 20% Poliéster", weight: "320 GSM", fit: "Regular", gender: "Unisex" }
      }
    ];

    for (const p of mockProducts) {
      await addDoc(collection(db, 'products'), p);
    }
    setSeeding(false);
    alert("Productos inicializados!");
  };
  const handleUpdateAvatar = async (avatarUrl: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: avatarUrl,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  const handleSupportClick = () => {
    window.open('https://wa.me/584142314194?text=Hola! Necesito soporte con mi pedido.', '_blank');
  };

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in duration-1000">
        <div className="relative">
           <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 rotate-12 relative z-10">
              <ShieldCheck className="w-12 h-12 text-white -rotate-12" />
           </div>
           <div className="absolute inset-0 bg-indigo-400/20 rounded-[2.5rem] blur-2xl -z-10" />
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bienvenido a Impreza</h2>
           <p className="text-xs text-slate-400 font-medium max-w-[220px] leading-relaxed mx-auto italic">
              Personalización textil profesional al alcance de un toque.
           </p>
        </div>
        <button 
          onClick={login}
          className="w-full py-4 bg-white border border-slate-100 rounded-2xl font-black text-xs tracking-[0.2em] flex items-center justify-center gap-4 shadow-2xl shadow-slate-200 hover:bg-slate-50 transition-all active:scale-95 uppercase"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Acceder con Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center py-4">
         <div className="space-y-1 text-left">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mi Perfil</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Panel de Usuario</p>
         </div>
         <button onClick={logout} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="w-5 h-5" />
         </button>
      </header>

      <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100 text-center space-y-5 relative overflow-hidden">
         <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />
         <div className="relative inline-block group">
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={profile?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
              className="w-24 h-24 rounded-[2.5rem] object-cover border-4 border-white shadow-xl relative z-10"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center z-20">
               <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
         </div>

         {/* Avatar Selector */}
         <div className="space-y-4">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Elige tu Avatar</p>
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar px-2">
               {AVATARS.map((avatar, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleUpdateAvatar(avatar)}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex-shrink-0 border-2 transition-all p-0.5",
                      profile?.photoURL === avatar ? "border-indigo-600 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-200 shadow-sm"
                    )}
                  >
                     <img src={avatar} className="w-full h-full object-cover rounded-xl" />
                  </button>
               ))}
            </div>
         </div>
         <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{profile?.displayName}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{profile?.role || 'Cliente Premium'}</p>
         </div>
      </section>

      <nav className="space-y-3">
         <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm divide-y divide-slate-50">
            {menuSections.map((section) => (
              <button 
                  key={section.id}
                  onClick={() => {
                    if (section.id === 'admin') navigate('/admin');
                    if (section.id === 'edit') setIsEditing(true);
                    if (section.id === 'support') handleSupportClick();
                    if (section.id === 'orders' || section.id === 'favs') setActiveSection(section.id);
                  }}
                  className="w-full flex items-center gap-5 p-5 text-left transition-all hover:bg-slate-50 active:scale-95 group"
              >
                  <div className={cn(
                    "w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all group-hover:scale-110",
                    section.highlight ? "bg-indigo-600 shadow-lg shadow-indigo-100 text-white" : "bg-slate-50 text-slate-400"
                  )}>
                    <section.icon className="w-5 h-5 font-bold" />
                  </div>
                  <div className="flex-1">
                     <span className={cn("text-xs font-black uppercase tracking-wider", section.highlight ? "text-indigo-600" : "text-slate-700")}>
                        {section.label}
                     </span>
                     {section.id === 'edit' && !profile?.phone && (
                        <p className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Pendiente por completar</p>
                     )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-200" />
              </button>
            ))}
         </div>

         {/* Social Links */}
         <div className="pt-4 flex items-center justify-center gap-4">
            {SOCIALS.map((social) => (
              <a 
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "w-14 h-14 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-300 transition-all active:scale-90",
                  social.color
                )}
              >
                 <social.icon className="w-6 h-6" />
              </a>
            ))}
         </div>
      </nav>

      <AnimatePresence>
        {activeSection && (
           <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-500">
              <header className="p-6 bg-white border-b border-slate-100 flex items-center gap-4">
                 <button onClick={() => setActiveSection(null)} className="p-2 -ml-2 text-slate-400">
                    <ChevronLeft className="w-6 h-6" />
                 </button>
                 <div className="flex-1">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">
                       {SECTIONS.find(s => s.id === activeSection)?.label}
                    </h2>
                 </div>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                 {activeSection === 'orders' ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                       <IdIcon className="w-16 h-16 text-slate-200" />
                       <p className="text-xs font-black uppercase tracking-widest text-slate-400">No tienes pedidos aún</p>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                       <Heart className="w-16 h-16 text-slate-200" />
                       <p className="text-xs font-black uppercase tracking-widest text-slate-400">No tienes favoritos aún</p>
                    </div>
                 )}
              </div>
           </div>
        )}

        {isEditing && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
              <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.9, opacity: 0 }}
                 className="w-full max-w-sm bg-white rounded-[3rem] p-10 space-y-8 shadow-2xl relative"
              >
                 <button onClick={() => setIsEditing(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900">
                    <X className="w-6 h-6" />
                 </button>

                 <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Registro de Cliente</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Actualiza tus datos de contacto</p>
                 </div>

                 <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">Nombre Completo</label>
                       <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="text" 
                            value={formData.displayName}
                            onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                            required
                          />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">Cédula / ID</label>
                       <div className="relative">
                          <IdIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="text" 
                            placeholder="V-00.000.000"
                            value={formData.cedula}
                            onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">Teléfono</label>
                       <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="tel" 
                            placeholder="+58 412..."
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">Ubicación / Ciudad</label>
                       <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            type="text" 
                            placeholder="Ej: Caracas, Venezuela"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                       </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       <Save className="w-4 h-4" />
                       {isSaving ? 'Guardando...' : 'Guardar Datos'}
                    </button>
                 </form>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <footer className="text-center pb-12 opacity-40">
         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.4em] mb-1">Impreza v1.9.26</p>
         <p className="text-[9px] text-slate-300 font-medium">Arquitectura Sleek 2026 • AI Powered</p>
      </footer>
    </div>
  );
}

function ArrowRight(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
}
