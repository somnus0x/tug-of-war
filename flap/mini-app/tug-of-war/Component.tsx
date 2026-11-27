"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { concat, decodeEventLog, formatEther, getAddress, isAddress, keccak256, parseEther, bytesToHex, hexToBytes, type Address, type Hex } from "viem";
import { useFlapSdk, useMiniAppRouter } from "@/src/sdk";
import { FACTORY_ABI, LAUNCHER_ABI, PORTAL_ABI } from "./VaultABI";

// Deployed on BSC testnet. Both addresses are declared in manifest.walletContracts and written inline at each call for the checker.
const CHAIN_ID = 97;
const FACTORY: Address = "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431";
const PORTAL: Address = "0x000042108465206185A077Edc3F3fd2b49060000";

const BLUE = 1;
const RED = 2;
const PHASE = { awaitingCaptains: 0, buyIn: 1, awaitingLaunch: 2, refunding: 3, launched: 4, cancelled: 5 } as const;
const POLL_MS = 6000;
const PHASE_KEYS = ["phase0", "phase1", "phase2", "phase3", "phase4", "phase5"] as const;
const phaseKey = (p: number) => PHASE_KEYS[p] ?? "phase0";
const SALT_CHUNK = 2048;

const C = { ground: "#120c22", panel: "#1f1739", line: "#3a2f63", cream: "#f5f0dc", soft: "#c9bfe6", lime: "#c6ff3d", blue: "#4a8dff", red: "#ff5468", gold: "#ffc83d" };
const font = '"Courier New", ui-monospace, SFMono-Regular, Menlo, monospace';

type Sdk = ReturnType<typeof useFlapSdk>;
type Handle = Awaited<ReturnType<Sdk["resolveContract"]>>;
type Route = { page: "home" } | { page: "create" } | { page: "game"; launcher: Address } | { page: "missing" };

type Config = {
  name: string; symbol: string; meta: string; salt: Hex; duration: bigint; minRaise: bigint; walletCap: bigint;
  captainBlue: Address; captainRed: Address; vaultFactory: Address; maxBonusShareBps: number; captainMinDeposit: bigint;
  acceptWindow: bigint; captainAllocBps: number; captainVestDuration: bigint; captainShareBps: number;
};
type Pair = { blue: bigint; red: bigint };
type Game = {
  launcher: Address; creator: Address; config: Config; phase: number; captainDeposited: { blue: boolean; red: boolean };
  acceptDeadline: bigint; gameStart: bigint; deadline: bigint; currentWeightBps: number; raised: bigint;
  raisedByTeam: Pair; pullByTeam: Pair; playersByTeam: Pair; ropeBps: number; token: Address; vault: Address; finalBlueShareBps: number;
};
type Player = { team: number; contribution: bigint; pull: bigint; claimable: bigint; refundable: bigint; remainingCap: bigint };

// ---------- helpers ----------

const bnb = (wei: bigint | null | undefined, digits = 4) => {
  if (wei === null || wei === undefined) return "—";
  const [whole, frac = ""] = formatEther(wei).split(".");
  const cut = frac.slice(0, digits).replace(/0+$/, "");
  return `${whole}${cut ? "." + cut : ""} tBNB`;
};
const pct = (bps: number) => `${(bps / 100).toFixed(1)}%`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const same = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const zero = (a: string) => /^0x0{40}$/i.test(a);
const parseBnb = (text: string): bigint | null => {
  const t = text.trim();
  if (!/^(0|[1-9][0-9]{0,6})(\.[0-9]{1,18})?$/.test(t)) return null;
  try { return parseEther(t); } catch { return null; }
};
const errText = (e: unknown) => {
  if (e && typeof e === "object") {
    const m = (e as { shortMessage?: unknown; message?: unknown }).shortMessage ?? (e as { message?: unknown }).message;
    if (typeof m === "string") return m.split("\n")[0].slice(0, 180);
  }
  return "";
};

function useRoute(): { route: Route; go: (path: string) => void } {
  // The Flap host provides a router at /apps/tug-of-war/*. Older hosts do not; fall back to in-app state.
  let router: ReturnType<typeof useMiniAppRouter> | null = null;
  try { router = useMiniAppRouter(); } catch { router = null; }
  const [local, setLocal] = useState("/");
  const path = router ? router.pathname : local;
  const go = useCallback((next: string) => { if (router) router.push(next); else setLocal(next); }, [router]);
  const route = useMemo<Route>(() => {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return { page: "home" };
    if (parts.length === 1 && parts[0] === "create") return { page: "create" };
    if (parts.length === 2 && parts[0] === "game" && isAddress(parts[1])) return { page: "game", launcher: getAddress(parts[1]) };
    return { page: "missing" };
  }, [path]);
  return { route, go };
}

// Finds the factory index of a launcher and returns a host-verified handle for it.
async function resolveGame(sdk: Sdk, launcher: Address): Promise<{ index: bigint; handle: Handle } | null> {
  const count = await sdk.readContract<bigint>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "gamesCount" });
  for (let i = count - 1n; i >= 0n; i -= 1n) {
    const at = await sdk.readContract<Address>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "gameAt", args: [i] });
    if (same(at, launcher)) return { index: i, handle: await sdk.resolveContract("tug-game", [i]) };
  }
  return null;
}

// ---------- shared UI ----------

const box: CSSProperties = { background: C.panel, border: `4px solid ${C.line}`, boxShadow: "6px 6px 0 #07040f", padding: 18 };

function Btn({ children, onClick, disabled, tone = "lime", wide }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: "lime" | "blue" | "red" | "ghost"; wide?: boolean }) {
  const bg = tone === "blue" ? C.blue : tone === "red" ? C.red : tone === "ghost" ? "transparent" : C.lime;
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ background: bg, color: tone === "ghost" ? C.cream : C.ground, border: tone === "ghost" ? `3px solid ${C.line}` : "3px solid #07040f",
        boxShadow: disabled ? "none" : "4px 4px 0 #07040f", padding: "10px 16px", fontFamily: font, fontWeight: 700, fontSize: 15,
        letterSpacing: 1, textTransform: "uppercase", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, width: wide ? "100%" : undefined }}>
      {children}
    </button>
  );
}

function Field({ label, hint, value, onChange, placeholder }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: C.soft, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ background: C.ground, color: C.cream, border: `3px solid ${C.line}`, padding: "10px 12px", fontFamily: font, fontSize: 16, minHeight: 44 }} />
      {hint && <span style={{ color: C.soft, fontSize: 12 }}>{hint}</span>}
    </label>
  );
}

function Rope({ blueBps, label }: { blueBps: number; label: string }) {
  const b = Math.max(0, Math.min(10000, blueBps)) / 100;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
        <span style={{ color: C.blue }}>BLUE {b.toFixed(1)}%</span>
        <span style={{ color: C.soft, fontSize: 13 }}>{label}</span>
        <span style={{ color: C.red }}>{(100 - b).toFixed(1)}% RED</span>
      </div>
      <div role="meter" aria-valuenow={b} aria-valuemin={0} aria-valuemax={100} aria-label={label}
        style={{ position: "relative", height: 26, border: `3px solid ${C.cream}`, background: C.red, display: "flex" }}>
        <div style={{ width: `${b}%`, background: C.blue, transition: "width 600ms ease" }} />
        <div style={{ position: "absolute", left: `calc(${b}% - 7px)`, top: -10, width: 14, height: 40, background: C.lime, transition: "left 600ms ease" }} />
      </div>
    </div>
  );
}

function Crew({ count, color }: { count: bigint; color: string }) {
  const n = Number(count > 12n ? 12n : count);
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minHeight: 22 }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ width: 14, height: 22, background: color, boxShadow: "inset 0 -6px 0 rgba(0,0,0,.35)" }} />
      ))}
      {count > 12n && <span style={{ color: C.soft, fontSize: 12, alignSelf: "end" }}>+{(count - 12n).toString()}</span>}
    </div>
  );
}

// ---------- pages ----------

export default function Component() {
  const sdk = useFlapSdk({ chainId: CHAIN_ID });
  const { i18n, wallet } = sdk;
  const t = i18n.t;
  const { route, go } = useRoute();

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: C.ground, color: C.cream, fontFamily: font }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 48px", display: "grid", gap: 20 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => go("/")} style={{ background: "none", border: 0, color: C.cream, fontFamily: font, cursor: "pointer", textAlign: "left", padding: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>TUG OF WAR <span style={{ color: C.lime }}>LAUNCH</span></div>
            <div style={{ color: C.soft, fontSize: 13 }}>{t("tagline")}</div>
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, padding: "4px 8px", border: `2px solid ${C.gold}`, color: C.gold }}>{t("testnet")}</span>
            {!wallet.isConnected ? <Btn onClick={() => wallet.connect()}>{t("connect")}</Btn>
              : wallet.isWrongNetwork ? <Btn onClick={() => void wallet.switchChain()} disabled={wallet.isSwitchingChain}>{t("switchChain")}</Btn>
              : <span style={{ fontSize: 13, color: C.soft }}>{short(wallet.address ?? "")}</span>}
          </div>
        </header>

        {route.page === "home" && <Home sdk={sdk} go={go} />}
        {route.page === "create" && <Create sdk={sdk} go={go} />}
        {route.page === "game" && <GamePage key={route.launcher} sdk={sdk} launcher={route.launcher} go={go} />}
        {route.page === "missing" && (
          <div style={box}><p style={{ margin: "0 0 12px" }}>{t("notFound")}</p><Btn onClick={() => go("/")}>{t("allGames")}</Btn></div>
        )}
      </div>
    </div>
  );
}

function Home({ sdk, go }: { sdk: Sdk; go: (p: string) => void }) {
  const t = sdk.i18n.t;
  const [games, setGames] = useState<Game[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const count = await sdk.readContract<bigint>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "gamesCount" });
        const list: Game[] = [];
        for (let i = count - 1n; i >= 0n && list.length < 20; i -= 1n) {
          const handle = await sdk.resolveContract("tug-game", [i]);
          list.push(await sdk.readContract<Game>({ contract: handle, abi: LAUNCHER_ABI, functionName: "getGame" }));
        }
        if (live) setGames(list);
      } catch { if (live) setFailed(true); }
    })();
    return () => { live = false; };
  }, [sdk]);

  const phaseName = (p: number) => t(phaseKey(p));
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...box, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <strong style={{ fontSize: 20 }}>{t("homeTitle")}</strong>
          <span style={{ color: C.soft, fontSize: 14 }}>{t("homeIntro")}</span>
        </div>
        <Btn onClick={() => go("/create")}>{t("createGame")}</Btn>
      </div>
      {failed && <p style={{ color: C.red }}>{t("loadFailed")}</p>}
      {!games && !failed && <p style={{ color: C.soft }}>{t("loading")}</p>}
      {games && games.length === 0 && <p style={{ color: C.soft }}>{t("noGames")}</p>}
      {games?.map(g => {
        const final = g.phase === PHASE.launched;
        return (
          <button key={g.launcher} type="button" onClick={() => go(`/game/${g.launcher}`)}
            style={{ ...box, textAlign: "left", color: C.cream, fontFamily: font, cursor: "pointer", display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 18 }}>{g.config.name} <span style={{ color: C.soft }}>· {g.config.symbol}</span></strong>
              <span style={{ color: final ? C.lime : g.phase === PHASE.refunding || g.phase === PHASE.cancelled ? C.red : C.gold, fontSize: 13 }}>{phaseName(g.phase)}</span>
            </div>
            <Rope blueBps={final ? g.finalBlueShareBps : g.ropeBps} label={`${bnb(g.raised)} / ${bnb(g.config.minRaise)}`} />
          </button>
        );
      })}
    </div>
  );
}

function GamePage({ sdk, launcher, go }: { sdk: Sdk; launcher: Address; go: (p: string) => void }) {
  const t = sdk.i18n.t;
  const account = sdk.wallet.address;
  const [handle, setHandle] = useState<Handle | null>(null);
  const [missing, setMissing] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    let live = true;
    resolveGame(sdk, launcher).then(r => { if (!live) return; if (r) setHandle(r.handle); else setMissing(true); }).catch(() => live && setMissing(true));
    return () => { live = false; };
  }, [sdk, launcher]);

  useEffect(() => {
    const a = setInterval(() => setTick(x => x + 1), POLL_MS);
    const b = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  useEffect(() => {
    if (!handle) return;
    let live = true;
    (async () => {
      try {
        const g = await sdk.readContract<Game>({ contract: handle, abi: LAUNCHER_ABI, functionName: "getGame" });
        if (live) setGame(g);
        if (account) {
          const p = await sdk.readContract<Player>({ contract: handle, abi: LAUNCHER_ABI, functionName: "getPlayer", args: [account] });
          if (live) setPlayer(p);
        } else if (live) setPlayer(null);
      } catch { /* keep the last good snapshot */ }
    })();
    return () => { live = false; };
  }, [sdk, handle, account, tick]);


  if (missing) return <div style={box}><p style={{ margin: "0 0 12px" }}>{t("gameMissing")}</p><Btn onClick={() => go("/")}>{t("allGames")}</Btn></div>;
  if (!game || !handle) return <p style={{ color: C.soft }}>{t("loading")}</p>;

  const launched = game.phase === PHASE.launched;
  const left = Number(game.deadline) - now;
  const clock = game.phase === PHASE.buyIn && left > 0
    ? `${Math.floor(left / 3600).toString().padStart(2, "0")}:${Math.floor((left % 3600) / 60).toString().padStart(2, "0")}:${(left % 60).toString().padStart(2, "0")}` : null;
  const refresh = () => setTick(x => x + 1);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...box, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <strong style={{ fontSize: 22 }}>{game.config.name} <span style={{ color: C.soft }}>· {game.config.symbol}</span></strong>
          <span style={{ color: C.gold }}>{t(phaseKey(game.phase))}{clock ? ` · ${clock}` : ""}</span>
        </div>
        <Rope blueBps={launched ? game.finalBlueShareBps : game.ropeBps} label={launched ? t("finalRope") : t("liveRope")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {([[BLUE, C.blue, "blue"], [RED, C.red, "red"]] as const).map(([team, color, key]) => (
            <div key={team} style={{ borderLeft: `6px solid ${color}`, paddingLeft: 12, display: "grid", gap: 6 }}>
              <strong style={{ color }}>{t(key)}</strong>
              <Crew count={game.playersByTeam[key]} color={color} />
              <span style={{ fontSize: 13, color: C.soft }}>{bnb(game.raisedByTeam[key])} · {t("players", undefined, { n: game.playersByTeam[key].toString() })}</span>
              <span style={{ fontSize: 12, color: C.soft }}>{t("captain")} {short(team === BLUE ? game.config.captainBlue : game.config.captainRed)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14 }}>
          <span>{t("raised")}: <b>{bnb(game.raised)}</b> / {bnb(game.config.minRaise)}</span>
          {game.phase === PHASE.buyIn && <span>{t("pullWeight")}: <b style={{ color: C.lime }}>{(game.currentWeightBps / 10000).toFixed(2)}x</b></span>}
          {!zero(game.token) && <span>{t("token")}: {short(game.token)}</span>}
        </div>
      </div>

      <Actions sdk={sdk} handle={handle} game={game} player={player} onDone={refresh} />

    </div>
  );
}

function Actions({ sdk, handle, game, player, onDone }: { sdk: Sdk; handle: Handle; game: Game; player: Player | null; onDone: () => void }) {
  const t = sdk.i18n.t;
  const { wallet } = sdk;
  const account = wallet.address;
  const [team, setTeam] = useState<number>(BLUE);
  const [amount, setAmount] = useState("0.1");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ pull: bigint; rope: number; overtime: boolean } | null>(null);
  const wei = parseBnb(amount);
  const lockedTeam = player && player.team !== 0 ? player.team : null;
  const pickTeam = lockedTeam ?? team;
  const captainTeam = same(account, game.config.captainBlue) ? BLUE : same(account, game.config.captainRed) ? RED : 0;
  const captainDone = captainTeam === BLUE ? game.captainDeposited.blue : captainTeam === RED ? game.captainDeposited.red : true;

  useEffect(() => {
    if (game.phase !== PHASE.buyIn || wei === null || wei === 0n) { setPreview(null); return; }
    let live = true;
    sdk.readContract<readonly [bigint, number, boolean]>({ contract: handle, abi: LAUNCHER_ABI, functionName: "previewContribute", args: [pickTeam, wei] })
      .then(([pull, rope, overtime]) => live && setPreview({ pull, rope, overtime })).catch(() => live && setPreview(null));
    return () => { live = false; };
  }, [sdk, handle, game.phase, pickTeam, wei]);

  const send = async (functionName: "contribute" | "depositCaptain" | "launch" | "refund" | "claim", args: unknown[] = [], value?: bigint) => {
    if (busy) return;
    setBusy(true); setNote(null);
    try {
      const prepared = await sdk.simulateContract({ contract: handle, abi: LAUNCHER_ABI, functionName, args, ...(value !== undefined ? { value } : {}) });
      const hash = await sdk.writeContract(prepared.request);
      setNote(t("pending"));
      const receipt = await sdk.waitForTx(hash);
      if (receipt.status !== "success") throw new Error(t("reverted"));
      sdk.notify.success(t("done"));
      setNote(null);
      onDone();
    } catch (e) {
      const msg = errText(e);
      setNote(`${t("failed")}${msg ? ` · ${msg}` : ""}`);
    } finally { setBusy(false); }
  };

  if (!wallet.isConnected) return <div style={box}><p style={{ margin: "0 0 12px", color: C.soft }}>{t("connectToPlay")}</p><Btn onClick={() => wallet.connect()}>{t("connect")}</Btn></div>;
  if (wallet.isWrongNetwork) return <div style={box}><Btn onClick={() => void wallet.switchChain()} disabled={wallet.isSwitchingChain}>{t("switchChain")}</Btn></div>;

  const rows: ReactNode[] = [];
  if (game.phase === PHASE.awaitingCaptains && captainTeam && !captainDone) {
    rows.push(
      <div key="cap" style={{ display: "grid", gap: 10 }}>
        <strong>{t("captainDepositTitle")}</strong>
        <Field label={t("amount")} value={amount} onChange={setAmount} hint={t("captainMin", undefined, { v: bnb(game.config.captainMinDeposit) })} />
        <Btn tone={captainTeam === BLUE ? "blue" : "red"} disabled={busy || wei === null || wei < game.config.captainMinDeposit} onClick={() => wei !== null && send("depositCaptain", [], wei)}>{t("depositCaptain")}</Btn>
      </div>,
    );
  }
  if (game.phase === PHASE.awaitingCaptains && !(captainTeam && !captainDone)) rows.push(<p key="wait" style={{ margin: 0, color: C.soft }}>{t("waitingCaptains")}</p>);
  if (game.phase === PHASE.buyIn) {
    rows.push(
      <div key="pull" style={{ display: "grid", gap: 12 }}>
        <strong>{t("pickSide")}</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn tone={pickTeam === BLUE ? "blue" : "ghost"} disabled={!!lockedTeam && lockedTeam !== BLUE} onClick={() => setTeam(BLUE)} wide>{t("blue")}</Btn>
          <Btn tone={pickTeam === RED ? "red" : "ghost"} disabled={!!lockedTeam && lockedTeam !== RED} onClick={() => setTeam(RED)} wide>{t("red")}</Btn>
        </div>
        {lockedTeam && <span style={{ fontSize: 12, color: C.soft }}>{t("teamLocked")}</span>}
        <Field label={t("amount")} value={amount} onChange={setAmount} hint={player ? t("capLeft", undefined, { v: bnb(player.remainingCap) }) : undefined} />
        {preview && <span style={{ fontSize: 13, color: C.soft }}>{t("previewLine", undefined, { pull: Number(formatEther(preview.pull)).toFixed(3), rope: pct(preview.rope) })}{preview.overtime ? ` · ${t("overtime")}` : ""}</span>}
        <Btn tone={pickTeam === BLUE ? "blue" : "red"} disabled={busy || wei === null || wei === 0n} onClick={() => wei !== null && send("contribute", [pickTeam], wei)}>
          {pickTeam === BLUE ? t("pullBlue") : t("pullRed")}
        </Btn>
      </div>,
    );
  }
  if (game.phase === PHASE.awaitingLaunch) rows.push(<div key="launch" style={{ display: "grid", gap: 8 }}><span style={{ color: C.soft }}>{t("launchReady")}</span><Btn disabled={busy} onClick={() => send("launch")}>{t("launch")}</Btn></div>);
  if (player && player.refundable > 0n) rows.push(<Btn key="refund" disabled={busy} onClick={() => send("refund")}>{t("refund", undefined, { v: bnb(player.refundable) })}</Btn>);
  if (player && player.claimable > 0n) rows.push(<Btn key="claim" disabled={busy} onClick={() => send("claim")}>{t("claim")}</Btn>);
  if (player && player.contribution > 0n) {
    rows.push(<span key="me" style={{ fontSize: 13, color: C.soft }}>{t("yourPosition", undefined, { team: player.team === BLUE ? t("blue") : t("red"), v: bnb(player.contribution), pull: Number(formatEther(player.pull)).toFixed(3) })}</span>);
  }
  if (rows.length === 0) rows.push(<span key="none" style={{ color: C.soft }}>{t("nothingToDo")}</span>);

  return (
    <div style={{ ...box, display: "grid", gap: 14 }}>
      {rows}
      {note && <span role="status" style={{ fontSize: 13, color: note === t("pending") ? C.gold : C.red }}>{note}</span>}
    </div>
  );
}

// ---------- create ----------

// EIP-1167 minimal proxy creation code, split so it is not mistaken for an address.
const PROXY_PREFIX: Hex = concat(["0x3d602d80600a3d3981f336", "0x3d3d373d3d3d363d73"]);
const PROXY_SUFFIX: Hex = "0x5af43d82803e903d91602b57fd5bf3";

// Searches CREATE2 salts until the Flap token clone address ends in 7777, in small chunks so the page stays responsive.
function findSalt(implementation: Address, deployer: Address, onTries: (n: number) => void, stop: { current: boolean }): Promise<{ salt: Hex; token: Address } | null> {
  const input = new Uint8Array(85);
  input[0] = 0xff;
  input.set(hexToBytes(deployer), 1);
  input.set(hexToBytes(keccak256(concat([PROXY_PREFIX, implementation, PROXY_SUFFIX]))), 53);
  const salt = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) salt[i] = Math.floor(Math.random() * 256);
  let tries = 0;
  return new Promise(resolve => {
    const step = () => {
      if (stop.current) { resolve(null); return; }
      for (let n = 0; n < SALT_CHUNK; n += 1) {
        for (let i = 31; i >= 0; i -= 1) { salt[i] = (salt[i] + 1) & 0xff; if (salt[i] !== 0) break; }
        input.set(salt, 21);
        const hash = keccak256(input, "bytes");
        tries += 1;
        if (hash[30] === 0x77 && hash[31] === 0x77) { resolve({ salt: bytesToHex(salt), token: getAddress(bytesToHex(hash.slice(12))) }); return; }
      }
      onTries(tries);
      setTimeout(step, 0);
    };
    setTimeout(step, 0);
  });
}

function Create({ sdk, go }: { sdk: Sdk; go: (p: string) => void }) {
  const t = sdk.i18n.t;
  const { wallet } = sdk;
  const [base, setBase] = useState<Config | null>(null);
  const [form, setForm] = useState({ name: "", symbol: "", captainBlue: "", captainRed: "", minutes: "60", minRaise: "1", walletCap: "1", captainMin: "0.1" });
  const [stage, setStage] = useState<"idle" | "salt" | "check" | "send" | "wait">("idle");
  const [tries, setTries] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  useEffect(() => {
    sdk.readContract<Config>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "defaultConfig" }).then(c => {
      setBase(c);
      // Keep this form's starting values where the factory default is zero.
      const pick = (wei: bigint, fallback: string) => (wei > 0n ? formatEther(wei) : fallback);
      setForm(f => ({ ...f, minutes: c.duration >= 60n ? String(c.duration / 60n) : f.minutes, minRaise: pick(c.minRaise, f.minRaise), walletCap: pick(c.walletCap, f.walletCap), captainMin: pick(c.captainMinDeposit, f.captainMin) }));
    }).catch(() => setError(t("loadFailed")));
    return () => { stop.current = true; };
  }, [sdk, t]);

  useEffect(() => {
    if (wallet.address) setForm(f => (f.captainBlue ? f : { ...f, captainBlue: wallet.address ?? "" }));
  }, [wallet.address]);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const minRaise = parseBnb(form.minRaise), walletCap = parseBnb(form.walletCap), captainMin = parseBnb(form.captainMin);
  const minutes = /^[1-9][0-9]{0,5}$/.test(form.minutes) ? BigInt(form.minutes) : null;
  const ready = !!base && form.name.trim().length > 0 && form.name.length <= 32 && /^[A-Za-z0-9]{1,10}$/.test(form.symbol)
    && isAddress(form.captainBlue) && isAddress(form.captainRed) && !same(form.captainBlue, form.captainRed)
    && minRaise !== null && minRaise > 0n && walletCap !== null && walletCap > 0n && captainMin !== null && captainMin > 0n && minutes !== null;

  const create = async () => {
    if (!base || !ready || stage !== "idle") return;
    setError(null); setTries(0); stop.current = false;
    try {
      setStage("salt");
      const [implementation, portal] = await Promise.all([
        sdk.readContract<Address>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "tokenImplementation" }),
        sdk.readContract<Address>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "portal" }),
      ]);
      if (!same(portal, PORTAL)) throw new Error(t("portalChanged"));
      const found = await findSalt(implementation, portal, setTries, stop);
      if (!found) { setStage("idle"); return; }
      const predicted = await sdk.readContract<Address>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "predictToken", args: [found.salt] });
      if (!same(predicted, found.token)) throw new Error(t("saltMismatch"));

      setStage("check");
      const config: Config = {
        ...base, name: form.name.trim(), symbol: form.symbol.trim().toUpperCase(), meta: "", salt: found.salt,
        duration: minutes! * 60n, minRaise: minRaise!, walletCap: walletCap!, captainMinDeposit: captainMin!,
        captainBlue: getAddress(form.captainBlue), captainRed: getAddress(form.captainRed),
      };
      const [ok, reason] = await sdk.readContract<readonly [boolean, Hex]>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "validateConfig", args: [config] });
      if (!ok) throw new Error(t("invalidConfig", undefined, { reason }));
      const data = await sdk.readContract<Hex>({ address: "0xbFc1ccCB2D6a611219D387eC9A67a9DCF10C5431", abi: FACTORY_ABI, functionName: "encodeConfig", args: [config] });
      const fee = await sdk.readContract<bigint>({ address: "0x000042108465206185A077Edc3F3fd2b49060000", abi: PORTAL_ABI, functionName: "SALT_LOCK_FEE" });

      setStage("send");
      const prepared = await sdk.simulateContract({ address: "0x000042108465206185A077Edc3F3fd2b49060000", abi: PORTAL_ABI, functionName: "newLauncher", args: [FACTORY, data], value: fee });
      const hash = await sdk.writeContract(prepared.request);
      setStage("wait");
      const receipt = await sdk.waitForTx(hash);
      if (receipt.status !== "success") throw new Error(t("reverted"));
      let launcher: Address | null = null;
      for (const log of receipt.logs) {
        if (!same(log.address, FACTORY)) continue;
        try {
          const ev = decodeEventLog({ abi: FACTORY_ABI, data: log.data, topics: log.topics });
          if (ev.eventName === "TugLauncherCreated") launcher = ev.args.launcher;
        } catch { /* other event */ }
      }
      sdk.notify.success(t("created"));
      setStage("idle");
      go(launcher ? `/game/${launcher}` : "/");
    } catch (e) {
      setStage("idle");
      const msg = errText(e);
      setError(`${t("failed")}${msg ? ` · ${msg}` : ""}`);
    }
  };

  const stageText = stage === "salt" ? t("stageSalt", undefined, { n: tries.toLocaleString() }) : stage === "check" ? t("stageCheck") : stage === "send" ? t("stageSend") : stage === "wait" ? t("pending") : null;

  return (
    <div style={{ ...box, display: "grid", gap: 14 }}>
      <strong style={{ fontSize: 20 }}>{t("createTitle")}</strong>
      <span style={{ color: C.soft, fontSize: 14 }}>{t("createIntro")}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 14, alignItems: "start" }}>
        <Field label={t("coinName")} value={form.name} onChange={set("name")} placeholder="Rope Coin" />
        <Field label={t("coinSymbol")} value={form.symbol} onChange={set("symbol")} placeholder="ROPE" />
        <Field label={t("captainBlue")} value={form.captainBlue} onChange={set("captainBlue")} placeholder="0x…" />
        <Field label={t("captainRed")} value={form.captainRed} onChange={set("captainRed")} placeholder="0x…" />
        <Field label={t("clockMinutes")} value={form.minutes} onChange={set("minutes")} />
        <Field label={t("minRaise")} value={form.minRaise} onChange={set("minRaise")} hint={t("minRaiseHint")} />
        <Field label={t("walletCap")} value={form.walletCap} onChange={set("walletCap")} />
        <Field label={t("captainMinField")} value={form.captainMin} onChange={set("captainMin")} />
      </div>
      {!wallet.isConnected ? <Btn onClick={() => wallet.connect()}>{t("connect")}</Btn>
        : wallet.isWrongNetwork ? <Btn onClick={() => void wallet.switchChain()} disabled={wallet.isSwitchingChain}>{t("switchChain")}</Btn>
        : <Btn disabled={!ready || stage !== "idle"} onClick={() => void create()}>{t("createGame")}</Btn>}
      <span style={{ fontSize: 12, color: C.soft }}>{t("createFee")}</span>
      {stageText && <span role="status" style={{ color: C.gold, fontSize: 13 }}>{stageText}</span>}
      {error && <span role="alert" style={{ color: C.red, fontSize: 13 }}>{error}</span>}
    </div>
  );
}
