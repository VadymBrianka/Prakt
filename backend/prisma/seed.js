const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Словники для реалістичної генерації меблевої фурнітури Furni
const CATEGORIES = [
  {
    name: 'Завіси та петлі',
    unit: 'шт',
    skuPrefix: 'HINGE',
    minLimit: 20,
    brands: ['Blum Clip-Top', 'Hettich Sensys', 'GTV Slide-on', 'Hafele Metalla', 'Muller Profi'],
    subtypes: ['накладна 110°', 'напівнакладна 110°', 'вкладна 110°', 'кутова 45°', 'кутова 90°', 'під фальшпанель', 'з дотягувачем (Blumotion)', 'Push-to-Open (без пружини)', 'трансформер 165°'],
    finishes: ['Нікель', 'Чорний онікс', 'Антрацит', 'Титан', 'Білий']
  },
  {
    name: 'Напрямні та висувні системи',
    unit: 'компл',
    skuPrefix: 'RUN',
    minLimit: 10,
    brands: ['Blum Tandembox', 'Blum Legrabox', 'Hettich InnoTech', 'GTV ModernBox', 'Muller Box Pro'],
    subtypes: ['прихованого монтажу L=300mm', 'прихованого монтажу L=350mm', 'прихованого монтажу L=400mm', 'прихованого монтажу L=450mm', 'прихованого монтажу L=500mm', 'телескопічні кулькові 45mm L=400mm', 'телескопічні кулькові 45mm L=500mm', 'з дотягом Soft-Close', 'з виштовхувачем Push-to-Open'],
    finishes: ['Оригінал сталь', 'Білий матовий', 'Антрацит матовий', 'Оріон сірий', 'Інокс']
  },
  {
    name: 'Меблеві ручки та гачки',
    unit: 'шт',
    skuPrefix: 'HANDLE',
    minLimit: 15,
    brands: ['GTV', 'Bosetti Marella', 'Hafele', 'Gamst', 'Giusti'],
    subtypes: ['профільна торцева L=200mm', 'профільна торцева L=350mm', 'профільна торцева L=600mm', 'скоба міжцентр 96mm', 'скоба міжцентр 128mm', 'скоба міжцентр 160mm', 'скоба міжцентр 192mm', 'кнопка квадратна 30x30', 'кнопка кругла d=28mm', 'врізна прихована'],
    finishes: ['Чорний матовий', 'Брашоване золото', 'Хром глянець', 'Сатин', 'Бронза антична', 'Графіт браш']
  },
  {
    name: 'Плитні матеріали ДСП/МДФ',
    unit: 'лист',
    skuPrefix: 'BOARD',
    minLimit: 5,
    brands: ['Egger', 'Kronospan', 'Swiss Krono', 'Savary', 'Fundermax'],
    subtypes: ['ЛДСП 18мм 2800x2070', 'ЛДСП 10мм 2800x2070', 'МДФ шліфований 16мм 2800x2070', 'МДФ шліфований 19мм 2800x2070', 'Акрилова панель МДФ 19мм', 'ХДФ ламінований 3мм білий', 'ХДФ ламінований 3мм графіт'],
    finishes: ['Дуб Галіфакс натуральний', 'Дуб Кендал коньяк', 'Білий платиновий W980', 'Сірий пиляний U708', 'Антрацит U963', 'Кашемір сірий U702', 'Чорний графіт U999', 'Бетон світлий', 'Мармур Леванто білий']
  },
  {
    name: 'Крайка меблева ABS/ПВХ',
    unit: 'м.п.',
    skuPrefix: 'EDGE',
    minLimit: 50,
    brands: ['Hranipex', 'Rehau', 'Polkemic', 'MKT', 'Termopal'],
    subtypes: ['ABS 22x0.8mm', 'ABS 22x1.0mm', 'ABS 22x2.0mm', 'ABS 42x1.0mm', 'ABS 42x2.0mm', 'ПВХ з клеєм 22x0.5mm'],
    finishes: ['Під колір Дуб Галіфакс', 'Під колір Білий W980', 'Під колір Антрацит', 'Під колір Кашемір', 'Під колір Чорний U999', 'Золото матове', 'Універсальний графіт']
  },
  {
    name: 'Кріплення та метизи',
    unit: 'пач',
    skuPrefix: 'FAST',
    minLimit: 10,
    brands: ['Wurth', 'Hafele', 'Spax', 'Zipbolt', 'Muller'],
    subtypes: ['Конфірмат 6.4x50mm (100шт)', 'Конфірмат 7.0x70mm (100шт)', 'Мініфікс ексцентрик Rastex 15', 'Шток мініфікса під різьбу M6', 'Шкант буковий 8x35mm (500шт)', 'Саморіз потай 3.5x16mm (1000шт)', 'Саморіз потай 4.0x30mm (500шт)', 'Стяжка стільниці Zipbolt 100mm', 'Полкотримач з присоскою d=5mm'],
    finishes: ['Оцинкований', 'Жовтий цинк', 'Нікель', 'Чорний оксид', 'Натуральний бук']
  },
  {
    name: 'Підйомні механізми та газліфти',
    unit: 'компл',
    skuPrefix: 'LIFT',
    minLimit: 8,
    brands: ['Blum Aventos', 'Hettich Lift', 'GTV PD', 'Muller Gas', 'Hafele Free'],
    subtypes: ['HK-XS поворотний силовий HF 11-13', 'HK top поворотний силовий HF 25-27', 'HF складний силовий HF 28-30', 'HL паралельний підйом', 'Газліфт меблевий 60N', 'Газліфт меблевий 80N', 'Газліфт меблевий 100N', 'Газліфт меблевий 120N', 'Газліфт зворотньої дії (вниз) 80N'],
    finishes: ['Шовковий білий', 'Світло-сірий', 'Темно-сірий', 'Хром/Білий', 'Чорний матовий']
  },
  {
    name: 'Освітлення та LED профіль',
    unit: 'м.п.',
    skuPrefix: 'LED',
    minLimit: 15,
    brands: ['Lumines', 'TopMet', 'Havit', 'Design Light', 'Biom'],
    subtypes: ['Профіль алюмінієвий врізний Micro 2м', 'Профіль накладний кутовий 45° 2м', 'Профіль підвісний широкий 2м', 'Стрічка LED COB 24V 4000K нейтральна (5м)', 'Стрічка LED SMD 2835 12V 3000K тепла (5м)', 'Блок живлення Slim 24V 100W IP20', 'Блок живлення UltraSlim 12V 60W', 'Безконтактний інфрачервоний вимикач для дверей'],
    finishes: ['Анодований алюміній', 'Чорний анод', 'Білий RAL 9003', 'Матовий дифузор (лінза)']
  }
];

// Допоміжні функції
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEan13(number) {
  // Український префікс 482 + 9 цифр порядкового номера
  const base = '482' + String(number).padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

async function main() {
  console.log('⏳ Очищення старих даних...');
  await prisma.operationsLog.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.warehouse.deleteMany({});

  const bcrypt = require('bcryptjs');

    // Всередині main() додайте:
    console.log('👤 Створення базових користувачів...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const storekeeperPassword = await bcrypt.hash('keeper123', 10);

    await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
        username: 'admin',
        password: adminPassword,
        fullName: 'Головний Адміністратор Furni',
        role: 'ADMIN'
    }
    });

    await prisma.user.upsert({
    where: { username: 'keeper' },
    update: {},
    create: {
        username: 'keeper',
        password: storekeeperPassword,
        fullName: 'Комірник Складу 1',
        role: 'STOREKEEPER'
    }
    });

  console.log('🏢 Створення складів Furni...');
  const mainWarehouse = await prisma.warehouse.create({
    data: { name: 'Головний склад (Цех)', location: 'м. Тернопіль, вул. Микулинецька', isShowroom: false }
  });

  const showroom = await prisma.warehouse.create({
    data: { name: 'Шоурум & Склад виставки', location: 'м. Тернопіль, вул. Руська', isShowroom: true }
  });

  const reserveWarehouse = await prisma.warehouse.create({
    data: { name: 'Склад плитних матеріалів (Ангар 2)', location: 'м. Тернопіль, Промислова зона', isShowroom: false }
  });

  const warehouses = [mainWarehouse, showroom, reserveWarehouse];

  console.log('📦 Генерація каталогу товарів (>1000 позицій)...');
  
  const itemsToCreate = [];
  let counter = 1;

  // Генеруємо комбінації для досягнення >1000 позицій
  for (const cat of CATEGORIES) {
    for (const brand of cat.brands) {
      for (const subtype of cat.subtypes) {
        for (const finish of cat.finishes) {
          const sku = `FURNI-${cat.skuPrefix}-${String(counter).padStart(5, '0')}`;
          const barcode = generateEan13(counter);
          const name = `${cat.name.split(' ')[0]}${brand} ${subtype} (${finish})`;

          itemsToCreate.push({
            sku,
            barcode,
            name,
            category: cat.name,
            unit: cat.unit,
            minStockThreshold: cat.minLimit
          });

          counter++;
        }
      }
    }
  }

  console.log(`Згенеровано записів у пам'яті: ${itemsToCreate.length}`);

  // Пакетна вставка товарів
  await prisma.item.createMany({
    data: itemsToCreate
  });

  // Отримуємо створені ID товарів з БД
  const createdItems = await prisma.item.findMany({
    select: { id: true, category: true, minStockThreshold: true }
  });

  console.log('📊 Генерація залишків та первинного журналу операцій...');

  const stockRows = [];
  const logRows = [];

  for (const item of createdItems) {
    // Головний склад
    const isCritical = Math.random() < 0.15; // 15% товарів будуть у стані критичного дефіциту
    let mainPhysical = isCritical 
      ? randomInt(0, Math.floor(item.minStockThreshold)) 
      : randomInt(Math.floor(item.minStockThreshold * 1.5), Math.floor(item.minStockThreshold * 8));
    
    let mainReserved = (mainPhysical > 5) ? randomInt(0, Math.floor(mainPhysical * 0.4)) : 0;

    stockRows.push({
      itemId: item.id,
      warehouseId: mainWarehouse.id,
      quantityPhysical: mainPhysical,
      quantityReserved: mainReserved
    });

    // Шоурум (менша кількість, переважно зразки)
    const showPhysical = randomInt(1, 10);
    stockRows.push({
      itemId: item.id,
      warehouseId: showroom.id,
      quantityPhysical: showPhysical,
      quantityReserved: 0
    });

    // Первинний лог приходу
    if (mainPhysical > 0) {
      logRows.push({
        itemId: item.id,
        warehouseId: mainWarehouse.id,
        type: 'INCOMING',
        quantity: mainPhysical,
        orderRef: 'START-INVENTORY-2026',
        comment: 'Початкове завантаження залишків перед інвентаризацією',
        createdBy: 'Система (Імпорт)'
      });
    }
  }

  // Пакетна вставка Stock та Operations_Log
  await prisma.stock.createMany({ data: stockRows });
  await prisma.operationsLog.createMany({ data: logRows });

  console.log(`✅ Успішно створено:`);
  console.log(`   - Складів: ${warehouses.length}`);
  console.log(`   - Товарів (Items): ${createdItems.length}`);
  console.log(`   - Записів залишків (Stock): ${stockRows.length}`);
  console.log(`   - Записів аудиту (OperationsLog): ${logRows.length}`);
}

main()
  .catch((e) => {
    console.error('Помилка виконання seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });