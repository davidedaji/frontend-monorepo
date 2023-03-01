import { useEnvironment } from '@vegaprotocol/environment';
import type { OrderEvent_busEvents_event_Order } from '../../order-hooks/__generated__/OrderEvent';
import { addDecimalsFormatNumber, Size, t } from '@vegaprotocol/react-helpers';
import {
  OrderRejectionReasonMapping,
  OrderStatus,
  OrderStatusMapping,
  OrderTimeInForceMapping,
  OrderType,
} from '@vegaprotocol/types';
import type { VegaTxState } from '@vegaprotocol/wallet';
import { Link } from '@vegaprotocol/ui-toolkit';

export interface OrderFeedbackProps {
  transaction: VegaTxState;
  order: OrderEvent_busEvents_event_Order | null;
}

export const OrderFeedback = ({ transaction, order }: OrderFeedbackProps) => {
  const { VEGA_EXPLORER_URL } = useEnvironment();
  const labelClass = 'font-bold text-black dark:text-white capitalize';
  if (!order) return null;

  const orderRejectionReason = getRejectionReason(order);

  return (
    <div data-testid="order-confirmed" className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {order.market && (
          <div>
            <p className={labelClass}>{t(`Market`)}</p>
            <p>{t(`${order.market.tradableInstrument.instrument.name}`)}</p>
          </div>
        )}
        <div>
          <p className={labelClass}>{t(`Status`)}</p>
          <p>{t(`${OrderStatusMapping[order.status]}`)}</p>
        </div>
        {order.type === OrderType.TYPE_LIMIT && order.market && (
          <div>
            <p className={labelClass}>{t(`Price`)}</p>
            <p>
              {addDecimalsFormatNumber(order.price, order.market.decimalPlaces)}
            </p>
          </div>
        )}
        <div>
          <p className={labelClass}>{t(`Size`)}</p>
          <p>
            <Size
              value={order.size}
              side={order.side}
              positionDecimalPlaces={order.market.positionDecimalPlaces}
            />
          </p>
        </div>
      </div>
      <div className="grid gap-8 mb-8">
        {transaction.txHash && (
          <div>
            <p className={labelClass}>{t('Transaction')}</p>
            <Link
              style={{ wordBreak: 'break-word' }}
              data-testid="tx-block-explorer"
              href={`${VEGA_EXPLORER_URL}/txs/0x${transaction.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {transaction.txHash}
            </Link>
          </div>
        )}

        {orderRejectionReason && (
          <div>
            <p className={labelClass}>{t(`Reason`)}</p>
            <p data-testid="error-reason">{t(orderRejectionReason)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const getRejectionReason = (
  order: OrderEvent_busEvents_event_Order
): string | null => {
  switch (order.status) {
    case OrderStatus.STATUS_STOPPED:
      return t(
        `Your ${
          OrderTimeInForceMapping[order.timeInForce]
        } order was not filled and it has been stopped`
      );
    case OrderStatus.STATUS_REJECTED:
      return (
        order.rejectionReason &&
        t(OrderRejectionReasonMapping[order.rejectionReason])
      );
    default:
      return null;
  }
};