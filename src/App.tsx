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

interface HistoryEntry {
  // 這一列要顯示哪一回合
  roundNum: number | null; // (null=這格無用)
  roundScore: number | null; // null=橫線,-1=空格
}

export default function App() {
  const [score, setScore] = useState(START_SCORE);
  const [roundThrows, setRoundThrows] = useState<Throw[]>([]);
  const [granboard, setGranboard] = useState<Granboard | undefined>();
  const [log, setLog] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 本回合起始分數
  const [roundStartingScore, setRoundStartingScore] = useState<number>(START_SCORE);
  // 歷史每回合三鏢加總
  const [roundTotalList, setRoundTotalList] = useState<number[]>([]);
  // 回合數（第 N 回合打到第 N 鏢時 是第 N 回合，回合結束馬上+1）
  const [round, setRound] = useState(1);
  // focus的row
  const tableAnimRef = useRef<number | null>(null);
  // 是否剛開始進入下一回合（閃爍動畫用）
  const [animTick, setAnimTick] = useState(0);

  // 呼吸動畫tick
  useEffect(() => {
    const timer = setInterval(() => setAnimTick((t) => t + 1), 1200);
    return () => clearInterval(timer);
  }, []);

  // Granboard 事件接收
  useEffect(() => {
    return () => { if (granboard) granboard.segmentHitCallback = undefined };
  }, [granboard]);
  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment) => {
      if (roundThrows.length === 0) setRoundStartingScore(score);

      if (segment.ID === SegmentID.RESET_BUTTON) {
        setLog(l => ["手動按下RESET_BUTTON，回合重置", ...l]);
        setRoundThrows([]);
        setRoundStartingScore(score);
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

      if (
        nextScore < 0 ||
        nextScore === 1 ||
        (nextScore === 0 && !isMasterOut)
      ) {
        setLog(l => [
          nextScore === 0 && !isMasterOut
            ? "爆鏢 BUST！（須於雙倍、三倍、紅心結標，本回合分數作廢，分數回到" + roundStartingScore + "）"
            : `爆鏢 BUST！（本回合所有分數作廢，分數回到${roundStartingScore}）`,
          ...l
        ]);
        setScore(roundStartingScore);
        setTimeout(() => setRoundThrows([]), 400);
        setRoundThrows([]);
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
        // 回合結束(三鏢或勝利)，立即記錄加總與下一輪動畫刷新
        if (nextScore === 0 || newThrows.length >= 3) {
          setRoundTotalList(list => [
            ...list,
            newThrows.reduce((s, t) => s + t.value, 0)
          ]);
          setRound(r => (r + 1));
          setLog(l => [
            nextScore === 0
              ? "恭喜結束遊戲！（最後一鏢必須雙倍、三倍或紅心區）"
              : "本回合結束（3鏢）",
            ...l
          ]);
          setRoundStartingScore(nextScore);
          setTimeout(() => setRoundThrows([]), 400);
          // 呼吸動畫 focus 到新行
          tableAnimRef.current = null;
          setTimeout(() => {
            tableAnimRef.current = null;
            setAnimTick((t) => t + 1);
          }, 100);
        }
        return newThrows;
      });
    };
    return () => { granboard.segmentHitCallback = undefined };
  }, [granboard, score, roundThrows, roundStartingScore]);

  // 手動結束回合
  const handleEndRound = () => {
    if (roundThrows.length > 0) {
      setRoundTotalList(list => [
        ...list,
        roundThrows.reduce((s, t) => s + t.value, 0)
      ]);
      setRound(r => r + 1);
    }
    setLog(l => [`手動結束回合`, ...l]);
    setRoundThrows([]);
    setRoundStartingScore(score);
    tableAnimRef.current = null;
    setTimeout(() => {
      tableAnimRef.current = null;
      setAnimTick((t) => t + 1);
    }, 100);
  };

  // 重置遊戲
  const handleResetGame = () => {
    setScore(START_SCORE);
    setRoundThrows([]);
    setRoundStartingScore(START_SCORE);
    setRound(1);
    setRoundTotalList([]);
    setLog(l => ["分數已重設", ...l]);
    tableAnimRef.current = null;
    setTimeout(() => {
      tableAnimRef.current = null;
      setAnimTick((t) => t + 1);
    }, 100);
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

  // ----------- 歷史回合區資料與樣式計算 -------------
  // 構建資料行（每列 row：左R編號/右分數/-/空格/等內容）
  function getHistoryTableContent(): [string, string, string, string, string, string][] {
    // 起算資料的顯示起始回合
    let roundOffset = 0;
    if (round > 4) roundOffset = round - 4;

    // 構建欄目
    const rows: [string, string, string, string, string, string][] = [];
    for (let i = 0; i < TABLE_ROWS; ++i) {
      let rnum = roundOffset + i + 1;
      let showR = "";
      let showScore = "-";
      // 第五回合以前顯示R1~R6; 之後 R2~R7 (依 offset),並且確保總共不超過10回合
      if (rnum <= TOTAL_ROUNDS) showR = "R" + rnum;
      else showR = "";
      // 只有已結束回合才有分數
      if (i < roundTotalList.length - roundOffset && (roundOffset + i) < roundTotalList.length) {
        if (typeof roundTotalList[roundOffset + i] === "number") {
          showScore = `${roundTotalList[roundOffset + i]}`;
        }
      }
      // 若回合沒打過顯示 "-", 如果剩下要刪除列，顯示為 ""
      if (showR === "" || (rnum > round && i >= 4)) {
        showScore = "";
        showR = "";
      }
      rows.push([showR, showScore, "", "", "", ""]);
    }

    // 把第六、五列依規則不顯示（9/10回合限制）
    if (round >= 9) {
      // 只保留前五/四列
      while (rows.length > 4 + (TOTAL_ROUNDS - round)) rows.pop();
    }
    return rows;
  }

  // ----------- 歷史回合區色塊與動畫設定 -------------
  const BG_COLORS_1 = ["#EEEEF1", "#EEEEF1", "#EEEEF1", "#EEEEF1", "#bdbcc2", "#29292C"];
  const BG_COLORS_2 = ["#bdbcc2", "#bdbcc2", "#bdbcc2", "#bdbcc2", "#29292C", "#181818"];
  const TXT_COLORS = ["#fff", "#fff", "#fff", "#fff", "#FAF3E8", "#A7A7A6"];
  // 呼吸動畫的米白底+黑字 focus 行，回合進行時要提示
  const BREATHE_BG = "#FAF3E8";
  const BREATHE_TXT = "#222";
  // 哪一列要閃爍提示
  function getFocusRowIdx(curRound: number): number | null {
    if (curRound <= 4) return curRound - 1; // 第1-4回合用前4列提示
    if (curRound >= 5 && curRound <= TOTAL_ROUNDS) return 3; // 第4列一直提示中（第5列才換新一group）
    return null;
  }
  // ---------- end ------------

  const scoreStr = String(score).split("");

  // ----------- RENDER --------------
  const currentTableRows = getHistoryTableContent();
  const focusRow = getFocusRowIdx(round);
  return (
    <div
      style={{
        background: "#181818",
        minHeight: "100vh", width: "100vw", position: "relative",
        margin: 0, padding: 0, fontFamily: "sans-serif", boxSizing: "border-box", overflowX: "hidden"
      }}
    >
      {/* 左上標頭區略（與舊版一致） */}
      <section style={{
        position: "fixed", top: 0, left: 0, zIndex: 30,
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0
      }}>
        <div style={{
          width: "min(17vw,160px)", height: "min(5vw,40px)", background: "#DE5459",
          display: "flex", alignItems: "center", paddingLeft: "1vw", paddingTop: "0.5vw", paddingBottom: "0.5vw",
          color: "#fff", fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 600, letterSpacing: "2px", boxSizing: "border-box"
        }}>
          501
        </div>
        <div style={{
          width: "min(17vw,160px)", height: "min(3vw,20px)", background: "#252525", color: "#AAAFB8",
          display: "flex", alignItems: "center", fontSize: "clamp(1.05rem,2vw,1.2rem)",
          paddingLeft: "1vw", paddingTop: "0.25vw", paddingBottom: "0.25vw", fontWeight: 500, letterSpacing: "1.5px"
        }}>
          {round}/{TOTAL_ROUNDS} ROUND
        </div>
        <div style={{ height: "min(3vw,20px)" }}></div>
        {/* --------- 歷史回合表格 start --------- */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "60% 40%",
          gridTemplateRows: `repeat(${currentTableRows.length}, minmax(0,auto))`,
          width: "min(19vw,200px)",
          minWidth: 135,
          borderRadius: 11,
          overflow: "hidden",
          boxShadow: "0 4px 28px #0008"
        }}>
          {currentTableRows.map((row, idx) => {
            // focus active行的特殊動畫
            const breathing = focusRow !== null && idx === focusRow;
            // 第1欄(左R)
            let c1bg = BG_COLORS_1[idx];
            let c1fg = TXT_COLORS[idx];
            let c2bg = BG_COLORS_2[idx];
            let c2fg = TXT_COLORS[idx];
            if (breathing) { c1bg = BREATHE_BG; c1fg = BREATHE_TXT }
            // 呼吸動畫樣式
            const breatheAnim = breathing
              ? { animation: "breathe 1.2s infinite linear alternate" }
              : {};
            return [
              <div key={`r${idx}c0`}
                style={{
                  height: `clamp(18px,2vw,27px)`, display: "flex", alignItems: "center", justifyContent: "flex-end",
                  background: c1bg, color: c1fg, fontSize: "clamp(1.01rem,1.7vw,1.2rem)",
                  fontWeight: 510, paddingRight: "min(2vw,20px)", ...breatheAnim,
                  userSelect: "none", borderRadius: [4,4,0,0].map((r,i)=>idx===0&&i<2?11:0).toString()
                }}>
                {(row[0] !== "" ? row[0] : (idx < 4 ? "-" : ""))}
              </div>,
              <div key={`r${idx}c1`}
                style={{
                  height: `clamp(18px,2vw,27px)`, display: "flex", alignItems: "center", justifyContent: "flex-end",
                  background: c2bg, color: c2fg, fontSize: "clamp(1.15rem,1.95vw,1.34rem)",
                  fontVariantNumeric: "tabular-nums", fontWeight: 610, paddingRight: "min(2vw,20px)",
                  userSelect: "none", borderRadius: [0,0,4,4].map((r,i)=>idx===currentTableRows.length-1&&i>1?11:0).toString()
                }}>
                {row[1] !== "" ? row[1] : (idx < 4 ? "-" : "")}
              </div>
            ]
          })}
        </div>
        {/* --------- 歷史回合表格 end --------- */}
        {/* 動作紀錄 */}
        <div style={{ height: "min(2vw,14px)" }}></div>
        <div>
          <h3 style={{
            color: "#D9DFE6", fontWeight: 600, fontSize: "clamp(1.1rem,1.4vw,1.18rem)", marginBottom: 4, marginTop: 0
          }}>動作紀錄：</h3>
          <ol style={{
            fontSize: "clamp(0.95rem,1.14vw,1.07rem)", background: "#212224", padding: "0.7em",
            borderRadius: 6, maxHeight: "10vw", overflowY: "auto", minHeight: 36, color: "#DDD", marginBottom: 0,
            width: "min(19vw,200px)"
          }}>
            {log.slice(0, 7).map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        </div>
      </section>

      {/* 右上角選單/三鏢分數/控制按鈕/大分數設計同舊規格省略…（保留響應式、其他佈局如你先前需求） */}

      {/* 呼吸動畫效果定義 */}
      <style>
        {`
      @keyframes breathe {
        0%   { background-color: #FAF3E8; }
        50%  { background-color: #fff9f0; }
        100% { background-color: #E3DECF; }
      }
      `}
      </style>
    </div>
  );
}
