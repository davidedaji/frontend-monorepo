import { t } from '@vegaprotocol/react-helpers';
import { Dialog } from '@vegaprotocol/ui-toolkit';
import { useVegaWallet } from '@vegaprotocol/wallet';
import { useCompleteWithdraw } from './use-complete-withdraw';
import { useCreateWithdraw } from './use-create-withdraw';
import { WithdrawFormContainer } from './withdraw-form-container';
import { WithdrawalFeedback } from './withdrawal-feedback';

export const WithdrawalDialogs = ({
  withdrawDialog,
  setWithdrawDialog,
}: {
  withdrawDialog: boolean;
  setWithdrawDialog: (open: boolean) => void;
}) => {
  const { keypair } = useVegaWallet();
  const createWithdraw = useCreateWithdraw();
  const completeWithdraw = useCompleteWithdraw();
  return (
    <>
      <Dialog
        title={t('Withdraw')}
        open={withdrawDialog}
        onChange={(isOpen) => setWithdrawDialog(isOpen)}
        size="small"
      >
        <WithdrawFormContainer
          partyId={keypair?.pub}
          submit={(args) => {
            setWithdrawDialog(false);
            createWithdraw.submit(args);
          }}
        />
      </Dialog>
      <createWithdraw.Dialog>
        <WithdrawalFeedback
          withdrawal={createWithdraw.withdrawal}
          transaction={createWithdraw.transaction}
          availableTimestamp={createWithdraw.availableTimestamp}
          submitWithdraw={(id) => {
            createWithdraw.reset();
            completeWithdraw.submit(id);
          }}
        />
      </createWithdraw.Dialog>
      <completeWithdraw.Dialog />
    </>
  );
};