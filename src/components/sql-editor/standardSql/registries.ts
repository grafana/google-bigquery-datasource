import { Registry } from '@grafana/data';
import { initStandardSuggestions, initFunctionsRegistry } from './standardSuggestionsRegistry';
import { initStatementPositionResolvers } from './statementPositionResolversRegistry';
import { FunctionsRegistryItem, StatementPositionResolversRegistryItem, SuggestionsRegistyItem } from './types';

export const stdSuggestionsRegistry = new Registry<SuggestionsRegistyItem>();
stdSuggestionsRegistry.setInit(initStandardSuggestions);

export const functionsRegistry = new Registry<FunctionsRegistryItem>();
functionsRegistry.setInit(initFunctionsRegistry);

export const statementPositionResolversRegistry = new Registry<StatementPositionResolversRegistryItem>();
statementPositionResolversRegistry.setInit(initStatementPositionResolvers);
