import type { MouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import { t } from '@vegaprotocol/i18n';
import { AsyncRenderer } from '@vegaprotocol/ui-toolkit';
import { MarketListTable } from './market-list-table';
import { useDataProvider } from '@vegaprotocol/data-provider';
import type { CellClickedEvent } from 'ag-grid-community';
import { marketsWithDataProvider } from '../../markets-provider';
import { marketsDataProvider } from '../../markets-data-provider';
import type { MarketMaybeWithData } from '../../markets-provider';

interface MarketsContainerProps {
  onSelect: (marketId: string, metaKey?: boolean) => void;
}

export const MarketsContainer = ({ onSelect }: MarketsContainerProps) => {
  const gridRef = useRef<AgGridReact | null>(null);
  const [dataCount, setDataCount] = useState(0);
  const { data, error, loading, reload } = useDataProvider({
    dataProvider: marketsWithDataProvider,
    variables: undefined,
  });
  const { reload: reloadMarketData } = useDataProvider({
    dataProvider: marketsDataProvider,
    variables: undefined,
  });
  useEffect(() => {
    setDataCount(gridRef.current?.api?.getModel().getRowCount() ?? 0);
  }, [data]);
  const onFilterChanged = useCallback(() => {
    setDataCount(gridRef.current?.api?.getModel().getRowCount() ?? 0);
  }, []);
  useEffect(() => {
    const interval = setInterval(reloadMarketData, 1000);
    return () => clearInterval(interval);
  }, [reloadMarketData]);
  return (
    <div className="h-full relative">
      <MarketListTable
        ref={gridRef}
        rowData={data}
        suppressLoadingOverlay
        suppressNoRowsOverlay
        onCellClicked={(cellEvent: CellClickedEvent) => {
          const { data, column, event } = cellEvent;
          // prevent navigating to the market page if any of the below cells are clicked
          // event.preventDefault or event.stopPropagation dont seem to apply for aggird
          const colId = column.getColId();
          if (
            [
              'id',
              'tradableInstrument.instrument.code',
              'tradableInstrument.instrument.product.settlementAsset',
            ].includes(colId)
          ) {
            return;
          }
          onSelect(
            (data as MarketMaybeWithData).id,
            (event as unknown as MouseEvent)?.metaKey ||
              (event as unknown as MouseEvent)?.ctrlKey
          );
        }}
        onMarketClick={onSelect}
        onFilterChanged={onFilterChanged}
      />
      <div className="pointer-events-none absolute inset-0">
        <AsyncRenderer
          loading={loading}
          error={error}
          data={data}
          noDataMessage={t('No markets')}
          noDataCondition={() => !dataCount}
          reload={reload}
        />
      </div>
    </div>
  );
};
