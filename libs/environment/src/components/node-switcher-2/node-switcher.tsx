import { t } from '@vegaprotocol/react-helpers';
import {
  Button,
  ButtonLink,
  Dialog,
  Input,
  Loader,
  Radio,
  RadioGroup,
} from '@vegaprotocol/ui-toolkit';
import { useCallback, useState } from 'react';
import { useEnvironment } from '../../hooks';
import { CUSTOM_NODE_KEY } from '../../types';
import { LayoutRow } from '../node-switcher/layout-row';
import { ApolloWrapper } from './apollo-wrapper';
import { RowData } from './row-data';

export const NodeSwitcher = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (x: boolean) => void;
}) => {
  return (
    <Dialog open={open} onChange={setOpen} size="medium">
      <NodeSwitcherContainer closeDialog={() => setOpen(false)} />
    </Dialog>
  );
};

export const NodeSwitcherContainer = ({
  closeDialog,
}: {
  closeDialog: () => void;
}) => {
  const { nodes, setUrl, status, VEGA_ENV, VEGA_URL } = useEnvironment(
    (store) => ({
      status: store.status,
      nodes: store.nodes,
      setUrl: store.setUrl,
      VEGA_ENV: store.VEGA_ENV,
      VEGA_URL: store.VEGA_URL,
    })
  );

  const [nodeRadio, setNodeRadio] = useState<string>(() => {
    if (VEGA_URL) {
      return VEGA_URL;
    }
    return nodes.length > 0 ? '' : CUSTOM_NODE_KEY;
  });
  const [highestBlock, setHighestBlock] = useState<number | null>(null);
  const [customUrlText, setCustomUrlText] = useState('');

  const handleHighestBlock = useCallback((blockHeight: number) => {
    setHighestBlock((curr) => {
      if (curr === null) {
        return blockHeight;
      }
      if (blockHeight > curr) {
        return blockHeight;
      }
      return curr;
    });
  }, []);

  let isDisabled = false;
  if (nodeRadio === '') {
    isDisabled = true;
  } else if (nodeRadio === VEGA_URL) {
    isDisabled = true;
  } else if (nodeRadio === CUSTOM_NODE_KEY) {
    if (!isValidUrl(customUrlText)) {
      isDisabled = true;
    }
  }

  return (
    <div>
      <h3 className="uppercase text-xl text-center mb-2">
        {t('Connected node')}
      </h3>
      {status === 'pending' ? (
        <div className="py-8">
          <p className="mb-4 text-center">{t('Loading configuration...')}</p>
          <Loader size="large" />
        </div>
      ) : (
        <div>
          <p className="mb-2 text-center">
            {t(`This app will only work on a `)}
            <span className="font-mono capitalize">
              {VEGA_ENV.toLowerCase()}
            </span>
            {t(' chain ID')}
          </p>
          <p className="text-lg mt-4">
            {t('Select a GraphQL node to connect to:')}
          </p>
          <RadioGroup
            value={nodeRadio}
            onChange={(value) => setNodeRadio(value)}
          >
            <div className="hidden lg:block">
              <LayoutRow>
                <div />
                <span className="text-right">{t('Response time')}</span>
                <span className="text-right">{t('Block')}</span>
              </LayoutRow>
              <div>
                {nodes.map((node, index) => {
                  return (
                    <LayoutRow key={node} dataTestId="node-row">
                      <ApolloWrapper url={node}>
                        <RowData
                          id={index.toString()}
                          url={node}
                          highestBlock={highestBlock}
                          onBlockHeight={handleHighestBlock}
                        />
                      </ApolloWrapper>
                    </LayoutRow>
                  );
                })}
                <CustomRowWrapper
                  inputText={customUrlText}
                  setInputText={setCustomUrlText}
                  nodes={nodes}
                  highestBlock={highestBlock}
                  onBlockHeight={handleHighestBlock}
                  nodeRadio={nodeRadio}
                />
              </div>
            </div>
          </RadioGroup>
          <div className="mt-4">
            <Button
              fill={true}
              disabled={isDisabled}
              onClick={() => {
                if (nodeRadio === CUSTOM_NODE_KEY) {
                  setUrl(customUrlText);
                } else {
                  setUrl(nodeRadio);
                }
                closeDialog();
              }}
              data-testid="connect"
            >
              {t('Connect to this node')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface CustomRowWrapperProps {
  inputText: string;
  setInputText: (text: string) => void;
  nodes: string[];
  highestBlock: number | null;
  nodeRadio: string;
  onBlockHeight: (blockHeight: number) => void;
}

const CustomRowWrapper = ({
  inputText,
  setInputText,
  nodes,
  highestBlock,
  nodeRadio,
  onBlockHeight,
}: CustomRowWrapperProps) => {
  const [displayCustom, setDisplayCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showInput = nodeRadio === CUSTOM_NODE_KEY || nodes.length <= 0;

  return (
    <LayoutRow dataTestId="custom-row">
      <div className="flex w-full mb-2">
        {nodes.length > 0 && (
          <Radio
            id="node-url-custom"
            value={CUSTOM_NODE_KEY}
            label={nodeRadio === CUSTOM_NODE_KEY ? '' : t('Other')}
          />
        )}
        {showInput && (
          <div
            data-testid="custom-node"
            className="flex items-center w-full gap-2"
          >
            <Input
              placeholder="https://"
              value={inputText}
              hasError={Boolean(error)}
              onChange={(e) => {
                setDisplayCustom(false);
                setInputText(e.target.value);
              }}
            />
            <ButtonLink
              onClick={() => {
                if (!isValidUrl(inputText)) {
                  setError('Invalid url');
                  return;
                }
                setDisplayCustom(true);
              }}
            >
              {t('Check')}
            </ButtonLink>
          </div>
        )}
      </div>
      {displayCustom ? (
        <ApolloWrapper url={inputText}>
          <RowData
            id={CUSTOM_NODE_KEY}
            url={inputText}
            onBlockHeight={onBlockHeight}
            highestBlock={highestBlock}
          />
        </ApolloWrapper>
      ) : null}
    </LayoutRow>
  );
};

export const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
