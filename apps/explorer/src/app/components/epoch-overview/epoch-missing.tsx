import { useExplorerFutureEpochQuery } from './__generated__/Epoch';

import addSeconds from 'date-fns/addSeconds';
import formatDistance from 'date-fns/formatDistance';
import { Icon, Tooltip } from '@vegaprotocol/ui-toolkit';
import isFuture from 'date-fns/isFuture';

export type EpochMissingOverviewProps = {
  missingEpochId?: string;
};

/**
 */
const EpochMissingOverview = ({
  missingEpochId,
}: EpochMissingOverviewProps) => {
  const { data, error, loading } = useExplorerFutureEpochQuery();

  if (!missingEpochId) {
    return <span>-</span>;
  }
  if (!data || loading || error) {
    return <span>{missingEpochId}</span>;
  }

  let label = 'Missing data';
  // Let's assume it is
  let isInFuture = true;

  const epochLength = data.networkParameter?.value || '';
  const epochLengthInSeconds = getSeconds(epochLength);

  if (missingEpochId && data.epoch.id && data.epoch.timestamps.start) {
    const missing = parseInt(missingEpochId);
    const current = parseInt(data.epoch.id);
    const startFrom = new Date(data.epoch.timestamps.start);

    const diff = missing - current;
    const futureDate = addSeconds(startFrom, diff * epochLengthInSeconds);

    label = `Estimate: ${futureDate.toLocaleString()} - ${formatDistance(
      futureDate,
      startFrom,
      { addSuffix: true }
    )} `;

    isInFuture = isFuture(futureDate);
  }

  const description = <p className="text-xs m-2">{label}</p>;

  return (
    <Tooltip description={description}>
      <p>
        {isInFuture ? (
          <Icon name="calendar" className="mr-1" />
        ) : (
          <Icon name="outdated" className="mr-1" />
        )}
        {missingEpochId}
      </p>
    </Tooltip>
  );
};

export default EpochMissingOverview;

function getSeconds(str: string) {
  let seconds = 0;
  const months = str.match(/(\d+)\s*M/);
  const days = str.match(/(\d+)\s*D/);
  const hours = str.match(/(\d+)\s*h/);
  const minutes = str.match(/(\d+)\s*m/);
  const secs = str.match(/(\d+)\s*s/);
  if (months) {
    seconds += parseInt(months[1]) * 86400 * 30;
  }
  if (days) {
    seconds += parseInt(days[1]) * 86400;
  }
  if (hours) {
    seconds += parseInt(hours[1]) * 3600;
  }
  if (minutes) {
    seconds += parseInt(minutes[1]) * 60;
  }
  if (secs) {
    seconds += parseInt(secs[1]);
  }
  return seconds;
}
