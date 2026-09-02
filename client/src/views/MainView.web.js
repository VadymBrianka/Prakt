import React, { useState, useMemo } from 'react';
import { 
  Boxes, AlertTriangle, Printer, Search, RefreshCw, 
  Warehouse, Layers, ArrowUpDown, Users, UserPlus, LogOut,
  Edit, Trash2, Plus, Building2, History,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Eye, EyeOff, CheckCircle2, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { ITEMS_PER_PAGE } from '../hooks/useFurniStock';

export default function MainView({ model }) {
  const {
    token, currentUser, loading, items, lowStockList, warehousesList, usersList,
    activeItem, setActiveItem,
    selectedSourceWh, setSelectedSourceWh,
    selectedTargetWh, setSelectedTargetWh,
    opQuantity, setOpQuantity,
    opComment, setOpComment,
    catSearch, setCatSearch,
    catCategory, setCatCategory,
    catWarehouse, setCatWarehouse,
    catSortField, setCatSortField,
    catSortDir, setCatSortDir,
    catalogPage, setCatalogPage,
    lowSearch, setLowSearch,
    lowCategory, setLowCategory,
    lowWarehouse, setLowWarehouse,
    lowSortField, setLowSortField,
    lowSortDir, setLowSortDir,
    lowPage, setLowPage,
    categoriesList, lowWarehouseNames,
    filteredCatalog, filteredLowStock,
    login, logout, fetchAll, fetchItemInfo,
    executeOperation, executeTransfer, executeAudit,
    saveItem, deleteItem, saveWarehouse, deleteWarehouse, saveUser, deleteUser
  } = model;

  const [loginUser, setLoginUser] = useState('admin');
  const [loginPass, setLoginPass] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('CATALOG');
  const [operationMode, setOperationMode] = useState('STOCK');

  // Модальні вікна товарів та складів
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemFormId, setItemFormId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemBarcode, setItemBarcode] = useState('');
  const [itemCategory, setItemCategory] = useState('Завіси та петлі');
  const [itemUnit, setItemUnit] = useState('шт');
  const [itemThreshold, setItemThreshold] = useState('5');

  const [showWhModal, setShowWhModal] = useState(false);
  const [whFormId, setWhFormId] = useState(null);
  const [whName, setWhName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [whShowroom, setWhShowroom] = useState(false);

  // Модальне вікно редагування користувача
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState('STOREKEEPER');
  const [editPassword, setEditPassword] = useState('');

  // Форма створення користувача
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('STOREKEEPER');

  // Категорії дефіциту
  const lowCategoriesList = useMemo(() => {
    return ['ALL', ...Array.from(new Set(lowStockList.map(i => i.category).filter(Boolean)))];
  }, [lowStockList]);

  // Пагінація
  const totalCatPages = Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE) || 1;
  const paginatedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * ITEMS_PER_PAGE;
    return filteredCatalog.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCatalog, catalogPage]);

  const totalLowPages = Math.ceil(filteredLowStock.length / ITEMS_PER_PAGE) || 1;
  const paginatedLow = useMemo(() => {
    const start = (lowPage - 1) * ITEMS_PER_PAGE;
    return filteredLowStock.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLowStock, lowPage]);

  const toggleSort = (field) => {
    if (catSortField === field) {
      setCatSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCatSortField(field);
      setCatSortDir('asc');
    }
  };

  // Сортування дефіциту по всіх полях
  const toggleLowSort = (field) => {
    if (lowSortField === field) {
      setLowSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLowSortField(field);
      setLowSortDir('asc');
    }
  };

  const generateBarcodePDF = (item) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [58, 40] });
    const barcodeVal = String(item.barcode || item.sku).trim();
    const isEan13 = /^\d{13}$/.test(barcodeVal);
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, barcodeVal, { format: isEan13 ? 'EAN13' : 'CODE128', width: 2, height: 40, displayValue: true, fontSize: 11 });
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('FURNI INVENTORY HUB', 4, 6);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(item.name || '', 50).slice(0, 2), 4, 10);
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 4, 16, 50, 16);
      doc.setFontSize(6); doc.text(`SKU: ${item.sku}`, 4, 36); doc.text(`Од: ${item.unit || 'шт'}`, 42, 36);
      doc.save(`Label_${item.sku}.pdf`);
    } catch (e) {
      alert('Помилка: ' + e.message);
    }
  };

  // ---------------- ВІКНО АВТОРИЗАЦІЇ ----------------
  if (!token || !currentUser) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 font-sans text-slate-800">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-16 flex-col justify-between relative overflow-hidden border-r border-slate-800">
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 z-10">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 text-white">
              <Warehouse className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">Furni Stock ERP</h1>
              <p className="text-xs font-semibold text-blue-400">Enterprise Warehouse Management</p>
            </div>
          </div>

          <div className="space-y-6 z-10 max-w-md">
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Єдина цифрова система контролю меблевої фурнітури
            </h2>
            <div className="space-y-3.5 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>Миттєвий облік залишків по кількох складах та шоурумах</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>Автоматичний контроль критичного дефіциту та резервів</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>Синхронізація з мобільними сканерами через єдиний сервер</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 z-10">
            © 2026 Furni ERP Solutions. Всі права захищено.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-slate-900">
          <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-slate-200">
            <div className="mb-8 text-center lg:text-left">
              <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4 lg:hidden">
                <Warehouse className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Вхід до системи</h3>
              <p className="text-sm text-slate-500 mt-1">Введіть облікові дані вашого термінала</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); login(loginUser, loginPass); }} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Логін облікового запису</label>
                <input 
                  type="text" 
                  value={loginUser} 
                  onChange={(e) => setLoginUser(e.target.value)} 
                  placeholder="Введіть логін..." 
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Пароль доступу</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={loginPass} 
                    onChange={(e) => setLoginPass(e.target.value)} 
                    placeholder="Введіть пароль..." 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white pr-11 transition"
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 active:scale-[0.99] transition disabled:opacity-60 mt-2"
              >
                {loading ? 'Перевірка даних...' : 'Увійти в кабінет'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- ГОЛОВНИЙ РОБОЧИЙ ПРОСТІР ----------------
  return (
    <div className="flex h-screen w-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      {/* Лівий Сайдбар */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-200 flex flex-col justify-between shadow-xl z-20">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Furni ERP</h1>
              <p className="text-xs text-slate-400">Панель управління</p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 m-3 rounded-xl border border-slate-700">
            <p className="text-[11px] text-slate-400">Авторизовано:</p>
            <p className="text-sm font-bold text-white truncate mt-0.5">{currentUser.fullName}</p>
            <span className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase bg-blue-500/20 text-blue-300">
              {currentUser.role}
            </span>
          </div>

          <nav className="p-3 space-y-1">
            <button onClick={() => setActiveTab('CATALOG')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${activeTab === 'CATALOG' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
              <Layers className="w-4 h-4" /> Каталог ({items.length})
            </button>
            <button onClick={() => setActiveTab('LOW_STOCK')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition ${activeTab === 'LOW_STOCK' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
              <div className="flex items-center gap-3"><AlertTriangle className="w-4 h-4 text-amber-400" /> Дефіцит</div>
              {lowStockList.length > 0 && <span className="bg-red-500/25 text-red-300 text-[10px] px-2 py-0.5 rounded-full font-bold">{lowStockList.length}</span>}
            </button>
            <button onClick={() => setActiveTab('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${activeTab === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
              <Boxes className="w-4 h-4" /> Звіти & Дашборд
            </button>
            {currentUser.role === 'ADMIN' && (
              <>
                <button onClick={() => setActiveTab('WAREHOUSES')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${activeTab === 'WAREHOUSES' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-emerald-300'}`}>
                  <Building2 className="w-4 h-4" /> Склади & Локації
                </button>
                <button onClick={() => setActiveTab('USERS')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${activeTab === 'USERS' ? 'bg-purple-600 text-white shadow-md' : 'hover:bg-slate-800 text-purple-300'}`}>
                  <Users className="w-4 h-4" /> Співробітники & Права
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition">
            <LogOut className="w-4 h-4" /> Вийти з системи
          </button>
        </div>
      </aside>

      {/* Центральна робоча зона */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <h2 className="font-bold text-slate-800 text-base">
            {activeTab === 'CATALOG' && 'Номенклатурний каталог фурнітури'}
            {activeTab === 'LOW_STOCK' && 'Критичний дефіцит та аналітика залишків'}
            {activeTab === 'DASHBOARD' && 'Зведена аналітика підприємства'}
            {activeTab === 'WAREHOUSES' && 'Управління складськими приміщеннями'}
            {activeTab === 'USERS' && 'Адміністрування користувачів та ролей'}
          </h2>
          <button onClick={fetchAll} className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Оновити базу
          </button>
        </header>

        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* 1. КАТАЛОГ */}
            {activeTab === 'CATALOG' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Пошук номенклатури..." 
                      value={catSearch} 
                      onChange={(e) => setCatSearch(e.target.value)} 
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={catCategory} onChange={(e) => setCatCategory(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none">
                      <option value="ALL">Всі категорії</option>
                      {categoriesList.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={catWarehouse} onChange={(e) => setCatWarehouse(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none">
                      <option value="ALL">Всі склади Furni</option>
                      {warehousesList.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                      <button onClick={() => { setItemFormId(null); setItemName(''); setItemSku(`SKU-${Date.now().toString().slice(-4)}`); setItemBarcode(`4820000${Math.floor(10000 + Math.random() * 90000)}`); setShowItemModal(true); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition">
                        <Plus className="w-3.5 h-3.5" /> Додати товар
                      </button>
                    )}
                  </div>
                </div>

                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 cursor-pointer select-none border-b border-slate-200" onClick={() => toggleSort('sku')}>
                        SKU <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-4 py-3 cursor-pointer select-none border-b border-slate-200" onClick={() => toggleSort('name')}>
                        Найменування <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-3 py-3 border-b border-slate-200">Категорія</th>
                      <th className="px-3 py-3 border-b border-slate-200">Склади</th>
                      <th className="px-3 py-3 text-center cursor-pointer select-none border-b border-slate-200" onClick={() => toggleSort('totalReserved')}>
                        Резерв <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer select-none border-b border-slate-200" onClick={() => toggleSort('totalAvailable')}>
                        Вільний залишок <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-4 py-3 text-right border-b border-slate-200">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {paginatedCatalog.map((item) => {
                      const isLow = item.totalAvailable <= item.minStockThreshold;
                      const isSelected = activeItem?.id === item.id;
                      
                      const skuParts = (item.sku || '').split('-');
                      const skuTop = skuParts.length > 2 ? skuParts.slice(0, 2).join('-') + '-' : (skuParts[0] || '');
                      const skuBottom = skuParts.length > 2 ? skuParts.slice(2).join('-') : (skuParts[1] || '');

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => fetchItemInfo(item.sku)} 
                          className={`cursor-pointer transition ${isSelected ? 'bg-blue-50/90' : 'hover:bg-slate-50'}`}
                        >
                          <td className={`px-4 py-2.5 font-mono text-[11px] font-bold text-slate-800 leading-tight ${isSelected ? 'border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}>
                            <div>{skuTop}</div>
                            <div className="text-slate-500 font-normal">{skuBottom}</div>
                          </td>

                          <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[240px]">
                            <div className="line-clamp-2 leading-snug" title={item.name}>
                              {item.name}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-slate-500">
                            <span className="text-[11px]">{item.category}</span>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1 items-start">
                              {item.stockDetails?.map((s) => (
                                <span 
                                  key={s.warehouseId} 
                                  className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200 whitespace-nowrap"
                                >
                                  {s.warehouseName.split(' ')[0]}: <b>{s.available}</b>
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-center font-bold text-amber-600">
                            {item.totalReserved} {item.unit}
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-bold ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>
                              {item.totalAvailable} {item.unit}
                            </span>
                          </td>

                          <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 flex-nowrap">
                              <button 
                                title="Друк етикетки" 
                                onClick={() => generateBarcodePDF(item)} 
                                className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                                <>
                                  <button 
                                    title="Редагувати" 
                                    onClick={() => {
                                      setItemFormId(item.id);
                                      setItemName(item.name);
                                      setItemSku(item.sku);
                                      setItemBarcode(item.barcode);
                                      setItemCategory(item.category);
                                      setItemUnit(item.unit);
                                      setItemThreshold(String(item.minStockThreshold));
                                      setShowItemModal(true);
                                    }} 
                                    className="p-1 text-slate-400 hover:text-amber-600 rounded transition"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    title="Видалити" 
                                    onClick={() => deleteItem(item.id)} 
                                    className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Показано <b>{paginatedCatalog.length}</b> з <b>{filteredCatalog.length}</b> товарів</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCatalogPage(1)} disabled={catalogPage === 1} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCatalogPage(p => Math.max(1, p - 1))} disabled={catalogPage === 1} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="font-semibold px-2">Стор. {catalogPage} з {totalCatPages}</span>
                    <button onClick={() => setCatalogPage(p => Math.min(totalCatPages, p + 1))} disabled={catalogPage === totalCatPages} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCatalogPage(totalCatPages)} disabled={catalogPage === totalCatPages} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronsRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ДЕФІЦИТ (З ПОВНИМ СОРТУВАННЯМ) */}
            {activeTab === 'LOW_STOCK' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Пошук у дефіциті..." 
                      value={lowSearch} 
                      onChange={(e) => setLowSearch(e.target.value)} 
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-500" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={lowCategory} 
                      onChange={(e) => setLowCategory(e.target.value)} 
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none"
                    >
                      <option value="ALL">Всі категорії</option>
                      {lowCategoriesList.filter(c => c !== 'ALL').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select 
                      value={lowWarehouse} 
                      onChange={(e) => setLowWarehouse(e.target.value)} 
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none"
                    >
                      <option value="ALL">Всі склади</option>
                      {lowWarehouseNames.filter(w => w !== 'ALL').map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="bg-red-50 text-red-900 text-[11px] font-bold uppercase border-b border-red-100">
                    <tr>
                      <th className="px-4 py-3 cursor-pointer select-none border-b border-red-100" onClick={() => toggleLowSort('sku')}>
                        SKU <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-4 py-3 cursor-pointer select-none border-b border-red-100" onClick={() => toggleLowSort('name')}>
                        Найменування <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-3 py-3 cursor-pointer select-none border-b border-red-100" onClick={() => toggleLowSort('category')}>
                        Категорія <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-3 py-3 cursor-pointer select-none border-b border-red-100" onClick={() => toggleLowSort('warehouse')}>
                        Склад <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer select-none border-b border-red-100" onClick={() => toggleLowSort('physical')}>
                        Фізично <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-3 py-3 text-center text-amber-700 cursor-pointer select-none border-b border-red-100" onClick={() => toggleLowSort('reserved')}>
                        Резерв <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-3 py-3 text-center text-red-700 cursor-pointer select-none border-b border-red-100" onClick={() => toggleLowSort('available')}>
                        Залишок <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-3 py-3 text-center cursor-pointer select-none border-b border-red-100" onClick={() => toggleLowSort('minThreshold')}>
                        Поріг <ArrowUpDown className="w-3 h-3 inline" />
                      </th>
                      <th className="px-4 py-3 text-right border-b border-red-100">Друк</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedLow.map((item, idx) => (
                      <tr key={idx} onClick={() => fetchItemInfo(item.sku)} className="hover:bg-red-50/40 cursor-pointer transition">
                        <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-slate-800">{item.sku}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[200px] truncate" title={item.name}>{item.name}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-[11px]">{item.category}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.warehouse}</td>
                        <td className="px-3 py-2.5 text-center">{item.physical} {item.unit}</td>
                        <td className="px-3 py-2.5 text-center text-amber-600 font-bold">{item.reserved} {item.unit}</td>
                        <td className="px-3 py-2.5 text-center text-red-600 font-extrabold">{item.available} {item.unit}</td>
                        <td className="px-3 py-2.5 text-center text-slate-400">{item.minThreshold || item.minStockThreshold} {item.unit}</td>
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => generateBarcodePDF(item)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition"><Printer className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Критичних позицій: <b>{filteredLowStock.length}</b></span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setLowPage(1)} disabled={lowPage === 1} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setLowPage(p => Math.max(1, p - 1))} disabled={lowPage === 1} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="font-semibold px-2">Стор. {lowPage} з {totalLowPages}</span>
                    <button onClick={() => setLowPage(p => Math.min(totalLowPages, p + 1))} disabled={lowPage === totalLowPages} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setLowPage(totalLowPages)} disabled={lowPage === totalLowPages} className="p-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronsRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ДАШБОРД */}
            {activeTab === 'DASHBOARD' && (
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase">Всього товарів</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">{items.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase">Критичний дефіцит</p>
                  <p className="text-3xl font-extrabold text-red-600 mt-2">{lowStockList.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase">Резерви клієнтів</p>
                  <p className="text-3xl font-extrabold text-amber-600 mt-2">{items.reduce((acc, i) => acc + (i.totalReserved || 0), 0)}</p>
                </div>
              </div>
            )}

            {/* 4. СКЛАДИ */}
            {activeTab === 'WAREHOUSES' && currentUser.role === 'ADMIN' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm">Складські локації підприємства</h3>
                  <button onClick={() => { setWhFormId(null); setWhName(''); setWhLocation(''); setWhShowroom(false); setShowWhModal(true); }} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition">
                    <Plus className="w-3.5 h-3.5" /> Додати склад
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {warehousesList.map(w => (
                    <div key={w.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-900 text-base">{w.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{w.isShowroom ? 'Шоурум' : 'Склад'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{w.location || 'Без адреси'}</p>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button onClick={() => { setWhFormId(w.id); setWhName(w.name); setWhLocation(w.location || ''); setWhShowroom(w.isShowroom); setShowWhModal(true); }} className="p-1 text-slate-400 hover:text-blue-600 rounded transition"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => deleteWarehouse(w.id)} className="p-1 text-slate-400 hover:text-red-600 rounded transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. КОРИСТУВАЧІ */}
            {activeTab === 'USERS' && currentUser.role === 'ADMIN' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h2 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-purple-600" /> Реєстрація співробітника
                  </h2>
                  <form onSubmit={async (e) => { e.preventDefault(); const ok = await saveUser({ username: newUsername, password: newPassword, fullName: newFullName, role: newRole }); if (ok) { setNewFullName(''); setNewUsername(''); setNewPassword(''); } }} className="grid grid-cols-4 gap-3">
                    <input type="text" placeholder="ПІБ" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="p-2 border rounded-lg text-xs bg-slate-50 outline-none" required />
                    <input type="text" placeholder="Логін" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="p-2 border rounded-lg text-xs bg-slate-50 outline-none" required />
                    <input type="password" placeholder="Пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="p-2 border rounded-lg text-xs bg-slate-50 outline-none" required />
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-slate-50 outline-none">
                      <option value="STOREKEEPER">STOREKEEPER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <div className="col-span-4 flex justify-end">
                      <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition">Створити акаунт</button>
                    </div>
                  </form>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b">
                      <tr>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">ПІБ</th>
                        <th className="px-6 py-3">Логін</th>
                        <th className="px-6 py-3">Роль</th>
                        <th className="px-6 py-3 text-right">Дія</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3.5 font-mono font-bold text-xs">{u.id}</td>
                          <td className="px-6 py-3.5 font-bold text-slate-900">{u.fullName}</td>
                          <td className="px-6 py-3.5 text-xs text-slate-500">@{u.username}</td>
                          <td className="px-6 py-3.5"><span className="text-[11px] font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-800">{u.role}</span></td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { 
                                  setEditingUserId(u.id); 
                                  setEditFullName(u.fullName); 
                                  setEditUsername(u.username); 
                                  setEditRole(u.role); 
                                  setEditPassword(''); 
                                  setShowEditUserModal(true); 
                                }} 
                                className="p-1 text-slate-400 hover:text-purple-600 rounded transition"
                                title="Редагувати"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {u.id !== currentUser.id && (
                                <button onClick={() => deleteUser(u.id)} className="p-1 text-slate-400 hover:text-red-600 rounded transition" title="Видалити"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Права панель деталей товару (Фіксована ширина без деформації лівої частини) */}
          {activeItem && (
            <div className="w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col justify-between overflow-y-auto p-6 shadow-lg z-10">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 relative">
                  <button 
                    onClick={() => setActiveItem(null)} 
                    title="Закрити панель" 
                    className="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{activeItem.category}</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2 leading-tight pr-6">{activeItem.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">SKU: <span className="font-bold text-slate-700">{activeItem.sku}</span></p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setOperationMode('STOCK')} className={`flex-1 py-1 text-xs font-bold rounded transition ${operationMode === 'STOCK' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Рух</button>
                  {currentUser.role !== 'MANAGER' && (
                    <>
                      <button onClick={() => setOperationMode('TRANSFER')} className={`flex-1 py-1 text-xs font-bold rounded transition ${operationMode === 'TRANSFER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Трансфер</button>
                      <button onClick={() => setOperationMode('AUDIT')} className={`flex-1 py-1 text-xs font-bold rounded transition ${operationMode === 'AUDIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Ревізія</button>
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Склад списання / операції:</label>
                  {activeItem.stockDetails?.map(s => (
                    <div key={s.warehouseId} onClick={() => setSelectedSourceWh(s.warehouseId)} className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${selectedSourceWh === s.warehouseId ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex justify-between font-bold text-slate-800"><span>{s.warehouseName}</span><span className="text-amber-600">Резерв: {s.reserved}</span></div>
                      <div className="flex justify-between text-slate-500 mt-1"><span>Фізично: {s.physical}</span><span className="font-bold text-emerald-600">Вільно: {s.available} {activeItem.unit}</span></div>
                    </div>
                  ))}
                </div>

                {operationMode === 'TRANSFER' && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Склад отримання:</label>
                    {activeItem.stockDetails?.map(s => (
                      <div key={`target-${s.warehouseId}`} onClick={() => setSelectedTargetWh(s.warehouseId)} className={`p-2 rounded-lg border text-xs cursor-pointer transition ${selectedTargetWh === s.warehouseId ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 font-bold text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <span>{s.warehouseName}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">{operationMode === 'AUDIT' ? 'Фактична наявність:' : 'Кількість:'}</label>
                  <input type="number" value={opQuantity} onChange={(e) => setOpQuantity(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <input type="text" placeholder="Коментар до дії..." value={opComment} onChange={(e) => setOpComment(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {operationMode === 'STOCK' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {currentUser.role !== 'MANAGER' && <button onClick={() => executeOperation('INCOMING')} className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition">+ Прихід</button>}
                    <button onClick={() => executeOperation('RESERVE')} className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition">Бронювати</button>
                    <button onClick={() => executeOperation('UNRESERVE')} className="py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition">Розброн.</button>
                    {currentUser.role !== 'MANAGER' && <button onClick={() => executeOperation('OUTGOING')} className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition">- Видача</button>}
                  </div>
                )}
                {operationMode === 'TRANSFER' && <button onClick={executeTransfer} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition">Виконати переміщення</button>}
                {operationMode === 'AUDIT' && <button onClick={executeAudit} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition">Зафіксувати ревізію</button>}

                {activeItem.historyLogs && activeItem.historyLogs.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                      <History className="w-3.5 h-3.5" /> Історія операцій:
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {activeItem.historyLogs.map(l => (
                        <div key={l.id} className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>{l.type} ({l.quantity > 0 ? `+${l.quantity}` : l.quantity})</span>
                            <span className="text-[10px] text-slate-400 font-normal">{new Date(l.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{l.warehouseName}: <span className="italic">{l.comment || 'Без коментаря'}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* МОДАЛКА РЕДАГУВАННЯ КОРИСТУВАЧА */}
      {showEditUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-3">Редагування користувача #{editingUserId}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const payload = { fullName: editFullName, username: editUsername, role: editRole };
              if (editPassword && editPassword.trim() !== '') {
                payload.password = editPassword;
              }
              const ok = await saveUser(payload, editingUserId);
              if (ok) setShowEditUserModal(false);
            }} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ПІБ</label>
                <input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="w-full p-2 border rounded-lg text-xs outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Логін</label>
                <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full p-2 border rounded-lg text-xs outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Новий пароль (залиште пустим, щоб не змінювати)</label>
                <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full p-2 border rounded-lg text-xs outline-none" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Роль</label>
                <select 
                  value={editRole} 
                  onChange={(e) => setEditRole(e.target.value)} 
                  disabled={editingUserId === currentUser.id}
                  className="w-full p-2 border rounded-lg text-xs font-bold outline-none"
                >
                  <option value="STOREKEEPER">STOREKEEPER</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditUserModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold">Скасувати</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold">Зберегти зміни</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА ТОВАРУ */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-3">{itemFormId ? 'Редагування товару' : 'Новий товар'}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const ok = await saveItem({ sku: itemSku, barcode: itemBarcode, name: itemName, category: itemCategory, unit: itemUnit, minStockThreshold: parseFloat(itemThreshold) }, itemFormId);
              if (ok) setShowItemModal(false);
            }} className="space-y-3">
              <input type="text" placeholder="Назва товару" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full p-2 border rounded-lg text-xs outline-none" required />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="SKU" value={itemSku} onChange={(e) => setItemSku(e.target.value)} className="p-2 border rounded-lg text-xs font-mono outline-none" required />
                <input type="text" placeholder="Штрихкод" value={itemBarcode} onChange={(e) => setItemBarcode(e.target.value)} className="p-2 border rounded-lg text-xs font-mono outline-none" required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Категорія" value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="p-2 border rounded-lg text-xs outline-none" required />
                <input type="text" placeholder="Од." value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} className="p-2 border rounded-lg text-xs outline-none" required />
                <input type="number" placeholder="Поріг" value={itemThreshold} onChange={(e) => setItemThreshold(e.target.value)} className="p-2 border rounded-lg text-xs outline-none" required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold">Скасувати</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА СКЛАДУ */}
      {showWhModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-3">{whFormId ? 'Редагування складу' : 'Новий склад'}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const ok = await saveWarehouse({ name: whName, location: whLocation, isShowroom: whShowroom }, whFormId);
              if (ok) setShowWhModal(false);
            }} className="space-y-3">
              <input type="text" placeholder="Назва складу" value={whName} onChange={(e) => setWhName(e.target.value)} className="w-full p-2 border rounded-lg text-xs outline-none" required />
              <input type="text" placeholder="Адреса" value={whLocation} onChange={(e) => setWhLocation(e.target.value)} className="w-full p-2 border rounded-lg text-xs outline-none" />
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={whShowroom} onChange={(e) => setWhShowroom(e.target.checked)} />
                Це виставковий зал (Шоурум)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowWhModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold">Скасувати</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}