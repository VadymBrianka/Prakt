import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const API_BASE_URL = 'http://192.168.0.108:3000/api'; // Вкажіть IPv4 адресу комп'ютера

export default function App() {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('admin123');

  const [activeTab, setActiveTab] = useState('OPERATIONS'); // 'OPERATIONS' | 'CATALOG' | 'LOW_STOCK' | 'USERS' | 'WAREHOUSES'
  const [activeMode, setActiveMode] = useState('STOCK');
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);
  
  const [itemData, setItemData] = useState(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState(null);
  const [amount, setAmount] = useState('1');
  const [opComment, setOpComment] = useState('');
  const [manualCode, setManualCode] = useState('');
  
  const [catalogList, setCatalogList] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Фільтри та сортування мобільного каталогу
  const [catSearch, setCatSearch] = useState('');
  const [catCategory, setCatCategory] = useState('ALL');
  const [catSort, setCatSort] = useState('name'); // 'name' | 'available' | 'reserved'

  // Фільтри та сортування дефіциту
  const [lowSearch, setLowSearch] = useState('');
  const [lowCategory, setLowCategory] = useState('ALL');
  const [lowWarehouse, setLowWarehouse] = useState('ALL');
  const [lowSort, setLowSort] = useState('available'); // 'available' | 'name' | 'reserved'

  // Склади Modal
  const [whModalVisible, setWhModalVisible] = useState(false);
  const [editingWhId, setEditingWhId] = useState(null);
  const [whName, setWhName] = useState('');
  const [whLoc, setWhLoc] = useState('');
  const [whIsShowroom, setWhIsShowroom] = useState(false);

  // Товари Modal
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [formItemName, setFormItemName] = useState('');
  const [formItemSku, setFormItemSku] = useState('');
  const [formItemBarcode, setFormItemBarcode] = useState('');
  const [formItemCategory, setFormItemCategory] = useState('Завіси');
  const [formItemUnit, setFormItemUnit] = useState('шт');
  const [formItemThreshold, setFormItemThreshold] = useState('5');

  // Користувачі Modal
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('STOREKEEPER');

  useEffect(() => {
    if (token) {
      if (activeTab === 'CATALOG') fetchCatalog();
      if (activeTab === 'LOW_STOCK') fetchLowStock();
      if (activeTab === 'USERS' && currentUser?.role === 'ADMIN') fetchUsers();
      if (activeTab === 'WAREHOUSES' && currentUser?.role === 'ADMIN') fetchWarehouses();
    }
  }, [token, activeTab]);

  const handleLogin = async () => {
    if (!usernameInput || !passwordInput) return Alert.alert('Увага', 'Введіть логін та пароль');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
      } else {
        Alert.alert('Помилка входу', data.message || 'Невірні дані');
      }
    } catch (e) {
      Alert.alert('Помилка підключення', 'Сервер недоступний');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCatalogList(await res.json());
    } catch (e) {
      console.log('Помилка каталогу:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLowStock = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/items/low-stock`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLowStockList(await res.json());
    } catch (e) {
      console.log('Помилка дефіциту:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchWarehouses = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/warehouses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setWarehousesList(await res.json());
    } catch (e) {
      console.log('Помилка складів:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsersList(await res.json());
    } catch (e) {
      console.log('Помилка користувачів:', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  // ПОШУК ТОВАРУ
  const fetchItemInfo = async (code) => {
    if (!code || !String(code).trim() || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setActiveTab('OPERATIONS');
    setScanned(true);

    let successData = null;

    try {
      const targetCode = String(code).trim();
      const response = await fetch(`${API_BASE_URL}/items/search?code=${encodeURIComponent(targetCode)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok && data && data.id) {
        successData = data;
      } else {
        Alert.alert('Повідомлення', data.message || 'Товар не знайдено в базі');
      }
    } catch (e) {
      if (!successData) {
        Alert.alert('Мережевий збій', 'Не вдалося завантажити картку товару');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }

    if (successData) {
      setItemData(successData);
      if (successData.stockDetails && successData.stockDetails.length > 0) {
        setSelectedWarehouseId(successData.stockDetails[0].warehouseId);
        if (successData.stockDetails.length > 1) {
          setSelectedTargetWh(successData.stockDetails[1].warehouseId);
        }
      }
    }
  };

  // ОПЕРАЦІЇ
  const executeOperation = async (type) => {
    if (!itemData || !amount || !selectedWarehouseId) return Alert.alert('Увага', 'Оберіть склад та кількість');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ itemId: Number(itemData.id), warehouseId: Number(selectedWarehouseId), type, quantity: parseFloat(amount), comment: opComment })
      });
      const res = await response.json();
      if (response.ok) {
        Alert.alert('Успіх', 'Операцію проведено!');
        setOpComment('');
        fetchItemInfo(itemData.sku);
      } else {
        Alert.alert('Відхилено', res.message);
      }
    } catch (e) {
      Alert.alert('Помилка', 'Не вдалося виконати операцію');
    } finally {
      setLoading(false);
    }
  };

  const executeTransfer = async () => {
    if (!selectedWarehouseId || !targetWarehouseId || selectedWarehouseId === targetWarehouseId) {
      return Alert.alert('Помилка', 'Оберіть різні склади');
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/operations/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ itemId: Number(itemData.id), fromWarehouseId: Number(selectedWarehouseId), toWarehouseId: Number(targetWarehouseId), quantity: parseFloat(amount), comment: opComment })
      });
      const res = await response.json();
      if (response.ok) {
        Alert.alert('Успіх', 'Товар переміщено!');
        setOpComment('');
        fetchItemInfo(itemData.sku);
      } else {
        Alert.alert('Відхилено', res.message);
      }
    } catch (e) {
      Alert.alert('Помилка', 'Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  const executeAudit = async () => {
    if (amount === '' || isNaN(parseFloat(amount))) return Alert.alert('Помилка', 'Введіть фактичну кількість');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/operations/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ itemId: Number(itemData.id), warehouseId: Number(selectedWarehouseId), actualQuantity: parseFloat(amount), comment: opComment })
      });
      const res = await response.json();
      if (response.ok) {
        Alert.alert('Ревізію зафіксовано', `Різниця: ${res.difference > 0 ? '+' : ''}${res.difference}`);
        setOpComment('');
        fetchItemInfo(itemData.sku);
      } else {
        Alert.alert('Помилка', res.message);
      }
    } catch (e) {
      Alert.alert('Помилка', 'Мережевий збій');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Items
  const handleSaveItem = async () => {
    if (!formItemName || !formItemSku || !formItemBarcode) return Alert.alert('Помилка', 'Заповніть назву, SKU та штрихкод');
    setLoading(true);
    try {
      const url = editingItemId ? `${API_BASE_URL}/items/${editingItemId}` : `${API_BASE_URL}/items`;
      const method = editingItemId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: formItemName,
          sku: formItemSku,
          barcode: formItemBarcode,
          category: formItemCategory,
          unit: formItemUnit,
          minStockThreshold: parseFloat(formItemThreshold) || 5
        })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Успіх', 'Товар збережено!');
        setItemModalVisible(false);
        fetchCatalog();
      } else {
        Alert.alert('Помилка', data.message);
      }
    } catch (e) {
      Alert.alert('Помилка', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    Alert.alert('Підтвердження', 'Видалити цей товар?', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/items/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
              Alert.alert('Успіх', 'Товар видалено');
              setItemData(null);
              fetchCatalog();
            } else {
              const err = await res.json();
              Alert.alert('Помилка', err.error || 'Не вдалося видалити');
            }
          } catch (e) {
            Alert.alert('Помилка', e.message);
          }
        }
      }
    ]);
  };

  // CRUD Warehouses
  const handleSaveWarehouse = async () => {
    if (!whName) return Alert.alert('Помилка', 'Введіть назву');
    setLoading(true);
    try {
      const url = editingWhId ? `${API_BASE_URL}/warehouses/${editingWhId}` : `${API_BASE_URL}/warehouses`;
      const method = editingWhId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: whName, location: whLoc, isShowroom: whIsShowroom })
      });
      if (res.ok) {
        Alert.alert('Успіх', 'Склад збережено!');
        setWhModalVisible(false);
        fetchWarehouses();
      }
    } catch (e) {
      Alert.alert('Помилка', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWarehouse = async (id) => {
    Alert.alert('Підтвердження', 'Видалити цей склад?', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/warehouses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
              Alert.alert('Успіх', 'Склад видалено');
              fetchWarehouses();
            }
          } catch (e) {
            Alert.alert('Помилка', e.message);
          }
        }
      }
    ]);
  };

  // CRUD Users
  const handleSaveUser = async () => {
    if (!formFullName || !formUsername) return Alert.alert('Помилка', 'Заповніть поля');
    setLoading(true);
    try {
      const url = editingUserId ? `${API_BASE_URL}/users/${editingUserId}` : `${API_BASE_URL}/users/register`;
      const method = editingUserId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fullName: formFullName, username: formUsername, role: formRole, password: formPassword })
      });
      if (res.ok) {
        Alert.alert('Успіх', 'Дані користувача збережено!');
        setUserModalVisible(false);
        fetchUsers();
      }
    } catch (e) {
      Alert.alert('Помилка', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) return Alert.alert('Увага', 'Ви не можете видалити власний акаунт');
    Alert.alert('Підтвердження', 'Видалити користувача?', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
              Alert.alert('Успіх', 'Користувача видалено');
              fetchUsers();
            }
          } catch (e) {
            Alert.alert('Помилка', e.message);
          }
        }
      }
    ]);
  };

  // Мобільна фільтрація та сортування
  const categoriesList = useMemo(() => ['ALL', ...Array.from(new Set(catalogList.map(i => i.category).filter(Boolean)))], [catalogList]);
  const warehousesListNames = useMemo(() => ['ALL', ...Array.from(new Set(lowStockList.map(i => i.warehouse).filter(Boolean)))], [lowStockList]);

  const filteredCatalog = useMemo(() => {
    return catalogList
      .filter(item => {
        const matchesSearch = (item.name || '').toLowerCase().includes(catSearch.toLowerCase()) || (item.sku || '').toLowerCase().includes(catSearch.toLowerCase());
        const matchesCat = catCategory === 'ALL' || item.category === catCategory;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        if (catSort === 'name') return (a.name || '').localeCompare(b.name || '');
        if (catSort === 'available') return b.totalAvailable - a.totalAvailable;
        if (catSort === 'reserved') return b.totalReserved - a.totalReserved;
        return 0;
      });
  }, [catalogList, catSearch, catCategory, catSort]);

  const filteredLowStock = useMemo(() => {
    return lowStockList
      .filter(item => {
        const matchesSearch = (item.name || '').toLowerCase().includes(lowSearch.toLowerCase()) || (item.sku || '').toLowerCase().includes(lowSearch.toLowerCase());
        const matchesCat = lowCategory === 'ALL' || item.category === lowCategory;
        const matchesWh = lowWarehouse === 'ALL' || item.warehouse === lowWarehouse;
        return matchesSearch && matchesCat && matchesWh;
      })
      .sort((a, b) => {
        if (lowSort === 'available') return a.available - b.available;
        if (lowSort === 'name') return (a.name || '').localeCompare(b.name || '');
        if (lowSort === 'reserved') return b.reserved - a.reserved;
        return 0;
      });
  }, [lowStockList, lowSearch, lowCategory, lowWarehouse, lowSort]);

  if (!token || !currentUser) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <View style={styles.authBox}>
          <Text style={styles.authLogo}>Furni Stock</Text>
          <Text style={styles.authSub}>Авторизація терміналу</Text>
          <TextInput placeholder="Логін" placeholderTextColor="#94a3b8" value={usernameInput} onChangeText={setUsernameInput} style={styles.authInput} autoCapitalize="none" />
          <TextInput placeholder="Пароль" placeholderTextColor="#94a3b8" value={passwordInput} onChangeText={setPasswordInput} secureTextEntry style={styles.authInput} />
          <TouchableOpacity style={styles.authBtn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authBtnText}>Увійти</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <View>
          <Text style={styles.logoTitle}>{currentUser.fullName}</Text>
          <Text style={styles.roleBadgeText}>Роль: {currentUser.role}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => { setToken(null); setCurrentUser(null); }}>
          <Text style={styles.logoutText}>Вийти</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'OPERATIONS' && styles.tabBtnActive]} onPress={() => setActiveTab('OPERATIONS')}>
          <Text style={[styles.tabText, activeTab === 'OPERATIONS' && styles.tabTextActive]}>📦 Сканер</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'CATALOG' && styles.tabBtnActive]} onPress={() => setActiveTab('CATALOG')}>
          <Text style={[styles.tabText, activeTab === 'CATALOG' && styles.tabTextActive]}>📋 Каталог</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'LOW_STOCK' && styles.tabBtnActive]} onPress={() => setActiveTab('LOW_STOCK')}>
          <Text style={[styles.tabText, activeTab === 'LOW_STOCK' && styles.tabTextActive]}>⚠️ Дефіцит</Text>
        </TouchableOpacity>
        {currentUser.role === 'ADMIN' && (
          <>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'WAREHOUSES' && styles.tabBtnActive]} onPress={() => setActiveTab('WAREHOUSES')}>
              <Text style={[styles.tabText, activeTab === 'WAREHOUSES' && styles.tabTextActive]}>🏢 Склади</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'USERS' && styles.tabBtnActive]} onPress={() => setActiveTab('USERS')}>
              <Text style={[styles.tabText, activeTab === 'USERS' && styles.tabTextActive]}>👥 Юзери</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 1. КАТАЛОГ З ФІЛЬТРАМИ ТА СОРТУВАННЯМ */}
      {activeTab === 'CATALOG' && (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              placeholder="Пошук у каталозі..."
              value={catSearch}
              onChangeText={setCatSearch}
              style={[styles.searchInput, { flex: 1 }]}
            />
            {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
              <TouchableOpacity style={styles.addBtnSmall} onPress={() => {
                setEditingItemId(null);
                setFormItemName('');
                setFormItemSku(`SKU-${Date.now().toString().slice(-4)}`);
                setFormItemBarcode(`4820000${Math.floor(10000 + Math.random() * 90000)}`);
                setFormItemCategory('Завіси');
                setFormItemUnit('шт');
                setFormItemThreshold('5');
                setItemModalVisible(true);
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Товар</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Горизонтальні категорії */}
          <View style={{ marginBottom: 10 }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingVertical: 4, gap: 6 }}
            >
              {categoriesList.map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[styles.filterChip, catCategory === c && styles.filterChipActive]} 
                  onPress={() => setCatCategory(c)}
                >
                  <Text style={[styles.filterChipText, catCategory === c && styles.filterChipTextActive]}>
                    {c === 'ALL' ? 'Всі категорії' : c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Панель сортування каталогу */}
          <View style={styles.sortBar}>
            <Text style={styles.sortLabel}>Сортування:</Text>
            <TouchableOpacity onPress={() => setCatSort('name')} style={[styles.sortBtn, catSort === 'name' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, catSort === 'name' && styles.sortBtnTextActive]}>А-Я</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCatSort('available')} style={[styles.sortBtn, catSort === 'available' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, catSort === 'available' && styles.sortBtnTextActive]}>Залишок ↓</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCatSort('reserved')} style={[styles.sortBtn, catSort === 'reserved' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, catSort === 'reserved' && styles.sortBtnTextActive]}>Резерв ↓</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredCatalog}
            keyExtractor={(item) => String(item.id)}
            refreshing={refreshing}
            onRefresh={fetchCatalog}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.catalogCard} onPress={() => fetchItemInfo(item.sku)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catalogName}>{item.name}</Text>
                  <Text style={styles.catalogSku}>SKU: {item.sku} • {item.category}</Text>
                  <Text style={styles.catalogStock}>Доступно: <Text style={{ fontWeight: 'bold', color: item.totalAvailable <= item.minStockThreshold ? '#dc2626' : '#16a34a' }}>{item.totalAvailable} {item.unit}</Text> (Резерв: {item.totalReserved})</Text>
                </View>
                {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => {
                      setEditingItemId(item.id);
                      setFormItemName(item.name);
                      setFormItemSku(item.sku);
                      setFormItemBarcode(item.barcode);
                      setFormItemCategory(item.category);
                      setFormItemUnit(item.unit);
                      setFormItemThreshold(String(item.minStockThreshold));
                      setItemModalVisible(true);
                    }}>
                      <Text style={{ fontSize: 14 }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDeleteItem(item.id)}>
                      <Text style={{ fontSize: 14 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 2. ДЕФІЦИТ З ФІЛЬТРАМИ ТА СОРТУВАННЯМ */}
      {activeTab === 'LOW_STOCK' && (
        <View style={{ flex: 1, padding: 16 }}>
          <TextInput
            placeholder="Пошук у дефіциті..."
            value={lowSearch}
            onChangeText={setLowSearch}
            style={[styles.searchInput, { marginBottom: 8 }]}
          />

          {/* Горизонтальні склади */}
          <View style={{ marginBottom: 10 }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingVertical: 4, gap: 6 }}
            >
              {warehousesListNames.map(w => (
                <TouchableOpacity 
                  key={w} 
                  style={[styles.filterChip, lowWarehouse === w && styles.filterChipActive]} 
                  onPress={() => setLowWarehouse(w)}
                >
                  <Text style={[styles.filterChipText, lowWarehouse === w && styles.filterChipTextActive]}>
                    {w === 'ALL' ? 'Всі склади' : w}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Сортування дефіциту */}
          <View style={styles.sortBar}>
            <Text style={styles.sortLabel}>Сортування:</Text>
            <TouchableOpacity onPress={() => setLowSort('available')} style={[styles.sortBtn, lowSort === 'available' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, lowSort === 'available' && styles.sortBtnTextActive]}>Критичність ↑</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLowSort('name')} style={[styles.sortBtn, lowSort === 'name' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, lowSort === 'name' && styles.sortBtnTextActive]}>А-Я</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLowSort('reserved')} style={[styles.sortBtn, lowSort === 'reserved' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, lowSort === 'reserved' && styles.sortBtnTextActive]}>Резерв ↓</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredLowStock}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            refreshing={refreshing}
            onRefresh={fetchLowStock}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.lowStockCard} onPress={() => fetchItemInfo(item.sku)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lowStockName}>{item.name}</Text>
                  <Text style={styles.lowStockSku}>SKU: {item.sku} • {item.warehouse}</Text>
                  <Text style={{ fontSize: 11, color: '#ea580c', marginTop: 2 }}>В резерві: {item.reserved} {item.unit}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.lowStockQty}>{item.available} {item.unit}</Text>
                  <Text style={styles.dangerLabel}>Поріг: {item.minThreshold}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 3. СКЛАДИ (ADMIN) */}
      {activeTab === 'WAREHOUSES' && currentUser.role === 'ADMIN' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.addWhBtn} onPress={() => {
            setEditingWhId(null);
            setWhName('');
            setWhLoc('');
            setWhIsShowroom(false);
            setWhModalVisible(true);
          }}>
            <Text style={styles.addWhBtnText}>+ Додати новий склад</Text>
          </TouchableOpacity>
          {warehousesList.map(w => (
            <View key={w.id} style={styles.userListItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{w.name}</Text>
                <Text style={styles.userLogin}>{w.location || 'Без адреси'} {w.isShowroom ? '(Шоурум)' : ''}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => {
                  setEditingWhId(w.id);
                  setWhName(w.name);
                  setWhLoc(w.location || '');
                  setWhIsShowroom(w.isShowroom);
                  setWhModalVisible(true);
                }}>
                  <Text>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDeleteWarehouse(w.id)}>
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 4. КОРИСТУВАЧІ (ADMIN) */}
      {activeTab === 'USERS' && currentUser.role === 'ADMIN' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={[styles.addWhBtn, { backgroundColor: '#7e22ce' }]} onPress={() => {
            setEditingUserId(null);
            setFormFullName('');
            setFormUsername('');
            setFormPassword('');
            setFormRole('STOREKEEPER');
            setUserModalVisible(true);
          }}>
            <Text style={styles.addWhBtnText}>+ Додати співробітника</Text>
          </TouchableOpacity>
          {usersList.map(u => (
            <View key={u.id} style={styles.userListItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{u.fullName}</Text>
                <Text style={styles.userLogin}>@{u.username} • <Text style={{ fontWeight: 'bold' }}>{u.role}</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={styles.editUserBtn} onPress={() => {
                  setEditingUserId(u.id);
                  setFormFullName(u.fullName);
                  setFormUsername(u.username);
                  setFormRole(u.role);
                  setFormPassword('');
                  setUserModalVisible(true);
                }}>
                  <Text style={styles.editUserBtnText}>Редагувати</Text>
                </TouchableOpacity>
                {u.id !== currentUser.id && (
                  <TouchableOpacity style={styles.deleteUserBtn} onPress={() => handleDeleteUser(u.id)}>
                    <Text style={styles.deleteUserBtnText}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 5. СКАНИНГ ТА ОПЕРАЦІЇ */}
      {activeTab === 'OPERATIONS' && (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.scannerWrapper}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'code128'] }}
              onBarcodeScanned={scanned ? undefined : ({ data }) => {
                setScanned(true);
                fetchItemInfo(data);
              }}
            />
            <TouchableOpacity style={styles.torchBtn} onPress={() => setTorch(!torch)}>
              <Text style={styles.torchText}>{torch ? '🔦 Вимк.' : '💡 Ліхтар'}</Text>
            </TouchableOpacity>
            {scanned && (
              <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                <Text style={styles.rescanText}>📷 Сканувати наступний</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchRow}>
            <TextInput placeholder="Введіть SKU чи штрихкод..." value={manualCode} onChangeText={setManualCode} style={styles.searchInput} />
            <TouchableOpacity style={styles.searchActionBtn} onPress={() => fetchItemInfo(manualCode)}>
              <Text style={styles.searchActionText}>Пошук</Text>
            </TouchableOpacity>
          </View>

          {itemData && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.categoryBadge}>{itemData.category}</Text>
                {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                  <TouchableOpacity onPress={() => handleDeleteItem(itemData.id)}>
                    <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 12 }}>Видалити товар</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.itemName}>{itemData.name}</Text>
              <Text style={styles.skuText}>SKU: {itemData.sku}</Text>

              <View style={styles.modeTabs}>
                <TouchableOpacity style={[styles.modeTab, activeMode === 'STOCK' && styles.modeTabActive]} onPress={() => setActiveMode('STOCK')}>
                  <Text style={[styles.modeTabText, activeMode === 'STOCK' && styles.modeTabTextActive]}>Рух</Text>
                </TouchableOpacity>
                {currentUser.role !== 'MANAGER' && (
                  <>
                    <TouchableOpacity style={[styles.modeTab, activeMode === 'TRANSFER' && styles.modeTabActive]} onPress={() => setActiveMode('TRANSFER')}>
                      <Text style={[styles.modeTabText, activeMode === 'TRANSFER' && styles.modeTabTextActive]}>Трансфер</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modeTab, activeMode === 'AUDIT' && styles.modeTabActive]} onPress={() => setActiveMode('AUDIT')}>
                      <Text style={[styles.modeTabText, activeMode === 'AUDIT' && styles.modeTabTextActive]}>Ревізія</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <Text style={styles.sectionHeader}>Оберіть склад:</Text>
              {itemData.stockDetails?.map((s) => (
                <TouchableOpacity key={s.warehouseId} style={[styles.whCard, selectedWarehouseId === s.warehouseId && styles.whCardActive]} onPress={() => setSelectedWarehouseId(s.warehouseId)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.whTitle}>{s.warehouseName}</Text>
                    <Text style={{ color: '#ea580c', fontWeight: 'bold' }}>Резерв: {s.reserved}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>Фізично: {s.physical} | <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>Вільно: {s.available} {itemData.unit}</Text></Text>
                </TouchableOpacity>
              ))}

              {activeMode === 'TRANSFER' && (
                <>
                  <Text style={[styles.sectionHeader, { marginTop: 8 }]}>Склад отримання:</Text>
                  {itemData.stockDetails?.map((s) => (
                    <TouchableOpacity key={`to-${s.warehouseId}`} style={[styles.whCard, targetWarehouseId === s.warehouseId && styles.whCardTargetActive]} onPress={() => setTargetWarehouseId(s.warehouseId)}>
                      <Text style={[styles.whTitle, targetWarehouseId === s.warehouseId && { color: '#16a34a' }]}>{s.warehouseName}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <Text style={[styles.sectionHeader, { marginTop: 10 }]}>Кількість:</Text>
              <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.qtyInput} />

              <TextInput placeholder="Коментар до операції..." value={opComment} onChangeText={setOpComment} style={styles.commentInput} />

              {activeMode === 'STOCK' && (
                <View style={styles.actionGrid}>
                  {currentUser.role !== 'MANAGER' && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => executeOperation('INCOMING')}><Text style={styles.actionBtnText}>+ Прихід</Text></TouchableOpacity>}
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ea580c' }]} onPress={() => executeOperation('RESERVE')}><Text style={styles.actionBtnText}>Бронь</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0284c7' }]} onPress={() => executeOperation('UNRESERVE')}><Text style={styles.actionBtnText}>Розброн.</Text></TouchableOpacity>
                  {currentUser.role !== 'MANAGER' && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc2626' }]} onPress={() => executeOperation('OUTGOING')}><Text style={styles.actionBtnText}>- Видача</Text></TouchableOpacity>}
                </View>
              )}
              {activeMode === 'TRANSFER' && <TouchableOpacity style={[styles.fullBtn, { backgroundColor: '#2563eb' }]} onPress={executeTransfer}><Text style={styles.fullBtnText}>🔄 Перемістити</Text></TouchableOpacity>}
              {activeMode === 'AUDIT' && <TouchableOpacity style={[styles.fullBtn, { backgroundColor: '#7c3aed' }]} onPress={executeAudit}><Text style={styles.fullBtnText}>📋 Зафіксувати ревізію</Text></TouchableOpacity>}

              {itemData.historyLogs && itemData.historyLogs.length > 0 && (
                <View style={{ marginTop: 15, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 10 }}>
                  <Text style={[styles.sectionHeader, { marginBottom: 6 }]}>Останні дії з товаром:</Text>
                  {itemData.historyLogs.map(l => (
                    <View key={l.id} style={styles.logItem}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 11 }}>{l.type} ({l.quantity > 0 ? `+${l.quantity}` : l.quantity})</Text>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(l.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{l.warehouseName}: <Text style={{ fontStyle: 'italic' }}>{l.comment || 'Без коментаря'}</Text></Text>
                      <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>Виконав: {l.createdBy}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL ТОВАРУ */}
      <Modal visible={itemModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingItemId ? 'Редагування товару' : 'Новий товар'}</Text>
            <TextInput placeholder="Назва товару" value={formItemName} onChangeText={setFormItemName} style={styles.adminInput} />
            <TextInput placeholder="SKU" value={formItemSku} onChangeText={setFormItemSku} style={styles.adminInput} />
            <TextInput placeholder="Штрихкод" value={formItemBarcode} onChangeText={setFormItemBarcode} style={styles.adminInput} />
            <TextInput placeholder="Категорія" value={formItemCategory} onChangeText={setFormItemCategory} style={styles.adminInput} />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput placeholder="Од. (шт)" value={formItemUnit} onChangeText={setFormItemUnit} style={[styles.adminInput, { flex: 1 }]} />
              <TextInput placeholder="Поріг" value={formItemThreshold} onChangeText={setFormItemThreshold} keyboardType="numeric" style={[styles.adminInput, { flex: 1 }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#cbd5e1' }]} onPress={() => setItemModalVisible(false)}><Text style={{ fontWeight: 'bold' }}>Скасувати</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#2563eb' }]} onPress={handleSaveItem}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Зберегти</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL СКЛАДУ */}
      <Modal visible={whModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingWhId ? 'Редагування складу' : 'Новий склад'}</Text>
            <TextInput placeholder="Назва складу" value={whName} onChangeText={setWhName} style={styles.adminInput} />
            <TextInput placeholder="Локація / адреса" value={whLoc} onChangeText={setWhLoc} style={styles.adminInput} />
            <TouchableOpacity style={{ paddingVertical: 8 }} onPress={() => setWhIsShowroom(!whIsShowroom)}>
              <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{whIsShowroom ? '☑ Це шоурум' : '☐ Звичайний склад'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#cbd5e1' }]} onPress={() => setWhModalVisible(false)}><Text style={{ fontWeight: 'bold' }}>Скасувати</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#059669' }]} onPress={handleSaveWarehouse}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Зберегти</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL КОРИСТУВАЧА */}
      <Modal visible={userModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingUserId ? 'Редагування користувача' : 'Новий співробітник'}</Text>
            <TextInput placeholder="ПІБ" value={formFullName} onChangeText={setFormFullName} style={styles.adminInput} />
            <TextInput placeholder="Логін" value={formUsername} onChangeText={setFormUsername} style={styles.adminInput} autoCapitalize="none" />
            <TextInput placeholder="Пароль" value={formPassword} onChangeText={setFormPassword} secureTextEntry style={styles.adminInput} />
            
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>Роль:</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {['STOREKEEPER', 'MANAGER', 'ADMIN'].map(r => (
                <TouchableOpacity key={r} style={[styles.rolePickBtn, formRole === r && { backgroundColor: '#7e22ce' }]} onPress={() => setFormRole(r)}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: formRole === r ? '#fff' : '#64748b' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#cbd5e1' }]} onPress={() => setUserModalVisible(false)}><Text style={{ fontWeight: 'bold' }}>Скасувати</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#7e22ce' }]} onPress={handleSaveUser}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Зберегти</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  authBox: { width: '100%', maxWidth: 340, backgroundColor: '#1e293b', padding: 24, borderRadius: 16 },
  authLogo: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  authSub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  authInput: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  authBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  authBtnText: { color: '#fff', fontWeight: 'bold' },

  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  logoTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  roleBadgeText: { fontSize: 11, color: '#2563eb', fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  logoutText: { color: '#b91c1c', fontSize: 12, fontWeight: 'bold' },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: '#2563eb' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#2563eb', fontWeight: 'bold' },

  scrollContent: { padding: 16, paddingBottom: 30 },
  scannerWrapper: { height: 140, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  torchBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 6 },
  torchText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  rescanBtn: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  rescanText: { color: '#fff', fontWeight: 'bold' },

  searchRow: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 13 },
  searchActionBtn: { backgroundColor: '#0f172a', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  searchActionText: { color: '#fff', fontWeight: 'bold' },
  addBtnSmall: { backgroundColor: '#2563eb', paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 },

filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'center',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  sortBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingVertical: 4 },
  sortLabel: { fontSize: 11, color: '#64748b', fontWeight: 'bold' },
  sortBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  sortBtnActive: { backgroundColor: '#2563eb', borderColor: '#1d4ed8' },
  sortBtnText: { fontSize: 10, color: '#475569', fontWeight: 'bold' },
  sortBtnTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  categoryBadge: { backgroundColor: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 'bold', padding: 4, borderRadius: 4, alignSelf: 'flex-start' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  skuText: { fontSize: 12, color: '#64748b', marginBottom: 8 },

  modeTabs: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  modeTab: { flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 6 },
  modeTabActive: { backgroundColor: '#0f172a' },
  modeTabText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  modeTabTextActive: { color: '#fff' },

  sectionHeader: { fontSize: 11, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginVertical: 4 },
  whCard: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, marginVertical: 3, backgroundColor: '#f8fafc' },
  whCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  whCardTargetActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  whTitle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  qtyInput: { width: 80, padding: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginVertical: 4 },
  commentInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 12, marginVertical: 4 },

  actionGrid: { flexDirection: 'row', gap: 6, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  fullBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  fullBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  addWhBtn: { backgroundColor: '#059669', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  addWhBtnText: { color: '#fff', fontWeight: 'bold' },
  userListItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  userLogin: { fontSize: 11, color: '#64748b', marginTop: 2 },
  editUserBtn: { backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#d8b4fe' },
  editUserBtnText: { color: '#7e22ce', fontSize: 11, fontWeight: 'bold' },
  deleteUserBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#fca5a5' },
  deleteUserBtnText: { color: '#dc2626', fontSize: 11, fontWeight: 'bold' },
  actionIconBtn: { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },

  catalogCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catalogName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  catalogSku: { fontSize: 11, color: '#64748b', marginTop: 2 },
  catalogStock: { fontSize: 11, color: '#334155', marginTop: 2 },

  lowStockCard: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fee2e2', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lowStockName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  lowStockSku: { fontSize: 11, color: '#64748b', marginTop: 2 },
  lowStockQty: { fontSize: 15, fontWeight: 'bold', color: '#dc2626' },
  dangerLabel: { fontSize: 10, color: '#dc2626', fontWeight: 'bold' },

  logItem: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 4 },
  adminInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 13, marginBottom: 8 },
  rolePickBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: '#fff', padding: 20, borderRadius: 14 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }
});