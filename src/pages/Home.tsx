import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, Package, Zap, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, cn } from '../lib/utils';

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{name: string, isExternal?: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [currentBanner, setCurrentBanner] = useState(0);

  const BANNERS = [
    {
      id: 1,
      title: "Colección Pro Streetwear",
      description: "Crea tus hoodies y franelas con acabados premium en minutos.",
      badge: "Tendencia 2026",
      buttonText: "Explorar Ahora",
      color: "from-indigo-600 via-indigo-700 to-slate-900",
      icon: Package,
      action: () => setSelectedCategory('Franelas')
    },
    {
      id: 2,
      title: "Oversize Collection",
      description: "Diseños propios con el fit perfecto de tendencia y materiales premium.",
      badge: "Brand Exclusive",
      buttonText: "Ver Diseños",
      color: "from-slate-900 to-slate-800",
      icon: Zap,
      action: () => setSelectedCategory('Tshirt Over Size')
    },
    {
      id: 3,
      title: "Combos Escolares",
      description: "Personaliza el kit completo para el regreso a clases con descuentos.",
      badge: "Temporada 2026",
      buttonText: "Ver Combos",
      color: "from-emerald-600 to-teal-900",
      icon: Package,
      action: () => setSelectedCategory('Combos')
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const pSnapshot = await getDocs(collection(db, 'products'));
      setProducts(pSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      
      const cSnapshot = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')));
      const cList = cSnapshot.docs.map(doc => ({
        name: (doc.data() as Category).name,
        isExternal: (doc.data() as Category).isExternalLink
      }));
      
      // Ensure specific business categories exist or are highlighted
      const tempCategories = [{name: 'Todos'}, ...cList];
      const uniqueCategories = tempCategories.filter((cat, index, self) =>
        index === self.findIndex((t) => (
          t.name.toLowerCase() === cat.name.toLowerCase()
        ))
      );
      setCategories(uniqueCategories);
      
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleCategoryClick = (cat: {name: string, isExternal?: boolean}) => {
    if (cat.isExternal) {
      window.open(`https://wa.me/584120000000?text=Hola! Me interesa el servicio de ${cat.name}`, '_blank');
      return;
    }
    setSelectedCategory(cat.name);
  };

  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <header className="space-y-4 pt-4">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Impreza</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Design. Print. Wear.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* Dynamic Rotating Banner */}
        <div className="relative h-64 bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200">
           <AnimatePresence mode="wait">
              <motion.div 
                key={currentBanner}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={cn("absolute inset-0 bg-gradient-to-br opacity-90", BANNERS[currentBanner].color)}
              >
                  <div className="relative h-full p-10 flex flex-col justify-center text-white space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full w-fit">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100">{BANNERS[currentBanner].badge}</span>
                    </div>
                    <h2 className="text-3xl font-black leading-none tracking-tighter whitespace-pre-line">{BANNERS[currentBanner].title}</h2>
                    <p className="text-xs text-white/60 font-medium max-w-[220px]">{BANNERS[currentBanner].description}</p>
                    <button 
                      onClick={BANNERS[currentBanner].action}
                      className="mt-4 px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest w-fit active:scale-95 transition-all shadow-lg"
                    >
                        {BANNERS[currentBanner].buttonText}
                    </button>
                  </div>
                  
                  <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
                    {(() => {
                      const Icon = BANNERS[currentBanner].icon;
                      return <Icon className="w-64 h-64 text-white rotate-12" />;
                    })()}
                  </div>
              </motion.div>
           </AnimatePresence>

           {/* Carousel Indicators */}
           <div className="absolute bottom-6 left-10 flex gap-1.5">
              {BANNERS.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    i === currentBanner ? "w-8 bg-white" : "w-2 bg-white/30"
                  )} 
                />
              ))}
           </div>
        </div>
      </header>

      <section className="space-y-5">
        <div className="flex justify-between items-end px-2">
          <div className="space-y-1">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nuestro</h3>
             <p className="text-xl font-black text-slate-800 tracking-tight">Catálogo</p>
          </div>
          <button className="p-3 bg-slate-50 rounded-xl text-slate-400">
             <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar px-1">
           {categories.map((cat) => (
             <button 
                key={cat.name} 
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  "flex-shrink-0 px-6 py-3 rounded-2xl text-[11px] font-black transition-all uppercase tracking-widest shadow-sm",
                  selectedCategory === cat.name 
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 ring-4 ring-indigo-50" 
                    : "bg-white border border-slate-100 text-slate-400 hover:border-slate-200"
                )}
             >
                {cat.name}
             </button>
           ))}
        </div>
      </section>

      <section className="space-y-6 pb-20">
        <div className="grid grid-cols-2 gap-x-5 gap-y-10">
          {loading ? (
             Array(4).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="relative aspect-[3/4] bg-slate-100 rounded-[3rem] overflow-hidden">
                     <motion.div 
                        animate={{ 
                          x: ['-100%', '100%'],
                        }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent shadow-xl"
                     />
                  </div>
                  <div className="space-y-2 px-2">
                    <div className="h-4 bg-slate-100 rounded-lg w-3/4 relative overflow-hidden">
                       <motion.div 
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                       />
                    </div>
                    <div className="h-3 bg-slate-100 rounded-lg w-1/2 overflow-hidden relative">
                       <motion.div 
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                       />
                    </div>
                  </div>
                </div>
             ))
          ) : (
            filteredProducts.map((product) => (
              <Link to={`/product/${product.id}`} key={product.id} className="group space-y-4 flex flex-col">
                 <motion.div 
                    whileHover={{ y: -6 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative aspect-[3/4] bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-100/50"
                 >
                    <img 
                      src={product.imageUrl || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400"} 
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-5 right-5 flex flex-col gap-2">
                       <div className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/50">
                          <span className="text-[10px] font-black text-indigo-600">NEW</span>
                       </div>
                       <button 
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                         }}
                         className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/50 text-slate-400 hover:text-red-500 transition-colors"
                       >
                          <Heart className="w-4 h-4" />
                       </button>
                    </div>
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 </motion.div>
                 <div className="space-y-1 px-4">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{product.category}</p>
                    <h4 className="font-black text-sm text-slate-800 leading-tight line-clamp-1">{product.name}</h4>
                    <div className="flex items-center justify-between pt-1">
                       <p className="text-sm font-black text-indigo-600 tracking-tighter">{formatCurrency(product.basePrice)}</p>
                       <div className="flex gap-0.5">
                          {product.colors.slice(0, 2).map((c, i) => (
                            <div key={i} className="w-2 h-2 rounded-full border border-slate-200" style={{ backgroundColor: c }} />
                          ))}
                          {product.colors.length > 2 && <span className="text-[8px] font-bold text-slate-300">+{product.colors.length - 2}</span>}
                       </div>
                    </div>
                 </div>
              </Link>
            ))
          )}
        </div>
      </section>
      <section className="pt-10 pb-20 flex flex-col items-center">
         <Link 
            to="/admin" 
            className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] hover:text-indigo-400 transition-colors py-10"
         >
            Consola Master
         </Link>
      </section>
    </div>
  );
}
