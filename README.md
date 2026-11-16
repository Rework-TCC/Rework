# REWORK

Sistema web para monitoramento, rastreabilidade e acompanhamento de retrabalhos no setor eletroeletrônico.

O REWORK centraliza informações relacionadas às ocorrências de retrabalho, permitindo que diferentes setores acompanhem o mesmo processo de acordo com suas responsabilidades. O sistema reúne dados como linha de produção, modelo, defeito, quantidades, seriais, containers, método de retrabalho, custos e status da ocorrência.

Projeto desenvolvido como Trabalho de Conclusão de Curso de Sistemas de Informação.

---

## Tecnologias

### Front-end
- HTML5
- CSS3
- JavaScript

### Back-end
- Node.js
- Express

### Banco de dados
- MySQL
- `mysql2/promise`

### Segurança e autenticação
- `express-session`
- `bcryptjs`
- Controle de acesso por perfil

### Outras ferramentas
- Git e GitHub
- UML
- Trello
- MySQL Workbench

---

## Arquitetura

O sistema foi estruturado em três partes principais:

```text
Usuário
   ↓
Front-end
HTML + CSS + JavaScript
   ↓
API
Node.js + Express
   ↓
Banco de dados
MySQL
```

O front-end é responsável pela interface e interação com o usuário.

O back-end recebe as requisições da interface, verifica autenticação e permissões, executa as regras de negócio e realiza a comunicação com o banco de dados.

O MySQL é responsável pela persistência das informações do sistema.

---

## Perfis de acesso

O REWORK utiliza controle de acesso baseado em perfis.

**Administrador**

Responsável pela administração dos usuários e solicitações de acesso. Pode aprovar ou rejeitar solicitações, alterar perfis e ativar ou desativar usuários.

**Qualidade**

Responsável pelo cadastro e acompanhamento das ocorrências de retrabalho, além da classificação de seriais como OK ou NG.

**Engenharia**

Responsável pelo registro do método de retrabalho e dos arquivos relacionados ao método.

**Expedição**

Responsável pelo registro das informações de custos relacionadas às ocorrências.

**Produção**

Possui acesso ao dashboard público para acompanhamento das ocorrências.

As permissões são verificadas também pelo back-end, não apenas pela interface.

---

## Principais funcionalidades

- Autenticação de usuários.
- Controle de acesso por perfil.
- Solicitação de acesso ao sistema.
- Aprovação e rejeição de solicitações pelo Administrador.
- Gestão de usuários.
- Cadastro de ocorrências de retrabalho.
- Consulta e acompanhamento de ocorrências.
- Registro de linha, modelo, defeito e descrição do problema.
- Registro de containers e quantidades.
- Controle de seriais classificados como OK ou NG.
- Registro do método de retrabalho.
- Upload de arquivo relacionado ao método.
- Registro de custos pela Expedição.
- Dashboard para acompanhamento das ocorrências.
- Filtros e relatórios.
- Controle de status das ocorrências.

---

## Estrutura do projeto

```text
Rework/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── uploads/
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── ...
│
├── database/
│   └── schema.sql
│
├── docs/
│
└── README.md
```

---

## Banco de dados

O projeto utiliza banco de dados relacional MySQL.

Entre as principais entidades estão:

```text
perfil
usuario
solicitacao_acesso
linha_producao
modelo_produto
ocorrencia_retrabalho
metodo_retrabalho
container
inspecao_serial
historico_ocorrencia
apontamento_retrabalho
```

Os relacionamentos são mantidos por meio de chaves estrangeiras para preservar a integridade dos dados.

---

## Configuração

### Requisitos

- Node.js 18 ou superior
- npm
- MySQL ou banco compatível com MySQL

Clone o repositório:

```bash
git clone https://github.com/Rework-TCC/Rework.git
```

Entre na pasta do backend:

```bash
cd Rework/backend
```

Instale as dependências:

```bash
npm install
```

---

## Variáveis de ambiente

Crie um arquivo `.env` dentro da pasta `backend`.

Exemplo:

```env
DB_HOST=seu_host
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=rework

SESSION_SECRET=sua_chave_de_sessao

PORT=3000
```

> O arquivo `.env` contém informações sensíveis e não deve ser enviado para o GitHub.

---

## Executando o projeto

Dentro da pasta `backend`, execute:

```bash
npm start
```

O servidor será iniciado, por padrão, em:

```text
http://localhost:3000
```

Para desenvolvimento:

```bash
npm run dev
```

---

## API

Alguns dos principais endpoints utilizados pelo sistema são:

```text
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

POST   /api/access-requests

GET    /api/occurrences
POST   /api/occurrences
GET    /api/occurrences/:protocolo
PUT    /api/occurrences/:protocolo
DELETE /api/occurrences/:protocolo

PATCH  /api/occurrences/:protocolo/costs
POST   /api/occurrences/:protocolo/method
POST   /api/occurrences/:protocolo/scans

GET    /api/users
```

As rotas protegidas verificam a autenticação e o perfil do usuário antes de executar a operação.

---

## Autenticação e segurança

As senhas não são armazenadas em texto puro.

O sistema utiliza `bcryptjs` para geração e comparação dos hashes das senhas.

Após uma autenticação válida, uma sessão é criada utilizando `express-session`.

Exemplo do fluxo:

```text
Login
  ↓
Busca do usuário no banco
  ↓
Comparação da senha com bcrypt
  ↓
Verificação do perfil
  ↓
Criação da sessão
  ↓
Acesso às funcionalidades permitidas
```

---

## Status do projeto

O REWORK possui atualmente integração entre:

```text
Front-end
   ↕
Node.js + Express
   ↕
MySQL
```

O sistema já possui autenticação, controle de usuários, solicitações de acesso, persistência das ocorrências e separação das funcionalidades por perfil.

A disponibilização completa do sistema em ambiente online está em processo de configuração.

---

## Objetivo

O objetivo do REWORK é centralizar, rastrear e monitorar ocorrências de retrabalho, utilizando informações relacionadas a quantidade, tempo e custos para apoiar o acompanhamento, a priorização e a tomada de decisão.

---

## Autores

Projeto desenvolvido por:

**Laura Beatriz Rocha de Aguiar**  
**Igor Bennet**

Curso de Sistemas de Informação.
