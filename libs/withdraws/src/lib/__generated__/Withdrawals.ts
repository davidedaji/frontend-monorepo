/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { WithdrawalStatus, AssetStatus } from "./../../../../types/src/__generated__/globalTypes";

// ====================================================
// GraphQL query operation: Withdrawals
// ====================================================

export interface Withdrawals_party_withdrawalsConnection_edges_node_asset_source_BuiltinAsset {
  __typename: "BuiltinAsset";
}

export interface Withdrawals_party_withdrawalsConnection_edges_node_asset_source_ERC20 {
  __typename: "ERC20";
  /**
   * The address of the erc20 contract
   */
  contractAddress: string;
}

export type Withdrawals_party_withdrawalsConnection_edges_node_asset_source = Withdrawals_party_withdrawalsConnection_edges_node_asset_source_BuiltinAsset | Withdrawals_party_withdrawalsConnection_edges_node_asset_source_ERC20;

export interface Withdrawals_party_withdrawalsConnection_edges_node_asset {
  __typename: "Asset";
  /**
   * The id of the asset
   */
  id: string;
  /**
   * The full name of the asset (e.g: Great British Pound)
   */
  name: string;
  /**
   * The symbol of the asset (e.g: GBP)
   */
  symbol: string;
  /**
   * The precision of the asset
   */
  decimals: number;
  /**
   * The status of the asset in the vega network
   */
  status: AssetStatus;
  /**
   * The origin source of the asset (e.g: an erc20 asset)
   */
  source: Withdrawals_party_withdrawalsConnection_edges_node_asset_source;
}

export interface Withdrawals_party_withdrawalsConnection_edges_node_details {
  __typename: "Erc20WithdrawalDetails";
  /**
   * The ethereum address of the receiver of the asset funds
   */
  receiverAddress: string;
}

export interface Withdrawals_party_withdrawalsConnection_edges_node {
  __typename: "Withdrawal";
  /**
   * The Vega internal id of the withdrawal
   */
  id: string;
  /**
   * The current status of the withdrawal
   */
  status: WithdrawalStatus;
  /**
   * The amount to be withdrawn
   */
  amount: string;
  /**
   * The asset to be withdrawn
   */
  asset: Withdrawals_party_withdrawalsConnection_edges_node_asset;
  /**
   * RFC3339Nano time at which the withdrawal was created
   */
  createdTimestamp: string;
  /**
   * RFC3339Nano time at which the withdrawal was finalized
   */
  withdrawnTimestamp: string | null;
  /**
   * Hash of the transaction on the foreign chain
   */
  txHash: string | null;
  /**
   * Foreign chain specific details about the withdrawal
   */
  details: Withdrawals_party_withdrawalsConnection_edges_node_details | null;
  /**
   * Whether or the not the withdrawal is being processed on Ethereum
   */
  pendingOnForeignChain: boolean;
}

export interface Withdrawals_party_withdrawalsConnection_edges {
  __typename: "WithdrawalEdge";
  node: Withdrawals_party_withdrawalsConnection_edges_node;
}

export interface Withdrawals_party_withdrawalsConnection {
  __typename: "WithdrawalsConnection";
  /**
   * The withdrawals
   */
  edges: (Withdrawals_party_withdrawalsConnection_edges | null)[] | null;
}

export interface Withdrawals_party {
  __typename: "Party";
  /**
   * Party identifier
   */
  id: string;
  /**
   * The list of all withdrawals initiated by the party
   */
  withdrawalsConnection: Withdrawals_party_withdrawalsConnection;
}

export interface Withdrawals {
  /**
   * An entity that is trading on the VEGA network
   */
  party: Withdrawals_party | null;
}

export interface WithdrawalsVariables {
  partyId: string;
}