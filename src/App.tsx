import { useEffect, useMemo, useState } from "react";

type Screen = "recognize" | "navigate" | "setup" | "family";
type NavigationStage =
  | "home"
  | "search"
  | "result"
  | "preview"
  | "navigating"
  | "rerouting"
  | "arrival_assist"
  | "arrived"
  | "saved_routes"
  | "recording";
type DeviceState = "connected" | "disconnected";
type LocationState = "normal" | "weak" | "offline";
type RecordStage = "intro" | "active" | "paused" | "details" | "saved";

const palette = {
  teal: "#006D5B",
  tealDark: "#084F45",
  ink: "#163A34",
  cream: "#F6F3EA",
  paper: "#FFFFFF",
  orange: "#F1973F",
  orangeSoft: "#FFF0DE",
  mint: "#DDEDE8",
  line: "#C9D8D3",
  danger: "#B9382D",
};

const SymbolIcon = ({ children }: { children: string }) => (
  <span className="symbol" aria-hidden="true">{children}</span>
);

function App() {
  const [screen, setScreen] = useState<Screen>("recognize");
  const [navStage, setNavStage] = useState<NavigationStage>("home");
  const [device, setDevice] = useState<DeviceState>("connected");
  const [location, setLocation] = useState<LocationState>("normal");
  const [navStep, setNavStep] = useState(0);
  const [entranceConfirmed, setEntranceConfirmed] = useState(false);
  const [recordStage, setRecordStage] = useState<RecordStage>("intro");
  const [notice, setNotice] = useState("");

  const speak = (text: string) => {
    setNotice(text);
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Figma preview or desktop browser may block speech; the visible notice remains.
    }
  };

  const vibrate = (pattern: number | number[]) => {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Desktop preview does not expose Android vibration.
    }
  };

  const openNavigation = () => {
    setScreen("navigate");
    setNavStage("home");
    setNotice("");
  };

  const startPreview = () => {
    setNavStage("preview");
    speak("已选择社区医院，推荐红绿灯较少的安全路线");
  };

  const startNavigation = () => {
    setNavStep(0);
    setLocation("normal");
    setNavStage("navigating");
    speak("开始导航，沿惠民路直行一百八十米");
  };

  const advanceNavigation = () => {
    if (navStep === 0) {
      setNavStep(1);
      vibrate(120);
      speak("前方四十米路口右转");
      return;
    }
    if (navStep === 1) {
      setNavStage("rerouting");
      vibrate([160, 90, 160]);
      speak("检测到偏离路线，正在重新规划");
      return;
    }
    setNavStage("arrival_assist");
    setEntranceConfirmed(false);
    vibrate([180, 100, 180]);
    speak("进入最后三十米，入口位于右前方约二十米，请按M02识别键确认门牌");
  };

  useEffect(() => {
    if (navStage !== "rerouting") return;
    const timer = window.setTimeout(() => {
      setNavStep(2);
      setNavStage("navigating");
      speak("路线已更新，沿右侧人行道继续直行二百二十米");
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [navStage]);

  const toggleDevice = () => {
    if (device === "connected") {
      setDevice("disconnected");
      vibrate([180, 100, 180]);
      speak("M02连接已断开，已切换手机播报");
    } else {
      setDevice("connected");
      vibrate(120);
      speak("M02已重新连接，导航语音由眼镜播放");
    }
  };

  const stageTitle = useMemo(() => {
    const titles: Record<NavigationStage, string> = {
      home: "出行导航",
      search: "搜索目的地",
      result: "搜索结果",
      preview: "路线确认",
      navigating: "正在导航",
      rerouting: "重新规划",
      arrival_assist: "寻找入口",
      arrived: "导航完成",
      saved_routes: "我的路线",
      recording: "录制新路线",
    };
    return titles[navStage];
  }, [navStage]);

  const backFromNavigation = () => {
    const previous: Partial<Record<NavigationStage, NavigationStage>> = {
      search: "home",
      result: "search",
      preview: "result",
      saved_routes: "home",
      recording: "home",
      arrived: "home",
      arrival_assist: "navigating",
    };
    if (navStage === "home") setScreen("recognize");
    else setNavStage(previous[navStage] ?? "home");
  };

  return (
    <div className="app-shell" style={{ "--teal": palette.teal } as React.CSSProperties}>
      <style>{styles}</style>
      <header className="prototype-head">
        <div>
          <strong>M02 关怀版</strong>
          <span>大字第一视角流程</span>
        </div>
        <nav aria-label="原型页面切换">
          <button className={screen === "recognize" ? "active" : ""} onClick={() => setScreen("recognize")}>① 识别</button>
          <button className={screen === "navigate" ? "active" : ""} onClick={openNavigation}>② 导航</button>
          <button className={screen === "setup" ? "active" : ""} onClick={() => setScreen("setup")}>③ 亲友设置</button>
          <button className={screen === "family" ? "active" : ""} onClick={() => setScreen("family")}>③B 家属端</button>
        </nav>
      </header>

      <main className={`phone ${screen === "recognize" ? "camera-phone" : ""}`}>
        <div className="statusbar" aria-hidden="true"><span>09:41</span><span>● WiFi ▮</span></div>
        {notice && (
          <div className="notice" role="status" aria-live="polite">
            <span>{notice}</span>
            <button aria-label="关闭提示" onClick={() => setNotice("")}>×</button>
          </div>
        )}
        {screen === "recognize" && <RecognizeScreen openNavigation={openNavigation} device={device} speak={speak} />}
        {screen === "navigate" && (
          <NavigationScreen
            stage={navStage}
            title={stageTitle}
            device={device}
            location={location}
            navStep={navStep}
            entranceConfirmed={entranceConfirmed}
            recordStage={recordStage}
            onBack={backFromNavigation}
            setStage={setNavStage}
            setLocation={setLocation}
            toggleDevice={toggleDevice}
            speak={speak}
            startPreview={startPreview}
            startNavigation={startNavigation}
            advanceNavigation={advanceNavigation}
            setEntranceConfirmed={setEntranceConfirmed}
            setRecordStage={setRecordStage}
          />
        )}
        {screen === "setup" && <SetupScreen onDone={() => setScreen("family")} />}
        {screen === "family" && <FamilyScreen onNavigate={openNavigation} />}
      </main>

      <p className="prototype-note">原型演示 · 非真实定位 · 视觉避障需厂商SDK</p>
    </div>
  );
}

function DevicePill({ device, onClick }: { device: DeviceState; onClick?: () => void }) {
  const content = device === "connected" ? "M02 已连接" : "M02 已断开";
  return (
    <button className={`device-pill ${device}`} onClick={onClick} aria-label={`${content}，点击切换演示状态`}>
      <span className="device-dot" />
      <span>{content}</span>
      {device === "connected" && <b>82%</b>}
    </button>
  );
}

function RecognizeScreen({ openNavigation, device, speak }: {
  openNavigation: () => void;
  device: DeviceState;
  speak: (text: string) => void;
}) {
  const actions = [
    ["👁", "看一下"], ["▤", "读一下"], ["⌖", "找一下"], ["◌", "聊一下"],
    ["◇", "开启避障"], ["➤", "开启导航"], ["◉", "环境描述"], ["Ⅱ", "停止播报"],
  ];
  const action = (label: string) => {
    if (label === "开启导航") return openNavigation();
    if (label === "开启避障") return speak("实时避障需要M02厂商SDK，当前导航功能仍可使用");
    if (label === "停止播报") {
      window.speechSynthesis?.cancel();
      return speak("已停止播报");
    }
    speak(`${label}功能已触发`);
  };
  return (
    <section className="recognize-screen">
      <div className="camera-scene" aria-hidden="true">
        <div className="camera-glow" /><div className="path-left" /><div className="path-right" />
      </div>
      <div className="camera-content">
        <div className="mode-tabs" role="tablist">
          <button className="active" role="tab" aria-selected="true">识别</button>
          <button role="tab" onClick={openNavigation}>导航</button>
        </div>
        <DevicePill device={device} />
        <div className="action-grid">
          {actions.map(([icon, label]) => (
            <button key={label} className={label === "停止播报" ? "danger-action" : ""} onClick={() => action(label)}>
              <SymbolIcon>{icon}</SymbolIcon><span>{label}</span>
            </button>
          ))}
        </div>
        <div className="camera-alert">前方视野辅助已准备</div>
        <button className="voice-button" onClick={() => speak("请说出需要帮助的内容")}>
          <SymbolIcon>●</SymbolIcon><span>说：“帮我看看”</span>
        </button>
      </div>
    </section>
  );
}

type NavigationProps = {
  stage: NavigationStage;
  title: string;
  device: DeviceState;
  location: LocationState;
  navStep: number;
  entranceConfirmed: boolean;
  recordStage: RecordStage;
  onBack: () => void;
  setStage: (stage: NavigationStage) => void;
  setLocation: (state: LocationState) => void;
  toggleDevice: () => void;
  speak: (text: string) => void;
  startPreview: () => void;
  startNavigation: () => void;
  advanceNavigation: () => void;
  setEntranceConfirmed: (value: boolean) => void;
  setRecordStage: (stage: RecordStage) => void;
};

function NavigationScreen(props: NavigationProps) {
  const {
    stage, title, device, location, navStep, entranceConfirmed, recordStage, onBack,
    setStage, setLocation, toggleDevice, speak, startPreview, startNavigation,
    advanceNavigation, setEntranceConfirmed, setRecordStage,
  } = props;
  return (
    <section className="navigation-screen">
      <header className="nav-header">
        <button className="back-button" onClick={onBack} aria-label="返回">‹</button>
        <h1>{title}</h1>
        <span className="header-spacer" />
      </header>

      {stage === "home" && (
        <div className="screen-body">
          <DevicePill device={device} onClick={toggleDevice} />
          <p className="audio-copy">{device === "connected" ? "导航语音由眼镜播放" : "已切换手机播报"}</p>
          <button className="nav-entry orange" onClick={() => setStage("search")}>
            <SymbolIcon>⌕</SymbolIcon><span><b>搜索目的地</b><small>语音或文字输入</small></span><em>›</em>
          </button>
          <button className="nav-entry green" onClick={() => setStage("saved_routes")}>
            <SymbolIcon>↝</SymbolIcon><span><b>我的路线</b><small>一键启动已保存路线</small></span><em>›</em>
          </button>
          <button className="nav-entry deep" onClick={() => { setRecordStage("intro"); setStage("recording"); }}>
            <SymbolIcon>◎</SymbolIcon><span><b>录制新路线</b><small>与亲友同行自动记录</small></span><em>›</em>
          </button>
          <div className="boundary-card"><b>避障说明</b><span>实时避障需要M02厂商SDK；当前可独立使用地图导航。</span></div>
        </div>
      )}

      {stage === "search" && (
        <div className="screen-body search-view">
          <label className="search-box"><span>⌕</span><input aria-label="目的地" value="社区医院" readOnly /></label>
          <button className="giant-voice" onClick={() => { speak("已听到，我要去社区医院"); setStage("result"); }}>
            <SymbolIcon>●</SymbolIcon><b>按住说话</b><span>“我要去社区医院”</span>
          </button>
          <button className="primary-button" onClick={() => setStage("result")}>搜索“社区医院”</button>
        </div>
      )}

      {stage === "result" && (
        <div className="screen-body">
          <p className="section-hint">找到 1 个适合步行的结果</p>
          <button className="place-card" onClick={startPreview}>
            <span className="place-icon">十</span>
            <span><b>社区医院</b><small>惠民路18号 · 距离1.2公里</small><em>预计步行18分钟</em></span>
            <strong>›</strong>
          </button>
          <div className="safety-tip"><b>安全提示</b><span>将优先选择红绿灯和复杂路口较少的路线。</span></div>
        </div>
      )}

      {stage === "preview" && (
        <div className="screen-body">
          <MapGraphic />
          <div className="route-summary">
            <span><b>1.2公里</b><small>距离</small></span>
            <span><b>18分钟</b><small>预计时间</small></span>
            <span><b>3个</b><small>主要路口</small></span>
          </div>
          <div className="safe-route"><b>推荐安全路线</b><span>红绿灯较少 · 人行道较完整</span></div>
          <button className="primary-button" onClick={startNavigation}>开始导航</button>
        </div>
      )}

      {stage === "navigating" && (
        <ActiveNavigation
          device={device} location={location} step={navStep}
          toggleDevice={toggleDevice} setLocation={setLocation}
          speak={speak} advance={advanceNavigation}
        />
      )}

      {stage === "rerouting" && (
        <div className="center-state" role="status" aria-live="assertive">
          <div className="spinner" /><h2>正在重新规划</h2><p>检测到偏离路线</p><span>请原地稍候，约1秒后继续</span>
        </div>
      )}

      {stage === "arrival_assist" && (
        <div className="screen-body arrival-view">
          <div className="arrival-arrow">↗</div>
          <h2>入口在右前方</h2>
          <strong>约 20 米</strong>
          <p>请按 M02 识别键<br />确认门牌或入口</p>
          {!entranceConfirmed ? (
            <button className="primary-button" onClick={() => { setEntranceConfirmed(true); speak("已识别到社区医院入口"); }}>我已按识别键</button>
          ) : (
            <div className="recognized-card"><b>识别结果</b><span>社区医院入口</span></div>
          )}
          {entranceConfirmed && <button className="secondary-button" onClick={() => { setStage("arrived"); speak("已到达社区医院入口，导航结束"); }}>确认到达</button>}
        </div>
      )}

      {stage === "arrived" && (
        <div className="center-state arrived-state">
          <div className="success-mark">✓</div><h2>已到达</h2><p>社区医院入口</p><span>本次步行约18分钟</span>
          <button className="primary-button" onClick={() => setStage("home")}>完成导航</button>
        </div>
      )}

      {stage === "saved_routes" && (
        <div className="screen-body">
          <p className="section-hint">选择一条可信路线</p>
          <button className="saved-route" onClick={startPreview}><SymbolIcon>⌂</SymbolIcon><span><b>回家</b><small>亲友陪同录制 · 820米</small></span><em>›</em></button>
          <button className="saved-route" onClick={startPreview}><SymbolIcon>十</SymbolIcon><span><b>社区医院</b><small>已标记入口 · 1.2公里</small></span><em>›</em></button>
          <div className="safety-tip"><b>可信路线</b><span>包含亲友记录的入口和需要特别提醒的位置。</span></div>
        </div>
      )}

      {stage === "recording" && (
        <RecordingFlow stage={recordStage} setStage={setRecordStage} speak={speak} onFinish={() => setStage("saved_routes")} />
      )}
    </section>
  );
}

function ActiveNavigation({ device, location, step, toggleDevice, setLocation, speak, advance }: {
  device: DeviceState;
  location: LocationState;
  step: number;
  toggleDevice: () => void;
  setLocation: (state: LocationState) => void;
  speak: (text: string) => void;
  advance: () => void;
}) {
  const instructions = [
    { arrow: "↑", distance: "180米", text: "沿惠民路直行", remain: "剩余1.2公里" },
    { arrow: "↱", distance: "40米", text: "前方路口右转", remain: "剩余720米" },
    { arrow: "↑", distance: "220米", text: "沿右侧人行道直行", remain: "剩余260米" },
  ][step];
  const statusText = location === "weak" ? "GPS信号弱，请原地等待" : location === "offline" ? "网络已断开，使用缓存路线" : device === "connected" ? "M02播报中" : "手机播报中";
  return (
    <div className="screen-body active-navigation">
      <div className={`live-status ${location !== "normal" ? "warning" : ""}`} role="status">
        <span className="device-dot" /><b>{statusText}</b>
      </div>
      <div className="direction-card">
        <div className="big-arrow">{instructions.arrow}</div>
        <strong>{instructions.distance}</strong>
        <h2>{instructions.text}</h2>
        <p>{instructions.remain} · 约{step === 0 ? "18" : step === 1 ? "11" : "5"}分钟</p>
      </div>
      <MiniMap step={step} />
      <button className="primary-button" onClick={advance} disabled={location === "weak"}>模拟前进</button>
      <div className="simulation-panel" aria-label="异常状态演示">
        <button onClick={toggleDevice}>{device === "connected" ? "模拟M02断连" : "重新连接M02"}</button>
        <button onClick={() => { setLocation(location === "weak" ? "normal" : "weak"); speak(location === "weak" ? "定位已恢复" : "GPS信号弱，请原地等待定位"); }}>{location === "weak" ? "恢复GPS" : "模拟GPS弱"}</button>
        <button onClick={() => { setLocation(location === "offline" ? "normal" : "offline"); speak(location === "offline" ? "网络已恢复" : "网络已断开，正在使用缓存路线"); }}>{location === "offline" ? "恢复网络" : "模拟断网"}</button>
      </div>
    </div>
  );
}

function RecordingFlow({ stage, setStage, speak, onFinish }: { stage: RecordStage; setStage: (s: RecordStage) => void; speak: (t: string) => void; onFinish: () => void }) {
  if (stage === "intro") return (
    <div className="screen-body recording-intro">
      <div className="record-icon">◎</div><h2>请由亲友陪同行走</h2><p>应用将记录GPS轨迹、目的地入口和安全提醒。</p>
      <ul><li>选择熟悉、安全的路线</li><li>到达后标记准确入口</li><li>不要在危险路段操作手机</li></ul>
      <button className="primary-button" onClick={() => { setStage("active"); speak("开始录制新路线"); }}>开始录制</button>
    </div>
  );
  if (stage === "active" || stage === "paused") return (
    <div className="screen-body recording-live">
      <div className={`record-pulse ${stage === "paused" ? "paused" : ""}`} /><h2>{stage === "paused" ? "录制已暂停" : "正在录制路线"}</h2>
      <div className="record-stats"><span><b>06:24</b><small>时间</small></span><span><b>410米</b><small>距离</small></span><span><b>38</b><small>轨迹点</small></span></div>
      <MiniMap step={2} />
      <button className="secondary-button" onClick={() => { setStage(stage === "paused" ? "active" : "paused"); speak(stage === "paused" ? "继续录制" : "录制已暂停"); }}>{stage === "paused" ? "继续录制" : "暂停录制"}</button>
      <button className="primary-button" onClick={() => { setStage("details"); speak("已标记目的地入口"); }}>到达并标记入口</button>
    </div>
  );
  if (stage === "details") return (
    <div className="screen-body route-form">
      <label>路线名称<input value="社区医院" readOnly /></label>
      <label>入口位置<input value="惠民路东门" readOnly /></label>
      <label>安全备注<textarea value="过第二个路口后靠右行走" readOnly /></label>
      <label>特别提醒<textarea value="入口前有三级台阶" readOnly /></label>
      <button className="primary-button" onClick={() => { setStage("saved"); speak("路线已保存到本机"); }}>保存路线</button>
    </div>
  );
  return (
    <div className="center-state arrived-state"><div className="success-mark">✓</div><h2>路线已保存</h2><p>社区医院</p><span>已保存入口和安全备注</span><button className="primary-button" onClick={onFinish}>查看我的路线</button></div>
  );
}

function MapGraphic() {
  return <div className="map-graphic" aria-label="社区医院固定演示路线图"><span className="map-road road-a" /><span className="map-road road-b" /><span className="route-line" /><i className="start-dot">起</i><i className="end-dot">医</i></div>;
}

function MiniMap({ step }: { step: number }) {
  return <div className="mini-map" aria-label="导航路线简图"><span className="street one" /><span className="street two" /><span className={`mini-route step-${step}`} /><i>●</i><b>十</b></div>;
}

function SetupScreen({ onDone }: { onDone: () => void }) {
  const [aid, setAid] = useState("cane");
  return (
    <section className="light-screen setup-screen">
      <div className="simple-head"><span>M02 关怀版</span><b>1 / 3</b></div>
      <h1>亲友协助设置</h1><p>请由亲友帮助完成基本资料</p>
      <label className="large-field">佩戴者身高<input value="165 厘米" readOnly /></label>
      <h2>日常使用</h2>
      <div className="aid-grid">{[["cane","导盲杖"],["dog","导盲犬"],["wheelchair","轮椅"],["none","无辅助"]].map(([id,label]) => <button key={id} className={aid === id ? "selected" : ""} onClick={() => setAid(id)}>{label}</button>)}</div>
      <button className="primary-button" onClick={onDone}>下一步：绑定家属端</button>
    </section>
  );
}

function FamilyScreen({ onNavigate }: { onNavigate: () => void }) {
  return (
    <section className="light-screen family-screen">
      <div className="simple-head"><span>家属端</span><b>安全守护</b></div>
      <div className="family-person"><div>妈</div><span><h1>妈妈</h1><p>在线 · M02已连接</p></span><b>安全</b></div>
      <div className="family-grid"><article><small>最后位置</small><b>社区广场</b></article><article><small>报平安</small><b>10分钟前</b></article><article><small>今日用药</small><b>已确认</b></article><article><small>当前模式</small><b>识别</b></article></div>
      <button className="primary-button" onClick={onNavigate}>为妈妈设置常用路线</button>
      <button className="secondary-button">联系妈妈</button>
    </section>
  );
}

const styles = `
*{box-sizing:border-box}button,input,textarea{font:inherit}button{cursor:pointer}body{margin:0}.app-shell{min-height:100vh;background:#E7EEEB;color:${palette.ink};font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;padding:22px 16px 34px}.prototype-head{max-width:900px;margin:0 auto 18px;display:flex;align-items:center;justify-content:space-between;gap:20px}.prototype-head>div{display:flex;flex-direction:column}.prototype-head strong{font-size:22px}.prototype-head span{font-size:18px;color:#53716A}.prototype-head nav{display:flex;gap:8px;flex-wrap:wrap}.prototype-head nav button{min-height:48px;border:1px solid #B8CBC5;background:#fff;border-radius:999px;padding:0 18px;color:${palette.ink};font-weight:700}.prototype-head nav button.active{background:${palette.teal};color:white;border-color:${palette.teal}}.phone{position:relative;width:min(390px,100%);height:844px;margin:auto;background:${palette.cream};border:9px solid #14231F;border-radius:38px;overflow:hidden;box-shadow:0 24px 60px rgba(12,50,42,.22)}.phone:before{content:"";position:absolute;z-index:20;top:8px;left:50%;transform:translateX(-50%);width:100px;height:24px;border-radius:18px;background:#14231F}.statusbar{height:44px;padding:14px 22px 0;display:flex;justify-content:space-between;position:relative;z-index:15;font-size:14px;font-weight:800}.camera-phone .statusbar{color:white;background:#10231F}.notice{position:absolute;z-index:50;left:16px;right:16px;top:50px;background:#102F29;color:white;border-left:6px solid ${palette.orange};border-radius:16px;padding:14px 12px 14px 16px;display:flex;align-items:center;gap:10px;font-size:18px;line-height:1.45;box-shadow:0 8px 24px rgba(0,0,0,.28)}.notice span{flex:1}.notice button{width:44px;height:44px;border:0;border-radius:50%;color:white;background:rgba(255,255,255,.16);font-size:28px}.prototype-note{text-align:center;margin:14px 0 0;color:#55736B;font-size:16px}.symbol{display:inline-grid;place-items:center;line-height:1}.recognize-screen{height:calc(100% - 44px);position:relative;background:#0B2520;color:white}.camera-scene{position:absolute;inset:0;background:linear-gradient(180deg,#5B746F 0%,#83928E 30%,#A7A49A 31%,#7D827A 100%);overflow:hidden}.camera-glow{position:absolute;width:260px;height:260px;background:radial-gradient(circle,rgba(255,248,222,.72),transparent 70%);top:40px;left:65px}.path-left,.path-right{position:absolute;bottom:-60px;width:260px;height:580px;background:rgba(228,225,211,.35);transform:rotate(21deg);border-left:5px solid rgba(255,255,255,.45)}.path-left{left:-170px}.path-right{right:-150px;transform:rotate(-18deg)}.camera-content{position:relative;z-index:2;height:100%;padding:18px 18px 16px;background:linear-gradient(180deg,rgba(5,28,24,.48),rgba(5,28,24,.18) 35%,rgba(5,28,24,.54))}.mode-tabs{display:grid;grid-template-columns:1fr 1fr;background:rgba(10,34,29,.72);padding:5px;border-radius:16px;margin-bottom:12px}.mode-tabs button{min-height:54px;border:0;border-radius:12px;background:transparent;color:#E9F4F0;font-size:22px;font-weight:800}.mode-tabs button.active{background:white;color:${palette.teal}}.device-pill{min-height:48px;border:0;border-radius:999px;padding:0 16px;display:flex;align-items:center;gap:8px;background:${palette.teal};color:white;font-size:18px;font-weight:800;box-shadow:0 7px 18px rgba(0,0,0,.18)}.device-pill.disconnected{background:${palette.danger}}.device-pill b{padding-left:8px;border-left:1px solid rgba(255,255,255,.35)}.device-dot{width:11px;height:11px;border-radius:50%;background:#58E3A4;display:inline-block;box-shadow:0 0 0 5px rgba(88,227,164,.17)}.disconnected .device-dot{background:#FFD0C9;box-shadow:none}.camera-content>.device-pill{margin:0 auto 14px}.action-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.action-grid button{min-height:68px;border:1px solid rgba(255,255,255,.2);border-radius:18px;background:rgba(18,42,37,.75);color:white;display:flex;align-items:center;justify-content:center;gap:10px;font-size:20px;font-weight:800;backdrop-filter:blur(7px)}.action-grid .symbol{font-size:24px;color:#FFBF79}.action-grid button.danger-action{background:rgba(153,40,34,.86)}.camera-alert{margin:12px 0 10px;background:rgba(10,38,32,.78);border-left:5px solid ${palette.orange};padding:12px;border-radius:12px;text-align:center;font-size:18px;font-weight:700}.voice-button{width:100%;min-height:66px;border:0;border-radius:20px;background:${palette.orange};color:#3D2815;display:flex;align-items:center;justify-content:center;gap:12px;font-size:22px;font-weight:900}.voice-button .symbol{width:28px;height:28px;border:3px solid #4E321A;border-radius:50%;font-size:0}.navigation-screen{height:calc(100% - 44px);background:${palette.cream};display:flex;flex-direction:column}.nav-header{height:72px;display:grid;grid-template-columns:56px 1fr 56px;align-items:center;padding:0 12px;background:white;border-bottom:1px solid ${palette.line}}.nav-header h1{margin:0;text-align:center;font-size:26px}.back-button{width:52px;height:52px;border:0;border-radius:16px;background:${palette.mint};color:${palette.teal};font-size:42px;line-height:1}.header-spacer{display:block}.screen-body{padding:18px;overflow-y:auto;flex:1}.screen-body>.device-pill{margin:0 auto}.audio-copy{text-align:center;font-size:18px;font-weight:700;margin:10px 0 16px}.nav-entry{width:100%;min-height:116px;border:0;border-radius:24px;margin-bottom:14px;padding:20px;display:grid;grid-template-columns:54px 1fr 22px;gap:12px;align-items:center;text-align:left;color:white;box-shadow:0 8px 20px rgba(0,55,45,.13)}.nav-entry.orange{background:${palette.orange};color:#3D2A18}.nav-entry.green{background:#158472}.nav-entry.deep{background:${palette.tealDark}}.nav-entry .symbol{font-size:38px}.nav-entry span{display:flex;flex-direction:column;gap:7px}.nav-entry b{font-size:25px}.nav-entry small{font-size:17px;font-weight:650;opacity:.9}.nav-entry em{font-style:normal;font-size:38px}.boundary-card,.safety-tip{border-radius:18px;background:white;border:1px solid ${palette.line};padding:15px 16px;display:flex;flex-direction:column;gap:6px;font-size:18px;line-height:1.5}.boundary-card b,.safety-tip b{color:${palette.teal};font-size:20px}.search-box{min-height:64px;border:3px solid ${palette.teal};border-radius:18px;background:white;display:flex;align-items:center;gap:12px;padding:0 18px}.search-box span{font-size:28px}.search-box input{width:100%;border:0;outline:0;font-size:24px;color:${palette.ink};background:transparent}.giant-voice{width:100%;min-height:230px;margin:22px 0;border:0;border-radius:28px;background:${palette.teal};color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}.giant-voice .symbol{width:70px;height:70px;border-radius:50%;background:${palette.orange};border:9px solid rgba(255,255,255,.18);font-size:0}.giant-voice b{font-size:28px}.giant-voice span{font-size:20px}.primary-button,.secondary-button{width:100%;min-height:62px;border-radius:18px;font-size:22px;font-weight:900;padding:12px 16px}.primary-button{border:0;background:${palette.orange};color:#3E2816;box-shadow:0 7px 16px rgba(164,94,25,.22)}.secondary-button{border:2px solid ${palette.teal};background:white;color:${palette.teal};margin-top:12px}.primary-button:disabled{opacity:.45}.section-hint{font-size:19px;font-weight:700;color:#56736B;margin:0 0 14px}.place-card,.saved-route{width:100%;min-height:112px;border:1px solid ${palette.line};border-radius:22px;background:white;padding:18px;display:grid;grid-template-columns:54px 1fr 20px;align-items:center;gap:12px;text-align:left;color:${palette.ink};margin-bottom:16px}.place-icon{width:52px;height:52px;border-radius:16px;background:${palette.orangeSoft};display:grid;place-items:center;color:${palette.danger};font-size:34px;font-weight:900}.place-card>span:nth-child(2),.saved-route>span:nth-child(2){display:flex;flex-direction:column;gap:5px}.place-card b,.saved-route b{font-size:24px}.place-card small,.saved-route small{font-size:17px;color:#5B746E}.place-card em{font-size:17px;color:${palette.teal};font-style:normal;font-weight:800}.place-card strong,.saved-route em{font-size:34px;font-style:normal}.saved-route .symbol{font-size:32px;color:${palette.teal}}.map-graphic{height:260px;border-radius:24px;background:#DCE9E4;position:relative;overflow:hidden;border:1px solid #B8D0C8}.map-road{position:absolute;background:white;box-shadow:0 0 0 1px #BFD0CA}.road-a{width:540px;height:74px;left:-80px;top:95px;transform:rotate(-13deg)}.road-b{width:80px;height:360px;left:220px;top:-50px;transform:rotate(20deg)}.route-line{position:absolute;width:200px;height:150px;border-left:10px solid ${palette.teal};border-bottom:10px solid ${palette.teal};border-radius:0 0 0 40px;left:100px;top:45px;transform:rotate(-10deg)}.map-graphic i{position:absolute;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:white;font-style:normal;font-weight:900;font-size:20px}.start-dot{left:65px;bottom:35px;background:${palette.teal}}.end-dot{right:52px;top:30px;background:${palette.danger}}.route-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.route-summary span{background:white;border:1px solid ${palette.line};border-radius:16px;padding:12px 5px;text-align:center;display:flex;flex-direction:column;gap:3px}.route-summary b{font-size:20px}.route-summary small{font-size:15px;color:#647E77}.safe-route{background:#E4F1EC;border-radius:16px;padding:14px 16px;margin-bottom:14px;display:flex;flex-direction:column;gap:4px}.safe-route b{font-size:20px;color:${palette.teal}}.safe-route span{font-size:17px}.live-status{min-height:54px;border-radius:16px;background:#DCF0E8;color:${palette.tealDark};display:flex;align-items:center;justify-content:center;gap:12px;font-size:18px}.live-status.warning{background:#FFF0D8;color:#7B4B13}.direction-card{text-align:center;background:white;border-radius:26px;padding:15px 16px 18px;margin:14px 0;border:1px solid ${palette.line}}.big-arrow{font-size:94px;line-height:.9;color:${palette.teal};font-weight:900}.direction-card>strong{font-size:34px;color:${palette.orange};display:block}.direction-card h2{font-size:28px;margin:8px 0}.direction-card p{font-size:18px;margin:0;color:#5E7770}.mini-map{height:105px;background:#DFE9E5;border-radius:18px;position:relative;overflow:hidden;margin-bottom:14px}.street{position:absolute;background:white}.street.one{width:500px;height:34px;left:-80px;top:36px;transform:rotate(-8deg)}.street.two{width:36px;height:200px;left:245px;top:-40px;transform:rotate(18deg)}.mini-route{position:absolute;width:180px;height:55px;border-bottom:7px solid ${palette.teal};border-right:7px solid ${palette.teal};left:80px;top:10px}.mini-map i{position:absolute;left:66px;bottom:25px;color:${palette.teal};font-style:normal}.mini-map b{position:absolute;right:78px;top:15px;width:34px;height:34px;border-radius:50%;background:${palette.danger};color:white;display:grid;place-items:center;font-size:21px}.simulation-panel{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px}.simulation-panel button{min-height:52px;border:1px solid ${palette.line};background:white;border-radius:14px;color:${palette.ink};font-size:17px;font-weight:750}.center-state{flex:1;padding:45px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.center-state h2{font-size:30px;margin:18px 0 8px}.center-state p{font-size:22px;margin:0 0 8px}.center-state span{font-size:18px;color:#607A73}.spinner{width:82px;height:82px;border-radius:50%;border:10px solid #D4E4DF;border-top-color:${palette.orange};animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.arrival-view{text-align:center}.arrival-arrow{width:150px;height:150px;margin:10px auto 14px;border-radius:50%;background:${palette.teal};color:white;display:grid;place-items:center;font-size:104px;font-weight:900}.arrival-view h2{font-size:30px;margin:8px 0}.arrival-view>strong{font-size:38px;color:${palette.orange}}.arrival-view>p{font-size:22px;line-height:1.55}.recognized-card{background:#E2F1EB;border:2px solid ${palette.teal};border-radius:18px;padding:16px;margin:12px 0;display:flex;flex-direction:column;gap:5px}.recognized-card b{font-size:19px;color:${palette.teal}}.recognized-card span{font-size:26px;font-weight:900}.success-mark{width:108px;height:108px;border-radius:50%;background:${palette.teal};color:white;display:grid;place-items:center;font-size:72px}.arrived-state .primary-button{margin-top:28px}.recording-intro{text-align:center}.record-icon{width:110px;height:110px;border-radius:50%;display:grid;place-items:center;background:${palette.teal};color:white;font-size:72px;margin:10px auto}.recording-intro h2{font-size:28px;margin:14px 0 8px}.recording-intro p{font-size:19px;line-height:1.5}.recording-intro ul{text-align:left;background:white;border-radius:18px;padding:18px 18px 18px 40px;font-size:18px;line-height:1.65}.recording-live{text-align:center}.record-pulse{width:38px;height:38px;border-radius:50%;background:#D74337;margin:8px auto;box-shadow:0 0 0 12px rgba(215,67,55,.14)}.record-pulse.paused{background:#9BAAA5;box-shadow:none}.recording-live h2{font-size:28px}.record-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.record-stats span{display:flex;flex-direction:column;background:white;border-radius:16px;padding:12px 4px}.record-stats b{font-size:20px}.record-stats small{font-size:15px;color:#617A73}.route-form label,.large-field{display:flex;flex-direction:column;gap:8px;margin-bottom:15px;font-size:20px;font-weight:850}.route-form input,.route-form textarea,.large-field input{width:100%;border:2px solid ${palette.line};border-radius:16px;background:white;color:${palette.ink};padding:15px;font-size:20px}.route-form textarea{height:82px;resize:none}.light-screen{height:calc(100% - 44px);padding:22px 20px;background:${palette.cream};overflow-y:auto}.simple-head{display:flex;align-items:center;justify-content:space-between;color:${palette.teal};font-size:18px;font-weight:800}.light-screen h1{font-size:30px;margin:22px 0 8px}.light-screen>p{font-size:19px;color:#5B746D;margin:0 0 26px}.light-screen h2{font-size:23px}.aid-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:26px}.aid-grid button{min-height:74px;border:2px solid ${palette.line};border-radius:18px;background:white;color:${palette.ink};font-size:21px;font-weight:800}.aid-grid button.selected{border-color:${palette.teal};background:#DDEDE7;color:${palette.teal}}.family-person{margin:20px 0;background:${palette.teal};color:white;border-radius:24px;padding:20px;display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center}.family-person>div{width:64px;height:64px;border-radius:50%;background:${palette.orange};color:#3D2815;display:grid;place-items:center;font-size:28px;font-weight:900}.family-person h1{font-size:26px;margin:0}.family-person p{font-size:17px;margin:4px 0 0}.family-person>b{background:#D7F0E4;color:${palette.teal};border-radius:999px;padding:9px 12px}.family-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px}.family-grid article{background:white;border:1px solid ${palette.line};border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:8px}.family-grid small{font-size:16px;color:#647C76}.family-grid b{font-size:20px}@media(max-width:640px){.app-shell{padding:0;background:#14231F}.prototype-head,.prototype-note{display:none}.phone{width:100%;height:100vh;border:0;border-radius:0}.phone:before{display:none}.statusbar{padding-top:10px}}
`;

export default App;