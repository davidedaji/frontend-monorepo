import { t } from '@vegaprotocol/i18n';

export interface FilterLabelProps {
  filters: Set<string>;
}

/**
 * Renders the list (currently limited to 1) of filters set by the
 * Transaction Filter
 */
export function FilterLabel({ filters }: FilterLabelProps) {
  if (!filters || filters.size !== 1) {
    return <span className="uppercase">{t('Filter')}</span>;
  }

  return (
    <div>
      <span className="uppercase">{t('Filters')}:</span>&nbsp;
      <code className="bg-vega-light-150 px-2 rounded-md capitalize">
        {Array.from(filters)[0]}
      </code>
    </div>
  );
}
