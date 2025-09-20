import React, { createContext, useContext, useState, useEffect } from "react";
import { useCurrentWallet, useWallets, ConnectButton } from "@mysten/dapp-kit";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  network: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    // 에러를 던지지 않고 기본값을 반환
    return {
      isConnected: false,
      address: null,
      connect: async () => {},
      disconnect: async () => {},
      network: "sui:testnet",
    };
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  try {
    const currentWallet = useCurrentWallet();
    const wallets = useWallets();
    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
      if (
        currentWallet?.isConnected &&
        currentWallet?.currentWallet?.accounts?.[0]?.address
      ) {
        setAddress(currentWallet.currentWallet.accounts[0].address);
      } else {
        setAddress(null);
      }
    }, [currentWallet]);

    const connect = async () => {
      try {
        // 사용 가능한 지갑이 있는지 확인
        if (wallets.length === 0) {
          alert("사용 가능한 지갑이 없습니다. Sui 지갑을 설치해주세요.");
          return;
        }

        // 첫 번째 지갑 선택 및 연결
        const wallet = wallets[0];

        // 지갑 객체의 메서드들을 확인
        console.log("Wallet object:", wallet);
        console.log("Available methods:", Object.keys(wallet));

        if (wallet) {
          // 다양한 연결 방법 시도
          if (typeof wallet.connect === "function") {
            await wallet.connect();
          } else if (typeof wallet.request === "function") {
            await wallet.request({ method: "connect" });
          } else if (typeof wallet.accounts === "function") {
            // 이미 연결된 상태일 수 있음
            console.log("Wallet might already be connected");
          } else {
            console.error("지갑 연결 메서드를 찾을 수 없습니다");
            alert(
              "지갑 연결에 실패했습니다. 지갑이 설치되어 있는지 확인해주세요."
            );
          }
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        alert("지갑 연결 중 오류가 발생했습니다.");
      }
    };

    const disconnect = async () => {
      try {
        if (
          currentWallet?.isConnected &&
          currentWallet?.currentWallet?.disconnect
        ) {
          await currentWallet.currentWallet.disconnect();
        } else {
          console.warn("Disconnect method not available");
        }
      } catch (error) {
        console.error("Failed to disconnect wallet:", error);
      }
    };

    const value: WalletContextType = {
      isConnected: currentWallet?.isConnected || false,
      address,
      connect,
      disconnect,
      network: "sui:testnet",
    };

    return (
      <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
    );
  } catch (error) {
    console.error("WalletProvider error:", error);
    // 에러가 발생해도 기본값으로 앱이 계속 작동하도록
    const defaultValue: WalletContextType = {
      isConnected: false,
      address: null,
      connect: async () => {},
      disconnect: async () => {},
      network: "sui:testnet",
    };

    return (
      <WalletContext.Provider value={defaultValue}>
        {children}
      </WalletContext.Provider>
    );
  }
};
