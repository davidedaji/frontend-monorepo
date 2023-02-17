import Head from 'next/head';
import type { AppProps } from 'next/app';
import {
  Navbar,
  NavigationContent,
  NavigationItem,
  NavigationLink,
  NavigationList,
  NavigationTrigger,
} from '../components/navbar';
import { t } from '@vegaprotocol/react-helpers';
import {
  useEagerConnect as useVegaEagerConnect,
  useVegaTransactionManager,
  useVegaTransactionUpdater,
  useVegaWallet,
} from '@vegaprotocol/wallet';
import {
  useEagerConnect as useEthereumEagerConnect,
  useEthTransactionManager,
  useEthTransactionUpdater,
  useEthWithdrawApprovalsManager,
} from '@vegaprotocol/web3';
import {
  envTriggerMapping,
  Networks,
  NodeSwitcherDialog,
  useEnvironment,
  useInitializeEnv,
} from '@vegaprotocol/environment';
import './styles.css';
import './gen-styles.scss';
import { useGlobalStore, usePageTitleStore } from '../stores';
import { Footer } from '../components/footer';
import { useMemo, useState } from 'react';
import DialogsContainer from './dialogs-container';
import ToastsManager from './toasts-manager';
import {
  HashRouter,
  Link,
  NavLink,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { Connectors } from '../lib/vega-connectors';
import { ViewingBanner } from '../components/viewing-banner';
import { Banner } from '../components/banner';
import classNames from 'classnames';
import { AppLoader } from '../components/app-loader';
import { Links, Routes } from './client-router';

const DEFAULT_TITLE = t('Welcome to Vega trading!');

const Title = () => {
  const { pageTitle } = usePageTitleStore((store) => ({
    pageTitle: store.pageTitle,
  }));

  const { VEGA_ENV } = useEnvironment();
  const networkName = envTriggerMapping[VEGA_ENV];

  const title = useMemo(() => {
    if (!pageTitle) return DEFAULT_TITLE;
    if (networkName) return `${pageTitle} [${networkName}]`;
    return pageTitle;
  }, [pageTitle, networkName]);

  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
};

const TransactionsHandler = () => {
  useVegaTransactionManager();
  useVegaTransactionUpdater();
  useEthTransactionManager();
  useEthTransactionUpdater();
  useEthWithdrawApprovalsManager();
  return null;
};

function AppBody({ Component }: AppProps) {
  const { marketId } = useGlobalStore((store) => ({
    marketId: store.marketId,
  }));
  const tradingPath = marketId
    ? Links[Routes.MARKET](marketId)
    : Links[Routes.MARKET]();
  const location = useLocation();
  const { VEGA_ENV } = useEnvironment();

  const gridClasses = classNames(
    'h-full relative z-0 grid',
    'grid-rows-[repeat(3,min-content),1fr,min-content]'
  );

  return (
    <div className="h-full dark:bg-black dark:text-white">
      <Head>
        {/* Cannot use meta tags in _document.page.tsx see https://nextjs.org/docs/messages/no-document-viewport-meta */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Title />
      <div className={gridClasses}>
        <Banner />
        <Navbar
        // navbarTheme={VEGA_ENV === Networks.TESTNET ? 'yellow' : 'dark'}
        >
          <NavigationList>
            <NavigationItem>
              <NavigationLink path={Links[Routes.MARKETS]()}>
                Markets
              </NavigationLink>
            </NavigationItem>

            <NavigationItem>
              <NavigationLink path={tradingPath}>Trading</NavigationLink>
            </NavigationItem>

            <NavigationItem>
              <NavigationLink path={Links[Routes.PORTFOLIO]()}>
                Portfolio
              </NavigationLink>
            </NavigationItem>

            <NavigationItem>
              <NavigationTrigger>Dropdown</NavigationTrigger>
              <NavigationContent backText="Token">
                <NavigationItem>
                  <NavigationLink path={tradingPath}>Trading</NavigationLink>
                </NavigationItem>

                <NavigationItem>
                  <NavigationLink path={Links[Routes.PORTFOLIO]()}>
                    Portfolio
                  </NavigationLink>
                </NavigationItem>

                <NavigationItem>
                  <NavigationLink path="https://google.com">
                    Redeem Vested Tokens
                  </NavigationLink>
                </NavigationItem>
              </NavigationContent>
            </NavigationItem>

            <NavigationItem>
              <NavigationTrigger>Another</NavigationTrigger>
              <NavigationContent backText="Another">
                <NavigationItem>
                  <NavigationLink path="https://google.com">Foo</NavigationLink>
                </NavigationItem>

                <NavigationItem>
                  <NavigationLink path="https://google.com">Bar</NavigationLink>
                </NavigationItem>

                <NavigationItem>
                  <NavigationLink path="https://google.com">Quz</NavigationLink>
                </NavigationItem>
              </NavigationContent>
            </NavigationItem>
          </NavigationList>
        </Navbar>
        <ViewingBanner />
        <main data-testid={location.pathname}>
          <Component />
        </main>
        <Footer />
      </div>
      <DialogsContainer />
      <ToastsManager />
      <TransactionsHandler />
      <MaybeConnectEagerly />
    </div>
  );
}

function VegaTradingApp(props: AppProps) {
  const status = useEnvironment((store) => store.status);
  const { nodeSwitcherOpen, setNodeSwitcher } = useGlobalStore((store) => ({
    nodeSwitcherOpen: store.nodeSwitcherDialog,
    setNodeSwitcher: (open: boolean) =>
      store.update({ nodeSwitcherDialog: open }),
  }));

  useInitializeEnv();

  // Prevent HashRouter from being server side rendered as it
  // relies on presence of document object
  if (status === 'default') {
    return null;
  }

  return (
    <HashRouter>
      <AppLoader>
        <AppBody {...props} />
      </AppLoader>
      <NodeSwitcherDialog open={nodeSwitcherOpen} setOpen={setNodeSwitcher} />
    </HashRouter>
  );
}

export default VegaTradingApp;

const MaybeConnectEagerly = () => {
  useVegaEagerConnect(Connectors);
  useEthereumEagerConnect();

  const { pubKey, connect } = useVegaWallet();
  const [searchParams] = useSearchParams();
  const [query] = useState(searchParams.get('address'));
  if (query && !pubKey) {
    connect(Connectors['view']);
  }
  return null;
};
