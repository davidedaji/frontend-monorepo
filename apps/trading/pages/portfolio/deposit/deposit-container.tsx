import { gql } from '@apollo/client';
import { PageQueryContainer } from '../../../components/page-query-container';
import type { DepositPage } from './__generated__/DepositPage';
import { DepositManager } from '@vegaprotocol/deposits';
import { getEnabledAssets, t } from '@vegaprotocol/react-helpers';
import { useEnvironment } from '@vegaprotocol/environment';
import { Splash } from '@vegaprotocol/ui-toolkit';
import { ASSET_FRAGMENT } from '../../../lib/query-fragments';

const DEPOSIT_PAGE_QUERY = gql`
  ${ASSET_FRAGMENT}
  query DepositPage {
    assetsConnection {
      edges {
        node {
          ...AssetFields
        }
      }
    }
  }
`;

/**
 *  Fetches data required for the Deposit page
 */
export const DepositContainer = () => {
  const { VEGA_ENV } = useEnvironment();

  return (
    <PageQueryContainer<DepositPage>
      query={DEPOSIT_PAGE_QUERY}
      render={(data) => {
        const assets = getEnabledAssets(data);
        if (!assets.length) {
          return (
            <Splash>
              <p>{t('No assets on this network')}</p>
            </Splash>
          );
        }

        return (
          <DepositManager
            assets={assets}
            isFaucetable={VEGA_ENV !== 'MAINNET'}
          />
        );
      }}
    />
  );
};