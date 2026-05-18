async function fetchFreqtrade(config, setFtData) {
  const { url, username, password } = config;
  try {
    const tokenRes = await fetch(`${url}/api/v1/token/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const { access_token } = await tokenRes.json();
    const bearer = { "Authorization": `Bearer ${access_token}` };
    const [status, profit, trades] = await Promise.all([
      fetch(`${url}/api/v1/status`, { headers: bearer }).then(r => r.json()),
      fetch(`${url}/api/v1/profit`, { headers: bearer }).then(r => r.json()),
      fetch(`${url}/api/v1/trades?limit=5`, { headers: bearer }).then(r => r.json()),
    ]);
    setFtData({ status, profit, trades: trades.trades || [], token: access_token, lastUpdate: new Date() });
  } catch (e) {
    setFtData(null);
  }
}

async function ftAction(config, ftData, action) {
  if (!ftData?.token) return;
  const bearer = { "Authorization": `Bearer ${ftData.token}`, "Content-Type": "application/json" };
  const url = config.url;
  if (action === "start") await fetch(`${url}/api/v1/start`, { method: "POST", headers: bearer });
  if (action === "stop") await fetch(`${url}/api/v1/stop`, { method: "POST", headers: bearer });
}

function FreqtradeSettings({ config, setConfig, onClose }) {
  const [form, setForm] = React.useState({ url: config.url, username: config.username, password: config.password });
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState("");

  const test = async () => {
    setTesting(true); setTestResult("");
    try {
      const res = await fetch(`${form.url}/api/v1/ping`);
      const data = await res.json();
      setTestResult(data.status === "pong" ? "✅ Connected! Freqtrade is responding." : "⚠️ Unexpected response.");
    } catch (e) {
      setTestResult("❌ Can't reach Freqtrade. Check tunnel URL and that FT is running.");
    }
    setTesting(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#051a14", border:"1px solid rgba(0,255,231,0.3)", borderRadius:"16px 16px 0 0", padding:20, paddingBottom:32 }}>
        <div style={{ fontFamily:"monospace", fontSize:12, color:"#00ffe7", marginBottom:16 }}>⚡ FREQTRADE CONNECTION</div>
        {[
          { label:"TUNNEL URL", key:"url", placeholder:"https://xxx.trycloudflare.com" },
          { label:"USERNAME", key:"username", placeholder:"your freqtrade username" },
          { label:"PASSWORD", key:"password", placeholder:"your freqtrade password", type:"password" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:"#00b8a4", marginBottom:4 }}>{f.label}</div>
            <input type={f.type||"text"} placeholder={f.placeholder} value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              style={{ width:"100%", background:"rgba(0,40,34,0.8)", border:"1px solid rgba(0,255,231,0.2)", borderRadius:7, padding:"9px 12px", color:"#b8fff8", fontSize:13, outline:"none" }}/>
          </div>
        ))}
        {testResult && (
          <div style={{ fontSize:11, padding:"8px 10px", borderRadius:7, marginBottom:10,
            background: testResult.startsWith("✅") ? "rgba(6,255,165,0.08)" : "rgba(255,77,109,0.08)",
            border: `1px solid ${testResult.startsWith("✅") ? "rgba(6,255,165,0.3)" : "rgba(255,77,109,0.3)"}`,
            color:"#b8fff8" }}>{testResult}</div>
        )}
        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <button onClick={onClose} style={{ flex:1, padding:11, borderRadius:8, border:"1px solid rgba(0,255,231,0.2)", background:"transparent", color:"#b8fff8", cursor:"pointer" }}>CANCEL</button>
          <button onClick={test} disabled={testing} style={{ flex:1, padding:11, borderRadius:8, border:"1px solid rgba(0,255,231,0.4)", background:"rgba(0,255,231,0.08)", color:"#00ffe7", cursor:"pointer" }}>{testing ? "TESTING..." : "TEST"}</button>
          <button onClick={() => { setConfig({ ...form, connected: true }); onClose(); }} style={{ flex:1, padding:11, borderRadius:8, border:"none", background:"linear-gradient(135deg,#00ffe7,#00b8a4)", color:"#030d0b", cursor:"pointer", fontWeight:700 }}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

function FreqtradeLiveCard({ config, setConfig, ftData, onRefresh }) {
  const [showSettings, setShowSettings] = React.useState(false);
  const profit = ftData?.profit;
  const trades = ftData?.trades || [];
  const totalProfit = profit?.profit_all_coin?.toFixed(4) ?? "—";
  const winRate = profit?.winning_trades && profit?.total_trade_count
    ? Math.round((profit.winning_trades / profit.total_trade_count) * 100) : "—";
  const openTrades = ftData?.status?.length ?? 0;
  const lastUpdate = ftData?.lastUpdate ? ftData.lastUpdate.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }) : null;

  if (!config.connected) {
    return (
      <>
        <div style={{ background:"rgba(0,40,34,0.8)", border:"1px solid rgba(0,255,231,0.18)", borderRadius:10, padding:16, marginBottom:8, textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📈</div>
          <div style={{ fontFamily:"monospace", fontSize:11, color:"#00ffe7", marginBottom:4 }}>ALPHA TRADER</div>
          <div style={{ fontSize:12, color:"rgba(184,255,248,0.5)", marginBottom:12 }}>Connect your Freqtrade bot to see live data</div>
          <button onClick={() => setShowSettings(true)} style={{ padding:"9px 20px", borderRadius:7, border:"1px solid rgba(0,255,231,0.4)", background:"rgba(0,255,231,0.08)", color:"#00ffe7", cursor:"pointer" }}>⚡ CONNECT BOT</button>
        </div>
        {showSettings && <FreqtradeSettings config={config} setConfig={setConfig} onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  return (
    <>
      <div style={{ background:"rgba(0,40,34,0.8)", border:`1px solid ${ftData ? "rgba(6,255,165,0.3)" : "rgba(255,77,109,0.3)"}`, borderRadius:10, padding:12, marginBottom:8, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background: ftData ? "linear-gradient(#06ffa5,transparent)" : "#ff4d6d" }} />
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:"rgba(255,209,102,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📈</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:"#b8fff8" }}>ALPHA TRADER</div>
            <div style={{ fontFamily:"monospace", fontSize:9, color:"#ffd166", marginTop:2 }}>FREQTRADE · LIVE {lastUpdate && `· ${lastUpdate}`}</div>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <div onClick={() => ftAction(config, ftData, "start")} style={{ width:26, height:26, borderRadius:5, border:"1px solid rgba(6,255,165,0.4)", background:"rgba(0,255,231,0.06)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#06ffa5" }}>▶</div>
            <div onClick={() => ftAction(config, ftData, "stop")} style={{ width:26, height:26, borderRadius:5, border:"1px solid rgba(255,77,109,0.4)", background:"rgba(0,255,231,0.06)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#ff4d6d" }}>⏹</div>
            <div onClick={() => setShowSettings(true)} style={{ width:26, height:26, borderRadius:5, border:"1px solid rgba(0,255,231,0.18)", background:"rgba(0,255,231,0.06)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"rgba(184,255,248,0.5)" }}>⚙</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginTop:10 }}>
          {[
            { v:`${totalProfit}`, l:"Total P&L", c: parseFloat(totalProfit) >= 0 ? "#06ffa5" : "#ff4d6d" },
            { v:`${winRate}%`, l:"Win Rate", c:"#ffd166" },
            { v:`${openTrades}`, l:"Open Trades", c:"#60dfff" },
          ].map((s,i) => (
            <div key={i} style={{ background:"rgba(0,255,231,0.06)", borderRadius:6, padding:"6px 8px" }}>
              <div style={{ fontFamily:"monospace", fontSize:12, fontWeight:600, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:9, color:"rgba(184,255,248,0.5)", marginTop:1 }}>{s.l}</div>
            </div>
          ))}
        </div>
        {trades.length > 0 && (
          <div style={{ marginTop:8 }}>
            <div style={{ fontFamily:"monospace", fontSize:9, color:"rgba(184,255,248,0.5)", marginBottom:4 }}>OPEN POSITIONS</div>
            {trades.slice(0,3).map((t,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", background:"rgba(0,255,231,0.04)", borderRadius:5, padding:"5px 8px", marginBottom:3 }}>
                <span style={{ fontFamily:"monospace", fontSize:10, color:"#b8fff8" }}>{t.pair}</span>
                <span style={{ fontFamily:"monospace", fontSize:10, color: t.profit_pct >= 0 ? "#06ffa5" : "#ff4d6d" }}>{t.profit_pct >= 0 ? "+" : ""}{t.profit_pct?.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {showSettings && <FreqtradeSettings config={config} setConfig={setConfig} onClose={() => setShowSettings(false)} />}
    </>
  );
}
