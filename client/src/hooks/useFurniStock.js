import { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { storage } from '../utils/storage';
import { showAlert, showConfirm } from '../utils/dialog';
import { Platform } from 'react-native';

export const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:3000/api'
  : 'https://matchless-reformat-serrated.ngrok-free.dev/api';

// export const API_BASE_URL = 'https://matchless-reformat-serrated.ngrok-free.dev/api';
export const ITEMS_PER_PAGE = 25;

export function useFurniStock() {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Дані
  const [items, setItems] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Операції / Активний товар
  const [activeItem, setActiveItem] = useState(null);
  const [selectedSourceWh, setSelectedSourceWh] = useState(null);
  const [selectedTargetWh, setSelectedTargetWh] = useState(null);
  const [opQuantity, setOpQuantity] = useState('1');
  const [opComment, setOpComment] = useState('');
  const isFetchingRef = useRef(false);

  // Фільтрація каталогу
  const [catSearch, setCatSearch] = useState('');
  const deferredCatSearch = useDeferredValue(catSearch);
  const [catCategory, setCatCategory] = useState('ALL');
  const [catWarehouse, setCatWarehouse] = useState('ALL');
  const [catSortField, setCatSortField] = useState('name');
  const [catSortDir, setCatSortDir] = useState('asc');
  const [catalogPage, setCatalogPage] = useState(1);

  // Фільтрація дефіциту
  const [lowSearch, setLowSearch] = useState('');
  const deferredLowSearch = useDeferredValue(lowSearch);
  const [lowCategory, setLowCategory] = useState('ALL');
  const [lowWarehouse, setLowWarehouse] = useState('ALL');
  const [lowSortField, setLowSortField] = useState('available');
  const [lowSortDir, setLowSortDir] = useState('asc');
  const [lowPage, setLowPage] = useState(1);

  // Завантаження збереженої сесії
  useEffect(() => {
    (async () => {
      const savedToken = await storage.getItem('furni_token');
      const savedUser = await storage.getItem('furni_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      }
    })();
  }, []);

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  // Авторизація
  const login = async (username, password) => {
    if (!username || !password) return showAlert('Увага', 'Введіть логін та пароль');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        await storage.setItem('furni_token', data.token);
        await storage.setItem('furni_user', JSON.stringify(data.user));
      } else {
        showAlert('Помилка входу', data.message || 'Невірні дані');
      }
    } catch {
      showAlert('Помилка підключення', 'Сервер недоступний');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setToken(null);
    setCurrentUser(null);
    setActiveItem(null);
    await storage.removeItem('furni_token');
    await storage.removeItem('furni_user');
  };

  // Завантаження даних
  const fetchCatalog = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items`, { headers: authHeaders });
      if (res.status === 401) return logout();
      if (res.ok) setItems(await res.json());
    } catch (e) {
      console.log('Помилка каталогу:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLowStock = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items/low-stock`, { headers: authHeaders });
      if (res.ok) setLowStockList(await res.json());
    } catch (e) {
      console.log('Помилка дефіциту:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/warehouses`, { headers: authHeaders });
      if (res.ok) setWarehousesList(await res.json());
    } catch (e) {
      console.log('Помилка складів:', e.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, { headers: authHeaders });
      if (res.ok) setUsersList(await res.json());
    } catch (e) {
      console.log('Помилка користувачів:', e.message);
    }
  };

  const fetchAll = async () => {
  setLoading(true);
  // Завантажуємо склади для ВСІХ користувачів, оскільки вони потрібні для фільтрів каталогу
  await Promise.all([fetchCatalog(), fetchLowStock(), fetchWarehouses()]);
  if (currentUser?.role === 'ADMIN') {
    await fetchUsers();
  }
  setLoading(false);
};

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  // Пошук товару за кодом / штрихкодом
  const fetchItemInfo = async (code) => {
    if (!code || !String(code).trim() || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items/search?code=${encodeURIComponent(String(code).trim())}`, {
        headers: authHeaders
      });
      const data = await res.json();
      if (res.ok && data?.id) {
        setActiveItem(data);
        if (data.stockDetails?.length > 0) {
          setSelectedSourceWh(data.stockDetails[0].warehouseId);
          if (data.stockDetails.length > 1) {
            setSelectedTargetWh(data.stockDetails[1].warehouseId);
          }
        }
      } else {
        showAlert('Повідомлення', data.message || 'Товар не знайдено');
      }
    } catch {
      showAlert('Помилка', 'Мережевий збій при пошуку товару');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Операції
  const executeOperation = async (type) => {
    if (!activeItem || !opQuantity || !selectedSourceWh) return showAlert('Увага', 'Оберіть склад та кількість');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operations`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          itemId: Number(activeItem.id),
          warehouseId: Number(selectedSourceWh),
          type,
          quantity: parseFloat(opQuantity),
          comment: opComment
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Успіх', 'Операцію проведено!');
        setOpComment('');
        fetchItemInfo(activeItem.sku);
        fetchCatalog();
        fetchLowStock();
      } else {
        showAlert('Відхилено', data.message);
      }
    } catch {
      showAlert('Помилка', 'Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const executeTransfer = async () => {
    if (!activeItem || !selectedSourceWh || !selectedTargetWh || selectedSourceWh === selectedTargetWh) {
      return showAlert('Помилка', 'Оберіть два різних склади');
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operations/transfer`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          itemId: Number(activeItem.id),
          fromWarehouseId: Number(selectedSourceWh),
          toWarehouseId: Number(selectedTargetWh),
          quantity: parseFloat(opQuantity),
          comment: opComment
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Успіх', 'Товар переміщено!');
        setOpComment('');
        fetchItemInfo(activeItem.sku);
        fetchCatalog();
        fetchLowStock();
      } else {
        showAlert('Відхилено', data.message);
      }
    } catch {
      showAlert('Помилка', 'Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const executeAudit = async () => {
    if (!activeItem || !selectedSourceWh || opQuantity === '' || isNaN(parseFloat(opQuantity))) {
      return showAlert('Помилка', 'Введіть фактичну кількість');
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operations/adjust`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          itemId: Number(activeItem.id),
          warehouseId: Number(selectedSourceWh),
          actualQuantity: parseFloat(opQuantity),
          comment: opComment
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Ревізію зафіксовано', `Різниця: ${data.difference > 0 ? '+' : ''}${data.difference}`);
        setOpComment('');
        fetchItemInfo(activeItem.sku);
        fetchCatalog();
        fetchLowStock();
      } else {
        showAlert('Помилка', data.message);
      }
    } catch {
      showAlert('Помилка', 'Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Items
  const saveItem = async (itemPayload, editingId) => {
    setLoading(true);
    try {
      const url = editingId ? `${API_BASE_URL}/items/${editingId}` : `${API_BASE_URL}/items`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(itemPayload)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Успіх', 'Товар збережено!');
        fetchCatalog();
        return true;
      }
      showAlert('Помилка', data.message);
      return false;
    } catch (e) {
      showAlert('Помилка', e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = (id) => {
    showConfirm('Підтвердження', 'Видалити цей товар?', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/items/${id}`, { method: 'DELETE', headers: authHeaders });
        if (res.ok) {
          showAlert('Успіх', 'Товар видалено');
          if (activeItem?.id === id) setActiveItem(null);
          fetchCatalog();
        } else {
          const err = await res.json();
          showAlert('Помилка', err.error || 'Не вдалося видалити');
        }
      } catch (e) {
        showAlert('Помилка', e.message);
      }
    });
  };

  // CRUD Warehouses
  const saveWarehouse = async (payload, editingId) => {
    setLoading(true);
    try {
      const url = editingId ? `${API_BASE_URL}/warehouses/${editingId}` : `${API_BASE_URL}/warehouses`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showAlert('Успіх', 'Склад збережено!');
        fetchWarehouses();
        fetchCatalog();
        return true;
      }
    } catch (e) {
      showAlert('Помилка', e.message);
    } finally {
      setLoading(false);
    }
    return false;
  };

  const deleteWarehouse = (id) => {
    showConfirm('Підтвердження', 'Видалити цей склад?', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/warehouses/${id}`, { method: 'DELETE', headers: authHeaders });
        if (res.ok) {
          showAlert('Успіх', 'Склад видалено');
          fetchWarehouses();
        }
      } catch (e) {
        showAlert('Помилка', e.message);
      }
    });
  };

  // CRUD Users
  const saveUser = async (payload, editingId) => {
    setLoading(true);
    try {
      const url = editingId ? `${API_BASE_URL}/users/${editingId}` : `${API_BASE_URL}/users/register`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showAlert('Успіх', 'Дані користувача збережено!');
        fetchUsers();
        return true;
      }
    } catch (e) {
      showAlert('Помилка', e.message);
    } finally {
      setLoading(false);
    }
    return false;
  };

  const deleteUser = (userId) => {
    if (userId === currentUser?.id) return showAlert('Увага', 'Ви не можете видалити власний акаунт');
    showConfirm('Підтвердження', 'Видалити користувача?', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE', headers: authHeaders });
        if (res.ok) {
          showAlert('Успіх', 'Користувача видалено');
          fetchUsers();
        }
      } catch (e) {
        showAlert('Помилка', e.message);
      }
    });
  };

  // Фільтрація каталогу
  const categoriesList = useMemo(() => ['ALL', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))], [items]);
  
  const filteredCatalog = useMemo(() => {
    const q = (deferredCatSearch || '').toLowerCase();
    return items
      .filter(item => {
        const matchesQuery = (item.name || '').toLowerCase().includes(q) || (item.sku || '').toLowerCase().includes(q) || (item.barcode || '').toLowerCase().includes(q);
        const matchesCategory = catCategory === 'ALL' || item.category === catCategory;
        const matchesWh = catWarehouse === 'ALL' || item.stockDetails?.some(s => s.warehouseId === parseInt(catWarehouse) && s.physical > 0);
        return matchesQuery && matchesCategory && matchesWh;
      })
      .sort((a, b) => {
        let valA = a[catSortField];
        let valB = b[catSortField];
        if (typeof valA === 'string') {
          return catSortDir === 'asc' ? (valA || '').localeCompare(valB || '') : (valB || '').localeCompare(valA || '');
        }
        return catSortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
  }, [items, deferredCatSearch, catCategory, catWarehouse, catSortField, catSortDir]);

  // Фільтрація дефіциту
  const lowWarehouseNames = useMemo(() => ['ALL', ...Array.from(new Set(lowStockList.map(i => i.warehouse).filter(Boolean)))], [lowStockList]);

  const filteredLowStock = useMemo(() => {
    const q = (deferredLowSearch || '').toLowerCase();
    return lowStockList
      .filter(item => {
        const matchesQuery = (item.name || '').toLowerCase().includes(q) || (item.sku || '').toLowerCase().includes(q) || (item.barcode || '').toLowerCase().includes(q);
        const matchesCategory = lowCategory === 'ALL' || item.category === lowCategory;
        const matchesWh = lowWarehouse === 'ALL' || item.warehouse === lowWarehouse;
        return matchesQuery && matchesCategory && matchesWh;
      })
      .sort((a, b) => {
        let valA = a[lowSortField];
        let valB = b[lowSortField];
        if (typeof valA === 'string') {
          return lowSortDir === 'asc' ? (valA || '').localeCompare(valB || '') : (valB || '').localeCompare(valA || '');
        }
        return lowSortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
  }, [lowStockList, deferredLowSearch, lowCategory, lowWarehouse, lowSortField, lowSortDir]);

  return {
    token, currentUser, loading, refreshing,
    items, lowStockList, warehousesList, usersList,
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
    login, logout, fetchAll, fetchCatalog, fetchLowStock, fetchItemInfo,
    executeOperation, executeTransfer, executeAudit,
    saveItem, deleteItem, saveWarehouse, deleteWarehouse, saveUser, deleteUser
  };
}