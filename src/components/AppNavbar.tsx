import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

import styles from '../styles/Home.module.css';

type AppNavbarProps = {
  balanceLabel: string;
};

export function AppNavbar({ balanceLabel }: AppNavbarProps) {
  return (
    <header className={styles.topNav}>
      <div className={styles.topNavInner}>
        <div className={styles.topNavLeft}>
          <Link className={styles.topNavBrandLink} href="/">
            <span className={styles.topNavTitle}>pUSD Wrapper</span>
          </Link>
        </div>
        <div className={styles.topNavRight}>
          <div className={styles.topNavBalanceWrap}>
            <div className={`${styles.topNavTab} ${styles.topNavCashTab}`}>
              <span className={styles.topNavTabText}>Balance</span>
              <span className={styles.topNavTabValue}>{balanceLabel}</span>
            </div>
            <span className={styles.topNavBalanceTooltip}>Your pUSD balance on Polygon</span>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
