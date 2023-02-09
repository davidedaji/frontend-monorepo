import { useMemo } from 'react';
import { useStatisticsQuery } from '../utils/__generated__/Node';
import { useHeaderStore } from '@vegaprotocol/apollo-client';
import { useEnvironment } from './use-environment-2';
import { fromNanoSeconds } from '@vegaprotocol/react-helpers';

export const useNodeHealth = () => {
  const url = useEnvironment((store) => store.VEGA_URL);
  const headerStore = useHeaderStore();
  const headers = url ? headerStore[url] : undefined;
  const { data } = useStatisticsQuery({
    pollInterval: 1000,
    fetchPolicy: 'no-cache',
  });

  const blockDiff = useMemo(() => {
    if (!data?.statistics.blockHeight) {
      return null;
    }

    if (!headers) {
      return 0;
    }

    return Number(data.statistics.blockHeight) - headers.blockHeight;
  }, [data, headers]);

  return {
    coreBlockHeight: data?.statistics
      ? Number(data.statistics.blockHeight)
      : undefined,
    coreVegaTime: data?.statistics
      ? fromNanoSeconds(data?.statistics.vegaTime)
      : undefined,
    datanodeBlockHeight: headers?.blockHeight,
    datanodeVegaTime: headers?.timestamp,
    blockDiff,
  };
};
