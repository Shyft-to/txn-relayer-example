import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import React, { FC, useEffect, useState } from 'react';

import { Network, ShyftSdk, TokenBalance } from '@shyft-to/js';
import styles from './styles/Home.module.css';
import { NetworkSwitcher } from './components/NetworkSwitcher';
import { ContextProvider } from './contexts/ContextProvider';
import { useNetworkConfiguration } from './contexts/NetworkConfigurationProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import axios from 'axios';

require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

const App: FC = () => {
    return (
        <ContextProvider>
            <Content />
        </ContextProvider>
    );
};
export default App;

const Content: FC = () => {
    const relayWallet = process.env.REACT_APP_RELAY_WALLET!;
    const { networkConfiguration } = useNetworkConfiguration();
    const wallet = useWallet();
    const [tokenList, setTokenList] = useState<TokenBalance[]>();
    const [token, setSelectedToken] = useState<string>();
    const shyft = new ShyftSdk({ network: networkConfiguration as Network, apiKey: process.env.REACT_APP_API_KEY! });

    useEffect(() => {
        (async () => {
            if (wallet?.connected) {
                // Run your code here that should only execute when the wallet is connected
                console.log('Solana wallet is connected. Running effect...');
                // Your logic here
                const tokens = await shyft.wallet.getAllTokenBalance({ wallet: wallet.publicKey!.toBase58() });
                setTokenList(tokens);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet?.connected]);
    const [amount, setAmount] = useState('');
    const [receiver, setReceiver] = useState('');
    const [signature, setSignature] = useState('');
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isErrorOccured, setErrorOccured] = useState(false);
    const handleOptionChange = (event: any) => {
        const selectedValue = event.target.value;
        setSelectedToken(selectedValue); // Update selected option
    };
    const signTxn = async () => {
        try {
            const { encoded_transaction: encodedTxn } = await shyft.token.transfer({
                fromAddress: wallet.publicKey!.toBase58(),
                toAddress: receiver,
                tokenAddress: token!,
                amount: parseFloat(amount),
                feePayer: relayWallet,
            });
            const recoveredTxn = Transaction.from(Buffer.from(encodedTxn, 'base64'));
            const signedTxn = await wallet.signTransaction!(recoveredTxn);
            const serializedTx = signedTxn
                .serialize({ requireAllSignatures: false, verifySignatures: true })
                .toString('base64');
            const response = await axios.post(
                'https://api.shyft.to/sol/v1/txn_relayer/sign',
                JSON.stringify({ network: 'devnet', encoded_transaction: serializedTx }),
                {
                    headers: {
                        'x-api-key': process.env.REACT_APP_API_KEY!,
                        'Content-Type': 'application/json',
                    },
                }
            );
            setSignature(response?.data?.result?.tx);
            setSuccess(true);
            setErrorOccured(false);
            console.log(signature);
        } catch (error: any) {
            setSuccess(false);
            setErrorOccured(true);
            setErrorMsg(error?.message ?? 'Some error occured!');
            console.error(error);
        }
    };
    return (
        <div className="App">
            <div className="container pt-4">
                <div className="row">
                    <div className="col-12 col-lg-6">
                        <div className={styles.walletButtons}>
                            <WalletMultiButton />
                            <WalletDisconnectButton />
                        </div>
                    </div>
                    <div className="col-12 col-lg-6">
                        <div className={styles.walletButtons}>
                            <NetworkSwitcher />
                        </div>
                    </div>
                </div>
                <div className="row pt-4">
                    <div className="col-6">
                        <div style={{ paddingTop: '10px' }}>
                            {tokenList && tokenList.length > 0 ? (
                                <select
                                    className="form-select"
                                    aria-label="Default select example"
                                    onChange={handleOptionChange}
                                >
                                    <option key="select" value="" selected>
                                        Select token to transfer
                                    </option>
                                    {tokenList.map((option) => (
                                        <option key={option.address} value={option.address}>
                                            {option.info.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <select className="form-select" aria-label="Default select example" disabled>
                                    <option value="No tokens available" disabled selected>
                                        No tokens available
                                    </option>
                                </select>
                            )}
                            <input
                                type="number"
                                name="amount"
                                placeholder="Amount"
                                className="form-control text-light my-3"
                                min="0"
                                max="10000"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={!tokenList}
                            />
                            <input
                                type="text"
                                name="receiver"
                                placeholder="Receiver"
                                className="form-control text-light my-3"
                                value={receiver}
                                onChange={(e) => setReceiver(e.target.value)}
                                disabled={!tokenList}
                            />
                            <div className="pt-3" style={!tokenList ? { cursor: 'not-allowed' } : {}}>
                                <button
                                    onClick={signTxn}
                                    className={!tokenList ? 'btn btn-warning' : 'btn btn-success'}
                                    disabled={!tokenList}
                                    style={!tokenList ? { pointerEvents: 'none' } : {}}
                                >
                                    Send Token
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="text-danger">
                        {isErrorOccured ? (
                            <>
                                <hr />
                                {errorMsg}
                            </>
                        ) : (
                            <></>
                        )}

                        {success ? (
                            <>
                                <hr />
                                <div className="alert alert-success" role="alert">
                                    Transaction signature: {''}
                                    <a
                                        style={{ wordWrap: 'break-word' }}
                                        href={`https://explorer.solana.com/tx/${signature}?cluster=${networkConfiguration}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {signature}
                                    </a>
                                </div>
                            </>
                        ) : (
                            <></>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
