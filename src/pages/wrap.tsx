import type { NextPage } from 'next';
import Head from 'next/head';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPublicClient, erc20Abi, formatUnits, http, maxUint256, parseUnits } from 'viem';
import { polygon } from 'viem/chains';
import { useAccount, useWalletClient, useWriteContract } from 'wagmi';

import { AppNavbar } from '../components/AppNavbar';
import { WrapperCard } from '../components/WrapperCard';
import { POLYMARKET_CONTRACTS } from '../lib/clob';
import styles from '../styles/Wrap.module.css';

const POLYGON_RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com';
const POLYGON_CHAIN_HEX = '0x89';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://p-usd-wrapper.vercel.app').replace(/\/+$/, '');
const PAGE_TITLE = 'pUSD Wrapper';
const PAGE_DESCRIPTION = 'Wrap USDC.e to pUSD on Polygon with a simple wallet-connected flow for balances, approvals, and wrapping.';
const SOCIAL_IMAGE_URL = `${APP_URL}/og-image-v3.png`;
const CANONICAL_URL = APP_URL;
const PAGE_KEYWORDS = [
  'wrap USDC.e to pUSD',
  'pUSD wrapper',
  'Polymarket pUSD',
  'USDC.e to pUSD',
  'Polygon pUSD',
  'wrap USDC on Polygon',
].join(', ');
const FAQ_ITEMS = [
  {
    question: 'How do I wrap USDC.e to pUSD?',
    answer:
      'Connect your wallet, enter a USDC.e amount, approve the collateral onramp when prompted, and confirm the wrap transaction on Polygon.',
  },
  {
    question: 'Why is the Wrap button disabled?',
    answer:
      'The Wrap button is enabled only when your wallet is connected and your entered amount is greater than zero and less than or equal to your USDC.e balance.',
  },
  {
    question: 'Which network does PolyWrap use?',
    answer: 'PolyWrap runs on Polygon and wraps USDC.e into pUSD using the Polymarket collateral onramp contract.',
  },
];
const USDC_E_ADDRESS = POLYMARKET_CONTRACTS.usdcE as `0x${string}`;
const PUSD_ADDRESS = POLYMARKET_CONTRACTS.collateral as `0x${string}`;
const ONRAMP_ADDRESS = POLYMARKET_CONTRACTS.collateralOnramp as `0x${string}`;
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/AlvaroLuken/pUSD-Wrapper';
const X_URL = process.env.NEXT_PUBLIC_X_URL || 'https://x.com/punk6068';
const ONRAMP_ABI = [{
  name: 'wrap',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: '_asset', type: 'address' },
    { name: '_to', type: 'address' },
    { name: '_amount', type: 'uint256' },
  ],
  outputs: [],
}] as const;

type ThemeMode = 'light' | 'dark';

const formatToken = (value: bigint) => Number(formatUnits(value, 6)).toFixed(4);

function getErrorMetadata(error: unknown): { message: string; code?: number } {
  if (error && typeof error === 'object') {
    const asAny = error as { message?: string; code?: number; cause?: unknown };
    if (typeof asAny.message === 'string') {
      return { message: asAny.message, code: asAny.code };
    }
    if (asAny.cause) return getErrorMetadata(asAny.cause);
  }
  return { message: String(error) };
}

function toWrapStatusMessage(error: unknown, stage: 'approve' | 'wrap' | 'switch-network' | 'prepare'): string {
  const { message, code } = getErrorMetadata(error);
  const lower = message.toLowerCase();

  if (
    code === 4001 ||
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('rejected the request')
  ) {
    if (stage === 'switch-network') return 'Network switch cancelled in wallet. No transaction was sent.';
    if (stage === 'approve') return 'Approval cancelled in wallet. Wrap was not started.';
    if (stage === 'wrap') return 'Wrap transaction cancelled in wallet. No changes were made.';
    return 'Transaction cancelled in wallet. No changes were made.';
  }

  if (lower.includes('insufficient funds')) {
    return 'Insufficient MATIC for gas or token balance too low for this transaction.';
  }

  if (lower.includes('execution reverted') || lower.includes('revert')) {
    return 'Transaction reverted on-chain. Please verify amount, allowance, and network.';
  }

  return `Wrap failed: ${message}`;
}

const WrapPage: NextPage = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const walletAddress = walletClient?.account?.address ?? address;
  const polygonReadClient = useMemo(
    () => createPublicClient({ chain: polygon, transport: http(POLYGON_RPC_URL) }),
    [],
  );

  const [amount, setAmount] = useState('10');
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [pUsdBalance, setPUsdBalance] = useState<bigint>(BigInt(0));
  const [onrampAllowance, setOnrampAllowance] = useState<bigint>(BigInt(0));
  const [status, setStatus] = useState('');
  const [isWrapping, setIsWrapping] = useState(false);
  const [lastTxHash, setLastTxHash] = useState('');
  const [theme, setTheme] = useState<ThemeMode>('dark');

  const numericAmount = Number(amount) || 0;
  const wrapAmountRaw = useMemo(() => {
    if (!amount || Number(amount) <= 0) return BigInt(0);
    try {
      return parseUnits(amount, 6);
    } catch {
      return BigInt(0);
    }
  }, [amount]);
  const usdcLabel = formatToken(usdcBalance);
  const pUsdLabel = formatToken(pUsdBalance);
  const hasSufficientUsdc = wrapAmountRaw > BigInt(0) && usdcBalance >= wrapAmountRaw;
  const isReadyToWrap = Boolean(walletAddress && hasSufficientUsdc && !isWrapping);
  const canWrap = isReadyToWrap;
  const showInsufficientBalanceHint = Boolean(
    walletAddress
      && !isWrapping
      && wrapAmountRaw > BigInt(0)
      && !hasSufficientUsdc,
  );
  const navBalanceLabel = walletAddress ? pUsdLabel : 'Connect wallet';
  const wrapCtaLabel = (() => {
    if (!walletAddress) return 'Connect wallet';
    if (isWrapping) return 'Wrapping...';
    return 'Wrap';
  })();

  const toInputAmount = (value: bigint) => {
    const raw = formatUnits(value, 6);
    if (!raw.includes('.')) return raw;
    const normalized = raw.replace(/\.?0+$/, '');
    return normalized.length > 0 ? normalized : '0';
  };
  const applyPreset = (numerator: bigint, denominator: bigint) => {
    const next = denominator === BigInt(0) ? BigInt(0) : (usdcBalance * numerator) / denominator;
    setAmount(toInputAmount(next));
  };
  const setMax = () => setAmount(toInputAmount(usdcBalance));

  const refreshBalances = useCallback(async () => {
    if (!walletAddress) {
      setUsdcBalance(BigInt(0));
      setPUsdBalance(BigInt(0));
      setOnrampAllowance(BigInt(0));
      return;
    }
    const [usdcRaw, pUsdRaw, allowanceRaw] = await Promise.all([
      polygonReadClient.readContract({
        address: USDC_E_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      }) as Promise<bigint>,
      polygonReadClient.readContract({
        address: PUSD_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      }) as Promise<bigint>,
      polygonReadClient.readContract({
        address: USDC_E_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [walletAddress, ONRAMP_ADDRESS],
      }) as Promise<bigint>,
    ]);
    setUsdcBalance(usdcRaw);
    setPUsdBalance(pUsdRaw);
    setOnrampAllowance(allowanceRaw);
  }, [walletAddress, polygonReadClient]);

  useEffect(() => {
    void refreshBalances();
  }, [refreshBalances]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem('pusd-wrapper-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
      return;
    }
    const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    setTheme(preferredTheme);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pusd-wrapper-theme', theme);
    }
  }, [theme]);

  const wrap = async () => {
    if (!walletClient || !walletAddress || numericAmount <= 0) return;
    let stage: 'approve' | 'wrap' | 'switch-network' | 'prepare' = 'prepare';
    try {
      setLastTxHash('');
      const wrapAmount = parseUnits(String(numericAmount), 6);
      if (usdcBalance < wrapAmount) {
        setStatus('Insufficient USDC.e balance for this wrap amount.');
        return;
      }
      setIsWrapping(true);
      setStatus('Preparing transactions...');
      const chainId = await walletClient.getChainId();
      if (chainId !== polygon.id) {
        stage = 'switch-network';
        await walletClient.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: POLYGON_CHAIN_HEX }] });
      }
      if (onrampAllowance < wrapAmount) {
        stage = 'approve';
        setStatus('Approving Collateral Onramp...');
        const approvalHash = await writeContractAsync({
          address: USDC_E_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [ONRAMP_ADDRESS, maxUint256],
          chain: polygon,
        });
        await polygonReadClient.waitForTransactionReceipt({ hash: approvalHash, pollingInterval: 2000, timeout: 180_000 });
      }
      stage = 'wrap';
      setStatus('Wrapping USDC.e -> pUSD...');
      const wrapHash = await writeContractAsync({
        address: ONRAMP_ADDRESS,
        abi: ONRAMP_ABI,
        functionName: 'wrap',
        args: [USDC_E_ADDRESS, walletAddress, wrapAmount],
        chain: polygon,
      });
      await polygonReadClient.waitForTransactionReceipt({ hash: wrapHash, pollingInterval: 2000, timeout: 180_000 });
      setLastTxHash(wrapHash);
      await refreshBalances();
      setStatus('Wrap complete. Your pUSD balance is updated.');
    } catch (error) {
      console.error('[Wrap Flow] Transaction failure', {
        stage,
        walletAddress,
        amount,
        error,
        metadata: getErrorMetadata(error),
      });
      setStatus(toWrapStatusMessage(error, stage));
    } finally {
      setIsWrapping(false);
    }
  };

  return (
    <div>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta content={PAGE_DESCRIPTION} name="description" />
        <meta content={PAGE_KEYWORDS} name="keywords" />
        <meta content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" name="robots" />
        <meta content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" name="googlebot" />
        <link href={CANONICAL_URL} rel="canonical" />
        <meta content={PAGE_TITLE} property="og:title" />
        <meta content={PAGE_DESCRIPTION} property="og:description" />
        <meta content="website" property="og:type" />
        <meta content={CANONICAL_URL} property="og:url" />
        <meta content="PolyWrap" property="og:site_name" />
        <meta content="en_US" property="og:locale" />
        <meta content={SOCIAL_IMAGE_URL} property="og:image" />
        <meta content="1200" property="og:image:width" />
        <meta content="630" property="og:image:height" />
        <meta content="pUSD Wrapper social preview" property="og:image:alt" />
        <meta content="summary_large_image" name="twitter:card" />
        <meta content={PAGE_TITLE} name="twitter:title" />
        <meta content={PAGE_DESCRIPTION} name="twitter:description" />
        <meta content={SOCIAL_IMAGE_URL} name="twitter:image" />
        <meta content="pUSD Wrapper social preview" name="twitter:image:alt" />
        <meta content="#2f62ff" name="theme-color" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'PolyWrap',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web',
              description: PAGE_DESCRIPTION,
              url: CANONICAL_URL,
              image: SOCIAL_IMAGE_URL,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              featureList: [
                'Wrap USDC.e to pUSD on Polygon',
                'Wallet-connected balances and allowance checks',
                'On-chain approval and wrap transaction flow',
              ],
            }),
          }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQ_ITEMS.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: item.answer,
                },
              })),
            }),
          }}
          type="application/ld+json"
        />
      </Head>
      <div>
        <AppNavbar balanceLabel={navBalanceLabel} />
        <main className={styles.page}>
          <WrapperCard
            amount={amount}
            canWrap={canWrap}
            isReadyToWrap={isReadyToWrap}
            lastTxHash={lastTxHash}
            numericAmount={numericAmount}
            onAmountChange={setAmount}
            onApplyPreset={applyPreset}
            onSetMax={setMax}
            onWrap={() => void wrap()}
            pUsdLabel={pUsdLabel}
            status={status}
            showInsufficientBalanceHint={showInsufficientBalanceHint}
            usdcLabel={usdcLabel}
            wrapCtaLabel={wrapCtaLabel}
          />
        </main>
        <button
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className={styles.floatingThemeToggle}
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          type="button"
        >
          <span aria-hidden="true" className={styles.toggleIcon}>
            {theme === 'dark' ? '☀' : '🌙'}
          </span>
          <span className={styles.toggleLabel}>Theme</span>
        </button>
        <div className={styles.floatingSocialGroup}>
          <a
            aria-label="Open GitHub repository"
            className={styles.floatingGithubLink}
            href={GITHUB_URL}
            rel="noreferrer"
            target="_blank"
            title="GitHub repository"
          >
            <svg aria-hidden="true" height="20" viewBox="0 0 16 16" width="20">
              <path
                d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.49-2.7-1.08-2.7-1.08-.37-.93-.9-1.18-.9-1.18-.73-.5.06-.49.06-.49.81.06 1.24.83 1.24.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.5-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.09.16 1.9.08 2.1.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48v2.2c0 .21.14.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                fill="currentColor"
              />
            </svg>
          </a>
          <a
            aria-label="Open X profile"
            className={styles.floatingXLink}
            href={X_URL}
            rel="noreferrer"
            target="_blank"
            title="X profile"
          >
            <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
              <path
                d="M18.9 2h3.68l-8.04 9.19L24 22h-7.41l-5.8-7.58L4.16 22H.48l8.6-9.83L0 2h7.6l5.25 6.92L18.9 2Zm-1.29 17.8h2.04L6.49 4.1H4.3L17.61 19.8Z"
                fill="currentColor"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default WrapPage;
