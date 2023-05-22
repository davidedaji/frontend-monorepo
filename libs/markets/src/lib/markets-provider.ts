import { useYesterday } from '@vegaprotocol/react-helpers';
import {
  makeDataProvider,
  makeDerivedDataProvider,
  useDataProvider,
} from '@vegaprotocol/data-provider';
import type {
  MarketsQuery,
  MarketFieldsFragment,
} from './__generated__/markets';
import type { MarketsCandlesQueryVariables } from './__generated__/markets-candles';

import { marketsDataProvider } from './markets-data-provider';
import { marketDataProvider } from './market-data-provider';
import { marketsCandlesProvider } from './markets-candles-provider';
import type { MarketData } from './market-data-provider';
import type { MarketCandles } from './markets-candles-provider';
import { useMemo } from 'react';
import * as Schema from '@vegaprotocol/types';
import {
  filterAndSortClosedMarkets,
  filterAndSortMarkets,
} from './market-utils';
import { MarketsDocument } from './__generated__/markets';

import type { Candle } from './market-candles-provider';

export type Market = MarketFieldsFragment;

const getData = (responseData: MarketsQuery | null): Market[] | null =>
  responseData?.marketsConnection?.edges.map((edge) => edge.node) || null;

export const marketsProvider = makeDataProvider<
  MarketsQuery,
  Market[],
  never,
  never
>({
  query: MarketsDocument,
  getData,
  fetchPolicy: 'cache-first',
});

export const marketProvider = makeDerivedDataProvider<
  Market,
  never,
  { marketId: string }
>(
  [(callback, client) => marketsProvider(callback, client, undefined)],
  ([markets], variables) =>
    ((markets as ReturnType<typeof getData>) || []).find(
      (market) => market.id === variables?.marketId
    ) || null
);

export const useMarket = (marketId?: string) => {
  const variables = useMemo(() => ({ marketId: marketId || '' }), [marketId]);
  return useDataProvider({
    dataProvider: marketProvider,
    variables,
    skip: !marketId,
  });
};
export type MarketWithData = Market & { data: MarketData };

export const marketWithDataProvider = makeDerivedDataProvider<
  MarketWithData,
  never,
  { marketId: string }
>([marketProvider, marketDataProvider], ([market, marketData]) => {
  return {
    ...market,
    data: marketData,
  };
});

export const activeMarketsProvider = makeDerivedDataProvider<Market[], never>(
  [marketsProvider],
  ([markets]) => filterAndSortMarkets(markets)
);

export const closedMarketsProvider = makeDerivedDataProvider<Market[], never>(
  [marketsProvider],
  ([markets]) => filterAndSortClosedMarkets(markets)
);

export type MarketMaybeWithCandles = Market & { candles?: Candle[] };

const addCandles = <T extends Market>(
  markets: T[],
  marketsCandles: MarketCandles[]
) =>
  markets.map((market) => ({
    ...market,
    candles: marketsCandles.find((data) => data.marketId === market.id)
      ?.candles,
  }));

export const marketsWithCandlesProvider = makeDerivedDataProvider<
  MarketMaybeWithCandles[],
  never,
  MarketsCandlesQueryVariables
>(
  [
    (callback, client) => activeMarketsProvider(callback, client, undefined),
    marketsCandlesProvider,
  ],
  (parts) => addCandles(parts[0] as Market[], parts[1] as MarketCandles[])
);

export type MarketMaybeWithData = Market & { data?: MarketData };

const addData = <T extends Market>(markets: T[], marketsData: MarketData[]) =>
  markets.map((market) => ({
    ...market,
    data: marketsData.find((data) => data.market.id === market.id),
  }));

export const marketsWithDataProvider = makeDerivedDataProvider<
  MarketMaybeWithData[],
  never
>([activeMarketsProvider, marketsDataProvider], (parts) =>
  addData(parts[0] as Market[], parts[1] as MarketData[])
);

export const closedMarketsWithDataProvider = makeDerivedDataProvider<
  MarketMaybeWithData[],
  never
>([closedMarketsProvider, marketsDataProvider], (parts) =>
  addData(parts[0] as Market[], parts[1] as MarketData[])
);

export const allMarketsWithDataProvider = makeDerivedDataProvider<
  MarketMaybeWithData[],
  never
>([marketsProvider, marketsDataProvider], (parts) =>
  addData(parts[0] as Market[], parts[1] as MarketData[])
);

export type MarketMaybeWithDataAndCandles = MarketMaybeWithData &
  MarketMaybeWithCandles;

export const marketListProvider = makeDerivedDataProvider<
  MarketMaybeWithDataAndCandles[],
  never,
  MarketsCandlesQueryVariables
>(
  [
    (callback, client) => marketsWithDataProvider(callback, client, undefined),
    marketsCandlesProvider,
  ],
  (parts) =>
    addCandles(parts[0] as MarketMaybeWithData[], parts[1] as MarketCandles[])
);

export const useMarketList = () => {
  const yesterday = useYesterday();
  const variables = useMemo(() => {
    return {
      since: new Date(yesterday).toISOString(),
      interval: Schema.Interval.INTERVAL_I1H,
    };
  }, [yesterday]);
  const { data, loading, error, reload } = useDataProvider({
    dataProvider: marketListProvider,
    variables,
  });

  return {
    data,
    loading,
    error,
    reload,
  };
};
