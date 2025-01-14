import { t } from '@vegaprotocol/i18n';
import { Splash } from '@vegaprotocol/ui-toolkit';
import { useVegaWallet } from '@vegaprotocol/wallet';
import { FillsManager } from './fills-manager';

export const FillsContainer = ({
  marketId,
  onMarketClick,
  storeKey,
}: {
  marketId?: string;
  onMarketClick?: (marketId: string, metaKey?: boolean) => void;
  storeKey?: string;
}) => {
  const { pubKey } = useVegaWallet();

  if (!pubKey) {
    return (
      <Splash>
        <p>{t('Please connect Vega wallet')}</p>
      </Splash>
    );
  }

  return (
    <FillsManager
      partyId={pubKey}
      marketId={marketId}
      onMarketClick={onMarketClick}
      storeKey={storeKey}
    />
  );
};
