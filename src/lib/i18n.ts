export type Locale = "pt-BR";

export type TranslateParams = Record<string, string | number>;
export type Translate = (
  key: string,
  params?: TranslateParams,
  fallback?: string,
) => string;

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const SUPPORTED_LOCALES: Locale[] = ["pt-BR"];

const MESSAGES = {
  "pt-BR": {
    notFound: {
      tag: "Erro 404",
      title: "Rota não encontrada",
      description: "A página que você tentou acessar não está disponível.",
      cta: "Ir para o cronograma",
    },
    login: {
      loading: "Carregando login...",
      errorDefault:
        "Não foi possível entrar com email e senha. Verifique os dados e tente novamente.",
      brand: "Leads & Tickets",
      heading: "Acesse o painel seguro",
      subheading:
        "Entre para visualizar dashboards e métricas privadas sem flicker.",
      sessionHint:
        "Sessões são preservadas com cookies seguros. Faça login para acessar o dashboard.",
      title: "Faça login",
      subtitle: "Entre com email e senha.",
      emailLabel: "Email",
      emailPlaceholder: "seu@email.com",
      passwordLabel: "Senha",
      passwordPlaceholder: "********",
      signingIn: "Entrando...",
      signIn: "Entrar",
    },
    header: {
      brandName: "Veneza Field Service",
      logoAlt: "Logo do Veneza Field Service",
      menuOpen: "Abrir menu",
      menuClose: "Fechar menu",
      menuLabel: "Menu",
      userGreeting: "{name}",
      userFallback: "Usuário",
      signOut: "Sair",
      nav: {
        schedule: "Cronograma",
        metrics: "Métricas",
      },
    },
    auth: {
      logoutError: "Não foi possível encerrar a sessão. Tente novamente.",
      logoutSuccess: "Você saiu da sua conta com segurança.",
    },
    schedule: {
      title: "Cronograma semanal",
      subtitle: "Agendamentos reais carregados do Supabase por semana.",
      tabSchedule: "Cronograma",
      tabCompanies: "Empresas",
      appointmentsCount: "{count} agendamentos",
      companiesCount: "{count} empresas",
      zoomOut: "Diminuir zoom da semana",
      zoomIn: "Aumentar zoom da semana",
      zoomLabel: "Zoom",
      prevMonth: "Mês anterior",
      nextMonth: "Próximo mês",
      timeLabel: "Hora",
      viewBoard: "Quadro",
      viewMap: "Mapa",
      closeCreate: "Fechar criação",
      createAppointment: "Criar apontamento",
      selectWeek: "Selecionar semana",
      weekOf: "Semana de {label}",
      today: "Hoje",
      actual: "Real",
      scheduleLabel: "Cronograma",
      companiesLabel: "Empresas",
      consultant: "Consultor",
      search: "Busca",
      searchPlaceholderWithConsultant:
        "Buscar por empresa, documento ou carteira",
      searchPlaceholderNoConsultant: "Selecione um consultor",
      orderBy: "Ordenar",
      orderByName: "Nome",
      orderByPreventivas: "Preventivas",
      orderByReconexoes: "Reconexões",
      orderByQuotes: "Cotações abertas",
      orderByLastVisit: "Dias desde última visita",
      lastVisitDays: "Última visita (dias)",
      paginationSummary: "Mostrando {start}-{end} de {total}",
      paginationPage: "Página {page} de {total}",
      paginationPrev: "Anterior",
      paginationNext: "Próxima",
      emptyConsultant: "Nenhum consultor",
      selectConsultantToViewCompanies:
        "Selecione um consultor para ver as empresas.",
      noCompaniesFound: "Nenhuma empresa encontrada com esses filtros.",
      companyDocumentMissing: "Documento não informado",
      noState: "Sem estado",
      noCsa: "Sem CSA",
      noCarteira: "Sem carteira",
      noCarteira2: "Sem carteira 2",
      noClass: "Sem classe",
      noClientClass: "Sem classe cliente",
      noReference: "Sem referência",
      noValidation: "Sem validação",
      noData: "Sem dados",
      noVisits: "Sem visitas",
      loading: "Carregando...",
      loadingSchedule: "Carregando cronograma...",
      loadingCompanies: "Carregando empresas...",
      protheusLoadError: "Não foi possível carregar oportunidades.",
      quotesLoadError: "Não foi possível carregar os valores de cotação.",
      lastVisitLoadError:
        "Não foi possível carregar as últimas visitas concluídas.",
      daySingular: "dia",
      dayPlural: "dias",
      status: {
        scheduled: "Agendado",
        in_progress: "Em execução",
        done: "Concluído",
        absent: "Ausente",
      },
      map: {
        companies: "Empresas",
        checkIns: "Check-ins",
        checkOuts: "Check-outs",
      },
      timeline: {
        title: "Linha do tempo",
        scheduled: "Agendado",
        checkIn: "Check-in",
        checkOut: "Check-out",
        pending: "Pendente",
        absent: "Ausente",
      },
      opportunity: {
        preventiva: "Preventiva",
        garantia_basica: "Garantia básica",
        garantia_estendida: "Garantia estendida",
        reforma_componentes: "Reforma de componentes",
        lamina: "Lâmina",
        dentes: "Dentes",
        rodante: "Rodante",
        disponibilidade: "Disponibilidade",
        reconexao: "Reconexão",
        transferencia_aor: "Transferência AOR",
        pops: "POPs",
        outros: "Outros",
      },
    },
    map: {
      empty: "Sem coordenadas para exibir no mapa.",
      loading: "Carregando mapa...",
      companyFallback: "Empresa",
      schedulePrefix: "Agendamento",
      checkInPrefix: "Check-in",
      checkOutPrefix: "Check-out",
    },
    createAppointment: {
      dialogLabel: "Criar apontamento",
      title: "Criar apontamento",
      subtitle:
        "Preencha os dados básicos para criar um apontamento no cronograma.",
      close: "Fechar",
      companySection: "Empresa",
      scheduleSection: "Agenda",
      selectConsultantToListCompanies:
        "Selecione um consultor para listar as empresas.",
      selectedCompany: "Empresa selecionada",
      selectCompany: "Selecione a empresa",
      selectConsultantFirst: "Selecione o consultor primeiro",
      companyDocument: "Documento",
      companyState: "Estado",
      companyCsa: "CSA",
      companyEmail: "Email CSA",
      companyPortfolio: "Carteira",
      notInformed: "Não informado",
      consultant: "Consultor",
      selectConsultant: "Selecione o consultor",
      date: "Data",
      startTime: "Horário início",
      endTime: "Horário fim",
      duration: "Duração estimada",
      timeRequired: "Informe data e horário.",
      timeInvalid: "Horário inválido.",
      timeEndAfterStart: "Horário final deve ser maior que o inicial.",
      availableCompanies: "{count} empresa(s) disponíveis",
      selectConsultantToList: "Selecione um consultor para listar empresas.",
      cancel: "Cancelar",
      creating: "Criando...",
      create: "Criar apontamento",
      createError: "Não foi possível criar o apontamento.",
      createSuccess: "Apontamento criado com sucesso.",
    },
    appointment: {
      title: "Apontamento",
      detailsTitle: "Detalhe do apontamento",
      loadingDetails: "Carregando detalhes...",
      loading: "Carregando apontamento...",
      notFound: "Apontamento não encontrado.",
      notFoundShort: "Não encontrado",
      errorLoading: "Erro ao carregar",
      loadError: "Não foi possível carregar o apontamento.",
      mediaLoadError: "Não foi possível carregar as imagens.",
      backToSchedule: "Voltar ao cronograma",
      companyMissing: "Empresa não informada",
      address: "Endereço",
      consultant: "Consultor",
      notInformed: "Não informado",
      notes: "Notas",
      opportunities: "Oportunidades percebidas",
      absenceRegistered: "Ausência registrada",
      reason: "Motivo",
      notesShort: "Obs",
      mediaTitle: "Imagens do apontamento",
      mediaExpire: "URLs expiram em 60s",
      mediaRefresh: "Atualizar imagens",
      mediaLoading: "Carregando imagens...",
      mediaEmpty: "Nenhuma imagem registrada neste apontamento.",
      mediaCount: "{count} imagem(ns)",
      attachment: "Arquivo",
      openAttachment: "Abrir anexo",
      attachmentUnavailable: "Anexo indisponível",
      timestampUnknown: "Data não informada",
      mediaKind: {
        checkin: "Check-in",
        checkout: "Check-out",
        absence: "Ausência",
        other: "Outros",
      },
    },
    company: {
      title: "Empresa",
      loading: "Carregando empresa...",
      loadingData: "Carregando dados...",
      notFound: "Empresa não encontrada.",
      backToSchedule: "Voltar ao cronograma",
      createAppointment: "Criar apontamento",
      documentMissing: "Documento não informado",
      appointmentsLoadError: "Não foi possível carregar os apontamentos.",
      quotesLoadError: "Não foi possível carregar os orçamentos.",
      opportunitiesLoadError: "Não foi possível carregar oportunidades.",
      quoteFallback: "Sem",
      noDate: "Sem data",
      noFutureSchedule: "Sem agenda futura",
      appointmentsCount: "{count} apontamentos",
      info: {
        name: "Empresa",
        document: "Documento",
        state: "Estado",
        csa: "CSA",
        emailCsa: "Email CSA",
        carteira: "Carteira",
        carteira2: "Carteira 2",
        class: "Classe",
        clientClass: "Classe cliente",
        validation: "Validação",
        reference: "Referência",
        coordinates: "Coordenadas",
      },
      noState: "Sem estado",
      noCsa: "Sem CSA",
      noEmailCsa: "Sem email CSA",
      noCarteira: "Sem carteira",
      noCarteira2: "Sem carteira 2",
      noClass: "Sem classe",
      noClientClass: "Sem classe cliente",
      noValidation: "Sem validação",
      noReference: "Sem referência",
      noCoordinates: "Não informado",
      opportunities: "Oportunidades",
      opportunityTabQuotes: "Cotação",
      opportunityTabPreventive: "Preventiva",
      opportunityTabReconnect: "Reconexão",
      quotesCount: "{count} orçamentos",
      itemsCount: "{count} itens",
      refresh: "Atualizar",
      loadingQuotes: "Carregando orçamentos...",
      noQuotes: "Nenhum orçamento encontrado para esta empresa.",
      quote: "Orçamento",
      branch: "Filial",
      date: "Data",
      consultant: "Consultor",
      definition: "Definição",
      class: "Classe",
      client: "Cliente",
      noConsultant: "Não informado",
      noDefinition: "Sem definição",
      noClassValue: "Sem classe",
      noClient: "Sem cliente",
      itemsTitle: "Itens do orçamento",
      item: "Item",
      quantity: "Qtd",
      value: "Valor",
      itemNoDescription: "Item sem descrição",
      sourceProtheus: "Fonte: Protheus",
      loadingOpportunities: "Carregando oportunidades...",
      noOpportunities: "Nenhuma oportunidade encontrada para esta empresa.",
      serie: "Série",
      appointmentsTitle: "Apontamentos",
      recordsCount: "{count} registros",
      loadingAppointments: "Carregando apontamentos...",
      noAppointments: "Nenhum apontamento registrado para esta empresa.",
      appointmentFallback: "Apontamento",
      appointmentSummary: "Resumo dos apontamentos",
      summaryTotal: "{count} total",
      summaryDone: "{count} concluídos",
      summaryInProgress: "{count} em execução",
      summaryPending: "{count} pendentes",
      summaryAbsent: "{count} ausentes",
      address: "Endereço",
      absence: "Ausência",
      emptyMap: "Sem coordenadas deste cliente.",
    },
  },
} as const;

export type Messages = (typeof MESSAGES)[Locale];

const resolveLocale = (value: string | null | undefined): Locale => {
  if (!value) return DEFAULT_LOCALE;
  const normalized = value.trim().replace("_", "-").toLowerCase();
  if (normalized.startsWith("pt")) return "pt-BR";
  return DEFAULT_LOCALE;
};

type HeaderSource =
  | Headers
  | { get?: (name: string) => string | null }
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

const readHeader = (source: HeaderSource, name: string): string | null => {
  if (!source) return null;
  if (typeof (source as Headers).get === "function") {
    return (source as Headers).get(name);
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(source)) {
    if (key.toLowerCase() !== target) continue;
    if (Array.isArray(value)) return value.join(",");
    return value ?? null;
  }
  return null;
};

export const getLocaleFromHeaders = (headers: HeaderSource): Locale => {
  const header = readHeader(headers, "accept-language");
  if (!header) return DEFAULT_LOCALE;
  const parts = header.split(",").map((part) => part.trim());
  for (const part of parts) {
    const lang = part.split(";")[0]?.trim();
    if (!lang) continue;
    const locale = resolveLocale(lang);
    if (SUPPORTED_LOCALES.includes(locale)) return locale;
  }
  return DEFAULT_LOCALE;
};

export const getMessages = (locale: Locale): Messages =>
  MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];

const getMessageValue = (
  messages: Messages,
  key: string,
): string | undefined => {
  const parts = key.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
};

export const createTranslator = (messages: Messages): Translate => {
  const fallbackMessages = getMessages(DEFAULT_LOCALE);
  return (key, params, fallback) => {
    const template =
      getMessageValue(messages, key) ??
      getMessageValue(fallbackMessages, key);
    if (!template) return fallback ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, token) =>
      token in params ? String(params[token]) : "",
    );
  };
};
