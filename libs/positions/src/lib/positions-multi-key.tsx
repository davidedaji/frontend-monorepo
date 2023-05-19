import { useVegaWallet } from '@vegaprotocol/wallet';
import {
  useMarketDecimalsQuery,
  useMarketNameQuery,
  usePositionsMultiQuery,
} from './__generated__/PositionsMulti';
import { AgGridLazy } from '@vegaprotocol/datagrid';
import { useEffect, useMemo } from 'react';
import type {
  PositionsSubscriptionSubscription,
  PositionsSubscriptionSubscriptionVariables,
} from './__generated__/Positions';
import { PositionsSubscriptionDocument } from './__generated__/Positions';
import { addDecimalsFormatNumber, truncateByChars } from '@vegaprotocol/utils';
import { useApolloClient } from '@apollo/client';

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
        headerName: 'Market',
        field: 'market.id',
        cellRenderer: ({ value }) => {
          return <MarketCell id={value} />;
        },
      },
      {
        field: 'openVolume',
      },
      {
        field: 'unrealisedPNL',
        cellRenderer: ({ data }) => {
          return (
            <PNLCell marketId={data.market.id} value={data.unrealisedPNL} />
          );
        },
      },
      {
        field: 'realisedPNL',
        cellRenderer: ({ data }) => {
          return <PNLCell marketId={data.market.id} value={data.realisedPNL} />;
        },
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
      getRowId={({ data }) => `${data.party.id}:${data.market.id}`}
      style={{ width: '100%', height: '100%' }}
      columnDefs={colDefs}
      rowData={rowData}
    />
  );
};

const usePositions = () => {
  const { pubKeys } = useVegaWallet();
  const client = useApolloClient();
  const { data, loading, error } = usePositionsMultiQuery({
    variables: {
      partyIds: pubKeys ? pubKeys.map((pk) => pk.publicKey) : [],
    },
    skip: !pubKeys || pubKeys.length === 0,
  });

  useEffect(() => {
    if (!pubKeys?.length) return;
    const subs = pubKeys.map((p) => {
      return client
        .subscribe<
          PositionsSubscriptionSubscription,
          PositionsSubscriptionSubscriptionVariables
        >({
          query: PositionsSubscriptionDocument,
          variables: {
            partyId: p.publicKey,
          },
          // no cache as we only want to store data in the root Position query,
          // we modify this cache entry directly below
          fetchPolicy: 'no-cache',
        })
        .subscribe(({ data }) => {
          data?.positions.forEach((position) => {
            const id = client.cache.identify({
              __typename: 'Position',
              party: { id: position.partyId },
              market: { id: position.marketId },
            });
            client.cache.modify({
              id,
              fields: {
                realisedPNL: () => position.realisedPNL,
                unrealisedPNL: () => position.unrealisedPNL,
                openVolume: () => position.openVolume,
                averageEntryPrice: () => position.averageEntryPrice,
                positionStatus: () => position.positionStatus,
                lossSocializationAmount: () => position.lossSocializationAmount,
                updatedAt: () => position.updatedAt,
              },
            });
          });
        });
    });

    return () => {
      subs.forEach((sub) => {
        sub.unsubscribe();
      });
    };
  }, [pubKeys, client]);

  return { data, loading, error };
};

const MarketCell = ({ id }: { id: string }) => {
  const { data } = useMarketNameQuery({
    variables: {
      marketId: id,
    },
    // We should cache all static market data higher up the render tree so this
    // can be cache only
    // fetchPolicy: 'cache-only',
  });
  if (!data?.market) return <span>-</span>;
  return <span>{data.market.tradableInstrument.instrument.code}</span>;
};

const PNLCell = ({ marketId, value }: { marketId: string; value: string }) => {
  const { data } = useMarketDecimalsQuery({
    variables: {
      marketId,
    },
    // We should cache all static market data higher up the render tree so this
    // can be cache only
    // fetchPolicy: 'cache-only'
  });
  if (!data?.market) return <span>-</span>;
  return (
    <span>{addDecimalsFormatNumber(value, data.market.decimalPlaces)}</span>
  );
};
