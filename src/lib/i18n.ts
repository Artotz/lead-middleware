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
      logoAlt: "Logo do JD",
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
        appointments: "Agendamentos",
        companies: "Empresas",
        dashboard: "Dashboard",
        metrics: "Métricas",
      },
    },
    auth: {
      loginRequired: "Faça login para acessar o painel.",
      logoutError: "Não foi possível encerrar a sessão. Tente novamente.",
      logoutSuccess: "Você saiu da sua conta com segurança.",
    },
    schedule: {
      title: "Cronograma semanal",
      subtitle: "Agendamentos reais carregados do Supabase por semana.",
      tabSchedule: "Cronograma",
      tabCompanies: "Empresas",
      tabDashboard: "Dashboard",
      appointmentsCount: "{count} agendamentos",
      companiesCount: "{count} empresas",
      appointmentsControlsHint: "2 filtros e 1 ordenacao",
      appointmentsSearchPlaceholder: "Buscar por empresa, consultor ou status",
      statusFilterLabel: "Status",
      statusAll: "Todos",
      statusFilterSearchPlaceholder: "Buscar status...",
      statusFilterNoResults: "Nenhum status encontrado.",
      multiSelectSelectedCount: "{count} selecionados",
      opportunityFilterLabel: "Oportunidade",
      opportunityAll: "Todas",
      opportunityFilterSearchPlaceholder: "Buscar oportunidade...",
      opportunityFilterNoResults: "Nenhuma oportunidade encontrada.",
      zoomOut: "Diminuir zoom da semana",
      zoomIn: "Aumentar zoom da semana",
      zoomLabel: "Zoom",
      prevMonth: "Mês anterior",
      nextMonth: "Próximo mês",
      timeLabel: "Hora",
      viewBoard: "Agenda",
      viewGrid: "Quadro",
      viewMap: "Mapa",
      closeCreate: "Fechar criação",
      createAppointment: "Criar apontamento",
      createAppointmentDisabled:
        "Somente administradores podem criar apontamentos.",
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
      outsidePortfolioToggle: "Fora Carteira?",
      showCanceledToggle: "Mostrar cancelados?",
      orderBy: "Ordenar",
      orderByName: "Nome",
      orderByPreventivas: "Preventivas",
      orderByReconexoes: "Reconexões",
      orderByQuotes: "Cotações abertas",
      orderByLastVisit: "Dias desde última visita",
      appointmentSortLabel: "Ordenar agendamentos",
      appointmentSortDateAsc: "Data (mais antigos)",
      appointmentSortDateDesc: "Data (mais recentes)",
      appointmentSortAlphaAsc: "Empresa (A-Z)",
      appointmentSortAlphaDesc: "Empresa (Z-A)",
      lastVisitDays: "Última visita (dias)",
      paginationSummary: "Mostrando {start}-{end} de {total}",
      paginationPage: "Página {page} de {total}",
      paginationPrev: "Anterior",
      paginationNext: "Próxima",
      emptyConsultant: "Nenhum consultor",
      selectConsultantToViewCompanies:
        "Selecione um consultor para ver as empresas.",
      selectConsultantToViewAppointments:
        "Selecione um consultor para ver os agendamentos.",
      noCompaniesFound: "Nenhuma empresa encontrada com esses filtros.",
      appointmentsLoadError: "Não foi possível carregar os agendamentos.",
      noAppointmentsFound: "Nenhum agendamento encontrado com esses filtros.",
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
      noAppointmentsDay: "Sem agendamentos",
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
        absent: "Cancelado",
        atuado: "Atuado",
      },
      statusExpired: "Expirado",
      appointmentList: {
        company: "Empresa",
        consultant: "Consultor",
        date: "Data",
        time: "Horario",
        status: "Status",
        opportunities: "Oportunidades",
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
        absent: "Cancelado",
      },
      opportunity: {
        preventiva: "Preventiva",
        garantia_basica: "Garantia básica",
        garantia_estendida: "Garantia estendida",
        reforma_componentes: "Reforma de componentes",
        lamina: "Lâmina",
        dentes: "Dentes",
        rodante: "Rodante",
        pneus: "Pneus",
        pecas: "Peças",
        disponibilidade: "Disponibilidade",
        reconexao: "Reconexão",
        transferencia_aor: "Transferência AOR",
        pops: "POPs",
        outros: "Outros",
      },
      dashboard: {
        scopeLabel: "Escopo",
        scopeGeneral: "Geral",
        scopeIndividual: "Individual",
        allConsultants: "Todos os consultores",
        viewLabel: "Visualizacao",
        viewWeek: "Semana",
        viewMonth: "Mes",
        viewYear: "Ano",
        scopeHintGeneral: "Visão consolidada do período selecionado.",
        scopeHintIndividual: "Visão do consultor selecionado.",
        period: "Período {start} - {end}",
        periodMonth: "Mes {month}",
        periodYear: "Ano {year}",
        noDataPeriod: "Sem dados no período.",
        loading: "Carregando dashboard...",
        activitiesLoading: "Carregando atividades...",
        loadError: "Não foi possível carregar o dashboard.",
        loadCompaniesError:
          "Não foi possível carregar as empresas do dashboard.",
        activitiesLoadError: "Não foi possível carregar as atividades.",
        retry: "Tentar novamente",
        prevYear: "Ano anterior",
        nextYear: "Proximo ano",
        noData: "Sem dados disponíveis para o período.",
        noChartData: "Sem dados suficientes para o gráfico.",
        selectConsultant: "Selecione um consultor para ver o dashboard.",
        unknownConsultant: "Consultor não informado",
        noState: "Sem estado",
        durationHoursMinutes: "{hours}h{minutes}m",
        durationHours: "{hours}h",
        durationMinutes: "{minutes}m",
        cards: {
          appointments: "Apontamentos",
          companies: "Empresas",
          avgRealDuration: "Duração média real",
          avgVisitsPerDay: "Média de visitas/dia",
          doneRate: "Concluídos",
          absentRate: "Cancelados",
        },
        charts: {
          appointmentsByDay: "Apontamentos por dia",
          appointmentsByPeriod: "Apontamentos por periodo",
          consultantVisitsByDay: "Visitas por dia por consultor",
          consultantAvgVisitsPerDay: "Média de visitas/dia por consultor",
          consultantAvgVisitsPerPeriod:
            "Media de visitas por periodo por consultor",
          statusDistribution: "Distribuição por status",
          topConsultants: "Visitas no Período",
          opportunitiesByType: "Oportunidades por tipo",
          activitiesByType: "Atividades por tipo",
          activitiesByConsultant: "Atividades por consultor",
          companiesByState: "Empresas por estado",
        },
        legendTitle: "Legenda",
        tooltip: {
          appointments: "Apontamentos",
          totalAppointments: "Total de apontamentos",
          companies: "Empresas",
          totalCompanies: "Total de empresas",
          avgVisits: "Média de visitas/dia",
          opportunities: "Oportunidades",
          totalOpportunities: "Total de oportunidades",
          activities: "Atividades",
          totalActivities: "Total de atividades",
          consultantLabel: "Consultor: {name}",
          statusLabel: "Status: {name}",
          opportunityTypeLabel: "Tipo de oportunidade: {name}",
          activityTypeLabel: "Tipo de atividade: {name}",
          stateLabel: "Estado: {name}",
        },
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
      outsidePortfolio: "Fora Carteira?",
      pickOrCreateCompany: "Escolha uma empresa ou insira uma nova.",
      companySearchLabel: "Buscar empresa",
      companySearchPlaceholder: "Digite para filtrar por nome",
      newCompanyLabel: "Ou insira o nome da nova empresa",
      newCompanyPlaceholder: "Digite o nome da empresa",
      newCompanyPreview:
        "Empresa fora de carteira sera criada apenas com nome.",
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
      creationNotesLabel: "Notas da sugestão",
      creationNotesPlaceholder: "Explique o motivo ou contexto da criação",
      availableCompanies: "{count} empresa(s) disponíveis",
      selectConsultantToList: "Selecione um consultor para listar empresas.",
      cancel: "Cancelar",
      creating: "Criando...",
      create: "Criar apontamento",
      permissionDenied: "Somente administradores podem criar apontamentos.",
      companyNameRequired: "Informe o nome da empresa.",
      createCompanyError: "Nao foi possivel criar a empresa.",
      createError: "Não foi possível criar o apontamento.",
      createSuccess: "Apontamento criado com sucesso.",
      pastNotAllowed: "Nao e possivel criar apontamento no passado.",
      collisionError: "Ja existe um apontamento para esse horario.",
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
      companyMissing: "Empresa não informada",
      openCompany: "Abrir empresa",
      address: "Endereço",
      consultant: "Consultor",
      createdBy: "Criado por",
      createdAt: "Registrado em {date} · {time}",
      latestContact: "Contato mais recente",
      noCompanyContact: "Nenhum contato registrado",
      notInformed: "Não informado",
      notes: "Notas",
      creationNotes: "Notas da sugestão",
      opportunities: "Oportunidades percebidas",
      absenceRegistered: "Cancelamento registrado",
      reason: "Motivo",
      notesShort: "Obs",
      activitiesTitle: "Atividades realizadas",
      activityCount: "{count} registro(s)",
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
        absence: "Cancelamento",
        registro: "Registro",
        other: "Outros",
      },
      activity: {
        reconexao: "Reconexão",
        medicao_mr: "Medição MR",
        proposta_preventiva: "Proposta Preventiva",
        proposta_powergard: "Proposta Powergard",
        outro: "Outro",
      },
      action: {
        button: "Gerar ação",
        addButton: "Registrar nova ação",
        registered: "Ação registrada",
        dialogLabel: "Registrar ação",
        dialogTitle: "Registrar ação",
        dialogSubtitle:
          "Registre a ação realizada após a visita para atualizar o status.",
        sectionTitle: "Atuação",
        count: "{count} registro(s)",
        loading: "Carregando atuação...",
        empty: "Nenhuma atuação registrada.",
        createdByLabel: "Registrado por",
        createdAt: "Registrado em {date} · {time}",
        resultLabel: "Resultado",
        resultPlaceholder: "Selecione o resultado",
        resultSold: "Vendido",
        resultLost: "Perdido",
        opportunityTypeLabel: "Tipo da oportunidade",
        opportunityTypePlaceholder: "Selecione o tipo",
        nfOsLabel: "NF ou OS",
        nfOsPlaceholder: "Informe o número da NF ou OS",
        valueLabel: "Valor",
        valuePlaceholder: "Informe o valor da venda",
        lossReasonLabel: "Motivo da perda",
        lossReasonPlaceholder: "Selecione o motivo",
        noteLabel: "Observação",
        notePlaceholder: "Descreva a ação realizada (opcional)",
        cancel: "Cancelar",
        confirm: "Registrar",
        saving: "Registrando...",
        resultRequired: "Selecione o resultado.",
        opportunityTypeRequired: "Selecione o tipo da oportunidade.",
        opportunityTypeColumnMissing:
          "A coluna tipo_oportunidade ainda não existe no banco.",
        singleActionConstraint:
          "O banco ainda está limitando a uma ação por apontamento.",
        nfOsRequired: "Informe o número da NF ou OS.",
        valueRequired: "Informe o valor da venda.",
        lossReasonRequired: "Selecione o motivo da perda.",
        loadError: "Não foi possível registrar a ação.",
        doneRequired: "Disponível após concluir a visita",
        lossReasons: {
          preco_da_peca: "Preço da peça",
          preco_da_mao_de_obra: "Preço da mão de obra",
          preco_do_deslocamento: "Preço do deslocamento",
          indisponibilidade_tecnica: "Indisponibilidade técnica",
          indisponibilidade_de_peca: "Indisponibilidade de peça",
          experiencia_anterior_negativa: "Experiência anterior negativa",
          mao_de_obra_propria: "Mão de obra própria",
          mao_de_obra_terceirizada: "Mão de obra terceirizada",
          postergou_o_servico: "Postergou o serviço",
          pendencia_financeira: "Pendência financeira",
          falta_de_flexibilidade_comercial: "Falta de flexibilidade comercial",
        },
      },
    },
    company: {
      title: "Empresa",
      loading: "Carregando empresa...",
      loadingData: "Carregando dados...",
      notFound: "Empresa não encontrada.",
      createAppointment: "Criar apontamento",
      createAppointmentDisabled:
        "Somente administradores podem criar apontamentos.",
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
      value: "Valor Final",
      itemNoDescription: "Item sem descrição",
      sourceProtheus: "Fonte: Protheus",
      loadingOpportunities: "Carregando oportunidades...",
      noOpportunities: "Nenhuma oportunidade encontrada para esta empresa.",
      serie: "Série",
      appointmentsTitle: "Apontamentos",
      recordsCount: "{count} registros",
      contactsTitle: "Contatos da empresa",
      contactsCount: "{count} contato(s)",
      contactsLoading: "Carregando contatos...",
      companyContactsLoadError: "Não foi possível carregar os contatos.",
      noContacts: "Nenhum contato registrado para esta empresa.",
      contactNameFallback: "Contato sem nome",
      contactInfo: "Contato",
      contactInfoFallback: "Não informado",
      loadingAppointments: "Carregando apontamentos...",
      noAppointments: "Nenhum apontamento registrado para esta empresa.",
      appointmentFallback: "Apontamento",
      appointmentSummary: "Resumo dos apontamentos",
      summaryTotal: "{count} total",
      summaryDone: "{count} concluídos",
      summaryInProgress: "{count} em execução",
      summaryPending: "{count} pendentes",
      summaryAbsent: "{count} cancelados",
      address: "Endereço",
      absence: "Cancelado",
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
      getMessageValue(messages, key) ?? getMessageValue(fallbackMessages, key);
    if (!template) return fallback ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, token) =>
      token in params ? String(params[token]) : "",
    );
  };
};

