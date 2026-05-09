import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Package, CheckCircle2, Factory, CreditCard } from 'lucide-react';
import React from 'react';

const STATUS_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
  'validando': { label: 'Pago en Validación', icon: CreditCard, color: 'text-amber-500' },
  'produccion': { label: 'En Producción', icon: Factory, color: 'text-blue-500' },
  'listo': { label: 'Listo para Retiro', icon: Package, color: 'text-emerald-500' },
  'entregado': { label: 'Entregado', icon: CheckCircle2, color: 'text-indigo-500' },
};

export function RealtimeNotifications() {
  const { user } = useAuth();
  const prevStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const orderData = change.doc.data();
        const orderId = change.doc.id;
        const currentStatus = orderData.status;

        if (change.type === 'added') {
          // If it's a new order added while the app is open (not the initial sync)
          // We can check if it was created very recently
          if (orderData.createdAt > Date.now() - 30000) {
            toast.success("¡Pedido Recibido!", {
              description: `Tu orden #${orderId.substring(0, 6).toUpperCase()} está siendo procesada.`,
              duration: 5000,
            });
          }
        } else if (change.type === 'modified') {
          const oldStatus = prevStatuses.current[orderId];
          
          if (oldStatus && oldStatus !== currentStatus) {
            const config = STATUS_CONFIG[currentStatus];
            if (config) {
              toast.custom((t) => (
                <div className="bg-white border border-slate-100 p-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 ${config.color}`}>
                    <config.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actualización de Pedido</p>
                    <p className="text-sm font-black text-slate-800">{config.label}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {orderId.substring(0, 6).toUpperCase()}</p>
                  </div>
                </div>
              ), { duration: 5000, position: 'top-center' });
            }
          }
        }
        
        // Update local ref with current status
        prevStatuses.current[orderId] = currentStatus;
      });
    });

    return () => unsubscribe();
  }, [user]);

  return null;
}
