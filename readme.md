# 🍔 Burger House Tools API

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)]()
[![Keycloak](https://img.shields.io/badge/Keycloak-003545?style=for-the-badge&logo=keycloak&logoColor=white)]()
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)]()
[![SQL Server](https://img.shields.io/badge/SQL_Server-CC2927?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)]()

Este projeto foi desenvolvido para botar em prática aprendizados de backend. O objetivo principal é construir uma API robusta em ASP.NET Core, orquestrando banco de dados, mensageria e autenticação/autorização com Keycloak via Docker, aplicando boas práticas de arquitetura e código limpo.

---

## 🎯 O que foi implementado

* **Orquestração com Docker Compose:** Execução simultânea do **SQL Server**, **RabbitMQ** e **Keycloak** com importação automática do Realm.
* **Autenticação e Autorização (Keycloak & JWT):**
  * Integração com Keycloak via OpenID Connect (JWT Bearer).
  * Controle de acesso baseado em Roles (`Admin`, `Caixa`, `Garcom`).
  * Endpoint customizado `POST /api/auth/login` que realiza o login e retorna o JWT Bearer Token.
* **Gestão de Usuários e Privacidade de Dados por Role:**
  * Criação integrada: ao cadastrar um usuário (apenas `Admin`), ele é registrado no Keycloak (login, senha e role) e os dados de negócio são persistidos no SQL Server.
  * Suporte a diárias diferenciadas: `DailyRate` (dia de semana) e `DailyRateWkend` (fim de semana).
  * **Privacidade Granular:** Usuários com a role `Caixa` podem listar os funcionários (`GET /api/users`), mas **não têm acesso aos valores das diárias** (`DailyRate` e `DailyRateWkend` são omitidos da resposta via DTO).
* **Gestão de Diárias e Turnos (`Dailies`):**
  * Registro de diárias trabalhadas vinculadas a funcionários (`Daily`).
  * **Cálculo Automático de Valor:** O backend detecta se o dia trabalhado é fim de semana (Sábado/Domingo) e aplica automaticamente `DailyRateWkend`, ou `DailyRate` para dias de semana.
  * O `Caixa` pode registrar e visualizar os turnos trabalhados **sem ter acesso ou precisar informar valores financeiros**.
  * **Visualização por Período (Semanal e Mensal):** Grade completa de dias com as diárias registradas em cada dia.
  * **Painel Financeiro (Apenas Admin):** Totalizador do período com `totalValue`, `totalPaid` e `totalPending`.
  * Controle de pagamento de diárias (`PATCH /api/dailies/{id}/pay`).
* **Entity Framework Core Avançado:** 
  * Mapeamento Code-First, precisão decimal `(10, 2)` e execução de Migrations via CLI (`dotnet ef`).
* **Mensageria com RabbitMQ:** 
  * `BackgroundService` consumidor de mensagens para cadastro assíncrono de novos usuários.
* **Documentação com Swagger:**
  * Documentação interativa com botão **Authorize** para envio do Bearer Token.

---

## 🏗️ Estrutura do Projeto

```text
burger-house-tools-api/
├── Controllers/
│   ├── AuthController.cs          # Autenticação e geração de token via Keycloak
│   ├── UsersController.cs         # Gerenciamento de usuários e controle de visibilidade
│   └── DailiesController.cs       # Gestão de diárias, escalas semanal/mensal e pagamentos
├── Models/
│   ├── User.cs                    # Entidade de usuário (com DailyRate e DailyRateWkend)
│   ├── Daily.cs                   # Entidade de diária/turno trabalhado
│   └── Enums/UserRole.cs          # Enumerações de cargos (Admin, Caixa, Garcom)
├── DTOs/
│   ├── UserInputDto.cs            # Entrada para cadastro/atualização de usuário
│   ├── UserResponseDto.cs         # Retorno seguro de usuário (omite senha e diárias para Caixa)
│   ├── DailyInputDto.cs           # Entrada para registro de diária
│   ├── DailyResponseDto.cs        # Retorno de diária (omite valor para Caixa)
│   ├── DailyPeriodResponseDto.cs  # Resposta estruturada para visão semanal/mensal
│   ├── LoginInputDto.cs           # Credenciais de login
│   └── LoginResponseDto.cs        # Tokens JWT retornados pelo Keycloak
├── Data/
│   ├── AppDbContext.cs            # Contexto do EF Core e mapeamentos relacionais
│   └── Migrations/                # Histórico de migrações do banco de dados
├── Services/
│   ├── KeycloakService.cs         # Comunicação HTTP com a API Admin do Keycloak
│   └── UserConsumer.cs            # Consumidor de fila RabbitMQ (BackgroundService)
├── keycloak/
│   └── realm-export.json          # Realm pré-configurado do Keycloak
├── Program.cs                     # Injeção de dependências, JWT e Swagger
└── docker-compose.yml             # Infraestrutura (SQL Server + RabbitMQ + Keycloak)
```

---

## 🚀 Como Executar e Testar a Partir de Agora

### 1. Pré-requisitos
* **.NET SDK** instalado (versão 10.0 ou superior)
* **Docker Desktop** instalado e em execução

### 2. Subir os Serviços (Infraestrutura)
Na raiz do repositório, inicie os containers via Docker Compose:

```bash
docker compose up -d
```

> Isso inicializará automaticamente:
> * **SQL Server** na porta `1433`
> * **RabbitMQ** nas portas `5672` (AMQP) e `15672` (Painel Web)
> * **Keycloak** na porta `8080` com o Realm `burger-house`, clients e usuários de teste já importados!

### 3. Aplicar as Migrações do Banco de Dados
Ainda na raiz ou dentro da pasta do projeto da API, execute:

```bash
dotnet ef database update --project burger-house-tools-api
```

---

### 4. Usuários de Teste Pré-configurados

O Keycloak já nasce com os seguintes usuários prontos para teste:

| Usuário | Senha | Role | Permissões na API |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | `Admin` | Acesso total: gerencia usuários, visualiza todas as diárias, valores e relatórios financeiros |
| **`caixa`** | `caixa123` | `Caixa` | Consulta usuários (sem diárias) e cadastra/consulta diárias (sem valores financeiros) |
| **`garcom`** | `garcom123` | `Garcom` | Apenas consulta básica de usuários |

---

### 5. Testando pelo Swagger

1. **Inicie a API:**
   * Pelo Visual Studio (pressione `F5`), ou pelo terminal:
     ```bash
     dotnet run --project burger-house-tools-api
     ```
2. **Abra o Swagger no navegador:**
   * Acesse `https://localhost:7176/swagger` (ou a porta HTTP `http://localhost:5016/swagger`).

3. **Obter o Token de Acesso:**
   * Abra o endpoint `POST /api/auth/login`.
   * Faça login com **`admin`** (`admin123`) ou **`caixa`** (`caixa123`).
   * Copie o valor do **`access_token`**.

4. **Autenticar o Swagger:**
   * Clique no botão verde **`Authorize`** 🔒 no topo direito.
   * Cole o token no campo **`Value:`** (apenas o token puro, sem prefixo `Bearer`).
   * Clique em **Authorize** e depois em **Close**.

---

### 6. Endpoints Principais

#### 👤 Usuários (`/api/users`)
* `GET /api/users` → Lista todos os usuários.
  * Para **`Admin`**: retorna dados completos, incluindo `dailyRate` e `dailyRateWkend`.
  * Para **`Caixa`**: retorna nome, login, cargo e pix, ocultando campos financeiros.
* `POST /api/users` → Cadastra usuário no Keycloak e no banco local (apenas `Admin`).
* `PUT /api/users/{id}` → Atualiza dados do usuário (apenas `Admin`).
* `DELETE /api/users/{id}` → Remove usuário (apenas `Admin`).

#### 📅 Diárias e Escalas (`/api/dailies`)
* `POST /api/dailies` → Registra um dia trabalhado (`Admin` e `Caixa`):
  ```json
  {
    "userId": 2,
    "date": "2026-11-03",
    "paid": false,
    "notes": "Turno da noite"
  }
  ```
  *(O valor da diária é atribuído automaticamente pelo sistema com base no dia ser semana ou final de semana)*.
* `GET /api/dailies/weekly?date=2026-11-03` → Visão semanal em grade:
  * Agrupa os 7 dias da semana (Segunda a Domingo).
  * Exibe quem trabalhou em cada dia.
  * Para o `Admin`, inclui `dayTotal`, `totalValue`, `totalPaid` e `totalPending`.
  * Para o `Caixa`, exibe a escala sem informações financeiras.
* `GET /api/dailies/monthly?year=2026&month=11` → Visão mensal completa.
* `PATCH /api/dailies/{id}/pay?paid=true` → Altera o status de pagamento da diária (apenas `Admin`).
* `DELETE /api/dailies/{id}` → Exclui registro de diária (apenas `Admin`).

---

## 🐰 Como acessar o Painel do RabbitMQ

1. Acesse: [http://localhost:15672](http://localhost:15672)
2. Credenciais:
   * **Usuário:** `guest`
   * **Senha:** `guest`
3. Aba **Queues** → selecione a fila `new_user_queue`.
4. Em **Publish message**, envie mensagens para cadastro assíncrono.

---

## 🔐 Como acessar o Console Administrativo do Keycloak

1. Acesse: [http://localhost:8080](http://localhost:8080)
2. Credenciais do Administrador do Keycloak:
   * **Usuário:** `admin`
   * **Senha:** `admin`
3. Selecione o realm **`burger-house`** no canto superior esquerdo para visualizar roles, clients e usuários cadastrados.
