import { t } from '@vegaprotocol/i18n';
import { Splash } from '@vegaprotocol/ui-toolkit';
import { useVegaWallet } from '@vegaprotocol/wallet';
import { FillsManager } from '@vegaprotocol/fills';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useDataGridEvents } from '@vegaprotocol/datagrid';
import type { DataGridSlice } from '../../stores/datagrid-store-slice';
import { createDataGridSlice } from '../../stores/datagrid-store-slice';

export const FillsContainer = ({
  marketId,
  onMarketClick,
}: {
  marketId?: string;
  onMarketClick?: (marketId: string, metaKey?: boolean) => void;
}) => {
  const { pubKey } = useVegaWallet();

  const [gridStore, update] = useFillsStore((store) => [
    store.gridStore,
    store.updateGridStore,
  ]);

  const gridStoreCallbacks = useDataGridEvents(gridStore, (colState) => {
    update(colState);
  });

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
      gridProps={gridStoreCallbacks}
    />
  );
};

const useFillsStore = create<DataGridSlice>()(
  persist(
    (...args) => ({
      ...createDataGridSlice(...args),
    }),
    {
      name: 'vega_fills_store',
    }
  )
);