# 🍔 Delivery Backend API

API REST para um sistema de Delivery SaaS desenvolvida com **NestJS**, **Prisma ORM** e **PostgreSQL**.

O projeto foi desenvolvido com foco em arquitetura, regras de negócio, autenticação segura e boas práticas de desenvolvimento backend.

---

# 📸 Visão Geral

A API permite que:

- Clientes criem pedidos.
- Restaurantes gerenciem seus produtos.
- Restaurantes acompanhem e alterem o status dos pedidos.
- Usuários cadastrem múltiplos endereços.
- Todo acesso seja protegido por autenticação JWT.

---

# 🚀 Tecnologias

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL

## Autenticação

- JWT
- Passport
- Google OAuth 2.0
- Bcrypt

## Validação

- class-validator
- class-transformer

## Banco de Dados

- PostgreSQL
- Prisma Migrate

---

# 📁 Estrutura do Projeto

```
src
│
├── auth/
├── prisma/
├── users/
├── restaurants/
├── categories/
├── products/
├── addresses/
└── orders/
```

Cada módulo possui sua própria responsabilidade, seguindo a arquitetura modular do NestJS.

---

# 🔐 Funcionalidades

## Autenticação

- Cadastro de usuários
- Login com Email e Senha
- Login com Google
- JWT Authentication
- Rotas protegidas

---

## Restaurantes

- Criar restaurante
- Atualizar restaurante
- Excluir restaurante
- Listar restaurantes do proprietário

---

## Categorias

- CRUD completo
- Relacionadas ao restaurante

---

## Produtos

- CRUD completo
- Disponibilidade
- Organização por categoria

---

## Endereços

- CRUD completo
- Um usuário pode possuir vários endereços

---

## Pedidos

- Criar pedido
- Listar pedidos do cliente
- Buscar pedido por ID
- Listar pedidos do restaurante
- Atualizar status do pedido

---

# 📦 Regras de Negócio

### Pedido

- Todos os produtos devem pertencer ao mesmo restaurante.
- Produtos indisponíveis não podem ser comprados.
- Produtos inexistentes retornam erro.
- O total do pedido é calculado automaticamente.
- O endereço deve pertencer ao cliente.

---

### Status do Pedido

Fluxo permitido:

```
PENDING
    │
    ▼
CONFIRMED
    │
    ▼
PREPARING
    │
    ▼
OUT_FOR_DELIVERY
    │
    ▼
DELIVERED
```

Também é permitido:

```
PENDING
    │
    ▼
CANCELLED
```

ou

```
CONFIRMED
    │
    ▼
CANCELLED
```

Qualquer outra transição é bloqueada pela API.

---

# 🔒 Segurança

- Rotas protegidas com JWT.
- Cada usuário acessa apenas seus próprios recursos.
- Restaurantes podem alterar apenas seus próprios dados.
- Clientes podem visualizar apenas seus próprios pedidos.
- Apenas o restaurante proprietário pode alterar o status de seus pedidos.

---

# ⚙️ Como executar

## Clone o projeto

```bash
git clone <url-do-repositorio>
```

---

## Instale as dependências

```bash
npm install
```

---

## Configure o arquivo `.env`

```env
DATABASE_URL=

JWT_SECRET=

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=
```

---

## Execute as migrations

```bash
npx prisma migrate dev
```

---

## Execute o projeto

```bash
npm run start:dev
```

---

# 📚 Arquitetura

A aplicação segue a arquitetura modular do NestJS.

Cada módulo possui:

- Controller
- Service
- DTOs
- Regras de negócio
- Integração com Prisma

A lógica de negócio permanece concentrada nos Services.

---

# 📌 Próximas funcionalidades

- [ ] Testes unitários (Jest)
- [ ] Docker
- [ ] Deploy
- [ ] CI/CD
- [ ] Upload de imagens
- [ ] Pagamentos
- [ ] Avaliações
- [ ] Notificações em tempo real

---

# 👨‍💻 Autor

Desenvolvido por **Alan da Silva Nunes**

GitHub:
https://github.com/SEU-USUARIO

LinkedIn:
https://linkedin.com/in/SEU-LINK