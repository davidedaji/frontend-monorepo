import type { Story, Meta } from '@storybook/react';
import type { VegaIconProps } from './vega-icon';
import { VegaIcon } from './vega-icon';
import { VegaIconNames } from './vega-icon-record';

export default {
  component: VegaIcon,
  title: 'VegaIcon',
} as Meta;

const Template: Story<VegaIconProps> = (args) => <VegaIcon {...args} />;

export const Default = Template.bind({});
Default.args = {
  name: VegaIconNames.BREAKDOWN,
};

export const Bigger = Template.bind({});
Bigger.args = {
  name: VegaIconNames.DEPOSIT,
  size: 8,
};

export const EvenBigger = Template.bind({});
EvenBigger.args = {
  name: VegaIconNames.GLOBE,
  size: 12,
};
