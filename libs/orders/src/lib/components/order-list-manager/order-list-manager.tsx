import compact from 'lodash/compact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { MarketFieldsFragment } from '@vegaprotocol/markets';
import { useMarketsQuery } from '@vegaprotocol/markets';
import { useAssetsQuery } from '@vegaprotocol/assets';
import { AgGridLazy } from '@vegaprotocol/datagrid';
import type { OrdersUpdateSubscription } from '../order-data-provider';
import { useOrdersUpdateSubscription } from '../order-data-provider';
import type { ArrayElement } from 'type-fest/source/internal';
import { OrderStatus } from '@vegaprotocol/types';
import { orderBy, uniqBy } from 'lodash';

export enum Filter {
  'Open',
  'Closed',
  'Rejected',
}
export interface OrderListManagerProps {
  partyId: string;
  marketId?: string;
  onMarketClick?: (marketId: string, metaKey?: boolean) => void;
  onOrderTypeClick?: (marketId: string, metaKey?: boolean) => void;
  isReadOnly: boolean;
  enforceBottomPlaceholder?: boolean;
  filter?: Filter;
  storeKey?: string;
}

const useMarkets = () => {
  const { data, loading, error } = useMarketsQuery();

  const markets = data?.marketsConnection?.edges.map((e) => e.node) || [];
  const marketLookup: Record<string, MarketFieldsFragment> = {};

  markets.forEach((m) => {
    marketLookup[m.id] = m;
  });

  return {
    markets: marketLookup,
    data,
    loading,
    error,
  };
};

const useAssets = () => {
  const { data, loading, error } = useAssetsQuery();
  return {
    assets: compact(data?.assetsConnection?.edges || []).map((e) => e.node),
    data,
    loading,
    error,
  };
};

type Order = ArrayElement<OrdersUpdateSubscription['orders']>;

const useOrders = (partyId?: string) => {
  const loadRef = useRef(true);
  const [orders, setOrders] = useState<Order[]>([]);

  const { loading, error } = useOrdersUpdateSubscription({
    variables: {
      partyId: partyId || '',
    },
    skip: !partyId,
    fetchPolicy: 'no-cache', // dont cache as we are caching here in the hook
    onData: ({ data }) => {
      const update = data.data?.orders || [];

      if (loadRef.current) {
        setOrders(update);
        loadRef.current = false;
        return;
      }

      if (!update.length) return;

      // update orders
      setOrders((curr) => {
        // this might not be required all timestamps seem to be the same now
        const sortedIncoming = orderBy(
          update,
          (o) => {
            if (o.updatedAt) {
              return new Date(o.updatedAt).getTime();
            }
            return new Date(o.createdAt).getTime();
          },
          'desc'
        );
        const combined = uniqBy([...sortedIncoming, ...curr], 'id');
        return combined.filter((o) => isOrderActive(o));
      });
    },
  });

  return {
    orders,
    loading,
    error,
  };
};

const isOrderActive = (o: { status: OrderStatus }) => {
  return [
    OrderStatus.STATUS_ACTIVE,
    OrderStatus.STATUS_PARKED,
    OrderStatus.STATUS_PARTIALLY_FILLED,
  ].includes(o.status);
};

export const OrderListManager = ({ partyId }: OrderListManagerProps) => {
  const { markets } = useMarkets();
  const { assets } = useAssets();
  const { orders } = useOrders(partyId);

  const coldefs = useMemo(() => {
    return [
      {
        field: 'marketId',
        valueGetter: ({ data }) => {
          const market = markets[data.marketId];
          return market.tradableInstrument.instrument.code;
        },
        sortable: true,
        filter: true,
      },
      {
        field: 'status',
      },
      {
        field: 'price',
      },
      {
        field: 'side',
      },
      {
        field: 'createdAt',
      },
      {
        field: 'updatedAt',
      },
    ];
  }, [markets]);

  if (!Object.keys(markets).length) {
    return <div>No markets</div>;
  }

  if (!assets.length) {
    return <div>No assets</div>;
  }

  return (
    <AgGridLazy
      style={{ width: '100%', height: '100%' }}
      columnDefs={coldefs}
      rowData={orders}
      getRowId={({ data }) => data.id}
    />
  );
};
