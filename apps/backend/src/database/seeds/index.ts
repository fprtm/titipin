import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, count, lt } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as schema from '../schema';
import { envConfig } from '../../config/env.config';
import { Role, AuditAction, OrderActivityAction } from '@titipin/shared';

async function seed() {
  console.log('🌱 Starting database seeding...');

  const pool = new Pool({
    connectionString: envConfig.DATABASE_URL,
  });

  const database = drizzle(pool, { schema });

  try {
    const saltRounds = 10;

    // 1. Seed Admin User
    const existingAdmin = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'admin@titipin.id'))
      .limit(1);

    let adminId = existingAdmin[0]?.id;

    if (existingAdmin.length === 0) {
      const adminPasswordHash = await bcrypt.hash('Admin123!', saltRounds);
      const [adminUser] = await database
        .insert(schema.users)
        .values({
          name: 'Super Admin',
          email: 'admin@titipin.id',
          password: adminPasswordHash,
          role: Role.ADMIN,
        })
        .returning();

      adminId = adminUser.id;

      await database.insert(schema.auditLogs).values({
        userId: adminUser.id,
        action: AuditAction.USER_CREATED,
        entityType: 'users',
        entityId: adminUser.id,
        payload: {
          before: null,
          after: { email: adminUser.email, role: adminUser.role },
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Seeder/CLI',
      });

      console.log(`✅ Seeded Admin User: ${adminUser.email} (${adminUser.id})`);
    } else {
      console.log('ℹ️ Admin user already exists, skipping.');
    }

    // 2. Seed Cashier User
    const existingCashier = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'kasir@titipin.id'))
      .limit(1);

    let cashierId = existingCashier[0]?.id;

    if (existingCashier.length === 0) {
      const cashierPasswordHash = await bcrypt.hash('Kasir123!', saltRounds);
      const [cashierUser] = await database
        .insert(schema.users)
        .values({
          name: 'Kasir Utama',
          email: 'kasir@titipin.id',
          password: cashierPasswordHash,
          role: Role.CASHIER,
        })
        .returning();

      cashierId = cashierUser.id;

      await database.insert(schema.auditLogs).values({
        userId: cashierUser.id,
        action: AuditAction.USER_CREATED,
        entityType: 'users',
        entityId: cashierUser.id,
        payload: {
          before: null,
          after: { email: cashierUser.email, role: cashierUser.role },
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Seeder/CLI',
      });

      console.log(`✅ Seeded Cashier User: ${cashierUser.email} (${cashierUser.id})`);
    } else {
      console.log('ℹ️ Cashier user already exists, skipping.');
    }

    const defaultUserId = cashierId || adminId || '00000000-0000-0000-0000-000000000000';

    // 3. Seed Catalog Products (25 varied items, including low stock < 5)
    const productCatalog = [
      { productCode: 'P0001', productName: 'Aqua Air Mineral 600ml', stock: 120, price: '3500.00' },
      { productCode: 'P0002', productName: 'Indomie Goreng Spesial 85g', stock: 150, price: '3500.00' },
      { productCode: 'P0003', productName: 'Teh Botol Sosro Kotak 250ml', stock: 80, price: '4000.00' },
      { productCode: 'P0004', productName: 'Chitato Sapi Panggang 68g', stock: 3, price: '11500.00' }, // Low stock (<5)
      { productCode: 'P0005', productName: 'Ultra Milk Cokelat 250ml', stock: 90, price: '6500.00' },
      { productCode: 'P0006', productName: 'SilverQueen Chunky Bar Cashew 95g', stock: 2, price: '26500.00' }, // Low stock (<5)
      { productCode: 'P0007', productName: 'Pocari Sweat Kaleng 330ml', stock: 65, price: '8000.00' },
      { productCode: 'P0008', productName: 'Oreo Vanilla Sandwich Cookies 133g', stock: 45, price: '10000.00' },
      { productCode: 'P0009', productName: 'Pocky Chocolate Stick 47g', stock: 35, price: '9500.00' },
      { productCode: 'P0010', productName: 'Bear Brand Susu Steril 189ml', stock: 75, price: '10500.00' },
      { productCode: 'P0011', productName: 'Kusuka Keripik Singkong Balado 60g', stock: 4, price: '8000.00' }, // Low stock (<5)
      { productCode: 'P0012', productName: 'Sari Roti Sobek Cokelat', stock: 25, price: '18000.00' },
      { productCode: 'P0013', productName: 'Roma Kelapa Biskuit 300g', stock: 30, price: '12000.00' },
      { productCode: 'P0014', productName: 'Nescafe Latte Kaleng 220ml', stock: 50, price: '11000.00' },
      { productCode: 'P0015', productName: 'Kopi Kapal Api Special Mix 24g', stock: 100, price: '2000.00' },
      { productCode: 'P0016', productName: 'Beng-Beng Wafer Coklat 25g', stock: 120, price: '2500.00' },
      { productCode: 'P0017', productName: 'Chiki Twist Jagung Bakar 40g', stock: 40, price: '4500.00' },
      { productCode: 'P0018', productName: 'Minyak Goreng Bimoli Pouch 2L', stock: 1, price: '39000.00' }, // Low stock (<5)
      { productCode: 'P0019', productName: 'Gulaku Tebu Murni Kuning 1kg', stock: 35, price: '17500.00' },
      { productCode: 'P0020', productName: 'Bango Kecap Manis Refill 520ml', stock: 28, price: '24500.00' },
      { productCode: 'P0021', productName: 'Cadbury Dairy Milk Chocolate 62g', stock: 20, price: '16500.00' },
      { productCode: 'P0022', productName: 'Khong Guan Classic Red Mini 650g', stock: 12, price: '56000.00' },
      { productCode: 'P0023', productName: 'Taro Net Seaweed 65g', stock: 30, price: '6000.00' },
      { productCode: 'P0024', productName: 'Buavita Jeruk Botol 245ml', stock: 32, price: '8500.00' },
      { productCode: 'P0025', productName: 'Kratingdaeng Energy Drink 150ml', stock: 40, price: '7000.00' },
    ];

    const seededProducts: (typeof schema.products.$inferSelect)[] = [];
    for (const prod of productCatalog) {
      const existing = await database
        .select()
        .from(schema.products)
        .where(eq(schema.products.productCode, prod.productCode))
        .limit(1);

      if (existing.length === 0) {
        const [inserted] = await database.insert(schema.products).values(prod).returning();
        seededProducts.push(inserted);
        if (adminId) {
          await database.insert(schema.auditLogs).values({
            userId: adminId,
            action: AuditAction.PRODUCT_CREATED,
            entityType: 'products',
            entityId: String(inserted.id),
            payload: { before: null, after: prod },
            ipAddress: '127.0.0.1',
            userAgent: 'Seeder/CLI',
          });
        }
      } else {
        const [updated] = await database
          .update(schema.products)
          .set({
            productName: prod.productName,
            price: prod.price,
            stock: prod.stock,
            updatedAt: new Date(),
          })
          .where(eq(schema.products.id, existing[0].id))
          .returning();
        seededProducts.push(updated);
      }
    }
    console.log(`✅ Verified/Seeded ${seededProducts.length} catalog products.`);

    // 4. Seed Member Customers (16 customers with realistic profiles and varied birthdates)
    const todayIso = new Date().toISOString().split('T')[0];
    const customerProfiles = [
      {
        customerName: 'Budi Santoso',
        phone: '081234567890',
        customerAddress: 'Jl. Jenderal Sudirman No. 14, Karet Semanggi, Jakarta Selatan',
        gender: 'Pria' as const,
        birthDate: todayIso, // Birthday today (tests BR-006)
      },
      {
        customerName: 'Siti Aminah',
        phone: '081298765432',
        customerAddress: 'Jl. M.H. Thamrin No. 28, Kebon Sirih, Jakarta Pusat',
        gender: 'Wanita' as const,
        birthDate: '1998-05-15',
      },
      {
        customerName: 'Hendra Gunawan',
        phone: '081311223344',
        customerAddress: 'Jl. Gatot Subroto Kav. 52, Kuningan Barat, Jakarta Selatan',
        gender: 'Pria' as const,
        birthDate: '1992-11-20',
      },
      {
        customerName: 'Dewi Anggraini',
        phone: '081355667788',
        customerAddress: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
        gender: 'Wanita' as const,
        birthDate: '1995-03-08',
      },
      {
        customerName: 'Rizky Pratama',
        phone: '081799887766',
        customerAddress: 'Jl. Suryakencana No. 118, Babakan Pasar, Bogor Tengah',
        gender: 'Pria' as const,
        birthDate: null, // Nullable birth date example
      },
      {
        customerName: 'Maya Indah Sari',
        phone: '081822334455',
        customerAddress: 'Jl. Ir. H. Juanda No. 102, Coblong, Bandung',
        gender: 'Wanita' as const,
        birthDate: '1997-12-25',
      },
      {
        customerName: 'Agus Setiawan',
        phone: '081933445566',
        customerAddress: 'Jl. Malioboro No. 56, Danurejan, Yogyakarta',
        gender: 'Pria' as const,
        birthDate: '1988-04-12',
      },
      {
        customerName: 'Rina Wulandari',
        phone: '082144556677',
        customerAddress: 'Jl. Pemuda No. 142, Sekayu, Semarang Tengah',
        gender: 'Wanita' as const,
        birthDate: '1994-07-30',
      },
      {
        customerName: 'Dedi Kurniawan',
        phone: '082255667788',
        customerAddress: 'Jl. Basuki Rahmat No. 35, Genteng, Surabaya',
        gender: 'Pria' as const,
        birthDate: '1993-10-10',
      },
      {
        customerName: 'Gita Permata',
        phone: '082366778899',
        customerAddress: 'Jl. Gajah Mada No. 88, Denpasar Barat, Denpasar',
        gender: 'Wanita' as const,
        birthDate: null, // Nullable birth date example
      },
      {
        customerName: 'Fajar Nugraha',
        phone: '085277889900',
        customerAddress: 'Jl. Riau No. 64, Senapelan, Pekanbaru',
        gender: 'Pria' as const,
        birthDate: '1996-01-22',
      },
      {
        customerName: 'Dian Paramita',
        phone: '085388990011',
        customerAddress: 'Jl. Pangeran Diponegoro No. 30, Medan Kota, Medan',
        gender: 'Wanita' as const,
        birthDate: '1982-03-16',
      },
      {
        customerName: 'Nico Hardiansyah',
        phone: '085699001122',
        customerAddress: 'Jl. Kemang Raya No. 15, Bangka, Jakarta Selatan',
        gender: 'Pria' as const,
        birthDate: '1984-02-24',
      },
      {
        customerName: 'Clarissa Putri',
        phone: '085711223344',
        customerAddress: 'Jl. Panglima Polim IV No. 22, Melawai, Jakarta Selatan',
        gender: 'Wanita' as const,
        birthDate: '1995-06-02',
      },
      {
        customerName: 'Joko Susilo',
        phone: '087822334455',
        customerAddress: 'Jl. Jenderal Sudirman No. 128, Ilir Timur I, Palembang',
        gender: 'Pria' as const,
        birthDate: '1981-06-23',
      },
      {
        customerName: 'Irfan Maulana',
        phone: '089633445566',
        customerAddress: 'Jl. Matraman Raya No. 74, Kebon Manggis, Jakarta Timur',
        gender: 'Pria' as const,
        birthDate: '1983-02-12',
      },
    ];

    const seededCustomers: (typeof schema.customers.$inferSelect)[] = [];
    for (const cust of customerProfiles) {
      const existing = await database
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.phone, cust.phone))
        .limit(1);

      if (existing.length === 0) {
        const [inserted] = await database.insert(schema.customers).values(cust).returning();
        seededCustomers.push(inserted);
        if (adminId) {
          await database.insert(schema.auditLogs).values({
            userId: adminId,
            action: AuditAction.CUSTOMER_CREATED,
            entityType: 'customers',
            entityId: inserted.id,
            payload: { before: null, after: cust },
            ipAddress: '127.0.0.1',
            userAgent: 'Seeder/CLI',
          });
        }
      } else {
        const [updated] = await database
          .update(schema.customers)
          .set({
            customerName: cust.customerName,
            customerAddress: cust.customerAddress,
            gender: cust.gender,
            birthDate: cust.birthDate,
            updatedAt: new Date(),
          })
          .where(eq(schema.customers.id, existing[0].id))
          .returning();
        seededCustomers.push(updated);
      }
    }
    console.log(`✅ Verified/Seeded ${seededCustomers.length} customer members.`);

    // 5. Seed Historical Sales Orders (comprehensive timeline across today, this month, prior quarter, and this year)
    const [existingOrdersCount] = await database
      .select({ count: count() })
      .from(schema.orders);

    const totalExistingOrders = Number(existingOrdersCount?.count || 0);

    const [oldOrdersCount] = await database
      .select({ count: count() })
      .from(schema.orders)
      .where(lt(schema.orders.orderDate, new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)));

    const hasOldOrders = Number(oldOrdersCount?.count || 0) > 0;

    if (totalExistingOrders < 60 || !hasOldOrders) {
      console.log(`⏳ Seeding comprehensive historical orders across multiple periods (current: ${totalExistingOrders}, target: 70)...`);
      // Clean previous synthetic orders to ensure clean distribution
      await database.delete(schema.orderActivityLogs);
      await database.delete(schema.orderItems);
      await database.delete(schema.orders);

      const now = new Date();

      for (let i = 1; i <= 70; i++) {
        let daysAgo = 0;
        if (i <= 6) {
          // Today (Hari Ini) - 6 orders
          daysAgo = 0;
        } else if (i <= 18) {
          // Past 7 days (this week) - 12 orders
          daysAgo = Math.floor(1 + ((i - 7) * 6) / 12);
        } else if (i <= 36) {
          // Earlier this month (Oct 1 to Oct 21) - 18 orders
          daysAgo = Math.floor(8 + ((i - 19) * 18) / 18);
        } else if (i <= 52) {
          // Prior months in Q3 (August & September: 30 to 80 days ago) - 16 orders
          daysAgo = Math.floor(30 + ((i - 37) * 55) / 16);
        } else {
          // Earlier this year in Q1 & Q2 (February to July: 90 to 240 days ago) - 18 orders
          daysAgo = Math.floor(95 + ((i - 53) * 145) / 18);
        }

        const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        orderDate.setHours(8 + (i % 13), (i * 19) % 60, 0, 0);

        const yyyy = orderDate.getFullYear().toString();
        const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
        const dd = String(orderDate.getDate()).padStart(2, '0');
        const invoiceNumber = `INV-${yyyy}${mm}${dd}-${String(i).padStart(4, '0')}`;

        // Check if invoice already exists
        const exists = await database
          .select({ id: schema.orders.id })
          .from(schema.orders)
          .where(eq(schema.orders.orderNumber, invoiceNumber))
          .limit(1);

        if (exists.length > 0) continue;

        // Alternate Walk-in and Member orders
        const isMember = i % 3 !== 0;
        const customer = isMember && seededCustomers.length > 0 ? seededCustomers[i % seededCustomers.length] : null;

        // Pick 1 to 3 items
        const numItems = (i % 3) + 1;
        const orderItemsToInsert: {
          productId: number;
          quantity: number;
          unitPrice: string;
          subtotal: string;
        }[] = [];

        let subtotal = 0;
        for (let j = 0; j < numItems; j++) {
          const product = seededProducts[(i + j * 4) % seededProducts.length];
          const qty = ((i + j) % 3) + 1;
          const uPrice = Number(product.price);
          const itemSubtotal = uPrice * qty;
          subtotal += itemSubtotal;

          orderItemsToInsert.push({
            productId: product.id,
            quantity: qty,
            unitPrice: uPrice.toFixed(2),
            subtotal: itemSubtotal.toFixed(2),
          });
        }

        // Apply Birthday discount if member birth date matches order date MM-DD
        let discount = 0;
        if (customer && customer.birthDate) {
          const custBday = new Date(customer.birthDate);
          if (custBday.getMonth() === orderDate.getMonth() && custBday.getDate() === orderDate.getDate()) {
            discount = Math.min(50000, Math.round(subtotal * 0.05));
          }
        }

        const totalAmount = Math.max(0, subtotal - discount);

        const [createdOrder] = await database
          .insert(schema.orders)
          .values({
            orderNumber: invoiceNumber,
            customerId: customer ? customer.id : null,
            createdBy: defaultUserId,
            totalAmount: totalAmount.toFixed(2),
            orderDate,
            createdAt: orderDate,
            updatedAt: orderDate,
          })
          .returning();

        for (const item of orderItemsToInsert) {
          await database.insert(schema.orderItems).values({
            orderId: createdOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            createdAt: orderDate,
          });
        }

        await database.insert(schema.orderActivityLogs).values({
          orderId: createdOrder.id,
          action: OrderActivityAction.ORDER_CREATED,
          performedBy: defaultUserId,
          details: {
            subtotal,
            discount,
            isBirthdayDiscountApplied: discount > 0,
            itemCount: orderItemsToInsert.length,
            invoice: invoiceNumber,
          },
          createdAt: orderDate,
        });
      }
      console.log('✅ Seeded historical sales transactions with order items and activity logs.');
    } else {
      console.log(`ℹ️ Sufficient historical orders already exist (${totalExistingOrders}), skipping.`);
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
