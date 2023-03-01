/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { AssetStatus } from "./../../../../../../libs/types/src/__generated__/globalTypes";

// ====================================================
// GraphQL query operation: DepositPage
// ====================================================

export interface DepositPage_assetsConnection_edges_node_source_BuiltinAsset {
  __typename: "BuiltinAsset";
}

export interface DepositPage_assetsConnection_edges_node_source_ERC20 {
  __typename: "ERC20";
  /**
   * The address of the erc20 contract
   */
  contractAddress: string;
}

export type DepositPage_assetsConnection_edges_node_source = DepositPage_assetsConnection_edges_node_source_BuiltinAsset | DepositPage_assetsConnection_edges_node_source_ERC20;

export interface DepositPage_assetsConnection_edges_node {
  __typename: "Asset";
  /**
   * The id of the asset
   */
  id: string;
  /**
   * The symbol of the asset (e.g: GBP)
   */
  symbol: string;
  /**
   * The full name of the asset (e.g: Great British Pound)
   */
  name: string;
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
  source: DepositPage_assetsConnection_edges_node_source;
}

export interface DepositPage_assetsConnection_edges {
  __typename: "AssetEdge";
  node: DepositPage_assetsConnection_edges_node;
}

export interface DepositPage_assetsConnection {
  __typename: "AssetsConnection";
  /**
   * The assets
   */
  edges: (DepositPage_assetsConnection_edges | null)[] | null;
}

export interface DepositPage {
  /**
   * The list of all assets in use in the vega network or the specified asset if id is provided
   */
  assetsConnection: DepositPage_assetsConnection;
}