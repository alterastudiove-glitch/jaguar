import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Order, OrderStatus, Product, Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, CreditCard, Factory, Package, ArrowLeft, Upload, Settings, Plus, Trash2, Image as ImageIcon, Ruler, Tag } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Trash } from 'lucide-react';

const DEFAULT_SPECS = {
  material: '100% Algodón Premium',
  weight: '180g',
  fit: 'Regular Fit',
  gender: 'Unisex',
  care: 'Lavar con agua fría, no usar secadora.',
  dimensions: 'Talla M: 52cm x 72cm'
};

export function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories'>('orders');
  const [adminAuth, setAdminAuth] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ user: '', pass: '' });
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.email === 'alterastudiove@gmail.com' || adminAuth;

  useEffect(() => {
    if (!isAdmin) return;

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('order', 'asc')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCategories();
    };
  }, [isAdmin]);

  const handleSecretLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginCreds.user === 'admin' && loginCreds.pass === '1234') {
      setAdminAuth(true);
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus, depositPaid?: boolean) => {
    const orderRef = doc(db, 'orders', orderId);
    const now = new Date().toISOString();
    const updates: any = { 
      status, 
      updatedAt: now,
      [`statusHistory.${status}`]: now
    };
    if (depositPaid !== undefined) updates.depositPaid = depositPaid;
    await updateDoc(orderRef, updates);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const { id, ...data } = editingProduct;
    const wholesaleThreshold = 36;
    const wholesalePrice = Number(data.basePrice || 0) * 0.95;

    const productData = {
      ...data,
      type: data.type || 'standard',
      wholesaleThreshold,
      wholesalePrice,
      images: data.images?.filter(Boolean) || [],
      colorMap: data.colorMap || {},
      techniques: data.techniques || ['DTF', 'Vinil', 'Transfer', 'Sublimación'],
      colors: data.colors || [],
      sizes: data.sizes || ['S', 'M', 'L', 'XL'],
      updatedAt: new Date().toISOString()
    };

    if (id) {
      await updateDoc(doc(db, 'products', id), productData as any);
    } else {
      await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: new Date().toISOString()
      });
    }
    setEditingProduct(null);
  };

  const deleteProduct = async (id: string) => {
    if (window.confirm('¿Eliminar producto?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const { id, ...data } = editingCategory;
    if (id) {
      await updateDoc(doc(db, 'categories', id), data as any);
    } else {
      await addDoc(collection(db, 'categories'), { ...data, order: categories.length, isExternalLink: !!data.isExternalLink });
    }
    setEditingCategory(null);
  };

  const deleteCategory = async (id: string) => {
    if (window.confirm('¿Eliminar categoría?')) {
      await deleteDoc(doc(db, 'categories', id));
    }
  };

  const exportOrdersPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Impreza Master - Reporte de Pedidos', 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = orders.map(order => [
      order.id.substring(0, 6).toUpperCase(),
      order.userName,
      order.phone || 'N/A',
      order.cedula || 'N/A',
      order.items.map(item => `${item.productName} (x${item.quantity})`).join(', '),
      formatCurrency(order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)),
      order.status.toUpperCase(),
      order.depositPaid ? 'SI' : 'NO'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Cliente', 'Teléfono', 'Cédula', 'Productos', 'Total', 'Estado', 'Pago']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 }
    });

    doc.save(`pedidos_impreza_${nowString()}.pdf`);
  };

  const nowString = () => {
    const d = new Date();
    return `${d.getFullYear()}${d.getMonth()+1}${d.getDate()}_${d.getHours()}${d.getMinutes()}`;
  };

  const clearAllOrders = async () => {
    if (window.confirm('¿ESTÁS SEGURO? Se eliminarán TODOS los pedidos del sistema permanentemente.')) {
      if (window.confirm('Confirmación final: Esta acción no se puede deshacer.')) {
         for (const order of orders) {
            await deleteDoc(doc(db, 'orders', order.id));
         }
         alert('Todos los pedidos han sido eliminados.');
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file as any);
      if (index === undefined) {
         setEditingProduct(prev => prev ? { ...prev, imageUrl: url } : null);
      } else {
         const currentImages = [...(editingProduct?.images || [])];
         currentImages[index] = url;
         setEditingProduct(prev => prev ? { ...prev, images: currentImages } : null);
         if (index === 0 && !editingProduct?.imageUrl) {
            setEditingProduct(prev => prev ? { ...prev, imageUrl: url } : null);
         }
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white rounded-[3rem] p-10 space-y-8 shadow-2xl">
           <div className="space-y-2 text-center text-slate-800">
              <h1 className="text-2xl font-black tracking-tight">Acceso Admin</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ingresa tus credenciales</p>
           </div>
           <form onSubmit={handleSecretLogin} className="space-y-4">
              <input type="text" placeholder="Usuario" value={loginCreds.user} onChange={e => setLoginCreds(prev => ({ ...prev, user: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="password" placeholder="Contraseña" value={loginCreds.pass} onChange={e => setLoginCreds(prev => ({ ...prev, pass: e.target.value }))} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Entrar</button>
           </form>
           <button onClick={() => navigate('/')} className="w-full text-center text-[10px] font-black uppercase text-slate-300 tracking-widest">Volver a la tienda</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen animate-in fade-in duration-500 pb-32">
      <header className="space-y-6 pt-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
               <button onClick={() => navigate('/')} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                 <ArrowLeft className="w-5 h-5 text-slate-400" />
               </button>
               <div className="space-y-1">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">Consola Master</h1>
                  <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest leading-none">Impreza Operations</p>
               </div>
            </div>
         </div>

         <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-2xl shadow-sm">
            {['orders', 'products', 'categories'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", activeTab === tab ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "text-slate-400")}>
                {tab === 'orders' ? 'Ordenes' : tab === 'products' ? 'Productos' : 'Colecciones'}
              </button>
            ))}
         </div>
      </header>

      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Admin Order Actions */}
          <div className="grid grid-cols-2 gap-3 mb-4">
             <button 
                onClick={exportOrdersPDF}
                className="flex items-center justify-center gap-2 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-sm hover:bg-slate-50 transition-all"
             >
                <FileText className="w-4 h-4 text-indigo-600" />
                Exportar PDF
             </button>
             <button 
                onClick={clearAllOrders}
                className="flex items-center justify-center gap-2 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 shadow-sm hover:bg-red-50 transition-all"
             >
                <Trash className="w-4 h-4 text-red-400" />
                Borrar Pedidos
             </button>
          </div>

          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200/50 space-y-6">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                     <h4 className="font-black text-sm text-slate-800 line-clamp-1">{order.userName}</h4>
                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-tight">
                        {order.phone || 'Sin télefono'} • {order.cedula || 'Sin ID'}
                     </p>
                     <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">ID: {order.id.substring(0, 6).toUpperCase()}</p>
                  </div>
                  <div className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm", order.depositPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>{order.depositPaid ? 'Abono OK' : 'Esperando Pago'}</div>
               </div>

               {order.location && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                     <Tag className="w-3 h-3 text-slate-300" />
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{order.location}</p>
                  </div>
               )}

               <div className="space-y-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 italic">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-[-8px]">Items</p>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start text-xs not-italic">
                       <span className="font-black text-slate-800">{item.productName} (x{item.quantity})</span>
                       <span className="font-black text-slate-600 font-mono">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
               </div>
               <div className="grid grid-cols-2 gap-3">
                  {!order.depositPaid && <button onClick={() => updateStatus(order.id, 'validando', true)} className="col-span-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase">Confirmar Pago (50%)</button>}
                  {order.status === 'validando' && <button onClick={() => updateStatus(order.id, 'produccion')} className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest uppercase">Mandar a Taller</button>}
                  {order.status === 'produccion' && <button onClick={() => updateStatus(order.id, 'listo')} className="col-span-2 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs tracking-widest uppercase">Listo para Retiro</button>}
                  {order.status === 'listo' && <button onClick={() => updateStatus(order.id, 'entregado')} className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest uppercase">Confirmar Entrega</button>}
               </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
           <button onClick={() => setEditingProduct({ specs: { ...DEFAULT_SPECS }, colors: [], sizes: ['S', 'M', 'L', 'XL'], images: [] })} className="w-full bg-slate-900 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest">
              <Plus className="w-5 h-5" /> Nuevo Producto
           </button>
           <div className="grid grid-cols-1 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center gap-4 shadow-sm">
                   <img src={p.imageUrl} className="w-16 h-16 rounded-2xl object-cover" />
                   <div className="flex-1">
                      <h4 className="text-sm font-black text-slate-800 line-clamp-1">{p.name}</h4>
                      <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{formatCurrency(p.basePrice)} • {p.category}</p>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => setEditingProduct(p)} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600"><Settings className="w-5 h-5" /></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-3 bg-red-50 rounded-xl text-red-500/50 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
           <button onClick={() => setEditingCategory({ name: '', order: categories.length })} className="w-full bg-indigo-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100">
              <Plus className="w-5 h-5" /> Nueva Colección
           </button>
           <div className="space-y-3">
              {categories.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                      <Tag className="w-5 h-5 text-indigo-300" />
                      <span className="font-black text-sm text-slate-800">{c.name}</span>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => setEditingCategory(c)} className="p-2 text-slate-300 hover:text-indigo-600"><Settings className="w-4 h-4" /></button>
                      <button onClick={() => deleteCategory(c.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
             <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="w-full max-w-lg bg-white rounded-[3rem] p-10 overflow-y-auto max-h-[90vh] space-y-8 relative no-scrollbar">
                <div className="flex justify-between items-center sticky top-0 bg-white z-20 pb-4 border-b border-slate-50">
                   <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ficha de Información Completa</p>
                   </div>
                   <button onClick={() => setEditingProduct(null)} className="p-2 text-slate-300 hover:text-red-500"><X className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-10">
                   {/* Images Section */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-3">
                         <ImageIcon className="w-5 h-5 text-indigo-600" />
                         <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Galería (Max 4 fotos)</h4>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                         {[0,1,2,3].map(i => (
                           <label key={i} className="aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                              {editingProduct.images?.[i] ? (
                                <img src={editingProduct.images[i]} className="w-full h-full object-cover" />
                              ) : (
                                <Upload className="w-6 h-6 text-slate-200 group-hover:text-indigo-400" />
                              )}
                              <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, i)} accept="image/*" />
                           </label>
                         ))}
                      </div>
                   </div>

                   {/* General Details */}
                   <div className="space-y-5">
                      <div className="flex gap-4">
                        <select 
                          value={editingProduct.type || 'standard'} 
                          onChange={e => setEditingProduct({ ...editingProduct, type: e.target.value as any })}
                          className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        >
                           <option value="standard">T-Shirt Standard</option>
                           <option value="print">Imprenta (Vinil/Banner)</option>
                           <option value="service">Diseño / Servicio AI</option>
                           <option value="package">Paquete Escolar</option>
                        </select>
                        <select value={editingProduct.category || ''} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest" required>
                            <option value="">Colección</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                         </select>
                      </div>
                      
                      <input type="text" placeholder="Título" value={editingProduct.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black" required />
                      <textarea placeholder="Descripción" value={editingProduct.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold min-h-[100px]" required />
                      
                      <input type="number" placeholder="Precio Base ($)" value={editingProduct.basePrice || ''} onChange={e => setEditingProduct({ ...editingProduct, basePrice: Number(e.target.value) })} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black" required />
                   </div>

                   {editingProduct.type === 'package' && (
                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <Plus className="w-5 h-5 text-indigo-600" />
                           <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Items del Paquete</h4>
                        </div>
                        <div className="space-y-3">
                           {editingProduct.specs?.packageDetails?.map((item: any, idx: number) => (
                             <div key={idx} className="flex gap-2">
                                <input 
                                   placeholder="Item (p. ej: Franela)" 
                                   value={item.label} 
                                   onChange={e => {
                                      const newDetails = [...(editingProduct.specs?.packageDetails || [])];
                                      newDetails[idx].label = e.target.value;
                                      setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, packageDetails: newDetails } });
                                   }}
                                   className="flex-[2] p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold"
                                />
                                <input 
                                   type="number" 
                                   placeholder="Precio" 
                                   value={item.price} 
                                   onChange={e => {
                                      const newDetails = [...(editingProduct.specs?.packageDetails || [])];
                                      newDetails[idx].price = Number(e.target.value);
                                      setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, packageDetails: newDetails } });
                                   }}
                                   className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold"
                                />
                                <button type="button" onClick={() => {
                                   const newDetails = editingProduct.specs?.packageDetails?.filter((_: any, i: number) => i !== idx);
                                   setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, packageDetails: newDetails } });
                                }} className="p-4 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                             </div>
                           ))}
                           <button type="button" onClick={() => {
                              const newDetails = [...(editingProduct.specs?.packageDetails || []), { label: '', price: 0 }];
                              setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, packageDetails: newDetails } });
                           }} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-300">
                             + Agregar Item
                           </button>
                        </div>
                     </div>
                   )}

                   {/* Configuration */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-3">
                         <Settings className="w-5 h-5 text-indigo-600" />
                         <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Colores y Tallas</h4>
                      </div>
                      <div className="space-y-4">
                         <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest px-2">Colores (Click para agregar)</label>
                            <div className="flex flex-wrap gap-2 px-2">
                               {editingProduct.colors?.map(c => (
                                 <button key={c} type="button" onClick={() => setEditingProduct({ ...editingProduct, colors: editingProduct.colors?.filter(v => v !== c) })} className="w-8 h-8 rounded-lg border border-slate-100 shadow-sm relative group" style={{ backgroundColor: c }}>
                                    <X className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                 </button>
                               ))}
                               <input type="color" className="w-8 h-8 rounded-lg border border-slate-100 cursor-pointer" onChange={e => {
                                 if (!editingProduct.colors?.includes(e.target.value)) {
                                   setEditingProduct({ ...editingProduct, colors: [...(editingProduct.colors || []), e.target.value] });
                                 }
                               }} />
                            </div>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest px-2">Tallas</label>
                            <div className="flex flex-wrap gap-2 px-2">
                               {editingProduct.sizes?.map((sz, idx) => (
                                 <button key={`${sz}-${idx}`} type="button" onClick={() => setEditingProduct({ ...editingProduct, sizes: editingProduct.sizes?.filter((_, i) => i !== idx) })} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black">{sz}</button>
                               ))}
                               <div className="flex gap-1">
                                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'UNICA'].map(sz => (
                                     <button key={sz} type="button" onClick={() => {
                                       if (!editingProduct.sizes?.includes(sz)) {
                                          setEditingProduct({ ...editingProduct, sizes: [...(editingProduct.sizes || []), sz] });
                                       }
                                     }} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg text-[8px] font-black hover:bg-slate-200">{sz}</button>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Specs Section */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-3">
                         <Ruler className="w-5 h-5 text-indigo-600" />
                         <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ficha Técnica</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <input type="text" placeholder="Material" value={editingProduct.specs?.material || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, material: e.target.value } })} className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold" />
                         <input type="text" placeholder="Peso" value={editingProduct.specs?.weight || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, weight: e.target.value } })} className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold" />
                         <input type="text" placeholder="Fit" value={editingProduct.specs?.fit || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, fit: e.target.value } })} className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold" />
                         <input type="text" placeholder="Género" value={editingProduct.specs?.gender || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, gender: e.target.value } })} className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold" />
                         <input type="text" placeholder="Cuidados" value={editingProduct.specs?.care || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, care: e.target.value } })} className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold col-span-2" />
                         <input type="text" placeholder="Dimensiones" value={editingProduct.specs?.dimensions || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, dimensions: e.target.value } })} className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold col-span-2" />
                      </div>
                   </div>

                   {/* Color Map Image Assignment */}
                   {(editingProduct.images?.filter(Boolean).length || 0) > 0 && (
                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <ImageIcon className="w-5 h-5 text-indigo-600" />
                           <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mapeo Color → Foto</h4>
                        </div>
                        <div className="space-y-2">
                           {editingProduct.colors?.map(col => (
                             <div key={col} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="w-8 h-8 rounded-lg shadow-inner" style={{ backgroundColor: col }} />
                                <select 
                                   value={editingProduct.colorMap?.[col] || ''} 
                                   onChange={e => setEditingProduct({ ...editingProduct, colorMap: { ...(editingProduct.colorMap || {}), [col]: e.target.value } })}
                                   className="flex-1 bg-transparent border-none text-[10px] font-black uppercase outline-none"
                                >
                                   <option value="">Cualquier foto</option>
                                   {editingProduct.images?.map((img, idx) => <option key={idx} value={img}>Foto #{idx + 1}</option>)}
                                </select>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   <div className="sticky bottom-0 bg-white pt-6 pb-2 grid grid-cols-2 gap-4 border-t border-slate-50">
                      <button type="button" onClick={() => setEditingProduct(null)} className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cancelar</button>
                      <button type="submit" className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100">Guardar Cambios</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}

        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white rounded-[3rem] p-10 space-y-8 shadow-2xl">
                <div className="space-y-2 text-center text-slate-800">
                   <h3 className="text-xl font-black tracking-tight">{editingCategory.id ? 'Editar Colección' : 'Nueva Colección'}</h3>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Organiza tu pantalla principal</p>
                </div>
                <form onSubmit={handleSaveCategory} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest pl-2">Nombre de la Colección</label>
                      <input type="text" value={editingCategory.name || ''} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black" required />
                   </div>
                   <div className="flex items-center gap-3 px-2">
                      <input 
                        type="checkbox" 
                        checked={editingCategory.isExternalLink || false} 
                        onChange={e => setEditingCategory({ ...editingCategory, isExternalLink: e.target.checked })}
                        className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500"
                      />
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Es enlace externo (WhatsApp)</label>
                   </div>
                   <div className="flex gap-4">
                      <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cerrar</button>
                      <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100">Guardar</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
