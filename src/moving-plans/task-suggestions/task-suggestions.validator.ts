import { BadGatewayException, Injectable } from '@nestjs/common';
import { RawLlmTaskSuggestion } from '../../ai/ports/llm.port.js';
import { TaskSuggestionItemResponse } from './dto/task-suggestions-response.dto.js';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCalendarDate(dateString: string): boolean {
  if (!ISO_DATE_REGEX.test(dateString)) {
    return false;
  }
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function preserveCase(original: string, replacement: string): string {
  if (
    original === original.toUpperCase() &&
    original !== original.toLowerCase()
  ) {
    return replacement.toUpperCase();
  }

  const origWords = original.trim().split(/\s+/).filter(Boolean);
  const replWords = replacement.trim().split(/\s+/).filter(Boolean);

  if (origWords.length === replWords.length && origWords.length > 1) {
    return replWords
      .map((w, i) => {
        const ow = origWords[i];
        if (ow[0] === ow[0].toUpperCase() && ow[0] !== ow[0].toLowerCase()) {
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }
        return w.toLowerCase();
      })
      .join(' ');
  }

  if (
    original[0] === original[0].toUpperCase() &&
    original[0] !== original[0].toLowerCase()
  ) {
    return (
      replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase()
    );
  }

  return replacement.toLowerCase();
}

export function normalizePtBrText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = text;

  // 1. Phrasal European Portuguese contractions with "morada" to preserve grammatical gender agreement
  const phrasalMoradaRules = [
    // Preposition + Possessive + morada + trailing adjective
    {
      pattern: 'na\\s+sua\\s+morada\\s+atualizada',
      replacement: 'no seu endereço atualizado',
    },
    {
      pattern: 'da\\s+sua\\s+morada\\s+atualizada',
      replacement: 'do seu endereço atualizado',
    },
    {
      pattern: 'à\\s+sua\\s+morada\\s+atualizada',
      replacement: 'ao seu endereço atualizado',
    },
    {
      pattern: 'a\\s+sua\\s+morada\\s+atualizada',
      replacement: 'o seu endereço atualizado',
    },
    {
      pattern: 'sua\\s+morada\\s+atualizada',
      replacement: 'seu endereço atualizado',
    },
    {
      pattern: 'na\\s+minha\\s+morada\\s+atualizada',
      replacement: 'no meu endereço atualizado',
    },
    {
      pattern: 'da\\s+minha\\s+morada\\s+atualizada',
      replacement: 'do meu endereço atualizado',
    },
    {
      pattern: 'minha\\s+morada\\s+atualizada',
      replacement: 'meu endereço atualizado',
    },
    {
      pattern: 'na\\s+nossa\\s+morada\\s+atualizada',
      replacement: 'no nosso endereço atualizado',
    },
    {
      pattern: 'da\\s+nossa\\s+morada\\s+atualizada',
      replacement: 'do nosso endereço atualizado',
    },
    {
      pattern: 'nossa\\s+morada\\s+atualizada',
      replacement: 'nosso endereço atualizado',
    },

    // Preposition + Possessive + morada + other known feminine adjectives
    {
      pattern: 'na\\s+minha\\s+morada\\s+antiga',
      replacement: 'no meu endereço antigo',
    },
    {
      pattern: 'da\\s+minha\\s+morada\\s+antiga',
      replacement: 'do meu endereço antigo',
    },
    {
      pattern: 'minha\\s+morada\\s+antiga',
      replacement: 'meu endereço antigo',
    },
    {
      pattern: 'para\\s+a\\s+nossa\\s+morada\\s+definitiva',
      replacement: 'para o nosso endereço definitivo',
    },
    {
      pattern: 'na\\s+nossa\\s+morada\\s+definitiva',
      replacement: 'no nosso endereço definitivo',
    },
    {
      pattern: 'nossa\\s+morada\\s+definitiva',
      replacement: 'nosso endereço definitivo',
    },

    // General with known trailing adjectives
    {
      pattern: 'moradas?\\s+atualizadas?',
      replacement: 'endereço atualizado',
    },
    {
      pattern: 'moradas?\\s+antigas?',
      replacement: 'endereço antigo',
    },
    {
      pattern: 'moradas?\\s+definitivas?',
      replacement: 'endereço definitivo',
    },
    {
      pattern: 'moradas?\\s+confirmadas?',
      replacement: 'endereço confirmado',
    },
    {
      pattern: 'moradas?\\s+provisorias?',
      replacement: 'endereço provisório',
    },
    {
      pattern: 'moradas?\\s+corretas?',
      replacement: 'endereço correto',
    },
    {
      pattern: 'moradas?\\s+completas?',
      replacement: 'endereço completo',
    },

    // Preposition + Possessive + morada
    { pattern: 'na\\s+sua\\s+morada', replacement: 'no seu endereço' },
    { pattern: 'da\\s+sua\\s+morada', replacement: 'do seu endereço' },
    { pattern: 'à\\s+sua\\s+morada', replacement: 'ao seu endereço' },
    { pattern: 'a\\s+sua\\s+morada', replacement: 'o seu endereço' },
    { pattern: 'sua\\s+morada', replacement: 'seu endereço' },
    { pattern: 'nas\\s+suas\\s+moradas', replacement: 'nos seus endereços' },
    { pattern: 'das\\s+suas\\s+moradas', replacement: 'dos seus endereços' },
    { pattern: 'às\\s+suas\\s+moradas', replacement: 'aos seus endereços' },
    { pattern: 'as\\s+suas\\s+moradas', replacement: 'os seus endereços' },
    { pattern: 'suas\\s+moradas', replacement: 'seus endereços' },

    { pattern: 'na\\s+minha\\s+morada', replacement: 'no meu endereço' },
    { pattern: 'da\\s+minha\\s+morada', replacement: 'do meu endereço' },
    { pattern: 'à\\s+minha\\s+morada', replacement: 'ao meu endereço' },
    { pattern: 'a\\s+minha\\s+morada', replacement: 'o meu endereço' },
    { pattern: 'minha\\s+morada', replacement: 'meu endereço' },
    { pattern: 'nas\\s+minhas\\s+moradas', replacement: 'nos meus endereços' },
    { pattern: 'das\\s+minhas\\s+moradas', replacement: 'dos meus endereços' },
    { pattern: 'minhas\\s+moradas', replacement: 'meus endereços' },

    { pattern: 'na\\s+nossa\\s+morada', replacement: 'no nosso endereço' },
    { pattern: 'da\\s+nossa\\s+morada', replacement: 'do nosso endereço' },
    { pattern: 'à\\s+nossa\\s+morada', replacement: 'ao nosso endereço' },
    { pattern: 'a\\s+nossa\\s+morada', replacement: 'o nosso endereço' },
    { pattern: 'nossa\\s+morada', replacement: 'nosso endereço' },
    { pattern: 'nas\\s+nossas\\s+moradas', replacement: 'nos nossos endereços' },
    { pattern: 'das\\s+nossas\\s+moradas', replacement: 'dos nossos endereços' },
    { pattern: 'nossas\\s+moradas', replacement: 'nossos endereços' },

    // Demonstratives
    { pattern: 'nesta\\s+morada', replacement: 'neste endereço' },
    { pattern: 'desta\\s+morada', replacement: 'deste endereço' },
    { pattern: 'esta\\s+morada', replacement: 'este endereço' },
    { pattern: 'nestas\\s+moradas', replacement: 'nestes endereços' },
    { pattern: 'destas\\s+moradas', replacement: 'destes endereços' },
    { pattern: 'estas\\s+moradas', replacement: 'estes endereços' },
    { pattern: 'nessa\\s+morada', replacement: 'nesse endereço' },
    { pattern: 'dessa\\s+morada', replacement: 'desse endereço' },
    { pattern: 'essa\\s+morada', replacement: 'esse endereço' },
    { pattern: 'nessas\\s+moradas', replacement: 'nesses endereços' },
    { pattern: 'dessas\\s+moradas', replacement: 'desses endereços' },
    { pattern: 'essas\\s+moradas', replacement: 'esses endereços' },

    // Nova morada / Morada
    { pattern: 'na\\s+nova\\s+morada', replacement: 'no novo endereço' },
    { pattern: 'da\\s+nova\\s+morada', replacement: 'do novo endereço' },
    { pattern: 'à\\s+nova\\s+morada', replacement: 'ao novo endereço' },
    { pattern: 'a\\s+nova\\s+morada', replacement: 'o novo endereço' },
    {
      pattern: 'para\\s+a\\s+nova\\s+morada',
      replacement: 'para o novo endereço',
    },
    { pattern: 'nova\\s+morada', replacement: 'novo endereço' },
    { pattern: 'nas\\s+novas\\s+moradas', replacement: 'nos novos endereços' },
    { pattern: 'das\\s+novas\\s+moradas', replacement: 'dos novos endereços' },
    { pattern: 'novas\\s+moradas', replacement: 'novos endereços' },

    // Preposition + morada
    { pattern: 'para\\s+a\\s+morada', replacement: 'para o endereço' },
    { pattern: 'de\\s+morada', replacement: 'de endereço' },
    { pattern: 'de\\s+moradas', replacement: 'de endereços' },
    { pattern: 'das\\s+moradas', replacement: 'dos endereços' },
    { pattern: 'nas\\s+moradas', replacement: 'nos endereços' },
    { pattern: 'as\\s+moradas', replacement: 'os endereços' },
    { pattern: 'da\\s+morada', replacement: 'do endereço' },
    { pattern: 'na\\s+morada', replacement: 'no endereço' },
    { pattern: 'à\\s+morada', replacement: 'ao endereço' },
    { pattern: 'a\\s+morada', replacement: 'o endereço' },
  ];

  for (const { pattern, replacement } of phrasalMoradaRules) {
    const regex = new RegExp(
      `(^|[^\\p{L}\\p{N}])(${pattern})($|[^\\p{L}\\p{N}])`,
      'giu',
    );
    result = result.replace(regex, (_, p1, matched, p2) => {
      return `${p1}${preserveCase(matched, replacement)}${p2}`;
    });
  }

  // 2. Compound expressions with "packing" (e.g. "packing list", "packing lists", with preceding contraction/article)
  result = result.replace(
    /(^|[^\p{L}\p{N}])(?:(nos?|dos?|às?|as?|os?)\s+)?(packing\s+lists?)(?:\s+(detalhad[oa]s?|complet[oa]s?))?($|[^\p{L}\p{N}])/giu,
    (_, p1, article, phrase, adj, p2) => {
      const isPlural = /lists\b/i.test(phrase);
      const base = isPlural ? 'listas de embalagem' : 'lista de embalagem';
      let full = base;
      if (adj) {
        const isAdjPlural = /s\b/i.test(adj) || isPlural;
        const isComplete = /complet/i.test(adj);
        const adjWord = isComplete
          ? isAdjPlural
            ? 'completas'
            : 'completa'
          : isAdjPlural
            ? 'detalhadas'
            : 'detalhada';
        full = `${base} ${adjWord}`;
      }
      if (article) {
        const art = article.toLowerCase();
        let replacedArticle = art;
        if (art === 'o') replacedArticle = isPlural ? 'as' : 'a';
        else if (art === 'os') replacedArticle = 'as';
        else if (art === 'no') replacedArticle = isPlural ? 'nas' : 'na';
        else if (art === 'nos') replacedArticle = 'nas';
        else if (art === 'do') replacedArticle = isPlural ? 'das' : 'da';
        else if (art === 'dos') replacedArticle = 'das';
        else if (art === 'ao') replacedArticle = isPlural ? 'às' : 'à';
        else if (art === 'aos') replacedArticle = 'às';
        else if (art === 'a') replacedArticle = isPlural ? 'as' : 'a';
        else if (art === 'as') replacedArticle = 'as';
        full = `${replacedArticle} ${full}`;
      }
      const matchedText = `${article ? article + ' ' : ''}${phrase}${adj ? ' ' + adj : ''}`;
      return `${p1}${preserveCase(matchedText, full)}${p2}`;
    },
  );

  // 3. Safe contextual "packing"
  // 3a. Verbal position: "packing" followed by direct object article, possessive, or moving item nouns -> "embalar"
  result = result.replace(
    /(^|[^\p{L}\p{N}])(packing)\s+([oa]s?\b|(?:meus?|minhas?|seus?|suas?|nossos?|nossas?)\b|(?:lou[cç]as?|roupas?|livros?|caixas?|itens|utens[ií]lios?|objetos?|pertences|m[oó]veis|panelas?|pratos?|copos?|cal[cç]ados?|documentos?|brinquedos?|ferramentas?|quadros?|eletr[oô]nicos?)\b)/giu,
    (_, prefix, verb, following) =>
      `${prefix}${preserveCase(verb, 'embalar')} ${following}`,
  );
  // 3b. Verbal phrase: "fazer packing" -> "fazer a embalagem"
  result = result.replace(
    /(^|[^\p{L}\p{N}])(fazer\s+packing)($|[^\p{L}\p{N}])/giu,
    (_, p1, phrase, p2) =>
      `${p1}${preserveCase(phrase, 'fazer a embalagem')}${p2}`,
  );

  // 4. Unambiguous full-word substitutions
  const wordRules = [
    { pattern: 'decluttering', replacement: 'desapego' },
    { pattern: 'declutando', replacement: 'desapegando' },
    { pattern: 'declutados', replacement: 'desapegados' },
    { pattern: 'declutadas', replacement: 'desapegadas' },
    { pattern: 'declutado', replacement: 'desapegado' },
    { pattern: 'declutada', replacement: 'desapegada' },
    { pattern: 'declutar', replacement: 'desapegar' },
    { pattern: 'packing', replacement: 'embalagem' },
    { pattern: 'pacotando', replacement: 'embalando' },
    { pattern: 'pacotados', replacement: 'embalados' },
    { pattern: 'pacotadas', replacement: 'embaladas' },
    { pattern: 'pacotado', replacement: 'embalado' },
    { pattern: 'pacotada', replacement: 'embalada' },
    { pattern: 'pacotar', replacement: 'embalar' },
    { pattern: 'carrinhas', replacement: 'vans de frete' },
    { pattern: 'carrinha', replacement: 'van de frete' },
    { pattern: 'moradas', replacement: 'endereços' },
  ];

  for (const { pattern, replacement } of wordRules) {
    const regex = new RegExp(
      `(^|[^\\p{L}\\p{N}])(${pattern})($|[^\\p{L}\\p{N}])`,
      'giu',
    );
    result = result.replace(regex, (_, prefix, matchedWord, suffix) => {
      return `${prefix}${preserveCase(matchedWord, replacement)}${suffix}`;
    });
  }

  // Standalone "morada" only when not preceded by feminine determiners and not followed by feminine adjectives
  result = result.replace(
    /(^|[^\p{L}\p{N}])(?<!\b(?:uma|outra|mesma|propria|aquela|certa|qualquer)\s+)(morada)(?!\s+[\p{L}\p{N}]*a\b)($|[^\p{L}\p{N}])/giu,
    (_, prefix, matchedWord, suffix) => {
      return `${prefix}${preserveCase(matchedWord, 'endereço')}${suffix}`;
    },
  );

  return result;
}

export function normalizeSuggestionPtBr<
  T extends { title: string; description?: string | null },
>(item: T): T {
  return {
    ...item,
    title: normalizePtBrText(item.title),
    description: item.description
      ? normalizePtBrText(item.description)
      : item.description,
  };
}

export function normalizeSuggestionsPtBr<
  T extends { title: string; description?: string | null },
>(items: T[]): T[] {
  return items.map((item) => normalizeSuggestionPtBr(item));
}

export enum ContextState {
  PRESENTE = 'PRESENTE',
  AUSENTE = 'AUSENTE',
  DESCONHECIDO = 'DESCONHECIDO',
}

export enum ContextDimension {
  PETS = 'pets',
  PLANTS = 'plants',
  HOME_OFFICE = 'homeOffice',
  STUDENT = 'student',
}

export type ContextDimensionKey = `${ContextDimension}`;

export interface MovingPlanContext {
  readonly pets: ContextState;
  readonly plants: ContextState;
  readonly homeOffice: ContextState;
  readonly student: ContextState;
}

export interface MovingPlanContextInput {
  readonly title: string;
  readonly origin?: string | null;
  readonly destination?: string | null;
}

interface DimensionPattern {
  readonly regex: RegExp;
  readonly subGroup: string;
  readonly isGeneral?: boolean;
}

type MatchClassification = 'PRESENT' | 'ABSENT' | 'UNCERTAIN';

interface ClassifiedMatch {
  readonly classification: MatchClassification;
  readonly subGroup: string;
  readonly isGeneral: boolean;
  readonly hasOtherQualifier: boolean;
  readonly hasRestrictiveException: boolean;
}

function normalizeForContextAnalysis(rawText: string): string {
  return rawText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const FALSE_FRIEND_MASKS: Record<ContextDimension, readonly RegExp[]> = {
  [ContextDimension.PETS]: [
    /\b(?:perto|proxim[oa]s?|ao\s+lado|vizinh[oa]s?|em\s+frente|atras|longe)\s+(?:do|da|dos|das|de|ao|a)\s+(?:(?:hospital|clinica)\s+veterinari[oa]|veterinari[oa]|pet\s*shop|canil|gatil|zoologico|parque\s+dos\s+caes)\b/g,
    /\b(?:rua|avenida|praca|travessa|alameda|bairro|edificio|condominio|parque)\s+(?:dos?\s+|das?\s+)?(?:animais|caes|cachorros|gatos|passaros|aves)\b/g,
    /\bgatos?\s+de\s+(?:luz|energia|agua|internet|rede|eletricidade)\b/g,
    /\b(?:animais|pets?|caes|cao|cachorros?|gatos?|gatas?|passaros?|aves?)\s+(?:do|da|dos|das)\s+(?:vizinh[oa]s?|amig[oa]s?|clientes?|antig[oa]s?\s+morador(?:a|es)?|ex-morador(?:a|es)?)\b/g,
  ],
  [ContextDimension.PLANTS]: [
    /\bvasos?\s+sanitari[oa]s?\b/g,
    /\bplantas?\s+(?:baixas?|arquitetonicas?|hidraulicas?|eletricas?|estruturais?|originais?|aprovadas?|livres?)\b/g,
    /\bplantas?\s+(?:do|da|dos|das|de)\s+(?:imovel|apartamento|ap|ape|casa|predio|edificio|escritorio|quarto|sala|cozinha|banheiro|terreno|lote|projeto|engenharia|arquitetura|condominio|andar|sobrado|studio|kitnet|loja|cobertura|duplex|triplex|reforma|obra)\b/g,
    /\bplantas?\s+(?:e\s+|,\s*|\s*e\s+outr[oa]s?\s+)?(?:projetos?(?:\s+de\s+arquitetura|\s+arquitetonicos?|\s+estruturais?|\s+executivos?|\s+tecnicos?)?|croquis?|documentos?\s+do\s+imovel|documentacao\s+do\s+imovel|desenhos?\s+tecnicos?|memoriais?\s+descritivos?)\s*(?:do|da|dos|das|de)?\s*(?:imovel|apartamento|ap|ape|casa|predio|edificio|obra|reforma|arquitetura)?\b/g,
    /\b(?:projetos?\s+de\s+arquitetura|projetos?\s+arquitetonicos?|croquis?|documentos?\s+do\s+imovel)\s+e\s+plantas?\b/g,
    /\b(?:imovel|apartamento|ap|ape|casa|comprad[oa]s?|compra|venda|lancamento)\s+na\s+planta\b/g,
    /\bplantas?\s+(?:industrial|industriais|fabril|fabris|de\s+producao|da\s+fabrica|operacional|operacionais)\b/g,
    /\b(?:perto|proxim[oa]s?|ao\s+lado|vizinh[oa]s?|em\s+frente|atras|longe)\s+(?:do|da|dos|das|de|ao|a)\s+(?:jardim(?:\s+botanico|\s+zoologico)?|horto(?:\s+florestal)?|parque|praca|floricultura)\b/g,
    /\b(?:bairro|rua|avenida|praca|alameda|travessa|estrada|rodovia|condominio|edificio|residencial|parque|shopping|cidade)\s+(?:do\s+|da\s+|dos\s+|das\s+)?(?:jardim|jardins|plantas|flores|horto)\b/g,
    /\bjardim\s+(?:botanico|zoologico|paulista|america|europa|oceanico|da\s+estrela|das\s+flores|dos\s+estados|imperial|real|primavera|central|sul|norte|leste|oeste|atlantico|marajoara|camburi|icarai|sao\s+paulo|guanabara|brasil|italia|franca|portugal|alvorada|planalto|independencia|universitario)\b/g,
    /\b(?:plantas?|jardim|jardins|vasos?|horta)\s+(?:do|da|dos|das)\s+(?:vizinh[oa]s?|amig[oa]s?|condominio|predio|antig[oa]s?\s+morador(?:a|es)?|ex-morador(?:a|es)?)\b/g,
  ],
  [ContextDimension.HOME_OFFICE]: [
    /\b(?:perto|proxim[oa]s?|ao\s+lado|vizinh[oa]s?|em\s+frente|atras|longe)\s+(?:do|da|dos|das|de|ao|a)\s+(?:(?:meu|minha|meus|minhas|nosso|nossa|seu|sua)\s+)?(?:escritorio|empresa|trabalho|centro\s+empresarial|firma)\b/g,
    /\bescritorios?\s+(?:de\s+advocacia|de\s+contabilidade|de\s+arquitetura|imobiliario|da\s+imobiliaria|da\s+transportadora|da\s+empresa|do\s+advogado|do\s+contador|do\s+cliente|do\s+amigo|do\s+vizinho)\b/g,
    /\bpara\s+ficar\s+(?:mais\s+)?(?:perto|proxim[oa])\s+(?:do|da|ao|a)\s+(?:(?:meu|minha|nosso|nossa|seu|sua)\s+)?(?:escritorio|empresa|trabalho)\b/g,
  ],
  [ContextDimension.STUDENT]: [
    /\b(?:perto|proxim[oa]s?|ao\s+lado|vizinh[oa]s?|em\s+frente|atras|longe)\s+(?:do|da|dos|das|de|ao|a)\s+(?:universidade|faculdade|escola|campus|colegio|instituto|centro\s+universitario|cidade\s+universitaria)\b/g,
    /\b(?:bairro|rua|avenida|praca|estacao|metro|hospital|clinica|restaurante|teatro|parque)\s+(?:da\s+|do\s+|dos\s+|das\s+)?(?:universidade|faculdade|universitari[oa]s?|estudantes?|academic[oa]s?|republica)\b/g,
    /\b(?:bairro|regiao\s+da)\s+cidade\s+universitaria\b/g,
    /\brepublica\s+(?:portuguesa|federativa|dominicana|tcheca|checa|da\s+irlanda|argentina|italiana|francesa|alema)\b/g,
    /\b(?:onde\s+morava|antig[oa]\s+morador(?:a)?|ex-morador(?:a)?)\s+(?:um\s+|uma\s+)?estudante\b/g,
    /\bestudante\s+(?:que\s+morava\s+antes|anterior)\b/g,
  ],
};

const DIMENSION_PATTERNS: Record<ContextDimension, readonly DimensionPattern[]> =
  {
    [ContextDimension.PETS]: [
      {
        regex: /\banimais\s+de\s+estimacao\b/g,
        subGroup: 'general_pet',
        isGeneral: true,
      },
      {
        regex: /\banimal\s+de\s+estimacao\b/g,
        subGroup: 'general_pet',
        isGeneral: true,
      },
      {
        regex: /\bbichos?\s+de\s+estimacao\b/g,
        subGroup: 'general_pet',
        isGeneral: true,
      },
      {
        regex: /\banimais\s+domesticos\b/g,
        subGroup: 'general_pet',
        isGeneral: true,
      },
      {
        regex: /\banimal\s+domestico\b/g,
        subGroup: 'general_pet',
        isGeneral: true,
      },
      { regex: /\baves?\s+de\s+estimacao\b/g, subGroup: 'bird' },
      { regex: /\bporquinhos?\s+da\s+india\b/g, subGroup: 'rodent' },
      { regex: /\baquarios?(?:\s+de\s+peixes)?\b/g, subGroup: 'aquarium' },
      {
        regex: /\b(?:cachorrinhos?|cachorros?|cadelas?|caes|cao)\b/g,
        subGroup: 'dog',
      },
      {
        regex: /\b(?:gatinhos?|gatinhas?|gatos?|gatas?|felinos?)\b/g,
        subGroup: 'cat',
      },
      {
        regex: /\b(?:passarinhos?|passaros?|calopsitas?|papagaios?)\b/g,
        subGroup: 'bird',
      },
      {
        regex: /\b(?:coelhos?|hamsters?|tartarugas?|jabutis?|furoes|furao)\b/g,
        subGroup: 'small_pet',
      },
      {
        regex: /\b(?:animais|animal|pets?)\b/g,
        subGroup: 'general_pet',
        isGeneral: true,
      },
    ],
    [ContextDimension.PLANTS]: [
      { regex: /\bvasos?\s+de\s+(?:plantas?|flores?)\b/g, subGroup: 'plants' },
      { regex: /\bmudas?\s+de\s+(?:plantas?|flores?)\b/g, subGroup: 'plants' },
      {
        regex:
          /\bplantas?\s+(?:ornamentais|ornamental|domesticas?|naturais|natural|de\s+interior|em\s+vasos?)\b/g,
        subGroup: 'plants',
      },
      {
        regex:
          /\bjardim\s+(?:de\s+inverno|vertical|suspenso|privativo|interno|residencial)\b/g,
        subGroup: 'garden',
      },
      {
        regex:
          /\bhortas?\s+(?:caseiras?|domesticas?|verticais|vertical|em\s+vasos?|organicas?)\b/g,
        subGroup: 'garden',
      },
      {
        regex:
          /\b(?:orquideas?|suculentas?|samambaias?|cactos?|bonsais?|folhagens?|floreiras?)\b/g,
        subGroup: 'plants',
      },
      {
        regex: /\b(?:plantinhas?|plantas?)\b/g,
        subGroup: 'plants',
        isGeneral: true,
      },
      { regex: /\b(?:jardins|jardim|hortas?|pomar)\b/g, subGroup: 'garden' },
      {
        regex:
          /\b(?:com|sem|levar|levando|levamos|tenho|temos|tem|possui|vasos\s+e|plantas\s+e)\s+(?:as?\s+|os?\s+|minhas?\s+|meus?\s+|nossas?\s+|nossos?\s+|suas?\s+|seus?\s+|\d+\s+|algumas?\s+|muitas?\s+|poucas?\s+|varias?\s+)?mudas\b/g,
        subGroup: 'plants',
      },
    ],
    [ContextDimension.HOME_OFFICE]: [
      {
        regex: /\b(?:home\s*-\s*office|home\s+office|homeoffice)\b/g,
        subGroup: 'home_office',
        isGeneral: true,
      },
      {
        regex:
          /\bescritorios?\s+(?:em\s+casa|domesticos?|residenciais|residencial|proprios?|de\s+trabalho|montados?|remotos?)\b/g,
        subGroup: 'home_office',
      },
      {
        regex:
          /\btrabalh(?:o|ar|ando|amos|a)\s+(?:em\s+casa|de\s+casa|remotamente|remoto)\b/g,
        subGroup: 'home_office',
      },
      {
        regex: /\b(?:trabalho\s+remoto|regime\s+remoto|teletrabalho)\b/g,
        subGroup: 'home_office',
      },
      {
        regex:
          /\b(?:equipamentos?|infraestrutura|materiais|material|setup|rede|area|servidores?|servidor|ativos?)\s+de\s+ti\b/g,
        subGroup: 'it_equipment',
      },
      {
        regex:
          /\b(?:estac(?:ao|oes)\s+de\s+trabalho|setup\s+de\s+trabalho|computador(?:es)?\s+de\s+trabalho|cabeamento\s+estruturado|rack\s+de\s+rede|servidores?\s+locais|servidor\s+local|nobreaks?)\b/g,
        subGroup: 'it_equipment',
      },
      {
        regex: /\bescritorios?\b/g,
        subGroup: 'home_office',
        isGeneral: true,
      },
    ],
    [ContextDimension.STUDENT]: [
      {
        regex: /\bestudantes?\s+universitari[oa]s?\b/g,
        subGroup: 'student',
        isGeneral: true,
      },
      {
        regex:
          /\b(?:alojamentos?|moradias?|residencias?)\s+(?:universitari[oa]s?|estudantis|estudantil|da\s+universidade|da\s+faculdade)\b/g,
        subGroup: 'student_housing',
      },
      {
        regex:
          /\brepublicas?\s+(?:estudantis|estudantil|universitari[oa]s?|de\s+estudantes?)\b/g,
        subGroup: 'student_housing',
      },
      {
        regex:
          /\bquartos?\s+(?:universitari[oa]s?|de\s+estudantes?|em\s+republica)\b/g,
        subGroup: 'student_housing',
      },
      {
        regex:
          /\b(?:materiais|material|livros?|acervos?|apostilas?)\s+(?:academicos?|academicas?|da\s+faculdade|da\s+universidade|de\s+estudo|universitarios?)\b/g,
        subGroup: 'academic_materials',
      },
      {
        regex:
          /\bintercambios?\s+(?:academicos?|estudantis|estudantil|universitarios?)\b/g,
        subGroup: 'student',
      },
      {
        regex:
          /\bmudancas?\s+(?:universitari[oa]s?|estudantis|estudantil|de\s+faculdade|para\s+a?\s*faculdade|para\s+a?\s*universidade)\b/g,
        subGroup: 'student',
      },
      {
        regex:
          /\b(?:vida\s+universitaria|ano\s+letivo\s+universitario|ingresso\s+na\s+(?:universidade|faculdade)|comecar\s+a\s+(?:faculdade|universidade))\b/g,
        subGroup: 'student',
      },
      {
        regex: /\b(?:estudantes?|estudantil|estudantis)\b/g,
        subGroup: 'student',
        isGeneral: true,
      },
      {
        regex: /\b(?:universitari[oa]s?|calour[oa]s?|mestrand[oa]s?|doutorand[oa]s?)\b/g,
        subGroup: 'student',
      },
      { regex: /\brepublicas?\b/g, subGroup: 'student_housing' },
    ],
  };

const ALL_CONTEXT_NOUNS_REGEX =
  /\b(?:animais\s+de\s+estimacao|animal\s+de\s+estimacao|animais|animal|pets?|caes|cao|cachorros?|cadelas?|gatos?|gatas?|passaros?|calopsitas?|coelhos?|hamsters?|vasos?\s+de\s+plantas?|mudas?\s+de\s+plantas?|plantas?|plantinhas?|jardins|jardim|hortas?|orquideas?|suculentas?|samambaias?|cactos?|home\s*-\s*office|home\s+office|homeoffice|escritorios?(?:\s+em\s+casa)?|teletrabalho|trabalho\s+remoto|equipamentos?\s+de\s+ti|estac(?:ao|oes)\s+de\s+trabalho|servidores?|estudantes?(?:\s+universitari[oa]s?)?|universitari[oa]s?|alojamentos?\s+universitari[oa]s?|republicas?(?:\s+estudantis|\s+universitari[oa]s?)?|materiais\s+academicos|material\s+academico|calour[oa]s?|mestrand[oa]s?|doutorand[oa]s?)\b/g;

const PRE_UNCERTAINTY_REGEX =
  /\b(?:talvez|possivel|possivelmente|eventual|eventualmente|provavel|provavelmente|quem\s+sabe|incerteza|indefinid[oa]s?|incert[oa]s?|em\s+duvida|duvidas?\s+(?:se|sobre|de|quanto)|(?:ainda\s+)?nao\s+sei\s+se|nao\s+sabemos\s+se|(?:avaliando|pensando|decidindo|analisando|estudando)\s+(?:se|sobre)|nao\s+descart(?:o|amos|a|ando)|sem\s+(?:confirmacao|certeza|definicao|garantia)\s+(?:de|sobre|se)|(?:se|caso)\s+(?:houver|haja|tiver|tenha|levar|for))\b/;

const POST_UNCERTAINTY_REGEX =
  /^\s*(?:ainda\s+)?(?:nao\s+(?:esta\s+|estao\s+|e\s+|sao\s+|foi\s+|foram\s+)?(?:confirmad[oa]s?|definid[oa]s?|decidid[oa]s?|cert[oa]s?)|a\s+(?:definir|confirmar|decidir)|em\s+(?:duvida|analise|avaliacao)|incert[oa]s?|indefinid[oa]s?|talvez|quem\s+sabe)\b/;

const POST_NEGATION_REGEX =
  /^\s*(?:nao\s+(?:sao\s+|e\s+|estao\s+|esta\s+|serao\s+|sera\s+|foram\s+|foi\s+)?(?:permitid[oa]s?|aceit[oa]s?|inclus[oa]s?|incluid[oa]s?|autorizad[oa]s?|admitid[oa]s?|levad[oa]s?)|(?:sao\s+|e\s+|estao\s+|esta\s+)?(?:proibid[oa]s?|vedad[oa]s?|descartad[oa]s?|cancelad[oa]s?|excluid[oa]s?|inexistentes?))\b/;

const NEGATIVE_MARKER_GLOBAL_REGEX =
  /\b(?:sem|nem|zero|nenhum|nenhuma|(?:ausencia|falta|isento|isenta|livre|proibido|proibida|vedado|vedada)\s+de|nao\s+(?:tenho|temos|tem|tera|terao|teremos|terei|tinha|possuo|possuimos|possui|possuem|ha|havera|havia|existe|existem|existira|levo|levamos|levarei|levaremos|leva|levam|inclui|incluimos|incluem|sou|somos|era|sendo|estou|estamos|uso|usamos|utilizo|utilizamos|preciso|precisamos|precisa|precisam|quero|queremos|pretendo|pretendemos|vai\s+ter|vao\s+ter|vamos\s+ter|vou\s+ter|vai\s+haver|vai\s+levar|vamos\s+levar|vou\s+levar|vamos\s+incluir|vou\s+incluir|e\s+(?:uma?\s+)?(?:mudanca|plano|caso)\s+(?:de|com|para)|se\s+trata\s+de(?:\s+mudanca\s+(?:de|com|para))?|e)|nao)\b/g;

const NON_EXISTENTIAL_NAO_PREFIX_REGEX =
  /^nao\s+(?:so|apenas|somente|esquecer|esqueca|deixar|deixe|atrasar|perder)\b/;

const VALID_NEGATIVE_BRIDGE_TOKENS = new Set([
  'o',
  'a',
  'os',
  'as',
  'um',
  'uma',
  'uns',
  'umas',
  'dois',
  'duas',
  'tres',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'meu',
  'minha',
  'meus',
  'minhas',
  'nosso',
  'nossa',
  'nossos',
  'nossas',
  'seu',
  'sua',
  'seus',
  'suas',
  'este',
  'esta',
  'esse',
  'essa',
  'algum',
  'alguma',
  'alguns',
  'algumas',
  'nenhum',
  'nenhuma',
  'qualquer',
  'quaisquer',
  'muito',
  'muita',
  'muitos',
  'muitas',
  'pouco',
  'pouca',
  'poucos',
  'poucas',
  'varios',
  'varias',
  'diversos',
  'diversas',
  'todo',
  'toda',
  'todos',
  'todas',
  'outro',
  'outra',
  'outros',
  'outras',
  'demais',
  'pequeno',
  'pequena',
  'pequenos',
  'pequenas',
  'grande',
  'grandes',
  'novo',
  'nova',
  'novos',
  'novas',
  'antigo',
  'antiga',
  'proprio',
  'propria',
  'domestico',
  'domestica',
  'domesticos',
  'domesticas',
  'unico',
  'unica',
  'mais',
  'menos',
  'ainda',
  'ja',
  'tambem',
  'sequer',
  'mesmo',
  'ter',
  'haver',
  'levar',
  'incluir',
  'possuir',
  'manter',
  'montar',
  'instalar',
  'cuidar',
  'ser',
  'estar',
  'trabalhar',
  'estudar',
  'nada',
]);

const VALID_BRIDGE_PREPOSITIONAL_PHRASES_REGEX =
  /\b(?:(?:espaco|lugar|area|ambiente|quarto|quintal|varanda|tempo|condicoes|condicao|estrutura|transporte)\s+(?:para|ao|aos|de)|(?:necessidade|precisao|transporte|servico|uso|presenca|existencia|tipo|tipos|especie|nada|cuidar)\s+(?:de|do|da|dos|das)|^\s*(?:de|do|da|dos|das))\b/g;

function isValidNegativeBridge(bridge: string): boolean {
  const trimmed = bridge.trim();
  if (trimmed.length === 0) {
    return true;
  }

  // Clause-breaking punctuation or adversative/subordinating conjunctions break negative scope
  if (
    /[;.:!?()/]|\s+[-–—]\s+|\b(?:mas|porem|contudo|todavia|entretanto|embora|enquanto|porque|pois|portanto|que|onde|quando)\b/.test(
      trimmed,
    )
  ) {
    return false;
  }

  // Positive scope-opening prepositions or affirmative verbs break negative scope
  if (
    /\b(?:com|em|no|na|nos|nas|num|numa|pelo|pela|pelos|pelas|por|sobre|entre|ate|desde|durante|apos|antes|perante|incluindo|inclui|tendo|tem|tenho|temos|possui|possuo|possuimos|levando|levo|levamos|havera|ha|sou|somos)\b/.test(
      trimmed,
    )
  ) {
    return false;
  }

  // Replace recognized context nouns with __ctx__ and valid prepositional bridges with __bridge__
  const withPlaceholders = trimmed
    .replace(ALL_CONTEXT_NOUNS_REGEX, '__ctx__')
    .replace(VALID_BRIDGE_PREPOSITIONAL_PHRASES_REGEX, '__bridge__');

  // A context noun followed directly by a preposition ("sem plantas para quarto universitário") breaks scope
  if (/__ctx__\s+(?:para|ao|aos|de|do|da|dos|das)\b/.test(withPlaceholders)) {
    return false;
  }

  // If comma or coordinating conjunction (e/ou/nem) is present, it must be preceded by a context noun (__ctx__)
  if (/,|\b(?:e|ou|nem)\b/.test(withPlaceholders)) {
    const segments = withPlaceholders.split(/,|\b(?:e|ou|nem)\b/);
    for (let i = 0; i < segments.length - 1; i++) {
      if (!segments[i].includes('__ctx__')) {
        return false;
      }
    }
  }

  const tokens = withPlaceholders
    .replace(/,/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    if (
      token === '__ctx__' ||
      token === '__bridge__' ||
      token === 'e' ||
      token === 'ou' ||
      token === 'nem'
    ) {
      continue;
    }
    if (/^\d+$/.test(token)) {
      continue;
    }
    if (!VALID_NEGATIVE_BRIDGE_TOKENS.has(token)) {
      return false;
    }
  }

  return true;
}

function classifyOccurrence(
  maskedText: string,
  matchStart: number,
  matchEnd: number,
  matchedText: string,
): MatchClassification {
  const before = maskedText.slice(0, matchStart);
  const after = maskedText.slice(matchEnd);

  // If the matched pattern itself starts with "sem " (e.g., "sem mudas")
  if (/^sem\b/.test(matchedText)) {
    return 'ABSENT';
  }

  // 1. Check post-match uncertainty
  if (POST_UNCERTAINTY_REGEX.test(after)) {
    return 'UNCERTAIN';
  }

  // 2. Check pre-match uncertainty within the current clause
  const clauseSegments = before.split(
    /[,;.:!?()/]|\s+[-–—]\s+|\b(?:mas|porem|contudo|todavia|entretanto)\b/,
  );
  const currentClauseBefore = clauseSegments[clauseSegments.length - 1] ?? '';
  const uncMatch = PRE_UNCERTAINTY_REGEX.exec(currentClauseBefore);
  if (uncMatch) {
    const bridgeAfterUncertainty = currentClauseBefore
      .slice((uncMatch.index ?? 0) + uncMatch[0].length)
      .trim();

    // The uncertainty is scoped to an unrelated noun/clause if broken by a coordinating conjunction with preposition,
    // or an explicit temporal prepositional phrase preceding the target dimension phrase:
    const isScopeBrokenByNewPhrase =
      /\b(?:e\s+com|e\s+para|e\s+sem)\b/.test(bridgeAfterUncertainty) ||
      /\b(?:no|na|nos|nas|em|num|numa|de|do|da)\s+(?:sabado|domingo|segunda|terca|quarta|quinta|sexta|fim\s+de\s+semana|data|dia|mes|ano|horario|semana)\s+(?:para|com)\b/.test(
        bridgeAfterUncertainty,
      );

    if (!isScopeBrokenByNewPhrase) {
      return 'UNCERTAIN';
    }
  }

  // 3. Check post-match negation
  if (POST_NEGATION_REGEX.test(after)) {
    return 'ABSENT';
  }

  // 4. Check pre-match negation with strict scope verification
  const negMatches = Array.from(before.matchAll(NEGATIVE_MARKER_GLOBAL_REGEX));
  for (let i = negMatches.length - 1; i >= 0; i--) {
    const negMatch = negMatches[i];
    const negStart = negMatch.index ?? 0;
    const negEnd = negStart + negMatch[0].length;
    const fromNegStart = before.slice(negStart);

    if (NON_EXISTENTIAL_NAO_PREFIX_REGEX.test(fromNegStart)) {
      continue;
    }

    const bridge = before.slice(negEnd);
    if (isValidNegativeBridge(bridge)) {
      return 'ABSENT';
    }
  }

  return 'PRESENT';
}

export function extractDimensionContext(
  input: string | MovingPlanContextInput,
  dimension: ContextDimension | ContextDimensionKey,
): ContextState {
  const rawTitle =
    typeof input === 'string'
      ? input
      : input && typeof input === 'object' && typeof input.title === 'string'
        ? input.title
        : '';

  if (!rawTitle || rawTitle.trim().length === 0) {
    return ContextState.DESCONHECIDO;
  }

  const normalized = normalizeForContextAnalysis(rawTitle);
  if (normalized.length === 0) {
    return ContextState.DESCONHECIDO;
  }

  const dimKey = dimension as ContextDimension;
  const masks = FALSE_FRIEND_MASKS[dimKey];
  const patterns = DIMENSION_PATTERNS[dimKey];

  if (!masks || !patterns) {
    return ContextState.DESCONHECIDO;
  }

  let maskedText = normalized;
  for (const maskRegex of masks) {
    maskedText = maskedText.replace(maskRegex, ' __neutral__ ');
  }

  const consumedSpans: Array<[number, number]> = [];
  const classifiedMatches: ClassifiedMatch[] = [];

  for (const { regex, subGroup, isGeneral } of patterns) {
    const matches = Array.from(maskedText.matchAll(regex));
    for (const match of matches) {
      const start = match.index ?? 0;
      const end = start + match[0].length;

      const overlaps = consumedSpans.some(
        ([s, e]) => start < e && end > s,
      );
      if (overlaps) {
        continue;
      }
      consumedSpans.push([start, end]);

      const classification = classifyOccurrence(
        maskedText,
        start,
        end,
        match[0],
      );
      const immediateBefore = maskedText.slice(Math.max(0, start - 30), start);
      const hasOtherQualifier = /\b(?:outr[oa]s?|demais)\s+$/.test(
        immediateBefore,
      );
      const hasRestrictiveException =
        /\b(?:apenas|somente|so|exceto|salvo)(?:\s+(?:um|uma|uns|umas|dois|duas|\d+|meu|minha|o|a|os|as))?$/.test(
          immediateBefore.trimEnd(),
        );

      classifiedMatches.push({
        classification,
        subGroup,
        isGeneral: Boolean(isGeneral),
        hasOtherQualifier,
        hasRestrictiveException,
      });
    }
  }

  if (classifiedMatches.length === 0) {
    return ContextState.DESCONHECIDO;
  }

  if (classifiedMatches.some((m) => m.classification === 'UNCERTAIN')) {
    return ContextState.DESCONHECIDO;
  }

  const presentMatches = classifiedMatches.filter(
    (m) => m.classification === 'PRESENT',
  );
  const absentMatches = classifiedMatches.filter(
    (m) => m.classification === 'ABSENT',
  );

  if (presentMatches.length > 0 && absentMatches.length === 0) {
    return ContextState.PRESENTE;
  }

  if (absentMatches.length > 0 && presentMatches.length === 0) {
    return ContextState.AUSENTE;
  }

  // Both PRESENT and ABSENT exist in the same title for this dimension:
  // Check if there is an explicit restrictive exception (e.g. "sem animais, apenas um cão pequeno")
  const hasValidException = presentMatches.some(
    (p) => p.hasRestrictiveException && p.classification === 'PRESENT',
  );
  if (hasValidException) {
    return ContextState.PRESENTE;
  }

  // Check if there is a direct contradiction on the same subGroup or an unqualified general negation
  for (const absent of absentMatches) {
    if (absent.hasOtherQualifier) {
      continue;
    }
    if (
      absent.isGeneral ||
      presentMatches.some(
        (p) => p.subGroup === absent.subGroup || p.isGeneral,
      )
    ) {
      return ContextState.DESCONHECIDO;
    }
  }

  return ContextState.PRESENTE;
}

export function extractPetsContext(
  input: string | MovingPlanContextInput,
): ContextState {
  return extractDimensionContext(input, ContextDimension.PETS);
}

export function extractPlantsContext(
  input: string | MovingPlanContextInput,
): ContextState {
  return extractDimensionContext(input, ContextDimension.PLANTS);
}

export function extractHomeOfficeContext(
  input: string | MovingPlanContextInput,
): ContextState {
  return extractDimensionContext(input, ContextDimension.HOME_OFFICE);
}

export function extractStudentContext(
  input: string | MovingPlanContextInput,
): ContextState {
  return extractDimensionContext(input, ContextDimension.STUDENT);
}

export function extractMovingPlanContext(
  input: string | MovingPlanContextInput,
): MovingPlanContext {
  return Object.freeze({
    pets: extractDimensionContext(input, ContextDimension.PETS),
    plants: extractDimensionContext(input, ContextDimension.PLANTS),
    homeOffice: extractDimensionContext(input, ContextDimension.HOME_OFFICE),
    student: extractDimensionContext(input, ContextDimension.STUDENT),
  });
}

export enum TaskDomain {
  PETS = 'pets',
  PLANTS = 'plants',
  HOME_OFFICE = 'homeOffice',
  STUDENT = 'student',
  GENERIC = 'generic',
}

export interface TaskClassificationInput {
  readonly title: string;
  readonly description?: string | null;
}

const GENERIC_HOUSEHOLD_UTILITY_REGEX =
  /\b(?:contas?\s+de\s+(?:agua|luz|energia|gas)|energia\s+eletrica|abastecimento\s+de\s+agua|gas\s+encanado|documentos?\s+pessoais|rg\b|cpf\b|cnh\b|certid(?:ao|oes)\s+de\s+(?:nascimento|casamento)|imposto\s+de\s+renda|contas?\s+bancarias?|mala\s+de\s+backup|caixa\s+de\s+backup|(?:roupas?|pecas?\s+de\s+roupa|itens?\s+de\s+higiene|medicamentos?\s+pessoais|fotos?\s+de\s+familia|documentos?\s+pessoais)\b.*?\bbackup\b|\bbackup\b.*?\b(?:roupas?|pecas?\s+de\s+roupa|itens?\s+de\s+higiene|medicamentos?\s+pessoais|fotos?\s+de\s+familia|documentos?\s+pessoais)|geladeira|refrigerador|fogao|maquina\s+de\s+lavar|lava-loucas|micro-ondas|colchao|cama\s+de\s+casal|sofa\s+da\s+sala|guarda-roupa|armarios?\s+da\s+cozinha|loucas?\s+e\s+panelas?|entrega\s+d[ae]s?\s+chaves|vistoria\s+(?:do\s+imovel|final|de\s+entrada|de\s+saida)|leitura\s+dos?\s+medidor(?:es)?\s+de\s+(?:agua|luz|gas))\b/;

const ACADEMIC_DECLUTTER_DONATION_REGEX =
  /\b(?:doar|doacao|doacoes|desapegar|desapego|descarte|descartar|reciclar|reciclagem|vender|venda|sebo|bazar)\b.*?\b(?:livros?|apostilas?|cadernos?|materiais?|material)\b|\b(?:livros?|apostilas?|cadernos?|materiais?|material)\b.*?\b(?:doar|doacao|doacoes|desapegar|desapego|descarte|descartar|reciclar|reciclagem|vender|venda|sebo|bazar)\b/;

const ACADEMIC_ADMINISTRATION_MARKERS_REGEX =
  /\b(?:matricula|rematricula|transferencia\s+academica|secretaria\s+academica|secretaria\s+da\s+(?:faculdade|universidade|escola)|coordenacao\s+do\s+curso|grade\s+curricular|historico\s+escolar|historico\s+academico|comprovante\s+de\s+matricula|portal\s+do\s+aluno|vida\s+academica|matricula\s+academica)\b/;

const TASK_EXTRA_FALSE_FRIEND_MASKS: readonly RegExp[] = [
  /\b(?:rotas?|transito|trafego|estacionamento|comercio|supermercados?|farmacias?|padarias?|onibus|metro|linhas?)\s+(?:perto|proxim[oa]s?|ao\s+lado|nos?\s+arredores|na\s+regiao|da\s+regiao)\s+(?:da|do|de|ao|a)\s+(?:universidade|faculdade|campus|escritorio|jardim|parque|hospital\s+veterinario)\b/g,
  /\b(?:horario\s+de\s+pico|fluxo)\s+da\s+(?:universidade|faculdade)\b/g,
  /\b(?:assinar|entregar|retirar|buscar|levar|enviar|protocolar)\s+(?:o\s+|a\s+|os\s+|as\s+)?(?:contrato|chaves?|documentos?|documentacao|papeis|recibo|vistoria)\s+no\s+escritorio\b/g,
];

const TASK_EXCLUSIVE_DOMAIN_PATTERNS: Record<
  Exclude<TaskDomain, TaskDomain.GENERIC>,
  readonly RegExp[]
> = {
  [TaskDomain.PETS]: [
    /\b(?:veterinari[oa]s?|consulta\s+veterinaria|clinica\s+veterinaria|carteira\s+de\s+vacinacao|atestado\s+veterinario|guia\s+de\s+transito\s+animal|passaporte\s+animal|microchip(?:agem)?\s+(?:do|da|dos|das|no|na)\s+(?:pet|cao|caes|cachorro|gato|animal))\b/,
    /\b(?:vacinas?|vacinacao|vermifug[oa]s?|antipulgas?|sedativo|calmante|racao|coleiras?|guias?|comedouros?|bebedouros?|areia\s+higienica|caixa\s+de\s+areia|arranhador(?:es)?|caixas?\s+de\s+transporte|bolsas?\s+de\s+transporte|hotelzinho|creche|hospedagem|adaptacao)\s+(?:para\s+|do\s+|da\s+|dos\s+|das\s+|de\s+)?(?:o\s+|a\s+|os\s+|as\s+|meus?\s+|minhas?\s+|nossos?\s+|nossas?\s+)?(?:caes|cao|cachorros?|cadelas?|gatos?|gatas?|felinos?|pets?|animais(?:\s+de\s+estimacao|\s+domesticos)?|passaros?|calopsitas?|aves?|coelhos?|hamsters?|bichos?\s+de\s+estimacao)\b/,
    /\bracao\b(?:\s+[\p{L}\p{N}]+){0,7}\s+(?:para\s+|do\s+|da\s+|dos\s+|das\s+|de\s+)?(?:o\s+|a\s+|os\s+|as\s+|meus?\s+|minhas?\s+|nossos?\s+|nossas?\s+)?(?:caes|cao|cachorros?|cadelas?|gatos?|gatas?|felinos?|pets?|animais(?:\s+de\s+estimacao|\s+domesticos)?|passaros?|aves?|coelhos?|hamsters?|filhotes?)\b/u,
    /\b(?:transportar|levar|acomodar|adaptar|alimentar|hidratar|passear\s+com|cuidar\s+d[oa]s?|proteger|acalmar|vacinar|preparar)\s+(?:o\s+|a\s+|os\s+|as\s+|meus?\s+|minhas?\s+|nossos?\s+|nossas?\s+|dois\s+|duas\s+|\d+\s+)?(?:caes|cao|cachorros?|cadelas?|gatos?|gatas?|felinos?|pets?|animais\s+de\s+estimacao|animais\s+domesticos|passaros?|calopsitas?|coelhos?|hamsters?|aquarios?\s+de\s+peixes)\b/,
    /\b(?:caes|cao|cachorros?|cadelas?|gatos?|gatas?|felinos?|pets?|animais\s+de\s+estimacao)\b.*?\b(?:caixa\s+de\s+transporte|viagem|transporte|vacinas?|veterinari[oa]|racao|coleira|identificacao|plaquinha|adaptacao|estresse)\b/,
  ],
  [TaskDomain.PLANTS]: [
    /\b(?:vasos?\s+de\s+(?:plantas?|flores?)|mudas?\s+de\s+(?:plantas?|flores?)|plantas?\s+(?:ornamentais|ornamental|domesticas?|naturais|em\s+vasos?|de\s+interior)|hortas?\s+(?:caseiras?|domesticas?|verticais|vertical|em\s+vasos?)|orquideas?|suculentas?|samambaias?|cactos?|bonsais?|folhagens?|floreiras?|ferramentas?\s+de\s+jardinagem|terra\s+e\s+adubo|substrato\s+para\s+plantas?)\b/,
    /\b(?:regar|podar|adubar|replantar|transplantar|desenvasar)\s+(?:o\s+|a\s+|os\s+|as\s+|meus?\s+|minhas?\s+|todos?\s+os\s+|todas?\s+as\s+)?(?:vasos?|plantas?|plantinhas?|mudas?|flores?|jardins|jardim|hortas?|gramado|canteiros?)\b/,
    /\b(?:acondicionar|proteger|preparar|embalar|transportar|organizar|separar|cuidar\s+d[oa]s?|manutencao\s+d[oa]s?)\s+(?:o\s+|a\s+|os\s+|as\s+|meus?\s+|minhas?\s+|todos?\s+os\s+|todas?\s+as\s+)?(?:vasos?\s+de\s+plantas?|plantas(?:\s+do\s+jardim|\s+da\s+varanda|\s+em\s+vasos)?|plantinhas?|mudas?(?:\s+de\s+plantas|\s+do\s+jardim)?|jardim|horta)\b/,
    /\b(?:podar\s+o\s+jardim|cortar\s+a\s+grama(?:\s+do\s+jardim)?|cuidar\s+do\s+jardim|manutencao\s+do\s+jardim|plantas?\s+e\s+jardim|jardim\s+e\s+plantas?)\b/,
  ],
  [TaskDomain.HOME_OFFICE]: [
    /\b(?:home\s*-\s*office|home\s+office|homeoffice|escritorio\s+em\s+casa|escritorio\s+domestico|escritorio\s+residencial|ambiente\s+de\s+teletrabalho)\b/,
    /\b(?:servidores?(?:\s+de\s+ti|\s+locais|\s+local)?|rack\s+de\s+rede|cabeamento\s+estruturado|switch(?:es)?\s+de\s+rede|nobreaks?|vpn\s+corporativa|rede\s+corporativa|(?:equipamentos?|infraestrutura|ativos?|setup|materiais|material|parque)\s+de\s+ti)\b/,
    /\b(?:estac(?:ao|oes)\s+de\s+trabalho|setup\s+de\s+trabalho|computador(?:es)?\s+de\s+trabalho|maquinas?\s+de\s+trabalho|monitores?\s+(?:de\s+trabalho|do\s+home\s+office|do\s+escritorio))\b/,
    /\bbackup\b.*?\b(?:arquivos?\s+de\s+trabalho|dados\s+profissionais|dados\s+corporativos|projetos?\s+de\s+trabalho|servidores?|ti\b|sistema\s+corporativo|estac(?:ao|oes)\s+de\s+trabalho|home\s*-\s*office|home\s+office|computador(?:es)?\s+de\s+trabalho|trabalho\s+remoto|teletrabalho)\b/,
    /\b(?:arquivos?\s+de\s+trabalho|dados\s+profissionais|dados\s+corporativos|projetos?\s+de\s+trabalho|servidores?|equipamentos?\s+de\s+ti|estac(?:ao|oes)\s+de\s+trabalho|home\s*-\s*office|home\s+office|computador(?:es)?\s+de\s+trabalho)\b.*?\bbackup\b/,
  ],
  [TaskDomain.STUDENT]: [
    /\b(?:matricula|rematricula|transferencia\s+academica|transferencia\s+de\s+faculdade|transferencia\s+de\s+universidade|historico\s+escolar|historico\s+academico|secretaria\s+academica|secretaria\s+da\s+(?:faculdade|universidade)|coordenacao\s+do\s+curso|grade\s+curricular|grade\s+de\s+disciplinas|calendario\s+academico|calendario\s+letivo|bolsa\s+de\s+estudos?|auxilio\s+moradia(?:\s+estudantil)?|carteirinha\s+de\s+estudante|passe\s+estudantil|bilhete\s+unico\s+estudantil|meia-entrada\s+estudantil|comprovante\s+de\s+matricula)\b/,
    /\b(?:atualizar|confirmar|realizar|fazer|validar|entregar|solicitar)\s+(?:a\s+|o\s+|os\s+|as\s+)?(?:matricula|rematricula|cadastro\s+academico|endereco|documentacao(?:\s+academica)?|documentos?(?:\s+academicos?)?|historico)\s+(?:na\s+|no\s+|da\s+|do\s+|junto\s+a\s+)?(?:universidade|faculdade|instituicao\s+de\s+ensino|secretaria\s+academica|portal\s+do\s+aluno)\b/,
    /\b(?:materiais|material|livros?|acervos?|apostilas?|cadernos?|artigos?|resumos?)\s+(?:academicos?|academicas?|da\s+faculdade|da\s+universidade|do\s+curso|universitarios?|universitarias?|de\s+estudo|do\s+semestre\s+letivo)\b/,
    /\b(?:alojamento\s+universitario|alojamento\s+estudantil|moradia\s+estudantil|moradia\s+universitaria|residencia\s+universitaria|residencia\s+estudantil|republica\s+estudantil|republica\s+universitaria|republica\s+de\s+estudantes|quarto\s+universitario|colegas?\s+de\s+republica|regras?\s+da\s+republica|rateio\s+da\s+republica|intercambio\s+academico|intercambio\s+estudantil)\b/,
  ],
};

export function detectSpecializedTaskDomains(
  task: TaskClassificationInput,
): TaskDomain[] {
  if (!task || typeof task !== 'object') {
    return [];
  }

  const rawTitle = typeof task.title === 'string' ? task.title : '';
  const rawDesc = typeof task.description === 'string' ? task.description : '';
  const combined = `${rawTitle} . ${rawDesc}`.trim();

  if (combined.length === 0) {
    return [];
  }

  const normalized = normalizeForContextAnalysis(combined);
  if (normalized.length === 0) {
    return [];
  }

  // Preserve tasks with universal household utility / alternative plausible interpretation,
  // unless there are explicit enrollment/academic registration markers (B-19)
  const isGenericHouseholdUtility =
    GENERIC_HOUSEHOLD_UTILITY_REGEX.test(normalized) &&
    !ACADEMIC_ADMINISTRATION_MARKERS_REGEX.test(normalized);

  if (isGenericHouseholdUtility) {
    return [];
  }

  // Mask false friends across all dimensions and task-specific false friends
  let masked = normalized;
  for (const dim of Object.values(ContextDimension)) {
    for (const maskRegex of FALSE_FRIEND_MASKS[dim]) {
      masked = masked.replace(maskRegex, ' __neutral__ ');
    }
  }
  for (const extraMask of TASK_EXTRA_FALSE_FRIEND_MASKS) {
    masked = masked.replace(extraMask, ' __neutral__ ');
  }

  // B-16: If task is physical decluttering/donation of study materials without academic requirements
  if (
    ACADEMIC_DECLUTTER_DONATION_REGEX.test(normalized) &&
    !ACADEMIC_ADMINISTRATION_MARKERS_REGEX.test(normalized)
  ) {
    masked = masked.replace(
      /\b(?:materiais|material|livros?|acervos?|apostilas?|cadernos?|artigos?|resumos?)\s+(?:academicos?|academicas?|da\s+faculdade|da\s+universidade|do\s+curso|universitarios?|universitarias?|de\s+estudo|do\s+semestre\s+letivo)\b/g,
      ' __neutral__ ',
    );
  }

  const matchedDomains: TaskDomain[] = [];
  const candidateDomains = [
    TaskDomain.PETS,
    TaskDomain.PLANTS,
    TaskDomain.HOME_OFFICE,
    TaskDomain.STUDENT,
  ] as const;

  for (const domain of candidateDomains) {
    const patterns = TASK_EXCLUSIVE_DOMAIN_PATTERNS[domain];
    if (patterns.some((regex) => regex.test(masked))) {
      matchedDomains.push(domain);
    }
  }

  return matchedDomains;
}

export function classifyTaskDomain(task: TaskClassificationInput): TaskDomain {
  const matched = detectSpecializedTaskDomains(task);
  if (matched.length === 1) {
    return matched[0];
  }
  return TaskDomain.GENERIC;
}

export function resolvePlanContext(
  contextOrInput: string | MovingPlanContextInput | MovingPlanContext,
): MovingPlanContext {
  if (
    contextOrInput &&
    typeof contextOrInput === 'object' &&
    'pets' in contextOrInput &&
    'plants' in contextOrInput &&
    'homeOffice' in contextOrInput &&
    'student' in contextOrInput
  ) {
    return contextOrInput;
  }
  return extractMovingPlanContext(
    contextOrInput as string | MovingPlanContextInput,
  );
}

export function isTaskCompatibleWithContext(
  task: TaskClassificationInput,
  contextOrInput: string | MovingPlanContextInput | MovingPlanContext,
): boolean {
  const context = resolvePlanContext(contextOrInput);
  const matchedDomains = detectSpecializedTaskDomains(task);

  if (matchedDomains.length === 0) {
    return true;
  }

  const getDomainState = (domain: TaskDomain): ContextState => {
    switch (domain) {
      case TaskDomain.PETS:
        return context.pets;
      case TaskDomain.PLANTS:
        return context.plants;
      case TaskDomain.HOME_OFFICE:
        return context.homeOffice;
      case TaskDomain.STUDENT:
        return context.student;
      default:
        return ContextState.DESCONHECIDO;
    }
  };

  // If ALL matched specialized domains are explicitly AUSENTE, discard (B-18)
  const allMatchedAreAbsent = matchedDomains.every(
    (domain) => getDomainState(domain) === ContextState.AUSENTE,
  );
  if (allMatchedAreAbsent) {
    return false;
  }

  // If a single specialized domain is matched and it is AUSENTE, discard
  if (matchedDomains.length === 1) {
    return getDomainState(matchedDomains[0]) !== ContextState.AUSENTE;
  }

  // If multi-domain task has at least one domain that is PRESENTE or DESCONHECIDO, preserve
  return true;
}

export function filterCompatibleSuggestions<
  T extends TaskClassificationInput,
>(
  items: readonly T[],
  contextOrInput: string | MovingPlanContextInput | MovingPlanContext,
): T[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  const context = resolvePlanContext(contextOrInput);
  return items.filter((item) => isTaskCompatibleWithContext(item, context));
}

@Injectable()
export class TaskSuggestionsValidator {
  extractPlanContext(
    input: string | MovingPlanContextInput,
  ): MovingPlanContext {
    return extractMovingPlanContext(input);
  }

  extractDimension(
    input: string | MovingPlanContextInput,
    dimension: ContextDimension | ContextDimensionKey,
  ): ContextState {
    return extractDimensionContext(input, dimension);
  }

  classifyTask(task: TaskClassificationInput): TaskDomain {
    return classifyTaskDomain(task);
  }

  filterCompatibleSuggestions<T extends TaskClassificationInput>(
    items: readonly T[],
    contextOrInput: string | MovingPlanContextInput | MovingPlanContext,
  ): T[] {
    return filterCompatibleSuggestions(items, contextOrInput);
  }

  validateLlmSuggestions(
    rawSuggestions: RawLlmTaskSuggestion[],
    movingDate: string,
    referenceDate: string,
    maxLimit: number = 20,
  ): TaskSuggestionItemResponse[] {
    if (!Array.isArray(rawSuggestions) || rawSuggestions.length === 0) {
      throw new BadGatewayException(
        'O assistente de IA não retornou nenhuma sugestão válida.',
      );
    }

    if (rawSuggestions.length > maxLimit) {
      throw new BadGatewayException(
        `O assistente de IA excedeu o limite máximo de ${maxLimit} sugestões.`,
      );
    }

    const validated: TaskSuggestionItemResponse[] = [];

    for (const item of rawSuggestions) {
      if (!item || typeof item !== 'object') {
        throw new BadGatewayException(
          'Formato inválido de item retornado pelo assistente de IA.',
        );
      }

      const rawTitle = typeof item.title === 'string' ? item.title.trim() : '';
      if (!rawTitle) {
        throw new BadGatewayException(
          'O assistente de IA gerou uma tarefa com título ausente ou excessivamente longo.',
        );
      }

      const normalizedTitle = normalizePtBrText(rawTitle).trim();
      if (!normalizedTitle || normalizedTitle.length > 200) {
        throw new BadGatewayException(
          'O assistente de IA gerou uma tarefa com título ausente ou excessivamente longo.',
        );
      }

      let description: string | null = null;
      if (typeof item.description === 'string') {
        const trimmedDesc = item.description.trim();
        if (trimmedDesc.length > 0) {
          const normalizedDesc = normalizePtBrText(trimmedDesc).trim();
          if (normalizedDesc.length > 2000) {
            throw new BadGatewayException(
              'O assistente de IA gerou uma tarefa com descrição que excede 2000 caracteres.',
            );
          }
          description = normalizedDesc.length > 0 ? normalizedDesc : null;
        }
      }

      let dueDate: string | null = null;
      if (typeof item.dueDate === 'string' && item.dueDate.trim().length > 0) {
        const trimmedDate = item.dueDate.trim();
        if (!isValidCalendarDate(trimmedDate)) {
          throw new BadGatewayException(
            `O assistente de IA gerou uma data inválida: "${trimmedDate}".`,
          );
        }
        if (trimmedDate < referenceDate) {
          throw new BadGatewayException(
            `O assistente de IA gerou um prazo (${trimmedDate}) anterior à data de referência (${referenceDate}).`,
          );
        }
        if (trimmedDate > movingDate) {
          throw new BadGatewayException(
            `O assistente de IA gerou um prazo (${trimmedDate}) posterior à data da mudança (${movingDate}).`,
          );
        }
        dueDate = trimmedDate;
      }

      validated.push({
        title: normalizedTitle,
        description,
        dueDate,
      });
    }

    return validated;
  }
}
