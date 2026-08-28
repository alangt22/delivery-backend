# Delivery Backend - Codex Instructions

## Projeto

Backend de um Delivery SaaS desenvolvido com:

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Stripe
- JWT
- Google OAuth
- Swagger

O frontend será desenvolvido separadamente.

---

## Regra principal

Antes de implementar qualquer tarefa:

1. Analise o código existente.
2. Procure funcionalidades relacionadas.
3. Verifique se a funcionalidade já existe.
4. Não recrie funcionalidades existentes.
5. Explique o plano antes de alterações relevantes.
6. Faça alterações pequenas e focadas.
7. Preserve o comportamento existente quando não houver motivo para alterá-lo.

---

## Aprendizado

O proprietário do projeto está aprendendo desenvolvimento backend com NestJS.

Ao implementar funcionalidades importantes:

- explique brevemente o que foi feito;
- explique por que foi feito;
- destaque conceitos importantes;
- não esconda decisões arquiteturais relevantes.

Para tarefas repetitivas ou mecânicas, pode implementar diretamente seguindo estas regras.

---

## Segurança

Nunca:

- alterar arquivos `.env`;
- expor secrets, tokens ou credenciais;
- expor `STRIPE_SECRET_KEY`;
- expor `JWT_SECRET`;
- remover mecanismos de segurança existentes;
- executar comandos destrutivos sem autorização.

---

## Banco de dados

O projeto utiliza Prisma + PostgreSQL.

Não:

- executar migrations sem autorização;
- alterar `schema.prisma` sem explicar o impacto;
- apagar dados para resolver problemas;
- resetar o banco sem autorização.

---

## Stripe

Pagamentos utilizam Stripe.

Preservar:

- validação da assinatura dos webhooks;
- idempotência dos eventos;
- relacionamento entre PaymentIntent, Payment e Order;
- segurança das credenciais.

Não alterar o fluxo de pagamentos sem analisar primeiro a implementação existente.

---

## Git

Antes de considerar uma tarefa concluída:

- verificar `git status`;
- revisar `git diff`;
- garantir que arquivos sensíveis não foram adicionados.

Não fazer:

- `git push`;
- alteração de commits existentes;
- comandos destrutivos;

sem autorização explícita do usuário.

---

## Escopo

Modificar somente os arquivos necessários para a tarefa.

Se encontrar um problema fora do escopo:

1. informe o problema;
2. explique o possível impacto;
3. não corrija automaticamente.

---

## Testes

Depois de alterações de código:

- executar os testes relevantes;
- executar o build quando apropriado;
- informar claramente qualquer falha.

Não considerar uma tarefa concluída apenas porque o código compilou.

---

## Documentação

Swagger é utilizado para documentar a API.

DTOs devem utilizar:

- `@ApiProperty()` para campos obrigatórios;
- `@ApiPropertyOptional()` para campos opcionais.

Não remover decorators existentes do `class-validator`.