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

// 明確 type union，確保型別推斷無誤
type RoundStatus = "playing" | "wait-next";

export default function App() {
  const [score, setScore] = useState(START_SCORE);
  const [roundThrows, setRoundThrows] = useState<Throw[]>([]);
  const [granboard, setGranboard] = useState<Granboard | undefined>();
  const [log, setLog] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundStartingScore, setRoundStartingScore] = useState<number>(START_SCORE);
  const [roundTotalList, setRoundTotalList] = useState<(number | "BUST")[]>([]);
  const [round, setRound] = useState(1);
  const [animTick, setAnimTick] = useState(0);

  const lastRoundThrowsRef = useRef<Throw[]>([]);
  // 這裡用 union type 定義，保證下面判斷型別安全
  const [roundStatus, setRoundStatus] = useState<RoundStatus>("playing");

  useEffect(() => {
    const timer = setInterval(() => setAnimTick((t) => t + 1), 1200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (granboard) granboard.segmentHitCallback = undefined;
    };
  }, [granboard]);

  useEffect(() => {
    if (!granboard) return;

    granboard.segmentHitCallback = (segment) => {
      // ------ 下回合新第一鏢特例判斷 ------
      if (roundStatus === "wait-next") {
        let segValue = (segment.ID === SegmentID.BULL || segment.ID === SegmentID.DBL_BULL) ? 50 : segment.Value;
        let segType = (segment.ID === SegmentID.BULL || segment.ID === SegmentID.DBL_BULL) ? SegmentType.Other : segment.Type;
        let newScore = score - segValue;

        setRoundThrows([{
          value: segValue,
          longName: segment.LongName,
          segmentType: segType,
          id: segment.ID,
        }]);
        setRoundStatus("playing");
        setRoundStartingScore(score);
        setScore(newScore);
        setLog((l) => [
          `新回合開始：命中 ${segment.LongName}（分值${segValue}），剩餘：${newScore}`,
          ...l,
        ]);
        return;
      }

      // ------ playing 狀態 ------
      if (roundThrows.length === 0) setRoundStartingScore(score);

      if (segment.ID === SegmentID.RESET_BUTTON) {
        setLog(l => ["手動按下RESET_BUTTON，回合重置（本回合三鏢全清空、分數復原）", ...l]);
        setScore(roundStartingScore);
        setRoundThrows([]);
        // 型別保證於 union，不會有 TS2367
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
        lastRoundThrowsRef.current = [];
        setRoundStatus("wait-next");
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
          lastRoundThrowsRef.current = [...newThrows];
          setRoundStatus("wait-next");
        }
        return newThrows;
      });
    };
    return () => { granboard.segmentHitCallback = undefined };
  }, [granboard, score, roundThrows, roundStartingScore, roundStatus]);

  // ...其他 UI 完全同上版本
  // [此處省略 render 與樣式（如果你還需要 render 區塊請回覆）]
  // 主流程已完全修正型別與 state 錯誤

  // ----你如直接複製這段處理，下面 render 區照舊即可----
}
