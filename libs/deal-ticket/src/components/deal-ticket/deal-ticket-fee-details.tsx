import { Tooltip } from '@vegaprotocol/ui-toolkit';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { OrderSubmissionBody } from '@vegaprotocol/wallet';
import type { Market, MarketData } from '@vegaprotocol/market-list';
import {
  getFeeDetailsValues,
  useFeeDealTicketDetails,
} from '../../hooks/use-fee-deal-ticket-details';

interface DealTicketFeeDetailsProps {
  order: OrderSubmissionBody['orderSubmission'];
  market: Market;
  marketData: MarketData;
}

export interface DealTicketFeeDetails {
  label: string;
  value?: string | number | null;
  labelDescription?: string | ReactNode;
  symbol?: string;
}

export const DealTicketFeeDetails = ({
  order,
  market,
  marketData,
}: DealTicketFeeDetailsProps) => {
  const feeDetails = useFeeDealTicketDetails(order, market, marketData);
  const details = useMemo(() => getFeeDetailsValues(feeDetails), [feeDetails]);
  return (
    <div>
      {details.map(({ label, value, labelDescription, symbol }) => (
        <div
          key={typeof label === 'string' ? label : 'value-dropdown'}
          className="text-xs mt-2 flex justify-between items-center gap-4 flex-wrap"
        >
          <div>
            <Tooltip description={labelDescription}>
              <div>{label}</div>
            </Tooltip>
          </div>
          <div className="text-neutral-500 dark:text-neutral-300">{`${
            value ?? '-'
          } ${symbol || ''}`}</div>
        </div>
      ))}
    </div>
  );
};