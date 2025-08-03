import React, { useEffect, useState } from "react";
import { Granboard } from "./Granboard";
import { SegmentID, SegmentType } from "./DartboardUtilities";

const START_SCORE = 501;
const TOTAL_ROUNDS = 10;
const HISTORY_ROWS = 6;

type Throw = {
  value: number;
  longName: string;
  segmentType: SegmentType;
  id: SegmentID;
};

export default function App() {
  const [score, setScore] = useState(START_SCORE);
  const [roundThrows, setRoundThrows] = useState<Throw[]>([]);
  const [granboard, setGranboard] = useState<Granboard | undefined>();
  const [log, setLog] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundStartingScore, setRoundStartingScore] = useState<number>(START_SCORE);
  const [histories, setHistories] = useState<number[]>([]);
  const [round, setRound] = useState(1);

  useEffect(() => {
    return () => {
      if (granboard) granboard.segmentHitCallback = undefined;
    };
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

      // fat bull: 任何 bull 訊號都算 50 分
      let segType = segment.Type;
      let segValue = segment.Value;
      let segId = segment.ID;
      if (segId === SegmentID.BULL || segId === SegmentID.DBL_BULL) {
        segValue = 50;
        segType = SegmentType.Other;
      }

      let nextScore = score - segValue;

      // Master out 判斷
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
        if (nextScore === 0 || newThrows.length >= 3) {
          setHistories(h => {
            const roundTotal = score - nextScore;
            const old = [...h];
            old.push(roundTotal);
            return old.slice(-HISTORY_ROWS);
          });
          setRound(r => Math.min(r + 1, TOTAL_ROUNDS));
          setLog(l => [
            nextScore === 0
              ? "恭喜結束遊戲！（最後一鏢必須雙倍、三倍或紅心區）"
              : "本回合結束（3鏢）",
            ...l
          ]);
          setTimeout(() => setRoundThrows([]), 400);
        }
        return newThrows;
      });
    };
    return () => {
      granboard.segmentHitCallback = undefined;
    };
  }, [granboard, score, roundThrows, roundStartingScore]);

  const handleEndRound = () => {
    if (roundThrows.length > 0) {
      setHistories(h => {
        const total = roundThrows.reduce((s, t) => s + t.value, 0);
        const old = [...h];
        old.push(total);
        return old.slice(-HISTORY_ROWS);
      });
      setRound(r => Math.min(r + 1, TOTAL_ROUNDS));
    }
    setLog(l => [`手動結束回合`, ...l]);
    setRoundThrows([]);
    setRoundStartingScore(score);
  };

  const handleResetGame = () => {
    setScore(START_SCORE);
    setRoundThrows([]);
    setRoundStartingScore(START_SCORE);
    setRound(1);
    setHistories([]);
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

  // 色系
  const RED = "#C62F33";
  const BANNER_RED = "#DE5459";
  const ROUND_GRAY = "#252525";
  const BG_DARK = "#181818";
  const MENU_BTN_GRAY = "#353535";
  const WHITE = "#FAF3E8";
  const CURRENT_SCORE = "#D9DFE6";
  const SCORE_SHADOW = "0 4px 48px #000a, 0 8px 80px #4444, 0 1.5vw 5vw #0007";

  const scoreStr = String(score).split("");

  return (
    <div
      style={{
        background: BG_DARK,
        minHeight: "100vh",
        width: "100vw",
        position: "relative",
        margin: 0,
        padding: 0,
        fontFamily: "sans-serif",
        boxSizing: "border-box",
        overflowX: "hidden"
      }}
    >
      {/* 上方左列 */}
      <section style={{
        position: "fixed",
        top: 0, left: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0
      }}>
        <div style={{
          width: "min(17vw,160px)",
          height: "min(5vw,40px)",
          background: BANNER_RED,
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
          background: ROUND_GRAY,
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
        {/* 歷史分數 + 動作紀錄區 */}
        <div style={{
          width: "min(19vw,200px)",
          minWidth: 135,
          height: "min(12vw,120px)",
          display: "flex",
          flexDirection: "column"
        }}>
          {[...Array(HISTORY_ROWS)].map((_, idx) => {
            const i = HISTORY_ROWS - idx - 1;
            const roundNum = (histories.length - i > 0) ? histories.length - i : "";
            const scoreVal = (histories.length - i > 0) ? histories[i] : "";
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: "100%",
                  background: idx % 2 === 0 ? "#25292A" : "#313335",
                  height: "16.5%",
                  alignItems: "center"
                }}
              >
                <div style={{
                  width: "40%",
                  textAlign: "right",
                  fontSize: "clamp(1.01rem,1.9vw,1.2rem)",
                  color: "#BBBFCC",
                  paddingRight: "min(2vw,20px)",
                  paddingTop: "0.7vw",
                  paddingBottom: "0.7vw",
                  boxSizing: "border-box"
                }}>
                  {roundNum ? `R${roundNum}` : ""}
                </div>
                <div style={{
                  width: "60%",
                  textAlign: "right",
                  fontSize: "clamp(1.2rem,2vw,1.38rem)",
                  color: "#fff",
                  paddingRight: "min(2vw,20px)",
                  fontVariantNumeric: "tabular-nums",
                  paddingTop: "0.7vw",
                  paddingBottom: "0.7vw",
                  boxSizing: "border-box"
                }}>
                  {scoreVal !== "" ? scoreVal : ""}
                </div>
              </div>
            )
          })}
          {/* 動作紀錄 */}
          <div style={{ height: "min(2vw,20px)" }}></div>
          <div>
            <h3 style={{
              color: "#D9DFE6",
              fontWeight: 600,
              fontSize: "clamp(1.1rem,1.4vw,1.18rem)",
              marginBottom: 4,
              marginTop: 0
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
              width: "min(19vw,200px)"
            }}>
              {log.slice(0, 7).map((line, i) => <li key={i}>{line}</li>)}
            </ol>
          </div>
        </div>
      </section>

      {/* 右上角選單 */}
      <div style={{
        position: "fixed",
        top: "min(15px,1.8vw)",
        right: "min(15px,2vw)",
        width: "min(40px,4vw)", height: "min(40px,4vw)",
        zIndex: 100
      }}>
        <div style={{
          background: MENU_BTN_GRAY,
          borderRadius: 8,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 9px #0008"
        }}>
          {[0, 1, 2].map(i => (
            <div key={i}
              style={{
                width: "65%", height: "13%",
                borderRadius: 2,
                background: WHITE,
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
        display: "flex", flexDirection: "column",
        gap: "min(16px,1.8vw)"
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
              opacity: roundThrows[i] !== undefined ? 1 : 0.48
            }}
          >
            {roundThrows[i]
              ? `${roundThrows[i].longName}(${roundThrows[i].value})`
              : "-"}
          </div>
        ))}
      </div>

      {/* 畫面最下方灰色 bar */}
      <div style={{
        position: "fixed",
        bottom: 0,
        width: "100vw",
        left: 0,
        height: "clamp(80px,9vw,100px)",
        background: "#3A3A40",
        zIndex: 20
      }}></div>

      {/* 右下角控制區 */}
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
              opacity: granboard ? 0.45 : 1
            }}
          >
            {connecting
              ? "連線中..."
              : granboard ? "已連線" : "連接藍牙飛鏢板"}
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
              cursor: "pointer"
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
              cursor: "pointer"
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
            marginRight: 2
          }}>
            {error}
          </div>
        )}
      </div>

      {/* 分數大字置中，RWD vw 單位，每個字 flex-row 有空隙 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: "clamp(80px,9vw,100px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          pointerEvents: "none"
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: "row",
          gap: "clamp(38px,4vw,50px)",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {scoreStr.map((char, idx) => (
            <span key={idx}
              style={{
                color: CURRENT_SCORE,
                fontSize: "clamp(130px,28vw,500px)",
                fontWeight: 800,
                lineHeight: 1,
                textShadow: SCORE_SHADOW,
                letterSpacing: "-0.09em",
                textAlign: "center",
                fontFamily: "inherit"
              }}>
              {char}
            </span>
          ))}
        </div>
      </div>

      {/* media query 的 RWD style（針對手機直式） */}
      <style>
        {`
        @media (max-width: 600px) {
          div[style*="minHeight: 100vh"] {
            font-size: 14px !important;
          }
          div[style*="分數大字置中"] span {
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
        }
      `}
      </style>
    </div>
  );
}
