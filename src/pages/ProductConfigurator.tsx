import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, PrintingTechnique, OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Upload, Check, Info, Zap, AlertCircle, X, Package, Heart } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

const STEPS_MAP = {
  standard: [
    { id: 'base', label: 'Base', description: 'Talla y Color' },
    { id: 'technique', label: 'Técnica', description: 'Acabado' },
    { id: 'design', label: 'Diseño', description: 'Arte y Ubicación' },
  ],
  print: [
    { id: 'material', label: 'Material', description: 'Tipo y Tamaño' },
    { id: 'design', label: 'Arte', description: 'Subir Archivos' },
  ],
  service: [
    { id: 'requirements', label: 'Briefing', description: 'Detalles del Diseño' },
  ],
  package: [
    { id: 'items', label: 'Contenido', description: 'Personalizar Combo' },
  ]
};

const TECHNIQUES: { id: PrintingTechnique; label: string; description: string; price: number }[] = [
  { id: 'DTF', label: 'Direct to Film', description: 'Alta durabilidad y colores vivos.', price: 5 },
  { id: 'Vinil', label: 'Vinil Textil', description: 'Ideal para logos y nombres.', price: 4 },
  { id: 'Sublimación', label: 'Sublimación', description: 'Telas blancas y poliester.', price: 3 },
  { id: 'Transfer', label: 'Transfer', description: 'Rápido y económico para eventos.', price: 2 },
];

const PRINT_MATERIALS = [
  { id: 'banner', label: 'Banner 13oz', price: 15 },
  { id: 'vinil', label: 'Vinil Adhesivo', price: 12 },
  { id: 'bond', label: 'Papel Bond', price: 0.5 },
  { id: 'dtf', label: 'DTF por Metro', price: 25 },
  { id: 'sublimacion', label: 'Subli por Metro', price: 10 },
];

export function ProductConfigurator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState<PrintingTechnique | string>('DTF');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Custom states for new types
  const [selectedMaterial, setSelectedMaterial] = useState(PRINT_MATERIALS[0].id);
  const [requirements, setRequirements] = useState('');
  const [packageItems, setPackageItems] = useState<string[]>([]);
  const [printDimensions, setPrintDimensions] = useState('1m x 1m');

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const p = { id: docSnap.id, ...docSnap.data() } as Product;
        setProduct(p);
        setSelectedColor(p.colors?.[0] || '');
        setSelectedSize(p.sizes?.[0] || '');
        if (p.type === 'package') {
           setPackageItems(p.specs?.packageDetails?.map((d: any) => d.label) || []);
        }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  const pType = product?.type || 'standard';
  const steps = STEPS_MAP[pType as keyof typeof STEPS_MAP] || STEPS_MAP.standard;

  const handleNextStep = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      addToCart(false);
    }
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const calculateUnitTotal = () => {
    if (!product) return 0;
    if (pType === 'service') return product.basePrice;
    if (pType === 'print') {
       const matPrice = PRINT_MATERIALS.find(m => m.id === selectedMaterial)?.price || 0;
       return matPrice;
    }
    if (pType === 'package') {
       const base = product.basePrice;
       const extras = product.specs?.packageDetails
          ?.filter((d: any) => packageItems.includes(d.label))
          .reduce((sum: number, d: any) => sum + d.price, 0) || 0;
       return base + extras;
    }
    const techPrice = TECHNIQUES.find(t => t.id === selectedTechnique)?.price || 0;
    const locationsPrice = selectedLocations.length * 2;
    return product.basePrice + techPrice + locationsPrice;
  };

  const currentImage = (product?.colorMap && selectedColor && product.colorMap[selectedColor]) 
    ? product.colorMap[selectedColor] 
    : product?.imageUrl;

  const unitTotal = calculateUnitTotal();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      setError('Máximo 5 imágenes permitidas');
      return;
    }
    setError(null);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const addToCart = (isDirect = false) => {
    if (!product) return;
    const finalPrice = isDirect ? product.basePrice : unitTotal;
    const item: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      price: finalPrice,
      customization: {
        color: selectedColor,
        size: selectedSize,
        technique: selectedTechnique,
        locations: selectedLocations,
        images: images,
        material: pType === 'print' ? selectedMaterial : undefined,
        description: pType === 'service' ? requirements : undefined,
        packageItems: pType === 'package' ? packageItems : undefined
      }
    };

    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    localStorage.setItem('cart', JSON.stringify([...currentCart, item]));
    navigate('/cart');
  };

  if (loading || !product) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentStepData = steps[step];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Header */}
      <div className="pt-8 px-6 pb-4 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
           </button>
           <h1 className="text-xl font-black text-slate-800 tracking-tight">Detalle de Producto</h1>
        </div>
        <div className="flex gap-2">
           <button className="p-2 bg-slate-50 rounded-xl text-slate-400">
              <Zap className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-48 no-scrollbar">
        <div className="pt-6 space-y-8">
           {/* Product hero with quick specs */}
           <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-[3rem] aspect-[4/5] overflow-hidden border border-slate-100 relative group">
                    <div className="absolute top-8 right-8 z-20">
                       <button className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/50 text-slate-400 hover:text-red-500 transition-colors active:scale-90">
                          <Heart className="w-6 h-6" />
                       </button>
                    </div>
                   <motion.img 
                      key={currentImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={currentImage} 
                      className="w-full h-full object-cover" 
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                
                {/* Gallery */}
                {product.images && product.images.length > 0 && (
                   <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                      {[product.imageUrl, ...product.images].map((img, i) => (
                        <button 
                          key={i} 
                          onClick={() => {}} // Could set a preview state if needed
                          className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0"
                        >
                          <img src={img} className="w-full h-full object-cover" />
                        </button>
                      ))}
                   </div>
                )}
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">{product.category}</p>
                       <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{product.name}</h2>
                    </div>
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                       <span className="text-[10px] font-black text-emerald-600 uppercase">En Stock</span>
                    </div>
                 </div>
                 
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {product.description}
                 </p>
              </div>
           </div>

            {/* Technical Spec Sheet - Only for standard products */}
            {product.specs && pType === 'standard' && (
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="h-0.5 w-6 bg-indigo-600 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Ficha Técnica</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100 rounded-[2rem] overflow-hidden">
                    {Object.entries(product.specs).filter(([key, val]) => val && !['packageDetails', 'externalLink', 'type'].includes(key)).map(([key, val], idx) => (
                      <div key={`${key}-${idx}`} className="bg-white p-5 space-y-1">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest capitalize">{key}</span>
                         <p className="text-xs font-black text-slate-700">{String(val)}</p>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* Extra Info Section - Only for standard products */}
            {pType === 'standard' && (
              <div className="grid grid-cols-1 gap-4">
                 <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                       <Info className="w-4 h-4 text-slate-400" />
                       <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Cuidado de la Prenda</h4>
                    </div>
                    <ul className="text-[10px] text-slate-400 font-bold space-y-1 ml-6 list-disc">
                       <li>Lavar con agua fría (máx 30°C)</li>
                       <li>No usar blanqueadores</li>
                       <li>Planchar al revés para proteger el estampado</li>
                    </ul>
                 </div>
              </div>
            )}

           {/* Customization Options Trigger */}
           <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="h-0.5 w-6 bg-indigo-600 rounded-full" />
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Configuración</h3>
             </div>

             <div className="space-y-8">
                {/* Step Tracker for Configurator */}
                <div className="flex gap-2">
                   {steps.map((s, i) => (
                     <button 
                       key={s.id} 
                       onClick={() => setStep(i)}
                       className={cn(
                         "h-1 flex-1 rounded-full transition-all duration-500",
                         i <= step ? "bg-indigo-600" : "bg-slate-200"
                       )} 
                     />
                   ))}
                 </div>

                 <div className="space-y-8">
                    <div className="flex justify-between items-end">
                       <div className="space-y-0.5">
                          <h4 className="text-sm font-black text-slate-800">{currentStepData.label}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentStepData.description}</p>
                       </div>
                       <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">PASO {step + 1}/{steps.length}</span>
                    </div>

                    <AnimatePresence mode="wait">
                       <motion.div
                         key={pType + step}
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         className="space-y-8"
                       >
                          {pType === 'standard' && (
                             <>
                              {step === 0 && (
                                <div className="space-y-8">
                                   <div className="space-y-4">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Talla</label>
                                      <div className="flex flex-wrap gap-2">
                                         {product.sizes.map(size => (
                                            <button
                                              key={size}
                                              onClick={() => setSelectedSize(size)}
                                              className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border-2 transition-all",
                                                selectedSize === size ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-100" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                              )}
                                            >
                                              {size}
                                            </button>
                                         ))}
                                      </div>
                                   </div>

                                   <div className="space-y-4">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Color</label>
                                      <div className="flex flex-wrap gap-4">
                                         {product.colors.map(color => (
                                            <button
                                              key={color}
                                              onClick={() => setSelectedColor(color)}
                                              className={cn(
                                                "w-10 h-10 rounded-2xl border-4 shadow-sm transition-all hover:scale-110",
                                                selectedColor === color ? "border-indigo-600 ring-4 ring-indigo-50 scale-110" : "border-white"
                                              )}
                                              style={{ backgroundColor: color }}
                                            />
                                         ))}
                                      </div>
                                   </div>
                                </div>
                              )}

                              {step === 1 && (
                                <div className="space-y-4">
                                   {TECHNIQUES.map(tech => (
                                      <button
                                        key={tech.id}
                                        onClick={() => setSelectedTechnique(tech.id)}
                                        className={cn(
                                          "w-full p-5 text-left rounded-[2.5rem] border-2 transition-all relative overflow-hidden group",
                                          selectedTechnique === tech.id ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 bg-white hover:border-slate-200"
                                        )}
                                      >
                                        <div className="flex justify-between items-start mb-1">
                                          <span className={cn("font-black text-xs uppercase tracking-widest", selectedTechnique === tech.id ? "text-indigo-600" : "text-slate-800")}>
                                            {tech.label}
                                          </span>
                                          {selectedTechnique === tech.id && (
                                            <div className="bg-indigo-600 rounded-lg p-1.5 shadow-lg shadow-indigo-200">
                                               <Check className="w-3 h-3 text-white" />
                                            </div>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed pr-12">{tech.description}</p>
                                        <div className="mt-4 inline-flex items-center gap-2 text-[8px] font-black text-white bg-indigo-600 px-3 py-1 rounded-full tracking-widest uppercase">
                                          +{formatCurrency(tech.price)}
                                        </div>
                                      </button>
                                   ))}
                                </div>
                              )}

                              {step === 2 && (
                                <div className="space-y-8">
                                   <div className="space-y-4">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ubicación del Estampado</label>
                                      <div className="grid grid-cols-4 gap-3 mt-4">
                                         {[
                                           { id: 'front', label: 'Frontal', icon: '👕' },
                                           { id: 'chest', label: 'Pecho', icon: '📍' },
                                           { id: 'back', label: 'Espalda', icon: '🏷️' },
                                           { id: 'sleeve', label: 'Manga', icon: '🧵' }
                                         ].map(loc => (
                                            <button
                                              key={loc.id}
                                              onClick={() => setSelectedLocations(prev => prev.includes(loc.id) ? prev.filter(l => l !== loc.id) : [...prev, loc.id])}
                                              className={cn(
                                                "p-4 flex flex-col items-center gap-2 rounded-2xl border-2 transition-all",
                                                selectedLocations.includes(loc.id) ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-50 bg-white"
                                              )}
                                            >
                                              <span className="text-xl">{loc.icon}</span>
                                              <span className="text-[8px] font-black uppercase tracking-tight">{loc.label}</span>
                                            </button>
                                         ))}
                                      </div>
                                   </div>

                                   <div className="space-y-4">
                                      <div className="flex justify-between items-center pt-4">
                                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Arte / Logo / Referencias</label>
                                         <span className={cn("text-[8px] font-black", images.length >= 5 ? "text-red-500" : "text-slate-300")}>
                                            {images.length}/5
                                         </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-4 gap-3">
                                         <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white cursor-pointer hover:border-indigo-400 transition-all group">
                                            <Upload className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                            <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                                         </label>
                                         {images.map((img, i) => (
                                            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group shadow-sm">
                                               <img src={img} alt="Upload" className="w-full h-full object-cover" />
                                               <button 
                                                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                                  className="absolute inset-0 bg-red-500/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                               >
                                                  <X className="w-5 h-5 font-bold" />
                                               </button>
                                            </div>
                                         ))}
                                      </div>
                                   </div>
                                </div>
                              )}
                             </>
                          )}

                          {pType === 'print' && (
                             <>
                               {step === 0 && (
                                  <div className="space-y-8">
                                     <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Material</label>
                                        <div className="grid grid-cols-1 gap-3">
                                           {PRINT_MATERIALS.map(m => (
                                              <button 
                                                 key={m.id}
                                                 onClick={() => setSelectedMaterial(m.id)}
                                                 className={cn("p-5 rounded-3xl border-2 text-left flex justify-between items-center transition-all", selectedMaterial === m.id ? "border-indigo-600 bg-indigo-50" : "border-slate-100")}
                                              >
                                                 <span className="text-xs font-black uppercase text-slate-800 tracking-tight">{m.label}</span>
                                                 <span className="text-[10px] font-black text-indigo-600">{formatCurrency(m.price)}/m²</span>
                                              </button>
                                           ))}
                                        </div>
                                     </div>
                                     <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Medidas (Ej: 100cm x 50cm)</label>
                                        <input 
                                           type="text" 
                                           placeholder="Ej: 2m x 1.5m"
                                           value={printDimensions} 
                                           onChange={e => setPrintDimensions(e.target.value)}
                                           className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                     </div>
                                     <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detalles adicionales del pedido</label>
                                        <textarea 
                                           placeholder="Indica acabados especiales, cortes o notas..."
                                           value={requirements}
                                           onChange={e => setRequirements(e.target.value)}
                                           className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-medium min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                     </div>
                                  </div>
                               )}

                               {step === 1 && (
                                  <div className="space-y-4">
                                     <div className="flex justify-between items-center">
                                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subir Archivos (Max 5)</label>
                                         <span className={cn("text-[8px] font-black", images.length >= 5 ? "text-red-500" : "text-slate-300")}>
                                            {images.length}/5
                                         </span>
                                      </div>
                                      <div className="grid grid-cols-4 gap-3">
                                         <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white cursor-pointer hover:border-indigo-400 transition-all group">
                                            <Upload className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                            <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                                         </label>
                                         {images.map((img, i) => (
                                            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group shadow-sm">
                                               <img src={img} alt="Upload" className="w-full h-full object-cover" />
                                               <button 
                                                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                                  className="absolute inset-0 bg-red-500/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                               >
                                                  <X className="w-5 h-5 font-bold" />
                                               </button>
                                            </div>
                                         ))}
                                      </div>
                                  </div>
                               )}
                             </>
                          )}

                          {pType === 'service' && (
                              <div className="space-y-6">
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Requerimientos del Diseño</label>
                                    <textarea 
                                       placeholder="Describe tu idea, colores, estilos..."
                                       value={requirements}
                                       onChange={e => setRequirements(e.target.value)}
                                       className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium min-h-[150px]"
                                    />
                                 </div>
                                 <div className="space-y-4">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Referencias visuales</label>
                                     <div className="grid grid-cols-4 gap-3">
                                         <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white cursor-pointer hover:border-indigo-400 transition-all group">
                                            <Upload className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                            <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                                         </label>
                                         {images.map((img, i) => (
                                            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 group shadow-sm">
                                               <img src={img} alt="Upload" className="w-full h-full object-cover" />
                                               <button 
                                                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                                  className="absolute inset-0 bg-red-500/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                               >
                                                  <X className="w-5 h-5 font-bold" />
                                               </button>
                                            </div>
                                         ))}
                                      </div>
                                  </div>
                              </div>
                          )}

                          {pType === 'package' && (
                              <div className="space-y-6">
                                 <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personalizar Paquete Escolar</label>
                                    <button 
                                      onClick={() => {
                                        const allLabels = product.specs?.packageDetails?.map((d: any) => d.label) || [];
                                        if (packageItems.length === allLabels.length) {
                                           setPackageItems([]);
                                        } else {
                                           setPackageItems(allLabels);
                                        }
                                      }}
                                      className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100"
                                    >
                                      {packageItems.length === (product.specs?.packageDetails?.length || 0) ? 'Quitar Todos' : 'Seleccionar Todos'}
                                    </button>
                                 </div>
                                 <div className="space-y-3">
                                    {product.specs?.packageDetails?.map((d: any, idx: number) => (
                                       <button 
                                          key={`${d.label}-${idx}`}
                                          onClick={() => setPackageItems(prev => prev.includes(d.label) ? prev.filter(p => p !== d.label) : [...prev, d.label])}
                                          className={cn("w-full p-5 rounded-3xl border-2 flex justify-between items-center transition-all", packageItems.includes(d.label) ? "border-indigo-600 bg-indigo-50" : "border-slate-100")}
                                       >
                                          <div className="flex items-center gap-3">
                                             <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors", packageItems.includes(d.label) ? "bg-indigo-600 border-indigo-600" : "border-slate-200")}>
                                                {packageItems.includes(d.label) && <Check className="w-3 h-3 text-white" />}
                                             </div>
                                             <span className="text-xs font-black uppercase text-slate-800 tracking-tight">{d.label}</span>
                                          </div>
                                          <span className="text-[10px] font-black text-slate-400">+{formatCurrency(d.price)}</span>
                                       </button>
                                    ))}
                                 </div>
                              </div>
                          )}
                       </motion.div>
                    </AnimatePresence>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Dynamic Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-white/80 backdrop-blur-2xl border-t border-slate-100 max-w-lg mx-auto z-30">
         <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
               <button onClick={() => setQuantity(q => Math.max(q-1, 1))} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-800 flex items-center justify-center font-black active:scale-90 transition-all">-</button>
               <span className="font-black w-10 text-center text-sm">{quantity}</span>
               <button onClick={() => setQuantity(q => q+1)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-800 flex items-center justify-center font-black active:scale-90 transition-all">+</button>
            </div>
            <div className="text-right">
               <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] block leading-none mb-1">Inversión Final</span>
               <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(unitTotal * quantity)}</span>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <button 
               onClick={() => addToCart(true)}
               className="py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-[1.5rem] font-black text-[10px] tracking-widest uppercase hover:bg-slate-50 transition-all active:scale-95"
            >
               Comprar Base
            </button>
            <button 
               onClick={handleNextStep}
               className="py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] tracking-widest uppercase shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
               {step === steps.length - 1 ? (
                 <>
                   <Check className="w-3 h-3" />
                   Finalizar
                 </>
               ) : (
                 <>
                   <Zap className="w-3 h-3" />
                   Siguiente
                 </>
               )}
            </button>
         </div>
      </div>
    </div>
  );
}
