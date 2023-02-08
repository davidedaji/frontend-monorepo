import { z } from 'zod';
import { LocalStorage } from '@vegaprotocol/react-helpers';
import { useEffect } from 'react';
import { create } from 'zustand';
import { createClient } from '@vegaprotocol/apollo-client';
import type { StatisticsQuery } from '../utils/__generated__/Node';
import { StatisticsDocument } from '../utils/__generated__/Node';
import { Networks } from '../types';

type Client = ReturnType<typeof createClient>;
type ClientCollection = {
  [node: string]: Client;
};

type EnvVars = z.infer<typeof EnvSchema>;
type EnvState = {
  nodes: string[];
  status: 'default' | 'pending' | 'success' | 'failed';
};
type Env = EnvVars & EnvState;
type Actions = {
  setUrl: (url: string) => void;
  initialize: () => Promise<void>;
};

const EnvSchema = z.object({
  VEGA_URL: z.optional(z.string()),
  VEGA_WALLET_URL: z.string(),
  VEGA_CONFIG_URL: z.string(),
  GIT_BRANCH: z.optional(z.string()),
  GIT_COMMIT_HASH: z.optional(z.string()),
  GIT_ORIGIN_URL: z.optional(z.string()),
  GITHUB_FEEDBACK_URL: z.optional(z.string()),
  VEGA_ENV: z.nativeEnum(Networks),
  VEGA_EXPLORER_URL: z.optional(z.string()),
  VEGA_TOKEN_URL: z.optional(z.string()),
  VEGA_DOCS_URL: z.optional(z.string()),
  VEGA_NETWORKS: z
    .object(
      Object.keys(Networks).reduce(
        (acc, env) => ({
          ...acc,
          [env]: z.optional(z.string()),
        }),
        {}
      )
    )
    .strict({
      message: `All keys in NX_VEGA_NETWORKS must represent a valid environment: ${Object.keys(
        Networks
      ).join(' | ')}`,
    }),
  ETHEREUM_PROVIDER_URL: z.string().url({
    message:
      'The NX_ETHEREUM_PROVIDER_URL environment variable must be a valid url',
  }),
  ETHERSCAN_URL: z.string().url({
    message: 'The NX_ETHERSCAN_URL environment variable must be a valid url',
  }),
  HOSTED_WALLET_URL: z.optional(z.string()),
  MAINTENANCE_PAGE: z.optional(z.boolean()),
  ETH_LOCAL_PROVIDER_URL: z.optional(z.string()),
  ETH_WALLET_MNEMONIC: z.optional(z.string()),
});

const envvars = compileEnvVars();

export const useEnvironment = create<Env & Actions>((set, get) => ({
  ...envvars,
  nodes: [],
  status: 'default',
  setUrl: (url) => {
    set({ VEGA_URL: url });
    LocalStorage.setItem('vega_url', url);
  },
  initialize: async () => {
    const state = get();
    if (state.status === 'pending') return;
    const storedUrl = LocalStorage.getItem('vega_url');
    set({ status: 'pending' });

    let nodes: string[];

    try {
      nodes = await fetchConfig(state.VEGA_CONFIG_URL);
    } catch (err) {
      set({ status: 'failed' });
      return;
    }

    set({ nodes });

    // user has previously loaded the app and found
    // a successful node, or chosen one manually - reconnect
    // to same node
    if (storedUrl) {
      set({ VEGA_URL: storedUrl, status: 'success' });
      return;
    }

    if (state.VEGA_URL) {
      set({ status: 'success' });
      return;
    }

    // create client and store instances
    const clients: ClientCollection = {};
    nodes.forEach((url) => {
      clients[url] = createClient({
        url,
        cacheConfig: undefined,
        retry: false,
        connectToDevTools: false,
      });
    });

    // find a suitable node to connected, first one to respond is chosen
    const url = await findNode(clients);

    if (url !== null) {
      set({
        status: 'success',
        VEGA_URL: url,
      });
      LocalStorage.setItem('vega_url', url);
    } else {
      console.warn('No suitable vega node was found');
    }
  },
}));

export const useInitializeEnv = () => {
  const { initialize, ...env } = useEnvironment();

  useEffect(() => {
    if (env.status === 'default') {
      initialize();
    }
  }, [env.status, initialize]);
};

export const configSchema = z.object({
  hosts: z.array(z.string()),
});

const fetchConfig = async (url: string) => {
  const res = await fetch(url);
  const cfg = await res.json();
  const result = configSchema.parse(cfg);
  return result.hosts;
};

const findNode = (clients: ClientCollection): Promise<string | null> => {
  const tests = Object.entries(clients).map((args) => testNode(...args));
  return Promise.race(tests);
};

const testNode = async (
  url: string,
  client: Client
): Promise<string | null> => {
  try {
    // const results = await Promise.all([
    //   testQuery(client),
    //   testSubscription(client),
    // ]);
    const success = await testQuery(client);
    if (success) {
      return url;
    }
    return null;
  } catch (err) {
    console.warn(`tests failed for ${url}`);
    return null;
  }
};

const testQuery = async (client: Client) => {
  try {
    const result = await client.query<StatisticsQuery>({
      query: StatisticsDocument,
    });
    if (!result || result.error) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
};

// const testSubscription = (client: Client) => {
//   return new Promise((resolve) => {
//     const sub = client
//       .subscribe<BlockTimeSubscription>({
//         query: BlockTimeDocument,
//         errorPolicy: 'all',
//       })
//       .subscribe({
//         next: () => {
//           resolve(true);
//           sub.unsubscribe();
//         },
//         error: () => {
//           resolve(false);
//           sub.unsubscribe();
//         },
//       });
//   });
// };

function compileEnvVars() {
  const env: EnvVars = {
    VEGA_URL: process.env['NX_VEGA_URL'] || '',
    VEGA_ENV: process.env['NX_VEGA_ENV'] as Networks,
    VEGA_NETWORKS: JSON.parse(
      process.env['NX_VEGA_NETWORKS'] || '{}'
    ) as Record<Networks, string>,
    VEGA_CONFIG_URL: process.env['NX_VEGA_CONFIG_URL'] || '',
    GIT_BRANCH: process.env['GIT_COMMIT_BRANCH'] || '',
    GIT_COMMIT_HASH: process.env['GIT_COMMIT_HASH'] || '',
    GIT_ORIGIN_URL: process.env['GIT_ORIGIN_URL'] || '',
    ETHEREUM_PROVIDER_URL: process.env['NX_ETHEREUM_PROVIDER_URL'] || '',
    ETH_LOCAL_PROVIDER_URL: process.env['NX_ETH_LOCAL_PROVIDER_URL'] || '',
    ETH_WALLET_MNEMONIC: process.env['NX_ETH_WALLET_MNEMONIC'] || '',
    ETHERSCAN_URL: process.env['NX_ETHERSCAN_URL'] || '',
    VEGA_DOCS_URL: process.env['NX_VEGA_DOCS_URL'] || '',
    VEGA_EXPLORER_URL: process.env['NX_VEGA_EXPLORER_URL'] || '',
    VEGA_TOKEN_URL: process.env['NX_TOKEN_URL'] || '',
    GITHUB_FEEDBACK_URL: process.env['NX_GITHUB_FEEDBACK_URL'] || '',
    VEGA_WALLET_URL: process.env['NX_VEGA_WALLET_URL'] || '',
    HOSTED_WALLET_URL: process.env['NX_HOSTED_WALLET_URL'] || '',
  };
  return EnvSchema.parse(env);
}
