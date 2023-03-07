import { matchPath, useLocation } from 'react-router-dom';
import {
  ThemeSwitcher,
  Navigation,
  NavigationList,
  NavigationItem,
  NavigationLink,
  NavigationBreakpoint,
  NavigationTrigger,
  NavigationContent,
} from '@vegaprotocol/ui-toolkit';
import { t } from '@vegaprotocol/i18n';
import { Routes } from '../../routes/route-names';
import { NetworkSwitcher } from '@vegaprotocol/environment';
import type { Navigable } from '../../routes/router-config';
import routerConfig from '../../routes/router-config';
import { useMemo } from 'react';
import compact from 'lodash/compact';
import { Search } from '../search';

const routeToNavigationItem = (r: Navigable) => (
  <NavigationItem key={r.name}>
    <NavigationLink to={r.path}>{r.text}</NavigationLink>
  </NavigationItem>
);

export const Header = () => {
  const mainItems = compact(
    [Routes.TX, Routes.BLOCKS, Routes.ORACLES, Routes.VALIDATORS].map((n) =>
      routerConfig.find((r) => r.path === n)
    )
  );

  const groupedItems = compact(
    [
      Routes.PARTIES,
      Routes.ASSETS,
      Routes.MARKETS,
      Routes.GOVERNANCE,
      Routes.NETWORK_PARAMETERS,
      Routes.GENESIS,
    ].map((n) => routerConfig.find((r) => r.path === n))
  );

  const { pathname } = useLocation();

  /**
   * Because the grouped items are displayed in a sub menu under an "Other" item
   * we need to determine whether any underlying item is active to highlight the
   * trigger in the same fashion as any other top-level `NavigationLink`.
   * This function checks whether the current location pathname is one of the
   * underlying NavigationLinks.
   */
  const isOnOther = useMemo(() => {
    for (const path of groupedItems.map((r) => r.path)) {
      const matched = matchPath(`${path}/*`, pathname);
      if (matched) return true;
    }
    return false;
  }, [groupedItems, pathname]);

  return (
    <Navigation
      appName="Explorer"
      theme="system"
      breakpoints={[490, 900]}
      actions={
        <>
          <ThemeSwitcher />
          <Search />
        </>
      }
      onResize={(width, el) => {
        if (width < 1157) {
          // switch to magnifying glass trigger when widht < 1157
          el.classList.remove('nav-search-full');
          el.classList.add('nav-search-compact');
        } else {
          el.classList.remove('nav-search-compact');
          el.classList.add('nav-search-full');
        }
      }}
    >
      <NavigationList hide={[NavigationBreakpoint.Small]}>
        <NavigationItem>
          <NetworkSwitcher />
        </NavigationItem>
      </NavigationList>
      <NavigationList
        hide={[NavigationBreakpoint.Small, NavigationBreakpoint.Narrow]}
      >
        {mainItems.map(routeToNavigationItem)}
        {groupedItems && (
          <NavigationItem>
            <NavigationTrigger isActive={Boolean(isOnOther)}>
              {t('Other')}
            </NavigationTrigger>
            <NavigationContent>
              <NavigationList>
                {groupedItems.map(routeToNavigationItem)}
              </NavigationList>
            </NavigationContent>
          </NavigationItem>
        )}
      </NavigationList>
    </Navigation>
  );
};
