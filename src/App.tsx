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

      let nextScore = score - segment.Value;

      if (
        nextScore < 0 ||
        nextScore === 1 ||
        (nextScore === 0 && segment.Type !== SegmentType.Double)
      ) {
        setLog(l => [
          `爆鏢 BUST！（本回合所有分數作廢，分數回到${roundStartingScore}）`,
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
            value: segment.Value,
            longName: segment.LongName,
            segmentType: segment.Type,
          }
        ];
        setLog(l => [
          `命中 ${segment.LongName}（分值${segment.Value}），剩餘：${nextScore}`,
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
              ? "恭喜結束遊戲！（最後一鏢必須雙倍區）"
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

  // 色系設定
  const RED = "#C62F33";
  const BANNER_RED = "#DE5459";
  const ROUND_GRAY = "#252525";
  const BG_DARK = "#181818";
  const MENU_BTN_GRAY = "#353535";
  const WHITE = "#FAF3E8";
  const CURRENT_SCORE = "#D9DFE6";
  const SCORE_SHADOW = "0 4px 24px #000a, 0 8px 40px #4444";

  // 分數每字分開
  const scoreStr = String(score).split("");

  return (
    <div
      style={{
        background: BG_DARK,
        minHeight: "100vh",
        position: "relative",
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
        fontFamily: "sans-serif",
        width: "100vw",
        overflowX: "hidden"
      }}
    >
      {/* 左上角 501 比賽名稱 */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 160,
        height: 40,
        background: BANNER_RED,
        display: "flex",
        alignItems: "center",
        paddingLeft: 10,
        paddingTop: 5,
        paddingBottom: 5,
        zIndex: 20,
        color: "#fff",
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: "2px",
        boxSizing: "border-box"
      }}>
        501
      </div>
      {/* 下方 ROUND */}
      <div style={{
        position: "fixed",
        top: 40,
        left: 0,
        width: 160,
        height: 20,
        background: ROUND_GRAY,
        color: "#AAAFB8",
        display: "flex",
        alignItems: "center",
        fontSize: 16,
        boxSizing: "border-box",
        paddingLeft: 10,
        paddingTop: 2,
        paddingBottom: 2,
        fontWeight: 500,
        letterSpacing: "1.5px"
      }}>
        {round}/{TOTAL_ROUNDS} ROUND
      </div>
      {/* 歷史回合總分表 */}
      <div style={{
        position: "fixed",
        top: 60 + 20,
        left: 0,
        marginTop: 20,
        width: 200,
        height: 120,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
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
                width: 200,
                height: 20,
                background: idx % 2 === 0 ? "#25292A" : "#313335"
              }}
            >
              <div style={{
                width: 80,
                textAlign: "right",
                fontSize: 18,
                color: "#BBBFCC",
                paddingRight: 20,
                paddingTop: 15,
                paddingBottom: 15,
                boxSizing: "border-box"
              }}>
                {roundNum ? `R${roundNum}` : ""}
              </div>
              <div style={{
                width: 120,
                textAlign: "right",
                fontSize: 22,
                color: "#fff",
                paddingRight: 20,
                paddingTop: 15,
                paddingBottom: 15,
                fontVariantNumeric: "tabular-nums",
                boxSizing: "border-box"
              }}>
                {scoreVal !== "" ? scoreVal : ""}
              </div>
            </div>
          )
        })}
        {/* 動作紀錄（此處加 20px 空隙） */}
        <div style={{ height: 20 }}></div>
        <div style={{
          width: 200,
          position: "relative",
          bottom: 0
        }}>
          <h3 style={{
            color: "#D9DFE6",
            fontWeight: 600,
            fontSize: 16,
            marginBottom: 4,
            marginTop: 0
          }}>動作紀錄：</h3>
          <ol style={{
            fontSize: "1.1em",
            background: "#212224",
            padding: "1em",
            borderRadius: 6,
            maxHeight: 110,
            overflowY: "auto",
            minHeight: 36,
            color: "#DDD",
            marginBottom: 0
          }}>
            {log.slice(0, 7).map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        </div>
      </div>

      {/* 右上角選單按鈕 */}
      <div style={{
        position: "fixed",
        top: 15,
        right: 15,
        width: 40,
        height: 40,
        zIndex: 100
      }}>
        <div style={{
          background: MENU_BTN_GRAY,
          borderRadius: 8,
          width: 40,
          height: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 9px #0008"
        }}>
          {[0, 1, 2].map(i => (
            <div key={i}
              style={{
                width: 26,
                height: 4,
                borderRadius: 2,
                background: WHITE,
                marginTop: i === 0 ? 0 : 6
              }}>
            </div>
          ))}
        </div>
      </div>
      {/* 三鏢分數區（選單下方） */}
      <div style={{
        position: "fixed",
        top: 75,
        right: 15,
        width: 140,
        display: "flex",
        flexDirection: "column",
        gap: 15
      }}>
        {[0, 1, 2].map(i => (
          <div key={i}
            style={{
              width: 140,
              height: 30,
              background: "#27282B",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
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
        height: 100,
        background: "#3A3A40",
        zIndex: 20
      }}></div>

      {/* 右下角控制按鈕區 */}
      <div style={{
        position: "fixed",
        right: 32,
        bottom: 136,
        width: 350,
        minWidth: 250,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 18
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 14
        }}>
          <button onClick={handleConnect} disabled={!!granboard || connecting}
            style={{
              background: "#157DD7",
              color: "#FFF",
              fontSize: 22,
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
              fontSize: 18,
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
              fontSize: 18,
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
            fontSize: 18,
            marginTop: 5,
            marginRight: 2
          }}>
            {error}
          </div>
        )}
      </div>

      {/* 分數大字置中，每個數字有間距 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 100,
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
          gap: 50,
          alignItems: "center",
          justifyContent: "center"
        }}>
          {scoreStr.map((char, idx) => (
            <span key={idx}
              style={{
                color: CURRENT_SCORE,
                fontSize: 500,
                fontWeight: 800,
                lineHeight: "1.05",
                textShadow: SCORE_SHADOW,
                letterSpacing: "-0.1em",
                textAlign: "center",
                fontFamily: "inherit"
              }}>
              {char}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
