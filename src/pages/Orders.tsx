import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, Factory, Package, QrCode, CreditCard, ShieldCheck, Check } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_MAP = {
  recibido: { label: 'Recibido', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', progress: 10 },
  validando: { label: 'Validando Pago', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-50', progress: 30 },
  produccion: { label: 'En Producción', icon: Factory, color: 'text-indigo-500', bg: 'bg-indigo-50', progress: 70 },
  listo: { label: 'Listo para Retiro', icon: Package, color: 'text-green-500', bg: 'bg-green-50', progress: 100 },
  entregado: { label: 'Entregado', icon: CheckCircle2, color: 'text-gray-400', bg: 'bg-gray-50', progress: 100 },
};

const TIMELINE_STEPS = [
  { id: 'recibido', label: 'Pedido Recibido', desc: 'Tu orden ha sido registrada exitosamente.' },
  { id: 'validando', label: 'Pago Verificado', desc: 'El abono del 50% ha sido confirmado.' },
  { id: 'produccion', label: 'En Producción', desc: 'Tus prendas están siendo personalizadas.' },
  { id: 'listo', label: 'Listo para Retiro', desc: '¡Ya puedes pasar por tu pedido!' },
  { id: 'entregado', label: 'Entrega Exitosa', desc: '¡Gracias por confiar en Impreza!' },
];

export function Orders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const o = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(o);
      setLoading(false);
    });

    return unsubscribe;
  }, [profile]);

  if (loading) return <div className="p-12 text-center text-gray-400">Cargando tus pedidos...</div>;

  return (
    <div className="p-6 space-y-8 animate-in slide-in-from-bottom duration-500">
      <header className="pt-4">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Mis Pedidos</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Seguimiento en tiempo real</p>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-20 space-y-4">
           <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto border border-slate-100">
              <Package className="w-8 h-8 text-slate-200" />
           </div>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No tienes pedidos activos</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {orders.map((order) => {
              const status = STATUS_MAP[order.status] || STATUS_MAP.recibido;
              const isSelected = selectedOrder?.id === order.id;

              return (
                <motion.div
                  key={order.id}
                  layout
                  onClick={() => setSelectedOrder(isSelected ? null : order)}
                  className={cn(
                    "bg-white border rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500",
                    isSelected ? "border-indigo-600 shadow-2xl shadow-indigo-100 ring-8 ring-indigo-50" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="p-6 space-y-5">
                    <div className="flex justify-between items-start">
                       <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                             {format(new Date(order.createdAt), 'dd MMM, HH:mm', { locale: es })}
                          </span>
                          <h4 className="font-black text-sm text-slate-800">Orden #{order.id.substring(0, 6).toUpperCase()}</h4>
                       </div>
                       <div className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm", status.bg, status.color)}>
                          {status.label}
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between text-[10px] mb-1">
                          <span className="font-black text-slate-400 uppercase tracking-widest">Estado</span>
                          <span className={cn("font-black tracking-widest", status.color)}>{status.progress}%</span>
                       </div>
                       <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${status.progress}%` }}
                            className={cn("h-full rounded-full transition-all duration-1000 shadow-sm", status.progress === 100 ? "bg-emerald-500" : "bg-indigo-600")}
                          />
                       </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                       <span className="text-lg font-black text-slate-800 tracking-tighter">{formatCurrency(order.totalAmount)}</span>
                       <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                          <motion.div animate={{ rotate: isSelected ? 180 : 0 }}>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          </motion.div>
                       </div>
                    </div>
                  </div>

                   {isSelected && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-slate-50 bg-slate-50/30 p-6 space-y-10"
                    >
                       <div className="space-y-6">
                          <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Estado Detallado</h5>
                          <div className="relative space-y-8 px-4">
                             {/* Vertical Line Connector */}
                             <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-slate-100" />
                             
                             {TIMELINE_STEPS.map((step, idx) => {
                                const orderStatusIndex = TIMELINE_STEPS.findIndex(s => s.id === order.status);
                                const isCompleted = idx <= orderStatusIndex;
                                const isCurrent = idx === orderStatusIndex;
                                const statusTime = order.statusHistory?.[step.id as OrderStatus];
                                
                                return (
                                  <div key={idx} className="relative flex gap-6 group">
                                     {/* Step Indicator */}
                                     <div className={cn(
                                       "w-5 h-5 rounded-full z-10 flex items-center justify-center transition-all duration-500 ring-4",
                                       isCompleted ? "bg-indigo-600 ring-indigo-50" : "bg-white border-2 border-slate-200 ring-transparent",
                                       isCurrent && "animate-pulse ring-indigo-100 scale-125"
                                     )}>
                                        {isCompleted && <Check className="w-3 h-3 text-white" />}
                                     </div>
                                     
                                     {/* Step Content */}
                                     <div className={cn(
                                       "flex-1 space-y-1 transition-opacity duration-500",
                                       !isCompleted && "opacity-40"
                                     )}>
                                        <div className="flex justify-between items-start">
                                           <p className={cn(
                                             "text-[11px] font-black uppercase tracking-wider",
                                             isCompleted ? "text-slate-800" : "text-slate-400"
                                           )}>
                                             {step.label}
                                           </p>
                                           {statusTime && (
                                              <span className="text-[8px] font-black text-indigo-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm whitespace-nowrap">
                                                 {format(new Date(statusTime), 'HH:mm • dd/MM')}
                                              </span>
                                           )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                          {step.desc}
                                        </p>
                                        {isCurrent && <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-lg uppercase tracking-widest">En Proceso</span>}
                                     </div>
                                  </div>
                                );
                             })}
                          </div>
                       </div>

                       <div className="bg-slate-900 text-white p-8 rounded-[2rem] shrink-0 flex flex-col items-center text-center space-y-6 shadow-2xl shadow-slate-200 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                          <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-700">
                             <div className="w-24 h-24 bg-slate-900 flex flex-wrap p-1">
                                <div className="w-1/2 h-1/2 border border-white"></div>
                                <div className="w-1/2 h-1/2 bg-white border border-slate-900"></div>
                                <div className="w-1/2 h-1/2 bg-white"></div>
                                <div className="w-1/2 h-1/2 border border-white"></div>
                             </div>
                          </div>
                          <div className="space-y-1 relative">
                            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-slate-400">Código de Retiro</p>
                            <p className="text-4xl font-black tracking-tight font-mono">{order.securityCode}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[200px]">
                            Muestra este código al personal autorizado para retirar tu pedido.
                          </p>
                       </div>

                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resumen de Pedido</h5>
                          <div className="space-y-3">
                            {order.items.map((item, idx) => (
                               <div key={idx} className="flex justify-between items-start text-xs">
                                  <div className="space-y-1">
                                     <p className="font-black text-slate-800">{item.productName} (x{item.quantity})</p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{item.customization.technique} • {item.customization.size}</p>
                                  </div>
                                  <span className="font-black text-slate-600">{formatCurrency(item.price * item.quantity)}</span>
                               </div>
                            ))}
                          </div>
                       </div>

                       <div className="p-5 bg-white rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                            order.depositPaid ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                          )}>
                             {order.depositPaid ? <ShieldCheck className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                          </div>
                          <div className="flex-1">
                             <p className="text-xs font-black text-slate-800">{order.depositPaid ? 'Pago Validado al 50%' : 'Esperando Validación'}</p>
                             <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                {order.depositPaid ? 'Producción priorizada y activa.' : 'Se notificará al validar la transferencia.'}
                             </p>
                          </div>
                       </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ChevronDown(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
}
