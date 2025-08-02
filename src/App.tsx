import React, { useEffect, useState } from "react";
import { Granboard } from "./Granboard";
import { SegmentID, SegmentType } from "./DartboardUtilities";

const START_SCORE = 501;

type Throw = {
  value: number;
  longName: string;
  segmentType: SegmentType;
};

export default function App() {
  const [score, setScore] = useState(START_SCORE);
  const [roundThrows, setRoundThrows] = useState<Throw[]>([]);
  const [granboard, setGranboard] = useState<Granboard | undefined>();
  const [log, setLog] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundStartingScore, setRoundStartingScore] = useState<number>(START_SCORE);

  useEffect(() => {
    return () => {
      if (granboard) granboard.segmentHitCallback = undefined;
    };
  }, [granboard]);

  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment) => {
      // 回合起始分數快照
      if (roundThrows.length === 0) setRoundStartingScore(score);

      // 處理 RESET
      if (segment.ID === SegmentID.RESET_BUTTON) {
        setLog(l => ["手動按下RESET_BUTTON，回合重置", ...l]);
        setRoundThrows([]);
        setRoundStartingScore(score);
        return;
      }

      // BUST 規則檢查
      let nextScore = score - segment.Value;

      // 若剩 1 分（不能結束），或低於 0，BUST
      // 01 規則，唯有「雙倍命中使分數歸0」才可結束比賽
      if (
        nextScore < 0 ||
        nextScore === 1 ||
        (nextScore === 0 && segment.Type !== SegmentType.Double)
      ) {
        setLog(l => [
          `爆鏢 BUST！（本回合所有分數作廢，分數回到${roundStartingScore}）`,
          ...l,
        ]);
        setScore(roundStartingScore);
        setTimeout(() => setRoundThrows([]), 400);
        setRoundThrows([]);
        return;
      }

      // 命中並非BUST
      setScore(nextScore);
      setRoundThrows((t) => {
        const newThrows = [
          ...t,
          {
            value: segment.Value,
            longName: segment.LongName,
            segmentType: segment.Type,
          }
        ];
        setLog(l => [
          `命中 ${segment.LongName}（分值${segment.Value}），剩餘：${nextScore}`,
          ...l,
        ]);
        // 回合結束或勝利（分數為0）
        if (
          nextScore === 0 ||
          newThrows.length >= 3
        ) {
          setLog(l => [
            nextScore === 0
              ? "恭喜結束遊戲！（最後一鏢必須雙倍區）"
              : "本回合結束（3鏢）",
            ...l,
          ]);
          setTimeout(() => setRoundThrows([]), 400);
        }
        return newThrows;
      });
    };
    return () => {
      granboard.segmentHitCallback = undefined;
    };
    // eslint-disable-next-line
  }, [granboard, score, roundThrows, roundStartingScore]);

  const handleEndRound = () => {
    setLog(l => [`手動結束回合`, ...l]);
    setRoundThrows([]);
    setRoundStartingScore(score);
  };

  const handleResetGame = () => {
    setScore(START_SCORE);
    setRoundThrows([]);
    setRoundStartingScore(START_SCORE);
    setLog(l => ["分數已重設", ...l]);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const board = await Granboard.ConnectToBoard();
      setGranboard(board);
      setLog(l => ["藍牙連線成功", ...l]);
    } catch (err: any) {
      setError("藍牙連線失敗：" + (err?.message || String(err)));
      setGranboard(undefined);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "1rem auto", fontFamily: "sans-serif" }}>
      <h1>單人藍牙自動計分</h1>
      <h2>分數：{score}</h2>
      <div>
        {!granboard ? (
          <div style={{ marginBottom: "1em" }}>
            <button onClick={handleConnect} disabled={connecting}>
              {connecting ? "連線中..." : "連接藍牙飛鏢板"}
            </button>
            <div style={{ color: "red", marginTop: "0.5em" }}>
              {error ?? "請點擊上方按鈕連接 Granboard 道具"}
            </div>
          </div>
        ) : (
          <div style={{ color: "#4dd599", marginBottom: "1em" }}>已連線 Granboard！</div>
        )}
      </div>
      <div>
        本回合：{roundThrows.length === 0
          ? "尚未投鏢"
          : roundThrows.map((t, idx) => `${t.longName}(${t.value})`).join(", ")}（{roundThrows.length}/3）
      </div>
      <div style={{ margin: "1em 0" }}>
        <button onClick={handleEndRound}>手動結束回合</button>
        <button onClick={handleResetGame}>重新開始</button>
      </div>
      <h3>動作紀錄：</h3>
      <ol>
        {log.slice(0, 10).map((line, i) => <li key={i}>{line}</li>)}
      </ol>
    </div>
  );
}
