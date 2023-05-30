import { Icon } from '@vegaprotocol/ui-toolkit';
import type { IconName } from '@vegaprotocol/ui-toolkit';

export interface VoteIconProps {
  // True is a yes vote, false is undefined or no vorte
  vote: boolean;
  // Defaults to 'For', but can be any text
  yesText?: string;
  // Defaults to 'Against', but can be any text
  noText?: string;
  // If set to false the background will not be coloured
  useVoteColour?: boolean;
}

/**
 * Displays a lozenge with an icon representing the way a user voted for a proposal.
 * The yes and no text can be overridden
 *
 * @returns
 */
export function VoteIcon({
  vote,
  useVoteColour = true,
  yesText = 'For',
  noText = 'Against',
}: VoteIconProps) {
  const label = vote ? yesText : noText;
  const icon: IconName = vote ? 'tick-circle' : 'delete';
  const bg = useVoteColour
    ? vote
      ? 'bg-vega-green-550'
      : 'bg-vega-pink-550'
    : 'bg-vega-dark-200';
  const fill = useVoteColour
    ? vote
      ? 'vega-green-300'
      : 'vega-pink-300'
    : 'white';
  const text = useVoteColour
    ? vote
      ? 'vega-green-200'
      : 'vega-pink-200'
    : 'white';

  return (
    <div
      className={`voteicon inline-block my-1 py-1 px-2 py rounded-md text-white leading-one sm align-top ${bg}`}
    >
      <Icon name={icon} size={3} className={`mr-2 p-0 fill-${fill}`} />
      <span className={`text-base text-${text}`} data-testid="label">
        {label}
      </span>
    </div>
  );
}
