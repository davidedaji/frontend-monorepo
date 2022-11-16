import { useMemo } from 'react';
import compact from 'lodash/compact';
import { useVegaWallet } from '@vegaprotocol/wallet';
import { Schema } from '@vegaprotocol/types';
import { toBigNum } from '@vegaprotocol/react-helpers';
import type { DealTicketMarketFragment } from '../components/deal-ticket/__generated__/DealTicket';
import type { OrderMargin } from './use-order-margin';
import { usePartyBalanceQuery } from './__generated__/PartyBalance';
import { useSettlementAccount } from './use-settlement-account';

interface Props {
  market: DealTicketMarketFragment;
  estMargin: OrderMargin | null;
}

export const useOrderMarginValidation = ({ market, estMargin }: Props) => {
  const { pubKey } = useVegaWallet();

  const { data: partyBalance } = usePartyBalanceQuery({
    variables: { partyId: pubKey || '' },
    skip: !pubKey,
    fetchPolicy: 'no-cache',
  });

  const accounts = compact(partyBalance?.party?.accountsConnection?.edges).map(
    (e) => e.node
  );
  const settlementAccount = useSettlementAccount(
    market.tradableInstrument.instrument.product.settlementAsset.id,
    accounts,
    Schema.AccountType.ACCOUNT_TYPE_GENERAL
  );
  const assetDecimals =
    market.tradableInstrument.instrument.product.settlementAsset.decimals;
  const balance = settlementAccount
    ? toBigNum(
        settlementAccount.balance || 0,
        settlementAccount.asset.decimals || 0
      )
    : toBigNum('0', assetDecimals);
  const margin = toBigNum(estMargin?.margin || 0, assetDecimals);
  const asset = market.tradableInstrument.instrument.product.settlementAsset;

  const memoizedValue = useMemo(() => {
    return {
      balance,
      margin,
      asset,
    };
  }, [balance, margin, asset]);

  return memoizedValue;
};
