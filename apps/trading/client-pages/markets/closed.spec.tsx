import { act, render, screen, within } from '@testing-library/react';
import { Closed } from './closed';
import { MarketStateMapping, PropertyKeyType } from '@vegaprotocol/types';
import { PositionStatus } from '@vegaprotocol/types';
import { MarketState } from '@vegaprotocol/types';
import { subDays } from 'date-fns';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing';
import type {
  OracleSpecDataConnectionQuery,
  MarketsDataQuery,
  MarketsQuery,
} from '@vegaprotocol/markets';
import {
  OracleSpecDataConnectionDocument,
  MarketsDataDocument,
  MarketsDocument,
} from '@vegaprotocol/markets';
import type { VegaWalletContextShape } from '@vegaprotocol/wallet';
import { VegaWalletContext } from '@vegaprotocol/wallet';
import type {
  PositionsQuery,
  PositionFieldsFragment,
} from '@vegaprotocol/positions';
import { PositionsDocument } from '@vegaprotocol/positions';
import { addDecimalsFormatNumber } from '@vegaprotocol/utils';
import {
  createMarketFragment,
  marketsQuery,
  marketsDataQuery,
  createMarketsDataFragment,
} from '@vegaprotocol/mock';

describe('Closed', () => {
  let originalNow: typeof Date.now;
  const mockNowTimestamp = 1672531200000;
  const settlementDateMetaDate = subDays(
    new Date(mockNowTimestamp),
    3
  ).toISOString();
  const settlementDateTag = `settlement-expiry-date:${settlementDateMetaDate}`;
  const pubKey = 'pubKey';
  const marketId = 'market-0';
  const settlementDataProperty = 'spec-binding';
  const settlementDataId = 'settlement-data-oracle-id';

  const market = createMarketFragment({
    id: marketId,
    state: MarketState.STATE_SETTLED,
    tradableInstrument: {
      instrument: {
        metadata: {
          tags: [settlementDateTag],
        },
        product: {
          dataSourceSpecForSettlementData: {
            id: settlementDataId,
            data: {
              sourceType: {
                sourceType: {
                  filters: [
                    {
                      __typename: 'Filter',
                      key: {
                        __typename: 'PropertyKey',
                        name: settlementDataProperty,
                        type: PropertyKeyType.TYPE_INTEGER,
                        numberDecimalPlaces: 5,
                      },
                    },
                  ],
                },
              },
            },
          },
          dataSourceSpecBinding: {
            settlementDataProperty,
          },
        },
      },
    },
  });
  const marketsMock: MockedResponse<MarketsQuery> = {
    request: {
      query: MarketsDocument,
    },
    result: {
      data: marketsQuery({
        marketsConnection: {
          edges: [
            {
              node: market,
            },
          ],
        },
      }),
    },
  };

  const marketsData = createMarketsDataFragment({
    __typename: 'MarketData',
    market: {
      __typename: 'Market',
      id: marketId,
    },
    bestBidPrice: '1000',
    bestOfferPrice: '2000',
    markPrice: '1500',
  });
  const marketsDataMock: MockedResponse<MarketsDataQuery> = {
    request: {
      query: MarketsDataDocument,
    },
    result: {
      data: marketsDataQuery({
        marketsConnection: {
          edges: [
            {
              node: {
                data: marketsData,
              },
            },
          ],
        },
      }),
    },
  };

  // Create mock oracle data
  const property = {
    __typename: 'Property' as const,
    name: settlementDataProperty,
    value: '12345',
  };
  const oracleDataMock: MockedResponse<OracleSpecDataConnectionQuery> = {
    request: {
      query: OracleSpecDataConnectionDocument,
      variables: {
        oracleSpecId: settlementDataId,
      },
    },
    result: {
      data: {
        oracleSpec: {
          dataConnection: {
            edges: [
              {
                node: {
                  externalData: {
                    data: {
                      data: [property],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  };

  // Create mock position
  const createPosition = (): PositionFieldsFragment => {
    return {
      __typename: 'Position' as const,
      realisedPNL: '1000',
      unrealisedPNL: '2000',
      openVolume: '3000',
      averageEntryPrice: '100',
      updatedAt: new Date().toISOString(),
      positionStatus: PositionStatus.POSITION_STATUS_UNSPECIFIED,
      lossSocializationAmount: '1000',
      market: {
        __typename: 'Market',
        id: marketId,
      },
      party: {
        __typename: 'Party',
        id: pubKey,
      },
    };
  };
  const position = createPosition();
  const positionsMock: MockedResponse<PositionsQuery> = {
    request: {
      query: PositionsDocument,
      variables: {
        partyIds: [pubKey],
      },
    },
    result: {
      data: {
        positions: {
          __typename: 'PositionConnection',
          edges: [{ __typename: 'PositionEdge', node: position }],
        },
      },
    },
  };

  beforeAll(() => {
    originalNow = Date.now;
    Date.now = jest.fn().mockReturnValue(mockNowTimestamp);
  });

  afterAll(() => {
    Date.now = originalNow;
  });

  it('renders correctly formatted and filtered rows', async () => {
    await act(async () => {
      render(
        <MockedProvider
          mocks={[marketsMock, marketsDataMock, positionsMock, oracleDataMock]}
        >
          <VegaWalletContext.Provider
            value={{ pubKey } as VegaWalletContextShape}
          >
            <Closed />
          </VegaWalletContext.Provider>
        </MockedProvider>
      );
    });
    // screen.debug(document, Infinity);

    const headers = screen.getAllByRole('columnheader');
    const expectedHeaders = [
      'Market',
      'Description',
      'Status',
      'Settlement date',
      'Best bid',
      'Best offer',
      'Mark price',
      'Settlement price',
      'Realised PNL',
      'Settlement asset',
      '', // actions row
    ];
    expect(headers).toHaveLength(expectedHeaders.length);
    expect(headers.map((h) => h.textContent?.trim())).toEqual(expectedHeaders);

    const cells = screen.getAllByRole('gridcell');
    const expectedValues = [
      market.tradableInstrument.instrument.code,
      market.tradableInstrument.instrument.name,
      MarketStateMapping[market.state],
      '3 days ago',
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      addDecimalsFormatNumber(marketsData.bestBidPrice, market.decimalPlaces),
      addDecimalsFormatNumber(
        marketsData!.bestOfferPrice,
        market.decimalPlaces
      ),
      addDecimalsFormatNumber(marketsData!.markPrice, market.decimalPlaces),
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
      addDecimalsFormatNumber(property.value, market.decimalPlaces),
      addDecimalsFormatNumber(position.realisedPNL, market.decimalPlaces),
      market.tradableInstrument.instrument.product.settlementAsset.symbol,
      '', // actions row
    ];
    cells.forEach((cell, i) => {
      expect(cell).toHaveTextContent(expectedValues[i]);
    });
  });

  it('only renders settled and terminated markets', async () => {
    const mixedMarkets = [
      {
        // inlclude as settled
        __typename: 'MarketEdge' as const,
        node: createMarketFragment({
          id: 'include-0',
          state: MarketState.STATE_SETTLED,
        }),
      },
      {
        // omit this market
        __typename: 'MarketEdge' as const,
        node: createMarketFragment({
          id: 'discard-0',
          state: MarketState.STATE_SUSPENDED,
        }),
      },
      {
        // include as terminated
        __typename: 'MarketEdge' as const,
        node: createMarketFragment({
          id: 'include-1',
          state: MarketState.STATE_TRADING_TERMINATED,
        }),
      },
      {
        // omit this market
        __typename: 'MarketEdge' as const,
        node: createMarketFragment({
          id: 'discard-1',
          state: MarketState.STATE_ACTIVE,
        }),
      },
    ];
    const mixedMarketsMock: MockedResponse<MarketsQuery> = {
      request: {
        query: MarketsDocument,
      },
      result: {
        data: {
          marketsConnection: {
            __typename: 'MarketConnection',
            edges: mixedMarkets,
          },
        },
      },
    };
    await act(async () => {
      render(
        <MockedProvider
          mocks={[
            mixedMarketsMock,
            marketsDataMock,
            positionsMock,
            oracleDataMock,
          ]}
        >
          <VegaWalletContext.Provider
            value={{ pubKey } as VegaWalletContextShape}
          >
            <Closed />
          </VegaWalletContext.Provider>
        </MockedProvider>
      );
    });

    // check that the number of rows in datagrid is 2
    const container = within(
      document.querySelector('.ag-center-cols-container') as HTMLElement
    );
    const expectedRows = mixedMarkets.filter((m) => {
      return [
        MarketState.STATE_SETTLED,
        MarketState.STATE_TRADING_TERMINATED,
      ].includes(m.node.state);
    });

    // check rows length is correct
    const rows = container.getAllByRole('row');
    expect(rows).toHaveLength(expectedRows.length);

    // check that only included ids are shown
    const cells = screen
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('col-id') === 'code')
      .map((cell) => {
        const marketId = within(cell)
          .getByTestId('market-code')
          .getAttribute('data-market-id');
        return marketId;
      });
    expect(cells).toEqual(expectedRows.map((m) => m.node.id));
  });
});
