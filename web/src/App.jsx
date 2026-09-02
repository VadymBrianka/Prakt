import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { 
  Boxes, 
  AlertTriangle, 
  Printer, 
  Search, 
  RefreshCw, 
  Warehouse, 
  Layers, 
  ArrowUpDown, 
  Users, 
  UserPlus, 
  LogOut,
  Edit,
  Trash2,
  Plus,
  X,
  Check,
  Building2,
  History,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

const API_BASE_URL = 'http://localhost:3000/api';
const ITEMS_PER_PAGE = 25;

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('furni_token') || '');
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('furni_user') || 'null'));

  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('CATALOG');
  const [items, setItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [warehousesListAll, setWarehousesListAll] = useState([]);
  const [loading, setLoading] = useState(false);

  // Фільтри та сортування каталогу
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [catalogPage, setCatalogPage] = useState(1);

  // Фільтри та сортування дефіциту
  const [lowSearchTerm, setLowSearchTerm] = useState('');
  const deferredLowSearch = useDeferredValue(lowSearchTerm);
  const [lowSelectedWarehouse, setLowSelectedWarehouse] = useState('ALL');
  const [lowSelectedCategory, setLowSelectedCategory] = useState('ALL');
  const [lowSortField, setLowSortField] = useState('available');
  const [lowSortDirection, setLowSortDirection] = useState('asc');
  const [lowPage, setLowPage] = useState(1);

  // Панель операцій
  const [activeItem, setActiveItem] = useState(null);
  const [operationMode, setOperationMode] = useState('STOCK');
  const [selectedSourceWh, setSelectedSourceWh] = useState(null);
  const [selectedTargetWh, setSelectedTargetWh] = useState(null);
  const [opQuantity, setOpQuantity] = useState('1');
  const [opComment, setOpComment] = useState('');

  // Модальні вікна
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemFormId, setItemFormId] = useState(null);
  const [itemSku, setItemSku] = useState('');
  const [itemBarcode, setItemBarcode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Завіси та петлі');
  const [itemUnit, setItemUnit] = useState('шт');
  const [itemThreshold, setItemThreshold] = useState('5');

  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseFormId, setWarehouseFormId] = useState(null);
  const [whName, setWhName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [whIsShowroom, setWhIsShowroom] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState('STOREKEEPER');
  const [editPassword, setEditPassword] = useState('');

  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('STOREKEEPER');

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  useEffect(() => {
    if (token) {
      fetchAllData();
      if (currentUser?.role === 'ADMIN') {
        fetchUsers();
        fetchWarehouses();
      }
    }
  }, [token]);

  // Скидання сторінок при зміні фільтрів
  useEffect(() => {
    setCatalogPage(1);
  }, [deferredSearch, selectedCategory, selectedWarehouse, sortField, sortDirection]);

  useEffect(() => {
    setLowPage(1);
  }, [deferredLowSearch, lowSelectedCategory, lowSelectedWarehouse, lowSortField, lowSortDirection]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem('furni_token', data.token);
        localStorage.setItem('furni_user', JSON.stringify(data.user));
      } else {
        setAuthError(data.message || 'Помилка авторизації');
      }
    } catch (err) {
      setAuthError('Не вдалося зʼєднатися з сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('furni_token');
    localStorage.removeItem('furni_user');
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [itemsRes, lowRes] = await Promise.all([
        fetch(`${API_BASE_URL}/items`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/items/low-stock`, { headers: authHeaders })
      ]);

      if (itemsRes.status === 401 || lowRes.status === 401) {
        handleLogout();
        return;
      }

      const [itemsData, lowData] = await Promise.all([itemsRes.json(), lowRes.json()]);
      setItems(itemsData);
      setLowStockItems(lowData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, { headers: authHeaders });
      if (res.ok) setUsersList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/warehouses`, { headers: authHeaders });
      if (res.ok) setWarehousesListAll(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Item CRUD
  const openCreateItemModal = () => {
    setItemFormId(null);
    setItemSku(`SKU-${Date.now().toString().slice(-4)}`);
    setItemBarcode(`48200000${Math.floor(10000 + Math.random() * 90000)}`);
    setItemName('');
    setItemCategory('Завіси та петлі');
    setItemUnit('шт');
    setItemThreshold('5');
    setShowItemModal(true);
  };

  const openEditItemModal = (item) => {
    setItemFormId(item.id);
    setItemSku(item.sku);
    setItemBarcode(item.barcode);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemUnit(item.unit);
    setItemThreshold(String(item.minStockThreshold));
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = itemFormId ? `${API_BASE_URL}/items/${itemFormId}` : `${API_BASE_URL}/items`;
      const method = itemFormId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          sku: itemSku,
          barcode: itemBarcode,
          name: itemName,
          category: itemCategory,
          unit: itemUnit,
          minStockThreshold: parseFloat(itemThreshold)
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Успішно збережено!');
        setShowItemModal(false);
        fetchAllData();
      } else {
        alert('Помилка: ' + data.message);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Видалити цей товар із каталогу?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        alert('Товар видалено!');
        setActiveItem(null);
        fetchAllData();
      } else {
        alert('Помилка: ' + data.error);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  // Warehouse CRUD
  const openCreateWhModal = () => {
    setWarehouseFormId(null);
    setWhName('');
    setWhLocation('');
    setWhIsShowroom(false);
    setShowWarehouseModal(true);
  };

  const openEditWhModal = (w) => {
    setWarehouseFormId(w.id);
    setWhName(w.name);
    setWhLocation(w.location || '');
    setWhIsShowroom(w.isShowroom);
    setShowWarehouseModal(true);
  };

  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = warehouseFormId ? `${API_BASE_URL}/warehouses/${warehouseFormId}` : `${API_BASE_URL}/warehouses`;
      const method = warehouseFormId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({ name: whName, location: whLocation, isShowroom: whIsShowroom })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Склад збережено!');
        setShowWarehouseModal(false);
        fetchWarehouses();
        fetchAllData();
      } else {
        alert('Помилка: ' + data.message);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWarehouse = async (id) => {
    if (!window.confirm('Видалити цей склад?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/warehouses/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        alert('Склад видалено!');
        fetchWarehouses();
        fetchAllData();
      } else {
        alert('Помилка: ' + data.error);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  // User CRUD
  const handleRegisterUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ username: newUsername, password: newPassword, fullName: newFullName, role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Користувача зареєстровано!');
        setNewFullName('');
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        alert('Помилка: ' + data.message);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ fullName: editFullName, username: editUsername, role: editRole, password: editPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Дані користувача оновлено!');
        setEditingUser(null);
        fetchUsers();
      } else {
        alert('Помилка: ' + data.message);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      alert('Ви не можете видалити власний акаунт!');
      return;
    }
    if (!window.confirm('Видалити цього користувача з системи?')) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json();
      if (res.ok) {
        alert('Користувача видалено!');
        fetchUsers();
      } else {
        alert('Помилка: ' + (data.message || data.error));
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleItemDetails = async (code) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items/search?code=${encodeURIComponent(code)}`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        setActiveItem(data);
        if (data.stockDetails?.length > 0) {
          setSelectedSourceWh(data.stockDetails[0].warehouseId);
          if (data.stockDetails.length > 1) setSelectedTargetWh(data.stockDetails[1].warehouseId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const executeOperation = async (type) => {
    if (!activeItem || !selectedSourceWh || !opQuantity) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operations`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ itemId: activeItem.id, warehouseId: selectedSourceWh, type, quantity: parseFloat(opQuantity), comment: opComment })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Операцію проведено!');
        setOpComment('');
        fetchSingleItemDetails(activeItem.sku);
      } else {
        alert('Помилка: ' + data.message);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const executeTransfer = async () => {
    if (!activeItem || !selectedSourceWh || !selectedTargetWh || selectedSourceWh === selectedTargetWh) return alert('Оберіть різні склади');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operations/transfer`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ itemId: activeItem.id, fromWarehouseId: selectedSourceWh, toWarehouseId: selectedTargetWh, quantity: parseFloat(opQuantity), comment: opComment })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Товар переміщено!');
        setOpComment('');
        fetchSingleItemDetails(activeItem.sku);
      } else {
        alert('Помилка: ' + data.message);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const executeAudit = async () => {
    if (!activeItem || !selectedSourceWh || opQuantity === '') return alert('Вкажіть кількість');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operations/adjust`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ itemId: activeItem.id, warehouseId: selectedSourceWh, actualQuantity: parseFloat(opQuantity), comment: opComment })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Ревізію зафіксовано (Δ ${data.difference > 0 ? '+' : ''}${data.difference})`);
        setOpComment('');
        fetchSingleItemDetails(activeItem.sku);
      } else {
        alert('Помилка: ' + data.message);
      }
    } catch (e) {
      alert('Мережевий збій');
    } finally {
      setLoading(false);
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

  // Категорії та склади
  const categoriesList = useMemo(() => ['ALL', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))], [items]);
  const warehousesList = useMemo(() => {
    const map = new Map();
    items.forEach(i => i.stockDetails?.forEach(s => map.set(s.warehouseId, s.warehouseName)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Фільтрація та пагінація каталогу
  const filteredItems = useMemo(() => {
    const query = deferredSearch.toLowerCase();
    return items
      .filter(item => {
        const matchesSearch = 
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          item.barcode?.toLowerCase().includes(query);
        const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
        const matchesWarehouse = selectedWarehouse === 'ALL' || item.stockDetails?.some(s => s.warehouseId === parseInt(selectedWarehouse) && s.physical > 0);
        return matchesSearch && matchesCategory && matchesWarehouse;
      })
      .sort((a, b) => {
        let valA = a[sortField]; let valB = b[sortField];
        if (typeof valA === 'string') return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [items, deferredSearch, selectedCategory, selectedWarehouse, sortField, sortDirection]);

  const totalCatalogPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedCatalogItems = useMemo(() => {
    const start = (catalogPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, catalogPage]);

  // Фільтрація та пагінація дефіциту
  const filteredLowStockItems = useMemo(() => {
    const query = deferredLowSearch.toLowerCase();
    return lowStockItems
      .filter(item => {
        const matchesSearch = 
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          (item.barcode && item.barcode.toLowerCase().includes(query));
        const matchesCategory = lowSelectedCategory === 'ALL' || item.category === lowSelectedCategory;
        const matchesWarehouse = lowSelectedWarehouse === 'ALL' || item.warehouse === lowSelectedWarehouse;
        return matchesSearch && matchesCategory && matchesWarehouse;
      })
      .sort((a, b) => {
        let valA = a[lowSortField]; let valB = b[lowSortField];
        if (typeof valA === 'string') return lowSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return lowSortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [lowStockItems, deferredLowSearch, lowSelectedCategory, lowSelectedWarehouse, lowSortField, lowSortDirection]);

  const totalLowPages = Math.ceil(filteredLowStockItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedLowItems = useMemo(() => {
    const start = (lowPage - 1) * ITEMS_PER_PAGE;
    return filteredLowStockItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLowStockItems, lowPage]);

  const toggleLowSort = (field) => {
    if (lowSortField === field) {
      setLowSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setLowSortField(field);
      setLowSortDirection('asc');
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (!token || !currentUser) {
    return (
      <div className="flex h-screen bg-slate-900 items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl text-white"><Warehouse className="w-8 h-8" /></div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Furni Stock ERP</h1>
              <p className="text-xs text-slate-500">Авторизація в системі</p>
            </div>
          </div>
          {authError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg">{authError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Логін</label>
              <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Пароль</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm">
              Увійти в кабінет
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between shadow-xl">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Furni ERP</h1>
              <p className="text-xs text-slate-400">Панель управління</p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/60 m-3 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400">Авторизовано:</p>
            <p className="text-sm font-bold text-white truncate">{currentUser.fullName}</p>
            <span className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase bg-blue-500/20 text-blue-300">
              {currentUser.role}
            </span>
          </div>

          <nav className="p-3 space-y-1">
            <button onClick={() => setActiveTab('CATALOG')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'CATALOG' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
              <Layers className="w-4 h-4" /> Каталог ({items.length})
            </button>
            <button onClick={() => setActiveTab('LOW_STOCK')} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'LOW_STOCK' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
              <div className="flex items-center gap-3"><AlertTriangle className="w-4 h-4 text-amber-400" /> Дефіцит</div>
              {lowStockItems.length > 0 && <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full font-bold">{lowStockItems.length}</span>}
            </button>
            <button onClick={() => setActiveTab('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'DASHBOARD' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
              <Boxes className="w-4 h-4" /> Звіти & Дашборд
            </button>
            {currentUser.role === 'ADMIN' && (
              <>
                <button onClick={() => { setActiveTab('WAREHOUSES'); fetchWarehouses(); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'WAREHOUSES' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-emerald-300'}`}>
                  <Building2 className="w-4 h-4" /> Склади & Локації
                </button>
                <button onClick={() => { setActiveTab('USERS'); fetchUsers(); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'USERS' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-purple-300'}`}>
                  <Users className="w-4 h-4" /> Співробітники & Права
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition">
            <LogOut className="w-4 h-4" /> Вийти з системи
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <span className="font-bold text-slate-800 text-base">
            {activeTab === 'CATALOG' && 'Номенклатурний каталог фурнітури'}
            {activeTab === 'LOW_STOCK' && 'Критичний дефіцит та аналітика залишків'}
            {activeTab === 'DASHBOARD' && 'Зведена аналітика підприємства'}
            {activeTab === 'WAREHOUSES' && 'Управління складськими приміщеннями'}
            {activeTab === 'USERS' && 'Адміністрування користувачів та ролей'}
          </span>
          <button onClick={fetchAllData} className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Оновити базу
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* ВКЛАДКА ДЕФІЦИТ */}
            {activeTab === 'LOW_STOCK' && (
              <>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-1 items-center gap-3 min-w-[280px]">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input 
                        type="text" 
                        placeholder="Пошук дефіцитного товару за назвою чи SKU..." 
                        value={lowSearchTerm} 
                        onChange={(e) => setLowSearchTerm(e.target.value)} 
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select 
                      value={lowSelectedCategory} 
                      onChange={(e) => setLowSelectedCategory(e.target.value)} 
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
                    >
                      <option value="ALL">Всі категорії</option>
                      {categoriesList.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                      value={lowSelectedWarehouse} 
                      onChange={(e) => setLowSelectedWarehouse(e.target.value)} 
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
                    >
                      <option value="ALL">Всі склади</option>
                      {warehousesList.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-red-50 text-red-900 text-xs font-semibold uppercase border-b border-red-100">
                      <tr>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleLowSort('sku')}>
                          SKU <ArrowUpDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleLowSort('name')}>
                          Найменування <ArrowUpDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleLowSort('warehouse')}>
                          Склад <ArrowUpDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleLowSort('physical')}>
                          Фізично <ArrowUpDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleLowSort('reserved')}>
                          Резерв <ArrowUpDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleLowSort('available')}>
                          Вільний залишок <ArrowUpDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleLowSort('minThreshold')}>
                          Поріг <ArrowUpDown className="w-3 h-3 inline" />
                        </th>
                        <th className="px-4 py-3 text-right">Друк</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedLowItems.map((item, idx) => (
                        <tr key={idx} onClick={() => fetchSingleItemDetails(item.sku)} className="hover:bg-red-50/50 cursor-pointer transition">
                          <td className="px-4 py-3 font-mono font-bold text-xs text-slate-900">{item.sku}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{item.warehouse}</td>
                          <td className="px-4 py-3">{item.physical} {item.unit}</td>
                          <td className="px-4 py-3 text-amber-600 font-bold">{item.reserved} {item.unit}</td>
                          <td className="px-4 py-3 text-red-600 font-extrabold">{item.available} {item.unit}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{item.minThreshold} {item.unit}</td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => generateBarcodePDF(item)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                              <Printer className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Пагінація Дефіциту */}
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Показано <b>{paginatedLowItems.length}</b> з <b>{filteredLowStockItems.length}</b> критичних товарів
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setLowPage(1)}
                        disabled={lowPage === 1}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1"
                        title="Перша сторінка"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLowPage(p => Math.max(1, p - 1))}
                        disabled={lowPage === 1}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1"
                        title="Попередня сторінка"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-semibold px-2">
                        Сторінка {lowPage} з {totalLowPages}
                      </span>
                      <button
                        onClick={() => setLowPage(p => Math.min(totalLowPages, p + 1))}
                        disabled={lowPage === totalLowPages}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1"
                        title="Наступна сторінка"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLowPage(totalLowPages)}
                        disabled={lowPage === totalLowPages}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1"
                        title="Остання сторінка"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ВКЛАДКА КАТАЛОГ */}
            {activeTab === 'CATALOG' && (
              <>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-1 items-center gap-3 min-w-[280px]">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input type="text" placeholder="Пошук номенклатури..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                      <option value="ALL">Всі категорії</option>
                      {categoriesList.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                      <option value="ALL">Всі склади Furni</option>
                      {warehousesList.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                      <button onClick={openCreateItemModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Додати товар
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b">
                      <tr>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('sku')}>SKU <ArrowUpDown className="w-3 h-3 inline" /></th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('name')}>Найменування <ArrowUpDown className="w-3 h-3 inline" /></th>
                        <th className="px-4 py-3">Категорія</th>
                        <th className="px-4 py-3">Склади</th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('totalReserved')}>Резерв <ArrowUpDown className="w-3 h-3 inline" /></th>
                        <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort('totalAvailable')}>Вільний залишок <ArrowUpDown className="w-3 h-3 inline" /></th>
                        <th className="px-4 py-3 text-right">Дії</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedCatalogItems.map((item) => {
                        const isLow = item.totalAvailable <= item.minStockThreshold;
                        const isSelected = activeItem?.id === item.id;
                        return (
                          <tr key={item.id} onClick={() => fetchSingleItemDetails(item.sku)} className={`cursor-pointer transition ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'}`}>
                            <td className="px-4 py-3 font-mono font-bold text-xs">{item.sku}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{item.category}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {item.stockDetails?.map(s => (
                                  <span key={s.warehouseId} className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                                    {s.warehouseName.split(' ')[0]}: <b>{s.available}</b>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-amber-600 font-bold text-xs">{item.totalReserved} {item.unit}</td>
                            <td className="px-4 py-3"><span className={`font-bold text-sm ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>{item.totalAvailable} {item.unit}</span></td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => generateBarcodePDF(item)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded"><Printer className="w-4 h-4" /></button>
                                {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                                  <>
                                    <button onClick={() => openEditItemModal(item)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Пагінація Каталогу */}
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Показано <b>{paginatedCatalogItems.length}</b> з <b>{filteredItems.length}</b> товарів
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCatalogPage(1)}
                        disabled={catalogPage === 1}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1"
                        title="Перша сторінка"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
                        disabled={catalogPage === 1}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1"
                        title="Попередня сторінка"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-semibold px-2">
                        Сторінка {catalogPage} з {totalCatalogPages}
                      </span>
                      <button
                        onClick={() => setCatalogPage(p => Math.min(totalCatalogPages, p + 1))}
                        disabled={catalogPage === totalCatalogPages}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1"
                        title="Наступна сторінка"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCatalogPage(totalCatalogPages)}
                        disabled={catalogPage === totalCatalogPages}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1"
                        title="Остання сторінка"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* СКЛАДИ */}
            {activeTab === 'WAREHOUSES' && currentUser.role === 'ADMIN' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm">Список складів Furni</h3>
                  <button onClick={openCreateWhModal} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Додати склад
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {warehousesListAll.map(w => (
                    <div key={w.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-900 text-base">{w.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100">{w.isShowroom ? 'Шоурум' : 'Склад'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{w.location || 'Без адреси'}</p>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button onClick={() => openEditWhModal(w)} className="p-1 text-slate-500 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteWarehouse(w.id)} className="p-1 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* КОРИСТУВАЧІ */}
            {activeTab === 'USERS' && currentUser.role === 'ADMIN' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h2 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-purple-600" /> Реєстрація співробітника
                  </h2>
                  <form onSubmit={handleRegisterUser} className="grid grid-cols-4 gap-4">
                    <input type="text" placeholder="ПІБ" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="p-2 border rounded-lg text-xs" required />
                    <input type="text" placeholder="Логін" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="p-2 border rounded-lg text-xs" required />
                    <input type="password" placeholder="Пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="p-2 border rounded-lg text-xs" required />
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="p-2 border rounded-lg text-xs font-bold">
                      <option value="STOREKEEPER">STOREKEEPER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <div className="col-span-4 flex justify-end">
                      <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold">+ Створити акаунт</button>
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
                          <td className="px-6 py-4 font-mono font-bold text-xs">{u.id}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{u.fullName}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">@{u.username}</td>
                          <td className="px-6 py-4"><span className="text-[11px] font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-800">{u.role}</span></td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => { setEditingUser(u); setEditFullName(u.fullName); setEditUsername(u.username); setEditRole(u.role); setEditPassword(''); }} className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 border">
                                <Edit className="w-3.5 h-3.5" /> Редагувати
                              </button>
                              {u.id !== currentUser.id && (
                                <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200" title="Видалити">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

            {/* ДАШБОРД */}
            {activeTab === 'DASHBOARD' && (
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase">Всього товарів</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">{items.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase">Критичний дефіцит</p>
                  <p className="text-3xl font-extrabold text-red-600 mt-1">{lowStockItems.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase">Резерви під клієнтів</p>
                  <p className="text-3xl font-extrabold text-amber-600 mt-1">{items.reduce((acc, i) => acc + (i.totalReserved || 0), 0)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Права панель */}
          <div className="w-96 bg-white border-l border-slate-200 flex flex-col justify-between overflow-y-auto p-6 shadow-lg">
            {activeItem ? (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{activeItem.category}</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{activeItem.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">SKU: <span className="font-mono font-bold text-slate-800">{activeItem.sku}</span></p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setOperationMode('STOCK')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${operationMode === 'STOCK' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Рух</button>
                  {currentUser.role !== 'MANAGER' && (
                    <>
                      <button onClick={() => setOperationMode('TRANSFER')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${operationMode === 'TRANSFER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Трансфер</button>
                      <button onClick={() => setOperationMode('AUDIT')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${operationMode === 'AUDIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Ревізія</button>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Оберіть склад:</label>
                  <div className="space-y-1.5">
                    {activeItem.stockDetails?.map(s => (
                      <div key={s.warehouseId} onClick={() => setSelectedSourceWh(s.warehouseId)} className={`p-2.5 rounded-lg border text-xs cursor-pointer ${selectedSourceWh === s.warehouseId ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between font-bold text-slate-800"><span>{s.warehouseName}</span><span className="text-amber-600">Резерв: {s.reserved}</span></div>
                        <div className="flex justify-between text-slate-500 mt-1"><span>Фізично: {s.physical}</span><span className="font-bold text-emerald-600">Вільно: {s.available} {activeItem.unit}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                {operationMode === 'TRANSFER' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Склад отримання:</label>
                    <div className="space-y-1.5">
                      {activeItem.stockDetails?.map(s => (
                        <div key={`t-${s.warehouseId}`} onClick={() => setSelectedTargetWh(s.warehouseId)} className={`p-2 rounded-lg border text-xs cursor-pointer ${selectedTargetWh === s.warehouseId ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                          <span className="font-bold text-slate-800">{s.warehouseName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{operationMode === 'AUDIT' ? 'Фактична кількість:' : 'Кількість:'}</label>
                  <input type="number" value={opQuantity} onChange={(e) => setOpQuantity(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold text-center" />
                </div>

                <div>
                  <input type="text" placeholder="Коментар до операції..." value={opComment} onChange={(e) => setOpComment(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                </div>

                {operationMode === 'STOCK' && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {currentUser.role !== 'MANAGER' && <button onClick={() => executeOperation('INCOMING')} className="py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">+ Прихід</button>}
                    <button onClick={() => executeOperation('RESERVE')} className="py-2.5 bg-amber-500 text-white rounded-lg text-xs font-bold">Бронювати</button>
                    <button onClick={() => executeOperation('UNRESERVE')} className="py-2.5 bg-sky-600 text-white rounded-lg text-xs font-bold">Розброн.</button>
                    {currentUser.role !== 'MANAGER' && <button onClick={() => executeOperation('OUTGOING')} className="py-2.5 bg-rose-600 text-white rounded-lg text-xs font-bold">- Видача</button>}
                  </div>
                )}
                {operationMode === 'TRANSFER' && <button onClick={executeTransfer} className="w-full py-3 bg-blue-600 text-white rounded-lg text-xs font-bold">🔄 Виконати переміщення</button>}
                {operationMode === 'AUDIT' && <button onClick={executeAudit} className="w-full py-3 bg-purple-600 text-white rounded-lg text-xs font-bold">📋 Зафіксувати результат ревізії</button>}

                {activeItem.historyLogs && activeItem.historyLogs.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                      <History className="w-3.5 h-3.5" /> Останні дії з товаром:
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {activeItem.historyLogs.map(l => (
                        <div key={l.id} className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>{l.type} ({l.quantity > 0 ? `+${l.quantity}` : l.quantity})</span>
                            <span className="text-[10px] text-slate-400 font-normal">{new Date(l.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{l.warehouseName}: <span className="italic">{l.comment || 'Без коментаря'}</span></p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Виконав: {l.createdBy}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <Boxes className="w-12 h-12 stroke-[1.5] mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Оберіть товар у списку</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* МОДАЛКА РЕДАГУВАННЯ КОРИСТУВАЧА */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-900 mb-3">Редагування користувача #{editingUser.id}</h3>
            <form onSubmit={handleUpdateUser} className="space-y-3">
              <input type="text" placeholder="ПІБ" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="w-full p-2 border rounded-lg text-xs" required />
              <input type="text" placeholder="Логін" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full p-2 border rounded-lg text-xs" required />
              <input type="password" placeholder="Новий пароль (необовʼязково)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full p-2 border rounded-lg text-xs" />
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} disabled={editingUser.id === currentUser.id} className="w-full p-2 border rounded-lg text-xs font-bold">
                <option value="STOREKEEPER">STOREKEEPER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold">Скасувати</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА ТОВАРУ */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-900 mb-3">{itemFormId ? 'Редагування товару' : 'Новий товар'}</h3>
            <form onSubmit={handleSaveItem} className="space-y-3">
              <input type="text" placeholder="Назва товару" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full p-2 border rounded-lg text-xs" required />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="SKU" value={itemSku} onChange={(e) => setItemSku(e.target.value)} className="p-2 border rounded-lg text-xs font-mono" required />
                <input type="text" placeholder="Штрихкод" value={itemBarcode} onChange={(e) => setItemBarcode(e.target.value)} className="p-2 border rounded-lg text-xs font-mono" required />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Категорія" value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="p-2 border rounded-lg text-xs" required />
                <input type="text" placeholder="Одиниця" value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} className="p-2 border rounded-lg text-xs" required />
                <input type="number" placeholder="Поріг" value={itemThreshold} onChange={(e) => setItemThreshold(e.target.value)} className="p-2 border rounded-lg text-xs" required />
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
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-900 mb-3">{warehouseFormId ? 'Редагування складу' : 'Новий склад'}</h3>
            <form onSubmit={handleSaveWarehouse} className="space-y-3">
              <input type="text" placeholder="Назва складу" value={whName} onChange={(e) => setWhName(e.target.value)} className="w-full p-2 border rounded-lg text-xs" required />
              <input type="text" placeholder="Адреса" value={whLocation} onChange={(e) => setWhLocation(e.target.value)} className="w-full p-2 border rounded-lg text-xs" />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="shw" checked={whIsShowroom} onChange={(e) => setWhIsShowroom(e.target.checked)} />
                <label htmlFor="shw" className="text-xs font-bold text-slate-700">Це шоурум</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowWarehouseModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold">Скасувати</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}