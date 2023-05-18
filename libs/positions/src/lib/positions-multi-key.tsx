import { useVegaWallet } from '@vegaprotocol/wallet';
import { usePositionsMultiQuery } from './__generated__/PositionsMulti';
import { AgGridLazy } from '@vegaprotocol/datagrid';
import { useMemo } from 'react';
import { PositionsSubscriptionDocument } from './__generated__/Positions';
import { truncateByChars } from '@vegaprotocol/utils';

export const PositionsMultiKey = () => {
  const { pubKeys } = useVegaWallet();
  const { data } = usePositions();
  const colDefs = useMemo(() => {
    return [
      {
        field: 'party.id',
        valueFormatter: ({ value }) => {
          const truncated = truncateByChars(value);
          const pk = pubKeys?.find((pk) => pk.publicKey === value);
          return pk ? pk.name + ' ' + truncated : truncated;
        },
      },
      {
        field: 'market.id',
      },
      {
        field: 'openVolume',
      },
      {
        field: 'unrealisedPNL',
      },
      {
        field: 'realisedPNL',
      },
      {
        field: 'updatedAt',
      },
    ];
  }, [pubKeys]);

  const rowData = data?.positions?.edges?.length
    ? data.positions.edges.map((e) => e.node)
    : [];
  return (
    <AgGridLazy
      style={{ width: '100%', height: '100%' }}
      columnDefs={colDefs}
      rowData={rowData}
    />
  );
};

const usePositions = () => {
  const { pubKeys } = useVegaWallet();
  const { data, loading, error } = usePositionsMultiQuery({
    variables: {
      partyIds: pubKeys ? pubKeys.map((pk) => pk.publicKey) : [],
    },
    skip: !pubKeys || pubKeys.length === 0,
    pollInterval: 3000,
  });

  return { data, loading, error };
};
