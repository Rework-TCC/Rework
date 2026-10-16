const STORE = "rework-prototype-v3";
const LEGACY_STORE = "rework-prototype-v2";
let storageReadFailed = false;

// Feedback persistente na tela e proteção dos formulários ainda não salvos.
const formSnapshots = new WeakMap();
function handleBeforeUnload(event) {
  if (!pendingForms().length) return;

  event.preventDefault();
  event.returnValue = "";
}
const formSignature = (form) => JSON.stringify([...new FormData(form)].map(([key, value]) =>
  [key, value instanceof File ? (value.name ? [value.name, value.size, value.lastModified] : null) : value]));
const markClean = (form) => formSnapshots.set(form, formSignature(form));
const isDirty = (form) => formSnapshots.has(form) && formSignature(form) !== formSnapshots.get(form);
const pendingForms = () =>
  [...document.querySelectorAll("form[data-protect]")].filter(isDirty);
const uiText = (pt, en) => preferenceLanguage() === "en" ? en : pt;

function feedback(message, error = false, target) {
  let host = target || document.querySelector("#pageFeedback");
  if (!host) {
    host = document.createElement("div");
    host.id = "pageFeedback";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.querySelector("main").prepend(host);
  }
  host.className = `status-message feedback-box ${error ? "error" : "success"}`;
  host.textContent = message;
}

function fieldError(field, message, host) {
  feedback(message, true, host);
  field.setAttribute("aria-invalid", "true");
  if (field.id) {
    const errorId = `${field.id}-error`;
    let error = document.getElementById(errorId);
    if (!error) {
      error = document.createElement("small");
      error.id = errorId;
      error.className = "field-error";
      const group = field.closest(".field");
      if (group) group.append(error);
      else field.after(error);
    }
    error.textContent = message;
    const descriptions = new Set((field.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
    descriptions.add(errorId);
    field.setAttribute("aria-describedby", [...descriptions].join(" "));
  }
  field.focus();
  return false;
}

function confirmDiscard(form) {
  return !(form ? isDirty(form) : pendingForms().length) || window.confirm(uiText(
    "Há alterações não salvas. Deseja descartá-las e continuar?",
    "You have unsaved changes. Discard them and continue?"));
}

function closeEditor(dialog, form) {
  if (!confirmDiscard(form)) return;
  form.reset();
  markClean(form);
  dialog.close();
}

function navigateWithFeedback(url, message) {
  try { sessionStorage.setItem("rework-feedback", message); } catch { /* A navegação continua disponível. */ }
  location.href = url;
}

function initFormGuidance() {
  document.querySelectorAll("#newOccurrence, #editOccurrenceForm, #methodForm, #userForm, #scanForm").forEach((form) => {
    form.dataset.protect = "true";
    markClean(form);
  });
  document.addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid");
    const error = document.getElementById(`${event.target.id}-error`);
    if (error) error.textContent = "";
  });
  document.querySelectorAll(".field").forEach((group, index) => {
    const field = group.querySelector("input, select, textarea");
    const hint = group.querySelector("small");
    if (field && hint) {
      hint.id ||= `fieldHint${index}`;
      field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), hint.id].filter(Boolean).join(" "));
    }
  });
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || link.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const destination = new URL(link.href, location.href);
    if (destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
    if (!confirmDiscard()) { event.preventDefault(); event.stopPropagation(); }
    else pendingForms().forEach(markClean);
  }, true);
  window.addEventListener("beforeunload", handleBeforeUnload);
  document.querySelectorAll(".table-wrap").forEach((wrap) => {
    const table = wrap.querySelector("table");
    if (table) {
      const caption = table.caption || table.createCaption();
      caption.className = "sr-only";
      caption.textContent ||= wrap.closest("section, article")?.querySelector("h2")?.textContent || document.querySelector("h1")?.textContent || "Dados";
      table.querySelectorAll("thead th").forEach(th => th.scope = "col");
      wrap.setAttribute("aria-label", caption.textContent);
    }
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "region");
    const hint = document.createElement("p");
    hint.className = "muted table-scroll-hint no-print";
    hint.textContent = uiText("Há mais colunas à direita. Deslize a tabela ou use as setas com a tabela em foco.", "More columns are available to the right. Swipe the table or focus it and use arrow keys.");
    wrap.before(hint);
    const updateHint = () => { hint.hidden = wrap.scrollWidth <= wrap.clientWidth; };
    updateHint();
    window.addEventListener("resize", updateHint);
  });
  try {
    const message = sessionStorage.getItem("rework-feedback");
    if (message) { feedback(message); sessionStorage.removeItem("rework-feedback"); }
  } catch { /* O feedback local permanece disponível. */ }
}

function initContextHelp() {
  const page = location.pathname.split("/").pop();
  const topics = {
    "dashboard.html": "O painel mostra ocorrências pendentes e iniciadas. O progresso representa seriais inspecionados sobre a quantidade bloqueada. Os valores refletem o momento de abertura da página.",
    "ocorrencias.html": "Busque por ID, modelo, linha ou defeito. Qualidade edita o bloqueio e realiza bipagens; Engenharia define o método; Expedição informa os custos. Use Limpar filtros para voltar a todos os registros.",
    "nova-ocorrencia.html": "Uma ocorrência registra um bloqueio de produtos para retrabalho. Informe os dados na etapa 1 e distribua a quantidade nos containers na etapa 2. Categoria, departamento e responsável são campos livres. O método pode ser definido depois, antes da bipagem.",
    "detalhes-ocorrencia.html": "Confira a ocorrência identificada no topo. Use Containers para consultar os volumes e Método para consultar ou definir as instruções. A seção Próxima ação indica como continuar.",
    "containers.html": "As quantidades representam volumes vinculados a esta ocorrência. A bipagem é registrada para a ocorrência inteira, não individualmente para cada container.",
    "metodo-retrabalho.html": "Descreva a sequência de inspeção e retrabalho. O anexo é opcional e deve ter até 2 MB. Salvar libera a bipagem para a Qualidade. Remover um anexo é uma ação imediata, com confirmação.",
    "seriais.html": "Confira o método e a faixa antes de bipar. Enter registra OK; o botão NG registra um defeito. Seriais repetidos não são aceitos. Para corrigir uma leitura, exclua o registro com confirmação e bipe novamente.",
    "relatorios.html": "O período considera a data da ocorrência. Datas vazias não limitam o período. Gere novamente após mudar filtros; então exporte CSV ou use a impressão do navegador para salvar PDF.",
    "usuarios.html": "Os cartões descrevem as permissões fixas de cada perfil. Adicionar usuário simula a inclusão na lista desta página; não cria uma conta nem muda o perfil conectado.",
  };
  if (!topics[page] || !document.querySelector(".page-top")) return;
  const help = document.createElement("details");
  help.className = "context-help no-print";
  help.lang = "pt-BR";
  const priorityHelp = ["dashboard.html", "ocorrencias.html", "relatorios.html"].includes(page)
    ? " A prioridade é automática: com custo por hora informado, o custo acumulado define Alta a partir de R$ 5.000 e Média a partir de R$ 1.000. Sem custo informado, Alta corresponde a pelo menos 1.000 unidades ou 72 horas; Média, a 300 unidades ou 24 horas. Nos demais casos, é Baixa."
    : "";
  help.innerHTML = `<summary>Ajuda desta tela</summary><p>${topics[page]}${priorityHelp}</p><p>Pendente, Iniciado e Finalizado são os estados da ocorrência. O estado do método é informado separadamente. Use Tab e Shift+Tab para navegar; Escape fecha janelas de edição, com confirmação quando houver alterações.</p>`;
  document.querySelector(".page-top").after(help);
}

// Dados iniciais usados quando ainda não existem ocorrências salvas.
const seed = [
  {
    id: "RW-026",
    date: "02/09/2026",
    line: "VM02",
    part: "Inspeção final",
    defect: "Fricção",
    description: "Marcas de fricção identificadas na inspeção.",
    serialStart: "Y5UX3X3L006200",
    serialEnd: "Y5UX3X3L006899",
    blocked: 700,
    model: "UN50M75HAGXZD",
    area: "Qualidade",
    detected: 8,
    classification: "Processo",
    department: "Engenharia Mecânica",
    person: "Marina Costa",
    cause: "Possível desalinhamento do dispositivo.",
    method:
      "Limpar a área, inspecionar sob luz padrão e substituir a proteção quando houver marca.",
    status: "Iniciado",
    containerHourlyCost: 35,
    salesDelayHourlyCost: 120,
    containers: [
      { id: "CT-VM02-014", qty: 400 },
      { id: "CT-VM02-015", qty: 300 },
    ],
    scans: [
      { serial: "Y5UX3X3L006205", result: "OK", at: "02/09/2026 14:26" },
      { serial: "Y5UX3X3L006204", result: "NG", at: "02/09/2026 14:25" },
    ],
  },
  {
    id: "RW-025",
    date: "01/09/2026",
    line: "VM01",
    part: "Montagem",
    defect: "Folga",
    description: "Folga acima do padrão na tampa traseira.",
    serialStart: "A10000",
    serialEnd: "A10499",
    blocked: 500,
    model: "UN55CU8000",
    area: "Produção",
    detected: 4,
    classification: "Material",
    department: "Engenharia de Produto",
    person: "Carlos Lima",
    cause: "",
    method: "",
    status: "Pendente",
    containerHourlyCost: 25,
    salesDelayHourlyCost: 80,
    containers: [{ id: "CT-VM01-008", qty: 500 }],
    scans: [],
  },
  {
    id: "RW-024",
    date: "31/08/2026",
    line: "VM04",
    part: "Embalagem",
    defect: "Risco",
    description: "Sheet riscado durante movimentação.",
    serialStart: "B24001",
    serialEnd: "B24112",
    blocked: 112,
    model: "UN43T5300",
    area: "Logística",
    detected: 3,
    classification: "Manuseio",
    department: "Qualidade",
    person: "Ana Souza",
    cause: "Contato com guia lateral.",
    method:
      "Inspecionar superfície; limpar marcas leves e segregar peças com risco permanente.",
    status: "Finalizado",
    containerHourlyCost: 12,
    salesDelayHourlyCost: 40,
    containers: [{ id: "CT-VM04-003", qty: 112 }],
    scans: [{ serial: "B24001", result: "OK", at: "31/08/2026 15:10" }],
  },
];

// Leitura, migração e gravação dos dados locais do protótipo.
const cloneSeed = () => JSON.parse(JSON.stringify(seed));
const normalize = (data) =>
  data.map((occurrence) => ({
    ...occurrence,
    createdAt: occurrence.createdAt || `${toIsoDate(occurrence.date)}T00:00:00`,
    resolvedAt:
      occurrence.resolvedAt ||
      (occurrence.status === "Finalizado"
        ? `${toIsoDate(occurrence.date)}T23:59:59`
        : null),
    containerHourlyCost: Number(occurrence.containerHourlyCost || 0),
    salesDelayHourlyCost: Number(occurrence.salesDelayHourlyCost || 0),
  }));
const read = () => {
  try {
    const current = localStorage.getItem(STORE);
    const legacy = localStorage.getItem(LEGACY_STORE);
    if (current) {
      const data = JSON.parse(current);
      if (legacy && !localStorage.getItem("rework-v2-migrated")) {
        const previous = JSON.parse(legacy);
        data.forEach((occurrence) => {
          const oldOccurrence = previous.find(
            (item) => item.id === occurrence.id,
          );
          if (!oldOccurrence) return;
          ["method", "cause", "classification", "department", "person"].forEach(
            (key) => {
              if (!occurrence[key] && oldOccurrence[key])
                occurrence[key] = oldOccurrence[key];
            },
          );
        });
        localStorage.setItem(STORE, JSON.stringify(data));
        localStorage.setItem("rework-v2-migrated", "true");
      }
      return normalize(data);
    }
    if (legacy) {
      const migrated = JSON.parse(legacy);
      localStorage.setItem(STORE, JSON.stringify(migrated));
      return normalize(migrated);
    }
    return normalize(cloneSeed());
  } catch {
    storageReadFailed = true;
    feedback("Não foi possível ler os dados salvos. Os exemplos estão sendo exibidos; novas gravações foram suspensas para proteger seus registros. Tente recarregar a página.", true);
    return normalize(cloneSeed());
  }
};
const save = (data, target) => {
  try {
    if (storageReadFailed) throw new Error("Leitura indisponível");
    localStorage.setItem(STORE, JSON.stringify(data));
    return true;
  } catch {
    feedback(storageReadFailed
      ? "Não foi possível salvar porque os dados anteriores não puderam ser lidos. Recarregue a página e tente novamente."
      : "Não foi possível salvar neste navegador. Seus campos foram mantidos. Verifique o espaço disponível e, se houver anexo, tente um arquivo menor.", true, target);
    return false;
  }
};
// Funções auxiliares compartilhadas por todas as telas.
const selected = () =>
  new URLSearchParams(location.search).get("id") ||
  localStorage.getItem("rework-selected") ||
  "RW-026";
const choose = (id) => localStorage.setItem("rework-selected", id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
const num = (value) => Number(value || 0).toLocaleString("pt-BR");
const inspected = (occurrence) => occurrence.scans.length;
const defects = (occurrence) =>
  occurrence.scans.filter((scan) => scan.result === "NG").length;
const pending = (occurrence) =>
  Math.max(occurrence.blocked - inspected(occurrence), 0);
const flow = (occurrence) => (occurrence.method ? "Definido" : "Pendente");
const params = (id) => `?id=${encodeURIComponent(id)}`;
const toIsoDate = (date) => date.split("/").reverse().join("-");
const fromIsoDate = (date) => date.split("-").reverse().join("/");
const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const blockedHours = (occurrence) => {
  const end = occurrence.resolvedAt
    ? new Date(occurrence.resolvedAt).getTime()
    : Date.now();
  return Math.max(
    (end - new Date(occurrence.createdAt).getTime()) / 3600000,
    0,
  );
};
const hourlyCost = (occurrence) =>
  Number(occurrence.containerHourlyCost || 0) +
  Number(occurrence.salesDelayHourlyCost || 0);
const accumulatedCost = (occurrence) =>
  hourlyCost(occurrence) * blockedHours(occurrence);
const priority = (occurrence) => {
  const cost = accumulatedCost(occurrence);
  const hours = blockedHours(occurrence);
  if (hourlyCost(occurrence) > 0) {
    if (cost >= 5000) return { level: "high", label: "Alta", icon: "▲" };
    if (cost >= 1000) return { level: "medium", label: "Média", icon: "◆" };
    return { level: "low", label: "Baixa", icon: "●" };
  }
  if (occurrence.blocked >= 1000 || hours >= 72)
    return { level: "high", label: "Alta", icon: "▲" };
  if (occurrence.blocked >= 300 || hours >= 24)
    return { level: "medium", label: "Média", icon: "◆" };
  return { level: "low", label: "Baixa", icon: "●" };
};
const costPriorityCell = (occurrence) => {
  const itemPriority = priority(occurrence);
  const en = preferenceLanguage() === "en";
  const priorityLabels = { low: "Low", medium: "Medium", high: "High" };
  const value =
    hourlyCost(occurrence) > 0
      ? money(accumulatedCost(occurrence))
      : en
        ? "Cost not provided"
        : "Custo não informado";
  const hoursLabel = en ? "stopped" : "parado";
  const priorityLabel = en
    ? priorityLabels[itemPriority.level]
    : itemPriority.label;
  return `<div class="cost-priority"><strong>${value}</strong><small>${money(hourlyCost(occurrence))}/h · ${Math.floor(blockedHours(occurrence))}h ${hoursLabel}</small><span class="priority ${itemPriority.level}">${itemPriority.icon} ${priorityLabel}</span></div>`;
};

// Textos principais usados pela opção de idioma inglês.
const ENGLISH = {
  "CONTROLE · RASTREABILIDADE · RESULTADOS": "CONTROL · TRACEABILITY · RESULTS",
  "Mais controle": "More control",
  "para um amanhã": "for a more",
  "mais produtivo.": "productive tomorrow.",
  "Centralize ocorrências, acompanhe em tempo real,": "Centralize occurrences, monitor in real time,",
  "reduza perdas e aumente a eficiência da produção.": "reduce losses and improve production efficiency.",
  "Gestão de ocorrências": "Occurrence management",
  "Do registro ao fechamento": "From registration to closure",
  "Rastreabilidade de seriais": "Serial traceability",
  "Controle preciso e confiável": "Accurate and reliable tracking",
  "Relatórios inteligentes": "Intelligent reports",
  "Dados para decisão": "Data for decisions",
  "Integração entre áreas": "Cross-team collaboration",
  "Qualidade, Engenharia e Produção": "Quality, Engineering and Production",
  "Qualidade hoje,": "Quality today,",
  "produz confiança amanhã.": "builds trust tomorrow.",
  "Bem-vindo ao Rework": "Welcome to Rework",
  "Escolha seu perfil para acessar o sistema.": "Choose your profile to access the system.",
  "Acessar modo demonstração": "Open demonstration mode",
  "Produção: consulte o Dashboard sem preencher o formulário.": "Production: view the Dashboard without filling out the form.",
  "Protótipo acadêmico.": "Academic prototype.",
  "Use e-mail válido e senha fictícia (mínimo 4 caracteres). Sem cadastro real.": "Use a valid email and a fictional password (at least 4 characters). No real account needed.",
  "Sistema de Gestão de Retrabalho": "Rework Management System",
  ou: "or",
  "Visão geral": "Overview",
  "Painel da qualidade": "Quality dashboard",
  "Visão consolidada dos bloqueios e do avanço de cada linha.":
    "Consolidated view of blocks and progress by line.",
  "Criar ocorrência": "Create occurrence",
  "Bloqueios por linha": "Blocks by line",
  "Acompanhamento operacional": "Operational tracking",
  Linha: "Line",
  Modelo: "Model",
  Data: "Date",
  Problema: "Problem",
  "Qtd. bloqueada": "Blocked qty.",
  "Qtd. pendente": "Pending qty.",
  "Qtd. defeito": "Defect qty.",
  Status: "Status",
  "Custo / prioridade": "Cost / priority",
  "Progresso geral": "Overall progress",
  "Ver todas as ocorrências": "View all occurrences",
  Ocorrências: "Occurrences",
  "Histórico de bloqueios": "Block history",
  "Buscar ocorrência ou defeito": "Search occurrence or defect",
  "Limpar filtros": "Clear filters",
  "Produto / linha": "Product / line",
  Responsável: "Owner",
  Quantidades: "Quantities",
  Ação: "Action",
  Todos: "All",
  Iniciado: "Started",
  Pendente: "Pending",
  Finalizado: "Finished",
  "Editar bloqueio": "Edit block",
  "Quantidade bloqueada": "Blocked quantity",
  "Problema / defeito": "Problem / defect",
  Descrição: "Description",
  "Pessoa responsável": "Owner",
  "Aluguel dos containers por hora (R$)": "Container rental per hour (BRL)",
  "Atraso da venda por hora (R$)": "Sales delay per hour (BRL)",
  Cancelar: "Cancel",
  "Salvar alterações": "Save changes",
  Dashboard: "Dashboard",
  Operação: "Operation",
  Gestão: "Management",
  "Usuários e perfis": "Users and profiles",
  Sair: "Sign out",
  "Acesso interno": "Internal access",
  "Acesso ao sistema": "System access",
  "E-mail": "Email",
  Senha: "Password",
  "Perfil de acesso": "Access profile",
  "Selecione seu perfil": "Select your profile",
  Qualidade: "Quality",
  Engenharia: "Engineering",
  Produção: "Production",
  Expedição: "Shipping",
  "Entrar no Rework": "Sign in",
  Mostrar: "Show",
  Ocultar: "Hide",
  "Abrir Dashboard": "Open Dashboard",
  "Acesso da Produção": "Production access",
  "Criar retrabalho": "Create rework",
  "Novo bloqueio": "New block",
  "Dados do bloqueio": "Block data",
  Continuar: "Continue",
  Voltar: "Back",
  "Criar bloqueio": "Create block",
  "Método de retrabalho": "Rework method",
  "Possível causa": "Possible cause",
  Categoria: "Category",
  "Departamento responsável": "Responsible department",
  "Containers e quantidades": "Containers and quantities",
  "Adicionar container": "Add container",
  "Bipagem de seriais": "Serial scanning",
  "Número de série": "Serial number",
  "Registrar NG": "Register NG",
  "Registrar OK": "Register OK",
  Inspecionados: "Inspected",
  Pendentes: "Pending",
  Tema: "Theme",
  Idioma: "Language",
  Sistema: "System",
  Claro: "Light",
  Escuro: "Dark",
  Português: "Portuguese",
  Inglês: "English",
  Baixa: "Low",
  Média: "Medium",
  Alta: "High",
  "Editar custos": "Edit costs",
  "Custo acumulado": "Accumulated cost",
  "Defeitos encontrados": "Defects found",
  Excluir: "Delete",
  "Serial inicial": "Initial serial",
  "Serial final": "Final serial",
  Relatórios: "Reports",
  "Relatório de ocorrências": "Occurrence report",
  "Data inicial": "Start date",
  "Data final": "End date",
  Todas: "All",
  "Gerar relatório": "Generate report",
  "Exportar CSV": "Export CSV",
  "Imprimir / salvar PDF": "Print / save PDF",
  "Ocorrências incluídas": "Included occurrences",
  Prioridade: "Priority",
  "Prioridade alta": "High priority",
  Limpar: "Clear",
};

const preferenceLanguage = () => {
  const selectedLanguage = localStorage.getItem("rework-language") || "system";
  return selectedLanguage === "system"
    ? (navigator.language || "pt-BR").toLowerCase().startsWith("en")
      ? "en"
      : "pt"
    : selectedLanguage;
};

function translatePage() {
  if (preferenceLanguage() !== "en") return;
  document.documentElement.lang = "en";
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    if (["SCRIPT", "STYLE"].includes(node.parentElement?.tagName)) return;
    const original = node.textContent.trim();
    if (!ENGLISH[original]) return;
    if (
      node.parentElement?.tagName === "OPTION" &&
      !node.parentElement.hasAttribute("value")
    )
      node.parentElement.value = original;
    node.textContent = node.textContent.replace(original, ENGLISH[original]);
  });
  document.querySelectorAll("[placeholder]").forEach((field) => {
    const placeholders = {
      "Digite sua senha": "Enter your password",
      "Modelo, linha, problema ou defeito": "Model, line, problem or defect",
      "Bipe ou digite o serial": "Scan or enter the serial",
    };
    if (placeholders[field.placeholder])
      field.placeholder = placeholders[field.placeholder];
  });
}

// Preferências globais: tema, idioma e menu lateral recolhido.
function initPreferences() {
  const themeSetting = localStorage.getItem("rework-theme") || "system";
  const dark =
    themeSetting === "dark" ||
    (themeSetting === "system" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="ui-preferences" aria-label="Preferências da interface">
      <label><span>Tema</span><select id="themePreference"><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label>
      <label><span>Idioma</span><select id="languagePreference"><option value="system">Sistema</option><option value="pt">Português</option><option value="en">Inglês</option></select></label>
    </div>`,
  );
  const theme = document.querySelector("#themePreference");
  const language = document.querySelector("#languagePreference");
  const skip = document.querySelector(".skip-link");
  if (skip) document.body.prepend(skip);
  const languageHint = document.createElement("small");
  languageHint.id = "language-change-hint";
  languageHint.className = "sr-only";
  languageHint.textContent = uiText("A escolha do idioma recarrega a página.", "Choosing a language reloads the page.");
  language.after(languageHint);
  language.setAttribute("aria-describedby", languageHint.id);
  theme.value = themeSetting;
  language.value = localStorage.getItem("rework-language") || "system";
  theme.onchange = () => {
    localStorage.setItem("rework-theme", theme.value);
    document.documentElement.dataset.theme = theme.value === "dark" ||
      (theme.value === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  };
  language.onchange = () => {
    if (language.value === (localStorage.getItem("rework-language") || "system")) return;
    if (!confirmDiscard()) {
      language.value = localStorage.getItem("rework-language") || "system";
      return;
    }
    pendingForms().forEach(markClean);
    localStorage.setItem("rework-language", language.value);
    location.reload();
  };
  if (localStorage.getItem("rework-sidebar") === "collapsed")
    document.body.classList.add("sidebar-collapsed");
}

const NAV_ICONS = {
  dashboard:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"/></svg>',
  occurrences:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm4 5h10v2H7v-2Zm0 4h7v2H7v-2Z"/></svg>',
  new: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>',
  users:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5 1a3.5 3.5 0 1 0 0-7 5.8 5.8 0 0 1 0 7ZM2 20v-2c0-3 3.1-5 7-5s7 2 7 5v2H2Zm15.5 0v-2c0-1.6-.6-3-1.7-4 3.3.1 6.2 1.7 6.2 4v2h-4.5Z"/></svg>',
  reports:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 13h2v2H7v-2Zm0-5h2v4H7v-4Zm4 2h2v5h-2v-5Zm4-6h2v11h-2V7Z"/></svg>',
};

// Controla o login e o acesso público da Produção.
function initLogin() {
  const form = document.querySelector("#login");

  if (!form) return false;

  const email =
    document.querySelector("#email");

  const password =
    document.querySelector("#password");

  const status =
    document.querySelector("#loginStatus");

  const submit =
    form.querySelector('[type="submit"]');

  document
    .querySelector("#togglePassword")
    ?.addEventListener(
      "click",
      (event) => {
        const show =
          password.type === "password";

        password.type =
          show ? "text" : "password";

        event.currentTarget.textContent =
          show ? "Ocultar" : "Mostrar";

        event.currentTarget.setAttribute(
          "aria-pressed",
          String(show)
        );
      }
    );

  document
    .querySelector("#publicDashboard")
    ?.addEventListener(
      "click",
      async (event) => {
        event.preventDefault();

        try {
          await fetch(
            "/api/auth/logout",
            {
              method: "POST"
            }
          );
        } catch {
          // Produção pode não possuir
          // uma sessão autenticada.
        }

        sessionStorage.setItem(
          "rework-profile",
          "Produção"
        );

        sessionStorage.removeItem(
          "rework-user-name"
        );

        location.href =
          "dashboard.html";
      }
    );

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const profile =
        form.elements.profile.value;

      submit.disabled = true;

      status.className =
        "status-message";

      status.textContent =
        "Validando acesso…";

      try {
        const resultado =
          await apiRequest(
            "/api/auth/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                email:
                  email.value.trim(),

                senha:
                  password.value,

                perfil:
                  profile
              })
            }
          );

        sessionStorage.setItem(
          "rework-profile",
          resultado.usuario.perfil
        );

        sessionStorage.setItem(
          "rework-user-name",
          resultado.usuario.nome
        );

        status.className =
          "status-message success";

        if (
          resultado
            .troca_senha_obrigatoria
        ) {
          status.textContent =
            "Primeiro acesso. Cadastre uma nova senha…";

          location.href =
            "alterar-senha.html";

          return;
        }

        status.textContent =
          "Login realizado. Abrindo o sistema…";

        location.href =
          "dashboard.html";

      } catch (error) {
        status.className =
          "status-message error";

        status.textContent =
          error.message;

      } finally {
        submit.disabled = false;
      }
    }
  );

  return true;
}

async function initChangePassword() {
  const form =
    document.querySelector(
      "#changePasswordForm"
    );

  if (!form) return false;

  const status =
    document.querySelector(
      "#changePasswordStatus"
    );

  const userName =
    document.querySelector(
      "#changePasswordUser"
    );

  const submit =
    form.querySelector(
      '[type="submit"]'
    );

  try {
    const resultado =
      await apiRequest(
        "/api/auth/me"
      );

    const usuario =
      resultado.usuario;

    userName.textContent =
      usuario.nome;

    sessionStorage.setItem(
      "rework-profile",
      usuario.perfil
    );

    sessionStorage.setItem(
      "rework-user-name",
      usuario.nome
    );

    if (
      !usuario
        .troca_senha_obrigatoria
    ) {
      location.replace(
        "dashboard.html"
      );

      return true;
    }

  } catch {
    sessionStorage.removeItem(
      "rework-profile"
    );

    sessionStorage.removeItem(
      "rework-user-name"
    );

    location.replace(
      "index.html"
    );

    return true;
  }


  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const novaSenha =
        form.elements
          .newPassword.value;

      const confirmarSenha =
        form.elements
          .confirmPassword.value;

      if (
        novaSenha !==
        confirmarSenha
      ) {
        status.className =
          "status-message error";

        status.textContent =
          "As senhas não coincidem.";

        return;
      }

      submit.disabled = true;

      status.className =
        "status-message";

      status.textContent =
        "Atualizando senha…";

      try {
        await apiRequest(
          "/api/auth/change-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              nova_senha:
                novaSenha,

              confirmar_senha:
                confirmarSenha
            })
          }
        );

        status.className =
          "status-message success";

        status.textContent =
          "Senha alterada com sucesso. Abrindo o sistema…";

        setTimeout(() => {
          location.href =
            "dashboard.html";
        }, 600);

      } catch (error) {
        status.className =
          "status-message error";

        status.textContent =
          error.message;

      } finally {
        submit.disabled = false;
      }
    }
  );

  return true;
}

async function validarSessaoDaPagina() {
  const page = location.pathname.split("/").pop();
  const profileLocal = sessionStorage.getItem("rework-profile");

  // Produção continua pública, mas somente no Dashboard.
  if (page === "dashboard.html" && profileLocal === "Produção") {
    return {
      perfil: "Produção",
      nome: "Produção",
      acessoPublico: true
    };
  }

  try {
    const resultado = await apiRequest("/api/auth/me");
    const usuario = resultado.usuario;

    // Atualiza a interface com o perfil real vindo do servidor.
    sessionStorage.setItem("rework-profile", usuario.perfil);
    sessionStorage.setItem("rework-user-name", usuario.nome);

    if (usuario.troca_senha_obrigatoria) {
      location.replace("alterar-senha.html");
      return null;
    }

    return usuario;
  } catch (error) {
    sessionStorage.removeItem("rework-profile");
    sessionStorage.removeItem("rework-user-name");
    location.replace("index.html");
    return null;
  }
}

// Monta o menu conforme as permissões do perfil ativo.
function renderShell() {
  const sidebar = document.querySelector("#sidebar");
  if (!sidebar) return;
  const active = sidebar.dataset.active;
  const profile = sessionStorage.getItem("rework-profile") || "Produção";
  const userName = sessionStorage.getItem("rework-user-name");
  const operational =
    profile === "Produção"
      ? [["dashboard", "Dashboard", "dashboard.html", "dashboard"]]
      : [
          ["dashboard", "Dashboard", "dashboard.html", "dashboard"],
          ["occurrences", "Ocorrências", "ocorrencias.html", "occurrences"],
        ];
  if (profile === "Qualidade")
    operational.push([
      "new",
      "Criar ocorrência",
      "nova-ocorrencia.html",
      "new",
    ]);
  sidebar.className = "sidebar";
  sidebar.innerHTML = `
    <div class="sidebar-head"><div class="brand-mark"><img src="assets/rework-symbol.svg" alt="" width="36" height="36"><strong>REWORK</strong></div><button id="toggleSidebar" class="sidebar-toggle" type="button" aria-label="Recolher menu" title="Recolher menu">‹</button></div>
    <div class="nav-group"><small>Operação</small><nav>
      ${operational.map((item) => `<a class="${active === item[0] ? "active" : ""}" href="${item[2]}" title="${item[1]}"><span class="nav-icon">${NAV_ICONS[item[3]]}</span><span class="nav-label">${item[1]}</span></a>`).join("")}
    </nav></div>
    ${profile === "Qualidade" ? `<div class="nav-group"><small>Gestão</small><nav><a class="${active === "reports" ? "active" : ""}" href="relatorios.html" title="Relatórios"><span class="nav-icon">${NAV_ICONS.reports}</span><span class="nav-label">Relatórios</span></a><a class="${active === "users" ? "active" : ""}" href="usuarios.html" title="Usuários e perfis"><span class="nav-icon">${NAV_ICONS.users}</span><span class="nav-label">Usuários e perfis</span></a></nav></div>` : ""}
    <div class="sidebar-profile"><strong>${profile === "Produção" ? "Produção" : esc(userName || "Usuário")}</strong><small>${profile === "Produção" ? "Acesso público" : `Perfil ${esc(profile)}`}</small><button class="link-button" data-logout>Sair</button></div>`;
}

function bindGlobal() {
  const profile = sessionStorage.getItem("rework-profile") || "Produção";
  document.querySelectorAll(".quality-only").forEach((element) => {
    element.hidden = profile !== "Qualidade";
  });
  document.querySelectorAll(".occurrence-access").forEach((element) => {
    element.hidden = profile === "Produção";
  });
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.onclick = async () => {
      if (!confirmDiscard()) {
        return;
      }

      pendingForms().forEach(markClean);

      try {
        await fetch("/api/auth/logout", {
          method: "POST"
        });
      } catch (error) {
        console.error("Erro ao encerrar sessão:", error);
      } finally {
        sessionStorage.removeItem("rework-profile");
        sessionStorage.removeItem("rework-user-name");
        location.href = "index.html";
      }
    };
  });
  const updateSidebarState = () => {
    const toggle = document.querySelector("#toggleSidebar");
    if (!toggle) return;
    const collapsed = document.body.classList.contains("sidebar-collapsed");
    const label = collapsed ? uiText("Expandir menu", "Expand menu") : uiText("Recolher menu", "Collapse menu");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
  };
  document.querySelectorAll(".sidebar nav").forEach((nav, index) => nav.setAttribute("aria-label", index ? "Gestão" : "Operação"));
  document.querySelectorAll(".sidebar nav a").forEach((link) => {
    link.setAttribute("aria-label", link.title);
    if (link.classList.contains("active")) link.setAttribute("aria-current", "page");
  });
  updateSidebarState();
  document.querySelector("#toggleSidebar")?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    updateSidebarState();
    localStorage.setItem(
      "rework-sidebar",
      document.body.classList.contains("sidebar-collapsed")
        ? "collapsed"
        : "expanded",
    );
  });
}

function statusBadge(occurrence) {
  const style =
    occurrence.status === "Finalizado"
      ? "finished"
      : occurrence.status === "Iniciado"
        ? "started"
        : "pending";
  const labels = {
    Finalizado: "Finished",
    Iniciado: "Started",
    Pendente: "Pending",
  };
  const label =
    preferenceLanguage() === "en"
      ? labels[occurrence.status]
      : occurrence.status;
  return `<span class="badge ${style}">${esc(label)}</span>`;
}

function occurrenceActions(occurrence, profile) {
  const en = preferenceLanguage() === "en";
  const context = `<span class="sr-only"> ${esc(occurrence.id)}</span>`;
  const methodLink = `<a href="metodo-retrabalho.html${params(occurrence.id)}" data-select="${occurrence.id}">${occurrence.method ? "Método / arquivo" : "Definir método"}${context}</a>`;
  if (profile === "Expedição")
    return `<button class="table-link" type="button" data-edit="${occurrence.id}">${en ? "Edit costs" : "Editar custos"}${context}</button>`;
  if (profile === "Engenharia")
    return methodLink;
  const actions = occurrence.method
    ? `<a href="seriais.html${params(occurrence.id)}" data-select="${occurrence.id}">Bipar${context}</a>${methodLink}`
    : methodLink;
  return (profile === "Qualidade" ? `<a href="detalhes-ocorrencia.html${params(occurrence.id)}">Ver detalhes${context}</a>` : "") + actions + (profile === "Qualidade"
    ? `<button class="danger compact-action" type="button" data-delete-occurrence="${esc(occurrence.id)}" aria-label="${en ? "Delete occurrence" : "Excluir ocorrência"} ${esc(occurrence.id)}">${en ? "Delete" : "Excluir"}</button>`
    : "");
}

// Confere o perfil novamente antes de excluir os dados locais.
function deleteOccurrence(id) {
  if (sessionStorage.getItem("rework-profile") !== "Qualidade") return false;
  const occurrence = read().find((item) => item.id === id);
  if (!occurrence) return false;
  const en = preferenceLanguage() === "en";
  if (!window.confirm(en
    ? `Delete occurrence ${id} (${occurrence.defect})? Its containers, scans and method attachment will also be deleted. This cannot be undone.`
    : `Excluir a ocorrência ${id} (${occurrence.defect})? Seus containers, bipagens e anexo do método também serão excluídos. Esta ação não pode ser desfeita.`)) return false;
  if (sessionStorage.getItem("rework-profile") !== "Qualidade") return false;
  try {
    if (!save(read().filter((item) => item.id !== id))) return false;
  } catch {
    window.alert(en ? "Unable to delete the occurrence. Please try again." : "Não foi possível excluir a ocorrência. Tente novamente.");
    return false;
  }
  if (localStorage.getItem("rework-selected") === id)
    localStorage.removeItem("rework-selected");
  return true;
}

// Monta as linhas compactas da tabela de ocorrências.
function occurrenceRows(list) {
  const profile = sessionStorage.getItem("rework-profile") || "Produção";
  return list
    .map(
      (occurrence) => `
    <tr>
      <td>${
        profile === "Qualidade" || profile === "Expedição"
          ? `<button class="folder-button" type="button" data-edit="${occurrence.id}" aria-label="Editar ${occurrence.id}" title="Editar ${occurrence.id}">
        <span aria-hidden="true">✎</span><small>${occurrence.id}</small><small>${profile === "Expedição" ? "Editar custos" : "Editar"}</small>
      </button>`
          : `<span class="folder-reference">📁 <small>${occurrence.id}</small></span>`
      }</td>
      <td><strong>${esc(occurrence.model)}</strong><small class="cell-detail">Linha ${esc(occurrence.line)}</small></td>
      <td>${occurrence.date}</td>
      <td class="wrap"><strong>${esc(occurrence.defect)}</strong><small class="cell-detail">${esc(occurrence.classification)} · ${esc(occurrence.area)}</small></td>
      <td>${esc(occurrence.person)}</td>
      <td><div class="quantity-stack"><span><b>${num(occurrence.blocked)}</b> bloqueadas</span><span>${num(inspected(occurrence))} inspecionadas</span><span>${num(pending(occurrence))} pendentes</span></div></td>
      <td>${statusBadge(occurrence)}<small class="cell-detail">Método ${flow(occurrence).toLowerCase()}</small></td>
      <td>${costPriorityCell(occurrence)}</td>
      <td><div class="table-actions">${occurrenceActions(occurrence, profile)}</div></td>
    </tr>`,
    )
    .join("");
}

// Aplica filtros e permite editar cada ocorrência.
function occurrenceFromApi(row) {
  return {
    id: row.protocolo,
    date: row.data_abertura
      ? new Date(row.data_abertura).toLocaleDateString("pt-BR")
      : "",
    line: row.linha || "",
    model: row.modelo || "",
    part: row.parte_processo || "",
    defect: row.defeito || "",
    description: row.descricao_problema || "",
    serialStart: row.serial_inicial || "",
    serialEnd: row.serial_final || "",
    blocked: Number(row.quantidade_bloqueada || 0),
    detected: Number(row.quantidade_detectada || 0),
    area: row.area_solicitante || "",
    status: row.status || "Pendente",
    containerHourlyCost: Number(row.custo_container_hora || 0),
    salesDelayHourlyCost: Number(row.custo_atraso_venda_hora || 0),
    createdAt: row.data_abertura,
    resolvedAt: row.resolvido_em,

    // Ainda serão ligados ao banco nas próximas etapas
    classification: row.metodo?.classificacao || "",
    department: row.metodo?.departamento || "",
    person: row.metodo?.responsavel || "",
    cause: row.metodo?.causa || "",
    method: row.metodo?.metodo || "",
    methodFile: row.metodo?.arquivo_caminho
      ? {
          name: row.metodo.arquivo_nome,
          type: row.metodo.arquivo_tipo,
          data: row.metodo.arquivo_caminho
        }
      : null,
    containers: (row.containers || []).map(container => ({ ...container, qty: Number(container.qty) })),
    scans: (row.scans || []).map(scan => ({ ...scan, at: scan.at ? new Date(scan.at).toLocaleString("pt-BR") : "" }))
  };
}

async function apiRequest(url, options) {
  const response = await fetch(url, options);
  const resultado = await response.json();
  if (!response.ok) {
    const error = new Error(resultado.mensagem || "Erro ao acessar o banco de dados");
    error.status = response.status;
    throw error;
  }
  return resultado;
}

async function loadCurrentOccurrence(host) {
  try {
    return await getCurrent();
  } catch (error) {
    if (error.status === 404) showMissingOccurrence();
    else feedback(`Não foi possível carregar a ocorrência: ${error.message}`, true, host);
    return null;
  }
}

async function initOccurrences() {
  const body = document.querySelector("#occurrenceRows");
  if (!body) return;
  if ((sessionStorage.getItem("rework-profile") || "Produção") === "Produção") {
    location.replace("dashboard.html");
    return;
  }
  let data = [];
  const search = document.querySelector("#search");
  const date = document.querySelector("#dateFilter");
  const status = document.querySelector("#statusFilter");
  const result = document.querySelector("#filterResult");
  const dialog = document.querySelector("#editOccurrence");
  const form = document.querySelector("#editOccurrenceForm");
  const profile = sessionStorage.getItem("rework-profile") || "Produção";
  let editingId = null;

  const openEditor = (id) => {
    const occurrence = data.find((item) => item.id === id);
    if (!occurrence) return;
    editingId = id;
    document.querySelector("#editFormStatus").textContent = "";
    form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
    document.querySelector("#editOccurrenceTitle").textContent = id;
    ["model", "line", "defect", "description", "person", "status"].forEach(
      (key) => {
        form.elements[key].value = occurrence[key];
      },
    );
    form.elements.date.value = toIsoDate(occurrence.date);
    form.elements.blocked.value = occurrence.blocked;
    form.elements.serialStart.value = occurrence.serialStart;
    form.elements.serialEnd.value = occurrence.serialEnd;
    form.elements.containerHourlyCost.value = occurrence.containerHourlyCost;
    form.elements.salesDelayHourlyCost.value = occurrence.salesDelayHourlyCost;
    const permissionNote = document.querySelector("#editPermissionNote");
    permissionNote.hidden = profile !== "Expedição";
    permissionNote.textContent =
      "A Expedição pode alterar somente os custos desta ocorrência.";
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = profile === "Expedição" && !field.closest(".cost-field");
    });
    form.elements.date.disabled = true;
    form.elements.person.disabled = true;
    markClean(form);
    dialog.showModal();
  };
  const render = () => {
    const query = search.value.trim().toLowerCase();
    const filtered = data.filter((occurrence) => {
      const text = [
        occurrence.id,
        occurrence.model,
        occurrence.line,
        occurrence.defect,
        occurrence.description,
        occurrence.area,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!query || text.includes(query)) &&
        (!date.value || toIsoDate(occurrence.date) === date.value) &&
        (status.value === "Todos" || occurrence.status === status.value)
      );
    });
    body.innerHTML =
      occurrenceRows(filtered) ||
      `<tr><td colspan="9" class="empty">Nenhum bloqueio encontrado.</td></tr>`;
    result.textContent = `${filtered.length} de ${data.length} ocorrência(s) exibida(s)`;
    body
      .querySelectorAll("[data-edit]")
      .forEach(
        (button) => (button.onclick = () => openEditor(button.dataset.edit)),
      );
    body.querySelectorAll("[data-delete-occurrence]").forEach((button) => {
      button.onclick = async () => {
        const protocolo = button.dataset.deleteOccurrence;
        if (!window.confirm(`Excluir definitivamente a ocorrência ${protocolo}?`)) return;
        button.disabled = true;
        try {
          await apiRequest(`/api/occurrences/${encodeURIComponent(protocolo)}`, { method: "DELETE" });
          data = data.filter(item => item.id !== protocolo);
          render();
          feedback(`Ocorrência ${protocolo} excluída.`);
          search.focus();
        } catch (error) {
          feedback(`Erro ao excluir: ${error.message}`, true);
          button.disabled = false;
        }
      };
    });
    body
      .querySelectorAll("[data-select]")
      .forEach((link) => (link.onclick = () => choose(link.dataset.select)));
  };
  search.oninput = render;
  date.onchange = render;
  status.onchange = render;
  document.querySelector("#clearFilters").onclick = () => {
    search.value = "";
    date.value = "";
    status.value = "Todos";
    render();
  };
  document
    .querySelectorAll("[data-close-dialog]")
    .forEach((button) => (button.onclick = () => closeEditor(dialog, form)));
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeEditor(dialog, form); });
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const original = data.find((item) => item.id === editingId);
    const values = new FormData(form);
    const serialStart = values.get("serialStart")?.trim();
    const serialEnd = values.get("serialEnd")?.trim();
    const editStatus = document.querySelector("#editFormStatus");
    if (
      profile === "Qualidade" &&
      serialStart.localeCompare(serialEnd, undefined, {
        numeric: true,
        sensitivity: "base",
      }) > 0
    ) {
      fieldError(form.elements.serialEnd, "O serial final deve ser igual ou posterior ao serial inicial. Revise a faixa antes de salvar.", editStatus);
      return;
    }
    if (profile === "Qualidade") {
      const changes = [];
      if (values.get("status") !== original.status) changes.push(`Status: ${original.status} → ${values.get("status")}`);
      if (Number(values.get("blocked")) !== original.blocked) changes.push(`Quantidade bloqueada: ${original.blocked} → ${values.get("blocked")}. Containers e bipagens existentes não serão alterados.`);
      if (serialStart !== original.serialStart || serialEnd !== original.serialEnd) changes.push(`Nova faixa: ${serialStart} a ${serialEnd}. As bipagens existentes serão mantidas.`);
      if (changes.length && !window.confirm(`Confirme as alterações em ${editingId}:\n\n${changes.join("\n")}\n\nSalvar alterações?`)) return;
    }
    editStatus.textContent = "";
    const submit = form.querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    const savedSignature = formSignature(form);
    try {
      if (profile === "Expedição") {
        await apiRequest(`/api/occurrences/${encodeURIComponent(editingId)}/costs`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            custo_container_hora: Number(values.get("containerHourlyCost") || 0),
            custo_atraso_venda_hora: Number(values.get("salesDelayHourlyCost") || 0)
          })
        });
      } else {
        await apiRequest(`/api/occurrences/${encodeURIComponent(editingId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linha: values.get("line"),
          modelo: values.get("model"),
          defeito: values.get("defect"),
          descricao_problema: values.get("description"),
          serial_inicial: serialStart,
          serial_final: serialEnd,
          quantidade_bloqueada: Number(values.get("blocked")),
          status: values.get("status"),
          custo_container_hora: Number(values.get("containerHourlyCost") || 0),
          custo_atraso_venda_hora: Number(values.get("salesDelayHourlyCost") || 0)
        })
      });
      }
      formSnapshots.set(form, savedSignature);
      dialog.close();
      feedback(`Ocorrência ${editingId} atualizada com sucesso.`);
      try {
        data = (await apiRequest("/api/occurrences")).map(occurrenceFromApi);
        render();
      } catch (error) {
        feedback(`Ocorrência salva, mas não foi possível atualizar a lista: ${error.message}`, true);
      }
    } catch (error) {
      feedback(`Erro ao atualizar: ${error.message}`, true, editStatus);
    } finally {
      submit.disabled = false;
    }
  };
  try {
    body.innerHTML = `
      <tr>
        <td colspan="9" class="empty">
          Carregando ocorrências...
        </td>
      </tr>
    `;

    const response = await fetch("/api/occurrences");

    if (!response.ok) {
      throw new Error("Não foi possível carregar as ocorrências");
    }

    const rows = await response.json();
    data = rows.map(occurrenceFromApi);
    render();
  } catch (error) {
    console.error("Erro ao carregar ocorrências:", error);
    body.innerHTML = `
      <tr>
        <td colspan="9" class="empty">
          Não foi possível carregar as ocorrências do banco.
        </td>
      </tr>
    `;
  }
}

// Calcula indicadores e o progresso exibidos no Dashboard.
function renderDashboardCharts(data, open) {
  const statusHost = document.querySelector("#dashboardStatusChart");
  if (!statusHost) return;
  const statuses = [
    { value: "Pendente", label: uiText("Pendente", "Pending"), color: "#facc15" },
    { value: "Iniciado", label: uiText("Iniciado", "Started"), color: "var(--primary)" },
    { value: "Finalizado", label: uiText("Concluído", "Completed"), color: "var(--success)" },
  ].map(status => ({ ...status, count: data.filter(item => item.status === status.value).length }));
  const statusTotal = statuses.reduce((sum, status) => sum + status.count, 0);
  let offset = 0;
  const segments = statuses.map(status => {
    const start = offset;
    offset += statusTotal ? status.count / statusTotal * 100 : 0;
    return `${status.color} ${start}% ${offset}%`;
  });
  const donutBackground = statusTotal ? `conic-gradient(${segments.join(", ")})` : "var(--surface-secondary)";
  statusHost.innerHTML = `<div class="dashboard-status-layout">
    <div class="dashboard-status-donut" style="background:${donutBackground}" aria-hidden="true">
      <div class="dashboard-status-total"><strong>${num(statusTotal)}</strong><span>${uiText("Total", "Total")}</span></div>
    </div>
    <ul class="dashboard-status-legend">${statuses.map(status => `<li><span class="dashboard-chart-dot" style="background:${status.color}" aria-hidden="true"></span><span>${status.label}</span><strong>${num(status.count)}</strong></li>`).join("")}</ul>
  </div>${!data.length ? `<p class="muted">${uiText("Nenhuma ocorrência registrada.", "No occurrences recorded.")}</p>` : ""}`;

  // Mesmo recorte dos indicadores: quantidade de ocorrências abertas por linha.
  const lines = new Map();
  open.forEach(item => {
    const line = item.line?.trim() || uiText("Sem linha", "No line");
    lines.set(line, (lines.get(line) || 0) + 1);
  });
  const total = open.length;
  const maxCount = Math.max(1, ...lines.values());
  document.querySelector("#dashboardCostChart").innerHTML = `<div class="dashboard-cost-list">${[...lines]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([line, count]) => {
      const share = total > 0 ? count / total * 100 : 0;
      return `<div class="dashboard-cost-row"><strong>${esc(line)}</strong>
        <div class="dashboard-cost-track" aria-hidden="true"><span style="height:${count / maxCount * 100}%"></span></div>
        <div class="dashboard-cost-value"><strong>${num(count)} ${count === 1 ? uiText("ocorrência", "occurrence") : uiText("ocorrências", "occurrences")}</strong><span>(${share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span></div></div>`;
    }).join("") || `<p class="muted">${uiText("Nenhuma ocorrência aberta por linha.", "No open occurrences by line.")}</p>`}</div>`;
  document.querySelector("#statusChartTitle").textContent = uiText("Ocorrências por status", "Occurrences by status");
  document.querySelector("#costChartTitle").textContent = uiText("Ocorrências por linha", "Occurrences by line");
  document.querySelector("#dashboardChartsUpdated").textContent = `${uiText("Atualizado em", "Updated on")} ${new Date().toLocaleDateString("pt-BR")}`;
}

async function initDashboard() {
  const metrics = document.querySelector("#dashboardMetrics");
  if (!metrics) return;
  let data = [];
  try {
    data = (await apiRequest("/api/occurrences")).map(occurrenceFromApi);
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    feedback(`Não foi possível carregar o dashboard: ${error.message}`, true);
    return;
  }
  const open = data.filter((item) =>
    ["Iniciado", "Pendente"].includes(item.status),
  );
  const blocked = open.reduce((total, item) => total + item.blocked, 0);
  renderDashboardCharts(data, open);
  const checked = open.reduce((total, item) => total + inspected(item), 0);
  const ng = open.reduce((total, item) => total + defects(item), 0);
  const totalCost = open.reduce(
    (total, item) => total + accumulatedCost(item),
    0,
  );
  metrics.innerHTML = `
    <article class="metric-card"><span>Bloqueios abertos</span><strong>${open.length}</strong><small>ocorrências em acompanhamento</small></article>
    <article class="metric-card"><span>Unidades bloqueadas</span><strong>${num(blocked)}</strong><small>nos bloqueios abertos</small></article>
    <article class="metric-card"><span>Unidades inspecionadas</span><strong>${num(checked)}</strong><small>seriais classificados</small></article>
    <article class="metric-card"><span>Defeitos encontrados</span><strong>${num(ng)}</strong><small>resultado NG na inspeção</small></article>
    <article class="metric-card cost-metric"><span>Custo acumulado</span><strong>${money(totalCost)}</strong><small>containers e atraso de venda</small></article>`;
  document.querySelector("#dashboardRows").innerHTML =
    open
      .map((item) => {
        const percent = item.blocked
          ? Math.min(Math.round((inspected(item) / item.blocked) * 100), 100)
          : 0;
        return `<tr><td><strong>${esc(item.line)}</strong></td><td>${esc(item.model)}</td><td>${item.date}</td><td class="wrap">${esc(item.defect)}</td><td>${num(item.blocked)}</td><td>${num(pending(item))}</td><td>${num(defects(item))}</td><td>${statusBadge(item)}</td><td>${costPriorityCell(item)}</td><td><div class="progress-cell"><progress aria-label="Progresso de ${esc(item.id)}" max="100" value="${percent}">${percent}%</progress><span>${percent}%</span></div></td></tr>`;
      })
      .join("") ||
    `<tr><td colspan="10" class="empty">Nenhuma ocorrência aberta ou pendente.</td></tr>`;
  document.querySelector("#dashboardUpdated").textContent =
    `Atualizado em ${new Date().toLocaleDateString("pt-BR")}`;
}

async function getCurrent() {
  return occurrenceFromApi(await apiRequest(`/api/occurrences/${encodeURIComponent(selected())}`));
}

function showMissingOccurrence() {
  const main = document.querySelector("main");
  main.innerHTML = `<section class="panel"><h1 tabindex="-1">Ocorrência não encontrada</h1><p>O registro solicitado não está disponível. Ele pode ter sido excluído ou o endereço pode estar incorreto.</p><a class="primary" href="ocorrencias.html">Voltar às ocorrências</a></section>`;
  main.querySelector("h1").focus();
}
function setLinks(occurrence) {
  document
    .querySelectorAll("[data-context-link]")
    .forEach(
      (link) => (link.href = link.dataset.contextLink + params(occurrence.id)),
    );
}

// Salva o método de retrabalho e seu arquivo anexo.
async function initMethod() {
  const form = document.querySelector("#methodForm");
  if (!form) return;
  const status = document.querySelector("#methodFileStatus");
  const occurrence = await loadCurrentOccurrence(status);
  if (!occurrence) return;
  choose(occurrence.id);
  setLinks(occurrence);
  document.querySelector("#methodId").textContent = occurrence.id;
  document.querySelector("#methodSummary").innerHTML =
    `<strong>${esc(occurrence.defect)}</strong><br>${esc(occurrence.model)} · ${esc(occurrence.line)}<br>${num(occurrence.blocked)} unidades`;
  const fileInput = document.querySelector("#methodFile");
  const attachment = document.querySelector("#methodAttachment");
  const submit = form.querySelector('[type="submit"]');
  const engineering = sessionStorage.getItem("rework-profile") === "Engenharia";
  submit.textContent = engineering ? "Salvar método" : "Salvar e iniciar bipagem";
  let saving = false;
  const renderAttachment = () => {
    attachment.innerHTML = occurrence.methodFile
      ? `<div class="attachment-row"><div><strong>${esc(occurrence.methodFile.name)}</strong><small>${esc(occurrence.methodFile.type || "Arquivo do método")}</small></div><div class="table-actions"><a class="secondary" href="${occurrence.methodFile.data}" download="${esc(occurrence.methodFile.name)}">Baixar</a><button id="removeMethodFile" class="danger" type="button">Remover</button></div></div>`
      : `<p class="muted">Nenhum arquivo anexado a esta ocorrência.</p>`;
    document
      .querySelector("#removeMethodFile")
      ?.addEventListener("click", async () => {
        if (!window.confirm(`Remover o anexo ${occurrence.methodFile.name} de ${occurrence.id}?`)) return;
        try {
          await apiRequest(
            `/api/occurrences/${encodeURIComponent(occurrence.id)}/method/file`,
            { method: "DELETE" }
          );
          occurrence.methodFile = null;
          renderAttachment();
          feedback("Anexo removido. Você pode escolher outro arquivo e salvar o método.", false, status);
          fileInput.focus();
        } catch (error) {
          feedback(`Não foi possível remover o anexo: ${error.message}`, true, status);
        }
      });
  };
  renderAttachment();
  ["cause", "method", "classification", "department", "person"].forEach(
    (key) => (form.elements[key].value = occurrence[key] || ""),
  );
  // Os dados vieram do banco.
  // Portanto, neste momento não existem alterações pendentes.
  markClean(form);
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    saving = true;
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    feedback("Salvando método no banco de dados…", false, status);
    try {
      const file = fileInput.files[0];
      const payload = new FormData();
      payload.append("causa", values.get("cause")?.trim() || "");
      payload.append("metodo", values.get("method")?.trim() || "");
      payload.append("classificacao", values.get("classification")?.trim() || "");
      payload.append("departamento", values.get("department")?.trim() || "");
      payload.append("responsavel", values.get("person")?.trim() || "");
      if (file) payload.append("arquivo", file);
      await apiRequest(
        `/api/occurrences/${encodeURIComponent(occurrence.id)}/method`,
        {
          method: "POST",
          body: payload
        }
      );

      markClean(form);
      // Desliga o aviso porque o método já foi salvo.
      window.removeEventListener("beforeunload", handleBeforeUnload);

      feedback(`Método da ocorrência ${occurrence.id} salvo com sucesso.`, false, status);

      const engineering = sessionStorage.getItem("rework-profile") === "Engenharia";
      setTimeout(() => {
        navigateWithFeedback(
          engineering
            ? "ocorrencias.html"
            : `seriais.html${params(occurrence.id)}`,
          engineering
            ? `Método de ${occurrence.id} salvo.`
            : `Método de ${occurrence.id} salvo. Inicie a bipagem.`
        );
      }, 500);
    } catch (error) {
      console.error("Erro ao salvar método:", error);
      feedback(`Não foi possível salvar o método: ${error.message}`, true, status);
    } finally {
      saving = false;
      submit.disabled = false;
      form.removeAttribute("aria-busy");
    }
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Registra os seriais inspecionados como OK ou NG.
async function initScans() {
  const form = document.querySelector("#scanForm");
  if (!form) return;
  const status = document.querySelector("#scanStatus");
  const occurrence = await loadCurrentOccurrence(status);
  if (!occurrence) return;
  choose(occurrence.id);
  setLinks(occurrence);
  const input = document.querySelector("#serialScan");
  const rows = document.querySelector("#scanRows");
  document.querySelector("#scanId").textContent = occurrence.id;
  document.querySelector("#scanRange").textContent =
    `Faixa aceita: ${occurrence.serialStart} a ${occurrence.serialEnd}`;
  const render = () => {
    rows.innerHTML =
      occurrence.scans
        .map(
          (scan) =>
            `<tr><td>${esc(scan.serial)}</td><td><span class="badge ${scan.result.toLowerCase()}">${scan.result}</span></td><td>${scan.at}</td><td>Qualidade</td><td><button class="danger compact-action" type="button" data-delete-scan="${esc(scan.serial)}" aria-label="Excluir serial ${esc(scan.serial)}">Excluir</button></td></tr>`,
        )
        .join("") ||
      `<tr><td colspan="5" class="empty">Nenhum serial bipado neste bloqueio.</td></tr>`;
    rows.querySelectorAll("[data-delete-scan]").forEach((button) => {
      button.onclick = async () => {
        const serial = button.dataset.deleteScan;
        if (!window.confirm(`Excluir o serial ${serial} de ${occurrence.id}?`)) {
          return;
        }
        try {
          await apiRequest(
            `/api/occurrences/${encodeURIComponent(occurrence.id)}/scans/${encodeURIComponent(serial)}`,
            { method: "DELETE" }
          );
          occurrence.scans = occurrence.scans.filter(
            scan => scan.serial !== serial
          );
          status.className = "status-message success";
          status.textContent = `Serial ${serial} excluído.`;
          render();
          input.focus();
        } catch (error) {
          feedback(`Erro ao excluir serial: ${error.message}`, true, status);
        }
      };
    });
    document.querySelector("#scanCount").textContent = inspected(occurrence);
    document.querySelector("#scanPending").textContent = num(
      pending(occurrence),
    );
  };
  const register = async (result) => {
    if (!occurrence.method) return;
    const serial = input.value.trim();
    const inRange =
      serial.localeCompare(occurrence.serialStart, undefined, {
        numeric: true,
      }) >= 0 &&
      serial.localeCompare(occurrence.serialEnd, undefined, {
        numeric: true,
      }) <= 0;
    if (!serial || !inRange) {
      fieldError(input, !serial ? "Bipe ou digite um número de série antes de registrar." : `Serial fora da faixa de ${occurrence.id}. Informe um serial entre ${occurrence.serialStart} e ${occurrence.serialEnd}.`, status);
      return;
    }
    if (
      occurrence.scans.some(
        (scan) => scan.serial.toLowerCase() === serial.toLowerCase(),
      )
    ) {
      const previous = occurrence.scans.find(
        (scan) => scan.serial.toLowerCase() === serial.toLowerCase()
      );
      fieldError(input, `O serial ${serial} já foi registrado como ${previous.result}.`, status);
      return;
    }
    try {
      await apiRequest(
        `/api/occurrences/${encodeURIComponent(occurrence.id)}/scans`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serial, resultado: result })
        }
      );
      occurrence.scans.unshift({
        serial,
        result,
        at: new Date().toLocaleString("pt-BR"),
      });
      status.className = "status-message success";
      status.textContent = `${serial} registrado como ${result}.`;
      input.value = "";
      input.removeAttribute("aria-invalid");
      markClean(form);
      render();
      input.focus();
    } catch (error) {
      fieldError(input, error.message, status);
    }
  };
  document.querySelector("#okScan").onclick = () => register("OK");
  document.querySelector("#ngScan").onclick = () => register("NG");
  form.onsubmit = (event) => {
    event.preventDefault();
    register("OK");
  };
  if (!occurrence.method) {
    document.querySelector("#scanGate").hidden = false;
    form
      .querySelectorAll("input, button")
      .forEach((element) => (element.disabled = true));
  }
  render();
}

// Exibe os containers vinculados ao bloqueio selecionado.
async function initContainers() {
  const host = document.querySelector("#containerContent");
  if (!host) return;
  const occurrence = await loadCurrentOccurrence(host);
  if (!occurrence) return;
  choose(occurrence.id);
  setLinks(occurrence);
  document.querySelector("#containerId").textContent = occurrence.id;
  host.innerHTML = `<article class="panel span-4"><h2>Resumo</h2><p>Bloqueado: <strong>${num(occurrence.blocked)}</strong><br>Em containers: <strong>${num(occurrence.containers.reduce((total, item) => total + item.qty, 0))}</strong></p></article><article class="panel span-8"><h2>Containers deste bloqueio</h2><div class="table-wrap"><table><thead><tr><th>Container</th><th>Quantidade</th><th>Ação</th></tr></thead><tbody>${occurrence.containers.map((container) => `<tr><td>${esc(container.id)}</td><td>${num(container.qty)}</td><td><a href="seriais.html${params(occurrence.id)}">Bipar seriais da ocorrência</a></td></tr>`).join("")}</tbody></table></div></article>`;
}

// Exibe o resumo e a próxima ação da ocorrência.
async function initDetail() {
  const host = document.querySelector("#detailContent");
  if (!host) return;
  const occurrence = await loadCurrentOccurrence(host);
  if (!occurrence) return;
  choose(occurrence.id);
  setLinks(occurrence);
  document.querySelector("#pageId").textContent = occurrence.id;
  document.querySelector("#pageTitle").textContent = occurrence.defect;
  document.querySelector("#pageSubtitle").textContent =
    `${occurrence.line} · ${occurrence.model} · ${num(occurrence.blocked)} unidades bloqueadas`;
  host.innerHTML = `<article class="panel span-8"><h2>Dados do bloqueio</h2><div class="summary-list"><div><span>Parte / processo</span><strong>${esc(occurrence.part)}</strong></div><div><span>Área solicitante</span><strong>${esc(occurrence.area)}</strong></div><div><span>Faixa válida</span><strong>${esc(occurrence.serialStart)} — ${esc(occurrence.serialEnd)}</strong></div><div><span>Responsável</span><strong>${esc(occurrence.person)}</strong></div></div><p class="detail-description"><strong>Descrição</strong><br>${esc(occurrence.description)}</p></article><aside class="panel span-4"><h2>Próxima ação</h2><div class="notice">${occurrence.method ? "Método definido. A bipagem está liberada." : "Defina o método antes de iniciar a bipagem."}</div><a class="primary action-offset" href="${occurrence.method ? "seriais" : "metodo-retrabalho"}.html${params(occurrence.id)}">${occurrence.method ? "Bipar seriais" : "Definir método"}</a></aside>`;
}

// Cadastro de usuários pela API e credenciais de primeiro acesso.
async function initUsers() {
  const dialog = document.querySelector("#userDialog");
  if (!dialog) return;
  const form = document.querySelector("#userForm");
  const rows = document.querySelector("#userRows");
  const carregarUsuarios = async () => {
    try {
      const usuarios = await apiRequest("/api/users");
      rows.innerHTML = usuarios.map((usuario) => {
        const statusUsuario = !usuario.ativo
          ? `<span class="badge pending">Inativo</span>`
          : usuario.troca_senha_obrigatoria
            ? `<span class="badge pending">Primeiro acesso pendente</span>`
            : `<span class="badge defined">Ativo</span>`;
        return `
        <tr>
          <td>
            <strong>${esc(usuario.nome)}</strong>
            <small class="cell-detail">${esc(usuario.email)}</small>
          </td>
          <td>${esc(usuario.area)}</td>
          <td>${esc(usuario.perfil)}</td>
          <td>
            ${statusUsuario}
          </td>
        </tr>
      `;
      }).join("");
      if (!usuarios.length) {
        rows.innerHTML = `
          <tr>
            <td colspan="4" class="empty">Nenhum usuário cadastrado.</td>
          </tr>
        `;
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      feedback(`Não foi possível carregar os usuários: ${error.message}`, true);
    }
  };
  await carregarUsuarios();
  const passwordDialog = document.querySelector("#temporaryPasswordDialog");
  const createdUserName = document.querySelector("#createdUserName");
  const createdUserEmail = document.querySelector("#createdUserEmail");
  const temporaryPassword = document.querySelector("#temporaryPassword");
  const copyPassword = document.querySelector("#copyTemporaryPassword");
  const finishCreation = document.querySelector("#finishUserCreation");
  const closeTemporary = document.querySelector("#closeTemporaryPassword");
  document.querySelector("#addUser").onclick = () => { form.reset(); markClean(form); dialog.showModal(); };
  document
    .querySelectorAll("[data-close-user]")
    .forEach((button) => (button.onclick = () => closeEditor(dialog, form)));
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeEditor(dialog, form); });
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: values.get("name"),
          email: values.get("email"),
          area: values.get("area"),
          perfil: values.get("profile")
        })
      });
      const resultado = await response.json();
      if (!response.ok) {
        throw new Error(resultado.mensagem || "Não foi possível criar o usuário.");
      }
      await carregarUsuarios();
      markClean(form);
      dialog.close();
      form.reset();
      createdUserName.textContent = resultado.usuario.nome;
      createdUserEmail.textContent = resultado.usuario.email;
      temporaryPassword.textContent = resultado.senha_temporaria;
      passwordDialog.showModal();
    } catch (error) {
      console.error(error);
      feedback(error.message, true);
    }
  };

  copyPassword?.addEventListener("click", async () => {
    const password = temporaryPassword.textContent.trim();
    try {
      await navigator.clipboard.writeText(password);
      copyPassword.textContent = "Senha copiada";
      setTimeout(() => { copyPassword.textContent = "Copiar senha"; }, 2000);
    } catch {
      feedback("Não foi possível copiar automaticamente. Selecione a senha e copie manualmente.", true);
    }
  });

  const fecharSenhaTemporaria = () => {
    temporaryPassword.textContent = "-";
    createdUserName.textContent = "-";
    createdUserEmail.textContent = "-";
    copyPassword.textContent = "Copiar senha";
    passwordDialog.close();
  };
  finishCreation?.addEventListener("click", fecharSenhaTemporaria);
  closeTemporary?.addEventListener("click", fecharSenhaTemporaria);
  passwordDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    fecharSenhaTemporaria();
  });
}

// Gera, imprime e exporta relatórios a partir das ocorrências salvas.
async function initReports() {
  const output = document.querySelector("#reportOutput");
  if (!output) return;
  let data = [];

  try {
    const rows = await apiRequest("/api/occurrences");
    data = rows.map(occurrenceFromApi);
  } catch (error) {
    console.error("Erro ao carregar relatórios:", error);
    feedback(
      `Não foi possível carregar os dados do relatório: ${error.message}`,
      true
    );
    return;
  }
  const start = document.querySelector("#reportStart");
  const end = document.querySelector("#reportEnd");
  const status = document.querySelector("#reportStatus");
  const line = document.querySelector("#reportLine");
  let reportData = [];
  let appliedFilters = "";
  const filterSignature = () => JSON.stringify([start.value, end.value, status.value, line.value]);
  const reportFeedback = document.querySelector("#reportFeedback");
  const validatePeriod = () => {
    if (start.value && end.value && start.value > end.value)
      return fieldError(end, "A data final deve ser igual ou posterior à data inicial. Ajuste o período e gere novamente.", reportFeedback);
    end.removeAttribute("aria-invalid");
    return true;
  };
  const requireAppliedFilters = () => {
    if (!validatePeriod()) return false;
    if (filterSignature() !== appliedFilters) {
      feedback("Os filtros foram alterados. Clique em Gerar relatório antes de exportar ou imprimir.", true, reportFeedback);
      document.querySelector("#generateReport").focus();
      return false;
    }
    return true;
  };

  [...new Set(data.map((item) => item.line))]
    .sort()
    .forEach((itemLine) => line.add(new Option(itemLine, itemLine)));

  const render = () => {
    if (!validatePeriod()) return;
    reportData = data.filter((item) => {
      const itemDate = toIsoDate(item.date);
      return (
        (!start.value || itemDate >= start.value) &&
        (!end.value || itemDate <= end.value) &&
        (status.value === "Todos" || item.status === status.value) &&
        (!line.value || item.line === line.value)
      );
    });
    const totalBlocked = reportData.reduce(
      (total, item) => total + item.blocked,
      0,
    );
    const totalPending = reportData.reduce(
      (total, item) => total + pending(item),
      0,
    );
    const totalCost = reportData.reduce(
      (total, item) => total + accumulatedCost(item),
      0,
    );
    const highPriorities = reportData.filter(
      (item) => priority(item).level === "high",
    ).length;
    document.querySelector("#reportMetrics").innerHTML = `
      <article class="metric-card"><span>Ocorrências</span><strong>${reportData.length}</strong><small>registros selecionados</small></article>
      <article class="metric-card"><span>Quantidade bloqueada</span><strong>${num(totalBlocked)}</strong><small>unidades no período</small></article>
      <article class="metric-card"><span>Quantidade pendente</span><strong>${num(totalPending)}</strong><small>unidades ainda bloqueadas</small></article>
      <article class="metric-card"><span>Custo acumulado</span><strong>${money(totalCost)}</strong><small>impacto financeiro estimado</small></article>
      <article class="metric-card"><span>Prioridade alta</span><strong>${highPriorities}</strong><small>ocorrências que exigem atenção</small></article>`;
    document.querySelector("#reportRows").innerHTML =
      reportData
        .map((item) => {
          const itemPriority = priority(item);
          return `<tr><td>${esc(item.id)}</td><td>${item.date}</td><td>${esc(item.line)}</td><td>${esc(item.model)}</td><td>${esc(item.defect)}</td><td>${num(item.blocked)}</td><td>${num(pending(item))}</td><td>${statusBadge(item)}</td><td>${money(accumulatedCost(item))}</td><td><span class="priority ${itemPriority.level}">${itemPriority.icon} ${itemPriority.label}</span></td></tr>`;
        })
        .join("") ||
      `<tr><td colspan="10" class="empty">Nenhuma ocorrência encontrada para os filtros selecionados.</td></tr>`;
    const periodStart = start.value
      ? fromIsoDate(start.value)
      : "início dos registros";
    const periodEnd = end.value ? fromIsoDate(end.value) : "fim dos registros";
    document.querySelector("#reportPeriod").textContent =
      `Período: ${periodStart} até ${periodEnd} · Status: ${status.value} · Linha: ${line.value || "Todas"}`;
    document.querySelector("#reportGeneratedAt").textContent =
      `Gerado em ${new Date().toLocaleString("pt-BR")}`;
    document.querySelector("#reportCount").textContent =
      `${reportData.length} registro(s)`;
    appliedFilters = filterSignature();
    feedback(`Relatório gerado: ${reportData.length} ocorrência(s). ${reportData.length ? "Você pode exportar CSV ou imprimir este resultado." : "Revise os filtros ou use Limpar para consultar todos os registros."}`, false, reportFeedback);
    translatePage();
  };

  [start, end, status, line].forEach((field) => field.addEventListener("input", () => {
    feedback(filterSignature() === appliedFilters ? "Os filtros correspondem ao relatório exibido." : "Filtros alterados. O resultado abaixo ainda é o anterior; clique em Gerar relatório para atualizar.", false, reportFeedback);
  }));

  document.querySelector("#generateReport").onclick = render;
  document.querySelector("#clearReport").onclick = () => {
    start.value = "";
    end.value = "";
    status.value = "Todos";
    line.value = "";
    render();
  };
  document.querySelector("#printReport").onclick = () => { if (requireAppliedFilters()) window.print(); };
  document.querySelector("#exportReport").onclick = () => {
    if (!requireAppliedFilters()) return;
    const csvCell = (value) => {
      let safeValue = String(value ?? "");
      if (/^[=+\-@]/.test(safeValue)) safeValue = `'${safeValue}`;
      return `"${safeValue.replaceAll('"', '""')}"`;
    };
    const headers = [
      "ID",
      "Data",
      "Linha",
      "Modelo",
      "Problema",
      "Bloqueada",
      "Pendente",
      "Status",
      "Custo",
      "Prioridade",
    ];
    const rows = reportData.map((item) => [
      item.id,
      item.date,
      item.line,
      item.model,
      item.defect,
      item.blocked,
      pending(item),
      item.status,
      accumulatedCost(item).toFixed(2),
      priority(item).label,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-ocorrencias-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    feedback("CSV preparado. Verifique os downloads do navegador.", false, reportFeedback);
  };
  render();
}

// Formulário em etapas para criar uma nova ocorrência.
function initNew() {
  const form = document.querySelector("#newOccurrence");
  if (!form) return;
  const step1 = document.querySelector("#step1");
  const step2 = document.querySelector("#step2");
  const stepMark1 = document.querySelector("#stepMark1");
  const stepMark2 = document.querySelector("#stepMark2");
  const rows = document.querySelector("#containerRows");
  const firstStatus = document.querySelector("#step1Status");
  const totals = document.querySelector("#containerTotals");
  let rowSequence = 0;
  const updateTotals = () => {
    const total = [...rows.querySelectorAll('[name="containerQty"]')].reduce((sum, field) => sum + Number(field.value || 0), 0);
    const blocked = Number(form.elements.blocked.value || 0);
    totals.textContent = `Quantidade bloqueada: ${num(blocked)} · Nos containers: ${num(total)} · ${total > blocked ? "Excesso" : "Falta distribuir"}: ${num(Math.abs(blocked - total))}`;
  };
  const showStep = (second) => {
    step1.hidden = second;
    step2.hidden = !second;
    stepMark1.classList.toggle("active", !second);
    stepMark2.classList.toggle("active", second);
    stepMark1.toggleAttribute("aria-current", !second);
    stepMark2.toggleAttribute("aria-current", second);
    (second ? stepMark2 : stepMark1).setAttribute("aria-current", "step");
    document.querySelector(second ? "#step2Title" : "#step1Title").focus();
    updateTotals();
  };
  const validateFirstStep = () => {
    const invalid = [...step1.querySelectorAll("input, textarea")].find((field) => !field.checkValidity());
    if (invalid) { showStep(false); invalid.reportValidity(); return false; }
    if (form.elements.serialStart.value.trim().localeCompare(form.elements.serialEnd.value.trim(), undefined, {numeric: true, sensitivity: "base"}) > 0) {
      showStep(false);
      return fieldError(form.elements.serialEnd, "O serial final deve ser igual ou posterior ao serial inicial. Revise a faixa para continuar.", firstStatus);
    }
    if (Number(form.elements.detected.value) > Number(form.elements.blocked.value)) {
      showStep(false);
      return fieldError(form.elements.detected, "A quantidade detectada não pode superar a quantidade bloqueada. Revise essas duas quantidades.", firstStatus);
    }
    firstStatus.textContent = "";
    return true;
  };
  const addRow = (focus = false) => {
    const rowId = ++rowSequence;
    const row = document.createElement("div");
    row.className = "container-row";
    row.innerHTML = `<div class="field"><label for="containerId${rowId}">Container ${rowId} *</label><input id="containerId${rowId}" name="containerId" required></div><div class="field"><label for="containerQty${rowId}">Quantidade *</label><input id="containerQty${rowId}" name="containerQty" type="number" min="1" required></div><button type="button" class="danger" aria-label="Remover container ${rowId}">Remover</button>`;
    row.querySelector("button").onclick = () => {
      const filled = [...row.querySelectorAll("input")].some((field) => field.value);
      if (filled && !window.confirm(`Remover o container ${row.querySelector("input").value || rowId} deste cadastro? A quantidade precisará ser redistribuída.`)) return;
      row.remove();
      updateTotals();
      document.querySelector("#addContainer").focus();
    };
    rows.appendChild(row);
    updateTotals();
    if (focus) row.querySelector("input").focus();
  };
  addRow();
  rows.addEventListener("input", updateTotals);
  document.querySelector("#addContainer").onclick = () => addRow(true);
  document.querySelector("#nextStep").onclick = () => {
    if (validateFirstStep()) showStep(true);
  };
  document.querySelector("#backStep").onclick = () => {
    showStep(false);
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!validateFirstStep()) return;
    if (step2.hidden) { showStep(true); return; }
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const data = read();
    const serialStart = values.get("serialStart").trim();
    const serialEnd = values.get("serialEnd").trim();
    const blocked = Number(values.get("blocked"));
    const detected = Number(values.get("detected"));
    const currentIds = data
      .map((item) => Number(item.id.split("-")[1]))
      .filter(Number.isFinite);
    const id = `RW-${String(Math.max(0, ...currentIds) + 1).padStart(3, "0")}`;
    const containers = values.getAll("containerId").map((value, index) => ({
      id: value,
      qty: Number(values.getAll("containerQty")[index]),
    }));
    const occurrence = {
      id,
      date: new Date().toLocaleDateString("pt-BR"),
      line: values.get("line"),
      part: values.get("part"),
      defect: values.get("defect"),
      description: values.get("description"),
      serialStart,
      serialEnd,
      blocked,
      model: values.get("model"),
      area: values.get("area"),
      detected,
      classification: values.get("classification"),
      department: values.get("department"),
      person: values.get("person"),
      cause: values.get("cause"),
      method: values.get("method"),
      containerHourlyCost: Number(values.get("containerHourlyCost") || 0),
      salesDelayHourlyCost: Number(values.get("salesDelayHourlyCost") || 0),
      createdAt: new Date().toISOString(),
      status: "Pendente",
      containers,
      scans: [],
    };
    const newStatus = document.querySelector("#newStatus");
    if (
      serialStart.localeCompare(serialEnd, undefined, {
        numeric: true,
        sensitivity: "base",
      }) > 0
    ) {
      newStatus.textContent =
        "O serial final deve ser igual ou posterior ao serial inicial.";
      return;
    }
    if (detected > blocked) {
      newStatus.textContent =
        "A quantidade detectada não pode superar a quantidade bloqueada.";
      return;
    }
    if (
      containers.reduce((total, item) => total + item.qty, 0) !==
      occurrence.blocked
    ) {
      newStatus.textContent =
        "A soma dos containers deve ser igual à quantidade bloqueada.";
      (rows.querySelector('[name="containerQty"]') || document.querySelector("#addContainer")).focus();
      return;
    }
    try {
      const response = await fetch("/api/occurrences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linha: values.get("line"),
          modelo: values.get("model"),

          parte_processo: values.get("part"),
          defeito: values.get("defect"),
          descricao_problema: values.get("description"),

          serial_inicial: serialStart,
          serial_final: serialEnd,

          quantidade_bloqueada: blocked,
          quantidade_detectada: detected,

          area_solicitante: values.get("area"),

          status: "Pendente",

          custo_container_hora:
            Number(values.get("containerHourlyCost") || 0),

          custo_atraso_venda_hora:
            Number(values.get("salesDelayHourlyCost") || 0),

          containers: containers
        }),
      });
      const resultado = await response.json();
      if (!response.ok) {
        throw new Error(resultado.mensagem || "Erro ao criar ocorrência");
      }
      markClean(form);
      feedback(
        `Ocorrência ${resultado.protocolo} criada com sucesso no banco de dados.`,
        false,
        newStatus
      );
      console.log(resultado);
    } catch (error) {
      console.error(error);
      feedback(
        `Não foi possível criar a ocorrência: ${error.message}`,
        true,
        newStatus
      );
    }
  };
}

// Inicializa somente os recursos existentes na página aberta.
document.addEventListener("DOMContentLoaded", async () => {
  initPreferences();
  if (initLogin()) {
    translatePage();
    return;
  }
  const page = location.pathname.split("/").pop();
  if (page === "alterar-senha.html") {
    initChangePassword();
    translatePage();
    return;
  }
  const usuario = await validarSessaoDaPagina();
  if (!usuario) {
    return;
  }
  const activeProfile = usuario.perfil;
  if (activeProfile === "Produção" && page !== "dashboard.html") {
    location.replace("dashboard.html");
    return;
  }
  const allowedPages = {
    Engenharia: [
      "dashboard.html",
      "ocorrencias.html",
      "metodo-retrabalho.html",
    ],
    Expedição: ["dashboard.html", "ocorrencias.html"],
  };
  if (
    allowedPages[activeProfile] &&
    !allowedPages[activeProfile].includes(page)
  ) {
    location.replace("dashboard.html");
    return;
  }
  renderShell();
  bindGlobal();
  initDashboard();
  initOccurrences();
  initNew();
  initDetail();
  initMethod();
  initScans();
  initContainers();
  initUsers();
  initReports();
  initContextHelp();
  initFormGuidance();
  translatePage();
});
