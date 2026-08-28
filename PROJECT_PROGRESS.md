# Progresso do Projeto — Delivery Backend

## 1. Status geral

- [x] Backend NestJS estruturado em módulos para autenticação, usuários, restaurantes, catálogo, endereços, carrinho, pedidos e pagamentos.
- [x] Persistência configurada com Prisma e PostgreSQL, com migrations versionadas.
- [x] Fluxo principal de compra disponível: carrinho, checkout, pedido e criação de pagamento Stripe.
- [x] Documentação Swagger dos DTOs principais concluída e validada visualmente na interface.
- [x] Build executado com sucesso após a documentação dos DTOs.
- [x] Build executado com sucesso após a inclusão dos testes de checkout do carrinho.
- [x] Build executado com sucesso após a inclusão dos testes de pagamentos Stripe.
- [x] `git diff --check` executado com sucesso após os testes de pagamentos Stripe.
- [x] Build e `git diff --check` executados com sucesso após a inclusão dos testes de autenticação.
- [ ] Cobertura de testes e documentação Swagger de todos os controllers/endpoints ainda não abrangem o sistema completo.

## 2. Funcionalidades implementadas

- [x] Cadastro de usuário com verificação de e-mail duplicado, hash de senha com bcrypt e remoção de `passwordHash` da resposta.
- [x] Login por e-mail e senha com emissão de JWT contendo identificador, e-mail e papel do usuário.
- [x] Autenticação JWT por Bearer Token e rota protegida `GET /auth/me`.
- [x] Google OAuth: início do fluxo, callback, criação/vinculação de `googleId` e emissão de JWT.
- [x] CRUD de restaurantes restrito ao respectivo proprietário.
- [x] CRUD de categorias por restaurante, com verificação de propriedade do restaurante.
- [x] CRUD de produtos por categoria/restaurante, incluindo verificação de disponibilidade para compra.
- [x] CRUD de endereços restrito ao usuário autenticado.
- [x] Carrinho único por usuário e limitado a produtos de um único restaurante.
- [x] Inclusão, consulta, atualização de quantidade e remoção de itens do carrinho.
- [x] Detecção de alteração de preço no carrinho e aceite explícito no checkout.
- [x] Checkout valida endereço, disponibilidade e restaurante dos produtos; cria pedido, itens e limpa o carrinho em transação.
- [x] Pedido armazena snapshot do endereço e snapshot de nome/preço dos produtos.
- [x] Consulta de pedidos do cliente, detalhe de pedido próprio e consulta de pedidos do restaurante proprietário.
- [x] Transições de status de pedido validadas: `PENDING → CONFIRMED/CANCELLED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`.
- [x] Criação de `PaymentIntent` Stripe em BRL e reutilização do pagamento existente para o mesmo pedido.
- [x] Webhook Stripe valida assinatura e trata `payment_intent.succeeded` e `payment_intent.payment_failed`.
- [x] No sucesso do webhook, pagamento e pedido são atualizados em transação.
- [x] Registro de `stripeEventId` para evitar o reprocessamento do mesmo evento já persistido.
- [x] Swagger disponível em `/api/docs`, com configuração de Bearer Auth.
- [x] DTOs principais documentados com `@ApiProperty()` e `@ApiPropertyOptional()`.
- [x] Endpoint temporário público `GET /users/test` e o método `test()` correspondente do `UsersService` removidos, sem alterações no banco, Prisma ou autenticação.
- [x] Build executado com sucesso após a remoção do endpoint temporário de usuários.
- [x] Testes comportamentais de `CartService.checkout()` adicionados: 10 testes aprovados para sucesso, validações de erro, alteração de preço e uso da transação.
- [x] Os testes de checkout verificam criação do pedido, criação dos itens, limpeza do carrinho e retorno final.
- [x] Testes unitários comportamentais de `PaymentsService.createPayment()` adicionados: 5 testes aprovados para pedido inexistente, reutilização de PaymentIntent, novo pagamento, conversão para centavos e falha do Stripe.
- [x] Os testes de criação de pagamento verificam os parâmetros enviados ao Stripe e a persistência do `Payment` no Prisma.
- [x] Testes comportamentais de `PaymentsService.handleWebhook()` adicionados; a spec de pagamentos possui 12 testes aprovados: 5 para `createPayment()` e 7 para `handleWebhook()`.
- [x] Os testes de webhook cobrem assinatura ausente, sucesso, falha, pagamento inexistente, idempotência e eventos não tratados.
- [x] Os testes de webhook verificam atualização do `Payment`, atualização do `Order` e uso de transação no evento de sucesso.
- [x] Cobertura de pagamentos Stripe concluída para `createPayment()` e `handleWebhook()`.
- [x] Testes comportamentais de `AuthService.register()` e `AuthService.login()` adicionados: 6 testes aprovados.
- [x] Os testes de autenticação cobrem cadastro, hash de senha, e-mail duplicado, login inválido, conta Google sem `passwordHash`, senha incorreta e login válido com JWT.
- [x] Os testes de registro/login usam mocks e não fazem chamadas reais a banco, bcrypt ou JWT.
- [x] Cobertura de `register()` e `login()` concluída.
- [x] Testes comportamentais do `OrdersService` adicionados: 19 testes aprovados.
- [x] Os testes de pedidos cobrem todas as transições válidas de status, principais transições inválidas, pedido/restaurante não encontrado, consultas de pedidos do cliente e consultas de pedidos do restaurante.
- [x] `findMyOrders()`, `findMyOrderById()` e `findMyRestaurantOrders()` possuem cobertura comportamental, incluindo isolamento por cliente/proprietário e parâmetros das consultas Prisma.
- [x] Testes comportamentais de `AuthService.validateGoogleUser()` adicionados: 4 testes aprovados.
- [x] Os testes de Google OAuth cobrem criação de usuário, vinculação de `googleId`, reutilização de usuário já vinculado, geração de JWT e remoção de `passwordHash`.
- [x] Cobertura de `AuthService.register()`, `login()` e `validateGoogleUser()` concluída, totalizando 10 testes aprovados.

## 3. Funcionalidades parciais

- [ ] Gestão de usuários: não há endpoints de perfil ou administração de usuários.
- [ ] Google OAuth: callback e redirecionamento do frontend estão fixos para URLs locais.
- [ ] Idempotência de webhooks Stripe: existe `stripeEventId` e há testes para reprocessamento do mesmo evento já persistido, mas o tratamento de eventos concorrentes pode exigir proteção adicional.
- [ ] Swagger: os DTOs principais estão documentados e foram validados visualmente na interface, mas a documentação dos controllers/endpoints permanece pendente.
- [ ] Autorização por papéis: o enum `Role` existe e é incluído no JWT, mas não há guard ou regras aplicadas para `ADMIN` e `CUSTOMER`.
- [ ] Testes: `CartService` possui 23 testes, `CartController` possui 6, pagamentos Stripe possuem 12 no service e 3 no controller, `AuthService` possui 10 e `OrdersService` possui 19 testes aprovados; permanecem pendentes testes E2E e cobertura de outros módulos/controllers.

## 4. Pendências

- [ ] Criar rotas públicas de vitrine/cardápio, caso esse seja o comportamento desejado; atualmente as leituras de restaurantes, categorias e produtos exigem autenticação e propriedade.
- [ ] Completar a documentação Swagger dos controllers e endpoints com os decorators apropriados.
- [ ] Ampliar testes unitários e de integração para as demais regras do carrinho e testes E2E; checkout, pagamentos Stripe, registro/login, `validateGoogleUser()` e `OrdersService` já possuem cobertura comportamental.
- [ ] Definir e implementar autorização baseada em papéis, se necessária ao produto.
- [ ] Revisar e atualizar o README, que não reflete carrinho, checkout, pagamentos Stripe e Swagger.
- [ ] Definir configuração por ambiente para URLs de callback do Google OAuth e do frontend.

## 5. Pontos de atenção

- [x] Logs do fluxo Google OAuth que poderiam registrar dados de usuário e token foram removidos.
- [ ] Valores monetários usam `Float` no Prisma e nos cálculos; avaliar uma estratégia adequada de precisão monetária.
- [ ] O DTO de criação de endereço não recebe `complement`, embora o banco e o checkout suportem esse campo.
- [ ] As migrations de `unitPrice` no carrinho e de snapshot de endereço possuem avisos para bases que já contenham dados; tratar cuidadosamente ao evoluir ambientes existentes.
- [ ] O reprocessamento simultâneo de um mesmo webhook pode exigir proteção adicional além da checagem atual de `stripeEventId`.

## 6. Próximas prioridades

1. [x] Endpoint temporário público `GET /users/test` removido, juntamente com o método `test()` do `UsersService`; a remoção não alterou banco, Prisma ou autenticação e o build foi aprovado.
2. [ ] Completar testes dos fluxos críticos restantes: demais regras do carrinho e testes E2E; checkout, pagamentos Stripe, autenticação e pedidos já possuem cobertura comportamental.
3. [ ] Completar Swagger em todos os módulos e DTOs.
4. [ ] Tornar URLs de Google OAuth configuráveis por ambiente.
5. [ ] Decidir e implementar as rotas públicas necessárias para restaurantes, categorias e produtos.
6. [ ] Definir regras de papéis e aprimorar a idempotência/confiabilidade dos webhooks antes de produção.
