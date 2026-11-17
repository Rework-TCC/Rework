# 🚀 REWORK

<div align="center">

<img src="frontend/assets/rework-symbol.svg" alt="Símbolo REWORK" width="110">

### Sistema web para centralizar, rastrear e acompanhar ocorrências de retrabalho no setor eletroeletrônico.

[![Status](https://img.shields.io/badge/status-online-brightgreen?style=for-the-badge)](https://rework-virid.vercel.app)
[![GitHub Stars](https://img.shields.io/github/stars/Rework-TCC/Rework?style=for-the-badge)](https://github.com/Rework-TCC/Rework/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/Rework-TCC/Rework?style=for-the-badge)](https://github.com/Rework-TCC/Rework/network/members)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

[🌐 Demo ao Vivo](https://rework-virid.vercel.app) ·
[🐞 Reportar Bug](https://github.com/Rework-TCC/Rework/issues) ·
[✨ Solicitar Feature](https://github.com/Rework-TCC/Rework/issues)

</div>

---

## 📋 Sobre o Projeto

O **REWORK** é um sistema web desenvolvido para apoiar o monitoramento, a rastreabilidade e o acompanhamento de retrabalhos no setor eletroeletrônico.

A aplicação centraliza informações que podem estar distribuídas entre diferentes controles e setores, permitindo acompanhar uma ocorrência desde o registro inicial até a definição do método de retrabalho, classificação de seriais, atualização de custos e consulta de indicadores.

O projeto foi desenvolvido como Trabalho de Conclusão de Curso de **Sistemas de Informação**.

### ✨ Principais Funcionalidades

- 🎯 **Gestão de ocorrências** — cadastro, consulta, edição e acompanhamento de retrabalhos.
- 🔎 **Rastreabilidade de seriais** — classificação e controle de itens como OK ou NG.
- 👥 **Controle de acesso por perfil** — permissões específicas para Administrador, Qualidade, Engenharia, Expedição e Produção.
- 🔒 **Autenticação** — login com sessão e senhas armazenadas por hash com bcrypt.
- 🧰 **Método de retrabalho** — registro do método definido pela Engenharia e suporte a arquivo relacionado.
- 💰 **Controle de custos** — registro de valores associados às ocorrências pela Expedição.
- 📊 **Dashboard e relatórios** — acompanhamento de ocorrências, filtros e indicadores.
- 📝 **Solicitação de acesso** — fluxo de solicitação, aprovação e rejeição pelo Administrador.

---

## 🎬 Demonstração

### 🔐 Acesso ao sistema

<div align="center">

<img src="docs/evidencias/login-rework-referencia.png" alt="Tela de login do REWORK" width="85%">

</div>

A tela inicial permite a autenticação dos usuários e disponibiliza o acesso às funcionalidades de acordo com o perfil cadastrado.

### 🌐 Acesso online

A versão publicada do sistema está disponível em:

### **[Acessar o REWORK](https://rework-virid.vercel.app)**

---

## 🛠️ Tecnologias Utilizadas

### Frontend

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

### Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

### Segurança e autenticação

- **express-session** para gerenciamento de sessão.
- **bcryptjs** para hash e validação de senhas.
- Middleware de autenticação e autorização por perfil.

### Ferramentas e infraestrutura

![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

- MySQL Workbench
- TiDB Cloud em modo compatível com MySQL
- UML para modelagem
- Trello para organização das atividades

---

## 🏗️ Arquitetura

O sistema foi organizado em três camadas principais:

```text
Usuário
   ↓
Frontend
HTML + CSS + JavaScript
   ↓
API / Backend
Node.js + Express
   ↓
Banco de dados
MySQL compatível
```

O **frontend** apresenta as telas e realiza as interações com o usuário.

O **backend** recebe as requisições, aplica regras de negócio, verifica autenticação e permissões e se comunica com o banco de dados.

O **banco de dados** mantém a persistência das informações do sistema.

---

## 👥 Perfis de Acesso

O REWORK utiliza diferentes perfis para separar as responsabilidades dentro do processo de retrabalho.

| Perfil | Responsabilidade principal |
| --- | --- |
| **Administrador** | Gerenciar usuários e analisar solicitações de acesso |
| **Qualidade** | Criar, editar e acompanhar ocorrências e classificar seriais |
| **Engenharia** | Registrar o método de retrabalho |
| **Expedição** | Registrar os custos relacionados às ocorrências |
| **Produção** | Consultar o dashboard e acompanhar as ocorrências |

As permissões também são verificadas no backend, não apenas pela interface.

---

## 🔄 Fluxo do Sistema

O fluxo principal do REWORK acompanha as responsabilidades de cada setor:

```text
Qualidade registra a ocorrência
           ↓
Engenharia define o método
           ↓
Qualidade classifica os seriais
           ↓
Expedição atualiza os custos
           ↓
Dashboard e relatórios consolidam os dados
```

Dessa forma, os diferentes setores trabalham sobre a mesma ocorrência, mantendo as informações centralizadas e rastreáveis.

---

## 🚀 Começando

### 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) 18 ou superior
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)
- MySQL ou outro banco compatível com MySQL

### 💻 Instalação

1. **Clone o repositório**

```bash
git clone https://github.com/Rework-TCC/Rework.git
```

2. **Acesse a pasta do backend**

```bash
cd Rework/backend
```

3. **Instale as dependências**

```bash
npm install
```

4. **Configure as variáveis de ambiente**

Crie um arquivo `.env` dentro da pasta `backend`:

```env
DB_HOST=seu_host
DB_PORT=sua_porta
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=rework

SESSION_SECRET=sua_chave_de_sessao

PORT=3000
```

> ⚠️ O arquivo `.env` contém informações sensíveis e não deve ser enviado ao GitHub.

5. **Execute o projeto**

```bash
npm start
```

Para desenvolvimento:

```bash
npm run dev
```

6. **Acesse no navegador**

```text
http://localhost:3000
```

---

## 📖 Como Usar

### 1. Autenticação

O usuário realiza o login com e-mail e senha.

O backend consulta o usuário no banco e utiliza o `bcryptjs` para comparar a senha informada com o hash armazenado.

```text
Login
  ↓
Busca do usuário no banco
  ↓
Validação da senha
  ↓
Verificação do perfil
  ↓
Criação da sessão
  ↓
Acesso ao sistema
```

### 2. Cadastro de ocorrência

O perfil **Qualidade** pode registrar uma ocorrência informando dados como:

- linha de produção;
- modelo;
- defeito;
- descrição do problema;
- faixa de seriais;
- quantidade bloqueada;
- containers envolvidos.

### 3. Método de retrabalho

O perfil **Engenharia** acessa a ocorrência e registra o método que deverá ser utilizado no retrabalho.

### 4. Classificação dos seriais

O perfil **Qualidade** pode registrar e classificar os seriais como:

```text
OK
NG
```

### 5. Custos

O perfil **Expedição** registra os custos associados à ocorrência.

### 6. Acompanhamento

As informações são disponibilizadas no dashboard, nas consultas e nos relatórios do sistema.

---

## 🗂️ Estrutura de Pastas

```text
📦 Rework
│
├── 📁 backend/
│   │
│   ├── 📁 public/
│   │   └── Arquivos utilizados no deploy
│   │
│   ├── 📁 src/
│   │   ├── 📁 config/
│   │   │   └── Configurações da aplicação e banco
│   │   │
│   │   ├── 📁 controllers/
│   │   │   └── Regras e operações do sistema
│   │   │
│   │   ├── 📁 middlewares/
│   │   │   └── Autenticação, autorização e uploads
│   │   │
│   │   ├── 📁 models/
│   │   │   └── Camada de modelos
│   │   │
│   │   ├── 📁 routes/
│   │   │   └── Rotas da API
│   │   │
│   │   ├── 📄 app.js
│   │   └── 📄 server.js
│   │
│   ├── 📁 uploads/
│   └── 📄 package.json
│
├── 📁 frontend/
│   ├── 📁 assets/
│   ├── 📄 app.js
│   ├── 📄 styles.css
│   ├── 📄 index.html
│   ├── 📄 dashboard.html
│   ├── 📄 ocorrencias.html
│   ├── 📄 nova-ocorrencia.html
│   ├── 📄 detalhes-ocorrencia.html
│   ├── 📄 seriais.html
│   ├── 📄 metodo-retrabalho.html
│   ├── 📄 relatorios.html
│   └── ...
│
├── 📁 database/
│   └── 📄 schema.sql
│
├── 📁 docs/
│   ├── 📁 evidencias/
│   └── 📄 GUIA-DO-PROJETO.md
│
├── 📁 tests/
│   ├── 📄 frontend-accessibility.cjs
│   ├── 📄 frontend-identity.cjs
│   └── 📄 frontend-usability.cjs
│
└── 📄 README.md
```

---

## 🗄️ Banco de Dados

O REWORK utiliza banco de dados relacional compatível com MySQL.

Entre as principais tabelas estão:

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

Os relacionamentos entre as tabelas são mantidos por meio de chaves estrangeiras, contribuindo para a integridade das informações.

---

## 🔌 Principais Endpoints da API

### Autenticação

```text
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/change-password
POST   /api/auth/logout
```

### Solicitações de acesso

```text
POST   /api/access-requests
GET    /api/access-requests
GET    /api/access-requests/pending
POST   /api/access-requests/:id/approve
POST   /api/access-requests/:id/reject
```

### Usuários

```text
GET    /api/users
PATCH  /api/users/:id/profile
PATCH  /api/users/:id/status
```

### Ocorrências

```text
GET    /api/occurrences
POST   /api/occurrences
GET    /api/occurrences/:protocolo
PUT    /api/occurrences/:protocolo
DELETE /api/occurrences/:protocolo
```

### Custos

```text
PATCH /api/occurrences/:protocolo/costs
```

### Métodos de retrabalho

```text
POST   /api/occurrences/:protocolo/method
DELETE /api/occurrences/:protocolo/method/file
```

### Seriais

```text
POST   /api/occurrences/:protocolo/scans
DELETE /api/occurrences/:protocolo/scans/:serial
```

---

## 🔐 Segurança

O sistema possui mecanismos de autenticação e autorização no backend.

### Senhas

As senhas não são armazenadas em texto puro.

O sistema utiliza:

```text
bcryptjs
```

para geração e comparação dos hashes.

### Sessões

A autenticação utiliza:

```text
express-session
```

Após o login, a sessão armazena informações necessárias para identificar o usuário autenticado.

### Controle de acesso

As rotas protegidas verificam:

```text
Usuário autenticado?
        ↓
Senha regularizada?
        ↓
Perfil possui permissão?
        ↓
Operação autorizada
```

Assim, a segurança não depende apenas de ocultar elementos da interface.

### Variáveis de ambiente

Credenciais do banco e chaves de sessão devem permanecer em variáveis de ambiente.

O arquivo:

```text
.env
```

está configurado para não ser versionado pelo Git.

---

## 🧪 Testes

O repositório possui scripts relacionados a testes do frontend:

```text
tests/frontend-accessibility.cjs
tests/frontend-identity.cjs
tests/frontend-usability.cjs
```

Os testes incluem verificações relacionadas a:

- acessibilidade;
- identidade visual;
- comportamento da interface;
- responsividade;
- usabilidade.

Os testes de acessibilidade utilizam **axe-core**, juntamente com automação baseada em Playwright.

Exemplos de execução:

```bash
node tests/frontend-accessibility.cjs
```

```bash
node tests/frontend-identity.cjs
```

```bash
node tests/frontend-usability.cjs
```

> Atualmente esses testes não estão configurados como um script `npm test` no `backend/package.json`.

---

## ☁️ Deploy

A aplicação está publicada utilizando:

- **Vercel** para disponibilização do sistema;
- **TiDB Cloud**, em modo compatível com MySQL, para persistência online dos dados.

A versão em produção está disponível em:

### **[https://rework-virid.vercel.app](https://rework-virid.vercel.app)**

---

## 🤝 Contribuindo

Contribuições são bem-vindas.

1. Faça um Fork do projeto.

2. Crie uma branch:

```bash
git checkout -b feature/minha-feature
```

3. Faça suas alterações.

4. Faça o commit:

```bash
git commit -m "adiciona minha feature"
```

5. Envie a branch:

```bash
git push origin feature/minha-feature
```

6. Abra um Pull Request.

---

## 📄 Licença

O `backend/package.json` declara atualmente a licença **ISC**.

O repositório ainda não possui um arquivo `LICENSE` na raiz.

---

## 👩‍💻 Autores

**Laura Beatriz Rocha de Aguiar**  
**Igor Bennet**

Projeto acadêmico desenvolvido no curso de **Sistemas de Informação**.

---

## 🙏 Agradecimentos

A todos que contribuíram com o desenvolvimento, avaliação e evolução do projeto REWORK.

---

<div align="center">

### ⭐ Se este projeto foi útil, considere dar uma estrela!

**REWORK — mais organização, rastreabilidade e apoio à decisão no retrabalho.**

</div>
