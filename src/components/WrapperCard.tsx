import styles from '../styles/Wrap.module.css';

type WrapperCardProps = {
  amount: string;
  numericAmount: number;
  usdcLabel: string;
  pUsdLabel: string;
  status: string;
  lastTxHash: string;
  canWrap: boolean;
  wrapCtaLabel: string;
  onAmountChange: (value: string) => void;
  onApplyPreset: (numerator: bigint, denominator: bigint) => void;
  onSetMax: () => void;
  onWrap: () => void;
};

export function WrapperCard({
  amount,
  numericAmount,
  usdcLabel,
  pUsdLabel,
  status,
  lastTxHash,
  canWrap,
  wrapCtaLabel,
  onAmountChange,
  onApplyPreset,
  onSetMax,
  onWrap,
}: WrapperCardProps) {
  return (
    <section className={styles.wrapperCard}>
      <p className={styles.formTitle}>Wrap USDC.e to pUSD</p>
      <div className={styles.formShell}>
        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <p className={styles.panelLabel}>Pay with</p>
            <div className={styles.quickActions}>
              <button className={styles.quickActionButton} onClick={() => onApplyPreset(BigInt(1), BigInt(4))} type="button">25%</button>
              <button className={styles.quickActionButton} onClick={() => onApplyPreset(BigInt(1), BigInt(2))} type="button">50%</button>
              <button className={styles.quickActionButton} onClick={() => onApplyPreset(BigInt(3), BigInt(4))} type="button">75%</button>
              <button className={styles.quickActionButton} onClick={onSetMax} type="button">Max</button>
            </div>
          </div>
          <div className={styles.panelBody}>
            <input
              className={styles.amountInput}
              id="wrap-amount-input"
              min="0"
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={amount}
            />
            <div className={styles.tokenColumn}>
              <button className={styles.tokenSelector} type="button">
                USDC.e <span>▾</span>
              </button>
              <p className={styles.tokenBalance}>{usdcLabel} USDC.e</p>
            </div>
          </div>
          <p className={styles.subValue}>${numericAmount > 0 ? numericAmount.toFixed(2) : '0.00'}</p>
        </div>

        <div className={styles.dividerWrap}>
          <button className={styles.dividerButton} type="button">↓</button>
        </div>

        <div className={`${styles.panel} ${styles.panelReceive}`}>
          <div className={styles.panelTop}>
            <p className={styles.panelLabel}>Receive</p>
          </div>
          <div className={styles.panelBody}>
            <p className={styles.receiveValue}>{numericAmount > 0 ? numericAmount.toFixed(4) : '—'}</p>
            <div className={styles.tokenColumn}>
              <button className={styles.tokenSelector} type="button">
                pUSD <span>▾</span>
              </button>
              <p className={styles.tokenBalance}>{pUsdLabel} pUSD</p>
            </div>
          </div>
          <p className={styles.subValue}>${numericAmount > 0 ? numericAmount.toFixed(2) : '0.00'}</p>
        </div>

        <div className={styles.actionRow}>
          <button className={styles.wrapButton} disabled={!canWrap} onClick={onWrap} type="button">
            {wrapCtaLabel}
          </button>
        </div>
      </div>
      {status ? <p className={styles.statusText}>{status}</p> : null}
      {lastTxHash ? (
        <a className={styles.txLink} href={`https://polygonscan.com/tx/${lastTxHash}`} rel="noreferrer" target="_blank">
          View last wrap tx ↗
        </a>
      ) : null}
    </section>
  );
}
