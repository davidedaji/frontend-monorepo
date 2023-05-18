import * as Types from '@vegaprotocol/types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type PositionMultiFieldsFragment = { __typename?: 'Position', realisedPNL: string, openVolume: string, unrealisedPNL: string, averageEntryPrice: string, updatedAt?: any | null, positionStatus: Types.PositionStatus, lossSocializationAmount: string, market: { __typename?: 'Market', id: string }, party: { __typename?: 'Party', id: string } };

export type PositionsMultiQueryVariables = Types.Exact<{
  partyIds: Array<Types.Scalars['ID']> | Types.Scalars['ID'];
}>;


export type PositionsMultiQuery = { __typename?: 'Query', positions?: { __typename?: 'PositionConnection', edges?: Array<{ __typename?: 'PositionEdge', node: { __typename?: 'Position', realisedPNL: string, openVolume: string, unrealisedPNL: string, averageEntryPrice: string, updatedAt?: any | null, positionStatus: Types.PositionStatus, lossSocializationAmount: string, market: { __typename?: 'Market', id: string }, party: { __typename?: 'Party', id: string } } }> | null } | null };

export const PositionMultiFieldsFragmentDoc = gql`
    fragment PositionMultiFields on Position {
  realisedPNL
  openVolume
  unrealisedPNL
  averageEntryPrice
  updatedAt
  positionStatus
  lossSocializationAmount
  market {
    id
  }
  party {
    id
  }
}
    `;
export const PositionsMultiDocument = gql`
    query PositionsMulti($partyIds: [ID!]!) {
  positions(filter: {partyIds: $partyIds}) {
    edges {
      node {
        ...PositionMultiFields
      }
    }
  }
}
    ${PositionMultiFieldsFragmentDoc}`;

/**
 * __usePositionsMultiQuery__
 *
 * To run a query within a React component, call `usePositionsMultiQuery` and pass it any options that fit your needs.
 * When your component renders, `usePositionsMultiQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePositionsMultiQuery({
 *   variables: {
 *      partyIds: // value for 'partyIds'
 *   },
 * });
 */
export function usePositionsMultiQuery(baseOptions: Apollo.QueryHookOptions<PositionsMultiQuery, PositionsMultiQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PositionsMultiQuery, PositionsMultiQueryVariables>(PositionsMultiDocument, options);
      }
export function usePositionsMultiLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PositionsMultiQuery, PositionsMultiQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PositionsMultiQuery, PositionsMultiQueryVariables>(PositionsMultiDocument, options);
        }
export type PositionsMultiQueryHookResult = ReturnType<typeof usePositionsMultiQuery>;
export type PositionsMultiLazyQueryHookResult = ReturnType<typeof usePositionsMultiLazyQuery>;
export type PositionsMultiQueryResult = Apollo.QueryResult<PositionsMultiQuery, PositionsMultiQueryVariables>;