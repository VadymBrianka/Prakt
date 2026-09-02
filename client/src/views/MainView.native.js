import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar, ActivityIndicator,
  FlatList, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function MainView({ model }) {
  const {
    token, currentUser, loading, refreshing,
    activeItem, setActiveItem,
    selectedSourceWh, setSelectedSourceWh,
    selectedTargetWh, setSelectedTargetWh,
    opQuantity, setOpQuantity,
    opComment, setOpComment,
    catSearch, setCatSearch,
    catCategory, setCatCategory,
    catSortField, setCatSortField,
    catSortDir, setCatSortDir,
    lowSearch, setLowSearch,
    lowCategory, setLowCategory,
    lowWarehouse, setLowWarehouse,
    lowSortField, setLowSortField,
    lowSortDir, setLowSortDir,
    categoriesList, lowWarehouseNames,
    filteredCatalog, filteredLowStock, lowStockList,
    warehousesList, usersList,
    login, logout, fetchCatalog, fetchLowStock, fetchItemInfo,fetchAll,
    executeOperation, executeTransfer, executeAudit,
    saveItem, deleteItem, saveWarehouse, deleteWarehouse, saveUser, deleteUser
  } = model;

  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('admin123');
  const [activeTab, setActiveTab] = useState('OPERATIONS');
  const [activeMode, setActiveMode] = useState('STOCK');
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Дозволи камери для iOS
  const [permission, requestPermission] = useCameraPermissions();

  // Модальні вікна
  const [itemModal, setItemModal] = useState(false);
  const [itemId, setItemId] = useState(null);
  const [fName, setFName] = useState('');
  const [fSku, setFSku] = useState('');
  const [fBarcode, setFBarcode] = useState('');
  const [fCat, setFCat] = useState('Завіси');
  const [fUnit, setFUnit] = useState('шт');
  const [fThreshold, setFThreshold] = useState('5');

  const [whModal, setWhModal] = useState(false);
  const [whId, setWhId] = useState(null);
  const [whName, setWhName] = useState('');
  const [whLoc, setWhLoc] = useState('');
  const [whShowroom, setWhShowroom] = useState(false);

  const [userModal, setUserModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [uFull, setUFull] = useState('');
  const [uUser, setUUser] = useState('');
  const [uPass, setUPass] = useState('');
  const [uRole, setURole] = useState('STOREKEEPER');

  // Категорії дефіциту
  const lowCategoriesList = useMemo(() => {
    return ['ALL', ...Array.from(new Set(lowStockList.map(i => i.category).filter(Boolean)))];
  }, [lowStockList]);

  // Перемикач напрямку сортування каталогу
  const handleCatSort = (field) => {
    if (catSortField === field) {
      setCatSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCatSortField(field);
      setCatSortDir('asc');
    }
  };

  // Перемикач напрямку сортування дефіциту
  const handleLowSort = (field) => {
    if (lowSortField === field) {
      setLowSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setLowSortField(field);
      setLowSortDir('asc');
    }
  };

  if (!token || !currentUser) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <View style={styles.authBox}>
          <Text style={styles.authLogo}>Furni Stock</Text>
          <Text style={styles.authSub}>Термінал збору даних</Text>
          <TextInput placeholder="Логін" placeholderTextColor="#94a3b8" value={usernameInput} onChangeText={setUsernameInput} style={styles.authInput} autoCapitalize="none" />
          <TextInput placeholder="Пароль" placeholderTextColor="#94a3b8" value={passwordInput} onChangeText={setPasswordInput} secureTextEntry style={styles.authInput} />
          <TouchableOpacity style={styles.authBtn} onPress={() => login(usernameInput, passwordInput)} disabled={loading}>
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
  
  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
    {/* Кнопка оновлення бази */}
    <TouchableOpacity 
      style={styles.refreshBtn} 
      onPress={fetchAll} 
      disabled={loading || refreshing}
    >
      {loading || refreshing ? (
        <ActivityIndicator size="small" color="#2563eb" />
      ) : (
        <Text style={styles.refreshBtnText}>🔄 Оновити</Text>
      )}
    </TouchableOpacity>

    {/* Кнопка виходу */}
    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
      <Text style={styles.logoutText}>Вийти</Text>
    </TouchableOpacity>
  </View>
</View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'OPERATIONS' && styles.tabBtnActive]} onPress={() => setActiveTab('OPERATIONS')}>
          <Text style={[styles.tabText, activeTab === 'OPERATIONS' && styles.tabTextActive]}>📦 Сканер</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'CATALOG' && styles.tabBtnActive]} onPress={() => { setActiveTab('CATALOG'); fetchCatalog(); }}>
          <Text style={[styles.tabText, activeTab === 'CATALOG' && styles.tabTextActive]}>📋 Каталог</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'LOW_STOCK' && styles.tabBtnActive]} onPress={() => { setActiveTab('LOW_STOCK'); fetchLowStock(); }}>
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

      {/* 1. СКАНЕР ТА ОПЕРАЦІЇ */}
      {activeTab === 'OPERATIONS' && (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.scannerWrapper}>
            {!permission ? (
              <ActivityIndicator color="#fff" />
            ) : !permission.granted ? (
              <View style={{ alignItems: 'center', padding: 12 }}>
                <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>Потрібен доступ до камери</Text>
                <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>Надати дозвіл</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
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
              </>
            )}
          </View>

          <View style={styles.searchRow}>
            <TextInput placeholder="Введіть SKU чи штрихкод..." value={manualCode} onChangeText={setManualCode} style={styles.searchInput} />
            <TouchableOpacity style={styles.searchActionBtn} onPress={() => fetchItemInfo(manualCode)}>
              <Text style={styles.searchActionText}>Пошук</Text>
            </TouchableOpacity>
          </View>

          {activeItem && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.categoryBadge}>{activeItem.category}</Text>
                <TouchableOpacity onPress={() => setActiveItem(null)}>
                  <Text style={{ fontSize: 16, color: '#94a3b8', fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.itemName}>{activeItem.name}</Text>
              <Text style={styles.skuText}>SKU: {activeItem.sku}</Text>

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
              {activeItem.stockDetails?.map((s) => (
                <TouchableOpacity key={s.warehouseId} style={[styles.whCard, selectedSourceWh === s.warehouseId && styles.whCardActive]} onPress={() => setSelectedSourceWh(s.warehouseId)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.whTitle}>{s.warehouseName}</Text>
                    <Text style={{ color: '#ea580c', fontWeight: 'bold' }}>Резерв: {s.reserved}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>Фізично: {s.physical} | <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>Вільно: {s.available} {activeItem.unit}</Text></Text>
                </TouchableOpacity>
              ))}

              {activeMode === 'TRANSFER' && (
                <>
                  <Text style={[styles.sectionHeader, { marginTop: 8 }]}>Склад отримання:</Text>
                  {activeItem.stockDetails?.map((s) => (
                    <TouchableOpacity key={`to-${s.warehouseId}`} style={[styles.whCard, selectedTargetWh === s.warehouseId && styles.whCardTargetActive]} onPress={() => setSelectedTargetWh(s.warehouseId)}>
                      <Text style={[styles.whTitle, selectedTargetWh === s.warehouseId && { color: '#16a34a' }]}>{s.warehouseName}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <Text style={[styles.sectionHeader, { marginTop: 10 }]}>Кількість:</Text>
              <TextInput value={opQuantity} onChangeText={setOpQuantity} keyboardType="numeric" style={styles.qtyInput} />
              <TextInput placeholder="Коментар..." value={opComment} onChangeText={setOpComment} style={styles.commentInput} />

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
            </View>
          )}
        </ScrollView>
      )}

      {/* 2. КАТАЛОГ */}
      {activeTab === 'CATALOG' && (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput placeholder="Пошук..." value={catSearch} onChangeText={setCatSearch} style={[styles.searchInput, { flex: 1 }]} />
            {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
              <TouchableOpacity style={styles.addBtnSmall} onPress={() => {
                setItemId(null); setFName(''); setFSku(`SKU-${Date.now().toString().slice(-4)}`);
                setFBarcode(`4820000${Math.floor(10000 + Math.random() * 90000)}`);
                setFCat('Завіси'); setFUnit('шт'); setFThreshold('5'); setItemModal(true);
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Товар</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ marginBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {categoriesList.map(c => (
                <TouchableOpacity key={c} style={[styles.filterChip, catCategory === c && styles.filterChipActive]} onPress={() => setCatCategory(c)}>
                  <Text style={[styles.filterChipText, catCategory === c && styles.filterChipTextActive]}>{c === 'ALL' ? 'Всі категорії' : c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Панель сортування з індикацією напрямку */}
          <View style={styles.sortBar}>
            <Text style={styles.sortLabel}>Сортування:</Text>
            <TouchableOpacity onPress={() => handleCatSort('name')} style={[styles.sortBtn, catSortField === 'name' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, catSortField === 'name' && styles.sortBtnTextActive]}>
                А-Я {catSortField === 'name' ? (catSortDir === 'asc' ? '↑' : '↓') : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCatSort('totalAvailable')} style={[styles.sortBtn, catSortField === 'totalAvailable' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, catSortField === 'totalAvailable' && styles.sortBtnTextActive]}>
                Залишок {catSortField === 'totalAvailable' ? (catSortDir === 'asc' ? '↑' : '↓') : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCatSort('totalReserved')} style={[styles.sortBtn, catSortField === 'totalReserved' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, catSortField === 'totalReserved' && styles.sortBtnTextActive]}>
                Резерв {catSortField === 'totalReserved' ? (catSortDir === 'asc' ? '↑' : '↓') : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredCatalog}
            keyExtractor={item => String(item.id)}
            refreshing={refreshing}
            onRefresh={fetchCatalog}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.catalogCard} onPress={() => { fetchItemInfo(item.sku); setActiveTab('OPERATIONS'); }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catalogName}>{item.name}</Text>
                  <Text style={styles.catalogSku}>SKU: {item.sku} • {item.category}</Text>
                  <Text style={styles.catalogStock}>
                    Доступно: <Text style={{ fontWeight: 'bold', color: item.totalAvailable <= item.minStockThreshold ? '#dc2626' : '#16a34a' }}>{item.totalAvailable} {item.unit}</Text> (Резерв: {item.totalReserved})
                  </Text>
                </View>
                {['ADMIN', 'MANAGER'].includes(currentUser.role) && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => {
                      setItemId(item.id); setFName(item.name); setFSku(item.sku);
                      setFBarcode(item.barcode); setFCat(item.category); setFUnit(item.unit);
                      setFThreshold(String(item.minStockThreshold)); setItemModal(true);
                    }}><Text>✏️</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => deleteItem(item.id)}><Text>🗑️</Text></TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 3. ДЕФІЦИТ (З ФІЛЬТРАЦІЄЮ ТА СОРТУВАННЯМ) */}
      {activeTab === 'LOW_STOCK' && (
        <View style={{ flex: 1, padding: 16 }}>
          <TextInput placeholder="Пошук у дефіциті..." value={lowSearch} onChangeText={setLowSearch} style={styles.searchInput} />

          {/* Фільтрація за категоріями у дефіциті */}
          <View style={{ marginVertical: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {lowCategoriesList.map(c => (
                <TouchableOpacity key={c} style={[styles.filterChip, lowCategory === c && styles.filterChipActive]} onPress={() => setLowCategory(c)}>
                  <Text style={[styles.filterChipText, lowCategory === c && styles.filterChipTextActive]}>{c === 'ALL' ? 'Всі категорії' : c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Фільтрація за складами у дефіциті */}
          <View style={{ marginBottom: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {lowWarehouseNames.map(w => (
                <TouchableOpacity key={w} style={[styles.filterChip, lowWarehouse === w && styles.filterChipActive]} onPress={() => setLowWarehouse(w)}>
                  <Text style={[styles.filterChipText, lowWarehouse === w && styles.filterChipTextActive]}>{w === 'ALL' ? 'Всі склади' : w}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Панель сортування дефіциту */}
          <View style={styles.sortBar}>
            <Text style={styles.sortLabel}>Сортування:</Text>
            <TouchableOpacity onPress={() => handleLowSort('available')} style={[styles.sortBtn, lowSortField === 'available' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, lowSortField === 'available' && styles.sortBtnTextActive]}>
                Залишок {lowSortField === 'available' ? (lowSortDir === 'asc' ? '↑' : '↓') : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLowSort('name')} style={[styles.sortBtn, lowSortField === 'name' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, lowSortField === 'name' && styles.sortBtnTextActive]}>
                А-Я {lowSortField === 'name' ? (lowSortDir === 'asc' ? '↑' : '↓') : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLowSort('reserved')} style={[styles.sortBtn, lowSortField === 'reserved' && styles.sortBtnActive]}>
              <Text style={[styles.sortBtnText, lowSortField === 'reserved' && styles.sortBtnTextActive]}>
                Резерв {lowSortField === 'reserved' ? (lowSortDir === 'asc' ? '↑' : '↓') : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredLowStock}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            refreshing={refreshing}
            onRefresh={fetchLowStock}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.lowStockCard} onPress={() => { fetchItemInfo(item.sku); setActiveTab('OPERATIONS'); }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lowStockName}>{item.name}</Text>
                  <Text style={styles.lowStockSku}>SKU: {item.sku} • {item.warehouse}</Text>
                  <Text style={{ fontSize: 11, color: '#ea580c', marginTop: 2 }}>В резерві: {item.reserved} {item.unit}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.lowStockQty}>{item.available} {item.unit}</Text>
                  <Text style={styles.dangerLabel}>Поріг: {item.minThreshold || item.minStockThreshold}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 4. СКЛАДИ */}
      {activeTab === 'WAREHOUSES' && currentUser.role === 'ADMIN' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.addWhBtn} onPress={() => { setWhId(null); setWhName(''); setWhLoc(''); setWhShowroom(false); setWhModal(true); }}>
            <Text style={styles.addWhBtnText}>+ Додати склад</Text>
          </TouchableOpacity>
          {warehousesList.map(w => (
            <View key={w.id} style={styles.userListItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{w.name}</Text>
                <Text style={styles.userLogin}>{w.location || 'Без адреси'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => { setWhId(w.id); setWhName(w.name); setWhLoc(w.location || ''); setWhShowroom(w.isShowroom); setWhModal(true); }}><Text>✏️</Text></TouchableOpacity>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => deleteWarehouse(w.id)}><Text>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 5. КОРИСТУВАЧІ */}
      {activeTab === 'USERS' && currentUser.role === 'ADMIN' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={[styles.addWhBtn, { backgroundColor: '#7e22ce' }]} onPress={() => { setUserId(null); setUFull(''); setUUser(''); setUPass(''); setURole('STOREKEEPER'); setUserModal(true); }}>
            <Text style={styles.addWhBtnText}>+ Створити співробітника</Text>
          </TouchableOpacity>
          {usersList.map(u => (
            <View key={u.id} style={styles.userListItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{u.fullName}</Text>
                <Text style={styles.userLogin}>@{u.username} • {u.role}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => { setUserId(u.id); setUFull(u.fullName); setUUser(u.username); setURole(u.role); setUPass(''); setUserModal(true); }}><Text>✏️</Text></TouchableOpacity>
                {u.id !== currentUser.id && <TouchableOpacity style={styles.actionIconBtn} onPress={() => deleteUser(u.id)}><Text>🗑️</Text></TouchableOpacity>}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* МОДАЛКА ТОВАРУ (animationType="fade") */}
      <Modal visible={itemModal} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{itemId ? 'Редагувати' : 'Новий товар'}</Text>
            <TextInput placeholder="Назва" value={fName} onChangeText={setFName} style={styles.adminInput} />
            <TextInput placeholder="SKU" value={fSku} onChangeText={setFSku} style={styles.adminInput} />
            <TextInput placeholder="Штрихкод" value={fBarcode} onChangeText={setFBarcode} style={styles.adminInput} />
            <TextInput placeholder="Категорія" value={fCat} onChangeText={setFCat} style={styles.adminInput} />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TextInput placeholder="Од." value={fUnit} onChangeText={setFUnit} style={[styles.adminInput, { flex: 1 }]} />
              <TextInput placeholder="Поріг" value={fThreshold} onChangeText={setFThreshold} keyboardType="numeric" style={[styles.adminInput, { flex: 1 }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#cbd5e1' }]} onPress={() => setItemModal(false)}><Text style={{ fontWeight: 'bold' }}>Скасувати</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#2563eb' }]} onPress={async () => {
                const ok = await saveItem({ name: fName, sku: fSku, barcode: fBarcode, category: fCat, unit: fUnit, minStockThreshold: parseFloat(fThreshold) || 5 }, itemId);
                if (ok) setItemModal(false);
              }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Зберегти</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* МОДАЛКА СКЛАДУ (animationType="fade") */}
      <Modal visible={whModal} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{whId ? 'Редагувати склад' : 'Новий склад'}</Text>
            <TextInput placeholder="Назва" value={whName} onChangeText={setWhName} style={styles.adminInput} />
            <TextInput placeholder="Локація" value={whLoc} onChangeText={setWhLoc} style={styles.adminInput} />
            <TouchableOpacity style={{ paddingVertical: 8 }} onPress={() => setWhShowroom(!whShowroom)}>
              <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{whShowroom ? '☑ Шоурум' : '☐ Звичайний склад'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#cbd5e1' }]} onPress={() => setWhModal(false)}><Text style={{ fontWeight: 'bold' }}>Скасувати</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#059669' }]} onPress={async () => {
                const ok = await saveWarehouse({ name: whName, location: whLoc, isShowroom: whShowroom }, whId);
                if (ok) setWhModal(false);
              }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Зберегти</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* МОДАЛКА КОРИСТУВАЧА (animationType="fade") */}
      <Modal visible={userModal} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{userId ? 'Редагувати' : 'Новий користувач'}</Text>
            <TextInput placeholder="ПІБ" value={uFull} onChangeText={setUFull} style={styles.adminInput} />
            <TextInput placeholder="Логін" value={uUser} onChangeText={setUUser} style={styles.adminInput} autoCapitalize="none" />
            <TextInput placeholder="Пароль" value={uPass} onChangeText={setUPass} secureTextEntry style={styles.adminInput} />
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {['STOREKEEPER', 'MANAGER', 'ADMIN'].map(r => (
                <TouchableOpacity key={r} style={[styles.rolePickBtn, uRole === r && { backgroundColor: '#7e22ce' }]} onPress={() => setURole(r)}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: uRole === r ? '#fff' : '#64748b' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#cbd5e1' }]} onPress={() => setUserModal(false)}><Text style={{ fontWeight: 'bold' }}>Скасувати</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#7e22ce' }]} onPress={async () => {
                const ok = await saveUser({ fullName: uFull, username: uUser, role: uRole, password: uPass }, userId);
                if (ok) setUserModal(false);
              }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Зберегти</Text></TouchableOpacity>
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
  scannerWrapper: { height: 160, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  grantBtn: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  torchBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 6 },
  torchText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  rescanBtn: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  rescanText: { color: '#fff', fontWeight: 'bold' },

  searchRow: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 13 },
  searchActionBtn: { backgroundColor: '#0f172a', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  searchActionText: { color: '#fff', fontWeight: 'bold' },
  addBtnSmall: { backgroundColor: '#2563eb', paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 },

  filterChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  filterChipTextActive: { color: '#ffffff' },

  sortBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingVertical: 2 },
  sortLabel: { fontSize: 11, color: '#64748b', fontWeight: 'bold' },
  sortBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  sortBtnActive: { backgroundColor: '#2563eb', borderColor: '#1d4ed8' },
  sortBtnText: { fontSize: 10, color: '#475569', fontWeight: 'bold' },
  sortBtnTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10 },
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

  adminInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 13, marginBottom: 8 },
  rolePickBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },

  refreshBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, justifyContent: 'center', alignItems: 'center', minWidth: 75 },
  refreshBtnText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' }
});