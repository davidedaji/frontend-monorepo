import { AsyncRenderer } from '@vegaprotocol/ui-toolkit';
import { t } from '@vegaprotocol/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@vegaprotocol/ui-toolkit';
import type { AgGridReact } from 'ag-grid-react';
import type { GridReadyEvent, FilterChangedEvent } from 'ag-grid-community';

import { OrderListTable } from '../order-list/order-list';
import { useHasAmendableOrder } from '../../order-hooks/use-has-amendable-order';
import { useBottomPlaceholder } from '@vegaprotocol/react-helpers';
import { useDataProvider } from '@vegaprotocol/react-helpers';
import { ordersWithMarketProvider } from '../order-data-provider/order-data-provider';
import {
  normalizeOrderAmendment,
  useVegaTransactionStore,
} from '@vegaprotocol/wallet';
import type { OrderTxUpdateFieldsFragment } from '@vegaprotocol/wallet';
import { OrderEditDialog } from '../order-list/order-edit-dialog';
import type { Order } from '../order-data-provider';
import { OrderStatus } from '@vegaprotocol/types';

export enum Filter {
  'Open',
  'Closed',
  'Rejected',
}

const FilterStatusValue = {
  [Filter.Open]: [OrderStatus.STATUS_ACTIVE, OrderStatus.STATUS_PARKED],
  [Filter.Closed]: [
    OrderStatus.STATUS_CANCELLED,
    OrderStatus.STATUS_EXPIRED,
    OrderStatus.STATUS_FILLED,
    OrderStatus.STATUS_PARTIALLY_FILLED,
    OrderStatus.STATUS_STOPPED,
  ],
  [Filter.Rejected]: [OrderStatus.STATUS_REJECTED],
};

export interface OrderListManagerProps {
  partyId: string;
  marketId?: string;
  onMarketClick?: (marketId: string, metaKey?: boolean) => void;
  onOrderTypeClick?: (marketId: string, metaKey?: boolean) => void;
  isReadOnly: boolean;
  enforceBottomPlaceholder?: boolean;
  filter?: Filter;
  id?: string;
}

const CancelAllOrdersButton = ({ onClick }: { onClick: () => void }) => (
  <div className="dark:bg-black/75 bg-white/75 h-auto flex justify-end px-[11px] py-2 absolute bottom-0 right-3 rounded">
    <Button
      variant="primary"
      size="sm"
      onClick={onClick}
      data-testid="cancelAll"
    >
      {t('Cancel all')}
    </Button>
  </div>
);

export const OrderListManager = ({
  partyId,
  marketId,
  onMarketClick,
  onOrderTypeClick,
  isReadOnly,
  enforceBottomPlaceholder,
  filter,
  id,
}: OrderListManagerProps) => {
  const gridRef = useRef<AgGridReact | null>(null);
  const [hasData, setHasData] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const create = useVegaTransactionStore((state) => state.create);
  const hasAmendableOrder = useHasAmendableOrder(marketId);
  const { data, error, loading, reload } = useDataProvider({
    dataProvider: ordersWithMarketProvider,
    variables:
      filter === Filter.Open
        ? { partyId, filter: { liveOnly: true } }
        : { partyId },
  });

  const {
    onFilterChanged: bottomPlaceholderOnFilterChanged,
    ...bottomPlaceholderProps
  } = useBottomPlaceholder<Order>({
    gridRef,
    disabled: !enforceBottomPlaceholder && !isReadOnly && !hasAmendableOrder,
  });

  const cancel = useCallback(
    (order: Order) => {
      if (!order.market) return;
      create({
        orderCancellation: {
          orderId: order.id,
          marketId: order.market.id,
        },
      });
    },
    [create]
  );

  const onGridReady = useCallback(
    ({ api }: GridReadyEvent) => {
      if (filter !== undefined) {
        api.setFilterModel({
          status: {
            value: FilterStatusValue[filter],
          },
        });
      }
    },
    [filter]
  );

  const onFilterChanged = useCallback(
    (event: FilterChangedEvent) => {
      const rowCount = gridRef.current?.api?.getModel().getRowCount();
      setHasData((rowCount ?? 0) > 0);
      bottomPlaceholderOnFilterChanged?.();
    },
    [bottomPlaceholderOnFilterChanged]
  );

  useEffect(() => {
    setHasData((gridRef.current?.api?.getModel().getRowCount() ?? 0) > 0);
  }, [data]);

  const cancelAll = useCallback(() => {
    create({
      orderCancellation: {
        marketId,
      },
    });
  }, [create, marketId]);

  return (
    <>
      <div className="h-full relative">
        <OrderListTable
          id={id}
          rowData={data as Order[]}
          ref={gridRef}
          readonlyStatusFilter={filter !== undefined}
          onGridReady={onGridReady}
          cancel={cancel}
          setEditOrder={setEditOrder}
          onMarketClick={onMarketClick}
          onOrderTypeClick={onOrderTypeClick}
          onFilterChanged={onFilterChanged}
          isReadOnly={isReadOnly}
          blockLoadDebounceMillis={100}
          suppressLoadingOverlay
          suppressNoRowsOverlay
          suppressAutoSize
          {...bottomPlaceholderProps}
        />
        <div className="pointer-events-none absolute inset-0">
          <AsyncRenderer
            loading={loading}
            error={error}
            data={data}
            noDataMessage={t('No orders')}
            noDataCondition={(data) => !hasData}
            reload={reload}
          />
        </div>
      </div>
      {!isReadOnly && hasAmendableOrder && (
        <CancelAllOrdersButton onClick={cancelAll} />
      )}
      {editOrder && (
        <OrderEditDialog
          isOpen={Boolean(editOrder)}
          onChange={(isOpen) => {
            if (!isOpen) setEditOrder(null);
          }}
          order={editOrder}
          onSubmit={(fields) => {
            if (!editOrder.market) {
              return;
            }
            const orderAmendment = normalizeOrderAmendment(
              editOrder,
              editOrder.market,
              fields.limitPrice,
              fields.size
            );
            const originalOrder: OrderTxUpdateFieldsFragment = {
              type: editOrder.type,
              id: editOrder.id,
              status: editOrder.status,
              createdAt: editOrder.createdAt,
              size: editOrder.size,
              price: editOrder.price,
              timeInForce: editOrder.timeInForce,
              expiresAt: editOrder.expiresAt,
              side: editOrder.side,
              marketId: editOrder.market.id,
            };
            create({ orderAmendment }, originalOrder);
            setEditOrder(null);
          }}
        />
      )}
    </>
  );
};
