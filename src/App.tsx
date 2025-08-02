import React, { useState, useEffect } from "react";
import { Granboard } from "./Granboard";
import { SegmentID, CreateSegment } from "./DartboardUtilities";

const START_SCORE = 501; // 你可以改成301、701等

export default function App() {
  const [score, setScore] = useState(START_SCORE);
  const [roundThrows, setRoundThrows] = useState<number[]>([]);
  const [granboard, setGranboard] = useState<Granboard | undefined>();
  const [log, setLog] = useState<string[]>([]);

  // 初次載入時自動連線藍牙
  useEffect(() => {
    Granboard.ConnectToBoard()
      .then(setGranboard)
      .catch(err => alert("藍牙連線失敗：" + err.message));
  }, []);

  // 處理藍牙靶打中的回呼
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
          setTimeout(() => setRoundThrows([]), 400); // 0.4秒後自動重置回合
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

  return (
    <div style={{ maxWidth: 500, margin: "1rem auto", fontFamily: "sans-serif" }}>
      <h1>單人藍牙自動計分</h1>
      <h2>分數：{score}</h2>
      <div>本回合：{roundThrows.join(", ") || "尚未投鏢"}（{roundThrows.length}/3）</div>
      <div style={{ margin: "1em 0" }}>
        <button onClick={handleEndRound}>手動結束回合</button>
        <button onClick={handleResetGame}>重新開始</button>
      </div>
      <h3>動作紀錄：</h3>
      <ol>
        {log.slice(0, 10).map((line, i) => <li key={i}>{line}</li>)}
      </ol>
      {!granboard && (
        <div style={{ color: "red" }}>請開啟藍牙並連接 Granboard 道具</div>
      )}
    </div>
  );
}
