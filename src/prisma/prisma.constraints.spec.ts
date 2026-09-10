import { PrismaService } from './prisma.service';

describe('Database constraints', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve rejeitar preço negativo de produto', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "products"
          ("id", "name", "price", "isAvailable", "categoryId", "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), 'Constraint Test', -1, true, gen_random_uuid(), NOW(), NOW())
      `,
    ).rejects.toThrow();
  });

  it('deve rejeitar total negativo de pedido', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "orders"
          ("id", "customerId", "restaurantId", "addressId",
           "addressStreet", "addressNumber", "addressDistrict",
           "addressCity", "addressState", "addressZipCode",
           "totalAmount", "status", "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
           'Rua Teste', '1', 'Centro',
           'São Paulo', 'SP', '00000-000',
           -1, 'PENDING', NOW(), NOW())
      `,
    ).rejects.toThrow();
  });

  it('deve rejeitar unitPrice negativo em order_items', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "order_items"
          ("id", "orderId", "productId", "productName",
           "unitPrice", "quantity", "createdAt")
        VALUES
          (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
           'Constraint Test', -1, 1, NOW())
      `,
    ).rejects.toThrow();
  });

  it('deve rejeitar quantity menor ou igual a zero em order_items', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "order_items"
          ("id", "orderId", "productId", "productName",
           "unitPrice", "quantity", "createdAt")
        VALUES
          (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
           'Constraint Test', 10, 0, NOW())
      `,
    ).rejects.toThrow();
  });

  it('deve rejeitar quantity menor ou igual a zero em cart_items', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "cart_items"
          ("id", "cartId", "productId", "quantity", "unitPrice", "createdAt")
        VALUES
          (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
           0, 10, NOW())
      `,
    ).rejects.toThrow();
  });

  it('deve rejeitar unitPrice negativo em cart_items', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "cart_items"
          ("id", "cartId", "productId", "quantity", "unitPrice", "createdAt")
        VALUES
          (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
           1, -1, NOW())
      `,
    ).rejects.toThrow();
  });

  it('deve rejeitar amount negativo em payments', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "payments"
          ("id", "orderId", "stripePaymentIntentId",
           "amount", "status", "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), gen_random_uuid(),
           'constraint-test-' || gen_random_uuid(),
           -1, 'PENDING', NOW(), NOW())
      `,
    ).rejects.toThrow();
  });
});