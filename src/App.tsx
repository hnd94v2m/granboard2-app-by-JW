import React, { useEffect, useState } from "react";
import { Granboard } from "./Granboard";
import { SegmentID } from "./DartboardUtilities";

const START_SCORE = 501;

export default function App() {
  const [score, setScore] = useState(START_SCORE);
  const [roundThrows, setRoundThrows] = useState<number[]>([]);
  const [granboard, setGranboard] = useState<Granboard | undefined>();
  const [log, setLog] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 不再自動嘗試連線，改為點擊按鈕才連線
    return () => {
      // 卸載時移除 callback
      if (granboard) granboard.segmentHitCallback = undefined;
    };
  }, [granboard]);

  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment) => {
      if (segment.ID === SegmentID.RESET_BUTTON) {
        setLog(l => ["手動按下RESET_BUTTON，回合重置", ...l]);
        setRoundThrows([]);
        return;
      }
      setScore(s => Math.max(s - segment.Value, 0));
      setRoundThrows((t) => {
        const newThrows = [...t, segment.Value];
        setLog(l => [
          `命中 ${segment.LongName}（分值${segment.Value}），剩餘：${Math.max(score - segment.Value, 0)}`,
          ...l,
        ]);
        if (newThrows.length >= 3) {
          setLog(l => [`本回合結束（3鏢）`, ...l]);
          setTimeout(() => setRoundThrows([]), 400);
        }
        return newThrows;
      });
    };
    return () => {
      granboard.segmentHitCallback = undefined;
    };
  }, [granboard, score]);

  const handleEndRound = () => {
    setLog(l => [`手動結束回合`, ...l]);
    setRoundThrows([]);
  };

  const handleResetGame = () => {
    setScore(START_SCORE);
    setRoundThrows([]);
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
      <div>本回合：{roundThrows.join(", ") || "尚未投鏢"}（{roundThrows.length}/3）</div>
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
