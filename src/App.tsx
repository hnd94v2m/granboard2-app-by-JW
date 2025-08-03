import React, { useEffect, useState, useRef } from "react";
import { Granboard } from "./Granboard";
import { SegmentID, SegmentType } from "./DartboardUtilities";

const START_SCORE = 501;
const TOTAL_ROUNDS = 10;
const TABLE_ROWS = 6;

type Throw = {
  value: number;
  longName: string;
  segmentType: SegmentType;
  id: SegmentID;
};

type RoundStatus = "playing" | "wait-next"; // playing:三鏢內 wait-next:三鏢完結、等新回合第一鏢

export default function App() {
  const [score, setScore] = useState(START_SCORE);
  const [roundThrows, setRoundThrows] = useState<Throw[]>([]);
  const [granboard, setGranboard] = useState<Granboard | undefined>();
  const [log, setLog] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 本回合起始分數
  const [roundStartingScore, setRoundStartingScore] = useState<number>(START_SCORE);
  // 歷史每回合三鏢加總或 BUST 字串 (number | 'BUST')
  const [roundTotalList, setRoundTotalList] = useState<(number | "BUST")[]>([]);
  // 回合數（第 N 回合）
  const [round, setRound] = useState(1);
  // 用於呼吸動畫 tick
  const [animTick, setAnimTick] = useState(0);

  // 用來決定現在是不是三鏢結束待下回合啟動（wait-next模式）
  const [roundStatus, setRoundStatus] = useState<RoundStatus>("playing");
  // 用來記住上回合三鏢結果，wait-next時右側顯示該分數，直到下回合新第一鏢丟進才清空
  const lastRoundThrowsRef = useRef<Throw[]>([]);

  // 呼吸動畫定時器
  useEffect(() => {
    const timer = setInterval(() => setAnimTick((t) => t + 1), 1200);
    return () => clearInterval(timer);
  }, []);

  // 藍牙事件卸載
  useEffect(() => {
    return () => {
      if (granboard) granboard.segmentHitCallback = undefined;
    };
  }, [granboard]);

  // 藍牙事件與分數邏輯監聽
  useEffect(() => {
    if (!granboard) return;

    granboard.segmentHitCallback = (segment) => {
      // -----「wait-next」之下收到新一鏢（即新回合開始），這時才清掉右側舊資料 -----
      if (roundStatus === "wait-next") {
        // 下個回合新鏢時，才清空右側三鏢、補上新第一標
        setRoundThrows([{
          value:
            (segment.ID === SegmentID.BULL || segment.ID === SegmentID.DBL_BULL)
              ? 50 : segment.Value,
          longName: segment.LongName,
          segmentType:
            (segment.ID === SegmentID.BULL || segment.ID === SegmentID.DBL_BULL)
              ? SegmentType.Other : segment.Type,
          id: segment.ID,
        }]);
        setRoundStatus("playing");
        // 本回合的初始分數等於當前分數
        setRoundStartingScore(score);
        setLog((l) => [
          `新回合開始：命中 ${segment.LongName}（分值${segment.ID === SegmentID.BULL || segment.ID === SegmentID.DBL_BULL ? 50 : segment.Value}），剩餘：${score - ((segment.ID === SegmentID.BULL || segment.ID === SegmentID.DBL_BULL) ? 50 : segment.Value)}`,
          ...l,
        ]);
        // 正常 further logic 進行：後續鏢處理下方 return
        // 此鏢已設為 roundThrows[0], 不重複新增
        // 應直接return不重複執行roundThrows push
        let segType = (segment.ID === SegmentID.BULL || segment.ID === SegmentID.DBL_BULL)
          ? SegmentType.Other : segment.Type;
        let segValue = (segment.ID === SegmentID.BULL || segment.ID === SegmentID.DBL_BULL)
          ? 50 : segment.Value;
        let nextScore = score - segValue;
        let segId = segment.ID;
        const isMasterOut =
          segType === SegmentType.Double ||
          segType === SegmentType.Triple ||
          segId === SegmentID.BULL ||
          segId === SegmentID.DBL_BULL;
        // Bust判斷：但會在下次投鏢時再判定，這裡不用執行
        return;
      }

      // ----- playing 狀態 -----
      // 回合第一鏢時設定起始分數快照
      if (roundThrows.length === 0) setRoundStartingScore(score);

      if (segment.ID === SegmentID.RESET_BUTTON) {
        // 紅鈕（清空本回合，分數恢復本回合初始分數）
        setLog(l => ["手動按下RESET_BUTTON，回合重置（本回合三鏢全清空、分數復原）", ...l]);
        setScore(roundStartingScore);
        setRoundThrows([]);
        // 紅鈕作用於三鏢未結束or wait-next模式都能工作
        // wait-next下清空右側內容
        if (roundStatus === "wait-next") {
          lastRoundThrowsRef.current = [];
        }
        return;
      }

      let segType = segment.Type;
      let segValue = segment.Value;
      let segId = segment.ID;
      if (segId === SegmentID.BULL || segId === SegmentID.DBL_BULL) {
        segValue = 50;
        segType = SegmentType.Other;
      }
      let nextScore = score - segValue;
      const isMasterOut =
        segType === SegmentType.Double ||
        segType === SegmentType.Triple ||
        segId === SegmentID.BULL ||
        segId === SegmentID.DBL_BULL;

      // 是否為BUST
      const isBust =
        nextScore < 0 ||
        nextScore === 1 ||
        (nextScore === 0 && !isMasterOut);

      if (isBust) {
        setLog(l => [
          nextScore === 0 && !isMasterOut
            ? "爆鏢 BUST！（須於雙倍、三倍、紅心結標，本回合分數作廢，分數回到" + roundStartingScore + "）"
            : `爆鏢 BUST！（本回合所有分數作廢，分數回到${roundStartingScore}）`,
          ...l
        ]);
        setScore(roundStartingScore);
        setRoundTotalList(list => [...list, "BUST"]);
        setRound(r => r + 1);
        lastRoundThrowsRef.current = []; // BUST後本回合三鏢（右側）清空
        setRoundStatus("wait-next");
        return;
      }

      setScore(nextScore);
      setRoundThrows((t) => {
        const newThrows = [
          ...t,
          {
            value: segValue,
            longName: segment.LongName,
            segmentType: segType,
            id: segId,
          }
        ];
        setLog(l => [
          `命中 ${segment.LongName}（分值${segValue}），剩餘：${nextScore}`,
          ...l
        ]);
        // 若達到三鏢或勝利，進入wait-next狀態，但保留三鏢資料到下回合第一鏢丟出前
        if (nextScore === 0 || newThrows.length >= 3) {
          setRoundTotalList(list => [
            ...list,
            nextScore === 0 ? newThrows.reduce((s, t) => s + t.value, 0) : newThrows.reduce((s, t) => s + t.value, 0)
          ]);
          setRound(r => (r + 1));
          setLog(l => [
            nextScore === 0
              ? "恭喜結束遊戲！（最後一鏢必須雙倍、三倍或紅心區）"
              : "本回合結束（3鏢）",
            ...l
          ]);
          setRoundStartingScore(nextScore);
          lastRoundThrowsRef.current = [...newThrows]; // 記錄本回合以利過場
          setRoundStatus("wait-next");
        }
        return newThrows;
      });
    };
    return () => { granboard.segmentHitCallback = undefined };
  }, [granboard, score, roundThrows, roundStartingScore, roundStatus]);

  // 手動結束回合
  const handleEndRound = () => {
    if (roundStatus === "wait-next") return; //已經等下回合避免重複加分
    if (roundThrows.length > 0) {
      setRoundTotalList(list => [
        ...list,
        roundThrows.reduce((s, t) => s + t.value, 0)
      ]);
      setRound(r => r + 1);
      lastRoundThrowsRef.current = [...roundThrows];
      setRoundStatus("wait-next");
    }
    setLog(l => [`手動結束回合`, ...l]);
    setRoundThrows([]);
    setRoundStartingScore(score);
  };

  // 重置遊戲
  const handleResetGame = () => {
    setScore(START_SCORE);
    setRoundThrows([]);
    setRoundStartingScore(START_SCORE);
    setRound(1);
    setRoundTotalList([]);
    setLog(l => ["分數已重設", ...l]);
    setRoundStatus("playing");
    lastRoundThrowsRef.current = [];
  };

  // 藍牙連線
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

  // 產生歷史回合表格內容
  function generateHistoryTable() {
    const rows = [];
    let offset = round > 4 ? round - 4 : 0;
    for (let i = 0; i < TABLE_ROWS; i++) {
      const roundNum = offset + i + 1;
      let showR = roundNum <= TOTAL_ROUNDS ? `R${roundNum}` : "";
      let showScore: string | number = "-";
      if (roundTotalList.length > (offset + i) && (offset + i) < roundTotalList.length) {
        showScore = roundTotalList[offset + i];
      }
      if (roundNum > round || roundNum > TOTAL_ROUNDS) {
        showScore = "";
        showR = "";
      }
      rows.push({ roundNum: showR, score: showScore });
    }
    if (round >= 9) {
      rows.splice(4 + (TOTAL_ROUNDS - round), rows.length);
    }
    return rows;
  }

  // 歷史表色塊規則
  const BG_COL_1 = [
    "#b7bbc4", "#b7bbc4", "#b7bbc4", "#b7bbc4", "#8d8f93", "#29292C"
  ]; // 前4列與第5列加深
  const BG_COL_2 = [
    "#8d8f93", "#8d8f93", "#8d8f93", "#8d8f93", "#29292C", "#181818"
  ];
  const TXT_COLS = [
    "#fff", "#fff", "#fff", "#fff", "#FAF3E8", "#A7A7A6"
  ];

  // 呼吸動畫 focus
  const focusRowIdx = round <= 4 ? round - 1 : round <= TOTAL_ROUNDS ? 3 : null;

  // 右側三鏢分數顯示(依狀態/回合)
  const showThrows = roundStatus === "wait-next"
    ? lastRoundThrowsRef.current
    : roundThrows;

  const scoreStr = String(score).split("");
  const historyRows = generateHistoryTable();

  return (
    <div style={{
      background: "#181818",
      minHeight: "100vh",
      width: "100vw",
      position: "relative",
      margin: 0,
      padding: 0,
      fontFamily: "sans-serif",
      boxSizing: "border-box",
      overflowX: "hidden"
    }}>
      {/* 左側標頭與歷史表 + 動作紀錄 */}
      <section style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0,
        userSelect: "none"
      }}>
        {/* 501比賽標題 */}
        <div style={{
          width: "min(17vw,160px)",
          height: "min(5vw,40px)",
          background: "#DE5459",
          display: "flex",
          alignItems: "center",
          paddingLeft: "1vw",
          paddingTop: "0.5vw",
          paddingBottom: "0.5vw",
          color: "#fff",
          fontSize: "clamp(1.3rem,3vw,2rem)",
          fontWeight: 600,
          letterSpacing: "2px",
          boxSizing: "border-box"
        }}>
          501
        </div>
        <div style={{
          width: "min(17vw,160px)",
          height: "min(3vw,20px)",
          background: "#252525",
          color: "#AAAFB8",
          display: "flex",
          alignItems: "center",
          fontSize: "clamp(1.05rem,2vw,1.2rem)",
          paddingLeft: "1vw",
          paddingTop: "0.25vw",
          paddingBottom: "0.25vw",
          fontWeight: 500,
          letterSpacing: "1.5px"
        }}>
          {round}/{TOTAL_ROUNDS} ROUND
        </div>
        <div style={{ height: "min(3vw,20px)" }}></div>
        {/* 歷史回合分數表 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "60% 40%",
          width: "min(19vw,200px)",
          minWidth: 135,
          borderRadius: 11,
          overflow: "hidden",
          boxShadow: "0 4px 28px #0008",
        }}>
          {historyRows.map((item, idx) => {
            const isFocus = focusRowIdx === idx;
            let leftBg = BG_COL_1[idx];
            let leftColor = TXT_COLS[idx];
            let rightBg = BG_COL_2[idx];
            let rightColor = TXT_COLS[idx];
            if (isFocus) {
              leftBg = "#FAF3E8";
              leftColor = "#222";
            }
            return (
              <React.Fragment key={idx}>
                <div
                  style={{
                    height: "clamp(18px,2vw,27px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    backgroundColor: leftBg,
                    color: leftColor,
                    fontSize: "clamp(1.01rem,1.7vw,1.2rem)",
                    fontWeight: 510,
                    paddingRight: "min(2vw,20px)",
                    animation: isFocus ? "breathe 1.2s infinite linear alternate" : undefined,
                    borderTopLeftRadius: idx === 0 ? 11 : undefined,
                    borderBottomLeftRadius: (idx === historyRows.length - 1) ? 11 : undefined,
                    userSelect: "none"
                  }}>
                  {item.roundNum || (idx < 4 ? "-" : "")}
                </div>
                <div
                  style={{
                    height: "clamp(18px,2vw,27px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    backgroundColor: rightBg,
                    color: rightColor,
                    fontSize: "clamp(1.15rem,1.95vw,1.34rem)",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 610,
                    paddingRight: "min(2vw,20px)",
                    borderTopRightRadius: idx === 0 ? 11 : undefined,
                    borderBottomRightRadius: (idx === historyRows.length - 1) ? 11 : undefined,
                    userSelect: "none"
                  }}
                >
                  {item.score !== "" ? item.score : (idx < 4 ? "-" : "")}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ height: "min(2vw,14px)" }}></div>
        {/* 動作紀錄 */}
        <div style={{ width: "min(19vw,200px)" }}>
          <h3 style={{
            color: "#D9DFE6",
            fontWeight: 600,
            fontSize: "clamp(1.1rem,1.4vw,1.18rem)",
            marginBottom: 4,
            marginTop: 0,
            userSelect: "none"
          }}>動作紀錄：</h3>
          <ol style={{
            fontSize: "clamp(0.95rem,1.14vw,1.07rem)",
            background: "#212224",
            padding: "0.7em",
            borderRadius: 6,
            maxHeight: "10vw",
            overflowY: "auto",
            minHeight: 36,
            color: "#DDD",
            marginBottom: 0,
            userSelect: "text"
          }}>
            {log.slice(0, 7).map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        </div>
      </section>

      {/* 右上角選單按鈕 */}
      <div style={{
        position: "fixed",
        top: "min(15px,1.8vw)",
        right: "min(15px,2vw)",
        width: "min(40px,4vw)",
        height: "min(40px,4vw)",
        zIndex: 100,
        userSelect: "none"
      }}>
        <div style={{
          background: "#353535",
          borderRadius: 8,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 9px #0008"
        }}>
          {[0, 1, 2].map(i => (
            <div key={i}
              style={{
                width: "65%",
                height: "13%",
                borderRadius: 2,
                background: "#FAF3E8",
                marginTop: i === 0 ? 0 : "15%"
              }}>
            </div>
          ))}
        </div>
      </div>

      {/* 右側三鏢分數區 */}
      <div style={{
        position: "fixed",
        top: "calc(min(15px,1.8vw) + min(40px,4vw) + min(20px,2vw))",
        right: "min(15px,2vw)",
        width: "min(140px,13vw)",
        display: "flex",
        flexDirection: "column",
        gap: "min(16px,1.8vw)",
        userSelect: "none"
      }}>
        {[0, 1, 2].map(i => (
          <div key={i}
            style={{
              width: "100%",
              height: "clamp(24px,2.9vw,30px)",
              background: "#27282B",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(1.1rem,1.9vw,1.28rem)",
              borderRadius: 8,
              opacity: showThrows[i] !== undefined ? 1 : 0.48,
            }}
          >
            {showThrows[i]
              ? `${showThrows[i].longName}(${showThrows[i].value})`
              : "-"}
          </div>
        ))}
      </div>

      {/* 畫面最下方灰色色塊 */}
      <div style={{
        position: "fixed",
        bottom: 0,
        width: "100vw",
        left: 0,
        height: "clamp(80px,9vw,100px)",
        background: "#3A3A40",
        zIndex: 20,
        userSelect: "none"
      }}></div>

      {/* 右下角控制按鈕區 */}
      <div style={{
        position: "fixed",
        right: "min(32px,3vw)",
        bottom: "clamp(96px,11vw,136px)",
        width: "min(350px,38vw)",
        minWidth: 150,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "min(18px,2vw)"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "min(14px,1.6vw)"
        }}>
          <button onClick={handleConnect} disabled={!!granboard || connecting}
            style={{
              background: "#157DD7",
              color: "#FFF",
              fontSize: "clamp(1.2rem,1.88vw,1.45rem)",
              fontWeight: 600,
              padding: "0.35em 2em",
              border: "none",
              borderRadius: 6,
              boxShadow: "0 6px 16px #0006",
              cursor: granboard ? "not-allowed" : "pointer",
              opacity: granboard ? 0.45 : 1,
              userSelect: "none"
            }}
          >
            {connecting ? "連線中..." : granboard ? "已連線" : "連接藍牙飛鏢板"}
          </button>
          <button onClick={handleEndRound}
            style={{
              background: "#888",
              color: "#FFF",
              fontSize: "clamp(1.02rem,1.56vw,1.25rem)",
              fontWeight: 500,
              padding: "0.38em 1.4em",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              userSelect: "none"
            }}>
            手動結束回合
          </button>
          <button onClick={handleResetGame}
            style={{
              background: "#dadbdb",
              color: "#222",
              fontSize: "clamp(1.02rem,1.56vw,1.25rem)",
              fontWeight: 500,
              padding: "0.38em 1.4em",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              userSelect: "none"
            }}>
            重新開始
          </button>
        </div>
        {(error && !granboard) && (
          <div style={{
            color: "red",
            fontWeight: 600,
            fontSize: "clamp(1.11rem,1.58vw,1.21rem)",
            marginTop: 5,
            marginRight: 2,
            userSelect: "text"
          }}>
            {error}
          </div>
        )}
      </div>

      {/* 中央大分數字字串，響應式字型，字元間距50px */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: "clamp(80px,9vw,100px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 10
      }}>
        <div style={{
          display: "flex",
          flexDirection: "row",
          gap: "clamp(38px,4vw,50px)",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {scoreStr.map((char, idx) => (
            <span key={idx} style={{
              color: "#D9DFE6",
              fontSize: "clamp(130px,28vw,500px)",
              fontWeight: 800,
              lineHeight: 1,
              textShadow: "0 4px 48px #000a, 0 8px 80px #4444, 0 1.5vw 5vw #0007",
              letterSpacing: "-0.09em",
              textAlign: "center",
              fontFamily: "inherit",
              userSelect: "none"
            }}>{char}</span>
          ))}
        </div>
      </div>

      {/* 呼吸動畫效果 */}
      <style>{`
        @keyframes breathe {
          0%   { background-color: #FAF3E8; }
          50%  { background-color: #fff9f0; }
          100% { background-color: #E3DECF; }
        }
        button:disabled {
          cursor: not-allowed !important;
        }
      `}</style>
      {/* RWD media query：手機縮放 */}
      <style>{`
        @media (max-width: 600px) {
          div[style*="minHeight: 100vh"] {
            font-size: 14px !important;
          }
          div[style*="position: absolute"] span {
            font-size: 18vw !important;
          }
          section {
            width: 98vw !important;
            min-width: 0 !important;
          }
          div[style*="minWidth: 135"] {
            width: 96vw !important;
            min-width: 0 !important;
          }
          div[style*="position: fixed"][style*="right"] {
            width: 100% !important;
            bottom: 0 !important;
            flex-direction: row !important;
            justify-content: space-evenly !important;
            align-items: center !important;
            min-width: auto !important;
            padding: 6px 0 !important;
            gap: 12px !important;
          }
          div[style*="position: fixed"][style*="top"][style*="right"] {
            flex-direction: row !important;
            width: 100% !important;
            height: auto !important;
            gap: 12px !important;
          }
          div[style*="position: fixed"][style*="top"][style*="right"] > div {
            flex: 1;
            height: 36px !important;
          }
        }
      `}</style>
    </div>
  );
}
