# Delivery Backend API

Backend REST de uma plataforma de delivery SaaS, desenvolvido com NestJS, TypeScript, Prisma e PostgreSQL. A API é independente do frontend e cobre catálogo, carrinho, pedidos, pagamentos, autenticação e integrações externas.

## Funcionalidades implementadas

- Cadastro e login com e-mail e senha.
- Login com Google OAuth 2.0.
- Autenticação JWT por cookie `HttpOnly` ou header `Authorization: Bearer <token>`.
- Controle de acesso por proprietário do recurso e por perfil administrativo.
- Bloqueio e desbloqueio de usuários por administradores.
- Cadastro e aprovação administrativa de restaurantes.
- CRUD de categorias, produtos e endereços.
- Upload de logo, banner e imagem de produto no Cloudinary.
- Carrinho com itens de um único restaurante, preço armazenado e limite de quantidade.
- Checkout com validação de endereço, disponibilidade, preço e restaurante.
- Pedidos com fluxo de status e snapshot do endereço de entrega.
- Pagamentos Stripe com PaymentIntent, idempotência e processamento de webhook assinado.
- Health check de banco de dados, Swagger, rate limiting e filtro global de exceções.

## Arquitetura

O projeto segue a organização modular do NestJS. Controllers expõem as rotas HTTP, services concentram regras de negócio e acesso ao Prisma, e guards/strategies controlam autenticação e autorização.

```text
src/
├── common/             # Filtro global de exceções
├── health/             # Health check
├── prisma/             # PrismaService e módulo global
├── modules/
│   ├── auth/           # JWT, Google OAuth e login
│   ├── users/          # Administração de usuários
│   ├── restaurants/    # Restaurantes e aprovação administrativa
│   ├── categories/     # Categorias
│   ├── products/       # Produtos e imagens
│   ├── addresses/      # Endereços
│   ├── cart/           # Carrinho e checkout
│   ├── orders/         # Pedidos e status
│   ├── payments/       # Stripe e webhooks
│   └── cloudinary/     # Upload e remoção de imagens
├── app.module.ts
└── main.ts
```

## Módulos

| Módulo | Responsabilidade |
| --- | --- |
| `AuthModule` | Cadastro, login, JWT e Google OAuth. |
| `UsersModule` | Consulta administrativa e bloqueio de usuários. |
| `RestaurantsModule` | Restaurantes, imagens e aprovação administrativa. |
| `CategoriesModule` | Categorias por restaurante. |
| `ProductsModule` | Catálogo, preços, disponibilidade e imagens. |
| `AddressesModule` | Endereços do cliente. |
| `CartModule` | Itens de carrinho e checkout. |
| `OrdersModule` | Consulta de pedidos e mudança de status pelo restaurante. |
| `PaymentsModule` | PaymentIntents, pagamentos e webhooks Stripe. |
| `CloudinaryModule` | Integração com Cloudinary. |
| `PrismaModule` | Cliente Prisma global. |
| `HealthModule` | Verificação de conectividade com PostgreSQL. |

## Tecnologias

- **NestJS** e **TypeScript** — API e arquitetura modular.
- **PostgreSQL** e **Prisma** — persistência, schema e migrations.
- **Passport**, **JWT** e **Bcrypt** — autenticação e hash de senha.
- **Google OAuth 2.0** — login social.
- **Stripe** — pagamentos e webhooks.
- **Cloudinary**, **Multer** e **file-type** — upload e validação de imagens.
- **class-validator** e **class-transformer** — validação e transformação de DTOs.
- **Joi** — validação de variáveis de ambiente.
- **Helmet**, **cookie-parser** e **express-session** — segurança HTTP, cookies e sessão OAuth.
- **@nestjs/throttler** — rate limiting.
- **@nestjs/terminus** — health check.
- **Swagger** — documentação HTTP em `/api/docs`.
- **Jest** e **Supertest** — testes.

## Autenticação e autorização

### JWT e cookies

O login local e o callback do Google OAuth criam o cookie `access_token` com `HttpOnly`, `SameSite=Lax` e validade de sete dias. Quando `NODE_ENV=production`, o cookie usa a flag `Secure`.

As rotas protegidas também aceitam JWT no header:

```http
Authorization: Bearer <token>
```

O `JwtStrategy` consulta o usuário no banco a cada autenticação e bloqueia acesso de contas inexistentes ou bloqueadas.

### Google OAuth

O fluxo Google usa `passport-google-oauth20`, solicita perfil e e-mail, e habilita `state` para proteção do fluxo OAuth. A sessão temporária é usada durante esse processo; o resultado final é o cookie JWT e redirecionamento ao frontend configurado.

### Autorização

- Usuários só acessam seus próprios endereços, carrinho e pedidos.
- Proprietários só gerenciam seus próprios restaurantes, categorias e produtos.
- Ações administrativas usam `RolesGuard` e exigem `Role.ADMIN`.
- Restaurantes públicos e catálogo público expõem somente restaurantes aprovados e produtos disponíveis.

## Domínio da aplicação

### Usuários

- Cadastro por e-mail/senha ou Google OAuth.
- Consulta do usuário autenticado em `GET /auth/me`.
- Listagem, consulta, bloqueio e desbloqueio disponíveis apenas para administradores.
- Atualização de dados de usuário não está implementada.

### Restaurantes

Restaurantes nascem com status `PENDING`. Administradores podem aprovar, rejeitar, suspender e reativar restaurantes. A vitrine pública lista somente restaurantes `APPROVED`.

### Categorias e produtos

Categorias pertencem a um restaurante. Produtos pertencem a uma categoria, possuem preço decimal, disponibilidade e imagem opcional. Imagens aceitam JPG, PNG e WebP, com validação de MIME, conteúdo e tamanho máximo de 5 MB.

### Carrinho e checkout

Cada usuário possui, no máximo, um carrinho, vinculado a um restaurante. O carrinho impede itens de restaurantes diferentes, mantém o preço unitário do momento da adição e limita a quantidade por produto a 99.

No checkout, a API valida endereço do cliente, itens existentes, disponibilidade, restaurante aprovado e alterações de preço. O pedido e seus itens são criados em transação serializável.

### Pedidos e endereço

Pedidos seguem os estados:

```text
PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
                  └→ CANCELLED
PENDING ───────────→ CANCELLED
```

O endereço de entrega é copiado para campos do pedido (`addressStreet`, `addressNumber`, entre outros). Esse snapshot preserva os dados usados na compra mesmo que o endereço cadastrado seja alterado posteriormente.

### Stripe

Para cada pedido há, no máximo, um pagamento e um PaymentIntent Stripe. A criação usa chave de idempotência baseada no pedido. O webhook recebe o raw body, valida a assinatura Stripe e registra eventos processados para evitar duplicidade.

Eventos de sucesso confirmam o pagamento e o pedido pendente. Eventos de falha atualizam o pagamento. Ao cancelar pedido, a aplicação tenta cancelar PaymentIntent pendente ou solicitar refund para pagamento já confirmado.

### Cloudinary

O Cloudinary armazena logo, banner e imagem de produto. O projeto guarda a URL segura e o `publicId` para substituição ou remoção posterior.

## Integridade e validação

- `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e `transform`.
- DTOs com `class-validator` e decorators Swagger.
- Valores monetários armazenados como `Decimal(10,2)`.
- Constraints PostgreSQL impedem preço/valor negativo e quantidade não positiva em produtos, carrinho, itens de pedido, pedidos e pagamentos.
- E-mail, `googleId`, carrinho por usuário, item por carrinho/produto, pedido por pagamento e identificadores Stripe relevantes possuem constraints de unicidade.

## Operação e segurança

- **Rate limiting:** limite global de 100 requisições por minuto e limite de 5 tentativas por minuto em `POST /auth/login`.
- **Tratamento de erros:** filtro global HTTP padroniza a resposta de exceções.
- **Health check:** `GET /health` verifica conectividade com PostgreSQL.
- **Swagger:** disponível em `GET /api/docs`.
- **CORS:** configurado para `FRONTEND_URL` com credenciais.
- **Helmet:** aplicado globalmente.

## Rotas

### Aplicação e health

| Método | Rota |
| --- | --- |
| GET | `/` |
| GET | `/health` |
| GET | `/api/docs` |

### Auth

| Método | Rota |
| --- | --- |
| POST | `/auth/register` |
| POST | `/auth/login` |
| GET | `/auth/me` |
| GET | `/auth/google` |
| GET | `/auth/google/callback` |

### Usuários

| Método | Rota |
| --- | --- |
| GET | `/users/admin` |
| GET | `/users/admin/:id` |
| PATCH | `/users/admin/:id/block` |
| PATCH | `/users/admin/:id/unblock` |

### Restaurantes

| Método | Rota |
| --- | --- |
| POST | `/restaurants` |
| GET | `/restaurants` |
| GET | `/restaurants/me` |
| GET | `/restaurants/public/:id` |
| GET | `/restaurants/:id` |
| PATCH | `/restaurants/:id` |
| DELETE | `/restaurants/:id` |
| GET | `/restaurants/admin/pending` |
| PATCH | `/restaurants/admin/:id/approve` |
| PATCH | `/restaurants/admin/:id/reject` |
| PATCH | `/restaurants/admin/:id/suspend` |
| PATCH | `/restaurants/admin/:id/reactivate` |

### Categorias

| Método | Rota |
| --- | --- |
| POST | `/restaurants/:restaurantId/categories` |
| GET | `/restaurants/:restaurantId/categories` |
| GET | `/restaurants/:restaurantId/categories/public` |
| GET | `/restaurants/:restaurantId/categories/public/:categoryId` |
| GET | `/restaurants/:restaurantId/categories/:categoryId` |
| PATCH | `/restaurants/:restaurantId/categories/:categoryId` |
| DELETE | `/restaurants/:restaurantId/categories/:categoryId` |

### Produtos

| Método | Rota |
| --- | --- |
| POST | `/restaurants/:restaurantId/categories/:categoryId/products` |
| GET | `/restaurants/:restaurantId/categories/:categoryId/products` |
| GET | `/restaurants/:restaurantId/categories/:categoryId/products/public` |
| GET | `/restaurants/:restaurantId/categories/:categoryId/products/public/:productId` |
| GET | `/restaurants/:restaurantId/categories/:categoryId/products/:productId` |
| PATCH | `/restaurants/:restaurantId/categories/:categoryId/products/:productId` |
| DELETE | `/restaurants/:restaurantId/categories/:categoryId/products/:productId` |

### Endereços

| Método | Rota |
| --- | --- |
| POST | `/addresses` |
| GET | `/addresses/me` |
| GET | `/addresses/:id` |
| PATCH | `/addresses/:id` |
| DELETE | `/addresses/:id` |

### Carrinho

| Método | Rota |
| --- | --- |
| POST | `/cart/items` |
| GET | `/cart` |
| PATCH | `/cart/items/:itemId` |
| DELETE | `/cart/items/:itemId` |
| POST | `/cart/checkout` |

### Pedidos

| Método | Rota |
| --- | --- |
| GET | `/orders` |
| GET | `/orders/:id` |
| GET | `/orders/restaurants/:restaurantId` |
| PATCH | `/orders/restaurants/:restaurantId/orders/:orderId/status` |

### Pagamentos

| Método | Rota |
| --- | --- |
| POST | `/payments/webhook` |
| POST | `/payments/:orderId` |

## Variáveis de ambiente

Crie um arquivo `.env` local sem versioná-lo. Não inclua valores reais de produção em documentação ou repositório.

```env
DATABASE_URL=
JWT_SECRET=
SESSION_SECRET=
NODE_ENV=development
PORT=3000

FRONTEND_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`DATABASE_URL`, `JWT_SECRET`, credenciais Google, credenciais Stripe, credenciais Cloudinary e `FRONTEND_URL` são validadas no bootstrap. `SESSION_SECRET` é usada pela sessão OAuth e deve ser definida. Em produção, defina `NODE_ENV=production` para habilitar cookies seguros. `PORT` é opcional e usa `3000` por padrão.

## Instalação

Pré-requisitos confirmados pelo projeto:

- Node.js compatível com as dependências instaladas.
- PostgreSQL acessível pela `DATABASE_URL`.
- Conta/configuração de Google OAuth, Stripe e Cloudinary para os fluxos correspondentes.

```bash
npm install
```

Configure o `.env` antes de iniciar a aplicação.

## Prisma e migrations

Para desenvolvimento, use o fluxo de migrations Prisma apropriado ao ambiente.

Para produção, aplique migrations pendentes antes de iniciar a API:

```bash
npx prisma migrate deploy
```

O schema e as migrations estão em `prisma/schema.prisma` e `prisma/migrations/`.

## Execução

```bash
# Desenvolvimento
npm run start:dev

# Build
npm run build

# Produção, após o build
npm run start:prod
```

## Testes e scripts

```bash
# Testes unitários
npm run test

# Testes em watch mode
npm run test:watch

# Cobertura
npm run test:cov

# Testes E2E
npm run test:e2e
```

Outros scripts disponíveis:

```bash
npm run format
npm run lint
npm run test:debug
```

`format` e `lint` executam com escrita automática, portanto podem alterar arquivos.

## Deploy

Fluxo mínimo de deploy:

1. Defina todas as variáveis de ambiente necessárias, incluindo `SESSION_SECRET` e `NODE_ENV=production`.
2. Instale dependências.
3. Execute `npx prisma migrate deploy` contra o banco de produção.
4. Execute `npm run build`.
5. Inicie com `npm run start:prod`.
6. Configure o provedor Stripe para enviar eventos ao endpoint `POST /payments/webhook` usando o secret correspondente.
7. Configure a URL pública de callback do Google para corresponder a `GOOGLE_CALLBACK_URL`.
8. Verifique o endpoint `GET /health` após a publicação.

Para deploy atrás de proxy reverso e/ou com múltiplas instâncias, a configuração de proxy e um armazenamento compartilhado de sessão/rate limit ainda precisam ser definidos conforme a infraestrutura.

## Decisões técnicas relevantes

- Preços e totais usam `Decimal(10,2)` no PostgreSQL para evitar persistência em ponto flutuante.
- Checkout usa transação serializável para proteger a criação do pedido e a limpeza do carrinho.
- O endereço é copiado ao pedido para preservar histórico de entrega.
- Stripe usa chave de idempotência por pedido e eventos de webhook persistidos para deduplicação.
- Cookies JWT são `HttpOnly`; o Bearer token permanece suportado para clientes que o utilizem.
- A autorização de proprietário é verificada no service, não somente no controller.

## Limitações atuais

- Não há rota de atualização de dados do usuário.
- O teste E2E encontrado cobre apenas a rota raiz; os demais fluxos possuem testes unitários, mas não cobertura E2E confirmada.
- Não foram encontrados Docker, CI/CD, configuração de `trust proxy`, graceful shutdown ou armazenamento compartilhado para sessão/rate limiting.
- `express-session` usa o armazenamento padrão em memória; produção com múltiplas instâncias requer armazenamento compartilhado.

## Próximos passos

- Adicionar testes E2E para autenticação, cookies, OAuth, checkout, pagamentos, webhooks e autorização.
- Definir armazenamento de sessão e rate limit adequado à infraestrutura de produção.
- Configurar proxy reverso, observabilidade, CI/CD e estratégia de graceful shutdown.
- Avaliar endpoint de atualização de perfil conforme necessidade do produto.
