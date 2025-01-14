import { useRef } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import { AgGridColumn } from 'ag-grid-react';
import {
  addDecimalsFormatNumber,
  getDateTimeFormat,
  isNumeric,
  truncateByChars,
} from '@vegaprotocol/utils';
import { useBottomPlaceholder } from '@vegaprotocol/datagrid';
import { t } from '@vegaprotocol/i18n';
import {
  ButtonLink,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  VegaIcon,
  VegaIconNames,
} from '@vegaprotocol/ui-toolkit';
import type {
  TypedDataAgGrid,
  VegaICellRendererParams,
  VegaValueFormatterParams,
} from '@vegaprotocol/datagrid';
import { AgGridLazy as AgGrid } from '@vegaprotocol/datagrid';
import { EtherscanLink } from '@vegaprotocol/environment';
import type { WithdrawalFieldsFragment } from './__generated__/Withdrawal';
import {
  useEthWithdrawApprovalsStore,
  useWithdrawalApprovalDialog,
} from '@vegaprotocol/web3';
import * as Schema from '@vegaprotocol/types';

export const WithdrawalsTable = (
  props: TypedDataAgGrid<WithdrawalFieldsFragment>
) => {
  const gridRef = useRef<AgGridReact | null>(null);
  const createWithdrawApproval = useEthWithdrawApprovalsStore(
    (store) => store.create
  );

  const bottomPlaceholderProps = useBottomPlaceholder({ gridRef });
  return (
    <AgGrid
      overlayNoRowsTemplate={t('No withdrawals')}
      defaultColDef={{ resizable: true }}
      style={{ width: '100%', height: '100%' }}
      components={{
        RecipientCell,
        StatusCell,
        EtherscanLinkCell,
        CompleteCell,
      }}
      suppressCellFocus
      ref={gridRef}
      storeKey="withdrawals"
      {...bottomPlaceholderProps}
      {...props}
    >
      <AgGridColumn headerName="Asset" field="asset.symbol" />
      <AgGridColumn
        headerName={t('Amount')}
        field="amount"
        valueFormatter={({
          value,
          data,
        }: VegaValueFormatterParams<WithdrawalFieldsFragment, 'amount'>) => {
          return isNumeric(value) && data?.asset
            ? addDecimalsFormatNumber(value, data.asset.decimals)
            : '';
        }}
      />
      <AgGridColumn
        headerName={t('Recipient')}
        field="details.receiverAddress"
        cellRenderer="RecipientCell"
        valueFormatter={({
          value,
          data,
        }: VegaValueFormatterParams<
          WithdrawalFieldsFragment,
          'details.receiverAddress'
        >) => {
          if (!data) return null;
          if (!value) return '-';
          return truncateByChars(value);
        }}
      />
      <AgGridColumn
        headerName={t('Created')}
        field="createdTimestamp"
        valueFormatter={({
          value,
          data,
        }: VegaValueFormatterParams<
          WithdrawalFieldsFragment,
          'createdTimestamp'
        >) =>
          data
            ? value
              ? getDateTimeFormat().format(new Date(value))
              : '-'
            : null
        }
      />
      <AgGridColumn
        headerName={t('Completed')}
        field="withdrawnTimestamp"
        valueFormatter={({
          value,
          data,
        }: VegaValueFormatterParams<
          WithdrawalFieldsFragment,
          'withdrawnTimestamp'
        >) =>
          data
            ? value
              ? getDateTimeFormat().format(new Date(value))
              : '-'
            : null
        }
      />
      <AgGridColumn
        headerName={t('Status')}
        field="status"
        cellRenderer="StatusCell"
      />
      <AgGridColumn
        headerName={t('Transaction')}
        field="txHash"
        flex={2}
        type="rightAligned"
        cellRendererParams={{
          complete: (withdrawal: WithdrawalFieldsFragment) => {
            createWithdrawApproval(withdrawal);
          },
        }}
        cellRendererSelector={({
          data,
        }: VegaICellRendererParams<WithdrawalFieldsFragment>) => ({
          component: data?.txHash ? 'EtherscanLinkCell' : 'CompleteCell',
        })}
      />
    </AgGrid>
  );
};

export type CompleteCellProps = {
  data: WithdrawalFieldsFragment;
  complete: (withdrawal: WithdrawalFieldsFragment) => void;
};
export const CompleteCell = ({ data, complete }: CompleteCellProps) => {
  const open = useWithdrawalApprovalDialog((state) => state.open);
  const ref = useRef<HTMLDivElement>(null);

  if (!data) {
    return null;
  }
  return data.pendingOnForeignChain ? (
    '-'
  ) : (
    <div className="flex justify-end gap-1">
      <ButtonLink
        data-testid="complete-withdrawal"
        onClick={() => complete(data)}
      >
        {t('Complete withdrawal')}
      </ButtonLink>

      <DropdownMenu
        trigger={
          <DropdownMenuTrigger
            className="hover:bg-vega-light-200 dark:hover:bg-vega-dark-200 p-0.5 focus:rounded-full hover:rounded-full"
            data-testid="dropdown-menu"
          >
            <VegaIcon name={VegaIconNames.KEBAB} />
          </DropdownMenuTrigger>
        }
      >
        <DropdownMenuContent>
          <DropdownMenuItem
            key={'withdrawal-approval'}
            data-testid="withdrawal-approval"
            ref={ref}
            onClick={() => {
              if (data.id) {
                open(data.id, ref.current, false);
              }
            }}
          >
            <span>
              <Icon name="info-sign" size={4} /> {t('View withdrawal details')}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const EtherscanLinkCell = ({
  value,
}: VegaValueFormatterParams<WithdrawalFieldsFragment, 'txHash'>) => {
  if (!value) return '-';
  return (
    <EtherscanLink tx={value} data-testid="etherscan-link">
      {truncateByChars(value)}
    </EtherscanLink>
  );
};

export const StatusCell = ({ data }: { data: WithdrawalFieldsFragment }) => {
  if (!data) {
    return null;
  }
  if (data.pendingOnForeignChain || !data.txHash) {
    return <span>{t('Pending')}</span>;
  }
  if (data.status === Schema.WithdrawalStatus.STATUS_FINALIZED) {
    return <span>{t('Completed')}</span>;
  }
  if (data.status === Schema.WithdrawalStatus.STATUS_REJECTED) {
    return <span>{t('Rejected')}</span>;
  }
  return <span>{t('Failed')}</span>;
};

const RecipientCell = ({
  value,
  valueFormatted,
}: VegaICellRendererParams<
  WithdrawalFieldsFragment,
  'details.receiverAddress'
>) => {
  return (
    <EtherscanLink address={value} data-testid="etherscan-link">
      {valueFormatted}
    </EtherscanLink>
  );
};
