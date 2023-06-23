import { Button } from '@vegaprotocol/ui-toolkit';
import {
  withdrawalProvider,
  useWithdrawalDialog,
  WithdrawalsTable,
} from '@vegaprotocol/withdraws';
import { useVegaWallet } from '@vegaprotocol/wallet';
import { t } from '@vegaprotocol/i18n';
import { useDataProvider } from '@vegaprotocol/data-provider';
import { VegaWalletContainer } from '../../components/vega-wallet-container';

export const WithdrawalsContainer = () => {
  const { pubKey, isReadOnly } = useVegaWallet();
  const { data, error } = useDataProvider({
    dataProvider: withdrawalProvider,
    variables: { partyId: pubKey || '' },
    skip: !pubKey,
  });
  const openWithdrawDialog = useWithdrawalDialog((state) => state.open);

  return (
    <VegaWalletContainer>
      <div className="h-full relative">
        <WithdrawalsTable
          data-testid="withdrawals-history"
          rowData={data}
          overlayNoRowsTemplate={error ? error.message : t('No withdrawals')}
        />
      </div>
      {!isReadOnly && (
        <div className="h-auto flex justify-end px-[11px] py-2 bottom-0 right-3 absolute rounded">
          <Button
            variant="primary"
            size="sm"
            onClick={() => openWithdrawDialog()}
            data-testid="withdraw-dialog-button"
          >
            {t('Make withdrawal')}
          </Button>
        </div>
      )}
    </VegaWalletContainer>
  );
};
