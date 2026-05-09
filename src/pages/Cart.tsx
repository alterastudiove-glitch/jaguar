import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Trash2, ArrowRight, TrendingDown, Info, X } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Cart() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showWholesaleInfo, setShowWholesaleInfo] = useState(false);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setItems(cart);
  }, []);

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    setItems(newItems);
    localStorage.setItem('cart', JSON.stringify(newItems));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    localStorage.setItem('cart', JSON.stringify(newItems));
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Wholesale logic: if total items >= 36, 5% discount
  const isWholesale = totalQuantity >= 36;
  const finalAmount = isWholesale ? totalAmount * 0.95 : totalAmount;

  const handleCheckout = async () => {
    if (!profile) {
      navigate('/profile');
      return;
    }

    setIsCheckingOut(true);
    try {
      const orderData = {
        userId: profile.uid,
        userName: profile.displayName,
        userEmail: profile.email,
        phone: profile.phone || '',
        location: profile.location || '',
        cedula: profile.cedula || '',
        items: items,
        totalAmount: finalAmount,
        status: 'recibido',
        securityCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        depositPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      localStorage.removeItem('cart');
      setItems([]);
      navigate('/orders');
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 shadow-sm mb-8">
          <ShoppingBag className="w-10 h-10 text-slate-200" />
        </div>
        <div className="space-y-2 mb-8">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Tu carrito está vacío</h2>
          <p className="text-xs text-slate-400 font-medium">Empieza personalizando tus productos favoritos.</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="w-full py-4 bg-indigo-600 text-white font-black text-xs tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-100 transition-all active:scale-95 uppercase"
        >
          Ir a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-40 relative">
      <AnimatePresence>
        {showWholesaleInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="font-black text-slate-800 tracking-tight">Precios al Mayor</h3>
                </div>
                <button onClick={() => setShowWholesaleInfo(false)} className="p-2 text-slate-300 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">¿Cómo funciona?</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Al alcanzar <span className="font-black text-slate-800">36 unidades o más</span> en tu carrito total, el sistema aplica automáticamente un <span className="font-black text-emerald-600">descuento del 5%</span> sobre el monto bruto.
                  </p>
                </div>
                <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100 space-y-2">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Ventajas</p>
                  <ul className="text-[10px] text-slate-500 font-bold space-y-1 ml-4 list-disc">
                    <li>Ideal para emprendimientos y eventos</li>
                    <li>Ahorro inmediato sin procesos manuales</li>
                    <li>Sigue aplicando a piezas personalizadas</li>
                  </ul>
                </div>
              </div>
              <button 
                onClick={() => setShowWholesaleInfo(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="pt-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mi Carrito</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Resumen de tu pedido</p>
        </div>
        <button 
          onClick={() => setShowWholesaleInfo(true)}
          className="w-10 h-10 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-center text-slate-300 hover:text-indigo-600 transition-colors"
        >
          <Info className="w-5 h-5" />
        </button>
      </header>

      <div className="space-y-4">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div 
              layout
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex gap-5 p-5 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center p-2 relative">
                 <div className="w-full h-full rounded-xl shadow-sm" style={{ backgroundColor: item.customization.color }} />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-black uppercase text-white drop-shadow-md tracking-tighter">{item.customization.technique}</span>
                 </div>
              </div>
              <div className="flex-1 space-y-2">
                 <div className="flex justify-between items-start">
                    <h4 className="font-black text-xs text-slate-800 leading-tight pr-4">{item.productName}</h4>
                    <button onClick={() => removeItem(index)} className="p-1 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
                 <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                    {item.customization.size} • {item.customization.locations.join(', ')}
                 </p>
                 <div className="flex justify-between items-center pt-1">
                    <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-100">
                       <button onClick={() => updateQuantity(index, -1)} className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center font-black">-</button>
                       <span className="text-[10px] font-black w-6 text-center">{item.quantity}</span>
                       <button onClick={() => updateQuantity(index, 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center font-black">+</button>
                    </div>
                    <span className="font-black text-sm text-slate-800 tracking-tighter">{formatCurrency(item.price * item.quantity)}</span>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-indigo-100 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
         
         {!isWholesale && (
           <div 
             onClick={() => setShowWholesaleInfo(true)}
             className="bg-white/10 p-4 rounded-2xl flex items-center gap-4 border border-white/5 relative z-10 cursor-help"
           >
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                 <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-indigo-100 font-medium leading-tight">
                   ¡Faltan <span className="font-black text-white">{36 - totalQuantity} piezas</span> para activar el descuento del 5% al mayor!
                </p>
              </div>
              <Info className="w-3 h-3 text-white/40" />
           </div>
         )}

         {isWholesale && (
           <div 
             onClick={() => setShowWholesaleInfo(true)}
             className="bg-emerald-500/20 p-4 rounded-2xl flex items-center gap-4 border border-emerald-500/20 relative z-10 cursor-help"
           >
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                 <Check className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-white font-medium leading-tight">
                   <span className="font-black">¡MAYORISTA DETECTADO!</span><br />
                   Se aplicó automáticamente un 5% de descuento.
                </p>
              </div>
              <Info className="w-3 h-3 text-white/40" />
           </div>
         )}

         <div className="space-y-3 relative">
            <div className="flex justify-between items-baseline text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
               <span>Subtotal Bruto</span>
               <span>{formatCurrency(totalAmount)}</span>
            </div>
            {isWholesale && (
               <div className="flex justify-between items-baseline text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  <span>Descuento (5%)</span>
                  <span>-{formatCurrency(totalAmount * 0.05)}</span>
               </div>
            )}
            <div className="h-px bg-white/10 my-4" />
            <div className="flex justify-between items-end">
               <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 block mb-1">Monto Inversión</span>
                  <span className="text-4xl font-black tracking-tighter leading-none">{formatCurrency(finalAmount)}</span>
               </div>
               <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-[0.1em] text-indigo-200 block mb-1 opacity-70">Abono 50%</span>
                  <span className="text-xl font-black text-indigo-50">{formatCurrency(finalAmount / 2)}</span>
               </div>
            </div>
         </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-lg border-t border-slate-100 max-w-md mx-auto z-20">
        <button
          onClick={handleCheckout}
          disabled={isCheckingOut}
          className="w-full py-4 bg-slate-900 text-white font-black text-xs tracking-[0.3em] rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 uppercase"
        >
          {isCheckingOut ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Confirmar Pedido
              <ArrowRight className="w-5 h-4" />
            </>
          )}
        </button>
        <p className="text-[9px] text-center text-slate-400 font-medium mt-4 tracking-wide">
          Producción garantizada • Pago verificado vía WhatsApp
        </p>
      </div>
    </div>
  );
}

function Check(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
}
