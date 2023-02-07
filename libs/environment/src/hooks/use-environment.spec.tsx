// having the node switcher dialog in the environment provider breaks the test renderer
// workaround based on: https://github.com/facebook/react/issues/11565
import type { ComponentProps, ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { ClientOptions } from '@vegaprotocol/apollo-client';
import { createClient } from '@vegaprotocol/apollo-client';
import { useEnvironment, EnvironmentProvider } from './use-environment';
import { Networks, ErrorType } from '../types';
import type { MockRequestConfig } from './mocks/apollo-client';
import createMockClient from './mocks/apollo-client';
import { getErrorByType } from '../utils/validate-node';

jest.mock('@vegaprotocol/apollo-client');

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: ReactNode) => node,
}));

jest.mock('../components/node-switcher', () => ({
  NodeSwitcher: () => <div />,
}));

global.fetch = jest.fn();

const MockWrapper = (props: ComponentProps<typeof EnvironmentProvider>) => {
  return <EnvironmentProvider {...props} />;
};

const MOCK_HOST = 'https://vega.host/query';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const mockEnvironmentState = {
  VEGA_URL: 'https://vega.xyz',
  VEGA_ENV: Networks.TESTNET,
  VEGA_CONFIG_URL: 'https://vega.xyz/testnet-config.json',
  VEGA_NETWORKS: {
    DEVNET: 'https://devnet.url',
    TESTNET: 'https://testnet.url',
    STAGNET3: 'https://stagnet3.url',
    MAINNET: 'https://mainnet.url',
  },
  ETHEREUM_PROVIDER_URL: 'https://ether.provider',
  ETHERSCAN_URL: 'https://etherscan.url',
  GIT_BRANCH: 'test',
  GIT_ORIGIN_URL: 'https://github.com/test/repo',
  GIT_COMMIT_HASH: 'abcde01234',
  GITHUB_FEEDBACK_URL: 'https://github.com/test/feedback',
  MAINTENANCE_PAGE: false,
  configLoading: false,
  nodeSwitcherOpen: false,
  setNodeSwitcherOpen: noop,
  networkError: undefined,
};

const MOCK_DURATION = 76;

window.performance.getEntriesByName = jest
  .fn()
  .mockImplementation((url: string) => [
    {
      entryType: 'resource',
      name: url,
      startTime: 0,
      toJSON: () => ({}),
      duration: MOCK_DURATION,
    },
  ]);

function setupFetch(
  configUrl: string = mockEnvironmentState.VEGA_CONFIG_URL,
  hosts?: string[]
) {
  return (url: RequestInfo) => {
    if (url === configUrl) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ hosts: hosts || [MOCK_HOST] }),
      } as Response);
    }

    return Promise.resolve({
      ok: true,
    } as Response);
  };
}

const getQuickestNode = (mockNodes: Record<string, MockRequestConfig>) => {
  const { nodeUrl } = Object.keys(mockNodes).reduce<{
    nodeUrl?: string;
    delay: number;
  }>(
    (acc, url) => {
      const { delay = 0, hasError = false } = mockNodes[url];
      if (!hasError && delay < acc.delay) {
        return { nodeUrl: url, delay };
      }
      return acc;
    },
    { nodeUrl: undefined, delay: Infinity }
  );
  return nodeUrl;
};

beforeEach(() => {
  // @ts-ignore: typscript doesn't recognise the mock implementation
  global.fetch.mockImplementation(setupFetch());

  window.localStorage.clear();

  // @ts-ignore allow adding a mock return value to mocked module
  createClient.mockImplementation(() => createMockClient());

  process.env['NX_VEGA_URL'] = mockEnvironmentState.VEGA_URL;
  process.env['NX_VEGA_ENV'] = mockEnvironmentState.VEGA_ENV;
  process.env['NX_VEGA_CONFIG_URL'] = mockEnvironmentState.VEGA_CONFIG_URL;
  process.env['NX_VEGA_NETWORKS'] = JSON.stringify(
    mockEnvironmentState.VEGA_NETWORKS
  );
  process.env['NX_ETHEREUM_PROVIDER_URL'] =
    mockEnvironmentState.ETHEREUM_PROVIDER_URL;
  process.env['NX_ETHERSCAN_URL'] = mockEnvironmentState.ETHERSCAN_URL;
  process.env['NX_GIT_BRANCH'] = mockEnvironmentState.GIT_BRANCH;
  process.env['NX_GIT_ORIGIN_URL'] = mockEnvironmentState.GIT_ORIGIN_URL;
  process.env['NX_GIT_COMMIT_HASH'] = mockEnvironmentState.GIT_COMMIT_HASH;
  process.env['NX_GITHUB_FEEDBACK_URL'] =
    mockEnvironmentState.GITHUB_FEEDBACK_URL;
});

afterAll(() => {
  jest.clearAllMocks();
});

describe('useEnvironment hook', () => {
  it('transforms and exposes values from the environment', async () => {
    const { result } = renderHook(() => useEnvironment(), {
      wrapper: MockWrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        ...mockEnvironmentState,
        setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
      });
    });
  });

  it('allows for the VEGA_CONFIG_URL to be missing when there is a VEGA_URL present', async () => {
    delete process.env['NX_VEGA_CONFIG_URL'];
    const { result } = renderHook(() => useEnvironment(), {
      wrapper: MockWrapper,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        ...mockEnvironmentState,
        VEGA_CONFIG_URL: undefined,
        setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
      });
    });
  });

  it('allows for the VEGA_NETWORKS to be missing from the environment', async () => {
    delete process.env['NX_VEGA_NETWORKS'];
    const { result } = renderHook(() => useEnvironment(), {
      wrapper: MockWrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        ...mockEnvironmentState,
        VEGA_NETWORKS: {
          TESTNET: window.location.origin,
        },
        setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
      });
    });
  });

  it('throws a validation error when NX_VEGA_ENV is not found in the environment', async () => {
    delete process.env['NX_VEGA_ENV'];
    const consoleError = console.error;
    console.error = noop;
    expect(() => {
      renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });
    }).toThrowError(
      `NX_VEGA_ENV is invalid, received "undefined" instead of: 'CUSTOM' | 'SANDBOX' | 'TESTNET' | 'STAGNET1' | 'STAGNET3' | 'DEVNET' | 'MAINNET' | 'MIRROR'`
    );
    console.error = consoleError;
  });

  it('throws a validation error when VEGA_ENV is not a valid network', async () => {
    process.env['NX_VEGA_ENV'] = 'SOMETHING';
    const consoleError = console.error;
    console.error = noop;
    expect(() => {
      renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });
    }).toThrowError(
      `NX_VEGA_ENV is invalid, received "SOMETHING" instead of: CUSTOM | SANDBOX | TESTNET | STAGNET1 | STAGNET3 | DEVNET | MAINNET | MIRROR`
    );
    console.error = consoleError;
  });

  it('when VEGA_NETWORKS is not a valid json, prints a warning and continues without using the value from it', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(noop);
    process.env['NX_VEGA_NETWORKS'] = '{not:{valid:json';
    const { result } = renderHook(() => useEnvironment(), {
      wrapper: MockWrapper,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        ...mockEnvironmentState,
        VEGA_NETWORKS: {
          TESTNET: window.location.origin,
        },
        setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
      });
    });
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('throws a validation error when VEGA_NETWORKS has an invalid network as a key', async () => {
    process.env['NX_VEGA_NETWORKS'] = JSON.stringify({
      NOT_A_NETWORK: 'https://somewhere.url',
    });
    const consoleError = console.error;
    console.error = noop;
    expect(() => {
      renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });
    }).toThrowError(
      `All keys in NX_VEGA_NETWORKS must represent a valid environment: CUSTOM | SANDBOX | TESTNET | STAGNET1 | STAGNET3 | DEVNET | MAINNET | MIRROR`
    );
    console.error = consoleError;
  });

  it('throws a validation error when both VEGA_URL and VEGA_CONFIG_URL are missing in the environment', async () => {
    delete process.env['NX_VEGA_URL'];
    delete process.env['NX_VEGA_CONFIG_URL'];
    const consoleError = console.error;
    console.error = noop;
    expect(() => {
      renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });
    }).toThrowError(
      `Must provide either NX_VEGA_CONFIG_URL or NX_VEGA_URL in the environment.`
    );
    console.error = consoleError;
  });

  it.each`
    env                  | etherscanUrl                      | providerUrl
    ${Networks.DEVNET}   | ${'https://sepolia.etherscan.io'} | ${'https://sepolia.infura.io/v3/4f846e79e13f44d1b51bbd7ed9edefb8'}
    ${Networks.TESTNET}  | ${'https://sepolia.etherscan.io'} | ${'https://sepolia.infura.io/v3/4f846e79e13f44d1b51bbd7ed9edefb8'}
    ${Networks.STAGNET3} | ${'https://sepolia.etherscan.io'} | ${'https://sepolia.infura.io/v3/4f846e79e13f44d1b51bbd7ed9edefb8'}
    ${Networks.MAINNET}  | ${'https://etherscan.io'}         | ${'https://mainnet.infura.io/v3/4f846e79e13f44d1b51bbd7ed9edefb8'}
  `(
    'uses correct default ethereum connection variables in $env',
    async ({ env, etherscanUrl, providerUrl }) => {
      // @ts-ignore allow adding a mock return value to mocked module
      createClient.mockImplementation(() => createMockClient({ network: env }));

      process.env['NX_VEGA_ENV'] = env;
      delete process.env['NX_ETHEREUM_PROVIDER_URL'];
      delete process.env['NX_ETHERSCAN_URL'];
      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });
      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          VEGA_ENV: env,
          ETHEREUM_PROVIDER_URL: providerUrl,
          ETHERSCAN_URL: etherscanUrl,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    }
  );

  it('throws a validation error when NX_ETHERSCAN_URL is not a valid url', async () => {
    process.env['NX_ETHERSCAN_URL'] = 'invalid-url';
    const consoleError = console.error;
    console.error = noop;
    expect(() => {
      renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });
    }).toThrowError(
      `The NX_ETHERSCAN_URL environment variable must be a valid url`
    );
    console.error = consoleError;
  });

  it('throws a validation error when NX_ETHEREUM_PROVIDER_URL is not a valid url', async () => {
    process.env['NX_ETHEREUM_PROVIDER_URL'] = 'invalid-url';
    const consoleError = console.error;
    console.error = noop;
    expect(() => {
      renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });
    }).toThrow(
      `The NX_ETHEREUM_PROVIDER_URL environment variable must be a valid url`
    );
    console.error = consoleError;
  });

  describe('node selection', () => {
    it('updates the VEGA_URL from the config when it is missing from the environment', async () => {
      delete process.env['NX_VEGA_URL'];
      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          VEGA_URL: MOCK_HOST,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    });

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('updates the VEGA_URL with the quickest node to respond from the config urls', async () => {
      delete process.env['NX_VEGA_URL'];

      const mockNodes: Record<string, MockRequestConfig> = {
        'https://mock-node-1.com': { hasError: false, delay: 4 },
        'https://mock-node-2.com': { hasError: false, delay: 5 },
        'https://mock-node-3.com': { hasError: false, delay: 8 },
        'https://mock-node-4.com': { hasError: false, delay: 0 },
      };

      // @ts-ignore: typscript doesn't recognise the mock implementation
      global.fetch.mockImplementation(
        setupFetch(mockEnvironmentState.VEGA_CONFIG_URL, Object.keys(mockNodes))
      );
      // @ts-ignore allow adding a mock return value to mocked module
      createClient.mockImplementation((cfg: ClientOptions) => {
        // eslint-disable-next-line
        return createMockClient({ statistics: mockNodes[cfg.url!] });
      });

      const nodeUrl = getQuickestNode(mockNodes);

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          VEGA_URL: nodeUrl,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    });

    it('ignores failing nodes and selects the first successful one to use', async () => {
      delete process.env['NX_VEGA_URL'];

      const mockNodes: Record<string, MockRequestConfig> = {
        'https://mock-node-1.com': { hasError: true, delay: 4 },
        'https://mock-node-2.com': { hasError: false, delay: 5 },
        'https://mock-node-3.com': { hasError: false, delay: 8 },
        'https://mock-node-4.com': { hasError: true, delay: 0 },
      };

      // @ts-ignore: typscript doesn't recognise the mock implementation
      global.fetch.mockImplementation(
        setupFetch(mockEnvironmentState.VEGA_CONFIG_URL, Object.keys(mockNodes))
      );
      // @ts-ignore allow adding a mock return value to mocked module
      createClient.mockImplementation((cfg: ClientOptions) => {
        // eslint-disable-next-line
        return createMockClient({ statistics: mockNodes[cfg.url!] });
      });

      const nodeUrl = getQuickestNode(mockNodes);

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          VEGA_URL: nodeUrl,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    });

    it('has a network error when cannot connect to any nodes', async () => {
      delete process.env['NX_VEGA_URL'];

      const mockNodes: Record<string, MockRequestConfig> = {
        'https://mock-node-1.com': { hasError: true, delay: 4 },
        'https://mock-node-2.com': { hasError: true, delay: 5 },
        'https://mock-node-3.com': { hasError: true, delay: 8 },
        'https://mock-node-4.com': { hasError: true, delay: 0 },
      };

      // @ts-ignore: typscript doesn't recognise the mock implementation
      global.fetch.mockImplementation(
        setupFetch(mockEnvironmentState.VEGA_CONFIG_URL, Object.keys(mockNodes))
      );
      // @ts-ignore allow adding a mock return value to mocked module
      createClient.mockImplementation((cfg: ClientOptions) => {
        // eslint-disable-next-line
        return createMockClient({ statistics: mockNodes[cfg.url!] });
      });

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          VEGA_URL: undefined,
          networkError: ErrorType.CONNECTION_ERROR_ALL,
          nodeSwitcherOpen: true,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    });

    it('has a network error when it cannot fetch the network config and there is no VEGA_URL in the environment', async () => {
      delete process.env['NX_VEGA_URL'];

      // @ts-ignore: typscript doesn't recognise the mock implementation
      global.fetch.mockImplementation(() => {
        throw new Error('Cannot fetch');
      });

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          VEGA_URL: undefined,
          networkError: ErrorType.CONFIG_LOAD_ERROR,
          nodeSwitcherOpen: true,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    });

    it('logs an error when it cannot fetch the network config and there is a VEGA_URL in the environment', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(noop);

      // @ts-ignore: typscript doesn't recognise the mock implementation
      global.fetch.mockImplementation(() => {
        throw new Error('Cannot fetch');
      });

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          nodeSwitcherOpen: false,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          getErrorByType(
            ErrorType.CONFIG_LOAD_ERROR,
            mockEnvironmentState.VEGA_ENV
          )?.headline
        );
      });
    });

    // SKIP due to https://github.com/facebook/jest/issues/12670
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('has a network error when the config is invalid and there is no VEGA_URL in the environment', async () => {
      delete process.env['NX_VEGA_URL'];

      // @ts-ignore: typscript doesn't recognise the mock implementation
      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ some: 'invalid-object' }),
        })
      );

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          VEGA_URL: undefined,
          networkError: ErrorType.CONFIG_VALIDATION_ERROR,
          nodeSwitcherOpen: true,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    });

    // SKIP due to https://github.com/facebook/jest/issues/12670
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('logs an error when the network config is invalid and there is a VEGA_URL in the environment', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(noop);

      // @ts-ignore: typscript doesn't recognise the mock implementation
      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ some: 'invalid-object' }),
        })
      );

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      expect(result.current.configLoading).toBe(true);

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          getErrorByType(
            ErrorType.CONFIG_VALIDATION_ERROR,
            mockEnvironmentState.VEGA_ENV
          )?.headline
        );
      });
    });

    it('has a network error when the selected node is not a valid url', async () => {
      process.env['NX_VEGA_URL'] = 'not-url';

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          VEGA_URL: 'not-url',
          nodeSwitcherOpen: true,
          networkError: ErrorType.INVALID_URL,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    });

    it('has a network error when cannot connect to the selected node', async () => {
      // @ts-ignore allow adding a mock return value to mocked module
      createClient.mockImplementation(() => {
        return createMockClient({ statistics: { hasError: true } });
      });

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          nodeSwitcherOpen: true,
          networkError: ErrorType.CONNECTION_ERROR,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
        });
      });
    });

    it('has a network error when the selected node has no subscription available', async () => {
      // @ts-ignore allow adding a mock return value to mocked module
      createClient.mockImplementation(() => {
        return createMockClient({ busEvents: { hasError: true } });
      });

      const { result } = renderHook(() => useEnvironment(), {
        wrapper: MockWrapper,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          ...mockEnvironmentState,
          networkError: ErrorType.SUBSCRIPTION_ERROR,
          setNodeSwitcherOpen: result.current.setNodeSwitcherOpen,
          nodeSwitcherOpen: true,
        });
      });
    });
  });
});
