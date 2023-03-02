import type { Asset } from '@vegaprotocol/assets';
import { AssetOption } from '@vegaprotocol/assets';
import {
  ethereumAddress,
  required,
  vegaPublicKey,
  minSafe,
  maxSafe,
  addDecimal,
  isAssetTypeERC20,
  formatNumber,
} from '@vegaprotocol/utils';
import { t } from '@vegaprotocol/i18n';
import { useLocalStorage } from '@vegaprotocol/react-helpers';
import {
  Button,
  FormGroup,
  Input,
  InputError,
  RichSelect,
  Notification,
  Intent,
  ButtonLink,
  Select,
  ExternalLink,
} from '@vegaprotocol/ui-toolkit';
import { useVegaWallet } from '@vegaprotocol/wallet';
import { useWeb3React } from '@web3-react/core';
import BigNumber from 'bignumber.js';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { DepositLimits } from './deposit-limits';
import { useAssetDetailsDialogStore } from '@vegaprotocol/assets';
import type { EthTxState } from '@vegaprotocol/web3';
import { EthTxStatus } from '@vegaprotocol/web3';
import {
  ETHEREUM_EAGER_CONNECT,
  useWeb3ConnectStore,
  getChainName,
} from '@vegaprotocol/web3';
import { useEnvironment } from '@vegaprotocol/environment';
import type { DepositBalances } from './use-deposit-balances';

interface FormFields {
  asset: string;
  from: string;
  to: string;
  amount: string;
}

export interface DepositFormProps {
  assets: Asset[];
  selectedAsset?: Asset;
  balances: DepositBalances | null;
  onSelectAsset: (assetId: string) => void;
  onDisconnect: () => void;
  submitApprove: () => void;
  approveTx: EthTxState;
  submitDeposit: (args: {
    assetSource: string;
    amount: string;
    vegaPublicKey: string;
  }) => void;
  requestFaucet: () => void;
  faucetTx: EthTxState;
  isFaucetable?: boolean;
}

export const DepositForm = ({
  assets,
  selectedAsset,
  balances,
  onSelectAsset,
  onDisconnect,
  submitApprove,
  approveTx,
  submitDeposit,
  requestFaucet,
  faucetTx,
  isFaucetable,
}: DepositFormProps) => {
  const { open: openAssetDetailsDialog } = useAssetDetailsDialogStore();
  const openDialog = useWeb3ConnectStore((store) => store.open);
  const { isActive, account } = useWeb3React();
  const { pubKey, pubKeys: _pubKeys } = useVegaWallet();
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<FormFields>({
    defaultValues: {
      to: pubKey ? pubKey : undefined,
      asset: selectedAsset?.id || '',
    },
  });

  const amount = useWatch({ name: 'amount', control });

  const onSubmit = async (fields: FormFields) => {
    if (!selectedAsset || selectedAsset.source.__typename !== 'ERC20') {
      throw new Error('Invalid asset');
    }
    if (!approved) throw new Error('Deposits not approved');

    submitDeposit({
      assetSource: selectedAsset.source.contractAddress,
      amount: fields.amount,
      vegaPublicKey: fields.to,
    });
  };

  const min = useMemo(() => {
    // Min viable amount given asset decimals EG for WEI 0.000000000000000001
    const minViableAmount = selectedAsset
      ? new BigNumber(addDecimal('1', selectedAsset.decimals))
      : new BigNumber(0);

    return minViableAmount;
  }, [selectedAsset]);

  const pubKeys = useMemo(() => {
    return _pubKeys ? _pubKeys.map((pk) => pk.publicKey) : [];
  }, [_pubKeys]);

  const approved = balances
    ? balances.allowance.isGreaterThan(0)
      ? true
      : false
    : false;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate={true}
      data-testid="deposit-form"
    >
      <FormGroup
        label={t('From (Ethereum address)')}
        labelFor="ethereum-address"
      >
        <Controller
          name="from"
          control={control}
          rules={{
            validate: {
              required: (value) => {
                if (!value) return t('Connect Ethereum wallet');
                return true;
              },
              ethereumAddress,
            },
          }}
          defaultValue={account}
          render={() => {
            if (isActive && account) {
              return (
                <div className="text-sm">
                  <p className="mb-1">{account}</p>
                  <DisconnectEthereumButton
                    onDisconnect={() => {
                      setValue('from', ''); // clear from value so required ethereum connection validation works
                      onDisconnect();
                    }}
                  />
                </div>
              );
            }
            return (
              <Button
                onClick={openDialog}
                variant="primary"
                type="button"
                data-testid="connect-eth-wallet-btn"
              >
                {t('Connect')}
              </Button>
            );
          }}
        />
        {errors.from?.message && (
          <InputError intent="danger">{errors.from.message}</InputError>
        )}
      </FormGroup>
      <FormGroup label={t('Asset')} labelFor="asset">
        <Controller
          control={control}
          name="asset"
          rules={{
            validate: {
              required: (value) => !!selectedAsset || required(value),
            },
          }}
          render={({ field }) => (
            <RichSelect
              data-testid="select-asset"
              id={field.name}
              name={field.name}
              onValueChange={(value) => {
                onSelectAsset(value);
                field.onChange(value);
              }}
              placeholder={t('Please select an asset')}
              value={selectedAsset?.id}
              hasError={Boolean(errors.asset?.message)}
            >
              {assets.filter(isAssetTypeERC20).map((a) => (
                <AssetOption asset={a} key={a.id} />
              ))}
            </RichSelect>
          )}
        />
        {errors.asset?.message && (
          <InputError intent="danger" forInput="asset">
            {errors.asset.message}
          </InputError>
        )}
        {isFaucetable && selectedAsset && (
          <UseButton onClick={requestFaucet}>
            {t(`Get ${selectedAsset.symbol}`)}
          </UseButton>
        )}
        {!errors.asset?.message && selectedAsset && (
          <button
            data-testid="view-asset-details"
            className="text-sm underline"
            onClick={(e) => {
              e.preventDefault();
              openAssetDetailsDialog(selectedAsset.id, e.target as HTMLElement);
            }}
          >
            {t('View asset details')}
          </button>
        )}
      </FormGroup>
      <FaucetNotification
        isActive={isActive}
        selectedAsset={selectedAsset}
        tx={faucetTx}
      />
      <FormGroup label={t('To (Vega key)')} labelFor="to">
        <AddressField
          pubKeys={pubKeys}
          onChange={() => setValue('to', '')}
          select={
            <Select {...register('to')} id="to" defaultValue="">
              <option value="" disabled={true}>
                {t('Please select')}
              </option>
              {pubKeys?.length &&
                pubKeys.map((pk) => (
                  <option key={pk} value={pk}>
                    {pk}
                  </option>
                ))}
            </Select>
          }
          input={
            <Input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={true} // focus input immediately after is shown
              id="to"
              type="text"
              {...register('to', {
                validate: {
                  required,
                  vegaPublicKey,
                },
              })}
            />
          }
        />
        {errors.to?.message && (
          <InputError intent="danger" forInput="to">
            {errors.to.message}
          </InputError>
        )}
      </FormGroup>
      {selectedAsset && balances && (
        <div className="mb-6">
          <DepositLimits {...balances} asset={selectedAsset} />
        </div>
      )}
      {approved && (
        <FormGroup label={t('Amount')} labelFor="amount">
          <Input
            type="number"
            autoComplete="off"
            id="amount"
            {...register('amount', {
              validate: {
                required,
                minSafe: (value) => minSafe(new BigNumber(min))(value),
                approved: (v) => {
                  const value = new BigNumber(v);
                  if (value.isGreaterThan(balances?.allowance || 0)) {
                    return t('Amount is above approved amount');
                  }
                  return true;
                },
                limit: (v) => {
                  const value = new BigNumber(v);
                  if (!balances) {
                    return t('Could not verify balances of account'); // this should never happen
                  }

                  let lifetimeLimit = new BigNumber(Infinity);
                  if (balances.max.isGreaterThan(0)) {
                    lifetimeLimit = balances.max.minus(balances.deposited);
                  }

                  if (value.isGreaterThan(lifetimeLimit)) {
                    return t('Amount is above lifetime deposit limit');
                  }
                  return true;
                },
                balance: (v) => {
                  const value = new BigNumber(v);
                  if (value.isGreaterThan(balances?.balance || 0)) {
                    return t('Insufficient amount in Ethereum wallet');
                  }
                  return true;
                },
                maxSafe: (v) => {
                  return maxSafe(balances?.balance || new BigNumber(0))(v);
                },
              },
            })}
          />
          {errors.amount?.message && (
            <InputError intent="danger" forInput="amount">
              {errors.amount.message}
            </InputError>
          )}
          {selectedAsset && balances && (
            <UseButton
              onClick={() => {
                setValue(
                  'amount',
                  balances.balance.toFixed(selectedAsset.decimals)
                );
                clearErrors('amount');
              }}
            >
              {t('Use maximum')}
            </UseButton>
          )}
        </FormGroup>
      )}
      <ApproveNotification
        isActive={isActive}
        selectedAsset={selectedAsset}
        onApprove={submitApprove}
        tx={approveTx}
        balances={balances}
        approved={approved}
        amount={amount}
      />
      <FormButton />
    </form>
  );
};

const FormButton = () => {
  const { isActive, chainId } = useWeb3React();
  const desiredChainId = useWeb3ConnectStore((store) => store.desiredChainId);
  const invalidChain = isActive && chainId !== desiredChainId;
  return (
    <>
      {invalidChain && (
        <div className="mb-2">
          <Notification
            intent={Intent.Danger}
            testId="chain-error"
            message={t(
              `This app only works on ${getChainName(desiredChainId)}.`
            )}
          />
        </div>
      )}
      <Button
        type="submit"
        data-testid="deposit-submit"
        variant={isActive ? 'primary' : 'default'}
        fill={true}
        disabled={invalidChain}
      >
        {t('Deposit')}
      </Button>
    </>
  );
};

type UseButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const UseButton = (props: UseButtonProps) => {
  return (
    <button
      {...props}
      type="button"
      className="ml-auto text-sm absolute top-0 right-0 underline"
    />
  );
};

const DisconnectEthereumButton = ({
  onDisconnect,
}: {
  onDisconnect: () => void;
}) => {
  const { connector } = useWeb3React();
  const [, , removeEagerConnector] = useLocalStorage(ETHEREUM_EAGER_CONNECT);

  return (
    <ButtonLink
      onClick={() => {
        connector.deactivate();
        removeEagerConnector();
        onDisconnect();
      }}
      data-testid="disconnect-ethereum-wallet"
    >
      {t('Disconnect')}
    </ButtonLink>
  );
};

interface AddressInputProps {
  pubKeys: string[] | null;
  select: ReactNode;
  input: ReactNode;
  onChange: () => void;
}

export const AddressField = ({
  pubKeys,
  select,
  input,
  onChange,
}: AddressInputProps) => {
  const [isInput, setIsInput] = useState(() => {
    if (pubKeys && pubKeys.length <= 1) {
      return true;
    }
    return false;
  });

  return (
    <>
      {isInput ? input : select}
      {pubKeys && pubKeys.length > 1 && (
        <button
          type="button"
          onClick={() => {
            setIsInput((curr) => !curr);
            onChange();
          }}
          className="ml-auto text-sm absolute top-0 right-0 underline"
        >
          {isInput ? t('Select from wallet') : t('Enter manually')}
        </button>
      )}
    </>
  );
};

interface ApproveNotificationProps {
  isActive: boolean;
  selectedAsset?: Asset;
  tx: EthTxState;
  onApprove: () => void;
  approved: boolean;
  balances: DepositBalances | null;
  amount: string;
}

const ApproveNotification = ({
  isActive,
  selectedAsset,
  tx,
  onApprove,
  amount,
  balances,
  approved,
}: ApproveNotificationProps) => {
  if (!isActive) {
    return null;
  }

  if (!selectedAsset) {
    return null;
  }

  if (!balances) {
    return null;
  }

  const approvePrompt = (
    <div className="mb-4">
      <Notification
        intent={Intent.Warning}
        testId="approve-default"
        message={t(
          `Before you can make a deposit of your chosen asset, ${selectedAsset?.symbol}, you need to approve its use in your Ethereum wallet`
        )}
        buttonProps={{
          size: 'sm',
          text: `Approve ${selectedAsset?.symbol}`,
          action: onApprove,
        }}
      />
    </div>
  );
  const reApprovePrompt = (
    <div className="mb-4">
      <Notification
        intent={Intent.Warning}
        testId="reapprove-default"
        message={t(
          `Approve again to deposit more than ${formatNumber(
            balances.allowance.toString()
          )}`
        )}
        buttonProps={{
          size: 'sm',
          text: `Approve ${selectedAsset?.symbol}`,
          action: onApprove,
        }}
      />
    </div>
  );
  const approvalFeedback = (
    <ApprovalTxFeedback
      tx={tx}
      selectedAsset={selectedAsset}
      allowance={balances.allowance}
    />
  );

  // always show requested and pending states
  if (
    [EthTxStatus.Requested, EthTxStatus.Pending, EthTxStatus.Complete].includes(
      tx.status
    )
  ) {
    return approvalFeedback;
  }

  if (!approved) {
    return approvePrompt;
  }

  if (new BigNumber(amount).isGreaterThan(balances.allowance)) {
    return reApprovePrompt;
  }

  // @ts-ignore tx.error not typed correctly
  if (tx.status === EthTxStatus.Error && tx.error.code === 'ACTION_REJECTED') {
    return approvePrompt;
  }

  return approvalFeedback;
};

const ApprovalTxFeedback = ({
  tx,
  selectedAsset,
  allowance,
}: {
  tx: EthTxState;
  selectedAsset: Asset;
  allowance?: BigNumber;
}) => {
  const { ETHERSCAN_URL } = useEnvironment();

  const txLink = tx.txHash && (
    <ExternalLink href={`${ETHERSCAN_URL}/tx/${tx.txHash}`}>
      {t('View on Etherscan')}
    </ExternalLink>
  );

  if (tx.status === EthTxStatus.Error) {
    return (
      <div className="mb-4">
        <Notification
          intent={Intent.Danger}
          testId="approve-error"
          message={
            <p>
              {t('Approval failed')} {txLink}
            </p>
          }
        />
      </div>
    );
  }

  if (tx.status === EthTxStatus.Requested) {
    return (
      <div className="mb-4">
        <Notification
          intent={Intent.Warning}
          testId="approve-requested"
          message={t(
            `Go to your Ethereum wallet and approve the transaction to enable the use of ${selectedAsset?.symbol}`
          )}
        />
      </div>
    );
  }

  if (tx.status === EthTxStatus.Pending) {
    return (
      <div className="mb-4">
        <Notification
          intent={Intent.Primary}
          testId="approve-pending"
          message={
            <>
              <p>
                {t(
                  `Your ${selectedAsset?.symbol} is being confirmed by the Ethereum network. When this is complete, you can continue your deposit`
                )}{' '}
              </p>
              {txLink && <p>{txLink}</p>}
            </>
          }
        />
      </div>
    );
  }

  if (tx.status === EthTxStatus.Confirmed) {
    return (
      <div className="mb-4">
        <Notification
          intent={Intent.Success}
          testId="approve-confirmed"
          message={
            <>
              <p>
                {t(
                  `You can now make deposits in ${
                    selectedAsset?.symbol
                  }, up to a maximum of ${formatNumber(
                    allowance?.toString() || 0
                  )}`
                )}
              </p>
              {txLink && <p>{txLink}</p>}
            </>
          }
        />
      </div>
    );
  }
  return null;
};

interface FaucetNotificationProps {
  isActive: boolean;
  selectedAsset?: Asset;
  tx: EthTxState;
}
const FaucetNotification = ({
  isActive,
  selectedAsset,
  tx,
}: FaucetNotificationProps) => {
  const { ETHERSCAN_URL } = useEnvironment();

  if (!isActive) {
    return null;
  }

  if (!selectedAsset) {
    return null;
  }

  if (tx.status === EthTxStatus.Error) {
    return (
      <div className="mb-4">
        <Notification
          intent={Intent.Danger}
          testId="faucet-error"
          // @ts-ignore tx.error not typed correctly
          message={t(`Faucet failed: ${tx.error?.reason}`)}
        />
      </div>
    );
  }

  if (tx.status === EthTxStatus.Requested) {
    return (
      <div className="mb-4">
        <Notification
          intent={Intent.Warning}
          testId="faucet-requested"
          message={t(
            `Go to your Ethereum wallet and approve the transaction to faucet ${selectedAsset?.symbol}`
          )}
        />
      </div>
    );
  }

  if (tx.status === EthTxStatus.Pending) {
    return (
      <div className="mb-4">
        <Notification
          intent={Intent.Primary}
          testId="faucet-pending"
          message={
            <p>
              {t('Waiting...')}{' '}
              {tx.txHash && (
                <ExternalLink href={`${ETHERSCAN_URL}/tx/${tx.txHash}`}>
                  {t('View on Etherscan')}
                </ExternalLink>
              )}
            </p>
          }
        />
      </div>
    );
  }

  if (tx.status === EthTxStatus.Confirmed) {
    return (
      <div className="mb-4">
        <Notification
          intent={Intent.Success}
          testId="faucet-confirmed"
          message={
            <p>
              {t('Faucet successful')}{' '}
              {tx.txHash && (
                <ExternalLink href={`${ETHERSCAN_URL}/tx/${tx.txHash}`}>
                  {t('View on Etherscan')}
                </ExternalLink>
              )}
            </p>
          }
        />
      </div>
    );
  }

  return null;
};
