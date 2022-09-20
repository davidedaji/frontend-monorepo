import { gql } from '@apollo/client';
import { makeDataProvider } from '@vegaprotocol/react-helpers';
import type {
  MarketCandlesQuery,
  MarketCandlesQuery_marketsConnection_edges_node_candlesConnection_edges_node,
  MarketCandlesSub,
  MarketCandlesSub_candles,
} from './__generated__';

export const MARKET_CANDLES_QUERY = gql`
  query MarketCandlesQuery(
    $interval: Interval!
    $since: String!
    $marketId: ID!
  ) {
    marketsConnection(id: $marketId) {
      edges {
        node {
          candlesConnection(interval: $interval, since: $since) {
            edges {
              node {
                high
                low
                open
                close
                volume
              }
            }
          }
        }
      }
    }
  }
`;

const MARKET_CANDLES_SUB = gql`
  subscription MarketCandlesSub($marketId: ID!, $interval: Interval!) {
    candles(interval: $interval, marketId: $marketId) {
      high
      low
      open
      close
      volume
    }
  }
`;

export type Candle =
  MarketCandlesQuery_marketsConnection_edges_node_candlesConnection_edges_node;

const update = (data: Candle[], delta: MarketCandlesSub_candles) => {
  return data && delta
    ? [
        ...data,
        {
          ...delta,
          __typename: 'Candle',
        } as Candle,
      ]
    : data;
};

const getData = (responseData: MarketCandlesQuery): Candle[] | null =>
  responseData?.marketsConnection?.edges[0]?.node.candlesConnection?.edges
    ?.filter((edge) => edge?.node)
    .map((edge) => edge?.node as Candle) || null;

const getDelta = (
  subscriptionData: MarketCandlesSub
): MarketCandlesSub_candles => subscriptionData.candles;

export const marketCandlesProvider = makeDataProvider<
  MarketCandlesQuery,
  Candle[],
  MarketCandlesSub,
  MarketCandlesSub_candles
>({
  query: MARKET_CANDLES_QUERY,
  subscriptionQuery: MARKET_CANDLES_SUB,
  update,
  getData,
  getDelta,
});
