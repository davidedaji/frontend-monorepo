import throttle from 'lodash/throttle';
import groupBy from 'lodash/groupBy';
import orderBy from 'lodash/orderBy';
import uniqBy from 'lodash/uniqBy';
import { AsyncRenderer } from '@vegaprotocol/ui-toolkit';
import { Orderbook } from './orderbook';
import { useDataProvider } from '@vegaprotocol/data-provider';
import { marketDepthProvider } from './market-depth-provider';
import { marketDataProvider, marketProvider } from '@vegaprotocol/markets';
import type { MarketData } from '@vegaprotocol/markets';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMarketDepthQuery } from './__generated__/MarketDepth';
import type {
  PriceLevelFieldsFragment,
  MarketDepthUpdateSubscription,
  MarketDepthQuery,
  MarketDepthQueryVariables,
} from './__generated__/MarketDepth';
import {
  compactRows,
  updateCompactedRows,
  getMidPrice,
  getPriceLevel,
} from './orderbook-data';
import type { OrderbookData } from './orderbook-data';
import { useOrderStore } from '@vegaprotocol/orders';
import ReactVirtualizedAutoSizer from 'react-virtualized-auto-sizer';
import { MarketDepthUpdateDocument } from './__generated__/MarketDepth';
import classNames from 'classnames';

interface OrderbookManagerProps {
  marketId: string;
}

export const OrderbookManager = ({ marketId }: OrderbookManagerProps) => {
  const [resolution, setResolution] = useState(0);
  const precision = [1, 2, 5, 10, 20, 50, 100, 1000, 2000][resolution];
  const { data, loading, error } = useBook(marketId);

  if (error) return <div>{error.message}</div>;
  if (loading || !data?.market?.depth) return <div>Loading...</div>;

  return (
    <div className="h-full overflow-hidden grid grid-rows-[min-content_1fr_min-content_1fr] text-xs">
      <div className="flex items-center gap-1">
        <button
          className="p-2 border"
          onClick={() => setResolution((x) => x + 1)}
        >
          -
        </button>
        <div>{precision}</div>
        <button
          className="p-2 border"
          onClick={() =>
            setResolution((x) => {
              if (x <= 0) return 0;
              return x - 1;
            })
          }
        >
          +
        </button>
      </div>
      <div>
        <ReactVirtualizedAutoSizer>
          {({ width, height }) => {
            const sell = data?.market?.depth.sell || [];
            const rowCount = Math.floor(height / 16);

            // group all prices that round to the same aggregated price
            //
            // { '1200': { __typename: 'PriceLevel', price: '1230' }}
            const lookup = groupBy(sell, (lvl) =>
              roundToCeil(Number(lvl.price), precision)
            );

            const aggregatedRows = Object.entries(lookup).map(
              ([price, group]) => {
                const volume = group.reduce(
                  (sum, lvl) => sum + Number(lvl.volume),
                  0
                );
                const numberOfOrders = group.reduce(
                  (sum, lvl) => sum + Number(lvl.numberOfOrders),
                  0
                );
                return {
                  price: String(price),
                  volume: String(volume),
                  numberOfOrders: String(numberOfOrders),
                };
              }
            );

            const rows = orderBy(
              aggregatedRows,
              (lvl) => Number(lvl.price),
              'desc'
            );

            // calc and add cumulative volume
            const rowsWithCumulativeVol: Array<{
              price: string;
              volume: string;
              cumulativeVolume: number;
            }> = [];
            let cumulativeVolume = 0;
            // sell orders are rendered desc, but cumulative volume
            // needs to be calculated from lowest price up
            for (let i = rows.length - 1; i >= 0; i--) {
              const lvl = rows[i];
              cumulativeVolume = cumulativeVolume + Number(lvl.price);
              rowsWithCumulativeVol.unshift({
                ...lvl,
                cumulativeVolume,
              });
            }

            const rowsToFit = rowsWithCumulativeVol.slice(
              rowsWithCumulativeVol.length - rowCount
            );

            return (
              <div
                style={{ width, height }}
                className="flex flex-col justify-end"
              >
                {rowsToFit.map((s) => (
                  <Row
                    key={s.price}
                    {...s}
                    totalVolume={cumulativeVolume}
                    side="sell"
                  />
                ))}
              </div>
            );
          }}
        </ReactVirtualizedAutoSizer>
      </div>
      <div className="text-center">Mid</div>
      <div>
        <ReactVirtualizedAutoSizer>
          {({ width, height }) => {
            const buy = data?.market?.depth.buy || [];
            const rowCount = Math.floor(height / 16);
            const lookup = groupBy(buy, (lvl) =>
              roundToFloor(Number(lvl.price), precision)
            );
            const aggregatedRows = Object.entries(lookup).map(
              ([price, group]) => {
                const volume = group.reduce(
                  (sum, lvl) => sum + Number(lvl.volume),
                  0
                );
                const numberOfOrders = group.reduce(
                  (sum, lvl) => sum + Number(lvl.numberOfOrders),
                  0
                );
                return {
                  price: String(price),
                  volume: String(volume),
                  numberOfOrders: String(numberOfOrders),
                };
              }
            );

            const rows = orderBy(
              aggregatedRows,
              (lvl) => Number(lvl.price),
              'desc'
            );

            const rowsWithCumulativeVol: Array<{
              price: string;
              volume: string;
              cumulativeVolume: number;
            }> = [];

            let cumulativeVolume = 0;

            rows.forEach((r) => {
              cumulativeVolume = cumulativeVolume + Number(r.volume);
              rowsWithCumulativeVol.push({
                ...r,
                cumulativeVolume,
              });
            });

            const rowsToFit = rowsWithCumulativeVol.slice(0, rowCount);

            return (
              <div style={{ width, height }}>
                {rowsToFit.map((b) => (
                  <Row
                    key={b.price}
                    {...b}
                    totalVolume={cumulativeVolume}
                    side="buy"
                  />
                ))}
              </div>
            );
          }}
        </ReactVirtualizedAutoSizer>
      </div>
    </div>
  );
};

const Row = ({
  price,
  volume,
  cumulativeVolume,
  totalVolume,
  side,
}: {
  price: string;
  volume: string;
  cumulativeVolume: number;
  totalVolume: number;
  side: 'buy' | 'sell';
}) => {
  return (
    <div className="relative text-right font-mono">
      <Bar
        cumulativeVolume={cumulativeVolume}
        totalVolume={totalVolume}
        side={side}
      />
      <div className="relative grid grid-cols-3 z-10">
        <div>{price}</div>
        <div>{volume}</div>
        <div>{cumulativeVolume}</div>
      </div>
    </div>
  );
};

const Bar = ({
  cumulativeVolume,
  totalVolume,
  side,
}: {
  cumulativeVolume: number;
  totalVolume: number;
  side: 'buy' | 'sell';
}) => {
  const classes = classNames('absolute right-0 h-full z-0', {
    'bg-vega-green-300': side === 'buy',
    'bg-vega-pink-300': side === 'sell',
  });
  const pct = (cumulativeVolume / totalVolume) * 100;
  return (
    <div style={{ width: pct + '%', minWidth: '2px' }} className={classes} />
  );
};

const useBook = (marketId: string) => {
  const { data, loading, error, subscribeToMore } = useMarketDepthQuery({
    variables: {
      marketId,
    },
  });

  useEffect(() => {
    if (!marketId) return;
    const unsub = subscribeToMore({
      document: MarketDepthUpdateDocument,
      variables: { marketId },
      updateQuery: (
        prev: MarketDepthQuery,
        {
          subscriptionData,
        }: { subscriptionData: { data: MarketDepthUpdateSubscription } }
      ) => {
        if (!subscriptionData.data.marketsDepthUpdate) {
          return prev;
        }

        const currBuy = prev.market?.depth.buy || [];
        const currSell = prev.market?.depth.sell || [];
        const update = subscriptionData.data.marketsDepthUpdate[0];

        const newBuy = update.buy || [];
        const newSell = update.sell || [];

        const buy = orderBy(
          uniqBy([...newBuy, ...currBuy], 'price'),
          (lvl) => Number(lvl.price),
          'desc'
        ).filter((lvl) => lvl.volume !== '0');
        const sell = orderBy(
          uniqBy([...newSell, ...currSell], 'price'),
          (lvl) => Number(lvl.price),
          'asc'
        ).filter((lvl) => lvl.volume !== '0');

        return {
          market: {
            id: marketId,
            __typename: 'Market',
            ...prev.market,
            depth: {
              __typename: 'MarketDepth',
              sell,
              buy,
              sequenceNumber: update.sequenceNumber,
            },
          },
        };
      },
    });

    return () => {
      unsub();
    };
  }, [marketId, subscribeToMore]);

  return { data, loading, error };
};

const roundToCeil = (x: number, m: number) => {
  return Math.ceil(x / m) * m;
};

const roundToFloor = (x: number, m: number) => {
  return Math.ceil(x / m) * m;
};

export const OrderbookManager2 = ({ marketId }: OrderbookManagerProps) => {
  const [resolution, setResolution] = useState(1);
  const variables = { marketId };
  const resolutionRef = useRef(resolution);
  const [orderbookData, setOrderbookData] = useState<OrderbookData>({
    rows: null,
  });
  const dataRef = useRef<OrderbookData>({ rows: null });
  const marketDataRef = useRef<MarketData | null>(null);
  const rawDataRef = useRef<MarketDepthQuery['market'] | null>(null);
  const deltaRef = useRef<{
    sell: PriceLevelFieldsFragment[];
    buy: PriceLevelFieldsFragment[];
  }>({
    sell: [],
    buy: [],
  });
  const updateOrderbookData = useRef(
    throttle(() => {
      dataRef.current = {
        ...marketDataRef.current,
        indicativePrice:
          marketDataRef.current?.indicativePrice &&
          getPriceLevel(
            marketDataRef.current.indicativePrice,
            resolutionRef.current
          ),
        midPrice: getMidPrice(
          rawDataRef.current?.depth.sell,
          rawDataRef.current?.depth.buy,
          resolution
        ),
        rows:
          deltaRef.current.buy.length || deltaRef.current.sell.length
            ? updateCompactedRows(
                dataRef.current.rows ?? [],
                deltaRef.current.sell,
                deltaRef.current.buy,
                resolutionRef.current
              )
            : dataRef.current.rows,
      };
      deltaRef.current.buy = [];
      deltaRef.current.sell = [];
      setOrderbookData(dataRef.current);
    }, 250)
  );

  useEffect(() => {
    deltaRef.current.buy = [];
    deltaRef.current.sell = [];
  }, [marketId]);

  const update = useCallback(
    ({
      delta: deltas,
      data: rawData,
    }: {
      delta?: MarketDepthUpdateSubscription['marketsDepthUpdate'] | null;
      data: NonNullable<MarketDepthQuery['market']> | null | undefined;
    }) => {
      if (!dataRef.current.rows) {
        return false;
      }
      for (const delta of deltas || []) {
        if (delta.marketId !== marketId) {
          continue;
        }
        if (delta.sell) {
          deltaRef.current.sell.push(...delta.sell);
        }
        if (delta.buy) {
          deltaRef.current.buy.push(...delta.buy);
        }
        rawDataRef.current = rawData;
        updateOrderbookData.current();
      }
      return true;
    },
    [marketId, updateOrderbookData]
  );

  const { data, error, loading, flush, reload } = useDataProvider<
    MarketDepthQuery['market'] | undefined,
    MarketDepthUpdateSubscription['marketsDepthUpdate'] | null,
    MarketDepthQueryVariables
  >({
    dataProvider: marketDepthProvider,
    update,
    variables,
  });

  const {
    data: market,
    error: marketError,
    loading: marketLoading,
  } = useDataProvider({
    dataProvider: marketProvider,
    skipUpdates: true,
    variables,
  });

  const marketDataUpdate = useCallback(
    ({ data }: { data: MarketData | null }) => {
      marketDataRef.current = data;
      updateOrderbookData.current();
      return true;
    },
    []
  );

  const {
    data: marketData,
    error: marketDataError,
    loading: marketDataLoading,
  } = useDataProvider({
    dataProvider: marketDataProvider,
    update: marketDataUpdate,
    variables,
  });

  if (!marketDataRef.current && marketData) {
    marketDataRef.current = marketData;
  }

  useEffect(() => {
    const throttleRunner = updateOrderbookData.current;
    if (!data) {
      dataRef.current = { rows: null };
      setOrderbookData(dataRef.current);
      return;
    }
    dataRef.current = {
      ...marketDataRef.current,
      indicativePrice:
        marketDataRef.current?.indicativePrice &&
        getPriceLevel(marketDataRef.current.indicativePrice, resolution),
      midPrice: getMidPrice(data.depth.sell, data.depth.buy, resolution),
      rows: compactRows(data.depth.sell, data.depth.buy, resolution),
    };
    rawDataRef.current = data;
    setOrderbookData(dataRef.current);

    return () => {
      throttleRunner.cancel();
    };
  }, [data, resolution]);

  useEffect(() => {
    resolutionRef.current = resolution;
    flush();
  }, [resolution, flush]);

  const updateOrder = useOrderStore((store) => store.update);

  return (
    <AsyncRenderer
      loading={loading || marketDataLoading || marketLoading}
      error={error || marketDataError || marketError}
      data={data}
      reload={reload}
    >
      <Orderbook
        {...orderbookData}
        decimalPlaces={market?.decimalPlaces ?? 0}
        positionDecimalPlaces={market?.positionDecimalPlaces ?? 0}
        resolution={resolution}
        onResolutionChange={(resolution: number) => setResolution(resolution)}
        onClick={(price: string) => {
          if (price) {
            updateOrder(marketId, { price });
          }
        }}
      />
    </AsyncRenderer>
  );
};
