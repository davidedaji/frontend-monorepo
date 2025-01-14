import React, { useEffect } from 'react';
import { titlefy } from '@vegaprotocol/utils';
import { t } from '@vegaprotocol/i18n';
import { LocalStoragePersistTabs as Tabs, Tab } from '@vegaprotocol/ui-toolkit';
import { Markets } from './markets';
import { Proposed } from './proposed';
import { usePageTitleStore } from '../../stores';
import { Closed } from './closed';

export const MarketsPage = () => {
  const { updateTitle } = usePageTitleStore((store) => ({
    updateTitle: store.updateTitle,
  }));
  useEffect(() => {
    updateTitle(titlefy(['Markets']));
  }, [updateTitle]);
  return (
    <Tabs storageKey="console-markets">
      <Tab id="all-markets" name={t('All markets')}>
        <Markets />
      </Tab>
      <Tab id="proposed-markets" name={t('Proposed markets')}>
        <Proposed />
      </Tab>
      <Tab id="closed-markets" name={t('Closed markets')}>
        <Closed />
      </Tab>
    </Tabs>
  );
};
