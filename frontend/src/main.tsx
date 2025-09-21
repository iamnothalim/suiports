"use client";

import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  Zap,
  BarChart3,
  Video,
  MessageSquare,
  Share,
  ChevronLeft,
  ChevronRight,
  X,
  Target,
  Settings,
} from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNews } from "./hooks/useNews";
import { useCommunityPosts } from "./hooks/useCommunity";
import { useAllStandings } from "./hooks/useStandings";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
// import { useWallet } from "./contexts/WalletContext";
import {
  ConnectButton,
  useCurrentWallet,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import LoginModal from "./components/LoginModal";
import CreatePredictionModal from "./components/CreatePredictionModal";
import "./index.css";

const queryClient = new QueryClient();

// Sui 컨트랙트 상수
const PACKAGE_ID =
  "0x3ebdf40d077027d2505d78c57c944d8c6dd1613c9d4826adfbc53d23ca2e4fc5";
const REGISTRY_ID =
  "0xd7016b5632331c9ddee6d76a7d5b1b8cffe667e69be411bfb4720dfb851219f9";

const navItems = [
  { id: "breaking", label: "Live Feed", icon: Zap },
  { id: "stats", label: "Ranking", icon: BarChart3 },
  { id: "videos", label: "Videos", icon: Video },
  { id: "community", label: "Discussion", icon: MessageSquare },
  { id: "prediction", label: "Predict Marketplace", icon: Target },
  { id: "admin", label: "Admin", icon: Settings },
];

const leagues = [
  { id: "premier", name: "Premier League" },
  { id: "laliga", name: "La Liga" },
  { id: "bundesliga", name: "Bundesliga" },
  { id: "seriea", name: "Serie A" },
  { id: "ligue1", name: "Ligue 1" },
];

const getRandomColor = (name: string) => {
  const colors = [
    { name: "bg-red-500", bgColor: "bg-red-500" },
    { name: "bg-blue-500", bgColor: "bg-blue-500" },
    { name: "bg-green-500", bgColor: "bg-green-500" },
    { name: "bg-yellow-500", bgColor: "bg-yellow-500" },
    { name: "bg-purple-500", bgColor: "bg-purple-500" },
    { name: "bg-pink-500", bgColor: "bg-pink-500" },
    { name: "bg-indigo-500", bgColor: "bg-indigo-500" },
    { name: "bg-teal-500", bgColor: "bg-teal-500" },
    { name: "bg-orange-500", bgColor: "bg-orange-500" },
    { name: "bg-cyan-500", bgColor: "bg-cyan-500" },
  ];
  const index =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
};

export default function SportsNewsApp() {
  const [activeTab, setActiveTab] = useState("breaking");
  const [selectedLeague, setSelectedLeague] = useState("premier");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreatePredictionModal, setShowCreatePredictionModal] =
    useState(false);
  const [bettingCard, setBettingCard] = useState<any>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const [stickyDate, setStickyDate] = useState("2025-08-12");
  const [statsTab, setStatsTab] = useState("team");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [predictionScores, setPredictionScores] = useState<any[]>([]);
  const [isBatchScoring, setIsBatchScoring] = useState(false);
  const [scoringProgress, setScoringProgress] = useState(0);
  const [scoringStatus, setScoringStatus] = useState("");
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [showSelectionResult, setShowSelectionResult] = useState(false);
  const [rejectedPredictions, setRejectedPredictions] = useState<any[]>([]);
  const [poolInfos, setPoolInfos] = useState<Record<string, any>>({});
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [selectedBettingPrediction, setSelectedBettingPrediction] =
    useState<any>(null);
  const [selectedBettingOption, setSelectedBettingOption] =
    useState<string>("");
  const [bettingAmount, setBettingAmount] = useState<string>("");
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [userBets, setUserBets] = useState<
    Record<string, { option: string; amount: number; timestamp: number }>
  >({});
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedEndPrediction, setSelectedEndPrediction] = useState<any>(null);
  const [selectedWinningOption, setSelectedWinningOption] =
    useState<string>("");

  // 인증 상태
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;

  // 지갑 상태 (직접 사용)
  const currentWallet = useCurrentWallet();
  const isConnected = currentWallet?.isConnected || false;
  const address = currentWallet?.currentWallet?.accounts?.[0]?.address || null;

  // Sui 클라이언트 및 트랜잭션 훅
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Sui 컨트랙트 createMatch 함수
  const createMatch = async (params: {
    registryId: string;
    creator: string; // 경기 생성자 주소
    optionLabels: string[]; // 예: ["Will Transfer","Will Not Transfer"]
    closeTimeMs: bigint | number;
    feeBps: number; // 0~10000
  }) => {
    console.log("createMatch 함수 호출됨, 파라미터:", params);
    const { registryId, creator, optionLabels, closeTimeMs, feeBps } = params;
    const tx = new Transaction();

    const encoder = new TextEncoder();
    const labelsBytes: number[][] = optionLabels.map((s) =>
      Array.from(encoder.encode(s))
    ); // Array<number[]>

    tx.moveCall({
      target: `${PACKAGE_ID}::suiports::create_match`,
      arguments: [
        tx.object(registryId), // &mut Registry (소유 필요)
        tx.pure.address(creator), // creator 주소
        // vector<vector<u8>> 로 정확히 전달: 요소 타입을 vector<u8>로 지정
        tx.pure.vector("vector<u8>", labelsBytes),
        tx.pure.u64(BigInt(closeTimeMs)),
        tx.pure.u16(feeBps),
      ],
    });

    console.log("트랜잭션 실행 시작...");
    const res = await signAndExecute({
      transaction: tx,
      chain: "sui:testnet",
    });
    console.log("트랜잭션 실행 완료:", res);

    // Pool ID 찾기 (Shared Object로 생성됨)
    const tryFindPoolId = async (): Promise<string | null> => {
      try {
        console.log("Pool ID 검색 시작, digest:", res.digest);
        const effects = await client.waitForTransaction({
          digest: res.digest,
          options: { showEffects: true, showObjectChanges: true },
        });
        const changes = effects.objectChanges ?? [];
        console.log("객체 변경사항:", changes);

        // shared 객체에서 Pool 찾기
        const shared = changes.find(
          (ch: any) =>
            ch.type === "transferred" &&
            typeof ch.objectType === "string" &&
            ch.objectType.includes("::suiports::Pool")
        );
        if (shared?.objectId) {
          console.log("transferred에서 Pool ID 찾음:", shared.objectId);
          return shared.objectId;
        }

        // created에서도 찾기
        const created = changes.find(
          (ch: any) =>
            ch.type === "created" &&
            typeof ch.objectType === "string" &&
            ch.objectType.includes("::suiports::Pool")
        );
        if (created) {
          console.log("created에서 Pool ID 찾음:", created.objectId);
          return created.objectId;
        }

        console.log("Pool ID를 찾을 수 없음");
        return null;
      } catch {
        return null;
      }
    };

    let poolId: string | null = null;
    for (let i = 0; i < 10 && !poolId; i++) {
      console.log(`Pool ID 검색 시도 ${i + 1}/10`);
      poolId = await tryFindPoolId();
      if (!poolId) {
        console.log("Pool ID를 찾지 못함, 500ms 대기 후 재시도...");
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log("최종 Pool ID:", poolId);
    return { digest: res.digest, poolId };
  };

  // Sui 컨트랙트 get_pool_info 함수
  const getPoolInfo = async (poolId: string) => {
    try {
      console.log("Pool 정보 조회 시작, Pool ID:", poolId);

      const result = await client.getObject({
        id: poolId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      console.log("Pool 정보 조회 결과:", result);

      if (result.data?.content && "fields" in result.data.content) {
        const fields = result.data.content.fields;

        // Pool 정보 파싱
        const poolInfo = {
          poolId: poolId,
          matchId: fields.match_id || "",
          closeTimeMs: fields.close_time_ms
            ? parseInt(fields.close_time_ms)
            : 0,
          totals: fields.totals
            ? fields.totals.map((total: any) => parseInt(total))
            : [0, 0],
          optionLabels: fields.option_labels || [],
          feeBps: fields.fee_bps ? parseInt(fields.fee_bps) : 0,
          creator: fields.creator || "",
          registry: fields.registry || "",
          resultIdx: fields.result_idx ? parseInt(fields.result_idx) : -1,
        };

        console.log("파싱된 Pool 정보:", poolInfo);
        console.log(
          "result_idx 값:",
          poolInfo.resultIdx,
          "타입:",
          typeof poolInfo.resultIdx
        );
        return poolInfo;
      } else {
        console.error("Pool 정보를 찾을 수 없습니다:", result);
        return null;
      }
    } catch (error) {
      console.error("Pool 정보 조회 오류:", error);
      return null;
    }
  };

  // 예측 이벤트 로드 함수 (백엔드 API 사용)
  const loadPredictions = async () => {
    try {
      const token = localStorage.getItem("access_token");

      // Admin인 경우 모든 예측, 일반 사용자인 경우 approved와 completed 상태 로드
      const endpoint = user?.is_admin
        ? "http://localhost:8000/api/v1/predictions/"
        : "http://localhost:8000/api/v1/predictions/approved";

      const headers: any = {
        "Content-Type": "application/json",
      };

      // Admin인 경우에만 토큰 필요
      if (user?.is_admin && token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, { headers });

      if (response.ok) {
        const data = await response.json();
        setPredictions(data);
        console.log("백엔드에서 예측 이벤트 로드 성공:", data);

        // Pool 정보도 함께 로드
        await loadPoolInfos(data);

        // 베팅 정보 초기화 후 로드
        setUserBets({});

        // 로그인한 사용자이면 베팅 정보도 로드
        if (isLoggedIn && user?.id) {
          await loadUserBets(user.id);
        }
      } else {
        console.error("예측 이벤트 로드 실패:", response.status);
        setPredictions([]);
      }
    } catch (error) {
      console.error("예측 이벤트 로드 오류:", error);
      setPredictions([]);
    }
  };

  // Pool 정보 직접 확인 함수 (디버깅용)
  const checkPoolResult = async (poolId: string) => {
    try {
      console.log("=== Pool Result 확인 시작 ===");
      const poolInfo = await getPoolInfo(poolId);
      console.log("Pool Info:", poolInfo);
      console.log("result_idx:", poolInfo?.resultIdx);
      console.log("=== Pool Result 확인 완료 ===");
      return poolInfo;
    } catch (error) {
      console.error("Pool Result 확인 오류:", error);
      return null;
    }
  };

  // 전역 함수로 노출 (디버깅용)
  (window as any).checkPoolResult = checkPoolResult;
  (window as any).clearUserBets = () => setUserBets({});

  // Pool 정보 로드 함수
  const loadPoolInfos = async (predictions: any[]) => {
    const poolInfoPromises = predictions
      .filter((prediction) => prediction.pool_id)
      .map(async (prediction) => {
        try {
          const poolInfo = await getPoolInfo(prediction.pool_id);
          return { predictionId: prediction.id, poolInfo };
        } catch (error) {
          console.error(
            `Pool 정보 로드 실패 (ID: ${prediction.pool_id}):`,
            error
          );
          return { predictionId: prediction.id, poolInfo: null };
        }
      });

    const results = await Promise.all(poolInfoPromises);

    const newPoolInfos: Record<string, any> = {};
    results.forEach(({ predictionId, poolInfo }) => {
      if (poolInfo) {
        newPoolInfos[predictionId] = poolInfo;
      }
    });

    setPoolInfos(newPoolInfos);
    console.log("Pool 정보 로드 완료:", newPoolInfos);
  };

  // 사용자 베팅 정보 로드 함수
  const loadUserBets = async (userId: number) => {
    try {
      console.log("사용자 베팅 정보 로드 시작, User ID:", userId);

      // 베팅 정보 초기화
      setUserBets({});

      const response = await fetch(
        `http://localhost:8000/api/v1/bets/user-bets-summary/${userId}`
      );

      if (response.ok) {
        const betsData = await response.json();
        console.log("사용자 베팅 정보 로드 성공:", betsData);

        // 베팅 정보를 userBets 상태에 저장
        setUserBets(betsData);
      } else {
        console.error("베팅 정보 로드 실패:", response.status);
        setUserBets({});
      }
    } catch (error) {
      console.error("베팅 정보 로드 오류:", error);
      setUserBets({});
    }
  };

  // USDC 잔고 조회 함수
  const getUsdcBalance = async (address: string) => {
    try {
      console.log("USDC 잔고 조회 시작, 주소:", address);

      // 모든 코인 잔액에서 USDC 타입을 탐색 (패키지 주소 변경에 대응)
      const balances = await client.getAllBalances({ owner: address });
      console.log("모든 코인 잔액:", balances);

      const usdc = balances.find((b) =>
        b.coinType.toLowerCase().includes("::usdc::usdc")
      );

      if (!usdc) {
        console.log("USDC를 찾을 수 없습니다.");
        setUsdcBalance(0);
        return 0;
      }

      console.log("USDC 잔액 정보:", usdc);

      // 메타데이터로 소수점 자리 확인
      const meta = await client.getCoinMetadata({ coinType: usdc.coinType });
      console.log("USDC 메타데이터:", meta);

      const decimals = meta?.decimals ?? 6;
      console.log("USDC decimals:", decimals);
      console.log("USDC totalBalance (raw):", usdc.totalBalance);

      // 만약 지갑에서 이미 USDC 단위로 표시된다면 (decimals가 0이거나 매우 작은 값)
      // 그대로 사용, 아니면 decimals로 나누기
      const balance = usdc.totalBalance
        ? decimals === 0
          ? parseFloat(usdc.totalBalance)
          : parseInt(usdc.totalBalance) / Math.pow(10, decimals)
        : 0;

      setUsdcBalance(balance);
      console.log("최종 USDC 잔고:", balance);

      return balance;
    } catch (error) {
      console.error("USDC 잔고 조회 오류:", error);
      setUsdcBalance(0);
      return 0;
    }
  };

  // 베팅 옵션 클릭 핸들러
  const handleBettingOptionClick = async (prediction: any, option: string) => {
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      setShowLoginModal(true);
      return;
    }

    if (!isConnected || !address) {
      alert("지갑을 연결해주세요.");
      return;
    }

    console.log("베팅 옵션 클릭:", { prediction, option });

    // 선택된 베팅 정보 설정
    setSelectedBettingPrediction(prediction);
    setSelectedBettingOption(option);
    setBettingAmount("");

    // USDC 잔고 조회
    await getUsdcBalance(address);

    // 베팅 모달 열기
    setShowBettingModal(true);
  };

  // USDC 타입 감지 함수
  const detectUsdcType = async (owner: string): Promise<string> => {
    const balances = await client.getAllBalances({ owner });
    const usdc = balances.find((b) =>
      b.coinType.toLowerCase().includes("::usdc::usdc")
    );
    if (!usdc)
      throw new Error(
        "USDC 코인을 보유하고 있지 않거나 타입을 찾을 수 없습니다."
      );
    return usdc.coinType;
  };

  // Sui 컨트랙트 place_bet 함수
  const placeBet = async (params: {
    poolId: string;
    optionIdx: number; // 0 또는 1 (option_a 또는 option_b)
    amount: number; // USDC 단위
  }) => {
    try {
      console.log("place_bet 함수 호출됨, 파라미터:", params);
      const { poolId, optionIdx, amount } = params;

      if (!address) throw new Error("지갑이 연결되어 있지 않습니다.");

      // USDC 타입 감지
      const usdcType = await detectUsdcType(address);
      console.log("USDC 타입:", usdcType);

      // 보유 USDC 코인 조회 (필요 시 병합)
      const coins = await client.getCoins({
        owner: address,
        coinType: usdcType,
      });
      if ((coins.data?.length ?? 0) === 0)
        throw new Error("USDC 코인을 보유하고 있지 않습니다.");

      // USDC를 USDC 단위에서 최소 단위로 변환
      const usdcAmount = Math.floor(amount * 1000000); // 6자리 소수점
      const need = BigInt(usdcAmount);

      const primaryId = coins.data[0].coinObjectId;
      let total: bigint = BigInt(coins.data[0].balance);
      const toMerge: string[] = [];

      for (let i = 1; total < need && i < coins.data.length; i++) {
        toMerge.push(coins.data[i].coinObjectId);
        total += BigInt(coins.data[i].balance);
      }

      if (total < need) throw new Error("USDC 잔액이 부족합니다.");

      const tx = new Transaction();

      // 필요시 코인 병합
      if (toMerge.length > 0) {
        tx.mergeCoins(
          tx.object(primaryId),
          toMerge.map((id) => tx.object(id))
        );
      }

      // 베팅할 코인 분할
      const [stake] = tx.splitCoins(tx.object(primaryId), [tx.pure.u64(need)]);

      tx.moveCall({
        target: `${PACKAGE_ID}::suiports::place_bet`,
        arguments: [
          tx.object(poolId), // &mut Pool
          tx.pure.u16(optionIdx), // 옵션 인덱스 (u16 타입)
          stake, // 분할된 코인
          tx.pure.u64(BigInt(Date.now())), // 타임스탬프
        ],
      });

      console.log("place_bet 트랜잭션 실행 시작...");
      const res = await signAndExecute({
        transaction: tx,
        chain: "sui:testnet",
      });
      console.log("place_bet 트랜잭션 실행 완료:", res);

      return { digest: res.digest, success: true };
    } catch (error) {
      console.error("place_bet 오류:", error);
      return { digest: null, success: false, error };
    }
  };

  // Sui 컨트랙트 start_match 함수
  const startMatch = async (params: {
    registryId: string;
    poolId: string;
    matchId: bigint | number;
  }) => {
    try {
      console.log("start_match 함수 호출됨, 파라미터:", params);
      const { registryId, poolId, matchId } = params;

      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::suiports::start_match`,
        arguments: [
          tx.object(registryId), // Registry 객체
          tx.object(poolId), // Pool 객체
          tx.pure.u64(BigInt(matchId)), // Match ID
        ],
      });

      console.log("start_match 트랜잭션 실행 시작...");
      const res = await signAndExecute({
        transaction: tx,
        chain: "sui:testnet",
      });
      console.log("start_match 트랜잭션 실행 완료:", res);

      // 상태 동기화를 위한 대기 시간
      console.log("상태 동기화를 위해 3초 대기...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      return { digest: res.digest, success: true };
    } catch (error) {
      console.error("start_match 오류:", error);
      return { digest: null, success: false, error };
    }
  };

  // Sui 컨트랙트 has_user_claimed 함수
  const hasUserClaimed = async (params: {
    poolId: string;
    userAddress: string;
  }) => {
    try {
      console.log("has_user_claimed 함수 호출됨, 파라미터:", params);
      const { poolId, userAddress } = params;

      const result = await client.getObject({
        id: poolId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (result.data?.content && "fields" in result.data.content) {
        const fields = result.data.content.fields;

        // Pool에서 사용자의 claim 상태 확인
        // 이 부분은 컨트랙트 구조에 따라 조정이 필요할 수 있습니다
        const claimedUsers = fields.claimed_users || [];
        const hasClaimed = claimedUsers.includes(userAddress);

        console.log("사용자 claim 상태:", hasClaimed);
        return hasClaimed;
      } else {
        console.error("Pool 정보를 찾을 수 없습니다:", result);
        return false;
      }
    } catch (error) {
      console.error("has_user_claimed 오류:", error);
      return false;
    }
  };

  // Sui 컨트랙트 claim 함수
  const claim = async (params: { poolId: string }) => {
    try {
      console.log("claim 함수 호출됨, 파라미터:", params);
      const { poolId } = params;

      if (!address) {
        throw new Error("지갑이 연결되어 있지 않습니다.");
      }

      const tx = new Transaction();
      const [payout] = tx.moveCall({
        target: `${PACKAGE_ID}::suiports::claim`,
        arguments: [tx.object(poolId)], // &mut Pool
      });
      tx.transferObjects([payout], tx.pure.address(address));

      console.log("claim 트랜잭션 실행 시작...");
      const res = await signAndExecute({
        transaction: tx,
        chain: "sui:testnet",
      });
      console.log("claim 트랜잭션 실행 완료:", res);

      return { digest: res.digest, success: true };
    } catch (error) {
      console.error("claim 오류:", error);
      return { digest: null, success: false, error };
    }
  };

  // Sui 컨트랙트 set_result 함수
  const setResult = async (params: {
    registryId: string;
    poolId: string;
    matchId: bigint | number;
    resultIdx: number; // 결과 인덱스 (0, 1, 2, ...)
  }) => {
    try {
      console.log("set_result 함수 호출됨, 파라미터:", params);
      const { registryId, poolId, matchId, resultIdx } = params;

      // u8 범위 검증 (0-255)
      if (!Number.isInteger(resultIdx) || resultIdx < 0 || resultIdx > 255) {
        throw new Error(
          `resultIdx는 0-255 사이의 정수여야 합니다. 현재값: ${resultIdx}`
        );
      }

      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::suiports::set_result`,
        arguments: [
          tx.object(registryId), // &mut Registry
          tx.object(poolId), // &mut Pool
          tx.pure.u64(BigInt(matchId)), // match_id: u64
          tx.pure.u16(resultIdx), // result_idx: u16
        ],
      });

      console.log("set_result 트랜잭션 실행 시작...");
      const res = await signAndExecute({
        transaction: tx,
        chain: "sui:testnet",
      });
      console.log("set_result 트랜잭션 실행 완료:", res);

      return { digest: res.digest, success: true };
    } catch (error) {
      console.error("set_result 오류:", error);
      return { digest: null, success: false, error };
    }
  };

  // 예측 이벤트 종료 핸들러
  const handleEndPrediction = async (prediction: any) => {
    if (!isConnected || !address) {
      alert("지갑을 연결해주세요.");
      return;
    }

    if (!prediction.pool_id) {
      alert("Pool ID가 없습니다.");
      return;
    }

    // Pool 정보 가져오기
    try {
      console.log("End Match 모달을 위해 Pool 정보 조회 중...");
      const poolInfo = await getPoolInfo(prediction.pool_id);

      if (!poolInfo) {
        alert("Pool 정보를 가져올 수 없습니다.");
        return;
      }

      console.log("Pool 정보 조회 완료:", poolInfo);

      // Pool 정보를 포함한 예측 객체로 설정
      const predictionWithPoolInfo = {
        ...prediction,
        poolInfo: poolInfo,
      };

      setSelectedEndPrediction(predictionWithPoolInfo);
      setShowResultModal(true);
    } catch (error) {
      console.error("Pool 정보 조회 오류:", error);
      alert("Pool 정보를 가져오는 중 오류가 발생했습니다.");
    }
  };

  // 결과 설정 핸들러
  const handleSetResult = async (prediction: any) => {
    if (!isConnected || !address) {
      alert("지갑을 연결해주세요.");
      return;
    }

    if (!prediction.pool_id) {
      alert("Pool ID가 없습니다.");
      return;
    }

    // Pool 정보 가져오기
    try {
      console.log("Set Result 모달을 위해 Pool 정보 조회 중...");
      const poolInfo = await getPoolInfo(prediction.pool_id);

      if (!poolInfo) {
        alert("Pool 정보를 가져올 수 없습니다.");
        return;
      }

      console.log("Pool 정보 조회 완료:", poolInfo);

      // Pool 정보를 포함한 예측 객체로 설정
      const predictionWithPoolInfo = {
        ...prediction,
        poolInfo: poolInfo,
      };

      setSelectedEndPrediction(predictionWithPoolInfo);
      setShowResultModal(true);
    } catch (error) {
      console.error("Pool 정보 조회 오류:", error);
      alert("Pool 정보를 가져오는 중 오류가 발생했습니다.");
    }
  };

  // 예측 이벤트 생성 함수
  const handleCreatePrediction = async (predictionData: any) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Login required.");
        return;
      }

      // 지갑 연결 확인
      if (!isConnected || !address) {
        alert(
          "지갑을 연결해주세요. 예측 이벤트 생성에는 지갑 연결이 필요합니다."
        );
        return;
      }

      // 지갑 주소 추가
      const predictionDataWithAddress = {
        ...predictionData,
        user_address: address,
      };

      const response = await fetch(
        "http://localhost:8000/api/v1/predictions/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(predictionDataWithAddress),
        }
      );

      if (response.ok) {
        const newPrediction = await response.json();
        setPredictions((prev) => [...prev, newPrediction]);
        alert(
          "예측 이벤트가 성공적으로 생성되었습니다! Admin 승인 후 예측 게임 탭에 표시됩니다."
        );
      } else {
        const errorData = await response.json();
        console.error("예측 이벤트 생성 실패:", errorData);
        alert(
          `예측 이벤트 생성에 실패했습니다: ${
            errorData.detail || "알 수 없는 오류"
          }`
        );
      }
    } catch (error) {
      console.error("예측 이벤트 생성 오류:", error);
      alert("예측 이벤트 생성에 실패했습니다.");
    }
  };

  // AI 점수 계산 함수
  // 기존 AI 점수들을 불러오는 함수
  const loadExistingScores = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // 모든 예측 이벤트에 대해 점수 확인
      const scores = [];
      for (const prediction of predictions) {
        try {
          const response = await fetch(
            `http://localhost:8000/api/v1/scoring/${prediction.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const score = await response.json();
            scores.push(score);
          } else if (response.status === 404) {
            // 점수가 없는 예측은 무시
            console.log(`점수가 없는 예측 ID: ${prediction.id}`);
          } else {
            console.error(
              `점수 조회 실패 - 예측 ID: ${prediction.id}, 상태: ${response.status}`
            );
          }
        } catch (error) {
          // 개별 점수 조회 오류는 무시하고 계속 진행
          console.log(`점수 조회 오류 - 예측 ID: ${prediction.id}:`, error);
        }
      }

      setPredictionScores(scores);
      console.log(`총 ${scores.length}개의 AI 점수를 로드했습니다.`);
    } catch (error) {
      console.error("기존 점수 불러오기 오류:", error);
    }
  };

  const calculateAIScore = async (predictionId: string) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Login required.");
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/v1/scoring/calculate/${predictionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const score = await response.json();
        setPredictionScores((prev) => [...prev, score]);
        alert("AI 점수 계산이 완료되었습니다!");
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        alert(
          `AI 점수 계산에 실패했습니다: ${
            errorData.detail || "알 수 없는 오류"
          }`
        );
      }
    } catch (error) {
      console.error("AI 점수 계산 오류:", error);
      alert("AI 점수 계산 중 오류가 발생했습니다.");
    }
  };

  // 일괄 AI 점수 계산 함수
  const batchCalculateAIScores = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Login required.");
        return;
      }

      setIsBatchScoring(true);
      setScoringProgress(0);
      setScoringStatus("Starting batch scoring...");

      const response = await fetch(
        "http://localhost:8000/api/v1/scoring/batch-calculate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const scores = await response.json();
        setScoringStatus(`Calculated ${scores.length} scores successfully!`);
        setScoringProgress(100);

        // 기존 점수들과 새로 계산된 점수들을 합치기
        setPredictionScores((prev) => {
          const existingIds = new Set(prev.map((s: any) => s.prediction_id));
          const newScores = scores.filter(
            (s: any) => !existingIds.has(s.prediction_id)
          );
          return [...prev, ...newScores];
        });

        setTimeout(() => {
          setIsBatchScoring(false);
          setScoringProgress(0);
          setScoringStatus("");
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error("Batch scoring failed:", errorData);
        setScoringStatus(
          `Batch scoring failed: ${errorData.detail || "Unknown error"}`
        );
        setIsBatchScoring(false);
      }
    } catch (error) {
      console.error("Batch scoring error:", error);
      setScoringStatus("Batch scoring error occurred");
      setIsBatchScoring(false);
    }
  };

  // 일괄 스코어링 및 자동 선택 함수
  const batchCalculateAndSelectBest = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Login required.");
        return;
      }

      setIsBatchScoring(true);
      setScoringProgress(0);
      setScoringStatus("Starting batch scoring and selection...");

      const response = await fetch(
        "http://localhost:8000/api/v1/scoring/batch-calculate-and-select",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setScoringStatus(
          `Completed! Selected: ${
            result.selected_prediction?.game_id || "None"
          } (Deleted: ${result.deleted_count || 0})`
        );
        setScoringProgress(100);

        if (result.selected_prediction) {
          setSelectedPrediction(result.selected_prediction);
          setShowSelectionResult(true);

          console.log("선택된 예측:", result.selected_prediction);
          console.log("지갑 연결 상태:", isConnected);
          console.log("현재 주소:", address);

          // Sui 컨트랙트에 createMatch 호출
          try {
            if (result.selected_prediction.user_address) {
              console.log(
                "user_address 존재:",
                result.selected_prediction.user_address
              );
              // deadline을 밀리초로 변환
              const deadlineDate = new Date(
                result.selected_prediction.deadline ||
                  result.selected_prediction.expires_at
              );
              const closeTimeMs = deadlineDate.getTime();

              const { digest, poolId } = await createMatch({
                registryId: REGISTRY_ID,
                creator: result.selected_prediction.user_address,
                optionLabels: [
                  result.selected_prediction.option_a,
                  result.selected_prediction.option_b,
                ],
                closeTimeMs: closeTimeMs,
                feeBps: 200,
              });

              console.log("Sui 컨트랙트 createMatch 성공:", { digest, poolId });

              // Pool ID를 백엔드에 업데이트
              if (poolId) {
                try {
                  const token = localStorage.getItem("access_token");
                  if (token) {
                    const updateResponse = await fetch(
                      `http://localhost:8000/api/v1/predictions/${result.selected_prediction.id}/pool`,
                      {
                        method: "PUT",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ pool_id: poolId }),
                      }
                    );

                    if (updateResponse.ok) {
                      console.log("Pool ID 업데이트 성공:", poolId);
                      alert(
                        `Sui 컨트랙트에 매치가 성공적으로 생성되었습니다!\nPool ID: ${poolId}`
                      );
                    } else {
                      console.error(
                        "Pool ID 업데이트 실패:",
                        updateResponse.status
                      );
                      alert(
                        `매치는 생성되었지만 Pool ID 업데이트에 실패했습니다.\nPool ID: ${poolId}`
                      );
                    }
                  }
                } catch (updateError) {
                  console.error("Pool ID 업데이트 오류:", updateError);
                  alert(
                    `매치는 생성되었지만 Pool ID 업데이트 중 오류가 발생했습니다.\nPool ID: ${poolId}`
                  );
                }
              } else {
                alert(
                  "Sui 컨트랙트에 매치가 생성되었지만 Pool ID를 찾을 수 없습니다."
                );
              }
            } else {
              console.log("user_address가 없어서 createMatch를 건너뜁니다.");
              alert(
                "선택된 예측에 user_address가 없어서 Sui 컨트랙트 호출을 건너뜁니다."
              );
            }
          } catch (error) {
            console.error("Sui 컨트랙트 createMatch 오류:", error);
            alert(`Sui 컨트랙트 호출 중 오류가 발생했습니다: ${error}`);
          }

          // 기존 점수들과 새로 계산된 점수들을 합치기
          setPredictionScores((prev) => {
            const existingIds = new Set(prev.map((s) => s.prediction_id));
            const newScores = result.calculated_scores
              .map((score: any) => ({
                prediction_id: score.prediction_id,
                total_score: score.total_score,
                // 다른 필드들은 기본값으로 설정
                quality_score: 0,
                demand_score: 0,
                reputation_score: 0,
                novelty_score: 0,
                economic_score: 0,
              }))
              .filter((s: any) => !existingIds.has(s.prediction_id));
            return [...prev, ...newScores];
          });

          // 예측 목록 새로고침
          loadPredictions();
        }

        setTimeout(() => {
          setIsBatchScoring(false);
          setScoringProgress(0);
          setScoringStatus("");
          setShowSelectionResult(false);
        }, 3000);
      } else {
        const errorData = await response.json();
        console.error("Batch scoring and selection failed:", errorData);
        setScoringStatus(`Failed: ${errorData.detail || "Unknown error"}`);
        setIsBatchScoring(false);
      }
    } catch (error) {
      console.error("Batch scoring and selection error:", error);
      setScoringStatus("Error occurred during batch processing");
      setIsBatchScoring(false);
    }
  };

  // Load prediction events when login status changes
  React.useEffect(() => {
    if (isLoggedIn) {
      loadPredictions();
      // Admin인 경우에만 점수 로드
      if (user?.is_admin) {
        loadExistingScores();
      }
    } else {
      // 로그인하지 않은 경우에도 승인된 예측은 볼 수 있도록
      loadPredictions();
    }
  }, [isLoggedIn, user?.is_admin]);

  // 예측 이벤트가 로드된 후 기존 점수들 불러오기
  React.useEffect(() => {
    if (predictions.length > 0 && isLoggedIn && user?.is_admin) {
      loadExistingScores();
    }
  }, [predictions, isLoggedIn, user?.is_admin]);

  // API 호출
  const {
    data: newsData,
    isLoading: newsLoading,
    error: newsError,
  } = useNews(1, 50);
  const {
    data: communityData,
    isLoading: communityLoading,
    error: communityError,
  } = useCommunityPosts(1, 50);
  const {
    data: standingsData,
    isLoading: standingsLoading,
    error: standingsError,
  } = useAllStandings();

  // API 오류 로깅
  React.useEffect(() => {
    if (newsError) {
      console.error("News API Error:", newsError);
    }
    if (standingsError) {
      console.error("Standings API Error:", standingsError);
    }
    if (communityError) {
      console.error("Community API Error:", communityError);
    }
  }, [newsError, standingsError, communityError]);

  // API 데이터를 기존 형식으로 변환
  const breakingNews = newsData?.news || [];
  const communityPosts = communityData?.posts || [];
  const leagueStandings =
    standingsData?.reduce((acc, leagueData) => {
      acc[leagueData.league] = leagueData.standings;
      return acc;
    }, {} as Record<string, any[]>) || {};

  const groupNewsByDate = (news: typeof breakingNews) => {
    return news.reduce((groups, item) => {
      const date = item.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {} as Record<string, typeof breakingNews>);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    if (dateString === today.toISOString().split("T")[0]) {
      return "오늘, 2025년 8월 12일 화요일";
    } else if (dateString === yesterday.toISOString().split("T")[0]) {
      return "어제, 2025년 8월 11일 월요일";
    } else if (dateString === dayBeforeYesterday.toISOString().split("T")[0]) {
      return "그제, 2025년 8월 10일 일요일";
    } else {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      };
      return date.toLocaleDateString("ko-KR", options);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "축구":
        return "⚽";
      case "야구":
        return "⚾";
      case "농구":
        return "🏀";
      case "예측":
        return "🎯";
      default:
        return "💬";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "축구":
        return "text-green-600 bg-green-50";
      case "야구":
        return "text-blue-600 bg-blue-50";
      case "농구":
        return "text-orange-600 bg-orange-50";
      case "예측":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const handleLogin = (email: string, password: string) => {
    // Simple login simulation
    if (email && password) {
      const userData = {
        name: email.split("@")[0],
        email: email,
        avatar: email.charAt(0).toUpperCase(),
      };
      // Note: These functions are handled by AuthContext
      setShowLoginModal(false);
    }
  };

  const handleLogout = () => {
    // Note: This function is handled by AuthContext
  };

  const handleBetClick = (gameId: any, option: any) => {
    setBettingCard(gameId);
    setSelectedOption(option);
    setBetAmount(10);
  };

  const handleBetSubmit = () => {
    // 베팅 로직 처리
    console.log(`베팅: ${selectedOption?.name}, 금액: $${betAmount}`);
    setBettingCard(null);
    setSelectedOption(null);
  };

  const handlePostClick = (post: any) => {
    setSelectedPost(post);
  };

  const handleBackToCommunity = () => {
    setSelectedPost(null);
  };

  const renderStatsContent = () => {
    const standings =
      leagueStandings[selectedLeague as keyof typeof leagueStandings] || [];

    return (
      <div className="pb-20 w-full">
        {/* 리그 선택 탭 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 w-full">
          <div className="flex gap-2 overflow-x-auto">
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => setSelectedLeague(league.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedLeague === league.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {league.name}
              </button>
            ))}
          </div>
        </div>

        {/* Season Information */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChevronLeft className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900">2025-26</h2>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            <button className="text-sm text-gray-500 flex items-center gap-1">
              순위 안내 <span className="text-xs">ⓘ</span>
            </button>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white px-6 border-b border-gray-200 w-full">
          <div className="flex gap-8">
            <button
              onClick={() => setStatsTab("team")}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                statsTab === "team"
                  ? "text-blue-500 border-blue-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Team Rankings
            </button>
            <button
              onClick={() => setStatsTab("record")}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                statsTab === "record"
                  ? "text-blue-500 border-blue-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Team Stats
            </button>
            <button
              onClick={() => setStatsTab("player")}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                statsTab === "player"
                  ? "text-blue-500 border-blue-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Player Stats
            </button>
          </div>
        </div>

        {/* 순위표 */}
        <div className="bg-white w-full">
          <div className="px-6 py-4 w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Team Rankings <span className="text-xs text-gray-500">ⓘ</span>
            </h3>
          </div>

          {/* 테이블 헤더 */}
          <div className="px-6 py-3 bg-gray-50 border-y border-gray-200 w-full">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600">
              <div className="col-span-1 text-gray-600">순위</div>
              <div className="col-span-3 text-gray-600">팀명</div>
              <div className="col-span-1 text-center text-gray-600">승점</div>
              <div className="col-span-1 text-center text-gray-600">경기</div>
              <div className="col-span-1 text-center text-gray-600">승</div>
              <div className="col-span-1 text-center text-gray-600">무</div>
              <div className="col-span-1 text-center text-gray-600">패</div>
              <div className="col-span-1 text-center text-gray-600">득점</div>
              <div className="col-span-1 text-center text-gray-600">실점</div>
              <div className="col-span-1 text-center text-gray-600">득실</div>
            </div>
          </div>

          {/* 순위 목록 */}
          <div className="divide-y divide-gray-100 w-full">
            {standings.map((team) => (
              <div
                key={team.rank}
                className="px-6 py-4 hover:bg-gray-50 transition-colors w-full"
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1 h-8 rounded-full ${
                          team.rank <= 4
                            ? "bg-blue-500"
                            : team.rank <= 6
                            ? "bg-green-500"
                            : team.rank >= standings.length - 2
                            ? "bg-red-500"
                            : "bg-transparent"
                        }`}
                      ></div>
                      <span className="font-medium text-gray-900">
                        {team.rank}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full ${
                          getRandomColor(team.team).bgColor
                        }`}
                      ></div>
                      <span className="font-medium text-gray-900">
                        {team.team}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="font-bold text-blue-600">
                      {team.points}
                    </span>
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    {team.played}
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    {team.won}
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    {team.drawn}
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    {team.lost}
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    {team.goalsFor}
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    {team.goalsAgainst}
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    <span
                      className={
                        team.goalDiff >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {team.goalDiff >= 0 ? "+" : ""}
                      {team.goalDiff}
                    </span>
                  </div>
                </div>

                {/* 최근 경기 결과 */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Recent 5 Games:</span>
                  <div className="flex gap-1">
                    {team.form.map((result: any, index: number) => (
                      <div
                        key={index}
                        className={`w-6 h-6 rounded text-xs font-medium flex items-center justify-center ${
                          result === "승"
                            ? "bg-green-100 text-green-600"
                            : result === "무"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {result === "승" ? "승" : result === "무" ? "무" : "패"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAdminContent = () => {
    if (!isLoggedIn || !user?.is_admin) {
      return (
        <div className="pb-20 relative w-full">
          <div className="bg-white border-b border-gray-200 p-6 w-full">
            <div className="text-center py-12">
              <Settings size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Admin Access Required
              </h2>
              <p className="text-gray-600">
                This page is only accessible to administrators.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const pendingPredictions = predictions.filter(
      (p) => p.status === "pending"
    );
    const approvedPredictions = predictions.filter(
      (p) =>
        p.status === "approved" ||
        p.status === "ended" ||
        p.status === "completed"
    );

    const handleApprovePrediction = async (predictionId: string) => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          alert("Login required.");
          return;
        }

        const response = await fetch(
          `http://localhost:8000/api/v1/predictions/${predictionId}/approve`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "approved" }),
          }
        );

        if (response.ok) {
          const updatedPrediction = await response.json();
          setPredictions((prev) =>
            prev.map((p) => (p.id === predictionId ? updatedPrediction : p))
          );
          alert("예측 이벤트가 승인되었습니다!");
        } else {
          const errorData = await response.json();
          console.error("예측 이벤트 승인 실패:", errorData);
          alert(
            `예측 이벤트 승인에 실패했습니다: ${
              errorData.detail || "알 수 없는 오류"
            }`
          );
        }
      } catch (error) {
        console.error("예측 이벤트 승인 오류:", error);
        alert("예측 이벤트 승인 중 오류가 발생했습니다.");
      }
    };

    const handleRejectPrediction = async (predictionId: string) => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          alert("Login required.");
          return;
        }

        const response = await fetch(
          `http://localhost:8000/api/v1/predictions/${predictionId}/approve`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "rejected" }),
          }
        );

        if (response.ok) {
          const updatedPrediction = await response.json();
          setPredictions((prev) =>
            prev.map((p) => (p.id === predictionId ? updatedPrediction : p))
          );
          alert("예측 이벤트가 거부되었습니다!");
        } else {
          const errorData = await response.json();
          console.error("예측 이벤트 거부 실패:", errorData);
          alert(
            `예측 이벤트 거부에 실패했습니다: ${
              errorData.detail || "알 수 없는 오류"
            }`
          );
        }
      } catch (error) {
        console.error("예측 이벤트 거부 오류:", error);
        alert("예측 이벤트 거부 중 오류가 발생했습니다.");
      }
    };

    return (
      <div className="pb-20 relative w-full">
        <div className="bg-white border-b border-gray-200 p-6 w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">🔧 Admin Panel</h1>

            {/* 일괄 스코어링 버튼들 */}
            <div className="flex items-center gap-4">
              {isBatchScoring && (
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scoringProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{scoringStatus}</span>
                </div>
              )}

              {showSelectionResult && selectedPrediction && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">
                      🏆 Selected:
                    </span>
                    <span className="text-green-800 font-medium">
                      {selectedPrediction.game_id}
                    </span>
                    <span className="text-green-600 text-sm">
                      (Score: {selectedPrediction.total_score.toFixed(1)})
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={batchCalculateAIScores}
                  disabled={isBatchScoring}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isBatchScoring
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                  }`}
                >
                  {isBatchScoring ? "🔄 Processing..." : "🤖 Batch Scoring"}
                </button>

                <button
                  onClick={batchCalculateAndSelectBest}
                  disabled={isBatchScoring || !isConnected}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isBatchScoring || !isConnected
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  }`}
                  title={
                    !isConnected
                      ? "Wallet connection required for Sui contract integration"
                      : ""
                  }
                >
                  {isBatchScoring
                    ? "🔄 Processing..."
                    : !isConnected
                    ? "🔗 Connect Wallet First"
                    : "🎯 Score & Auto-Select"}
                </button>
              </div>
            </div>
          </div>
          {/* 대기 중인 예측 이벤트 */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              ⏳ Pending Prediction Events
            </h2>
            {pendingPredictions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No pending prediction events.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPredictions.map((prediction: any) => (
                  <div
                    key={prediction.id}
                    className="border border-yellow-200 rounded-lg p-4 bg-yellow-50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                          {prediction.game_id}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {prediction.creator}
                          {prediction.user_address && (
                            <span className="ml-1 text-blue-600">
                              ({prediction.user_address.slice(0, 6)}...
                              {prediction.user_address.slice(-4)})
                            </span>
                          )}
                        </span>
                        <span className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded text-xs font-medium">
                          대기중
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(prediction.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-gray-900 mb-3">
                      {prediction.prediction}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          옵션 A
                        </div>
                        <div className="text-gray-900">
                          {prediction.option_a}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          옵션 B
                        </div>
                        <div className="text-gray-900">
                          {prediction.option_b}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* AI 점수 표시 */}
                      {(() => {
                        const score = predictionScores.find(
                          (s) => s.prediction_id === parseInt(prediction.id)
                        );
                        if (score) {
                          const getScoreColor = (score: number) => {
                            if (score >= 80)
                              return "text-green-600 bg-green-100";
                            if (score >= 60)
                              return "text-yellow-600 bg-yellow-100";
                            if (score >= 40)
                              return "text-orange-600 bg-orange-100";
                            return "text-red-600 bg-red-100";
                          };

                          const getTotalScoreColor = (score: number) => {
                            if (score >= 80)
                              return "text-green-700 bg-green-200";
                            if (score >= 60)
                              return "text-yellow-700 bg-yellow-200";
                            if (score >= 40)
                              return "text-orange-700 bg-orange-200";
                            return "text-red-700 bg-red-200";
                          };

                          return (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-blue-900 flex items-center gap-2">
                                  🤖 AI 평가 점수
                                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                    완료
                                  </span>
                                </h4>
                                <div
                                  className={`px-3 py-1 rounded-full font-bold text-lg ${getTotalScoreColor(
                                    score.total_score
                                  )}`}
                                >
                                  {score.total_score}점
                                </div>
                              </div>

                              <div className="grid grid-cols-5 gap-2 mb-3">
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    품질 (35%)
                                  </div>
                                  <div
                                    className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.quality_score
                                    )}`}
                                  >
                                    {score.quality_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    수요 (25%)
                                  </div>
                                  <div
                                    className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.demand_score
                                    )}`}
                                  >
                                    {score.demand_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    신뢰 (20%)
                                  </div>
                                  <div
                                    className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.reputation_score
                                    )}`}
                                  >
                                    {score.reputation_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    선점 (10%)
                                  </div>
                                  <div
                                    className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.novelty_score
                                    )}`}
                                  >
                                    {score.novelty_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    경제 (10%)
                                  </div>
                                  <div
                                    className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.economic_score
                                    )}`}
                                  >
                                    {score.economic_score}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white p-3 rounded border text-xs text-gray-700">
                                <div className="font-medium text-gray-800 mb-1">
                                  📊 AI 분석 결과:
                                </div>
                                <div className="leading-relaxed">
                                  {score.ai_reasoning}
                                </div>
                              </div>

                              <button
                                onClick={() => calculateAIScore(prediction.id)}
                                className="w-full mt-2 bg-blue-500 text-white py-1 px-3 rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                              >
                                🔄 점수 재계산
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <button
                              onClick={() => calculateAIScore(prediction.id)}
                              className="w-full bg-blue-500 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                              🤖 AI 점수 계산
                            </button>
                          );
                        }
                      })()}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprovePrediction(prediction.id)}
                          className="flex-1 bg-green-500 text-white py-2 px-4 rounded text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          ✅ 승인
                        </button>
                        <button
                          onClick={() => handleRejectPrediction(prediction.id)}
                          className="flex-1 bg-red-500 text-white py-2 px-4 rounded text-sm font-medium hover:bg-red-600 transition-colors"
                        >
                          ❌ 거부
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 승인된 예측 이벤트 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              ✅ Active & Ended Prediction Events (Ranked by AI Score)
            </h2>
            {approvedPredictions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No approved prediction events.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedPredictions
                  .map((prediction: any) => {
                    const score = predictionScores.find(
                      (s: any) => s.prediction_id === parseInt(prediction.id)
                    );
                    return { ...prediction, aiScore: score?.total_score || 0 };
                  })
                  .sort((a, b) => b.aiScore - a.aiScore)
                  .map((prediction: any, index: number) => (
                    <div
                      key={prediction.id}
                      className={`border rounded-lg p-4 ${
                        prediction.status === "approved"
                          ? "border-green-200 bg-green-50"
                          : prediction.status === "ended"
                          ? "border-orange-200 bg-orange-50"
                          : prediction.status === "completed"
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {/* 순위 표시 */}
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              index === 0
                                ? "bg-yellow-100 text-yellow-800"
                                : index === 1
                                ? "bg-gray-100 text-gray-800"
                                : index === 2
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                            {prediction.game_id}
                          </span>
                          <span className="text-xs text-gray-500">
                            by {prediction.creator}
                            {prediction.user_address && (
                              <span className="ml-1 text-blue-600">
                                ({prediction.user_address.slice(0, 6)}...
                                {prediction.user_address.slice(-4)})
                              </span>
                            )}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              prediction.status === "approved"
                                ? "bg-green-100 text-green-600"
                                : prediction.status === "ended"
                                ? "bg-orange-100 text-orange-600"
                                : prediction.status === "completed"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {prediction.status === "approved"
                              ? "Approved"
                              : prediction.status === "ended"
                              ? "Ended"
                              : prediction.status === "completed"
                              ? "Completed"
                              : prediction.status}
                          </span>
                          {/* AI 점수 표시 */}
                          {prediction.aiScore > 0 && (
                            <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-medium">
                              AI: {prediction.aiScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(prediction.createdAt).toLocaleString()}
                          </span>
                          {prediction.pool_id && (
                            <>
                              {prediction.status === "approved" && (
                                <button
                                  onClick={() =>
                                    handleEndPrediction(prediction)
                                  }
                                  className="bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600 transition-colors"
                                >
                                  End
                                </button>
                              )}
                              {prediction.status === "ended" && (
                                <button
                                  onClick={() => handleSetResult(prediction)}
                                  className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                                >
                                  Result
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-900 mb-3">
                        {prediction.prediction}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            옵션 A
                          </div>
                          <div className="text-gray-900">
                            {prediction.option_a}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            옵션 B
                          </div>
                          <div className="text-gray-900">
                            {prediction.option_b}
                          </div>
                        </div>
                      </div>

                      {/* 승인된 예측에도 AI 점수 표시 */}
                      {(() => {
                        const score = predictionScores.find(
                          (s) => s.prediction_id === parseInt(prediction.id)
                        );
                        if (score) {
                          const getScoreColor = (score: number) => {
                            if (score >= 80)
                              return "text-green-600 bg-green-100";
                            if (score >= 60)
                              return "text-yellow-600 bg-yellow-100";
                            if (score >= 40)
                              return "text-orange-600 bg-orange-100";
                            return "text-red-600 bg-red-100";
                          };

                          const getTotalScoreColor = (score: number) => {
                            if (score >= 80)
                              return "text-green-700 bg-green-200";
                            if (score >= 60)
                              return "text-yellow-700 bg-yellow-200";
                            if (score >= 40)
                              return "text-orange-700 bg-orange-200";
                            return "text-red-700 bg-red-200";
                          };

                          return (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-green-900 flex items-center gap-2">
                                  🤖 AI Evaluation Score
                                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                    완료
                                  </span>
                                </h4>
                                <div
                                  className={`px-2 py-1 rounded-full font-bold text-sm ${getTotalScoreColor(
                                    score.total_score
                                  )}`}
                                >
                                  {score.total_score}점
                                </div>
                              </div>

                              <div className="grid grid-cols-5 gap-1 mb-2">
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    품질
                                  </div>
                                  <div
                                    className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.quality_score
                                    )}`}
                                  >
                                    {score.quality_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    수요
                                  </div>
                                  <div
                                    className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.demand_score
                                    )}`}
                                  >
                                    {score.demand_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    신뢰
                                  </div>
                                  <div
                                    className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.reputation_score
                                    )}`}
                                  >
                                    {score.reputation_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    선점
                                  </div>
                                  <div
                                    className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.novelty_score
                                    )}`}
                                  >
                                    {score.novelty_score}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-600 mb-1">
                                    경제
                                  </div>
                                  <div
                                    className={`px-1 py-1 rounded text-xs font-bold ${getScoreColor(
                                      score.economic_score
                                    )}`}
                                  >
                                    {score.economic_score}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPredictionContent = () => {
    // 디버깅: 모든 예측 이벤트 상태 확인
    console.log("모든 예측 이벤트들:", predictions);
    console.log(
      "예측 이벤트 상태들:",
      predictions.map((p) => ({ id: p.id, status: p.status }))
    );

    // 승인된 예측 이벤트들을 백엔드에서 로드
    const approvedPredictions = predictions.filter(
      (p) => p.status === "approved"
    );

    // 완료된 예측 이벤트들 (상금 claim 가능)
    const completedPredictions = predictions.filter(
      (p) => p.status === "completed"
    );

    console.log("승인된 예측 이벤트 개수:", approvedPredictions.length);
    console.log("완료된 예측 이벤트 개수:", completedPredictions.length);

    return (
      <div className="pb-20 relative w-full">
        <div className="bg-white border-b border-gray-200 p-4 w-full">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">🎯 Betting Game</h2>
            {isLoggedIn ? (
              isConnected ? (
                <button
                  onClick={() => setShowCreatePredictionModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all"
                >
                  🎯 AI Prediction Proposal
                </button>
              ) : (
                <button
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                  title="Wallet connection required"
                >
                  🔗 Connect Wallet to Create
                </button>
              )
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                title="Login required"
              >
                🔒 Login to Create Prediction
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-6">
          {/* 승인된 예측 이벤트들 */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              🔥 Active Prediction Events
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedPredictions.map((prediction: any) => {
                const poolInfo = poolInfos[prediction.id];
                const userBet =
                  userBets[prediction.id] || userBets[String(prediction.id)];

                console.log("Active 이벤트 디버깅:", {
                  predictionId: prediction.id,
                  userBets: userBets,
                  userBet: userBet,
                  isLoggedIn: isLoggedIn,
                  userId: user?.id,
                });

                // Pool 정보가 있으면 실시간 데이터 사용, 없으면 기본값 사용
                let timeLeft = 0;
                let isExpired = true;
                let totalBets = 0;
                let optionAPercentage = 0;
                let optionBPercentage = 0;

                if (poolInfo) {
                  // close_time_ms를 사용하여 남은 시간 계산
                  timeLeft = Math.ceil(
                    (poolInfo.closeTimeMs - Date.now()) / (1000 * 60 * 60)
                  );
                  isExpired = timeLeft <= 0;

                  // totals 배열의 합계로 총 베팅 금액 계산 (USDC 단위로 변환)
                  const rawTotalBets = poolInfo.totals.reduce(
                    (sum: number, total: number) => sum + total,
                    0
                  );

                  // USDC 메타데이터에서 decimals 가져오기 (기본값 6)
                  const usdcDecimals = 6; // Pool의 totals는 일반적으로 USDC와 동일한 decimals 사용
                  totalBets = rawTotalBets / Math.pow(10, usdcDecimals);

                  // 각 옵션의 퍼센티지 계산 (원시 값으로 계산)
                  if (rawTotalBets > 0) {
                    optionAPercentage = Math.round(
                      (poolInfo.totals[0] / rawTotalBets) * 100
                    );
                    optionBPercentage = Math.round(
                      (poolInfo.totals[1] / rawTotalBets) * 100
                    );
                  }
                } else {
                  // Pool 정보가 없는 경우 기본값 사용
                  timeLeft = Math.ceil(
                    (new Date(prediction.expires_at).getTime() - Date.now()) /
                      (1000 * 60 * 60)
                  );
                  isExpired = timeLeft <= 0;
                  totalBets = prediction.total_amount || 0;
                  optionAPercentage = 45;
                  optionBPercentage = 55;
                }

                return (
                  <div
                    key={prediction.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                          {prediction.game_id}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            poolInfo
                              ? isExpired
                                ? "bg-gray-100 text-gray-600"
                                : "bg-green-100 text-green-600"
                              : "bg-yellow-100 text-yellow-600"
                          }`}
                        >
                          {poolInfo
                            ? isExpired
                              ? "Expired"
                              : "Active"
                            : "Loading..."}
                        </span>
                        {userBet && isLoggedIn && user?.id && (
                          <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-medium">
                            🎯 Bet: {userBet.option} (${userBet.amount})
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="font-semibold text-gray-900 text-sm mb-2">
                      {prediction.prediction}
                    </h4>

                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>
                        ⏰{" "}
                        {poolInfo
                          ? isExpired
                            ? "Expired"
                            : `${timeLeft}h left`
                          : "Loading..."}
                      </span>
                      <span>
                        💰 Total Bets: ${poolInfo ? totalBets : "..."}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {prediction.option_a}
                        </span>
                        <span className="font-semibold text-green-600">
                          {poolInfo ? `${optionAPercentage}%` : "..."}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {prediction.option_b}
                        </span>
                        <span className="font-semibold text-red-600">
                          {poolInfo ? `${optionBPercentage}%` : "..."}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
                          userBet &&
                          isLoggedIn &&
                          user?.id &&
                          userBet.option === prediction.option_a
                            ? "bg-purple-500 text-white hover:bg-purple-600 border-2 border-purple-300"
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                        disabled={isExpired || !isLoggedIn || !isConnected}
                        onClick={() => {
                          handleBettingOptionClick(
                            prediction,
                            prediction.option_a
                          );
                        }}
                      >
                        {userBet &&
                        isLoggedIn &&
                        user?.id &&
                        userBet.option === prediction.option_a
                          ? "🎯"
                          : "✅"}{" "}
                        {prediction.option_a}
                      </button>
                      <button
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
                          userBet &&
                          isLoggedIn &&
                          user?.id &&
                          userBet.option === prediction.option_b
                            ? "bg-purple-500 text-white hover:bg-purple-600 border-2 border-purple-300"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                        disabled={isExpired || !isLoggedIn || !isConnected}
                        onClick={() => {
                          handleBettingOptionClick(
                            prediction,
                            prediction.option_b
                          );
                        }}
                      >
                        {userBet &&
                        isLoggedIn &&
                        user?.id &&
                        userBet.option === prediction.option_b
                          ? "🎯"
                          : "❌"}{" "}
                        {prediction.option_b}
                      </button>
                    </div>
                  </div>
                );
              })}

              {approvedPredictions.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">🎯</div>
                  <p className="text-lg font-medium mb-2">
                    No approved prediction events yet
                  </p>
                  <p className="text-sm">
                    Approved predictions will appear here!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 완료된 예측 이벤트들 (상금 Claim 가능) */}
          {console.log(
            "Completed predictions 렌더링 조건:",
            completedPredictions.length > 0,
            "개수:",
            completedPredictions.length
          )}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              🏆 Completed Events - Claim Your Rewards
            </h3>
            {completedPredictions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedPredictions.map((prediction: any) => {
                  const userBet =
                    userBets[prediction.id] || userBets[String(prediction.id)];
                  const poolInfo = poolInfos[prediction.id];

                  console.log("Completed 이벤트 디버깅:", {
                    predictionId: prediction.id,
                    predictionIdType: typeof prediction.id,
                    userBets: userBets,
                    userBet: userBet,
                    userBetsKeys: Object.keys(userBets),
                  });

                  // Pool 정보에서 퍼센티지 계산
                  const totalBets = poolInfo
                    ? poolInfo.totals.reduce(
                        (sum: number, total: number) => sum + total,
                        0
                      )
                    : 0;
                  const optionAPercentage =
                    poolInfo && totalBets > 0
                      ? Math.round((poolInfo.totals[0] / totalBets) * 100)
                      : 0;
                  const optionBPercentage =
                    poolInfo && totalBets > 0
                      ? Math.round((poolInfo.totals[1] / totalBets) * 100)
                      : 0;

                  return (
                    <div
                      key={prediction.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                            {prediction.game_id}
                          </span>
                          <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                            Completed
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(prediction.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="font-semibold text-gray-900 mb-3">
                        {prediction.prediction}
                      </h4>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">
                            {prediction.option_a}
                          </span>
                          <span className="font-semibold text-green-600">
                            {poolInfo ? `${optionAPercentage}%` : "..."}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">
                            {prediction.option_b}
                          </span>
                          <span className="font-semibold text-red-600">
                            {poolInfo ? `${optionBPercentage}%` : "..."}
                          </span>
                        </div>
                      </div>

                      {/* 사용자 베팅 정보 및 Claim 버튼 */}
                      {userBet && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                          <div className="text-sm text-purple-700 mb-2">
                            🎯 Your Bet: {userBet.option} (${userBet.amount})
                          </div>

                          {/* 정답/오답 판단 및 표시 */}
                          {(() => {
                            // 정답 인덱스 확인 (0: option_a, 1: option_b)
                            const correctOptionIndex = poolInfo?.resultIdx;
                            const userBetOption = userBet.option;
                            const isCorrect =
                              (correctOptionIndex === 0 &&
                                userBetOption === prediction.option_a) ||
                              (correctOptionIndex === 1 &&
                                userBetOption === prediction.option_b);

                            console.log("정답/오답 판단 디버깅:", {
                              predictionId: prediction.id,
                              poolInfo: poolInfo,
                              correctOptionIndex: correctOptionIndex,
                              userBetOption: userBetOption,
                              optionA: prediction.option_a,
                              optionB: prediction.option_b,
                            });

                            if (isCorrect) {
                              // 정답인 경우
                              return (
                                <div className="text-sm text-green-600 mb-2">
                                  ✅ Correct Answer! You can claim rewards.
                                </div>
                              );
                            }
                            // 오답인 경우는 메시지 표시하지 않음
                          })()}

                          <button
                            className="w-full bg-purple-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-purple-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            disabled={!isLoggedIn || !isConnected}
                            onClick={async () => {
                              if (!address) return;

                              try {
                                // 먼저 이미 claim했는지 확인
                                const hasClaimed = await hasUserClaimed({
                                  poolId: prediction.pool_id,
                                  userAddress: address,
                                });

                                if (hasClaimed) {
                                  alert(
                                    "You have already claimed your rewards for this event."
                                  );
                                  return;
                                }

                                // claim 함수 호출
                                const result = await claim({
                                  poolId: prediction.pool_id,
                                });

                                if (result.success) {
                                  alert(
                                    `Successfully claimed your rewards!\nTransaction: ${result.digest}`
                                  );
                                  // 베팅 정보 새로고침
                                  if (user?.id) {
                                    await loadUserBets(user.id);
                                  }
                                } else {
                                  alert(
                                    `Failed to claim rewards: ${result.error}`
                                  );
                                }
                              } catch (error) {
                                console.error("Claim error:", error);
                                alert(
                                  "Error claiming rewards. Please try again."
                                );
                              }
                            }}
                          >
                            💰 Claim Rewards
                          </button>
                        </div>
                      )}

                      {!userBet && (
                        <div className="text-center py-4 text-gray-500">
                          <p className="text-sm">
                            You didn't participate in this event
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">🏆</div>
                <p className="text-lg font-medium mb-2">
                  No completed events yet
                </p>
                <p className="text-sm">
                  Completed events will appear here for reward claiming!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBreakingContent = () => {
    const groupedNews = groupNewsByDate(breakingNews);
    const sortedDates = Object.keys(groupedNews).sort((a, b) =>
      b.localeCompare(a)
    );

    return (
      <div className="pb-20 w-full">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 w-full">
          <span className="text-sm font-medium text-gray-600">
            {formatDate(stickyDate)}
          </span>
        </div>

        <div className="relative bg-white w-full">
          <div className="absolute left-20 top-0 bottom-0 w-px bg-gray-200"></div>

          {sortedDates.map((date) => (
            <div key={date} className="relative">
              <div className="space-y-0">
                {groupedNews[date].map((news) => {
                  const isImportant = news.likes >= 200;
                  return (
                    <div
                      key={news.id}
                      className="relative flex hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-20 flex-shrink-0 py-4 px-4 text-right">
                        <div
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isImportant
                              ? "bg-[#00C28C] text-white"
                              : "bg-gray-100 text-[#00C28C]"
                          }`}
                        >
                          {news.time}
                        </div>
                      </div>

                      <div className="absolute left-20 transform -translate-x-1/2 mt-6">
                        <div
                          className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                            isImportant ? "bg-[#00C28C]" : "bg-gray-400"
                          }`}
                        ></div>
                      </div>

                      <div className="flex-1 py-4 pr-6 pl-8">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 font-normal">
                              {news.source}
                            </span>
                          </div>

                          <h3
                            className={`text-lg font-semibold leading-tight ${
                              isImportant ? "text-[#00C28C]" : "text-gray-900"
                            }`}
                          >
                            {news.title}
                          </h3>

                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                            {news.content}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {news.tags?.map((tag, tagIndex) => (
                              <div
                                key={tagIndex}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full text-xs font-medium text-gray-700 h-8"
                              >
                                <div
                                  className={`w-5 h-5 rounded-full flex-shrink-0 ${
                                    getRandomColor(tag.name).bgColor
                                  }`}
                                ></div>
                                <span className="whitespace-nowrap">
                                  {tag.name}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-6 text-xs text-gray-500 pt-2">
                            <div className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              <span>{news.likes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span>{news.comments}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Share className="w-4 h-4" />
                              <span>{news.shares}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCommunityContent = () => {
    if (selectedPost) {
      return (
        <div className="pb-20 relative bg-white w-full">
          {/* Header with back button */}
          <div className="border-b border-gray-200 p-4 w-full">
            <button
              onClick={handleBackToCommunity}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <span>←</span>
              <span className="text-sm">Back to Community</span>
            </button>
          </div>

          {/* Post content */}
          <div className="p-6">
            {/* Author info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                {selectedPost.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {selectedPost.author}
                  </span>
                  <span className="text-gray-500 text-sm">
                    • {selectedPost.time}
                  </span>
                  {selectedPost.badge && (
                    <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
                      {selectedPost.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Post title and content */}
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              {selectedPost.title}
            </h1>
            {selectedPost.content && (
              <div className="text-gray-700 mb-6 whitespace-pre-line leading-relaxed">
                {selectedPost.content}
              </div>
            )}

            {/* Post actions */}
            <div className="flex items-center gap-6 py-4 border-b border-gray-200">
              <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
                <span>❤️</span>
                <span>{selectedPost.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                <span>💬</span>
                <span>{selectedPost.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                <span>📤</span>
                <span>공유</span>
              </button>
            </div>
          </div>

          {/* Comments section */}
          <div className="px-6 pb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              댓글 {String(selectedPost.comments)}개
            </h3>

            {/* Comment input */}
            <div className="mb-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                  👤
                </div>
                <div className="flex-1">
                  <textarea
                    placeholder="댓글을 남겨보세요"
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#00C28C] focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button className="bg-[#00C28C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00B87A] transition-colors">
                      댓글 작성
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments list */}
            <div className="space-y-4">
              {[
                {
                  author: "축구광팬",
                  time: "2시간 전",
                  content:
                    "정말 좋은 분석이네요! 저도 비슷하게 생각하고 있었습니다.",
                  likes: 5,
                  avatar: "⚽",
                },
                {
                  author: "프리미어매니아",
                  time: "4시간 전",
                  content:
                    "손흥민 폼이 정말 좋아 보이긴 하는데, 아스날도 만만치 않을 것 같아요.",
                  likes: 3,
                  avatar: "🏆",
                },
                {
                  author: "TottenhamLover",
                  time: "6 hours ago",
                  content: "Looking forward to Tottenham this season! COYS!",
                  likes: 8,
                  avatar: "🐓",
                },
              ].map((comment, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                    {comment.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">
                        {comment.author}
                      </span>
                      <span className="text-gray-500 text-xs">
                        • {comment.time}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
                        <span>❤️</span>
                        <span>{comment.likes}</span>
                      </button>
                      <button className="text-xs text-gray-500 hover:text-blue-500 transition-colors">
                        답글
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="pb-20 relative w-full">
        <div className="bg-white border-b border-gray-200 p-6 w-full">
          <h2 className="text-lg font-bold mb-4 text-gray-900">🔥 HOT Posts</h2>
          <div className="space-y-3">
            {[
              {
                title: "Can Son Heung-min win the Golden Boot?",
                author: "FootballMania",
                time: "2 hours ago",
                likes: 156,
              },
              {
                title: "How do you see Lee Kang-in's adaptation to PSG?",
                author: "Parisian",
                time: "4 hours ago",
                likes: 89,
              },
              {
                title: "Kim Min-jae's current status after Bayern transfer",
                author: "BundesligaFan",
                time: "6 hours ago",
                likes: 67,
              },
            ].map((post, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#00C28C] font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-gray-900 text-sm font-medium">
                    {post.title}
                  </span>
                  <span className="text-gray-500 text-xs">• {post.author}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>❤️ {post.likes}</span>
                  <span>{post.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white w-full">
          {[
            {
              id: 1,
              author: "SonHeungminFan",
              time: "7 hours ago",
              badge: "Edited",
              title: "Tottenham vs Arsenal Derby Prediction",
              content:
                "How do you see this North London derby?\n\nSon Heung-min's condition is good and I think we can win even without Kane",
              likes: 15,
              comments: 8,
              avatar: "⚽",
            },
            {
              id: 2,
              author: "ManUnitedMania",
              time: "3 days ago",
              title:
                "Ten Hag's tactical changes... Looking forward to this season",
              likes: 23,
              comments: 12,
              avatar: "🔴",
            },
            {
              id: 3,
              author: "LiverpoolLover",
              time: "20 hours ago",
              title: "When will Salah's contract renewal news come out?",
              content: "It keeps getting delayed, I'm worried",
              likes: 31,
              comments: 5,
              avatar: "🔴",
            },
            {
              id: 4,
              author: "ChelseaFan",
              time: "1 day ago",
              title: "What do you think about Pochettino's system?",
              content:
                "It's still an adaptation period but I have high expectations",
              likes: 18,
              comments: 15,
              avatar: "🔵",
            },
            {
              id: 5,
              author: "Citizen",
              time: "2 days ago",
              title: "Can Haaland break the scoring record?",
              likes: 42,
              comments: 7,
              avatar: "💙",
            },
          ].map((post) => (
            <div
              key={post.id}
              className="border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => handlePostClick(post)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                  {post.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {post.author}
                    </span>
                    <span className="text-gray-500 text-xs">• {post.time}</span>
                    {post.badge && (
                      <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
                        {post.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 text-sm">
                    {post.title}
                  </h3>
                  {post.content && (
                    <p className="text-gray-600 text-sm mb-3 whitespace-pre-line">
                      {post.content}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-gray-500">
                    <button className="flex items-center gap-1 text-xs hover:text-gray-700">
                      <span>❤️</span>
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs hover:text-gray-700">
                      <span>💬</span>
                      <span>{post.comments}</span>
                    </button>
                    <button className="text-xs hover:text-gray-700">
                      <span>📤</span>
                    </button>
                  </div>
                </div>
                <button className="text-blue-500 text-sm font-medium hover:text-blue-600 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors">
                  팔로우
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "breaking":
        return renderBreakingContent();
      case "stats":
        return renderStatsContent();
      case "community":
        return renderCommunityContent();
      case "prediction":
        return renderPredictionContent();
      case "admin":
        return renderAdminContent();
      default:
        return renderBreakingContent();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 w-full">
        <div className="w-full max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <img
                  src="/public/assets/suiports_logo.png"
                  alt="Suiports Logo"
                  className="w-32 h-10 object-contain"
                />
              </div>
            </div>

            <nav className="flex items-center gap-8">
              <button
                onClick={() => setActiveTab("breaking")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "breaking"
                    ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Live Feed
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "stats"
                    ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Ranking
              </button>
              <button
                onClick={() => setActiveTab("community")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "community"
                    ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Discussion
              </button>
              <button
                onClick={() => setActiveTab("prediction")}
                className={`text-sm font-medium transition-colors relative ${
                  activeTab === "prediction"
                    ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Predict Marketplace
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold my-[-10px] mx-[-6px]">
                  HOT
                </span>
              </button>
              {isLoggedIn && user?.is_admin && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === "admin"
                      ? "text-[#00C28C] border-b-2 border-[#00C28C] pb-1"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>

            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-8 h-8 rounded-full bg-[#00C28C] flex items-center justify-center text-white text-sm font-medium">
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-sm font-medium">
                      {user?.username || "User"}
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Logout
                  </button>

                  {/* Connect Wallet 버튼 */}
                  <ConnectButton
                    connectText="Connect Wallet"
                    className="!bg-blue-500 !text-white !px-3 !py-1 !rounded-md !text-xs !font-medium hover:!bg-blue-600 !transition-colors"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-[#00C28C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00B87A] transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showLoginModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96 max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#00C28C] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                SPL Sign Up/Login
              </h2>
              <p className="text-gray-600 text-sm">
                SPL is a space to enjoy sports breaking news and prediction
                games.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleLogin(
                  formData.get("email") as string,
                  formData.get("password") as string
                );
              }}
              className="space-y-4"
            >
              <input
                name="email"
                type="email"
                placeholder="Email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C28C]"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C28C]"
                required
              />
              <button
                type="submit"
                className="w-full bg-[#00C28C] text-white py-3 rounded-lg font-medium hover:bg-[#00A876] transition-colors"
              >
                Login
              </button>
            </form>

            <div className="mt-6 space-y-3">
              <button className="w-full bg-yellow-400 text-black py-3 rounded-lg font-medium hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2">
                <span>💬</span>
                Continue with Kakao
              </button>
              <button className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <span>G</span>
                Continue with Google
              </button>
            </div>

            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <main className="w-full max-w-6xl mx-auto">{renderContent()}</main>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: none;
        }
      `}</style>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* 예측 이벤트 생성 모달 */}
      <CreatePredictionModal
        isOpen={showCreatePredictionModal}
        onClose={() => setShowCreatePredictionModal(false)}
        onSubmit={handleCreatePrediction}
      />

      {/* 베팅 모달 */}
      {showBettingModal && selectedBettingPrediction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96 max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Place Bet</h2>
              <button
                onClick={() => setShowBettingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 예측 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {selectedBettingPrediction.prediction}
                </h3>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Selected Option:</span>
                  <span className="font-medium text-blue-600">
                    {selectedBettingOption}
                  </span>
                </div>
              </div>

              {/* USDC 잔고 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">USDC Balance:</span>
                  <span className="font-semibold text-blue-600">
                    {usdcBalance.toFixed(2)} USDC
                  </span>
                </div>
              </div>

              {/* 베팅 금액 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bet Amount (USDC)
                </label>
                <input
                  type="number"
                  value={bettingAmount}
                  onChange={(e) => setBettingAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {bettingAmount && parseFloat(bettingAmount) > usdcBalance && (
                  <p className="text-red-500 text-sm mt-1">
                    Insufficient balance
                  </p>
                )}
              </div>

              {/* 베팅 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBettingModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (
                      !selectedBettingPrediction ||
                      !selectedBettingOption ||
                      !bettingAmount
                    ) {
                      alert("베팅 정보가 올바르지 않습니다.");
                      return;
                    }

                    const poolInfo = poolInfos[selectedBettingPrediction.id];
                    if (!poolInfo || !poolInfo.poolId) {
                      alert("Pool 정보를 찾을 수 없습니다.");
                      return;
                    }

                    // 옵션 인덱스 결정 (option_a = 0, option_b = 1)
                    const optionIdx =
                      selectedBettingOption ===
                      selectedBettingPrediction.option_a
                        ? 0
                        : 1;
                    const amount = parseFloat(bettingAmount);

                    try {
                      console.log("베팅 실행 시작:", {
                        poolId: poolInfo.poolId,
                        optionIdx,
                        amount,
                        selectedOption: selectedBettingOption,
                      });

                      const result = await placeBet({
                        poolId: poolInfo.poolId,
                        optionIdx,
                        amount,
                      });

                      if (result.success) {
                        // 데이터베이스에 베팅 정보 저장
                        try {
                          const token = localStorage.getItem("access_token");
                          if (token) {
                            const betResponse = await fetch(
                              "http://localhost:8000/api/v1/bets/",
                              {
                                method: "POST",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  prediction_id: selectedBettingPrediction.id,
                                  user_address: address,
                                  option: selectedBettingOption,
                                  amount: amount,
                                  transaction_hash: result.digest,
                                  pool_id: poolInfo.poolId,
                                }),
                              }
                            );

                            if (betResponse.ok) {
                              console.log(
                                "베팅 정보가 데이터베이스에 저장되었습니다."
                              );
                            } else {
                              console.error(
                                "베팅 정보 저장 실패:",
                                betResponse.status
                              );
                            }
                          }
                        } catch (dbError) {
                          console.error("베팅 정보 저장 오류:", dbError);
                        }

                        // 사용자 베팅 정보 업데이트
                        setUserBets((prev) => ({
                          ...prev,
                          [selectedBettingPrediction.id]: {
                            option: selectedBettingOption,
                            amount: amount,
                            timestamp: Date.now(),
                          },
                        }));

                        alert(
                          `베팅이 성공적으로 완료되었습니다!\n트랜잭션: ${result.digest}`
                        );
                        setShowBettingModal(false);
                        // 베팅 후 Pool 정보 새로고침
                        await loadPoolInfos([selectedBettingPrediction]);
                        // USDC 잔고 새로고침
                        if (address) {
                          await getUsdcBalance(address);
                        }
                      } else {
                        alert(`베팅 실패: ${result.error}`);
                      }
                    } catch (error) {
                      console.error("베팅 실행 오류:", error);
                      alert(`베팅 중 오류가 발생했습니다: ${error}`);
                    }
                  }}
                  disabled={
                    !bettingAmount ||
                    parseFloat(bettingAmount) <= 0 ||
                    parseFloat(bettingAmount) > usdcBalance
                  }
                  className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Place Bet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 결과 설정 모달 */}
      {showResultModal && selectedEndPrediction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedEndPrediction.status === "approved"
                  ? "End Match"
                  : "Set Result"}
              </h2>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 예측 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {selectedEndPrediction.prediction}
                </h3>
                <div className="text-sm text-gray-600 break-all space-y-2">
                  <div>
                    Pool ID:{" "}
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {selectedEndPrediction.pool_id}
                    </span>
                  </div>
                  {selectedEndPrediction.poolInfo?.matchId && (
                    <div>
                      Match ID:{" "}
                      <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                        {selectedEndPrediction.poolInfo.matchId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 승리 옵션 선택 (ended 상태일 때만 표시) */}
              {selectedEndPrediction.status === "ended" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Winning Option:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="winningOption"
                        value={selectedEndPrediction.option_a}
                        checked={
                          selectedWinningOption ===
                          selectedEndPrediction.option_a
                        }
                        onChange={(e) =>
                          setSelectedWinningOption(e.target.value)
                        }
                        className="mr-3"
                      />
                      <span className="text-sm font-medium text-green-600">
                        ✅ {selectedEndPrediction.option_a}
                      </span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="winningOption"
                        value={selectedEndPrediction.option_b}
                        checked={
                          selectedWinningOption ===
                          selectedEndPrediction.option_b
                        }
                        onChange={(e) =>
                          setSelectedWinningOption(e.target.value)
                        }
                        className="mr-3"
                      />
                      <span className="text-sm font-medium text-red-600">
                        ❌ {selectedEndPrediction.option_b}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* 확인 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // ended 상태일 때만 승리 옵션 선택 검증
                    if (
                      selectedEndPrediction.status === "ended" &&
                      !selectedWinningOption
                    ) {
                      alert("승리 옵션을 선택해주세요.");
                      return;
                    }

                    // 승리 옵션 인덱스 결정
                    const winningOptionIndex =
                      selectedWinningOption === selectedEndPrediction.option_a
                        ? 0
                        : 1;

                    try {
                      console.log("매치 종료 시작:", {
                        poolId: selectedEndPrediction.pool_id,
                        winningOptionIndex,
                        selectedOption: selectedWinningOption,
                      });

                      // 상태에 따라 다른 함수 호출
                      let result;
                      if (selectedEndPrediction.status === "approved") {
                        // 모달에서 미리 가져온 matchId 사용
                        const matchId = selectedEndPrediction.poolInfo?.matchId;
                        if (!matchId) {
                          alert(
                            "Match ID를 찾을 수 없습니다. 모달을 다시 열어주세요."
                          );
                          return;
                        }
                        console.log(
                          "End Match 실행 - Registry ID:",
                          REGISTRY_ID,
                          "Pool ID:",
                          selectedEndPrediction.pool_id,
                          "Match ID:",
                          matchId
                        );
                        result = await startMatch({
                          registryId: REGISTRY_ID,
                          poolId: selectedEndPrediction.pool_id,
                          matchId: matchId,
                        });
                      } else {
                        // ended 상태일 때 set_result 호출
                        const matchId = selectedEndPrediction.poolInfo?.matchId;
                        if (!matchId) {
                          alert(
                            "Match ID를 찾을 수 없습니다. 모달을 다시 열어주세요."
                          );
                          return;
                        }
                        console.log(
                          "Set Result 실행 - Registry ID:",
                          REGISTRY_ID,
                          "Pool ID:",
                          selectedEndPrediction.pool_id,
                          "Match ID:",
                          matchId,
                          "Result Index:",
                          winningOptionIndex
                        );
                        result = await setResult({
                          registryId: REGISTRY_ID,
                          poolId: selectedEndPrediction.pool_id,
                          matchId: matchId,
                          resultIdx: winningOptionIndex,
                        });
                      }

                      if (result.success) {
                        // 데이터베이스에서 상태 업데이트
                        try {
                          const token = localStorage.getItem("access_token");
                          if (token) {
                            const newStatus =
                              selectedEndPrediction.status === "approved"
                                ? "ended"
                                : "completed";
                            const statusResponse = await fetch(
                              `http://localhost:8000/api/v1/predictions/${selectedEndPrediction.id}/status`,
                              {
                                method: "PUT",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ status: newStatus }),
                              }
                            );

                            if (statusResponse.ok) {
                              console.log(
                                `예측 이벤트 상태가 ${newStatus}로 업데이트되었습니다.`
                              );
                            } else {
                              console.error(
                                "상태 업데이트 실패:",
                                statusResponse.status
                              );
                            }
                          }
                        } catch (statusError) {
                          console.error("상태 업데이트 오류:", statusError);
                        }

                        alert(
                          `매치가 성공적으로 종료되었습니다!\n트랜잭션: ${result.digest}\n\n이제 "Set Result" 버튼을 클릭해서 정답을 설정하세요.`
                        );
                        setShowResultModal(false);
                        setSelectedWinningOption("");
                        // 예측 이벤트 목록 새로고침
                        await loadPredictions();
                      } else {
                        alert(
                          `매치 종료 실패: ${result.error}\n\n잠시 후 다시 시도해보세요.`
                        );
                      }
                    } catch (error) {
                      console.error("매치 종료 오류:", error);
                      alert(`매치 종료 중 오류가 발생했습니다: ${error}`);
                    }
                  }}
                  disabled={
                    selectedEndPrediction.status === "ended" &&
                    !selectedWinningOption
                  }
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {selectedEndPrediction.status === "approved"
                    ? "End Match"
                    : "Set Result"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ReactDOM 렌더링
import ReactDOM from "react-dom/client";
import { getFullnodeUrl } from "@mysten/sui/client";
import {
  SuiClientProvider,
  WalletProvider as SuiWalletProvider,
} from "@mysten/dapp-kit";
// import { WalletProvider } from "./contexts/WalletContext";
import "@mysten/dapp-kit/dist/index.css";
const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  devnet: { url: getFullnodeUrl("devnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <SuiWalletProvider>
          <AuthProvider>
            <SportsNewsApp />
          </AuthProvider>
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
