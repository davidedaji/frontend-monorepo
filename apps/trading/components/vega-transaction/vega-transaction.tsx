import { WithdrawalFeedback } from '@vegaprotocol/withdraws';
import { OrderFeedback } from '@vegaprotocol/orders';

import {
  VegaDialog,
  VegaTxStatus,
  isWithdrawTransaction,
  isOrderCancellationTransaction,
} from '@vegaprotocol/wallet';
import type { VegaStoredTxState } from '@vegaprotocol/wallet';

export const VegaTransaction = (transaction: VegaStoredTxState) => {
  if (isWithdrawTransaction(transaction.body)) {
    if (
      transaction.status === VegaTxStatus.Complete &&
      transaction.withdrawal
    ) {
      return (
        <WithdrawalFeedback
          transaction={transaction}
          withdrawal={transaction.withdrawal}
          availableTimestamp={null}
          // eslint-disable-next-line
          submitWithdraw={() => {}}
        />
      );
    }
  } else if (isOrderCancellationTransaction(transaction.body)) {
    if (transaction.status === VegaTxStatus.Complete && transaction.order) {
      return (
        <OrderFeedback transaction={transaction} order={transaction.order} />
      );
    }
    return <VegaDialog transaction={transaction} />;
  }
};
