import produce from 'immer';
import orderBy from 'lodash/orderBy';
import uniqBy from 'lodash/uniqBy';
import {
  makeDataProvider,
  makeDerivedDataProvider,
  defaultAppend as append,
} from '@vegaprotocol/data-provider';
import type { Market } from '@vegaprotocol/markets';
import { marketsProvider } from '@vegaprotocol/markets';
import type { PageInfo, Edge } from '@vegaprotocol/data-provider';
import { OrderStatus } from '@vegaprotocol/types';
import type {
  OrderFieldsFragment,
  OrderUpdateFieldsFragment,
  OrdersQuery,
  OrdersUpdateSubscription,
  OrdersQueryVariables,
} from './__generated__/Orders';
import { OrdersDocument, OrdersUpdateDocument } from './__generated__/Orders';
import type { ApolloClient } from '@apollo/client';

export type Order = Omit<OrderFieldsFragment, 'market'> & {
  market?: Market;
  isLastPlaceholder?: boolean;
};
export type OrderEdge = Edge<Order>;

const liveOnlyOrderStatuses = [
  OrderStatus.STATUS_ACTIVE,
  OrderStatus.STATUS_PARKED,
];

const orderMatchFilters = (
  order: OrderUpdateFieldsFragment,
  variables: OrdersQueryVariables
) => {
  if (!order) {
    return true;
  }
  if (
    variables?.filter?.status &&
    !(order.status && variables.filter.status.includes(order.status))
  ) {
    return false;
  }
  if (
    variables?.filter?.liveOnly &&
    !(order.status && liveOnlyOrderStatuses.includes(order.status))
  ) {
    return false;
  }
  if (
    variables?.filter?.types &&
    !(order.type && variables.filter.types.includes(order.type))
  ) {
    return false;
  }
  if (
    variables?.filter?.timeInForce &&
    !variables.filter.timeInForce.includes(order.timeInForce)
  ) {
    return false;
  }
  if (variables?.filter?.excludeLiquidity && order.liquidityProvisionId) {
    return false;
  }
  if (
    variables?.filter?.dateRange?.start &&
    !(order.createdAt && variables.filter.dateRange.start < order.createdAt)
  ) {
    return false;
  }
  if (
    variables?.filter?.dateRange?.end &&
    !(order.createdAt && variables.filter.dateRange.end > order.createdAt)
  ) {
    return false;
  }
  return true;
};

const getData = (
  responseData: OrdersQuery | null
): Edge<OrderFieldsFragment>[] =>
  responseData?.party?.ordersConnection?.edges || [];

const getDelta = (
  subscriptionData: OrdersUpdateSubscription,
  variables: OrdersQueryVariables,
  client: ApolloClient<object>
) => {
  if (!subscriptionData.orders) {
    return [];
  }
  return subscriptionData.orders;
};

export const update = (
  data: ReturnType<typeof getData> | null,
  delta: ReturnType<typeof getDelta>,
  reload: () => void,
  variables?: OrdersQueryVariables
) => {
  if (!data) {
    return data;
  }
  // A single update can contain the same order with multiple updates, so we need to find
  // the latest version of the order and only update using that
  const incoming = orderBy(
    uniqBy(
      orderBy(delta, (order) => order.updatedAt || order.createdAt, 'desc'),
      'id'
    ),
    'createdAt'
  );

  return produce(data, (draft) => {
    // Add or update incoming orders
    incoming.forEach((node) => {
      const index = data.findIndex((edge) => edge.node.id === node.id);
      const newer =
        data.length === 0 || node.createdAt >= data[0].node.createdAt;
      const doesFilterPass = !variables || orderMatchFilters(node, variables);
      if (index !== -1) {
        if (doesFilterPass) {
          Object.assign(draft[index].node, node);
        } else {
          draft.splice(index, 1);
        }
      } else if (newer && doesFilterPass) {
        const { marketId, liquidityProvisionId, ...order } = node;

        // If there is a liquidity provision id add the object to the resulting order
        const liquidityProvision:
          | OrderFieldsFragment['liquidityProvision']
          | null = liquidityProvisionId
          ? {
              __typename: 'LiquidityProvision',
            }
          : null;

        draft.unshift({
          node: {
            ...order,
            liquidityProvision: liquidityProvision,
            market: {
              __typename: 'Market',
              id: marketId,
            },
            __typename: 'Order',
          },
          cursor: '',
        });
      }
    });
  });
};

const getPageInfo = (responseData: OrdersQuery): PageInfo | null =>
  responseData.party?.ordersConnection?.pageInfo || null;

export const ordersProvider = makeDataProvider<
  OrdersQuery,
  ReturnType<typeof getData>,
  OrdersUpdateSubscription,
  ReturnType<typeof getDelta>,
  OrdersQueryVariables
>({
  query: OrdersDocument,
  subscriptionQuery: OrdersUpdateDocument,
  update,
  getData,
  getDelta,
  pagination: {
    getPageInfo,
    append,
    first: 5000,
  },
  resetDelay: 1000,
  additionalContext: { isEnlargedTimeout: true },
  fetchPolicy: 'no-cache',
});

export const activeOrdersProvider = makeDerivedDataProvider<
  ReturnType<typeof getData>,
  never,
  { partyId: string; marketId?: string }
>(
  [
    (callback, client, variables) =>
      ordersProvider(callback, client, {
        partyId: variables.partyId,
        filter: {
          liveOnly: true,
        },
      }),
  ],
  (partsData, variables, prevData, parts, subscriptions) => {
    // load all pages
    if (!parts[0].isUpdate && subscriptions && subscriptions[0].load) {
      subscriptions[0].load();
    }
    const orders = partsData[0] as ReturnType<typeof getData>;
    return variables.marketId
      ? orders.filter((edge) => variables.marketId === edge.node.market.id)
      : orders;
  }
);

export const ordersWithMarketProvider = makeDerivedDataProvider<
  (Order | null)[],
  Order[],
  OrdersQueryVariables
>(
  [
    ordersProvider,
    (callback, client) => marketsProvider(callback, client, undefined),
  ],
  (partsData): Order[] =>
    ((partsData[0] as ReturnType<typeof getData>) || []).map((edge) => ({
      ...edge.node,
      market: (partsData[1] as Market[]).find(
        (market) => market.id === edge.node.market.id
      ),
    }))
);

export const hasActiveOrderProvider = makeDerivedDataProvider<
  boolean,
  never,
  { partyId: string; marketId?: string }
>([activeOrdersProvider], (parts) => !!parts[0].length);

export const hasAmendableOrderProvider = makeDerivedDataProvider<
  boolean,
  never,
  { partyId: string; marketId?: string }
>([activeOrdersProvider], (parts) => {
  const activeOrders = parts[0] as ReturnType<typeof getData>;
  const hasAmendableOrder = activeOrders.some(
    (edge) => !(edge.node.liquidityProvision || edge.node.peggedOrder)
  );
  return hasAmendableOrder;
});
