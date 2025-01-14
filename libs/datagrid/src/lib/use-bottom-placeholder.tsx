import type { RefObject } from 'react';
import { useCallback, useMemo } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import type { IsFullWidthRowParams, RowHeightParams } from 'ag-grid-community';

const NO_HOVER_CSS_RULE = { 'no-hover': 'data?.isLastPlaceholder' };
const ROW_ID = 'bottom-placeholder';
const fullWidthCellRenderer = () => null;
const isFullWidthRow = (params: IsFullWidthRowParams) =>
  params.rowNode.data?.isLastPlaceholder;

interface Props {
  gridRef: RefObject<AgGridReact>;
  disabled?: boolean;
}
// eslint-disable-next-line @typescript-eslint/ban-types
export const useBottomPlaceholder = ({ gridRef, disabled }: Props) => {
  const onBodyScrollEnd = useCallback(() => {
    const rowCont = gridRef.current?.api.getDisplayedRowCount() ?? 0;
    if (rowCont) {
      const lastRow = gridRef.current?.api.getDisplayedRowAtIndex(rowCont - 1);
      if (lastRow && lastRow.data) {
        const placeholderRow = {
          ...lastRow.data,
          isLastPlaceholder: true,
          id: ROW_ID,
        };
        const transaction = gridRef.current?.api.getRowNode(ROW_ID)
          ? { update: [placeholderRow] }
          : { add: [placeholderRow] };
        gridRef.current?.api.applyTransaction(transaction);
      }
    }
  }, [gridRef]);

  const onRowsChanged = useCallback(() => {
    const placeholderNode = gridRef.current?.api.getRowNode(ROW_ID);
    if (placeholderNode) {
      const transaction = {
        remove: [placeholderNode.data],
      };
      gridRef.current?.api.applyTransaction(transaction);
    }
    onBodyScrollEnd();
  }, [gridRef, onBodyScrollEnd]);

  const getRowHeight = useCallback(
    (params: RowHeightParams) =>
      params.data?.isLastPlaceholder ? 50 : undefined,
    []
  );

  return useMemo(
    () =>
      !disabled
        ? {
            onBodyScrollEnd,
            rowClassRules: NO_HOVER_CSS_RULE,
            isFullWidthRow,
            fullWidthCellRenderer,
            onSortChanged: onRowsChanged,
            onFilterChanged: onRowsChanged,
            getRowHeight,
          }
        : {},
    [onBodyScrollEnd, onRowsChanged, disabled, getRowHeight]
  );
};
