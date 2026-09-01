# Progresso do Projeto — Delivery Backend

## 1. Status geral

- [x] Backend NestJS estruturado em módulos para autenticação, usuários, restaurantes, catálogo, endereços, carrinho, pedidos e pagamentos.
- [x] Persistência configurada com Prisma e PostgreSQL, com migrations versionadas.
- [x] Fluxo principal de compra disponível: carrinho, checkout, pedido e criação de pagamento Stripe.
- [x] Documentação Swagger dos DTOs principais concluída e validada visualmente na interface.
- [x] Documentação Swagger dos controllers e endpoints principais concluída.
- [x] Build executado com sucesso após a documentação dos DTOs.
- [x] Build executado com sucesso após a inclusão dos testes de checkout do carrinho.
- [x] Build executado com sucesso após a inclusão dos testes de pagamentos Stripe.
- [x] `git diff --check` executado com sucesso após os testes de pagamentos Stripe.
- [x] Build e `git diff --check` executados com sucesso após a inclusão dos testes de autenticação.
- [x] Build executado com sucesso após a documentação dos controllers.
- [x] Suíte completa de testes executada com sucesso: 18 suites e 171 testes aprovados.
- [ ] Cobertura de testes E2E e cobertura completa de todos os fluxos de negócio ainda não concluídas.

## 2. Funcionalidades implementadas

- [x] Cadastro de usuário com verificação de e-mail duplicado, hash de senha com bcrypt e remoção de `passwordHash` da resposta.
- [x] Login por e-mail e senha com emissão de JWT contendo identificador, e-mail e papel do usuário.
- [x] Autenticação JWT por Bearer Token e rota protegida `GET /auth/me`.
- [x] Google OAuth: início do fluxo, callback, criação/vinculação de `googleId` e emissão de JWT.
- [x] CRUD de restaurantes restrito ao respectivo proprietário.
- [x] Upload, atualização e armazenamento de logo e banner dos restaurantes via Cloudinary.
- [x] Remoção das imagens antigas do restaurante no Cloudinary durante a substituição.
- [x] CRUD de categorias por restaurante, com verificação de propriedade do restaurante.
- [x] CRUD de produtos por categoria/restaurante, incluindo verificação de disponibilidade para compra.
- [x] Upload, atualização e remoção de imagens de produtos via Cloudinary.
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
- [x] Controllers principais documentados com tags, operações, parâmetros, respostas, autenticação e consumo de multipart quando necessário.
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
- [x] Testes do `CartService` ampliados para cobrir as principais operações do carrinho e checkout, totalizando 25 testes aprovados no service.
- [x] Testes do `CartController` cobrindo adição, consulta, atualização, remoção e checkout, totalizando 6 testes aprovados.
- [x] Testes do `ProductsController` cobrindo CRUD e envio de imagem, totalizando 8 testes aprovados.
- [x] Testes do `RestaurantsService` cobrindo CRUD, propriedade do restaurante e atualização de imagem, totalizando 9 testes aprovados.
- [x] Testes do `RestaurantsController` cobrindo CRUD e envio de logo/banner, totalizando 7 testes aprovados.
- [x] Testes dos controllers de categorias, endereços, pedidos e pagamentos concluídos.
- [x] Suíte completa atual validada com 18 suites e 171 testes aprovados.

## 3. Funcionalidades parciais

- [ ] Gestão de usuários: não há endpoints de perfil ou administração de usuários.
- [ ] Google OAuth: callback e redirecionamento do frontend estão fixos para URLs locais.
- [ ] Idempotência de webhooks Stripe: existe `stripeEventId` e há testes para reprocessamento do mesmo evento já persistido, mas o tratamento de eventos concorrentes pode exigir proteção adicional.
- [x] Swagger: DTOs principais e controllers/endpoints principais estão documentados e foram validados com build e testes.
- [ ] Autorização por papéis: o enum `Role` existe e é incluído no JWT, mas não há guard ou regras aplicadas para `ADMIN` e `CUSTOMER`.
- [ ] Testes E2E ainda não implementados.
- [ ] Cobertura comportamental de todos os módulos e regras de negócio ainda não é completa.

## 4. Pendências

- [ ] Criar rotas públicas de vitrine/cardápio, caso esse seja o comportamento desejado; atualmente as leituras de restaurantes, categorias e produtos exigem autenticação e propriedade.
- [ ] Ampliar testes unitários e de integração para regras ainda não cobertas e avaliar testes E2E.
- [ ] Definir e implementar autorização baseada em papéis, se necessária ao produto.
- [ ] Revisar e atualizar o README, que não reflete completamente carrinho, checkout, pagamentos Stripe, Cloudinary e Swagger.
- [ ] Definir configuração por ambiente para URLs de callback do Google OAuth e do frontend.
- [ ] Avaliar proteção adicional para processamento concorrente do mesmo webhook Stripe.
- [ ] Avaliar estratégia adequada para precisão monetária.
- [ ] Avaliar inclusão de `complement` no DTO de criação de endereço.

## 5. Pontos de atenção

- [x] Logs do fluxo Google OAuth que poderiam registrar dados de usuário e token foram removidos.
- [ ] Valores monetários usam `Float` no Prisma e nos cálculos; avaliar uma estratégia adequada de precisão monetária.
- [ ] O DTO de criação de endereço não recebe `complement`, embora o banco e o checkout suportem esse campo.
- [ ] As migrations de `unitPrice` no carrinho e de snapshot de endereço possuem avisos para bases que já contenham dados; tratar cuidadosamente ao evoluir ambientes existentes.
- [ ] O reprocessamento simultâneo de um mesmo webhook pode exigir proteção adicional além da checagem atual de `stripeEventId`.
- [ ] URLs de Google OAuth ainda estão fixas para ambiente local.
- [ ] As rotas de leitura de restaurantes, categorias e produtos atualmente estão protegidas por autenticação e propriedade, portanto a arquitetura de vitrine pública ainda precisa ser definida.

## 6. Próximas prioridades

1. [x] Endpoint temporário público `GET /users/test` removido, juntamente com o método `test()` do `UsersService`; a remoção não alterou banco, Prisma ou autenticação e o build foi aprovado.

2. [x] Ampliar cobertura dos principais fluxos unitários: carrinho, checkout, pagamentos Stripe, autenticação, pedidos, restaurantes, produtos e controllers principais.

3. [x] Completar documentação Swagger dos DTOs e controllers/endpoints principais.

4. [ ] Tornar URLs de Google OAuth configuráveis por ambiente.

5. [ ] Decidir e implementar as rotas públicas necessárias para restaurantes, categorias e produtos.

6. [ ] Definir regras de papéis e aprimorar a idempotência/confiabilidade dos webhooks antes de produção.

7. [ ] Revisar README e documentação geral do projeto.

8. [ ] Avaliar testes E2E e demais melhorias de cobertura antes do deploy em produção.