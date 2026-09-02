const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'furni_jwt_super_secret_key_2026';

// Middleware автентифікації
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Потрібна авторизація' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Недійсний токен' });
    req.user = user;
    next();
  });
};

// Middleware ролей
const requireRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Доступ заборонено для ролі ${req.user?.role}` });
    }
    next();
  };
};

// ---------------- AUTH API ----------------

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ message: 'Невірний логін або пароль' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Невірний логін або пароль' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- УПРАВЛІННЯ КОРИСТУВАЧАМИ (ADMIN) ----------------

app.get('/api/users', authenticateToken, requireRoles(['ADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, fullName: true, role: true, createdAt: true },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/register', authenticateToken, requireRoles(['ADMIN']), async (req, res) => {
  const { username, password, fullName, role } = req.body;
  if (!username || !password || !fullName) return res.status(400).json({ message: 'Заповніть обовʼязкові поля' });

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ message: 'Цей логін вже зайнятий' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { username, password: hashedPassword, fullName, role: role || 'STOREKEEPER' },
      select: { id: true, username: true, fullName: true, role: true, createdAt: true }
    });
    res.status(201).json({ message: 'Користувача зареєстровано', user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireRoles(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { username, fullName, role, password } = req.body;
  try {
    const userId = parseInt(id);
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) return res.status(404).json({ message: 'Користувача не знайдено' });

    if (username && username !== existingUser.username) {
      const duplicate = await prisma.user.findUnique({ where: { username } });
      if (duplicate) return res.status(400).json({ message: 'Цей логін вже зайнятий' });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (password && password.trim() !== '') updateData.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, username: true, fullName: true, role: true, createdAt: true }
    });
    res.json({ message: 'Дані користувача оновлено', user: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- УПРАВЛІННЯ СКЛАДАМИ (ADMIN) ----------------

app.get('/api/warehouses', authenticateToken, async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { _count: { select: { stocks: true } } }
    });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/warehouses', authenticateToken, requireRoles(['ADMIN']), async (req, res) => {
  const { name, location, isShowroom } = req.body;
  if (!name) return res.status(400).json({ message: 'Вкажіть назву складу' });
  try {
    const warehouse = await prisma.warehouse.create({
      data: { name, location: location || '', isShowroom: Boolean(isShowroom) }
    });
    res.status(201).json({ message: 'Склад створено', warehouse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/warehouses/:id', authenticateToken, requireRoles(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, location, isShowroom } = req.body;
  try {
    const updated = await prisma.warehouse.update({
      where: { id: parseInt(id) },
      data: { name, location, isShowroom: Boolean(isShowroom) }
    });
    res.json({ message: 'Склад оновлено', warehouse: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/warehouses/:id', authenticateToken, requireRoles(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.warehouse.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Склад видалено' });
  } catch (error) {
    res.status(500).json({ error: 'Неможливо видалити склад із наявними залишками чи історією' });
  }
});

// ---------------- НОМЕНКЛАТУРА ТА ОПЕРАЦІЇ ----------------

app.get('/api/items', authenticateToken, async (req, res) => {
  const { warehouseId, category, search, onlyLowStock } = req.query;
  try {
    const whereClause = {};
    if (category && category !== 'ALL') whereClause.category = String(category);
    if (search && search.trim() !== '') {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { sku: { contains: String(search) } },
        { barcode: { contains: String(search) } }
      ];
    }

    const items = await prisma.item.findMany({
      where: whereClause,
      include: { stocks: { include: { warehouse: true } } },
      orderBy: { id: 'asc' }
    });

    let formatted = items.map(item => {
      const stockDetails = item.stocks.map(s => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        physical: s.quantityPhysical,
        reserved: s.quantityReserved,
        available: s.quantityPhysical - s.quantityReserved
      }));

      const totalPhysical = stockDetails.reduce((acc, curr) => acc + curr.physical, 0);
      const totalReserved = stockDetails.reduce((acc, curr) => acc + curr.reserved, 0);

      return {
        id: item.id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        category: item.category,
        unit: item.unit,
        minStockThreshold: item.minStockThreshold,
        totalPhysical,
        totalReserved,
        totalAvailable: totalPhysical - totalReserved,
        stockDetails
      };
    });

    if (warehouseId && warehouseId !== 'ALL') {
      const wId = parseInt(warehouseId);
      formatted = formatted.filter(item => item.stockDetails.some(s => s.warehouseId === wId && s.physical > 0));
    }

    if (onlyLowStock === 'true') {
      formatted = formatted.filter(item => item.totalAvailable <= item.minStockThreshold);
    }

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/items', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req, res) => {
  const { sku, barcode, name, category, unit, minStockThreshold } = req.body;
  if (!sku || !barcode || !name || !category) return res.status(400).json({ message: 'Заповніть обовʼязкові поля' });

  try {
    const existing = await prisma.item.findFirst({ where: { OR: [{ sku }, { barcode }] } });
    if (existing) return res.status(400).json({ message: 'Товар з таким SKU чи штрихкодом вже існує' });

    const newItem = await prisma.item.create({
      data: { sku, barcode, name, category, unit: unit || 'шт', minStockThreshold: parseFloat(minStockThreshold) || 5 }
    });
    res.status(201).json({ message: 'Товар створено', item: newItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/items/:id', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req, res) => {
  const { id } = req.params;
  const { sku, barcode, name, category, unit, minStockThreshold } = req.body;
  try {
    const updated = await prisma.item.update({
      where: { id: parseInt(id) },
      data: { sku, barcode, name, category, unit, minStockThreshold: parseFloat(minStockThreshold) }
    });
    res.json({ message: 'Товар оновлено', item: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/items/:id', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.item.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Товар видалено' });
  } catch (error) {
    res.status(500).json({ error: 'Неможливо видалити товар, який має звʼязані залишки чи операції' });
  }
});

app.get('/api/items/search', authenticateToken, async (req, res) => {
  const { code } = req.query;
  try {
    const item = await prisma.item.findFirst({
      where: { OR: [{ barcode: String(code) }, { sku: String(code) }] },
      include: {
        stocks: { include: { warehouse: true } },
        logs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { warehouse: true }
        }
      }
    });

    if (!item) return res.status(404).json({ message: 'Товар не знайдено' });

    const stockDetails = item.stocks.map(s => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      physical: s.quantityPhysical,
      reserved: s.quantityReserved,
      available: s.quantityPhysical - s.quantityReserved
    }));

    const historyLogs = item.logs.map(l => ({
      id: l.id,
      type: l.type,
      quantity: l.quantity,
      warehouseName: l.warehouse?.name || 'Склад',
      comment: l.comment,
      createdBy: l.createdBy,
      createdAt: l.createdAt
    }));

    res.json({ ...item, stockDetails, historyLogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/items/low-stock', authenticateToken, async (req, res) => {
  try {
    const stocks = await prisma.stock.findMany({
      include: { item: true, warehouse: true }
    });

    const lowStock = stocks
      .filter(s => (s.quantityPhysical - s.quantityReserved) <= s.item.minStockThreshold)
      .map(s => ({
        id: s.item.id,
        sku: s.item.sku,
        barcode: s.item.barcode,
        name: s.item.name,
        category: s.item.category,
        warehouse: s.warehouse.name,
        physical: s.quantityPhysical,
        reserved: s.quantityReserved,
        available: s.quantityPhysical - s.quantityReserved,
        minThreshold: s.item.minStockThreshold,
        unit: s.item.unit
      }));

    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Проведення транзакцій
app.post('/api/operations', authenticateToken, async (req, res) => {
  const { itemId, warehouseId, type, quantity, comment } = req.body;
  const qty = parseFloat(quantity);
  const operatorName = `${req.user.fullName} (${req.user.role})`;

  if (['INCOMING', 'OUTGOING', 'WRITE_OFF'].includes(type) && req.user.role === 'MANAGER') {
    return res.status(403).json({ message: 'Менеджер може здійснювати лише резервування' });
  }
  if (!qty || qty <= 0) return res.status(400).json({ message: 'Кількість повинна бути більшою за 0' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.stock.findUnique({
        where: { itemId_warehouseId: { itemId: parseInt(itemId), warehouseId: parseInt(warehouseId) } }
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: { itemId: parseInt(itemId), warehouseId: parseInt(warehouseId), quantityPhysical: 0, quantityReserved: 0 }
        });
      }

      const available = stock.quantityPhysical - stock.quantityReserved;

      switch (type) {
        case 'INCOMING':
          stock.quantityPhysical += qty;
          break;
        case 'RESERVE':
          if (available < qty) throw new Error(`Недостатньо вільного залишку. Доступно: ${available}`);
          stock.quantityReserved += qty;
          break;
        case 'UNRESERVE':
          if (stock.quantityReserved < qty) throw new Error('Кількість перевищує поточний резерв');
          stock.quantityReserved -= qty;
          break;
        case 'OUTGOING':
          if (stock.quantityPhysical < qty) throw new Error(`Недостатньо фізичної наявності: ${stock.quantityPhysical}`);
          stock.quantityPhysical -= qty;
          if (stock.quantityReserved >= qty) stock.quantityReserved -= qty;
          break;
        case 'WRITE_OFF':
          if (available < qty) throw new Error(`Недостатньо вільного залишку: ${available}`);
          stock.quantityPhysical -= qty;
          break;
        default:
          throw new Error('Невідомий тип операції');
      }

      await tx.stock.update({
        where: { id: stock.id },
        data: { quantityPhysical: stock.quantityPhysical, quantityReserved: stock.quantityReserved }
      });

      const log = await tx.operationsLog.create({
        data: {
          itemId: parseInt(itemId),
          warehouseId: parseInt(warehouseId),
          userId: req.user.id,
          type,
          quantity: qty,
          comment: comment || null,
          createdBy: operatorName
        }
      });

      return { stock, log };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/operations/transfer', authenticateToken, requireRoles(['ADMIN', 'STOREKEEPER']), async (req, res) => {
  const { itemId, fromWarehouseId, toWarehouseId, quantity, comment } = req.body;
  const qty = parseFloat(quantity);
  const operatorName = `${req.user.fullName} (${req.user.role})`;

  if (!qty || qty <= 0) return res.status(400).json({ message: 'Кількість повинна бути більшою за 0' });
  if (parseInt(fromWarehouseId) === parseInt(toWarehouseId)) {
    return res.status(400).json({ message: 'Склади не можуть збігатися' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sourceStock = await tx.stock.findUnique({
        where: { itemId_warehouseId: { itemId: parseInt(itemId), warehouseId: parseInt(fromWarehouseId) } }
      });

      const available = sourceStock ? (sourceStock.quantityPhysical - sourceStock.quantityReserved) : 0;
      if (!sourceStock || available < qty) throw new Error(`Недостатньо доступного залишку. Вільно: ${available}`);

      await tx.stock.update({
        where: { id: sourceStock.id },
        data: { quantityPhysical: sourceStock.quantityPhysical - qty }
      });

      let destStock = await tx.stock.findUnique({
        where: { itemId_warehouseId: { itemId: parseInt(itemId), warehouseId: parseInt(toWarehouseId) } }
      });

      if (!destStock) {
        destStock = await tx.stock.create({
          data: { itemId: parseInt(itemId), warehouseId: parseInt(toWarehouseId), quantityPhysical: qty, quantityReserved: 0 }
        });
      } else {
        await tx.stock.update({
          where: { id: destStock.id },
          data: { quantityPhysical: destStock.quantityPhysical + qty }
        });
      }

      await tx.operationsLog.create({
        data: {
          itemId: parseInt(itemId),
          warehouseId: parseInt(fromWarehouseId),
          userId: req.user.id,
          type: 'OUTGOING',
          quantity: qty,
          comment: `Переміщено на склад #${toWarehouseId}. ${comment || ''}`,
          createdBy: operatorName
        }
      });

      await tx.operationsLog.create({
        data: {
          itemId: parseInt(itemId),
          warehouseId: parseInt(toWarehouseId),
          userId: req.user.id,
          type: 'INCOMING',
          quantity: qty,
          comment: `Отримано зі складу #${fromWarehouseId}. ${comment || ''}`,
          createdBy: operatorName
        }
      });

      return { success: true };
    });

    res.json({ message: 'Товар успішно переміщено!', data: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/operations/adjust', authenticateToken, requireRoles(['ADMIN', 'STOREKEEPER']), async (req, res) => {
  const { itemId, warehouseId, actualQuantity, comment } = req.body;
  const actualQty = parseFloat(actualQuantity);
  const operatorName = `${req.user.fullName} (${req.user.role})`;

  if (isNaN(actualQty) || actualQty < 0) return res.status(400).json({ message: 'Вкажіть невідʼємну кількість' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.stock.findUnique({
        where: { itemId_warehouseId: { itemId: parseInt(itemId), warehouseId: parseInt(warehouseId) } }
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: { itemId: parseInt(itemId), warehouseId: parseInt(warehouseId), quantityPhysical: 0, quantityReserved: 0 }
        });
      }

      if (actualQty < stock.quantityReserved) {
        throw new Error(`Фактична кількість (${actualQty}) не може бути меншою за резерв (${stock.quantityReserved})`);
      }

      const difference = actualQty - stock.quantityPhysical;

      await tx.stock.update({
        where: { id: stock.id },
        data: { quantityPhysical: actualQty }
      });

      await tx.operationsLog.create({
        data: {
          itemId: parseInt(itemId),
          warehouseId: parseInt(warehouseId),
          userId: req.user.id,
          type: 'INVENTORY_ADJUST',
          quantity: difference,
          comment: `Ревізія. Було: ${stock.quantityPhysical}, Стало: ${actualQty} (Δ ${difference >= 0 ? '+' : ''}${difference}). ${comment || ''}`,
          createdBy: operatorName
        }
      });

      return { stock, difference };
    });

    res.json({ message: 'Інвентаризацію проведено!', difference: result.difference });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Видалення користувача (Лише ADMIN, заборонено видаляти самого себе)
app.delete('/api/users/:id', authenticateToken, requireRoles(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const targetId = parseInt(id);

  if (targetId === req.user.id) {
    return res.status(400).json({ message: 'Адміністратор не може видалити свій власний обліковий запис' });
  }

  try {
    // Відв'язуємо або каскадно видаляємо зв'язані логи
    await prisma.operationsLog.updateMany({
      where: { userId: targetId },
      data: { userId: null }
    });

    await prisma.user.delete({ where: { id: targetId } });
    res.json({ message: 'Користувача успішно видалено з системи' });
  } catch (error) {
    res.status(500).json({ error: 'Помилка видалення: користувач не існує або повʼязаний з системними записами' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Furni Server працює на http://localhost:${PORT}`));