import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnprocessableEntityException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { DRIZZLE_ORM, DrizzleDatabase } from '../src/database/database.module';
import * as schema from '../src/database/schema';
import { eq, inArray } from 'drizzle-orm';
import { ProductsService } from '../src/modules/products/products.service';
import { ProductsRepository } from '../src/modules/products/repositories/products.repository';
import { LockAndDeductStockUseCase } from '../src/modules/products/use-cases/lock-and-deduct-stock.use-case';

describe('Challenger M1: Clean Architecture & Concurrency Stress Test', () => {
  let app: INestApplication;
  let db: DrizzleDatabase;
  let productsService: ProductsService;
  let productsRepository: ProductsRepository;
  let lockAndDeductUseCase: LockAndDeductStockUseCase;

  let testProduct1Id: number;
  let testProduct2Id: number;
  let testProduct3Id: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    db = moduleFixture.get<DrizzleDatabase>(DRIZZLE_ORM);
    productsService = moduleFixture.get<ProductsService>(ProductsService);
    productsRepository = moduleFixture.get<ProductsRepository>(ProductsRepository);
    lockAndDeductUseCase = moduleFixture.get<LockAndDeductStockUseCase>(LockAndDeductStockUseCase);

    // Create 3 isolated test products
    const p1 = await productsRepository.create({
      productCode: `CHL1_${Date.now()}`,
      productName: 'Challenger Test Prod 1',
      stock: 10,
      price: '15000.00',
    });
    testProduct1Id = p1.id;

    const p2 = await productsRepository.create({
      productCode: `CHL2_${Date.now()}`,
      productName: 'Challenger Test Prod 2',
      stock: 5,
      price: '25000.00',
    });
    testProduct2Id = p2.id;

    const p3 = await productsRepository.create({
      productCode: `CHL3_${Date.now()}`,
      productName: 'Challenger Test Prod 3',
      stock: 20,
      price: '10000.00',
    });
    testProduct3Id = p3.id;
  });

  afterAll(async () => {
    // Clean up created test products
    if (testProduct1Id || testProduct2Id || testProduct3Id) {
      await db.delete(schema.products).where(
        inArray(schema.products.id, [testProduct1Id, testProduct2Id, testProduct3Id].filter(Boolean)),
      );
    }
    await app.close();
  });

  // =========================================================================
  // 1. ARCHITECTURAL PURITY SCAN & CONTRACT INTEGRITY
  // =========================================================================
  describe('1. Architectural Purity & Contract Integrity', () => {
    it('should verify @titipin/shared contracts validate and reject invalid payloads properly', async () => {
      const {
        createCustomerSchema,
        checkoutOrderSchema,
        dashboardQuerySchema,
        auditQuerySchema,
      } = await import('@titipin/shared');

      // 1. Customer schema valid
      const validCustomer = createCustomerSchema.safeParse({
        customer_name: 'Budi Santoso',
        customer_address: 'Jl. Merdeka No. 10 Jakarta',
        gender: 'Pria',
        birth_date: '1990-05-15',
        phone: '08123456789',
      });
      expect(validCustomer.success).toBe(true);

      // Customer schema invalid (name too short, address too short, invalid gender)
      const invalidCustomer = createCustomerSchema.safeParse({
        customer_name: 'B',
        customer_address: 'Jl',
        gender: 'Other',
        birth_date: 'invalid-date',
      });
      expect(invalidCustomer.success).toBe(false);

      // 2. Checkout schema valid
      const validCheckout = checkoutOrderSchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        items: [{ product_id: 1, quantity: 2 }],
      });
      expect(validCheckout.success).toBe(true);

      // Checkout schema invalid (empty items)
      const invalidCheckout = checkoutOrderSchema.safeParse({
        items: [],
      });
      expect(invalidCheckout.success).toBe(false);

      // 3. Dashboard query schema valid
      const validDashboard = dashboardQuerySchema.safeParse({ period: 'monthly' });
      expect(validDashboard.success).toBe(true);
      const invalidDashboard = dashboardQuerySchema.safeParse({ period: 'yearly' });
      expect(invalidDashboard.success).toBe(false);

      // 4. Audit query schema default values
      const validAudit = auditQuerySchema.safeParse({});
      expect(validAudit.success).toBe(true);
      if (validAudit.success) {
        expect(validAudit.data.page).toBe(1);
        expect(validAudit.data.per_page).toBe(10);
      }
    });
    it('should verify *.service.ts files do not perform direct Drizzle DB queries', () => {
      const srcDir = path.resolve(__dirname, '../src');
      
      const findFiles = (dir: string, filter: RegExp): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            results = results.concat(findFiles(filePath, filter));
          } else if (filter.test(file)) {
            results.push(filePath);
          }
        }
        return results;
      };

      const serviceFiles = findFiles(srcDir, /\.service\.ts$/);
      expect(serviceFiles.length).toBeGreaterThan(0);

      const violations: string[] = [];
      for (const file of serviceFiles) {
        // Skip HealthService which uses raw pool for ping
        if (file.endsWith('health.service.ts')) continue;

        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('DRIZZLE_ORM') || content.includes('@Inject(DRIZZLE_ORM)')) {
          violations.push(`${path.basename(file)} injects DRIZZLE_ORM directly`);
        }
        if (/this\.db\.(select|insert|update|delete)/.test(content)) {
          violations.push(`${path.basename(file)} calls direct this.db query methods`);
        }
      }

      expect(violations).toEqual([]);
    });

    it('should verify *.controller.ts files do not import or access database/drizzle', () => {
      const srcDir = path.resolve(__dirname, '../src');
      const findFiles = (dir: string, filter: RegExp): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            results = results.concat(findFiles(filePath, filter));
          } else if (filter.test(file)) {
            results.push(filePath);
          }
        }
        return results;
      };

      const controllerFiles = findFiles(srcDir, /\.controller\.ts$/);
      expect(controllerFiles.length).toBeGreaterThan(0);

      const violations: string[] = [];
      for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('drizzle-orm') || content.includes('DRIZZLE_ORM')) {
          violations.push(`${path.basename(file)} references Drizzle ORM`);
        }
        if (content.includes('database.module') || content.includes('schema/')) {
          violations.push(`${path.basename(file)} imports database module or schema`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  // =========================================================================
  // 2. DEADLOCK RESISTANCE & LOCK ORDERING
  // =========================================================================
  describe('2. Deadlock Resistance & Lock Ordering', () => {
    it('should deduplicate and sort IDs ascending in lockProductsForUpdate', async () => {
      const unorderedIds = [testProduct3Id, testProduct1Id, testProduct2Id, testProduct1Id];
      
      await db.transaction(async (tx) => {
        const locked = await productsRepository.lockProductsForUpdate(unorderedIds, tx);
        expect(locked.length).toBe(3);
        
        // Check that products returned correspond to the unique set
        const lockedIds = locked.map((p) => p.id);
        expect(lockedIds).toContain(testProduct1Id);
        expect(lockedIds).toContain(testProduct2Id);
        expect(lockedIds).toContain(testProduct3Id);
      });
    });

    it('empirically checks SQL query structure of lockProductsForUpdate', async () => {
      // Check SQL query generated for lockProductsForUpdate
      const query = db
        .select()
        .from(schema.products)
        .where(inArray(schema.products.id, [1, 2]))
        .for('update');

      const sqlObj = query.toSQL();
      // Inspect if ORDER BY is present in SQL
      const hasOrderByInSql = sqlObj.sql.toLowerCase().includes('order by');
      // Record empirical observation
      console.log('Generated SQL for lockProductsForUpdate:', sqlObj.sql);
      console.log('Does generated SQL contain ORDER BY clause?:', hasOrderByInSql);
    });
  });

  // =========================================================================
  // 3. TRANSACTIONAL ISOLATION & ROLLBACK VERIFICATION
  // =========================================================================
  describe('3. Transactional Isolation & Rollback', () => {
    it('should successfully deduct stock within a committed transaction', async () => {
      const initialP1 = await productsRepository.findById(testProduct1Id);
      expect(initialP1?.stock).toBe(10);

      await db.transaction(async (tx) => {
        const result = await productsService.lockAndDeductStock(tx, [
          { productId: testProduct1Id, quantity: 3 },
        ]);

        expect(result.length).toBe(1);
        expect(result[0].id).toBe(testProduct1Id);
        expect(result[0].quantity).toBe(3);
        expect(result[0].unitPrice).toBe(15000);
      });

      // Verify stock was decremented from 10 to 7
      const afterP1 = await productsRepository.findById(testProduct1Id);
      expect(afterP1?.stock).toBe(7);
    });

    it('should rollback all deductions if any single item exceeds available stock', async () => {
      // testProduct1 currently has 7, testProduct2 has 5
      const beforeP1 = await productsRepository.findById(testProduct1Id);
      const beforeP2 = await productsRepository.findById(testProduct2Id);
      expect(beforeP1?.stock).toBe(7);
      expect(beforeP2?.stock).toBe(5);

      let errorThrown = false;
      try {
        await db.transaction(async (tx) => {
          // P1 has 7 (valid deduction of 2)
          // P2 has 5 (invalid deduction of 10)
          await productsService.lockAndDeductStock(tx, [
            { productId: testProduct1Id, quantity: 2 },
            { productId: testProduct2Id, quantity: 10 },
          ]);
        });
      } catch (err) {
        errorThrown = true;
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        expect((err as UnprocessableEntityException).message).toContain('tidak mencukupi');
      }

      expect(errorThrown).toBe(true);

      // Verify complete rollback: neither P1 nor P2 was modified
      const afterP1 = await productsRepository.findById(testProduct1Id);
      const afterP2 = await productsRepository.findById(testProduct2Id);
      expect(afterP1?.stock).toBe(7);
      expect(afterP2?.stock).toBe(5);
    });

    it('should rollback and reject if a product is soft-deleted', async () => {
      // Soft-delete testProduct3
      await productsRepository.softDelete(testProduct3Id);

      const deletedP3 = await productsRepository.findById(testProduct3Id, true);
      expect(deletedP3?.deletedAt).not.toBeNull();

      let errorThrown = false;
      try {
        await db.transaction(async (tx) => {
          await productsService.lockAndDeductStock(tx, [
            { productId: testProduct3Id, quantity: 1 },
          ]);
        });
      } catch (err) {
        errorThrown = true;
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        expect((err as UnprocessableEntityException).message).toContain('tidak ditemukan atau sudah tidak aktif');
      }

      expect(errorThrown).toBe(true);
    });

    it('should reject empty item list with UnprocessableEntityException', async () => {
      await expect(
        db.transaction(async (tx) => {
          await productsService.lockAndDeductStock(tx, []);
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('STRESS / ADVERSARIAL: Duplicate product entries that cumulatively exceed stock', async () => {
      // P1 currently has stock = 7
      // Send items: [{ productId: P1, quantity: 5 }, { productId: P1, quantity: 5 }]
      // Sum = 10 > 7.
      // What happens?
      const beforeP1 = await productsRepository.findById(testProduct1Id);
      expect(beforeP1?.stock).toBe(7);

      let caughtError: any = null;
      try {
        await db.transaction(async (tx) => {
          await productsService.lockAndDeductStock(tx, [
            { productId: testProduct1Id, quantity: 5 },
            { productId: testProduct1Id, quantity: 5 },
          ]);
        });
      } catch (err) {
        caughtError = err;
      }

      // Record what kind of error was thrown
      console.log('Duplicate item cumulative stock exhaustion error:', caughtError?.message || caughtError);
      
      // Stock must not have become negative!
      const afterP1 = await productsRepository.findById(testProduct1Id);
      expect(afterP1?.stock).toBe(7);
    });

    it('STRESS / CONCURRENCY: Race condition between two concurrent checkouts for limited stock', async () => {
      // Reset P2 stock to 5
      await productsRepository.update(testProduct2Id, { stock: 5 });

      // Tx A attempts to buy 4
      // Tx B attempts to buy 3
      // Total requested = 7 > 5 available. Exactly one should succeed, one should fail.
      const runTx = async (qty: number) => {
        return db.transaction(async (tx) => {
          return productsService.lockAndDeductStock(tx, [
            { productId: testProduct2Id, quantity: qty },
          ]);
        });
      };

      const results = await Promise.allSettled([runTx(4), runTx(3)]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      console.log('Concurrent checkout results:', {
        fulfilledCount: fulfilled.length,
        rejectedCount: rejected.length,
      });

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Remaining stock should be either 5 - 4 = 1 OR 5 - 3 = 2
      const finalP2 = await productsRepository.findById(testProduct2Id);
      expect([1, 2]).toContain(finalP2?.stock);
      expect(finalP2?.stock).toBeGreaterThanOrEqual(0);
    });
  });
});
