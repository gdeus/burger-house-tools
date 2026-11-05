# 🍔 Burger House Tools

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)]()
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)]()
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)]()
[![Keycloak](https://img.shields.io/badge/Keycloak-003545?style=for-the-badge&logo=keycloak&logoColor=white)]()
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)]()
[![SQL Server](https://img.shields.io/badge/SQL_Server-CC2927?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)]()

Este projeto é um **Monorepo Fullstack** para gestão de equipe, turnos e controle de diárias da hamburgueria **Burger House**.

---

## 🎯 O que foi implementado

### 🖥️ Frontend (React + TypeScript + Tailwind CSS)
* **Single Page Application moderna:** Desenvolvida com **Vite**, **TypeScript** e estilizada com **Tailwind CSS**.
* **Autenticação Integrada com Keycloak:**
  * Login com tratamento de JWT e decodificação de roles (`Admin`, `Caixa`, `Garcom`).
  * Botões de acesso rápido para testes com os perfis pré-configurados.
  * Proteção de rotas com `ProtectedRoute`.
* **Escala Interativa de Diárias:**
  * Alternador de visualização entre **Semanal** e **Mensal**.
  * Navegação entre períodos (Semana anterior, próxima, hoje).
  * Modal para **registro de diária** (permitido para `Admin` e `Caixa`).
  * **Visualização Condicional de Valores:**
    * O **`Admin`** visualiza valores por diária, totais do dia e o painel financeiro consolidado do período (`Total`, `Pago`, `Pendente`), além de botões para dar baixa no pagamento e excluir registros.
    * O **`Caixa`** visualiza e cadastra as escalas da equipe, com todos os valores monetários omitidos da interface.
* **Quadro de Funcionários:**
  * Listagem da equipe com cargos, login e chave Pix.
  * Cadastro de novos funcionários com integração direta no Keycloak e banco (apenas `Admin`).

### ⚙️ Backend (.NET 10 Web API)
* **Orquestração com Docker Compose:** Execução simultânea do **SQL Server**, **RabbitMQ** e **Keycloak** com importação automática do Realm.
* **Autenticação e Autorização (Keycloak & JWT):**
  * Integração com Keycloak via OpenID Connect (JWT Bearer).
  * Controle de acesso baseado em Roles (`Admin`, `Caixa`, `Garcom`).
  * Endpoint customizado `POST /api/auth/login` que realiza o login e retorna o JWT Bearer Token.
* **Gestão de Usuários e Privacidade de Dados por Role:**
  * Cadastro no Keycloak (login, senha e role) e persistência de dados de negócio no SQL Server.
  * Suporte a diárias diferenciadas: `DailyRate` (dia de semana) e `DailyRateWkend` (fim de semana).
  * **Privacidade Granular:** Usuários com a role `Caixa` podem listar os funcionários (`GET /api/users`), mas **não têm acesso aos valores das diárias** (`DailyRate` e `DailyRateWkend` são omitidos da resposta via DTO).
* **Gestão de Diárias e Turnos (`Dailies`):**
  * Registro de diárias trabalhadas vinculadas a funcionários (`Daily`).
  * **Cálculo Automático de Valor:** O backend detecta se o dia trabalhado é fim de semana (Sábado/Domingo) e aplica automaticamente `DailyRateWkend`, ou `DailyRate` para dias de semana.
  * Visualização por Período (Semanal e Mensal) com agrupamento de dias.
  * Controle de pagamento de diárias (`PATCH /api/dailies/{id}/pay`).
* **Entity Framework Core Avançado:** Mapeamento Code-First, precisão decimal `(10, 2)` e migrações via CLI (`dotnet ef`).
* **Mensageria com RabbitMQ:** `BackgroundService` consumidor de mensagens para cadastro assíncrono.
* **Documentação com Swagger:** Documentação interativa com botão **Authorize** para envio do Bearer Token.

---

## 🏗️ Estrutura do Monorepo

```text
burger-house-tools/
├── burger-house-tools-api/       # Backend (.NET 10 Web API)
│   ├── Controllers/              # UsersController, DailiesController, AuthController
│   ├── Models/                   # Entidades de domínio (User, Daily, Enums)
│   ├── DTOs/                     # DTOs de entrada e saída
│   ├── Data/                     # AppDbContext e Migrations
│   ├── Services/                 # KeycloakService e UserConsumer (RabbitMQ)
│   └── Program.cs                # Ponto de entrada, JWT e Swagger
│
├── burger-house-tools-web/       # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/           # Navbar, ProtectedRoute, Modais
│   │   ├── contexts/             # AuthContext (Keycloak JWT, estado de login)
│   │   ├── pages/                # LoginPage, DailiesPage, UsersPage
│   │   ├── services/             # api.ts (Axios), authService, dailyService, userService
│   │   └── types/                # Definições TypeScript (User, Daily, Auth)
│   ├── vite.config.ts            # Configuração do Vite e Proxy para o Backend
│   └── package.json
│
├── keycloak/                     # Arquivos do Keycloak (realm-export.json)
├── docker-compose.yml            # Infraestrutura (SQL Server + RabbitMQ + Keycloak)
├── package.json                  # Scripts de conveniência do monorepo
└── README.md
```

---

## 🚀 Como Executar o Projeto Completo

### 1. Subir a Infraestrutura (Docker)
Na raiz do repositório:
```bash
npm run docker:up
# ou: docker compose up -d
```

### 2. Aplicar as Migrações do Banco
```bash
dotnet ef database update --project burger-house-tools-api
```

### 3. Iniciar o Backend (.NET Web API)
Em um terminal:
```bash
npm run dev:api
# ou: dotnet run --project burger-house-tools-api
```
> O backend rodará em `http://localhost:5016` (Swagger em `http://localhost:5016/swagger`).

### 4. Iniciar o Frontend (React)
Em outro terminal:
```bash
npm run dev:web
# ou: cd burger-house-tools-web && npm run dev
```
> Acesse o frontend no navegador em: **`http://localhost:3000`**.

---

### 🔑 Usuários Pré-configurados para Login

| Usuário | Senha | Role | Acesso no Frontend |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | `Admin` | Acesso total: cadastra funcionários, vê valores de diárias, baixa pagamentos e painel financeiro |
| **`caixa`** | `caixa123` | `Caixa` | Cadastra diárias e consulta a escala da equipe (valores e totais financeiros ocultos) |
| **`garcom`** | `garcom123` | `Garcom` | Consulta apenas a lista de funcionários |
