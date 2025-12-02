import React, { useState, useEffect } from 'react';
import { Calculator, Settings, Plus, Trash2, Truck, Package, ChevronRight, AlertCircle, FileSpreadsheet, X, Check, AlertTriangle, FileText, BarChart3, PieChart, ChevronDown, ChevronUp, Loader2, Eraser, Users, LogOut, LogIn, Cloud } from 'lucide-react';

// --- SUPABASE AYARLARI ---
const supabaseUrl = 'https://dlyjjmjbzifbvgsiuldo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseWpqbWpiemlmYnZnc2l1bGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTQ0MTksImV4cCI6MjA4MDI3MDQxOX0.OhCpzQtMPf6i1azak1FxxncRYYjIdh-wroT1kuAxJ3c';

// --- SUPABASE YÜKLEYİCİ ---
function useSupabaseLoader() {
  const [supabase, setSupabase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.supabase) {
      const client = window.supabase.createClient(supabaseUrl, supabaseKey);
      setSupabase(client);
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.async = true;
    script.onload = () => {
      if (window.supabase) {
        const client = window.supabase.createClient(supabaseUrl, supabaseKey);
        setSupabase(client);
        setLoading(false);
      }
    };
    script.onerror = () => {
      console.error("Supabase kütüphanesi yüklenemedi.");
      setLoading(false);
    };
    document.body.appendChild(script);
  }, []);

  return { supabase, libLoading: loading };
}

// Cihaz Kimliği (Auth yerine)
const getDeviceId = () => {
  let deviceId = localStorage.getItem('kargo_app_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('kargo_app_device_id', deviceId);
  }
  return deviceId;
};

export default function KargoApp() {
  const { supabase, libLoading } = useSupabaseLoader();
  const deviceId = getDeviceId(); 

  if (libLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-blue-900">
        <Loader2 className="animate-spin w-12 h-12 mb-4"/>
        <p className="font-semibold">Sistem Başlatılıyor...</p>
      </div>
    );
  }

  return <MainApp supabase={supabase} deviceId={deviceId} />;
}

// --- ANA UYGULAMA ---
function MainApp({ supabase, deviceId }) {
  const [activeTab, setActiveTab] = useState('simulation');
  const [sellers, setSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(true);

  // Verileri Çek
  const fetchSellers = async () => {
    setLoadingSellers(true);
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
        console.error('Error fetching sellers:', error);
        setSellers([]); 
    } else {
        setSellers(data || []);
    }
    setLoadingSellers(false);
  };

  useEffect(() => {
    if(supabase) fetchSellers();
  }, [supabase]);

  // HESAPLAMA MOTORU
  const calculatePrice = (seller, inputDesi) => {
    if (!seller || !inputDesi || inputDesi <= 0) return null;
    const currentTiers = seller.tiers || [];
    const sortedTiers = [...currentTiers].sort((a, b) => (parseFloat(a.limit) || 0) - (parseFloat(b.limit) || 0));
    if (sortedTiers.length === 0) return null;

    const maxTier = sortedTiers[sortedTiers.length - 1];
    let result = { basePrice: 0, extraDesi: 0, extraCost: 0, total: 0, method: '' };
    const maxLimit = parseFloat(maxTier.limit) || 0;
    const maxPrice = parseFloat(maxTier.price) || 0;
    const factor = parseFloat(seller.plus_factor) || 0; 

    if (inputDesi > maxLimit) {
      result.basePrice = maxPrice;
      result.extraDesi = inputDesi - maxLimit;
      result.extraCost = result.extraDesi * factor;
      result.total = result.basePrice + result.extraCost;
      result.method = 'plus';
    } else {
      const matchedTier = sortedTiers.find(t => (parseFloat(t.limit) || 0) >= inputDesi);
      if (matchedTier) {
        result.basePrice = parseFloat(matchedTier.price) || 0;
        result.total = result.basePrice;
        result.method = 'standard';
        result.matchedLimit = matchedTier.limit;
      }
    }
    return result;
  };

  // DB İşlemleri
  const dbActions = {
    addSeller: async (newSellerData) => {
      const payload = {
        user_id: deviceId, // Bu cihazın ID'sini kaydediyoruz
        name: newSellerData.name,
        description: newSellerData.description,
        plus_factor: newSellerData.plusFactor,
        tiers: newSellerData.tiers
      };
      
      const { data, error } = await supabase.from('sellers').insert([payload]).select();
      
      if (error) {
          console.error("Ekleme Hatası:", error);
          alert(`Kayıt eklenemedi: ${error.message}`);
      } else if (data) {
        // Listeyi güncelle (önceki state'i koruyarak)
        setSellers(prev => [...prev, data[0]]);
        return data[0].id;
      }
    },
    updateSeller: async (id, data) => {
      const payload = { ...data };
      if (payload.plusFactor !== undefined) {
        payload.plus_factor = payload.plusFactor;
        delete payload.plusFactor;
      }
      
      const { error } = await supabase
        .from('sellers')
        .update(payload)
        .eq('id', id);

      if (!error) {
        setSellers(prev => prev.map(s => s.id === id ? { ...s, ...data, ...(payload.plus_factor !== undefined && { plus_factor: payload.plus_factor }) } : s));
      } else {
          console.error("Güncelleme Hatası:", error);
          alert("Güncelleme sırasında hata oluştu.");
      }
    },
    deleteSeller: async (id) => {
      const { error } = await supabase
        .from('sellers')
        .delete()
        .eq('id', id);

      if (!error) {
        setSellers(prev => prev.filter(s => s.id !== id));
      } else {
          console.error("Silme Hatası:", error);
          alert("Silme işlemi başarısız. Yetkiniz olmayabilir.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-blue-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Truck className="w-8 h-8 text-blue-300" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">Lojistik Maliyet Hesaplayıcı</h1>
              <div className="flex items-center gap-1 text-xs text-blue-300">
                <Cloud size={12} className="text-green-400"/> DB Bağlı
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex bg-blue-800 rounded-lg p-1 overflow-x-auto flex-1 md:flex-none">
              <button onClick={() => setActiveTab('simulation')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all ${activeTab === 'simulation' ? 'bg-white text-blue-900 shadow' : 'text-blue-200 hover:text-white'}`}>
                <Calculator size={18} /> <span className="hidden sm:inline">Simülasyon</span>
              </button>
              <button onClick={() => setActiveTab('batch')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all ${activeTab === 'batch' ? 'bg-white text-blue-900 shadow' : 'text-blue-200 hover:text-white'}`}>
                <FileText size={18} /> <span className="hidden sm:inline">Toplu İşlem</span>
              </button>
              <button onClick={() => setActiveTab('admin')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all ${activeTab === 'admin' ? 'bg-white text-blue-900 shadow' : 'text-blue-200 hover:text-white'}`}>
                <Settings size={18} /> <span className="hidden sm:inline">Yönetim</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {loadingSellers ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-2" />
                <p>Veriler yükleniyor...</p>
            </div>
        ) : (
            <>
                {activeTab === 'simulation' && <SimulationView sellers={sellers} calculatePrice={calculatePrice} />}
                {activeTab === 'batch' && <BatchCalculationView sellers={sellers} calculatePrice={calculatePrice} />}
                {activeTab === 'admin' && <AdminView sellers={sellers} dbActions={dbActions} />}
            </>
        )}
      </main>
    </div>
  );
}

// --- ALT BİLEŞENLER ---

function SimulationView({ sellers, calculatePrice }) {
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [desiInput, setDesiInput] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (sellers.length > 0) {
        if (!selectedSellerId || !sellers.find(s => s.id === selectedSellerId)) {
            setSelectedSellerId(sellers[0].id);
        }
    }
  }, [sellers, selectedSellerId]);

  const handleCalculate = () => {
    const seller = sellers.find(s => s.id === selectedSellerId);
    if (seller && desiInput) {
      const res = calculatePrice(seller, parseFloat(desiInput));
      setResult(res);
    }
  };

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-blue-900 flex items-center gap-2">
          <Package className="w-5 h-5" /> Tekil Hesaplama
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Satıcı Seçimi</label>
            <select value={selectedSellerId} onChange={(e) => { setSelectedSellerId(e.target.value === "" ? "" : parseInt(e.target.value)); setResult(null); }} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50">
              {sellers.length === 0 && <option value="">Tanımlı satıcı yok...</option>}
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.description ? ` - ${s.description}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Paket Desisi</label>
            <input type="number" value={desiInput} onChange={(e) => setDesiInput(e.target.value)} placeholder="Örn: 25" className="w-full border border-gray-300 rounded-lg p-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={handleCalculate} disabled={!desiInput || sellers.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition-colors disabled:opacity-50">Maliyet Hesapla</button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col justify-center">
        {!result ? (
          <div className="text-center text-gray-400 py-8"><Calculator className="w-12 h-12 mx-auto mb-2 opacity-20" /><p>Hesaplama yapmak için veri giriniz.</p></div>
        ) : (
          <div className="animate-fade-in">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Hesaplanan Maliyet</h3>
            <div className="text-4xl font-extrabold text-blue-900 mb-1">{result.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</div>
            <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex justify-between"><span>Yöntem:</span><span className="font-bold">{result.method === 'plus' ? 'Barem Üstü (Plus)' : 'Standart Barem'}</span></li>
                    {result.method === 'plus' && <li className="flex justify-between text-red-600"><span>Ekstra Desi:</span><span>+{result.extraDesi.toFixed(2)}</span></li>}
                </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BatchCalculationView({ sellers, calculatePrice }) {
    const [rawText, setRawText] = useState('');
    const [batchResults, setBatchResults] = useState(null);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInputExpanded, setIsInputExpanded] = useState(true);
    const [isListExpanded, setIsListExpanded] = useState(true);

    const handleBatchProcess = () => {
        if (!rawText.trim()) return;
        setIsLoading(true);
        setTimeout(() => {
            const lines = rawText.trim().split(/\r?\n/);
            const results = [];
            const sellerStats = {};
            let totalGrand = 0;

            lines.forEach((line, index) => {
                const cols = line.split('\t');
                if (cols.length < 2) return; 
                let deliveryNo = '-', sellerCode = '', desiRaw = '';
                if (cols.length >= 3) { deliveryNo = cols[0].trim(); sellerCode = cols[1].trim(); desiRaw = cols[2].trim(); } 
                else { sellerCode = cols[0].trim(); desiRaw = cols[1].trim(); }

                if (isNaN(parseFloat(desiRaw.replace(',', '.')))) return;
                const desi = parseFloat(desiRaw.replace(',', '.'));
                const seller = sellers.find(s => s.name.toLowerCase() === sellerCode.toLowerCase());
                
                let rowResult = { id: index, deliveryNo, sellerCode, sellerName: seller ? seller.name : 'Bilinmiyor', desi, cost: 0, status: 'error' };

                if (seller) {
                    const calc = calculatePrice(seller, desi);
                    if (calc) {
                        rowResult.cost = calc.total;
                        rowResult.status = 'success';
                        totalGrand += calc.total;
                        if (!sellerStats[seller.name]) sellerStats[seller.name] = { count: 0, total: 0, displayName: seller.description ? `${seller.name} - ${seller.description}` : seller.name };
                        sellerStats[seller.name].count += 1;
                        sellerStats[seller.name].total += calc.total;
                    }
                }
                results.push(rowResult);
            });
            setBatchResults(results);
            setSummary({ total: totalGrand, stats: sellerStats });
            setIsLoading(false);
            setIsInputExpanded(false);
            setIsListExpanded(true);
        }, 800); 
    };

    const totalAvg = summary && batchResults && batchResults.length > 0 ? summary.total / batchResults.length : 0;

    return (
        <div className="space-y-6 animate-fade-in relative min-h-[500px]">
            {isLoading && <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center rounded-xl"><Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" /><p className="text-blue-900 font-semibold">Hesaplama Yapılıyor...</p></div>}
            
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div onClick={() => setIsInputExpanded(!isInputExpanded)} className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100">
                    <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2"><FileSpreadsheet size={20}/> Excel Veri Girişi</h2>
                    {isInputExpanded ? <ChevronUp className="text-gray-400"/> : <ChevronDown className="text-gray-400"/>}
                </div>
                {isInputExpanded && (
                    <div className="p-6 border-t border-gray-100">
                        <textarea className="w-full h-32 p-3 border rounded-lg font-mono text-xs outline-none" placeholder="Excel verilerini buraya yapıştırın..." value={rawText} onChange={(e) => setRawText(e.target.value)}></textarea>
                        <div className="mt-3 flex justify-end gap-2">
                            <button onClick={() => {setRawText(''); setBatchResults(null);}} className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 px-4 rounded-lg flex gap-2"><Eraser size={18}/> Temizle</button>
                            <button onClick={handleBatchProcess} disabled={!rawText} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex gap-2 disabled:opacity-50"><Calculator size={18}/> Rapor Oluştur</button>
                        </div>
                    </div>
                )}
            </div>

            {batchResults && !isLoading && (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100 text-center">
                            <h3 className="text-gray-500 font-medium text-sm uppercase">Toplam Maliyet</h3>
                            <div className="text-4xl font-extrabold text-blue-900 mt-2">{summary.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-lg text-gray-400">TL</span></div>
                            <div className="mt-2 inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">Ort: {totalAvg.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL / Kayıt</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <h3 className="text-gray-700 font-bold mb-4 flex items-center gap-2"><BarChart3 size={18} /> Satıcı Bazlı Dağılım</h3>
                            <div className="space-y-4">
                                {Object.entries(summary.stats).map(([name, stat]) => {
                                    const percentage = (stat.total / summary.total) * 100;
                                    const avgCost = stat.total / stat.count;
                                    return (
                                        <div key={name} className="text-sm">
                                            <div className="flex justify-between mb-1">
                                                <div className="flex flex-col gap-1 w-full overflow-hidden">
                                                    <span className="font-medium text-gray-700 truncate">{stat.displayName}</span>
                                                    <div className="flex gap-1"><span className="text-[10px] bg-gray-100 px-1 rounded">{stat.count.toLocaleString('tr-TR')} Adet</span><span className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded">Ort: {avgCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span></div>
                                                </div>
                                                <span className="font-bold text-gray-900">{stat.total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div></div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col max-h-[800px]">
                        <div onClick={() => setIsListExpanded(!isListExpanded)} className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between items-center cursor-pointer">
                            <span>Detaylı Liste</span> {isListExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </div>
                        {isListExpanded && (
                            <div className="overflow-y-auto flex-1"><table className="w-full text-sm text-left"><thead className="bg-gray-100 text-gray-600 sticky top-0"><tr><th className="p-3">Teslimat No</th><th className="p-3">Satıcı</th><th className="p-3 text-right">Tutar</th></tr></thead><tbody className="divide-y divide-gray-100">{batchResults.map(row => (<tr key={row.id}><td className="p-3 font-mono">{row.deliveryNo}</td><td className="p-3">{row.sellerCode}</td><td className="p-3 text-right font-bold">{row.cost > 0 ? row.cost.toLocaleString('tr-TR') : '-'}</td></tr>))}</tbody></table></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminView({ sellers, dbActions }) {
  const [editingId, setEditingId] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState(null);

  const addNewSeller = async () => {
    let baseName = "Yeni Satıcı";
    let newName = baseName;
    let counter = 1;
    
    while (sellers.some(s => s.name === newName)) {
        newName = `${baseName} (${counter})`;
        counter++;
    }

    const newSellerData = {
      name: newName,
      description: "", 
      plusFactor: 0,
      tiers: [{ id: Date.now(), limit: 10, price: 100 }]
    };

    const newId = await dbActions.addSeller(newSellerData);
    if(newId) setEditingId(newId);
  };

  const handleImport = async (parsedData) => {
    const existingNames = new Set(sellers.map(s => s.name.trim().toLowerCase()));
    const promises = Object.keys(parsedData).map(name => {
        if (existingNames.has(name.trim().toLowerCase())) return null;
        return dbActions.addSeller({
            name: name, description: "", plusFactor: parsedData[name].plusFactor || 0,
            tiers: parsedData[name].tiers.map((t, idx) => ({ id: Date.now() + idx, limit: t.limit, price: t.price }))
        });
    });
    await Promise.all(promises);
    setIsImportModalOpen(false);
  };

  // Silme işlemini tetikleyen fonksiyon
  const handleDelete = async (id) => {
      await dbActions.deleteSeller(id);
      if (editingId === id) setEditingId(null);
      setDeleteConfirmationId(null);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {isImportModalOpen && <ExcelImportModal onClose={() => setIsImportModalOpen(false)} onImport={handleImport} />}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Tanımlı Satıcılar</h2>
        <div className="flex gap-2">
            <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex gap-2"><FileSpreadsheet size={18}/> Excel'den Yükle</button>
            <button onClick={addNewSeller} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex gap-2"><Plus size={18}/> Yeni Satıcı</button>
        </div>
      </div>
      <div className="grid gap-4">
        {sellers.map(seller => (
          <div key={seller.id} className={`bg-white rounded-xl shadow-sm border ${editingId === seller.id ? 'border-blue-500 ring-1' : 'border-gray-200'}`}>
            <div className="p-4 flex justify-between cursor-pointer" onClick={() => setEditingId(editingId === seller.id ? null : seller.id)}>
              <div className="flex gap-3"><div className="bg-blue-100 p-2 rounded-full text-blue-700"><Truck size={20}/></div><div><h3 className="font-bold">{seller.name}</h3><p className="text-xs text-gray-500">{seller.tiers?.length || 0} Barem</p></div></div>
              <ChevronRight className={`transition-transform ${editingId === seller.id ? 'rotate-90' : ''}`}/>
            </div>
            {editingId === seller.id && (
               <div className="px-4 pb-4 border-t border-gray-100">
                 <SellerEditor seller={seller} updateSeller={(id, field, val) => dbActions.updateSeller(id, {[field]: val})} />
                 <div className="mt-4 flex justify-end">
                    {deleteConfirmationId === seller.id ? (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <span className="text-sm text-gray-600 font-medium">Bu satıcı silinsin mi?</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(seller.id); }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold">Evet, Sil</button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(null); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm">İptal</button>
                        </div>
                    ) : (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(seller.id); }} className="text-red-500 flex gap-1 border border-red-200 px-3 py-1 rounded hover:bg-red-50"><Trash2 size={14}/> Sil</button>
                    )}
                 </div>
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SellerEditor({ seller, updateSeller }) {
  const plusFactor = seller.plus_factor !== undefined ? seller.plus_factor : (seller.plusFactor || 0);

  const updateField = (field, value) => {
      updateSeller(seller.id, field, value);
  };

  const updateTier = (tierId, field, value) => {
      const newValue = value === '' ? '' : parseFloat(value);
      const newTiers = seller.tiers.map(t => t.id === tierId ? { ...t, [field]: newValue } : t);
      updateSeller(seller.id, 'tiers', newTiers);
  };
  const addTier = () => {
      const newTiers = [...(seller.tiers || []), { id: Date.now(), limit: 0, price: 0 }];
      updateSeller(seller.id, 'tiers', newTiers);
  };
  const removeTier = (tierId) => {
      const newTiers = seller.tiers.filter(t => t.id !== tierId);
      updateSeller(seller.id, 'tiers', newTiers);
  };

  return (
    <div className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div><label className="text-xs font-bold text-gray-500">KOD</label><input type="text" value={seller.name} onChange={e => updateField('name', e.target.value)} className="w-full border p-2 rounded mt-1"/></div>
            <div><label className="text-xs font-bold text-gray-500">TANIM</label><input type="text" value={seller.description || ''} onChange={e => updateField('description', e.target.value)} className="w-full border p-2 rounded mt-1"/></div>
            <div>
              <label className="text-xs font-bold text-gray-500">PLUS ÇARPAN</label>
              <input 
                type="number" 
                value={plusFactor === '' || isNaN(plusFactor) ? '' : plusFactor} 
                onChange={e => updateField('plusFactor', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                className="w-full border p-2 rounded mt-1"
              />
            </div>
        </div>
        <div className="mb-2 flex justify-between"><label className="text-xs font-bold text-gray-500">BAREMLER</label><button onClick={addTier} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1"><Plus size={12}/> Ekle</button></div>
        <div className="border rounded overflow-hidden">
            <table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-2">Desi</th><th className="p-2">Fiyat</th><th className="p-2"></th></tr></thead>
            <tbody className="divide-y">{seller.tiers?.map(t => (
                <tr key={t.id}>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={isNaN(t.limit) ? '' : t.limit} 
                        onChange={e => updateTier(t.id, 'limit', e.target.value)} 
                        className="border rounded w-full p-1"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={isNaN(t.price) ? '' : t.price} 
                        onChange={e => updateTier(t.id, 'price', e.target.value)} 
                        className="border rounded w-full p-1"
                      />
                    </td>
                    <td className="p-2 w-8"><button onClick={() => removeTier(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                </tr>
            ))}</tbody></table>
        </div>
    </div>
  );
}

function ExcelImportModal({ onClose, onImport }) {
    const [rawText, setRawText] = useState('');
    
    const handleParse = () => {
        const lines = rawText.trim().split(/\r?\n/);
        const parsedData = {};
        lines.forEach(line => {
            const cols = line.split('\t');
            if (cols.length < 3) return;
            const name = cols[0].trim();
            const desiRaw = cols[1].trim().toLowerCase();
            const priceRaw = cols[2].trim().replace(',', '.');
            if (!name || isNaN(parseFloat(priceRaw))) return;

            if (!parsedData[name]) parsedData[name] = { tiers: [], plusFactor: 0 };
            
            if (desiRaw.includes('plus')) {
                parsedData[name].plusFactor = parseFloat(priceRaw);
            } else {
                const limit = parseFloat(desiRaw.replace(',', '.'));
                if (!isNaN(limit)) parsedData[name].tiers.push({ limit, price: parseFloat(priceRaw) });
            }
        });
        onImport(parsedData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-xl">
                <h3 className="font-bold text-lg mb-4">Excel Verisi Yapıştır</h3>
                <textarea className="w-full h-64 border p-3 rounded font-mono text-xs" value={rawText} onChange={e => setRawText(e.target.value)} placeholder="Satıcı Adı | Desi | Fiyat formatında yapıştırın..."></textarea>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">İptal</button>
                    <button onClick={handleParse} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">İçeri Aktar</button>
                </div>
            </div>
        </div>
    );
}